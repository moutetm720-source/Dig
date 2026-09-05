/**
 * hermes/engine.ts — Boucle agent HERMES (v4 réelle).
 *
 * Boucle plan → action → observation (pattern ReAct / hermes-agent) :
 *   1. LLM RÉEL (Gemini / endpoint compatible OpenAI) reçoit le system prompt de
 *      l'agent + l'historique + les déclarations des skills.
 *   2. S'il appelle des skills → exécution SERVEUR (validation, budgets,
 *      porte de confirmation, audit) → résultat renvoyé comme observation.
 *   3. Répétition jusqu'à une réponse texte finale ou épuisement du budget.
 *
 * SÉCURITÉ :
 *  - budgets durs : MAX_STEPS appels LLM, MAX_TOOL_CALLS exécutions
 *  - skills destructifs : jamais sans confirm:true (flux pending + /confirm)
 *  - chaque appel de skill : entrée d'audit (df_hermes_activity)
 *  - AUCUN MODE TEST : le fournisseur mock a été supprimé. Sans fournisseur
 *    réel, le moteur l'annonce et se limite aux skills sur données réelles
 *    (zéro simulation de langage, zéro chiffre inventé).
 */
import crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { AgentEvent, AgentStep, HermesChatResponse, HERMES_LIMITS, HermesContext, LLMChatResult } from './types';
import type { PoolEntry } from './providers';
import { buildPool, chatWithFailover, truncateForLLM, maskSecret, getHermesConfig } from './providers';
import { getSkill, declareSkills, skillRegistry } from './tools';
import { getAgent, getAgents } from './agents';

// ---------- Audit ----------

async function pushAudit(entry: Record<string, any>): Promise<void> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_activity'));
    let list: any[] = [];
    if (r.length > 0 && r[0].value) {
      list = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (!Array.isArray(list)) list = [];
    }
    list.unshift(entry);
    await db.insert(keyValueStore).values({ key: 'df_hermes_activity', value: list.slice(0, 200) })
      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: list.slice(0, 200) } });
  } catch (e) {}
}

// ---------- Actions en attente de confirmation ----------

interface PendingAction {
  tool: string;
  args: Record<string, any>;
  actor: string;
  agentId: string;
  expiresAt: number;
}
const pendingActions = new Map<string, PendingAction>();

function setPending(tool: string, args: Record<string, any>, actor: string, agentId: string): string {
  // Purge des expirés
  const now = Date.now();
  for (const [k, v] of pendingActions) if (v.expiresAt < now) pendingActions.delete(k);
  const actionId = crypto.randomBytes(10).toString('hex');
  pendingActions.set(actionId, { tool, args, actor, agentId, expiresAt: now + HERMES_LIMITS.CONFIRM_TTL_MS });
  return actionId;
}

// ---------- Exécution d'un skill (portée) ----------

// Masquage des secrets dans les args avant traces (steps, audit, mémoire) :
// aucune clé/token ne transite en clair dans les journaux ni dans le contexte LLM.
function maskArgsForTrace(args: Record<string, any> | undefined): Record<string, any> {
  if (!args || typeof args !== 'object') return args || {};
  const out: Record<string, any> = { ...args };
  for (const k of Object.keys(out)) {
    if (/api_?key|token|secret|password|passwd|pwd/i.test(k) && typeof out[k] === 'string' && out[k]) {
      out[k] = maskSecret(out[k]);
    }
  }
  return out;
}

