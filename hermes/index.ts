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
import crypto from 'node:crypto';
import { runAgentChat, confirmPendingAction, runInspection, getAgents } from './engine';
import { getAllSkills, ensureCustomSkillsLoaded, needsUserConfirmation } from './tools';
import { buildPool, getPoolStatus, addProvider, removeProvider, testProvider, getHermesConfig, saveHermesConfig, realProviderHelp } from './providers';
import { getAutonomyConfig, saveAutonomyConfig, runAutonomyCycle, getRecentAutonomyReports, isAutonomyRunning } from './autonomy';
import { freeOnlyEnabled, providerCostPolicy } from './providerPolicy';
import type { HermesProgressEvent } from '../src/types/hermes';
import { DEFAULT_HERMES_CONFIG, HERMES_LIMITS } from './types';
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
  const runs = new Map<string, { ownerId: string; controller: AbortController }>();
  const ownerFor = (req: any) => crypto.createHash('sha256').update(String(req.headers.authorization || '')).digest('hex');
  const skillInfo = (t: ReturnType<typeof getAllSkills>[number]) => ({
    name: t.name, description: t.description, access: t.access, requiresConfirmation: needsUserConfirmation(t)
  });
  const agentInfo = (a: ReturnType<typeof getAgents>[number]) => ({
    id: a.id, name: a.name, emoji: a.emoji, role: a.role, skills: a.skills || 'tous', maxSteps: a.maxSteps || null
  });

  // ---- État réel ----
  router.get('/status', apiLimiter, async (req, res) => {
    try {
      await ensureCustomSkillsLoaded();
      const pool = await buildPool();
      const eligible = pool.filter(e => providerCostPolicy(e).eligible);
      const active = eligible[0] || null;
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
        engine: 'hermes-core-v5 (boucle tool-calling réelle, pool multi-fournisseurs RÉELS avec bascule automatique, multi-agents, autonomie serveur)',
        provider: active?.provider.label || 'aucun',
        providerReason: active ? undefined : realProviderHelp(),
        realOnly: true,           // aucun fournisseur mock/simulé : IA réelle ou rien
        mockProvider: 'supprimé', // ancien mode test — retiré du moteur
        model: active?.model || '-',
        failover: pool.length > 1 ? `bascule automatique : ${pool.length} fournisseurs en cascade (rate-limit/erreur → cooldown → suivant)` : undefined,
        providerPool: pool.map(e => ({ name: e.name, kind: e.kind, model: e.model, priority: e.priority, source: e.source, key: e.keyMasked, costPolicy: providerCostPolicy(e) })),
        budgetPolicy: {
          freeOnly: true, enforced: freeOnlyEnabled(false), eligibleProviders: eligible.length, blockedProviders: pool.length - eligible.length,
          notice: 'Aucun repli vers une API payante ou au coût inconnu. Quotas et disponibilité non garantis. Hébergement, ressources locales et frais d’encaissement éventuels restent distincts.'
        },
        skills: getAllSkills().map(skillInfo),
        agents: getAgents().map(agentInfo),
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        skillsCount: getAllSkills().length,
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
      res.json({ agents: getAgents().map(agentInfo) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/skills', apiLimiter, async (req, res) => {
    try {
      await ensureCustomSkillsLoaded(); // builtin + skills custom installés à chaud
      const skills = getAllSkills();
      res.json({
        count: skills.length,
        skills: skills.map(skillInfo)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Chat JSON historique + flux SSE authentifié (fetch, pas EventSource) ----
  router.post('/chat', requireAuth, aiLimiter, async (req, res) => {
    const { prompt, history, agent, agentId } = req.body || {};
    if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Le champ prompt est obligatoire.' });
    const selected = agentId ?? agent ?? 'orchestrator'; // anciens clients : agent ; nouveau contrat : agentId
    if (typeof selected !== 'string' || !getAgents().some(a => a.id === selected)) return res.status(400).json({ error: 'Agent inconnu.' });
    const ownerId = ownerFor(req);
    if ([...runs.values()].some(r => r.ownerId === ownerId)) return res.status(409).json({ error: 'Une exécution est déjà en cours dans cette session. Arrêtez-la ou attendez sa conclusion.' });
    const runId = crypto.randomUUID();
    const controller = new AbortController();
    runs.set(runId, { ownerId, controller });
    const streaming = req.body?.stream === true || req.headers.accept?.includes('text/event-stream');
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => controller.abort(new Error('Délai maximum de 4 minutes atteint.')), HERMES_LIMITS.RUN_TIMEOUT_MS);
    const onClose = () => { if (!res.writableEnded) controller.abort(new Error('Connexion client interrompue.')); };
    res.on('close', onClose);
    const send = (event: HermesProgressEvent) => {
      if (streaming && !res.destroyed && !res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    try {
      if (streaming) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        heartbeat = setInterval(() => { if (!res.destroyed) res.write(': heartbeat\n\n'); }, 15_000);
        send({ type: 'run_started', runId, agent: selected, freeOnly: freeOnlyEnabled(req.body?.freeOnly) });
      }
      const result = await runAgentChat({
        agentId: selected, prompt: prompt.trim().slice(0, 4000),
        history: Array.isArray(history) ? history.slice(-10) : undefined,
        actor: 'modérateur', ownerId, freeOnly: req.body?.freeOnly,
        signal: controller.signal, onEvent: send
      });
      if (!res.destroyed) {
        if (streaming) { send({ type: 'done', result }); res.end(); }
        else res.json(result);
      }
    } catch (err: any) {
      if (!res.destroyed) {
        if (streaming) { send({ type: 'error', message: 'Erreur du moteur : la demande n’a pas abouti. Consultez les étapes conservées avant de réessayer.' }); res.end(); }
        else res.status(500).json({ error: 'Erreur du moteur Hermes.', steps: [], outcome: 'error' });
      }
    } finally {
      clearTimeout(timeout);
      if (heartbeat) clearInterval(heartbeat);
      res.off('close', onClose);
      runs.delete(runId);
    }
  });

  router.post('/chat/stop', requireAuth, apiLimiter, (req, res) => {
    const run = runs.get(String(req.body?.runId || ''));
    if (!run || run.ownerId !== ownerFor(req)) return res.status(404).json({ error: 'Exécution inconnue ou déjà terminée.' });
    run.controller.abort(new Error('Arrêt demandé par l’utilisateur.'));
    res.json({ stopping: true, note: 'Aucune nouvelle étape. Une action déjà engagée peut se terminer et ne sera pas annulée.' });
  });

  router.post('/inspect', requireAuth, apiLimiter, async (req, res) => {
    try { res.json(await runInspection(String(req.body?.tool || 'audit_system'), 'modérateur')); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ---- Confirmation OU refus, consommé côté serveur et lié à la session ----
  router.post('/confirm', requireAuth, apiLimiter, async (req, res) => {
    try {
      const actionId = String(req.body?.actionId || '').slice(0, 64);
      const decision = req.body?.decision || 'approve';
      if (!/^[a-f0-9]{16,64}$/.test(actionId) || !['approve', 'refuse'].includes(decision)) return res.status(400).json({ error: 'Confirmation invalide.' });
      const result = await confirmPendingAction(actionId, ownerFor(req), decision === 'approve');
      if (!result.ok) return res.status(400).json({ error: result.error, steps: result.steps });
      res.json({ confirmed: decision === 'approve', refused: decision === 'refuse', tool: result.tool, result: result.result, steps: result.steps });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
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
      if (enabled !== undefined) {
        if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled doit être un booléen.' });
        patch.enabled = enabled;
      }
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
      res.json({ updated: true, config: cfg, activeProvider: active?.provider.label || 'aucun', activeReason: active ? undefined : realProviderHelp() });
    } catch (err: any) {
      // Erreur de validation de la config (ex. provider « mock ») → 400, pas 500.
      res.status(400).json({ error: err.message, allowedProviders: ['auto', 'gemini', 'openai'] });
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
        policy: 'bascule automatique : 429/erreur → cooldown (30 s sur rate-limit, 15 s sur erreur) → fournisseur suivant autorisé — échec explicite si tous échouent',
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

  // ---- Catalogue des providers gratuits (sans clé / free tier) ----
  router.get('/free-catalog', apiLimiter, async (req, res) => {
    try {
      const { getFreeCatalogForUI, FREE_CATALOG } = await import('./freeProviders');
      const pool = await getPoolStatus();
      res.json({
        total: FREE_CATALOG.length,
        configuredEnv: FREE_CATALOG.filter(f => f.envKey && process.env[f.envKey]).map(f => f.id),
        anonymousAlwaysOn: pool.filter(p => ['ovh-free', 'llm7-free'].includes(p.name)).map(p => p.name),
        costNotice: 'Catalogue d’offres gratuites, pas une garantie : seuls les fournisseurs autorisés par le mode sans API payante seront appelés.',
        poolActive: pool.map(p => p.name),
        catalog: getFreeCatalogForUI(),
        howTo: {
          ovh: 'Endpoint sans clé, si le repli anonyme est activé. Quotas et disponibilité non garantis.',
          llm7: 'Endpoint sans clé, si le repli anonyme est activé. Quotas et disponibilité non garantis.',
          groq: 'Inscrivez-vous sur https://console.groq.com/keys (gratuit, sans CB) puis définissez GROQ_API_KEY dans .env — auto-détecté au démarrage.',
          openrouter: 'Inscrivez-vous sur https://openrouter.ai/keys (gratuit) puis OPENROUTER_API_KEY — donne accès aux modèles :free',
          mistral: 'https://console.mistral.ai/api-keys — free mode $10 crédits',
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Installation rapide d'un provider gratuit ----
  router.post('/free-install/:id', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { FREE_CATALOG } = await import('./freeProviders');
      const id = String(req.params.id || '').toLowerCase();
      const info = FREE_CATALOG.find(f => f.id === id);
      if (!info) return res.status(404).json({ error: `Provider gratuit inconnu : ${id}. Disponibles : ${FREE_CATALOG.map(f => f.id).join(', ')}` });

      const apiKey = req.body?.apiKey ? String(req.body.apiKey).trim() : undefined;
      if (info.needsKey && !apiKey && !process.env[info.envKey || '']) {
        return res.status(400).json({
          error: `Ce provider nécessite une clé gratuite. Obtenez-la sur ${info.docsUrl} puis fournissez {\"apiKey\":\"...\"} ou définissez ${info.envKey} dans .env`,
          docsUrl: info.docsUrl,
          envKey: info.envKey
        });
      }

      const { addProvider } = await import('./providers');
      const { entry } = await addProvider({
        name: info.id,
        kind: 'openai',
        model: req.body?.model ? String(req.body.model) : info.model,
        baseUrl: info.baseUrl,
        apiKey: apiKey || (info.envKey ? process.env[info.envKey] : undefined),
        priority: info.priority
      });
      res.json({ installed: true, entry, catalog: info });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
