/**
 * hermes/providers.ts — Couche multi-fournisseurs LLM (zéro dépendance ajoutée).
 *
 * RÉEL UNIQUEMENT : le fournisseur « mock » (réponses simulées) a été SUPPRIMÉ.
 * Hermes ne répond jamais avec une IA simulée — soit un fournisseur réel est
 * configuré (et la bascule automatique du pool évite tout blocage), soit le
 * moteur l'assume explicitement (skills exécutés sur données réelles, zéro
 * simulation de langage).
 *
 * Fournisseurs :
 *  - gemini   : @google/genai (dépendance existante) — gratuit (Gemini API tier).
 *               Repli automatique de modèle (GEMINI_MODEL_FALLBACKS) : Google
 *               bloque les modèles dépréciés (ex. gemini-2.5-flash) pour les
 *               nouvelles clés API bien avant l'arrêt officiel.
 *  - openai   : n'importe quel endpoint compatible OpenAI /chat/completions :
 *               Ollama local (gratuit, modèles open-source : llama3.1, qwen2.5,
 *               mistral...), Groq, OpenRouter, Together, llama.cpp...
 *               (installation locale guidée : node scripts/setup-local-llm.mjs)
 *
 * Sélecteurs (env ou KV df_hermes_config, modifiable par le modérateur) :
 *  - auto : gemini si GEMINI_API_KEY, sinon openai si HERMES_OPENAI_BASE_URL, sinon aucun
 */
import { GoogleGenAI } from '@google/genai';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { assertProviderBaseUrl } from '../ssrfGuard';
import { AgentEvent, LLMChatOptions, LLMChatResult, LLMProvider, HermesConfig, DEFAULT_HERMES_CONFIG, HERMES_LIMITS, ProviderSpec, HERMES_POOL } from './types';

import { freeOnlyEnabled, isLoopbackUrl, providerCostPolicy } from './providerPolicy';

// ---------- Config (env + KV) ----------

let configCache: { at: number; cfg: HermesConfig } | null = null;

/** Choix de fournisseur acceptés : RÉELS uniquement ('mock' définitivement retiré). */
const REAL_PROVIDER_CHOICES = ['auto', 'gemini', 'openai'] as const;

/** Message d'aide, réutilisé partout (status, erreurs de chat, autonomie). */
export function realProviderHelp(): string {
  return 'Configurez un modèle réellement local (HERMES_OPENAI_BASE_URL + HERMES_OPENAI_MODEL ; aide : node scripts/setup-local-llm.mjs) ou OpenRouter :free. Le mode sans API payante exclut les clés à facturation inconnue, dont GEMINI_API_KEY. Les endpoints anonymes ne sont essayés que si le repli est activé ; disponibilité et quotas non garantis. Voir GET /api/hermes/providers et /api/hermes/free-catalog.';
}

// ---------- Endpoints anonymes (repli optionnel, disponibilité non garantie) ----------
// Ces endpoints sans clé sont des candidats de repli, pas une garantie de service.
// Ils sont ajoutés en mode auto avec basse priorité (800+), sauf
// HERMES_ANONYMOUS_FALLBACK=0. Ne jamais y transmettre la clé d’un autre endpoint.
// Source : hermes/knowledge/free-llm-apis.json
// Seuls OVH et LLM7 sont vraiment anonymes ; Groq/OpenRouter exigent une clé gratuite.
export const FREE_ANONYMOUS_PROVIDERS: ProviderSpec[] = [
  {
    name: 'ovh-free',
    kind: 'openai',
    model: 'gpt-oss-20b',
    baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
    priority: 800,
  },
  {
    name: 'llm7-free',
    kind: 'openai',
    model: 'gpt-oss:20b',
    baseUrl: 'https://api.llm7.io/v1',
    priority: 810,
  },
];

export async function getHermesConfig(): Promise<HermesConfig> {
  if (configCache && Date.now() - configCache.at < 15 * 1000) return configCache.cfg;
  let cfg: HermesConfig = { ...DEFAULT_HERMES_CONFIG };
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_config'));
    if (r.length > 0 && r[0].value) {
      const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (v && typeof v === 'object') {
        if ((REAL_PROVIDER_CHOICES as readonly string[]).includes(v.provider)) {
          cfg.provider = v.provider;
        } else if (v.provider) {
          // Ancienne valeur « mock » (mode test) persistée en base → jamais réutilisée.
          console.warn(`[hermes] provider « ${String(v.provider).slice(0, 20)} » refusé (non réel) — repli sur « auto ». ${realProviderHelp()}`);
        }
        if (typeof v.geminiModel === 'string' && v.geminiModel) cfg.geminiModel = v.geminiModel.slice(0, 80);
        if (typeof v.openaiBaseUrl === 'string') cfg.openaiBaseUrl = v.openaiBaseUrl.slice(0, 300);
        if (typeof v.openaiModel === 'string' && v.openaiModel) cfg.openaiModel = v.openaiModel.slice(0, 120);
      }
    }
  } catch (e) {}
  configCache = { at: Date.now(), cfg };
  return cfg;
}