async function executeSkill(
  toolName: string,
  args: Record<string, any>,
  ctx: HermesContext,
  steps: AgentStep[],
  callCount: { n: number }
): Promise<{ result: any; status: AgentStep['status']; actionId?: string; summary: string }> {
  const t0 = Date.now();
  const safeArgs = maskArgsForTrace(args);
  const skill = getSkill(toolName);
  if (!skill) {
    const msg = `Skill inconnu : ${toolName}.`;
    steps.push({ tool: toolName, args: safeArgs, status: 'denied', summary: msg });
    return { result: { error: msg }, status: 'denied', summary: msg };
  }
  if (callCount.n >= HERMES_LIMITS.MAX_TOOL_CALLS) {
    const msg = 'Budget d\u2019outils épuisé pour cette requête.';
    steps.push({ tool: toolName, args: safeArgs, status: 'denied', summary: msg });
    return { result: { error: msg }, status: 'denied', summary: msg };
  }

  // Porte de confirmation (skills sensibles)
  if (skill.requiresConfirmation && args?.confirm !== true) {
    const summary = `Exécution de ${skill.name} avec args : ${JSON.stringify(safeArgs).slice(0, 200)}`;
    const actionId = setPending(skill.name, args, ctx.actor, ctx.agentId);
    steps.push({ tool: skill.name, args: safeArgs, status: 'confirmation_required', summary: summary.slice(0, 200) });
    await pushAudit({ at: new Date().toISOString(), agent: ctx.agentId, actor: ctx.actor, tool: skill.name, status: 'confirmation_required', actionId, args: JSON.stringify(safeArgs).slice(0, 300) });
    return { result: { needsConfirmation: true, summary, actionId }, status: 'confirmation_required', actionId, summary: summary.slice(0, 200) };
  }

  callCount.n += 1;
  try {
    const result = await Promise.race([
      skill.run(args, ctx),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Délai d\u2019exécution du skill dépassé (20 s).')), 20000))
    ]);
    const summary = summarizeResult(result);
    steps.push({ tool: skill.name, args: safeArgs, status: 'ok', summary });
    await pushAudit({ at: new Date().toISOString(), agent: ctx.agentId, actor: ctx.actor, tool: skill.name, status: 'ok', ms: Date.now() - t0, args: JSON.stringify(safeArgs).slice(0, 300), summary: summary.slice(0, 200) });
    return { result, status: 'ok', summary };
  } catch (e: any) {
    const msg = `Échec : ${e?.message || e}`;
    steps.push({ tool: skill.name, args: safeArgs, status: 'error', summary: msg.slice(0, 200) });
    await pushAudit({ at: new Date().toISOString(), agent: ctx.agentId, actor: ctx.actor, tool: skill.name, status: 'error', ms: Date.now() - t0, error: msg.slice(0, 300) });
    return { result: { error: msg }, status: 'error', summary: msg.slice(0, 200) };
  }
}

function summarizeResult(result: any): string {
  try {
    const s = typeof result === 'string' ? result : JSON.stringify(result);
    return s.slice(0, 200);
  } catch {
    return 'résultat non sérialisable';
  }
}

// ---------- Contexte plateforme (injection dans le system prompt) ----------

