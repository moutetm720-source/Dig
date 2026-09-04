/**
 * hermes/autonomy.ts — AUTONOMIE SERVEUR d'Hermes (cycle planifié).
 *
 * L'agent tourne SUR LE SERVEUR (même si le navigateur est fermé) :
 *   1. OBSERVATION — skills réelles (vue globale, métriques, audit, repos, liens)
 *   2. PLAN → ACTION — avec un LLM : l'orchestrateur (périmètre SÛR uniquement :
 *      lecture + brouillons + veille) décide et exécute ≤2 actions ; sans LLM :
 *      cycle déterministe sur données réelles (zéro simulation, actions sûres fixes)
 *   3. RAPPORT — journal en base (df_hermes_autonomy_log) + audit + endpoints UI
 *
 * AUTONOMIE SÛRE : jamais de re-pricing, publication, suppression, diffusion
 * canaux, écriture KV libre ou modification de code en autonomie — ces actions
 * passent par le flux de confirmation utilisateur (chat) uniquement.
 */
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { buildPool } from './providers';
import { runAgentChat } from './engine';
import { getSkill, AUTONOMY_SAFE_SKILLS, checkUrlHealth } from './tools';

const CONFIG_KEY = 'df_hermes_autonomy_config';
const LOG_KEY = 'df_hermes_autonomy_log';
const ACTIVITY_KEY = 'df_hermes_activity';
const LOG_KEEP = 20;

export interface AutonomyConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  lastReportAt: string | null;
  runs: number;
}

export interface AutonomyReport {
  at: string;
  trigger: 'timer' | 'api';
  provider: string;
  ms: number;
  observation: string;
  report: string;
  actions: Array<{ tool: string; status: string; summary: string }>;
  recommendations: string[];
  anomalies: string[];
}

const DEFAULT_CONFIG: AutonomyConfig = {
  enabled: true,
  intervalMinutes: 30,
  lastRunAt: null,
  lastReportAt: null,
  runs: 0
};

// ---------- KV ----------

async function kvGet(key: string): Promise<any> {
  const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, key));
  if (r.length > 0 && r[0].value !== null && r[0].value !== undefined) {
    const v = r[0].value;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
    return v;
  }
  return null;
}

async function kvSet(key: string, value: any): Promise<void> {
  await db.insert(keyValueStore).values({ key, value })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value } });
}

async function pushAudit(entry: Record<string, any>): Promise<void> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, ACTIVITY_KEY));
    let list: any[] = [];
    if (r.length > 0 && r[0].value) {
      list = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (!Array.isArray(list)) list = [];
    }
    list.unshift(entry);
    await kvSet(ACTIVITY_KEY, list.slice(0, 200));
  } catch { /* audit best-effort */ }
}

// ---------- Config ----------

export async function getAutonomyConfig(): Promise<AutonomyConfig> {
  const v = await kvGet(CONFIG_KEY);
  if (!v || typeof v !== 'object') return { ...DEFAULT_CONFIG };
  return {
    enabled: v.enabled !== false,
    intervalMinutes: Number.isFinite(Number(v.intervalMinutes)) ? Math.min(240, Math.max(5, Number(v.intervalMinutes))) : DEFAULT_CONFIG.intervalMinutes,
    lastRunAt: typeof v.lastRunAt === 'string' ? v.lastRunAt : null,
    lastReportAt: typeof v.lastReportAt === 'string' ? v.lastReportAt : null,
    runs: Number.isFinite(Number(v.runs)) ? Number(v.runs) : 0
  };
}

export async function saveAutonomyConfig(patch: Partial<Pick<AutonomyConfig, 'enabled' | 'intervalMinutes'>>): Promise<AutonomyConfig> {
  const cur = await getAutonomyConfig();
  if (patch.enabled !== undefined && typeof patch.enabled !== 'boolean') throw new Error('enabled doit être un booléen.');
  if (patch.intervalMinutes !== undefined) {
    const n = Number(patch.intervalMinutes);
    if (!Number.isFinite(n) || n < 5 || n > 240) throw new Error('intervalMinutes invalide (5 à 240 minutes).');
  }
  const next: AutonomyConfig = {
    ...cur,
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.intervalMinutes !== undefined ? { intervalMinutes: Number(patch.intervalMinutes) } : {})
  };
  await kvSet(CONFIG_KEY, next);
  return next;
}

