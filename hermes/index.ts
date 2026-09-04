/**
 * hermes/index.ts — Routeur /api/hermes/* (monté par server.ts).
 *
 * Endpoints :
 *  - GET  /status          : état réel (fournisseur actif, skills, agents)
 *  - GET  /agents          : liste des agents spécialisés
 *  - GET  /skills          : registre de skills (extensible)
 *  - POST /chat            : boucle agent (auth + rate limit)
 *  - POST /confirm         : confirmation d'une action sensible
 *  - POST /autonomous-loop : cycle autonome d'analyse (lecture seule)
 *  - GET/POST /config      : sélection fournisseur/modèle (auth)
 *  - GET  /activity        : audit des actions exécutées (auth)
 */
import { Router } from 'express';
import { runAgentChat, confirmPendingAction, getAgents, skills } from './engine';
import { buildPool, getPoolStatus, addProvider, removeProvider, testProvider, getHermesConfig, saveHermesConfig } from './providers';
import { getAutonomyConfig, saveAutonomyConfig, runAutonomyCycle, getRecentAutonomyReports, isAutonomyRunning } from './autonomy';
import { DEFAULT_HERMES_CONFIG } from './types';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';

export interface HermesRouterDeps {
  requireAuth: (req: any, res: any, next: any) => void;
  aiLimiter: (req: any, res: any, next: any) => void;
  apiLimiter: (req: any, res: any, next: any) => void;
}