async function platformContext(): Promise<string> {
  try {
    const keys = [
      'dpf_app_v2_products', 'dpf_app_v2_orders', 'dpf_app_v2_integrations',
      'df_github_repositories', 'df_affiliate_promo_kits_v1',
      'df_auto_pilot_enabled_v1', 'df_auto_pilot_enabled',
      'df_auto_loop_speed_v1', 'df_auto_loop_speed',
      'df_hermes_autonomy_config'
    ];
    const r = await db.select().from(keyValueStore).where(inArray(keyValueStore.key, keys));
    const map: Record<string, any> = {};
    for (const row of r) {
      const v = typeof row.value === 'string' ? safeParse(row.value) : row.value;
      map[row.key] = Array.isArray(v) ? v : (v ?? null);
    }
    const products = map['dpf_app_v2_products'] || [];
    const orders = map['dpf_app_v2_orders'] || [];
    const integrations = map['dpf_app_v2_integrations'] || [];
    const repos = map['df_github_repositories'] || [];
    const kits = map['df_affiliate_promo_kits_v1'] || [];
    const apEnabled = map['df_auto_pilot_enabled_v1'] ?? map['df_auto_pilot_enabled'] ?? null;
    const apSpeed = map['df_auto_loop_speed_v1'] || map['df_auto_loop_speed'] || '';
    const autonomy = map['df_hermes_autonomy_config'];
    const revenue = orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
    const topRepos = [...repos].sort((a: any, b: any) => (b.commercialViabilityScore || 0) - (a.commercialViabilityScore || 0)).slice(0, 3)
      .map((x: any) => `${x.fullName || x.name}`);
    const HERE = path.dirname(fileURLToPath(import.meta.url));
    const refsReady = (() => {
      try { return fs.readdirSync(path.join(HERE, '..', 'references')).filter(f => fs.readdirSync(path.join(HERE, '..', 'references', f)).length > 0).length; } catch { return 0; }
    })();
    return `ÉTAT ACTUEL DE LA PLATEFORME (données serveur, ${new Date().toISOString().slice(0, 10)}) :
- Produits : ${products.length} (dont ${products.filter((p: any) => p.status === 'published').length} publiés)
- Commandes : ${orders.length} — CA total : ${Math.round(revenue * 100) / 100} €
- Canaux : ${integrations.length} (dont ${integrations.filter((i: any) => i.connected).length} connectés)
- Repos GitHub harvestés : ${repos.length}${topRepos.length ? ` (top : ${topRepos.join(', ')})` : ''} — skills repos_list/repos_get/repos_harvest
- Liens plateforme : ${products.filter((p: any) => p.status === 'published').length} liens d'accès produits, sitemap.xml, feed.xml, ${Array.isArray(kits) ? kits.length : 0} kit(s) affilié(s) — skill platform_links
- Auto-pilot client (bots UI) : ${apEnabled === true || apEnabled === 'true' ? 'ACTIF' : apEnabled === false || apEnabled === 'false' ? 'EN PAUSE' : 'état inconnu'}${apSpeed ? ` (${apSpeed})` : ''} — Autonomie serveur d'Hermes : ${autonomy ? (autonomy.enabled ? `ON (intervalle ${autonomy.intervalMinutes} min)` : 'OFF') : 'non configurée'}
- Référentiels locaux (references/) : ${refsReady > 0 ? `${refsReady} initialisé(s) — skill reference_repos` : 'vides (submodules non initialisés)'}
Skills disponibles : ${skillRegistry.map(t => t.name).join(', ')}`;
  } catch {
    return 'ÉTAT ACTUEL DE LA PLATEFORME : indisponible temporairement.';
  }
}

function safeParse(v: string): any {
  try { return JSON.parse(v); } catch { return v; }
}

// ---------- Boucle principale ----------