export async function getRecentAutonomyReports(n = 10): Promise<AutonomyReport[]> {
  const v = await kvGet(LOG_KEY);
  const list = Array.isArray(v) ? v : [];
  return list.slice(0, n);
}

async function saveReport(report: AutonomyReport): Promise<void> {
  const v = await kvGet(LOG_KEY);
  const list = Array.isArray(v) ? v : [];
  list.unshift(report);
  await kvSet(LOG_KEY, list.slice(0, LOG_KEEP));
}

// ---------- Observation ----------

let running = false;
export function isAutonomyRunning(): boolean { return running; }

async function runObs(name: string, args: Record<string, any>): Promise<any> {
  const skill = getSkill(name);
  if (!skill) return { error: `skill ${name} absente du registre` };
  const ctx = { actor: 'cycle-autonome', agentId: 'autonomy', conversation: 'cycle autonome' };
  try {
    return await Promise.race([
      skill.run(args, ctx),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${name} (20 s)`)), 20_000))
    ]);
  } catch (e: any) {
    return { error: String(e?.message || e).slice(0, 200) };
  }
}

function collectAnomalies(obs: Record<string, any>): string[] {
  const out: string[] = [];
  const audit = obs.audit || {};
  if (!audit.error) {
    const pay = audit.payments || {};
    if (!pay.stripeConfigured) out.push('Stripe non configuré (clé secrète absente)');
    else if (!pay.stripeWebhookConfigured) out.push('Webhook Stripe non configuré');
    if (pay.stripeConfigured && !pay.cryptoAddressConfigured && !pay.demoCheckoutEnabled) out.push('Crypto et checkout démo désactivés (paiement carte seul)');
  }
  const links = obs.links || {};
  if (links.healthCheck) {
    for (const h of links.healthCheck.results || []) {
      if (!h.ok) out.push(`Lien en erreur : ${h.url.slice(0, 80)} (${h.status || h.error || '?'})`);
    }
  }
  if ((obs.repos?.total ?? 0) === 0) out.push('Harvest GitHub vide (aucun repo harvesté)');
  if (String(obs.overview?.liens?.publicUrl || '').startsWith('absent')) out.push('PUBLIC_URL absente (liens produits relatifs, pas d\'URL absolue)');
  return out.slice(0, 6);
}

// ---------- Rapport déterministe (sans LLM — données réelles, zéro simulation) ----------

function buildDeterministicReport(obs: Record<string, any>, actions: AutonomyReport['actions'], anomalies: string[]): { report: string; recommendations: string[] } {
  const o = obs.overview || {};
  const b = o.boutique || {};
  const recs: string[] = [];
  if (anomalies.length > 0) recs.push(`Traiter en priorité : ${anomalies[0]}.`);
  else if ((b.products ?? 0) - (b.published ?? 0) > 0) recs.push(`${b.products - b.published} brouillon(s) produit(s) en attente de publication (action sensible : confirmation requise).`);
  else if ((o.reposGithub?.total ?? 0) > 0 && (b.published ?? 0) > 0) recs.push(`Transformer le meilleur repo du harvest (${o.reposGithub.top?.[0]?.name || '—'}) en brouillon produit.`);
  else recs.push('Aucune anomalie détectée. Pour un cycle avec plan d\'actions intelligent, configurez un fournisseur LLM (pool multi-fournisseurs).');

  const report =
    `🤖 **Cycle autonome** — mode déterministe (aucun fournisseur LLM réel configuré ; données réelles, zéro simulation)\n\n` +
    `**État** : ${b.products ?? 0} produits (${b.published ?? 0} publiés) · CA ${b.revenueEur ?? 0} € · ${b.orders ?? 0} commandes · ` +
    `${o.canaux?.connected ?? 0} canaux connectés · ${o.reposGithub?.total ?? 0} repos harvestés · ${o.liens?.productLinks ?? 0} liens d'accès produits\n\n` +
    `**Actions sûres exécutées** : ${actions.length ? actions.map(a => `${a.tool} (${a.status})`).join(', ') : 'aucune (observations uniquement)'}\n\n` +
    `**Anomalies** : ${anomalies.length ? anomalies.join(' · ') : 'aucune détectée'}\n\n` +
    `**RECOMMANDATION** : ${recs[0]}`;
  return { report, recommendations: recs.slice(0, 3) };
}

// ---------- Extrait des recommandations d'un rapport LLM ----------

function extractRecommendations(text: string): string[] {
  const m = String(text || '').match(/RECOMMANDATION[^\n]*\n?([\s\S]{0,400})/i);
  if (!m) return [];
  const lines = m[1].split('\n').map(l => l.replace(/^[-*\s>]+/, '').trim()).filter(Boolean);
  return lines.slice(0, 2);
}

// ---------- Consignes du cycle ----------

const AUTONOMY_SYSTEM_PROMPT = `Tu es HERMES en CYCLE AUTONOME planifié (aucun utilisateur à l'écran). Périmètre « autonomie sûre » :
1. Tu ne peux exécuter QUE les skills qui t'ont été offertes (lecture + veille + création de BROUILLONS). Le re-pricing, la publication, la suppression, la diffusion canaux et la configuration sont INTERDITS en autonomie : si tu les juges nécessaires, écris-les dans la section RECOMMANDATION.
2. Ne crée un brouillon (produit, contenu, bundle, opportunité) QUE s'il est concret, exploitable tel quel et sans doublon (vérifie le catalogue/le contenu avant). Jamais de placeholder.
3. Zéro invention : chaque chiffre vient de l'observation ou du résultat d'un skill. Donnée manquante = dis-le.
4. Ne révèle aucun secret.
5. Rapport final EN FRANÇAIS, ≤150 mots, format exact :
🤖 **Cycle autonome** — <état en 1 ligne chiffrée>
**Actions** : <0-2 actions exécutées avec leur résultat, ou « aucune »>
**RECOMMANDATION** : <1 seule recommandation prioritaire ; si elle exige une action sensible, le préciser>`;

function cyclePrompt(obsSummary: string): string {
  return `CYCLE AUTONOME — observation de la plateforme (données serveur réelles, déjà exécutées) :
${obsSummary}

Décide maintenant :
- Si une action SÛRE est clairement justifiée (max 2) : veille GitHub (repos_harvest), création d'un brouillon produit/contenu à forte valeur (catalog_create / content_create — vérifie d'abord l'existant), contrôle de liens. Sinon ne lance aucun outil.
- Rédige ensuite le rapport final au format exigé.`;
}

// ---------- Cycle ----------

export async function runAutonomyCycle(trigger: 'timer' | 'api' = 'api'): Promise<AutonomyReport | { skipped: true; reason: string }> {
  if (running) return { skipped: true, reason: 'Un cycle autonome est déjà en cours.' };
  running = true;
  const t0 = Date.now();
  try {
    const cfg = await getAutonomyConfig();
    const checkDue = (cfg.runs || 0) % 2 === 0;

    // 1) OBSERVATION — skills réelles sur données réelles
    const obs: Record<string, any> = {};
    obs.overview = await runObs('platform_overview', {});
    obs.metrics = await runObs('metrics_summary', {});
    obs.audit = await runObs('audit_system', {});
    obs.repos = await runObs('repos_list', { limit: 5 });
    obs.links = await runObs('platform_links', checkDue ? { check: true } : {});
    const obsSummary = JSON.stringify(obs).slice(0, 2600);
    const anomalies = collectAnomalies(obs);
    const actions: AutonomyReport['actions'] = [];
    let recommendations: string[] = [];
    let reportText = '';
    let provider = 'déterministe (sans LLM réel)';

    // 2) PLAN → ACTION
    const pool = await buildPool();
    const real = pool.find(p => p.kind !== 'mock');
    if (real) {
      const result = await runAgentChat({
        agentId: 'orchestrator',
        prompt: cyclePrompt(obsSummary),
        history: [],
        actor: 'cycle-autonome',
        allowedTools: AUTONOMY_SAFE_SKILLS,
        systemAddition: AUTONOMY_SYSTEM_PROMPT
      });
      reportText = result.response;
      provider = result.provider && result.provider !== 'aucun' ? `${result.provider} (${result.model})` : provider;
      for (const s of result.steps) actions.push({ tool: s.tool, status: s.status, summary: s.summary });
      recommendations = extractRecommendations(reportText);
    } else {
      // Cycle déterministe : 2 actions sûres fixes si justifiées
      const overview = obs.overview || {};
      const reposTotal = (obs.repos?.total ?? 0);
      if (reposTotal < 8) {
        const skill = getSkill('repos_harvest');
        if (skill) {
          try {
            const r = await Promise.race([skill.run({ query: 'ai agent', limit: 5 }, { actor: 'cycle-autonome', agentId: 'autonomy', conversation: 'cycle autonome' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout repos_harvest')), 25_000))]);
            actions.push({ tool: 'repos_harvest', status: 'ok', summary: `veille « ai agent » : ${r.added ?? 0} ajouté(s), total ${r.total ?? reposTotal}` });
          } catch (e: any) {
            actions.push({ tool: 'repos_harvest', status: 'error', summary: String(e?.message || e).slice(0, 120) });
          }
        }
      }
      if (checkDue) {
        const base = String(process.env.PUBLIC_URL || '').trim().replace(/\/$/, '');
        const toCheck = base
          ? [`${base}/sitemap.xml`, `${base}/feed.xml`]
          : [];
        if (toCheck.length > 0) {
          const health = await Promise.all(toCheck.slice(0, 3).map(u => checkUrlHealth(u)));
          const okCount = health.filter(h => h.ok).length;
          actions.push({ tool: 'platform_links (check)', status: okCount === health.length ? 'ok' : 'error', summary: `${okCount}/${health.length} liens principaux OK` });
        }
      }
      const built = buildDeterministicReport(obs, actions, anomalies);
      reportText = built.report;
      recommendations = built.recommendations;
    }

    // 3) RAPPORT + journal
    const report: AutonomyReport = {
      at: new Date().toISOString(),
      trigger,
      provider,
      ms: Date.now() - t0,
      observation: obsSummary,
      report: reportText.slice(0, 2000),
      actions: actions.slice(0, 8),
      recommendations: recommendations.slice(0, 3),
      anomalies: anomalies.slice(0, 6)
    };
    await saveReport(report);
    await pushAudit({
      at: report.at, agent: 'autonomy', actor: trigger, tool: 'autonomy_cycle',
      status: 'ok', ms: report.ms,
      summary: report.report.replace(/\s+/g, ' ').slice(0, 200)
    });
    await saveAutonomyConfig({});
    const after = await getAutonomyConfig();
    await kvSet(CONFIG_KEY, { ...after, lastRunAt: report.at, lastReportAt: report.at, runs: (after.runs || 0) + 1 });
    return report;
  } finally {
    running = false;
  }
}

// ---------- Planificateur (côté serveur) ----------

let timer: ReturnType<typeof setInterval> | null = null;

export function stopAutonomyScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}

export async function startAutonomyScheduler(): Promise<void> {
  stopAutonomyScheduler();
  const tick = async () => {
    if (running) return;
    try {
      const cfg = await getAutonomyConfig();
      if (!cfg.enabled) return;
      const last = cfg.lastRunAt ? Date.parse(cfg.lastRunAt) : 0;
      if (Date.now() - last >= (cfg.intervalMinutes - 1) * 60_000) {
        console.log(`[hermes:autonomy] cycle planifié (intervalle ${cfg.intervalMinutes} min, runs=${cfg.runs})`);
        await runAutonomyCycle('timer');
      }
    } catch (e: any) {
      console.error('[hermes:autonomy] tick error:', e?.message || e);
    }
  };
  timer = setInterval(() => { void tick(); }, 60_000);
  timer.unref?.();
  // Premier cycle 90 s après le démarrage (si enabled) — journal visible vite.
  const first = setTimeout(() => { void tick(); }, 90_000);
  first.unref?.();
  console.log('[hermes:autonomy] planificateur démarré (vérification 60 s, 1er cycle ~90 s après boot si activée)');
}
