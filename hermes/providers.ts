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
 *               CASCADE DE MODÈLES : un fournisseur openai peut porter plusieurs
 *               modèles (`fallbackModels`) essayés dans l'ordre au sein d'un
 *               même appel — ex. OpenRouter gratuit : gemma-4-31b → gpt-oss-120b
 *               → qwen3-next → openrouter/free (OPENROUTER_FREE_CASCADE).
 *
 * Deux niveaux de bascule, toujours dans le même appel chatWithFailover :
 *   1. intra-fournisseur : modèle suivant de la cascade (404 catalogue, 429, 5xx) ;
 *   2. inter-fournisseurs : fournisseur suivant du pool (cooldown sur le fautif).
 *
 * Sélecteurs (env ou KV df_hermes_config, modifiable par le modérateur) :
 *  - auto : gemini si GEMINI_API_KEY, sinon openai si HERMES_OPENAI_BASE_URL, sinon aucun
 */
import { GoogleGenAI } from '@google/genai';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { assertProviderBaseUrl } from '../ssrfGuard';
import { LLMChatOptions, LLMChatResult, LLMProvider, HermesConfig, DEFAULT_HERMES_CONFIG, HERMES_LIMITS, ProviderSpec, HERMES_POOL, OPENROUTER_FREE_CASCADE } from './types';
import { freeOnlyEnabled, isLoopbackUrl, isOpenRouterFreeModel, providerCostPolicy } from './providerPolicy';
import { FREE_CATALOG, catalogSpec } from './freeProviders';

// ---------- Config (env + KV) ----------

let configCache: { at: number; cfg: HermesConfig } | null = null;

/** Choix de fournisseur acceptés : RÉELS uniquement ('mock' définitivement retiré). */
const REAL_PROVIDER_CHOICES = ['auto', 'gemini', 'openai'] as const;

/** Message d'aide, réutilisé partout (status, erreurs de chat, autonomie). */
export function realProviderHelp(): string {
  return 'Configurez un modèle réellement local (HERMES_OPENAI_BASE_URL + HERMES_OPENAI_MODEL ; aide : node scripts/setup-local-llm.mjs) ou OpenRouter :free (OPENROUTER_API_KEY — cascade gemma-4-31b → gpt-oss-120b → qwen3-next → openrouter/free). Le mode sans API payante exclut les clés à facturation inconnue, dont GEMINI_API_KEY. Les endpoints anonymes ne sont essayés que si le repli est activé ; disponibilité et quotas non garantis. Voir GET /api/hermes/providers et /api/hermes/free-catalog.';
}

export async function getHermesConfig(): Promise<HermesConfig> {
  if (configCache && Date.now() - configCache.at < 15 * 1000) return configCache.cfg;
  const cfg: HermesConfig = { ...DEFAULT_HERMES_CONFIG };
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
  } catch { /* base indisponible : défauts env */ }
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