export async function saveHermesConfig(patch: Partial<HermesConfig>): Promise<HermesConfig> {
  const current = await getHermesConfig();
  const next: HermesConfig = { ...current, ...patch };
  if (String(patch.provider || '').toLowerCase() === 'mock') {
    throw new Error("Le fournisseur « mock » (mode test) a été supprimé : Hermes n'accepte qu'un fournisseur IA réel. Choisissez 'auto', 'gemini' ou 'openai'.");
  }
  if (!(REAL_PROVIDER_CHOICES as readonly string[]).includes(next.provider)) next.provider = 'auto';
  next.geminiModel = String(next.geminiModel || '').slice(0, 80) || DEFAULT_HERMES_CONFIG.geminiModel;
  next.openaiBaseUrl = String(next.openaiBaseUrl || '').slice(0, 300);
  next.openaiModel = String(next.openaiModel || '').slice(0, 120) || DEFAULT_HERMES_CONFIG.openaiModel;
  await db.insert(keyValueStore).values({ key: 'df_hermes_config', value: next })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: next } });
  configCache = null;
  return next;
}

// ---------- Gemini ----------

let geminiClient: GoogleGenAI | null = null;

/**
 * Chaîne de repli des modèles Gemini, du plus récent au plus ancien.
 *
 * Google bloque les modèles dépréciés pour les NOUVELLES clés API bien avant
 * leur arrêt officiel : `gemini-2.5-flash` renvoie déjà 404
 * « This model is no longer available to new users » pour une clé récente,
 * alors que l'arrêt officiel est le 20/10/2026. Sur ce type d'erreur 404, le
 * fournisseur bascule automatiquement sur le modèle suivant et mémorise le
 * premier qui répond (plus aucun 404 ensuite pour ce process).
 * Source : https://ai.google.dev/gemini-api/docs/deprecations
 * Remplaçant recommandé de gemini-2.5-flash : gemini-3.5-flash-lite.
 */
export const GEMINI_MODEL_FALLBACKS: readonly string[] = [
  'gemini-3.5-flash-lite', // remplaçant recommandé (GA 21/07/2026) — défaut
  'gemini-3.8-flash',      // dernier flash GA (02/09/2026)
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',      // encore actif pour les ANCIENNES clés (arrêt 20/10/2026)
  'gemini-2.5-flash-lite'
];

/** Erreurs déclenchant le repli sur le modèle Gemini suivant (404 modèle déprécié/absent). */
const GEMINI_MODEL_GONE_RE = /no longer available|not found|NOT_FOUND|does not exist|isn't supported|unsupported model|unknown model|invalid model/i;

/** Modèle configuré → modèle qui répond réellement (mémoire process : évite les 404 en rafale). */
const geminiResolvedModels = new Map<string, string>();
/** Avertissement de repli émis une seule fois par modèle configuré (pas de spam de logs). */
const geminiFallbackWarned = new Set<string>();

/** Chaîne effective essayée pour un modèle configuré (dédupe, sans vides). */
export function geminiModelChain(model: string): string[] {
  const resolved = geminiResolvedModels.get(model);
  // Modèle résolu EN PREMIER (sinon chaque appel paierait un 404 avant repli),
  // puis modèle configuré, puis la chaîne de repli officielle.
  return [...new Set([...(resolved ? [resolved] : []), model, ...GEMINI_MODEL_FALLBACKS].filter(Boolean))];
}

export class GeminiProvider implements LLMProvider {
  id = 'gemini' as const;
  model: string;
  label: string;
  /** Dernier modèle ayant réellement répondu (diagnostic statut/UI). */
  effectiveModel?: string;
  constructor(model: string) {
    this.model = model;
    this.label = `Gemini (${model})`;
  }

