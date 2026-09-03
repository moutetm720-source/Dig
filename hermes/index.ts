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
      const memories = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_memories'));
      let memCount = 0;
      if (memories.length > 0 && Array.isArray(memories[0].value)) memCount = (memories[0].value as any[]).length;
      res.json({
        status: active ? 'active' : 'offline',
        engine: 'hermes-core-v5 (boucle tool-calling réelle, pool multi-fournisseurs avec bascule automatique, multi-agents)',
        provider: active?.provider.label || 'aucun',
        providerReason: active ? undefined : 'aucun fournisseur disponible',
        model: active?.model || '-',
        failover: pool.length > 1 ? `bascule automatique : ${pool.length} fournisseurs en cascade (rate-limit/erreur → cooldown → suivant)` : undefined,
        providerPool: pool.map(e => ({ name: e.name, kind: e.kind, model: e.model, priority: e.priority, source: e.source, key: e.keyMasked })),
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        skillsCount: skills.length,
        agentsCount: getAgents().length,
        memoriesCount: memCount,
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
  router.post('/autonomous-loop', requireAuth, aiLimiter, async (req, res) => {
    try {
      const result = await runAgentChat({
        agentId: 'security_auditor',
        prompt: 'Cycle autonome : produis en ≤80 mots un diagnostic de la santé de la plateforme (paiements, auth, canaux, catalogue) et UNE recommandation prioritaire.',
        history: [],
        actor: 'cycle-autonome'
      });
      if (result.provider === 'aucun') {
        // Mode honnête : pas de LLM → pas d'insight inventé
        return res.json({ success: true, insight: null, reason: 'Aucun fournisseur LLM configuré — aucun insight généré (pas de simulation).' });
      }
      res.json({ success: true, insight: result.response, agent: result.agent, provider: result.provider, steps: result.steps.map(s => s.tool) });
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