/** Erreurs déclenchant le repli sur le modèle suivant (404 modèle déprécié/absent du catalogue). */
const MODEL_GONE_RE = /no longer available|not found|NOT_FOUND|does not exist|isn't supported|unsupported model|unknown model|invalid model|not a valid model|no endpoints found|model_not_found|no allowed providers|\bHTTP 404\b/i;

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
  models: string[];
  label: string;
  /** Dernier modèle ayant réellement répondu (diagnostic statut/UI). */
  effectiveModel?: string;
  constructor(model: string) {
    this.model = model;
    this.models = geminiModelChain(model);
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
        return { ...result, model };
      } catch (e: any) {
        opts.signal?.throwIfAborted();
        const msg = String(e?.message || e);
        // 404 « modèle déprécié / inexistant » → essai du modèle suivant.
        if (MODEL_GONE_RE.test(msg)) {
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
        const sig = ev.thoughtSignature || ev.thought_signature;
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

    const res = await withTimeout(geminiClient!.models.generateContent({
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
        const sig = p.functionCall.thoughtSignature || p.functionCall.thought_signature || lastThoughtSignature || p.thoughtSignature || p.thought_signature;
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

const RATE_LIMIT_RE = /\b429\b|rate.?limit|quota|too many requests|resource exhausted|overloaded/i;
const RETRY_AFTER_RE = /retry[- ]after[:\s=]*(\d+)/i;
/**
 * Limite qui frappe la CLÉ entière (ex. OpenRouter « free-models-per-day »,
 * quota journalier) : changer de modèle ne sert à rien et gaspille des requêtes
 * → la cascade s'arrête, le fournisseur passe en cooldown, le suivant est essayé.
 */
const PROVIDER_WIDE_LIMIT_RE = /per[- ]day|daily|key limit|credits|billing|insufficient/i;
export function isProviderWideLimit(message: string): boolean {
  return RATE_LIMIT_RE.test(message) && PROVIDER_WIDE_LIMIT_RE.test(message);
}
/** 5xx / réseau / délai : le modèle ou l'endpoint est en panne — on tente le suivant. */
const TRANSIENT_RE = /HTTP 5\d\d|injoignable|Délai LLM dépassé|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i;

/** Classe d'échec d'un appel modèle → décide de la cascade et du cooldown. */
export type FailureKind = 'model_gone' | 'rate_limited' | 'transient' | 'fatal';
export function classifyFailure(message: string): FailureKind {
  if (MODEL_GONE_RE.test(message)) return 'model_gone';
  if (RATE_LIMIT_RE.test(message)) return 'rate_limited';
  if (TRANSIENT_RE.test(message)) return 'transient';
  return 'fatal';
}

/** Cooldown PAR MODÈLE (clé `baseUrl|model`) : un modèle retiré du catalogue ne coûte pas un 404 à chaque appel. */
const modelCooldowns = new Map<string, { until: number; reason: string }>();
const modelKey = (baseUrl: string, model: string) => `${baseUrl.replace(/\/+$/, '')}|${model}`;
export function modelCooldownRemainingMs(baseUrl: string, model: string): number {
  const c = modelCooldowns.get(modelKey(baseUrl, model));
  return c && c.until > Date.now() ? c.until - Date.now() : 0;
}
function setModelCooldown(baseUrl: string, model: string, kind: FailureKind, retryAfterSec?: number, reason = ''): void {
  const ms = kind === 'model_gone' ? HERMES_POOL.COOLDOWN_MODEL_GONE_MS
    : kind === 'rate_limited' ? (Number.isFinite(retryAfterSec) && retryAfterSec! > 0 ? Math.min(retryAfterSec! * 1000, 10 * 60 * 1000) : HERMES_POOL.COOLDOWN_429_MS)
    : HERMES_POOL.COOLDOWN_ERROR_MS;
  modelCooldowns.set(modelKey(baseUrl, model), { until: Date.now() + ms, reason: reason.slice(0, 200) });
}
/** Réinitialisation (tests / retrait d'un fournisseur). */
export function clearModelCooldowns(baseUrl?: string): void {
  if (!baseUrl) { modelCooldowns.clear(); return; }
  const prefix = `${baseUrl.replace(/\/+$/, '')}|`;
  for (const k of [...modelCooldowns.keys()]) if (k.startsWith(prefix)) modelCooldowns.delete(k);
}

export class OpenAICompatProvider implements LLMProvider {
  id = 'openai' as const;
  model: string;
  /** Cascade complète : modèle principal puis replis, dédupliquée, bornée. */
  models: string[];
  baseUrl: string;
  label: string;
  effectiveModel?: string;
  private key?: string;
  constructor(baseUrl: string, model: string, apiKey?: string, fallbackModels: string[] = []) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
    this.models = [...new Set([model, ...fallbackModels].map(m => String(m || '').trim()).filter(Boolean))].slice(0, HERMES_POOL.MAX_MODEL_CASCADE);
    this.key = apiKey; // chaîne vide explicite = ne JAMAIS hériter d’une clé d’un autre endpoint
    this.label = this.models.length > 1
      ? `OpenAI-compatible ${this.baseUrl} (cascade ${this.models.join(' → ')})`
      : `OpenAI-compatible ${this.baseUrl} (${model})`;
  }

  /**
   * Cascade intra-fournisseur : les modèles sont essayés dans l'ordre, au sein
   * du même appel. Les modèles en cooldown passent en fin de file (retentés
   * seulement si tous les autres échouent). Une erreur « fatale » (401, 400
   * requête invalide, JSON d'outil corrompu…) arrête la cascade : changer de
   * modèle n'y changerait rien et masquerait la vraie cause.
   */
  async chat(opts: LLMChatOptions): Promise<LLMChatResult> {
    const now = Date.now();
    const ready = this.models.filter(m => modelCooldownRemainingMs(this.baseUrl, m) === 0);
    const cooling = this.models.filter(m => modelCooldownRemainingMs(this.baseUrl, m) > 0);
    const order = ready.length ? [...ready, ...cooling] : this.models;
    const errors: string[] = [];
    for (let i = 0; i < order.length; i++) {
      const model = order[i];
      opts.signal?.throwIfAborted();
      if (i > 0) opts.onProviderEvent?.(`Modèle suivant de la cascade : ${model} (${i + 1}/${order.length}).`);
      try {
        const result = await this.chatOnce(model, opts);
        if (!result.text && !(result.toolCalls && result.toolCalls.length)) {
          // Réponse vide (fréquent sur les modèles gratuits face aux outils) :
          // pas un signal de panne → aucun cooldown, mais on tente le modèle suivant.
          if (order.length === 1) throw new Error(`Réponse vide de ${model} : aucun texte ni appel d’outil reçu.`);
          errors.push(`${model}: réponse vide`);
          continue;
        }
        this.effectiveModel = result.model || model;
        modelCooldowns.delete(modelKey(this.baseUrl, model));
        return { ...result, model: result.model || model };
      } catch (e: any) {
        opts.signal?.throwIfAborted();
        const msg = String(e?.message || e);
        const kind = classifyFailure(msg);
        if (kind === 'fatal' || order.length === 1 || isProviderWideLimit(msg)) throw e;
        const m = RETRY_AFTER_RE.exec(msg);
        setModelCooldown(this.baseUrl, model, kind, m ? Number(m[1]) : undefined, msg);
        errors.push(`${model}: ${msg.slice(0, 140)}`);
      }
    }
    throw new Error(`Cascade épuisée sur ${this.baseUrl} (${order.length} modèles, ${Math.round((Date.now() - now) / 1000)} s) : ${errors.join(' | ').slice(0, 600)}`);
  }

  private async chatOnce(model: string, opts: LLMChatOptions): Promise<LLMChatResult> {
    // Conversion du log plat en messages OpenAI. Les tool_call_id sont dérivés
    // de la position pour rester STABLES entre l'appel assistant et sa réponse tool.
    const messages: any[] = [{ role: 'system', content: opts.system }];
    let lastCallId = '';
    for (const ev of opts.events) {
      if (ev.type === 'text') {
        messages.push({ role: ev.role === 'model' ? 'assistant' : 'user', content: ev.text });
      } else if (ev.type === 'tool_call') {
        lastCallId = `call_${messages.length}`;
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{ id: lastCallId, type: 'function', function: { name: ev.name, arguments: JSON.stringify(ev.args || {}) } }]
        });
      } else if (ev.type === 'tool_result') {
        messages.push({ role: 'tool', tool_call_id: lastCallId || `call_${Math.max(0, messages.length - 1)}`, content: JSON.stringify(truncateForLLM(ev.result)) });
      }
    }

    const body: any = { model, messages, temperature: 0.3 };
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
          ? `Vérifiez que le serveur local tourne — ex. Ollama : \`ollama serve\` puis \`ollama pull ${model}\`, ou lancez \`node scripts/setup-local-llm.mjs\`.`
          : 'Vérifiez l\'URL (HERMES_OPENAI_BASE_URL), le port et votre réseau.'));
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const retryAfter = res.headers.get('retry-after');
      throw new Error(`Fournisseur OpenAI-compatible (${model}) : HTTP ${res.status}${retryAfter ? ` (retry-after ${retryAfter}s)` : ''} ${errText.slice(0, 200)}`);
    }
    const data: any = await res.json();
    // OpenRouter (et d'autres passerelles) renvoient HTTP 200 avec un objet
    // { error: { code, message } } quand l'upstream a refusé — on le traite comme un échec.
    if (data?.error && !data?.choices?.length) {
      const code = data.error.code || data.error.status || '';
      throw new Error(`Fournisseur OpenAI-compatible (${model}) : erreur ${code} ${String(data.error.message || data.error).slice(0, 200)}`);
    }
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
      usage: data?.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
      // Le routeur openrouter/free renvoie le modèle réellement servi : on l'affiche tel quel.
      model: typeof data?.model === 'string' && data.model ? data.model : model
    };
  }
}