export function createHermesRouter(deps: HermesRouterDeps): Router {
  const router = Router();
  const { requireAuth, aiLimiter, apiLimiter } = deps;

  // ---- État réel ----
  router.get('/status', apiLimiter, async (req, res) => {
    try {
      const pool = await buildPool();
      const active = pool[0] || null;
      const [memories, repos, autonomyCfg] = await Promise.all([
        db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_memories')),
        db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_github_repositories')),
        getAutonomyConfig()
      ]);
      let memCount = 0;
      if (memories.length > 0 && Array.isArray(memories[0].value)) memCount = (memories[0].value as any[]).length;
      const reposVal = memories && repos.length > 0 ? repos[0].value : null;
      const reposList = Array.isArray(reposVal) ? reposVal : (typeof reposVal === 'string' ? (() => { try { const p = JSON.parse(reposVal); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);
      res.json({
        status: active ? 'active' : 'offline',
        engine: 'hermes-core-v5 (boucle tool-calling réelle, pool multi-fournisseurs avec bascule automatique, multi-agents, autonomie serveur)',
        provider: active?.provider.label || 'aucun',
        providerReason: active ? undefined : 'aucun fournisseur disponible',
        model: active?.model || '-',
        failover: pool.length > 1 ? `bascule automatique : ${pool.length} fournisseurs en cascade (rate-limit/erreur → cooldown → suivant)` : undefined,
        providerPool: pool.map(e => ({ name: e.name, kind: e.kind, model: e.model, priority: e.priority, source: e.source, key: e.keyMasked })),
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        skillsCount: skills.length,
        agentsCount: getAgents().length,
        memoriesCount: memCount,
        reposCount: reposList.length,
        autonomy: { enabled: autonomyCfg.enabled, intervalMinutes: autonomyCfg.intervalMinutes, lastRunAt: autonomyCfg.lastRunAt, runs: autonomyCfg.runs, running: isAutonomyRunning() },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.json({ status: 'error', error: err.message });
    }
  });

  router.get('/agents', apiLimiter, async (req, res) => {
    try {
      res.json({ agents: getAgents().map(a => ({
        id: a.id, name: a.name, emoji: a.emoji, role: a.role,
        skills: a.skills || 'tous', maxSteps: a.maxSteps || null
      })) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/skills', apiLimiter, async (req, res) => {
    try {
      res.json({
        count: skills.length,
        skills: skills.map(t => ({
          name: t.name,
          description: t.description,
          access: t.access,
          requiresConfirmation: Boolean(t.requiresConfirmation)
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Chat (boucle agent) ----
  router.post('/chat', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { prompt, history, agent } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Le champ prompt est obligatoire.' });
      }
      const result = await runAgentChat({
        agentId: typeof agent === 'string' ? agent : undefined,
        prompt: prompt.slice(0, 4000),
        history: Array.isArray(history) ? history.slice(-10) : undefined,
        actor: 'modérateur'
      });
      res.json(result);
    } catch (err: any) {
      console.error('Hermes chat error:', err);
      res.status(500).json({ response: '⚠️ Erreur du moteur Hermes.', error: err.message, provider: 'erreur', model: '-', agent: 'orchestrator', steps: [] });
    }
  });

  // ---- Confirmation d'action sensible ----
  router.post('/confirm', requireAuth, apiLimiter, async (req, res) => {
    try {
      const actionId = String(req.body?.actionId || '').slice(0, 64);
      if (!/^[a-f0-9]{16,64}$/.test(actionId)) {
        return res.status(400).json({ error: 'actionId invalide.' });
      }
      const result = await confirmPendingAction(actionId);
      if (!result.ok) return res.status(400).json({ error: result.error });
      res.json({ confirmed: true, tool: 'pending', result: result.result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Cycle autonome (analyse lecture seule) ----
  // Route historique : délègue au NOUVEAU cycle d'autonomie (observation →
  // plan → actions sûres → rapport journalisé). Compatibilité conservée.
  router.post('/autonomous-loop', requireAuth, aiLimiter, async (req, res) => {
    try {
      const report = await runAutonomyCycle('api');
      if ((report as any).skipped) {
        return res.json({ success: false, insight: null, reason: (report as any).reason });
      }
      const r = report as any;
      res.json({ success: true, insight: r.report, agent: 'autonomy', provider: r.provider, steps: (r.actions || []).map((a: any) => a.tool), observations: r.observation, recommendations: r.recommendations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Autonomie serveur (config + journal) ----
  router.get('/autonomy', requireAuth, apiLimiter, async (req, res) => {
    try {
      const config = await getAutonomyConfig();
      const recent = await getRecentAutonomyReports(5);
      res.json({
        config,
        running: isAutonomyRunning(),
        nextRunIn: config.lastRunAt && config.enabled ? `≈${config.intervalMinutes} min après ${new Date(config.lastRunAt).toISOString()}` : (config.enabled ? 'prochain cycle planifié' : 'autonomie en pause'),
        recent
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/autonomy', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { enabled, intervalMinutes } = req.body || {};
      const patch: any = {};
      if (enabled !== undefined) patch.enabled = Boolean(enabled);
      if (intervalMinutes !== undefined) patch.intervalMinutes = Number(intervalMinutes);
      const config = await saveAutonomyConfig(patch);
      res.json({ updated: true, config });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/autonomy/run', requireAuth, aiLimiter, async (req, res) => {
    try {
      const report = await runAutonomyCycle('api');
      if ((report as any).skipped) return res.status(409).json({ error: (report as any).reason });
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/autonomy/log', requireAuth, apiLimiter, async (req, res) => {
    try {
      const n = Math.min(30, Math.max(1, Number(req.query.n) || 10));
      const reports = await getRecentAutonomyReports(n);
      res.json({ count: reports.length, reports });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Configuration du fournisseur (pas de secrets en base) ----
  router.get('/config', requireAuth, apiLimiter, async (req, res) => {
    try {
      const cfg = await getHermesConfig();
      res.json({
        config: cfg,
        defaults: DEFAULT_HERMES_CONFIG,
        notes: 'Les clés API (GEMINI_API_KEY, HERMES_OPENAI_API_KEY) ne se configurent QUE par variables d\'environnement — jamais en base.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/config', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { provider, geminiModel, openaiBaseUrl, openaiModel } = req.body || {};
      const patch: any = {};
      if (provider !== undefined) patch.provider = provider;
      if (geminiModel !== undefined) patch.geminiModel = geminiModel;
      if (openaiBaseUrl !== undefined) patch.openaiBaseUrl = openaiBaseUrl;
      if (openaiModel !== undefined) patch.openaiModel = openaiModel;
      const cfg = await saveHermesConfig(patch);
      const pool = await buildPool();
      const active = pool[0] || null;
      res.json({ updated: true, config: cfg, activeProvider: active?.provider.label || 'aucun', activeReason: active ? undefined : 'aucun fournisseur disponible' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Journal d'audit des actions ----
  router.get('/activity', requireAuth, apiLimiter, async (req, res) => {
    try {
      const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_activity'));
      let list: any[] = [];
      if (r.length > 0 && r[0].value) {
        list = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
        if (!Array.isArray(list)) list = [];
      }
      res.json({ count: list.length, activity: list.slice(0, 50) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Gestionnaire d'API & tokens — pool de fournisseurs (clés JAMAIS exposées) ----
  router.get('/providers', requireAuth, apiLimiter, async (req, res) => {
    try {
      const pool = await getPoolStatus();
      res.json({
        count: pool.length,
        policy: 'bascule automatique : 429/erreur → cooldown (30 s sur rate-limit, 15 s sur erreur) → fournisseur suivant — jamais bloqué',
        pool
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/providers', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { name, kind, model, baseUrl, apiKey, priority, local } = req.body || {};
      const { entry } = await addProvider({
        name, kind, model, baseUrl, apiKey,
        priority: priority !== undefined && priority !== null ? Number(priority) : undefined,
        local: Boolean(local)
      });
      res.json({ added: true, entry, note: "Clé stockée dans une clé KV protégée — jamais exposée (UI, audit, logs, /api/store)." });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/providers/:name', requireAuth, apiLimiter, async (req, res) => {
    try {
      const r = await removeProvider(String(req.params.name || ''));
      res.json({ removed: true, ...r });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/providers/:name/test', requireAuth, apiLimiter, async (req, res) => {
    try {
      const r = await testProvider(String(req.params.name || ''));
      res.json(r);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