export async function runAgentChat(opts: {
  agentId?: string;
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  actor: string;
  /** Restreint les skills offertes (autonomie : périmètre sûr). */
  allowedTools?: string[];
  /** Bloc ajouté au system prompt (ex: consignes du cycle autonome). */
  systemAddition?: string;
}): Promise<HermesChatResponse> {
  const agent = getAgent(opts.agentId || 'orchestrator');
  const ctx: HermesContext = {
    actor: opts.actor,
    agentId: agent.id,
    conversation: opts.prompt.slice(0, 500)
  };

  // POOL MULTI-FOURNISSEURS RÉELS : bascule automatique (429/erreur → cooldown →
  // suivant). S'il n'y a AUCUN fournisseur réel, pas de simulation : on exécute
  // des skills sur les données réelles et on l'annonce.
  const pool = await buildPool();
  if (pool.length === 0) {
    const steps: AgentStep[] = [];
    const callCount = { n: 0 };
    const metrics = await executeSkill('metrics_summary', {}, ctx, steps, callCount);
    const audit = await executeSkill('audit_system', {}, ctx, steps, callCount);
    const response =
      `⚠️ **Aucun fournisseur IA RÉEL configuré** — je ne simule rien (le mode test/mock a été supprimé) :\n\n` +
      `je ne peux donc pas interpréter librement votre demande, mais j'exécute mes skills sur vos **données réelles**.\n\n` +
      `Pour m'activer pleinement :\n` +
      `- **Gemini** (gratuit) : \`GEMINI_API_KEY\` — ou\n` +
      `- **Modèles open-source locaux** : Ollama sur \`HERMES_OPENAI_BASE_URL=http://localhost:11434/v1\` + \`HERMES_OPENAI_MODEL=llama3.1\` — ou\n` +
      `- tout endpoint compatible OpenAI (Groq, OpenRouter...) — ou\n` +
      `- **ajoutez un fournisseur au pool** (je le fais moi-même : « ajoute Groq au pool de fournisseurs IA »)\n\n` +
      `Voici l'état **réel** de votre plateforme (aucun chiffre inventé) :\n\n` +
      `**Métriques** : \`${summarizeResult(metrics.result)}\`\n\n` +
      `**Audit système** : \`${summarizeResult(audit.result)}\`\n\n` +
      `Mes ${skillRegistry.length} skills restent opérationnels : dès qu'un fournisseur réel sera configuré, je les piloterai en langage naturel.`;
    await pushMemory(agent.id, opts.prompt, steps, response);
    return { response, provider: 'aucun', model: '-', agent: agent.id, steps };
  }

  // Construction du log d'événements
  const events: AgentEvent[] = [];
  const history = (opts.history || []).slice(-8);
  for (const h of history) {
    if (h && (h.role === 'user' || h.role === 'model') && h.text) {
      events.push({ type: 'text', role: h.role, text: String(h.text).slice(0, 2000) });
    }
  }
  events.push({ type: 'text', role: 'user', text: opts.prompt.slice(0, 4000) });

  const tools = declareSkills(agent.skills, opts.allowedTools);
  const system = `${agent.systemPrompt}\n\n${opts.systemAddition ? `${opts.systemAddition}\n\n` : ''}${await platformContext()}\n\nAgent en cours : ${agent.name} (${agent.id})`;
  const steps: AgentStep[] = [];
  const callCount = { n: 0 };
  let usage: { inputTokens?: number; outputTokens?: number } = {};
  let pendingConfirmation: HermesChatResponse['pendingConfirmation'];
  let finalText = '';

  let active: PoolEntry | null = null;
  for (let step = 0; step < HERMES_LIMITS.MAX_STEPS; step++) {
    let out: LLMChatResult;
    try {
      // Bascule automatique : si ce fournisseur rate-limit/échoue, le pool passe au suivant.
      const fo = await chatWithFailover({ system, events, tools });
      out = fo.result;
      active = fo.entry;
    } catch (e: any) {
      finalText = `⚠️ **Erreur du fournisseur LLM** (bascule automatique tentée sur ${pool.length} fournisseur(s)) : ${e?.message || e}\n\nTous les fournisseurs du pool sont en échec (rate-limit ou erreur) et passent en cooldown — réessayez dans un instant. Aucune action n'a été exécutée.`;
      break;
    }
    if (out.usage) {
      usage.inputTokens = (usage.inputTokens || 0) + (out.usage.inputTokens || 0);
      usage.outputTokens = (usage.outputTokens || 0) + (out.usage.outputTokens || 0);
    }

    // Appel(s) d'outils
    if (out.toolCalls && out.toolCalls.length > 0) {
      for (const call of out.toolCalls.slice(0, 4)) {
        if (!call?.name) continue;
        events.push({ type: 'tool_call', name: call.name, args: call.args || {} });
        const exec = await executeSkill(call.name, call.args || {}, ctx, steps, callCount);
        if (exec.status === 'confirmation_required' && exec.actionId) {
          pendingConfirmation = { actionId: exec.actionId, tool: call.name, summary: exec.result.summary };
        }
        events.push({ type: 'tool_result', name: call.name, result: truncateForLLM(exec.result) });
      }
      continue; // nouvelle itération LLM avec les observations
    }

    // Réponse finale
    finalText = out.text?.trim() || '✅ Action terminée (aucun texte généré — voir les étapes d\u2019outils ci-dessus).';
    break;
  }

  if (!finalText) {
    finalText = '⚠️ Budget de pas atteint sans conclusion. Résumez votre demande en une instruction plus précise.';
  }

  await pushMemory(agent.id, opts.prompt, steps, finalText);

  return {
    response: finalText,
    provider: active?.provider.label || 'aucun',
    model: active?.model || '-',
    agent: agent.id,
    steps,
    pendingConfirmation,
    usage: { ...usage }
  };
}

// ---------- Confirmation d'une action sensible ----------