// ---------- POOL MULTI-FOURNISSEURS (gestionnaire d'API & tokens + bascule automatique) ----------
//
// Objectif : ne JAMAIS être bloqué, et toujours avec une IA RÉELLE. Le pool mélange :
//   1. les fournisseurs déclarés dans l'environnement (GEMINI_API_KEY, HERMES_OPENAI_BASE_URL,
//      GROQ_API_KEY, OPENROUTER_API_KEY) ;
//   2. les fournisseurs gérés au RUNTIME (KV df_hermes_provider_pool — protégée,
//      modifiable par Hermes via les skills providers_* ou l'API REST) ;
//   3. les endpoints anonymes connus (repli optionnel, priorité 800+).
// À chaque appel LLM, si un fournisseur renvoie 429/5xx/timeout, il passe en
// cooldown (30 s sur rate-limit — ou Retry-After — ; 15 s sur erreur) et le
// suivant est essayé automatiquement.

export interface PoolEntry {
  name: string;
  kind: 'gemini' | 'openai';
  model: string;
  /** Cascade complète (≥ 1) : modèle principal + replis. */
  models: string[];
  baseUrl?: string;
  local?: boolean;
  priority: number;
  source: 'env' | 'pool' | 'anonymous';
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

/**
 * Cascade OpenRouter gratuite effective : HERMES_OPENROUTER_FREE_MODELS (liste
 * CSV) si définie, sinon OPENROUTER_FREE_CASCADE. Toute entrée non gratuite est
 * écartée avec un avertissement (jamais de repli payant silencieux).
 * Compatibilité : HERMES_OPENROUTER_FREE_MODEL (singulier) place ce modèle en tête.
 */
export function openRouterFreeCascade(env: NodeJS.ProcessEnv = process.env): string[] {
  const csv = String(env.HERMES_OPENROUTER_FREE_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  const head = String(env.HERMES_OPENROUTER_FREE_MODEL || '').trim();
  const wanted = [...(head ? [head] : []), ...(csv.length ? csv : OPENROUTER_FREE_CASCADE)];
  const kept: string[] = [];
  for (const m of wanted) {
    if (!isOpenRouterFreeModel(m)) { console.warn(`[hermes] Modèle OpenRouter « ${m.slice(0, 80)} » ignoré : non gratuit (suffixe :free ou openrouter/free requis).`); continue; }
    if (!kept.includes(m)) kept.push(m);
  }
  return (kept.length ? kept : [...OPENROUTER_FREE_CASCADE]).slice(0, HERMES_POOL.MAX_MODEL_CASCADE);
}

function normalizeFallbacks(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(m => String(m || '').trim()).filter(Boolean))].slice(0, HERMES_POOL.MAX_MODEL_CASCADE);
}