  async chat(opts: LLMChatOptions): Promise<LLMChatResult> {
    if (!geminiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY absente.');
      // GEMINI_BASE_URL (optionnel) : endpoint alternatif (proxy d'entreprise,
      // tests). Par défaut : endpoint public Google AI Studio.
      const baseUrl = process.env.GEMINI_BASE_URL || undefined;
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: { ...(baseUrl ? { baseUrl } : {}), headers: { 'User-Agent': 'aistudio-build' } }
      });
    }

    const lastErrors: string[] = [];
    for (const model of geminiModelChain(this.model)) {
      try {
        const result = await this.chatOnce(model, opts);
        this.effectiveModel = model;
        if (model !== this.model) {
          geminiResolvedModels.set(this.model, model);
          if (!geminiFallbackWarned.has(this.model)) {
            geminiFallbackWarned.add(this.model);
            console.warn(`[hermes] Modèle Gemini « ${this.model} » indisponible (déprécié pour cette clé ?) — repli automatique sur « ${model} », mémorisé pour ce process. Dernière erreur : ${lastErrors[lastErrors.length - 1] || '?'}`);
          }
        } else {
          geminiResolvedModels.delete(this.model); // le modèle configuré répond à nouveau
          geminiFallbackWarned.delete(this.model);
        }
        return result;
      } catch (e: any) {
        opts.signal?.throwIfAborted();
        const msg = String(e?.message || e);
        // 404 « modèle déprécié / inexistant » → essai du modèle suivant.
        if (GEMINI_MODEL_GONE_RE.test(msg)) {
          lastErrors.push(`${model}: ${msg.slice(0, 120)}`);
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Aucun modèle Gemini disponible (essayés : ${geminiModelChain(this.model).join(', ')}). Dernières erreurs : ${lastErrors.join(' | ').slice(0, 300)}`);
  }

  private async chatOnce(model: string, opts: LLMChatOptions): Promise<LLMChatResult> {
    // Conversion du log plat en contents Gemini (texte + functionCall/functionResponse)
    // FIX thought_signature : Gemini 2.5/3.x avec thinking renvoie un thoughtSignature
    // dans chaque functionCall. Si on ne le renvoie pas à l'historique, l'API répond
    // 400 "Function call is missing a thought_signature". On le préserve donc.
    const contents: any[] = [];
    for (const ev of opts.events) {
      if (ev.type === 'text') {
        contents.push({ role: ev.role === 'model' ? 'model' : 'user', parts: [{ text: ev.text }] });
      } else if (ev.type === 'tool_call') {
        const sig = (ev as any).thoughtSignature || (ev as any).thought_signature;
        // Une signature appartient au Part qui porte functionCall (pas au
        // FunctionCall ni à un Part vide séparé).
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name: ev.name, args: ev.args || {} }, ...(sig ? { thoughtSignature: sig } : {}) }]
        });
      } else if (ev.type === 'tool_result') {
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: ev.name, response: { result: truncateForLLM(ev.result) } } }]
        });
      }
    }

    const res = await withTimeout(geminiClient.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: opts.system,
        abortSignal: AbortSignal.any([...(opts.signal ? [opts.signal] : []), AbortSignal.timeout(HERMES_LIMITS.LLM_TIMEOUT_MS)]),
        ...(opts.tools.length ? { tools: [{ functionDeclarations: opts.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters as any
        })) }] } : {}),
        temperature: 0.3
      }
    }), HERMES_LIMITS.LLM_TIMEOUT_MS);

    const candidate = (res as any)?.candidates?.[0];
    const parts: any[] = candidate?.content?.parts || [];
    const toolCalls: Array<{ name: string; args: Record<string, any>; thoughtSignature?: string }> = [];
    let text = '';
    let lastThoughtSignature: string | undefined;
    for (const p of parts) {
      // Le thoughtSignature peut arriver comme part séparée juste avant functionCall
      if (p.thoughtSignature || p.thought_signature) {
        lastThoughtSignature = p.thoughtSignature || p.thought_signature;
      }
      if (p.functionCall) {
        const sig = p.functionCall.thoughtSignature || p.functionCall.thought_signature || lastThoughtSignature || p.thoughtSignature || (p as any).thought_signature;
        toolCalls.push({
          name: String(p.functionCall.name),
          args: p.functionCall.args || {},
          ...(sig ? { thoughtSignature: sig, thought_signature: sig } : {})
        });
        lastThoughtSignature = undefined;
      } else if (typeof p.text === 'string' && !p.thought) {
        text += p.text;
        lastThoughtSignature = undefined;
      }
    }
    return {
      text: text || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: (res as any)?.usageMetadata
        ? { inputTokens: (res as any).usageMetadata.promptTokenCount, outputTokens: (res as any).usageMetadata.candidatesTokenCount }
        : undefined
    };
  }
}

// ---------- Compatible OpenAI (Ollama local, Groq, OpenRouter, llama.cpp...) ----------

export class OpenAICompatProvider implements LLMProvider {
  id = 'openai' as const;
  model: string;
  baseUrl: string;
  label: string;
  private key?: string;
  constructor(baseUrl: string, model: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
    this.key = apiKey; // chaîne vide explicite = ne JAMAIS hériter d’une clé d’un autre endpoint
    this.label = `OpenAI-compatible ${this.baseUrl} (${model})`;
  }

  async chat(opts: LLMChatOptions): Promise<LLMChatResult> {
    // Conversion du log plat en messages OpenAI
    const messages: any[] = [{ role: 'system', content: opts.system }];
    for (const ev of opts.events) {
      if (ev.type === 'text') {
        messages.push({ role: ev.role === 'model' ? 'assistant' : 'user', content: ev.text });
      } else if (ev.type === 'tool_call') {
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{ id: `call_${messages.length}`, type: 'function', function: { name: ev.name, arguments: JSON.stringify(ev.args || {}) } }]
        });
      } else if (ev.type === 'tool_result') {
        messages.push({ role: 'tool', tool_call_id: `call_${Math.max(0, messages.length - 1)}`, content: JSON.stringify(truncateForLLM(ev.result)) });
      }
    }

    const body: any = {
      model: this.model,
      messages,
      temperature: 0.3
    };
    if (opts.tools.length > 0) {
      body.tools = opts.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters }
      }));
    }

    // Clé du fournisseur (pool) en priorité, sinon variable d'environnement.
    // (bug historique : la clé apiKey d'un fournisseur du pool était ignorée
    //  au profit de HERMES_OPENAI_API_KEY — 401 sur Groq/OpenRouter.)
    const key = this.key ?? process.env.HERMES_OPENAI_API_KEY ?? '';
    let res: Response;
    try {
      res = await withTimeout(fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { Authorization: `Bearer ${key}` } : {})
        },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.any([...(opts.signal ? [opts.signal] : []), AbortSignal.timeout(HERMES_LIMITS.LLM_TIMEOUT_MS)])
      }), HERMES_LIMITS.LLM_TIMEOUT_MS);
    } catch (e: any) {
      opts.signal?.throwIfAborted();
      const msg = String(e?.message || e);
      if (/Délai LLM dépassé/.test(msg)) throw e;
      // « fetch failed » nu : on explicite l'endpoint et la cause réseau pour
      // un diagnostic immédiat (service non démarré, mauvais port, DNS…).
      const cause = (e?.cause && (e.cause.code || e.cause.message)) || msg || 'erreur réseau';
      throw new Error(`Endpoint OpenAI-compatible injoignable : ${this.baseUrl} (${cause}). ` +
        (this.baseUrl.includes('//localhost') || this.baseUrl.includes('//127.0.0.1')
          ? `Vérifiez que le serveur local tourne — ex. Ollama : \`ollama serve\` puis \`ollama pull ${this.model}\`, ou lancez \`node scripts/setup-local-llm.mjs\`.`
          : 'Vérifiez l\'URL (HERMES_OPENAI_BASE_URL), le port et votre réseau.'));
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const retryAfter = res.headers.get('retry-after');
      throw new Error(`Fournisseur OpenAI-compatible : HTTP ${res.status}${retryAfter ? ` (retry-after ${retryAfter}s)` : ''} ${errText.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const msg = data?.choices?.[0]?.message;
    const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];
    if (Array.isArray(msg?.tool_calls)) {
      for (const tc of msg.tool_calls) {
        let args: Record<string, any> = {};
        try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { throw new Error('Arguments JSON invalides dans un appel d’outil.'); }
        if (!args || typeof args !== 'object' || Array.isArray(args) || !tc.function?.name) throw new Error('Appel d’outil mal formé.');
        toolCalls.push({ name: String(tc.function?.name || ''), args });
      }
    }
    return {
      text: typeof msg?.content === 'string' && msg.content ? msg.content : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data?.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined
    };
  }
}

// ---------- Mode test SUPPRIMÉ ----------
//
// Le fournisseur « mock » (réponses d'IA simulées) a été RETIRÉ du moteur :
// Hermes ne fabrique plus jamais de texte qui imite une IA. Sans fournisseur
// réel, le moteur l'annonce et exécute uniquement des skills sur des données
// réelles (voir hermes/engine.ts). Les tests E2E (scripts/verify-hermes.mjs)
// s'exécutent désormais contre un fournisseur réel.

// ---------- Sélection ----------

export async function getActiveProvider(): Promise<{ provider: LLMProvider | null; reason: string }> {
  const cfg = await getHermesConfig();
  const envForce = (process.env.HERMES_PROVIDER || '').toLowerCase();
  const choice = envForce || cfg.provider;

  try {
    if (choice === 'mock') {
      // HERMES_PROVIDER=mock (mode test) n'est plus supporté : on ne simule pas.
      console.warn(`[hermes] HERMES_PROVIDER=mock ignoré (mode test supprimé) — repli sur « auto ». ${realProviderHelp()}`);
      const env = process.env.HERMES_PROVIDER ? ' (env)' : ' (base)';
      if (process.env.GEMINI_API_KEY) {
        return { provider: new GeminiProvider(cfg.geminiModel), reason: `auto→gemini${env} (mock refusé)` };
      }
      if (cfg.openaiBaseUrl) {
        return { provider: new OpenAICompatProvider(cfg.openaiBaseUrl, cfg.openaiModel), reason: `auto→openai-compatible${env} (mock refusé)` };
      }
      return { provider: null, reason: `HERMES_PROVIDER=mock refusé (mode test supprimé) et aucun fournisseur réel configuré. ${realProviderHelp()}` };
    }
    if (choice === 'gemini') {
      if (!process.env.GEMINI_API_KEY) return { provider: null, reason: 'gemini configuré mais GEMINI_API_KEY absente' };
      return { provider: new GeminiProvider(cfg.geminiModel), reason: 'gemini' };
    }
    if (choice === 'openai') {
      if (!cfg.openaiBaseUrl) return { provider: null, reason: 'openai configuré mais HERMES_OPENAI_BASE_URL absente' };
      return { provider: new OpenAICompatProvider(cfg.openaiBaseUrl, cfg.openaiModel), reason: 'openai-compatible' };
    }
    // auto
    if (process.env.GEMINI_API_KEY) {
      return { provider: new GeminiProvider(cfg.geminiModel), reason: 'auto→gemini' };
    }
    if (cfg.openaiBaseUrl) {
      return { provider: new OpenAICompatProvider(cfg.openaiBaseUrl, cfg.openaiModel), reason: 'auto→openai-compatible' };
    }
    return { provider: null, reason: `aucun fournisseur IA réel configuré. ${realProviderHelp()}` };
  } catch (e: any) {
    return { provider: null, reason: `erreur de sélection fournisseur : ${e?.message}` };
  }
}

// ---------- POOL MULTI-FOURNISSEURS (gestionnaire d'API & tokens + bascule automatique) ----------
//
// Objectif : ne JAMAIS être bloqué, et toujours avec une IA RÉELLE. Le pool mélange :
//   1. les fournisseurs déclarés dans l'environnement (GEMINI_API_KEY, HERMES_OPENAI_BASE_URL) ;
//   2. les fournisseurs gérés au RUNTIME (KV df_hermes_provider_pool — protégée,
//      modifiable par Hermes via les skills providers_* ou l'API REST).
// À chaque appel LLM, si un fournisseur renvoie 429/5xx/timeout, il passe en
// cooldown (30 s sur rate-limit — ou Retry-After — ; 15 s sur erreur) et le
// suivant est essayé automatiquement.

export interface PoolEntry {
  name: string;
  kind: 'gemini' | 'openai';
  model: string;
  baseUrl?: string;
  local?: boolean;
  priority: number;
  source: 'env' | 'pool';
  provider: LLMProvider;
  hasKey: boolean;
  /** Clé masquée (jamais en clair) — renseignée pour les vues statut/UI. */
  keyMasked?: string | null;
}

interface PoolStat { calls: number; ok: number; errors: number; cooldownUntil: number; lastError: string; lastErrorAt: number }
const poolStats = new Map<string, PoolStat>();

const emptyStat = (): PoolStat => ({ calls: 0, ok: 0, errors: 0, cooldownUntil: 0, lastError: '', lastErrorAt: 0 });

function stat(name: string): PoolStat {
  let st = poolStats.get(name);
  if (!st) { st = emptyStat(); poolStats.set(name, st); }
  return st;
}

/** Un secret n'est JAMAIS exposé tel quel (UI, audit, logs, API) : seul sa longueur est signalée. */
export function maskSecret(v: any): string {
  if (typeof v !== 'string' || !v) return '';
  return `•••• (${v.length} car.)`;
}

function specFromEnv(name: string, kind: 'gemini' | 'openai', model: string, priority: number, baseUrl?: string, apiKey?: string, local?: boolean): ProviderSpec {
  return { name, kind, model, priority, ...(baseUrl ? { baseUrl } : {}), ...(apiKey ? { apiKey } : {}), ...(local ? { local: true } : {}) };
}

async function loadPoolSpecs(): Promise<ProviderSpec[]> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, HERMES_POOL.KV_KEY));
    if (r.length > 0 && r[0].value) {
      const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (Array.isArray(v)) {
        const real = v
          .filter((x: any) => x && typeof x === 'object' && typeof x.name === 'string' && ['gemini', 'openai'].includes(x.kind))
          .slice(0, HERMES_POOL.MAX_PROVIDERS);
        // Nettoyage : un ancien fournisseur « mock » persisté est retiré du pool.
        if (real.length !== v.length) {
          console.warn(`[hermes] ${v.length - real.length} fournisseur(s) non réel(s) (mock) purgé(s) du pool.`);
          void savePoolSpecs(real).catch(() => {});
        }
        return real;
      }
    }
  } catch {}
  return [];
}

async function savePoolSpecs(specs: ProviderSpec[]): Promise<void> {
  await db.insert(keyValueStore).values({ key: HERMES_POOL.KV_KEY, value: specs })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: specs } });
}

function providerFromSpec(spec: ProviderSpec): LLMProvider {
  if (spec.kind === 'gemini') return new GeminiProvider(spec.model || DEFAULT_HERMES_CONFIG.geminiModel);
  if (spec.kind === 'openai') return new OpenAICompatProvider(spec.baseUrl || '', spec.model || '', spec.apiKey ?? '');
  throw new Error(`Fournisseur « ${spec.name} » de type inconnu (fournisseurs réels uniquement : gemini, openai).`);
}

/** Pool complet, trié par priorité (1 = premier, 999 = dernier recours). */
export async function buildPool(): Promise<PoolEntry[]> {
  const cfg = await getHermesConfig();
  const envForce = (process.env.HERMES_PROVIDER || '').toLowerCase();
  // « mock » = ancien mode test : REFUSÉ. On retombe sur « auto » (fournisseurs réels).
  let choice = envForce || cfg.provider;
  if (choice === 'mock') {
    console.warn(`[hermes] HERMES_PROVIDER=mock ignoré dans le pool (mode test supprimé) — « auto » appliqué. ${realProviderHelp()}`);
    choice = 'auto';
  }
  const specs: ProviderSpec[] = [];
  const envLocal = isLoopbackUrl(cfg.openaiBaseUrl);

  if (choice === 'gemini' || choice === 'auto') {
    if (process.env.GEMINI_API_KEY) specs.push(specFromEnv('gemini-env', 'gemini', cfg.geminiModel, 10));
  }
  if (choice === 'openai' || choice === 'auto') {
    if (cfg.openaiBaseUrl) specs.push(specFromEnv('openai-env', 'openai', cfg.openaiModel, 20, cfg.openaiBaseUrl, process.env.HERMES_OPENAI_API_KEY || undefined, envLocal));
  }
  // Fournisseurs gérés au runtime (KV) — hors verrou exclusif gemini/openai
  if (choice === 'auto') {
    for (const s of await loadPoolSpecs()) specs.push(s);
    // --- GRATUITS : toujours présents en fallback (priorité 800+) ---
    // OVH et LLM7 sont sans clé, donc disponibles immédiatement.
    // Les autres (Groq, OpenRouter) ne seront utilisables que si une clé est fournie via env ou pool.
    // On filtre ceux qui nécessitent une clé si elle est absente, sauf si déjà en pool géré.
    if (process.env.HERMES_ANONYMOUS_FALLBACK !== '0') {
      for (const anonymous of FREE_ANONYMOUS_PROVIDERS) {
        if (!specs.some(s => s.baseUrl === anonymous.baseUrl)) specs.push({ ...anonymous });
      }
    }
    // Si une clé Groq/OpenRouter est dispo dans l'env, on les ajoute aussi comme gratuits
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    if (groqKey && !specs.some(s => s.name === 'groq-free')) {
      specs.push(specFromEnv('groq-free', 'openai', 'llama-3.1-8b-instant', 100, 'https://api.groq.com/openai/v1', groqKey, false));
    }
    const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (openRouterKey && !specs.some(s => s.name === 'openrouter-free')) {
      // Modèle :free par défaut = google/gemma-4-31b-it:free (function calling natif,
      // vivant en 2026). L'ancien défaut openai/gpt-oss-20b:free a été retiré du
      // catalogue OpenRouter (404) → échec systématique. Surcharge possible via
      // HERMES_OPENROUTER_FREE_MODEL (doit rester un modèle suffixé :free).
      const orModel = (process.env.HERMES_OPENROUTER_FREE_MODEL || '').trim() || 'google/gemma-4-31b-it:free';
      specs.push(specFromEnv('openrouter-free', 'openai', orModel, 120, 'https://openrouter.ai/api/v1', openRouterKey, false));
    }
    // Compat : ancien nom kilo-free (même endpoint)
    if (openRouterKey && !specs.some(s => s.name === 'kilo-free') && specs.some(s => s.name === 'openrouter-free')) {
      // ne duplique pas, openrouter-free suffit
    }
  }
  // Si le pool reste vide (aucun env, aucun KV), on garde quand même les anonymes gratuits en dernier recours
  if (specs.length === 0 && choice === 'auto' && process.env.HERMES_ANONYMOUS_FALLBACK !== '0') {
    for (const fp of FREE_ANONYMOUS_PROVIDERS.slice(0, 2)) {
      specs.push(specFromEnv(fp.name, fp.kind, fp.model!, fp.priority, fp.baseUrl, undefined, false));
    }
  }

  const entries: PoolEntry[] = specs.map(spec => {
    const isEnv = spec.name.endsWith('-env');
    const actualKey = spec.kind === 'gemini'
      ? (spec.apiKey || (isEnv ? process.env.GEMINI_API_KEY : ''))
      : spec.kind === 'openai'
        ? (spec.apiKey || (isEnv ? (process.env.HERMES_OPENAI_API_KEY || '') : ''))
        : undefined;
    return {
      name: spec.name,
      kind: spec.kind,
      model: spec.model || (spec.kind === 'gemini' ? DEFAULT_HERMES_CONFIG.geminiModel : '-'),
      baseUrl: spec.baseUrl,
      local: spec.local,
      priority: Number.isFinite(Number(spec.priority)) ? Number(spec.priority) : 500,
      source: isEnv ? 'env' : 'pool',
      provider: providerFromSpec(spec),
      hasKey: Boolean(actualKey),
      keyMasked: actualKey ? maskSecret(actualKey) : 'absente'
    };
  });
  entries.sort((a, b) => a.priority - b.priority);
  return entries;
}

/** Pool utilisable : les fournisseurs en cooldown sont décalés en fin de file (retentés si tous sont en échec). */
export async function getUsablePool(freeOnly = true): Promise<PoolEntry[]> {
  const all = (await buildPool()).filter(e => !freeOnly || providerCostPolicy(e).eligible);
  const now = Date.now();
  const cooling = all.filter(e => stat(e.name).cooldownUntil > now);
  const ready = all.filter(e => stat(e.name).cooldownUntil <= now);
  return ready.length > 0 ? [...ready, ...cooling] : all;
}

/** Déclaration de résultat d'un appel fournisseur (drive les cooldowns). */
export function reportOutcome(name: string, kind: 'ok' | 'rate_limited' | 'error', retryAfterSec?: number, message?: string): void {
  const st = stat(name);
  st.calls += 1;
  if (kind === 'ok') {
    st.ok += 1;
    st.cooldownUntil = 0;
  } else {
    st.errors += 1;
    const ms = kind === 'rate_limited'
      ? (Number.isFinite(retryAfterSec) && retryAfterSec! > 0 ? Math.min(retryAfterSec! * 1000, 10 * 60 * 1000) : HERMES_POOL.COOLDOWN_429_MS)
      : HERMES_POOL.COOLDOWN_ERROR_MS;
    st.cooldownUntil = Date.now() + ms;
    st.lastError = String(message || kind).slice(0, 300);
    st.lastErrorAt = Date.now();
  }
}

const RATE_LIMIT_RE = /429|rate.?limit|quota|too many requests|resource exhausted|overloaded/i;
const RETRY_AFTER_RE = /retry[- ]after[:\s=]*(\d+)/i;

/**
 * Appel LLM avec bascule automatique : tente les fournisseurs du pool dans
 * l'ordre de priorité ; sur 429/5xx/timeout, le fournisseur passe en cooldown
 * et le suivant est essayé. Échec final seulement si TOUS ont échoué.
 */
export async function chatWithFailover(opts: LLMChatOptions): Promise<{ result: LLMChatResult; entry: PoolEntry }> {
  const entries = (await getUsablePool(freeOnlyEnabled(opts.freeOnly))).slice(0, HERMES_POOL.MAX_FALLBACKS_PER_CALL);
  if (entries.length === 0) throw new Error(`Aucun fournisseur IA RÉEL disponible (pool vide — le mode mock de test a été supprimé). ${realProviderHelp()}`);
  const tried: string[] = [];
  for (const entry of entries) {
    opts.signal?.throwIfAborted();
    opts.onProviderEvent?.(`Connexion à ${entry.name} (${entry.model})…`);
    try {
      const result = await entry.provider.chat(opts);
      opts.signal?.throwIfAborted();
      if (!result.text?.trim() && !result.toolCalls?.length) {
        throw new Error('Réponse vide : aucun texte ni appel d’outil reçu.');
      }
      reportOutcome(entry.name, 'ok');
      return { result, entry };
    } catch (err: any) {
      opts.signal?.throwIfAborted();
      const msg = String(err?.message || err);
      opts.onProviderEvent?.(`${entry.name} indisponible : ${msg.slice(0, 160)}. Essai du prochain fournisseur autorisé.`);
      tried.push(`${entry.name} (${msg.slice(0, 100)})`);
      const rate = RATE_LIMIT_RE.test(msg);
      const m = RETRY_AFTER_RE.exec(msg);
      reportOutcome(entry.name, rate ? 'rate_limited' : 'error', m ? Number(m[1]) : undefined, msg.slice(0, 300));
    }
  }
  throw new Error(`Tous les fournisseurs IA réels sont indisponibles (en cooldown ou en erreur). Essayés : ${tried.join(' | ')}`);
}

/** État du pool, secrets masqués (jamais de clé en clair — UI, API, logs). */
export async function getPoolStatus(): Promise<Array<Record<string, any>>> {
  const entries = await buildPool();
  const now = Date.now();
  return entries.map(e => {
    const st = stat(e.name);
    // Modèle Gemini réellement utilisé après repli automatique (404 dépréciation).
    // NB : buildPool recrée les instances — la résolution vit dans la chaîne
    // (geminiModelChain place le modèle résolu en tête), pas sur l'instance.
    const chain = e.kind === 'gemini' ? geminiModelChain(e.model) : null;
    const effectiveModel = chain && chain[0] !== e.model ? chain[0] : undefined;
    return {
      name: e.name, kind: e.kind, model: e.model, baseUrl: e.baseUrl, local: e.local || undefined,
      priority: e.priority, source: e.source, label: e.provider.label,
      ...(effectiveModel && effectiveModel !== e.model ? { modelEffective: effectiveModel, modelNote: `modèle configuré « ${e.model} » indisponible — repli automatique sur « ${effectiveModel} »` } : {}),
      key: e.keyMasked,
      costPolicy: providerCostPolicy(e),
      inCooldown: st.cooldownUntil > now,
      cooldownRemainingSec: st.cooldownUntil > now ? Math.ceil((st.cooldownUntil - now) / 1000) : 0,
      calls: st.calls, ok: st.ok, errors: st.errors,
      lastError: st.lastError || undefined,
      lastErrorAt: st.lastErrorAt || undefined
    };
  });
}

const PROVIDER_NAME_RE = /^[a-z0-9-_]{2,40}$/;

/** Ajoute un fournisseur au pool (runtime — sans redéploiement). Retourne l'entrée masquée. */
export async function addProvider(spec: Partial<ProviderSpec>): Promise<{ ok: true; entry: Record<string, any> }> {
  const name = String(spec.name || '').trim().toLowerCase();
  if (!PROVIDER_NAME_RE.test(name)) throw new Error('Nom invalide : 2-40 caractères [a-z0-9-_].');
  const kind = spec.kind;
  if (!['gemini', 'openai'].includes(kind as string)) throw new Error("Kind invalide : 'gemini' ou 'openai' (fournisseurs IA réels uniquement — le mock de test n'existe plus).");

  const existing = await loadPoolSpecs();
  if (existing.some(s => s.name === name)) throw new Error(`Un fournisseur « ${name} » existe déjà.`);
  if (existing.length >= HERMES_POOL.MAX_PROVIDERS) throw new Error(`Limite du pool atteinte (${HERMES_POOL.MAX_PROVIDERS} fournisseurs).`);
  const reserved = new Set(['gemini-env', 'openai-env', 'mock-env']);
  if (reserved.has(name)) throw new Error('Nom réservé (fournisseur d\'environnement).');

  const next: ProviderSpec = { name, kind: kind as 'gemini' | 'openai', priority: Number.isFinite(Number(spec.priority)) ? Math.max(1, Math.min(998, Number(spec.priority))) : 500 };
  if (kind === 'gemini') {
    if (!spec.apiKey) throw new Error('Un fournisseur gemini du pool exige apiKey.');
    next.apiKey = String(spec.apiKey).slice(0, 500);
    next.model = String(spec.model || DEFAULT_HERMES_CONFIG.geminiModel).slice(0, 80);
  } else {
    const baseUrl = String(spec.baseUrl || '').trim();
    if (!baseUrl) throw new Error('Un fournisseur openai du pool exige baseUrl (endpoint compatible OpenAI).');
    await assertProviderBaseUrl(baseUrl, { allowLoopback: Boolean(spec.local) });
    next.baseUrl = baseUrl.slice(0, 300);
    next.model = String(spec.model || '').slice(0, 120);
    if (!next.model) throw new Error('Un fournisseur openai du pool exige model.');
    if (spec.apiKey) next.apiKey = String(spec.apiKey).slice(0, 500);
    if (spec.local) next.local = true;
  }

  existing.push(next);
  await savePoolSpecs(existing);
  stat(name).cooldownUntil = 0;
  const [entry] = await getPoolStatus().then(l => l.filter(x => x.name === name));
  return { ok: true, entry };
}

/** Retire un fournisseur du pool (le fournisseur d'environnement ne peut pas être retiré). */
export async function removeProvider(name: string): Promise<{ ok: true; removed: string }> {
  const n = String(name || '').trim().toLowerCase();
  if (!n) throw new Error('Nom manquant.');
  const existing = await loadPoolSpecs();
  const idx = existing.findIndex(s => s.name === n);
  if (idx === -1) throw new Error(`Fournisseur inconnu : ${n} (les fournisseurs d'environnement ne sont pas retirables — changez HERMES_PROVIDER).`);
  existing.splice(idx, 1);
  await savePoolSpecs(existing);
  poolStats.delete(n);
  return { ok: true, removed: n };
}

/** Test de connexion d'un fournisseur (1 micro-appel, ~1 token) sans impacter les cooldowns. */
export async function testProvider(name: string): Promise<{ ok: boolean; name: string; ms: number; sample?: string; error?: string }> {
  const n = String(name || '').trim().toLowerCase();
  const entries = await buildPool();
  const entry = entries.find(e => e.name === n);
  if (!entry) throw new Error(`Fournisseur inconnu : ${n}`);
  if (freeOnlyEnabled() && !providerCostPolicy(entry).eligible) throw new Error('Test bloqué par le mode sans API payante : facturation inconnue.');
  const t0 = Date.now();
  try {
    const res = await withTimeout(entry.provider.chat({
      system: 'Tu réponds exactement : OK',
      events: [{ type: 'text', role: 'user', text: 'Réponds uniquement : OK' }],
      tools: []
    }), 30 * 1000);
    if (!res.text?.trim()) throw new Error('Réponse vide du fournisseur.');
    return { ok: true, name: n, ms: Date.now() - t0, sample: String(res.text || '').slice(0, 120) };
  } catch (e: any) {
    return { ok: false, name: n, ms: Date.now() - t0, error: String(e?.message || e).slice(0, 300) };
  }
}

// ---------- Utilitaires ----------

export function truncateForLLM(value: any): any {
  let s: string;
  try { s = typeof value === 'string' ? value : JSON.stringify(value); } catch { s = String(value); }
  if (s.length > HERMES_LIMITS.TOOL_RESULT_CHARS) {
    return s.slice(0, HERMES_LIMITS.TOOL_RESULT_CHARS) + `… [tronqué à ${HERMES_LIMITS.TOOL_RESULT_CHARS} caractères]`;
  }
  return value;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Délai LLM dépassé (${ms / 1000} s).`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