export async function confirmPendingAction(actionId: string): Promise<{ ok: boolean; result?: any; error?: string }> {
  const pending = pendingActions.get(actionId);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingActions.delete(actionId);
    return { ok: false, error: 'Action inconnue ou expirée (délai 10 min). Relancez la demande.' };
  }
  pendingActions.delete(actionId);
  const ctx: HermesContext = { actor: pending.actor, agentId: pending.agentId, conversation: 'confirmation utilisateur' };
  const steps: AgentStep[] = [];
  const callCount = { n: 0 };
  const exec = await executeSkill(pending.tool, { ...pending.args, confirm: true }, ctx, steps, callCount);
  if (exec.status === 'error') return { ok: false, error: exec.summary };
  return { ok: true, result: exec.result };
}

// ---------- Sous-agent (dispatch_agent) ----------

export async function runSubAgent(agent: { id: string; name: string; systemPrompt: string; skills?: string[]; maxSteps?: number }, task: string): Promise<any> {
  const pool = await buildPool();
  if (pool.length === 0) {
    return { agent: agent.id, report: 'Sous-agent indisponible : aucun fournisseur LLM configuré.', steps: [] };
  }
  const ctx: HermesContext = { actor: 'sous-agent', agentId: agent.id, conversation: task.slice(0, 300) };
  const events: AgentEvent[] = [{ type: 'text', role: 'user', text: task }];
  const tools = declareSkills(agent.skills);
  const steps: AgentStep[] = [];
  const callCount = { n: 0 };
  const budget = Math.min(HERMES_LIMITS.SUB_AGENT_STEPS, agent.maxSteps || HERMES_LIMITS.SUB_AGENT_STEPS);
  let report = '';

  for (let i = 0; i < budget; i++) {
    let out: LLMChatResult;
    try {
      out = (await chatWithFailover({
        system: `${agent.systemPrompt}\n\nTu es un SOUS-AGENT (budget ${budget} pas). Rapport final en ≤120 mots.`,
        events,
        tools
      })).result;
    } catch (e: any) {
      report = `Erreur fournisseur sous-agent : ${e?.message || e}`;
      break;
    }
    if (out.toolCalls && out.toolCalls.length > 0) {
      let blocked = false;
      for (const call of out.toolCalls.slice(0, 3)) {
        if (!call?.name) continue;
        events.push({ type: 'tool_call', name: call.name, args: call.args || {} });
        const exec = await executeSkill(call.name, call.args || {}, ctx, steps, callCount);
        if (exec.status === 'confirmation_required') {
          blocked = true;
        }
        events.push({ type: 'tool_result', name: call.name, result: truncateForLLM(exec.result) });
      }
      if (blocked) {
        report = `Action sensible demandée par le sous-agent — confirmation requise de l'utilisateur principal.`;
        break;
      }
      continue;
    }
    report = out.text?.trim() || 'Sous-agent terminé (rapport vide).';
    break;
  }
  if (!report) report = 'Budget sous-agent épuisé.';

  await pushAudit({ at: new Date().toISOString(), agent: agent.id, actor: 'sous-agent', tool: 'dispatch', status: 'ok', summary: report.slice(0, 200) });
  return { agent: agent.id, report, steps: steps.map(s => ({ tool: s.tool, status: s.status, summary: s.summary })) };
}

// ---------- Mémoire conversationnelle ----------

async function pushMemory(agentId: string, prompt: string, steps: AgentStep[], response: string): Promise<void> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_memories'));
    let list: any[] = [];
    if (r.length > 0 && r[0].value) {
      list = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (!Array.isArray(list)) list = [];
    }
    list.unshift({
      at: new Date().toISOString(),
      agent: agentId,
      prompt: prompt.slice(0, 200),
      tools: steps.map(s => s.tool),
      response: response.slice(0, 300)
    });
    await db.insert(keyValueStore).values({ key: 'df_hermes_memories', value: list.slice(0, 50) })
      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: list.slice(0, 50) } });
  } catch (e) {}
}

// ---------- Export pour le routeur ----------

export { getAgents, getAgent };
export { skillRegistry as skills };