async function loadPoolSpecs(): Promise<ProviderSpec[]> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, HERMES_POOL.KV_KEY));
    if (r.length > 0 && r[0].value) {
      const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (Array.isArray(v)) {
        const real = v
          .filter((x: any) => x && typeof x === 'object' && typeof x.name === 'string' && ['gemini', 'openai'].includes(x.kind))
          .slice(0, HERMES_POOL.MAX_PROVIDERS)
          .map((x: any) => ({ ...x, ...(x.fallbackModels ? { fallbackModels: normalizeFallbacks(x.fallbackModels) } : {}) }));
        // Nettoyage : un ancien fournisseur « mock » persisté est retiré du pool.
        if (real.length !== v.length) {
          console.warn(`[hermes] ${v.length - real.length} fournisseur(s) non réel(s) (mock) purgé(s) du pool.`);
          void savePoolSpecs(real).catch(() => {});
        }
        return real;
      }
    }
  } catch { /* base indisponible : pool env uniquement */ }
  return [];
}

async function savePoolSpecs(specs: ProviderSpec[]): Promise<void> {
  await db.insert(keyValueStore).values({ key: HERMES_POOL.KV_KEY, value: specs })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: specs } });
}

function providerFromSpec(spec: ProviderSpec): LLMProvider {
  if (spec.kind === 'gemini') return new GeminiProvider(spec.model || DEFAULT_HERMES_CONFIG.geminiModel);
  return new OpenAICompatProvider(spec.baseUrl || '', spec.model || '', spec.apiKey ?? '', spec.fallbackModels || []);
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
  const dropByName = (name: string) => {
    for (let i = specs.length - 1; i >= 0; i--) if (specs[i].name === name) specs.splice(i, 1);
  };
  const envSourced = new Set<string>(); // entrées dérivées de l'environnement (affichage « source » exact)

  if ((choice === 'gemini' || choice === 'auto') && process.env.GEMINI_API_KEY) {
    specs.push({ name: 'gemini-env', kind: 'gemini', model: cfg.geminiModel, priority: 10 });
  }
  if ((choice === 'openai' || choice === 'auto') && cfg.openaiBaseUrl) {
    specs.push({
      name: 'openai-env', kind: 'openai', model: cfg.openaiModel, priority: 20, baseUrl: cfg.openaiBaseUrl,
      ...(process.env.HERMES_OPENAI_API_KEY ? { apiKey: process.env.HERMES_OPENAI_API_KEY } : {}),
      ...(isLoopbackUrl(cfg.openaiBaseUrl) ? { local: true } : {})
    });
  }
  // Fournisseurs gérés au runtime (KV) + free tiers d'env — hors verrou exclusif gemini/openai
  if (choice === 'auto') {
    for (const s of await loadPoolSpecs()) specs.push(s);

    // Si une clé Groq/OpenRouter est dans l'env, la version ENV fait foi : elle
    // remplace une éventuelle entrée KV périmée (ex. ancien modèle :free retiré
    // du catalogue → 404 en boucle).
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    if (groqKey) {
      dropByName('groq-free');
      const groq = FREE_CATALOG.find(f => f.id === 'groq-free');
      specs.push(groq
        ? catalogSpec(groq, { apiKey: groqKey })
        : { name: 'groq-free', kind: 'openai', model: 'llama-3.1-8b-instant', priority: 100, baseUrl: 'https://api.groq.com/openai/v1', apiKey: groqKey });
      envSourced.add('groq-free');
    }
    const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (openRouterKey) {
      const [head, ...rest] = openRouterFreeCascade();
      dropByName('openrouter-free');
      specs.push({ name: 'openrouter-free', kind: 'openai', model: head, fallbackModels: rest, priority: 120, baseUrl: 'https://openrouter.ai/api/v1', apiKey: openRouterKey });
      envSourced.add('openrouter-free');
    }

    // Endpoints anonymes (sans clé) : repli de basse priorité, sauf HERMES_ANONYMOUS_FALLBACK=0.
    // Source unique : FREE_CATALOG (needsKey:false). Jamais de clé transmise.
    if (process.env.HERMES_ANONYMOUS_FALLBACK !== '0') {
      for (const fp of FREE_CATALOG.filter(f => !f.needsKey)) {
        if (!specs.some(s => s.baseUrl === fp.baseUrl)) specs.push(catalogSpec(fp));
      }
    }
  }

  const anonymousNames = new Set(FREE_CATALOG.filter(f => !f.needsKey).map(f => f.id));
  const entries: PoolEntry[] = specs.map(spec => {
    const isEnv = spec.name.endsWith('-env') || envSourced.has(spec.name);
    const actualKey = spec.kind === 'gemini'
      ? (spec.apiKey || (isEnv ? process.env.GEMINI_API_KEY : ''))
      : (spec.apiKey || (isEnv ? (process.env.HERMES_OPENAI_API_KEY || '') : ''));
    const provider = providerFromSpec(spec);
    return {
      name: spec.name,
      kind: spec.kind,
      model: provider.model || '-',
      models: provider.models,
      baseUrl: spec.baseUrl,
      local: spec.local,
      priority: Number.isFinite(Number(spec.priority)) ? Number(spec.priority) : 500,
      source: isEnv ? 'env' : anonymousNames.has(spec.name) && !spec.apiKey ? 'anonymous' : 'pool',
      provider,
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

/**
 * Appel LLM avec bascule automatique à deux niveaux, dans un MÊME appel :
 *   1. chaque fournisseur essaie sa cascade de modèles (OpenAICompatProvider.chat) ;
 *   2. sur échec complet du fournisseur (429/5xx/timeout/cascade épuisée), il
 *      passe en cooldown et le fournisseur suivant du pool est essayé.
 * Échec final seulement si TOUS ont échoué.
 */
export async function chatWithFailover(opts: LLMChatOptions): Promise<{ result: LLMChatResult; entry: PoolEntry }> {
  const entries = (await getUsablePool(freeOnlyEnabled(opts.freeOnly))).slice(0, HERMES_POOL.MAX_FALLBACKS_PER_CALL);
  if (entries.length === 0) throw new Error(`Aucun fournisseur IA RÉEL disponible (pool vide — le mode mock de test a été supprimé). ${realProviderHelp()}`);
  const tried: string[] = [];
  for (const entry of entries) {
    opts.signal?.throwIfAborted();
    opts.onProviderEvent?.(`Connexion à ${entry.name} (${entry.models.length > 1 ? `cascade ${entry.models.join(' → ')}` : entry.model})…`);
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
      const m = RETRY_AFTER_RE.exec(msg);
      reportOutcome(entry.name, RATE_LIMIT_RE.test(msg) ? 'rate_limited' : 'error', m ? Number(m[1]) : undefined, msg.slice(0, 300));
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
    const cascade = e.kind === 'openai' && e.baseUrl
      ? e.models.map(m => {
        const remaining = modelCooldownRemainingMs(e.baseUrl!, m);
        const c = modelCooldowns.get(modelKey(e.baseUrl!, m));
        return { model: m, inCooldown: remaining > 0, cooldownRemainingSec: Math.ceil(remaining / 1000), ...(remaining > 0 && c?.reason ? { reason: c.reason } : {}) };
      })
      : undefined;
    return {
      name: e.name, kind: e.kind, model: e.model, baseUrl: e.baseUrl, local: e.local || undefined,
      priority: e.priority, source: e.source, label: e.provider.label,
      ...(e.models.length > 1 ? { models: e.models, cascade } : {}),
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
  if (name.endsWith('-env')) throw new Error('Nom réservé (fournisseur d\'environnement).');

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
    const fallbacks = normalizeFallbacks(spec.fallbackModels).filter(m => m !== next.model).map(m => m.slice(0, 120));
    if (fallbacks.length) next.fallbackModels = fallbacks;
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
  const [removed] = existing.splice(idx, 1);
  await savePoolSpecs(existing);
  poolStats.delete(n);
  if (removed?.baseUrl) clearModelCooldowns(removed.baseUrl);
  return { ok: true, removed: n };
}

/** Test de connexion d'un fournisseur (1 micro-appel, ~1 token) sans impacter les cooldowns du pool. */
export async function testProvider(name: string): Promise<{ ok: boolean; name: string; ms: number; sample?: string; model?: string; error?: string }> {
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
    return { ok: true, name: n, ms: Date.now() - t0, sample: String(res.text || '').slice(0, 120), model: res.model || entry.model };
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
