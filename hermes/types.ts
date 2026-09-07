import type { AgentStep, HermesConfirmation, HermesProgressEvent, HermesQuestion } from '../src/types/hermes';
export type { AgentStep, HermesChatResponse, HermesProgressEvent } from '../src/types/hermes';

/**
 * hermes/types.ts — Types du moteur agent Hermes (v4 réelle).
 *
 * Architecture inspirée des frameworks open-source (hermes-agent de
 * NousResearch, LoCoAgent/ReAct) : boucle plan → action → observation avec
 * function calling réel, registres de skills et d'agents spécialisés,
 * multi-fournisseurs LLM RÉELS (Gemini, compatible OpenAI/Ollama/Groq…).
 * Aucun fournisseur mock : le moteur ne simule jamais d'IA.
 */

// ---------- LLM ----------

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
    description?: string;
    items?: { type: string };
    enum?: string[];
    minimum?: number;
    maximum?: number;
  }>;
  required?: string[];
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/** Événement d'une conversation (log plat converti par chaque fournisseur). */
export type AgentEvent =
  | { type: 'text'; role: 'user' | 'model'; text: string }
  | { type: 'tool_call'; name: string; args: Record<string, any>; thoughtSignature?: string; thought_signature?: string }
  | { type: 'tool_result'; name: string; result: any };

export interface LLMChatOptions {
  system: string;
  events: AgentEvent[];
  tools: ToolDeclaration[];
  signal?: AbortSignal;
  /** Filtrage côté serveur : aucun repli vers un endpoint payant/inconnu. */
  freeOnly?: boolean;
  onProviderEvent?: (message: string) => void;
}

export interface LLMChatResult {
  text?: string;
  toolCalls?: Array<{ name: string; args: Record<string, any>; thoughtSignature?: string; thought_signature?: string }>;
  usage?: { inputTokens?: number; outputTokens?: number };
  /** Modèle qui a RÉELLEMENT répondu (après cascade de modèles / routeur) — pour l'affichage honnête. */
  model?: string;
}

export interface LLMProvider {
  /** RÉEL UNIQUEMENT : le fournisseur mock de test a été supprimé du moteur. */
  id: 'gemini' | 'openai';
  label: string;
  /** Modèle principal (tête de la cascade). */
  model: string;
  /** Cascade complète de modèles essayés dans l'ordre au sein d'un même appel (≥ 1). */
  models: string[];
  /** Dernier modèle ayant réellement répondu (diagnostic). */
  effectiveModel?: string;
  chat(opts: LLMChatOptions): Promise<LLMChatResult>;
}

// ---------- Skills (outils) ----------

export type SkillAccess = 'read' | 'write' | 'destructive' | 'outbound';

export interface HermesContext {
  // Identifiant du modérateur connecté (pour l'audit)
  actor: string;
  agentId: string;
  // Session en cours (messages récents, pour le contexte)
  conversation: string;
  ownerId?: string;
  signal?: AbortSignal;
  freeOnly?: boolean;
  allowedTools?: string[];
  parentId?: string;
  depth?: number;
  runtime?: HermesRuntime;
}

export interface HermesRuntime {
  toolCalls: number;
  llmCalls: number;
  steps: AgentStep[];
  confirmations: HermesConfirmation[];
  question?: HermesQuestion;
  haltReason?: string;
  onEvent?: (event: HermesProgressEvent) => void;
}

export interface HermesTool {
  name: string;
  description: string;
  access: SkillAccess;
  /** Le moteur exige une décision HTTP authentifiée ; un confirm:true du LLM ne vaut pas accord. */
  requiresConfirmation?: boolean;
  parameters: ToolParameterSchema;
  run(args: Record<string, any>, ctx: HermesContext): Promise<any>;
}

// ---------- Agents spécialisés ----------

export interface HermesAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  systemPrompt: string;
  /** Subset de skills (défaut : tous). */
  skills?: string[];
  /** Budget de pas de moins pour les sous-agents. */
  maxSteps?: number;
}

// ---------- Moteur ----------

// ---------- Config ----------

export interface HermesConfig {
  /** 'mock' a été retiré : Hermes n'accepte plus qu'un fournisseur IA RÉEL. */
  provider: 'auto' | 'gemini' | 'openai';
  geminiModel: string;
  openaiBaseUrl: string;
  openaiModel: string;
}

export const DEFAULT_HERMES_CONFIG: HermesConfig = {
  provider: 'auto',
  // ⚠️ gemini-2.5-flash est déprécié pour les NOUVELLES clés API (404 « no longer
  // available to new users » — arrêt officiel 20/10/2026). Défaut actuel :
  // gemini-3.5-flash-lite (remplaçant recommandé par Google). Une chaîne de
  // repli automatique existe dans hermes/providers.ts (GEMINI_MODEL_FALLBACKS).
  geminiModel: process.env.HERMES_GEMINI_MODEL || 'gemini-3.5-flash-lite',
  openaiBaseUrl: process.env.HERMES_OPENAI_BASE_URL || '',
  openaiModel: process.env.HERMES_OPENAI_MODEL || 'llama3.1'
};

export const HERMES_LIMITS = {
  MAX_STEPS: 6,            // tours LLM de l’agent principal
  MAX_LLM_CALLS: 12,       // tours partagés avec les sous-agents (hors tentatives de repli)
  RUN_TIMEOUT_MS: 4 * 60 * 1000,
  MAX_TOOL_CALLS: 10,      // exécutions d'outils max par requête
  TOOL_RESULT_CHARS: 4000, // troncature des résultats d'outils
  SUB_AGENT_STEPS: 3,      // budget des sous-agents (dispatch_agent)
  CONFIRM_TTL_MS: 10 * 60 * 1000,
  LLM_TIMEOUT_MS: 90 * 1000
};

// ---------- Pool multi-fournisseurs (gestionnaire d'API & tokens, bascule automatique) ----------

export interface ProviderSpec {
  name: string;                    // identifiant ^[a-z0-9-_]{2,40}$
  kind: 'gemini' | 'openai';       // fournisseurs RÉELS uniquement (plus de mock)
  model?: string;                  // openai : requis ; gemini : défaut DEFAULT_HERMES_CONFIG.geminiModel
  /**
   * Cascade de modèles de secours (openai) essayés APRÈS `model`, dans l'ordre,
   * au sein d'un même appel : si un modèle est absent du catalogue (404),
   * rate-limité (429) ou en panne (5xx), le suivant est tenté immédiatement.
   * Chaque modèle garde son propre cooldown. Max HERMES_POOL.MAX_MODEL_CASCADE.
   */
  fallbackModels?: string[];
  baseUrl?: string;                // openai : requis (Ollama local autorisé via local:true)
  apiKey?: string;                 // stockée KV protégée, JAMAIS exposée (UI, audit, logs, /api/store)
  local?: boolean;                 // true = endpoint local (Ollama http loopback) — exception SSRF documentée
  priority: number;                // 1 = le plus prioritaire
}

export const HERMES_POOL = {
  KV_KEY: 'df_hermes_provider_pool',
  MAX_PROVIDERS: 20,
  MAX_FALLBACKS_PER_CALL: 8,      // max de fournisseurs essayés par appel chat (anti-blocage sans spam) — augmenté pour les free tiers
  MAX_MODEL_CASCADE: 6,           // max de modèles essayés par fournisseur et par appel (cascade intra-fournisseur)
  COOLDOWN_429_MS: 30 * 1000,     // rate-limit → 30 s (ou Retry-After si fourni)
  COOLDOWN_ERROR_MS: 15 * 1000,   // erreur réseau/5xx → 15 s
  COOLDOWN_MODEL_GONE_MS: 10 * 60 * 1000 // modèle absent du catalogue (404) → 10 min avant nouvel essai
};

/**
 * Cascade OpenRouter gratuite par défaut — 4 modèles `:free` supportant le
 * function calling (paramètre `tools`), essayés automatiquement les uns après
 * les autres AU SEIN D'UN MÊME APPEL :
 *   1. google/gemma-4-31b-it:free               — dense 31B, function calling natif
 *   2. openai/gpt-oss-120b:free                 — MoE 117B, raisonnement + tool use
 *   3. qwen/qwen3-next-80b-a3b-instruct:free    — MoE 80B, sorties stables (sans « thinking »)
 *   4. openrouter/free                          — routeur OpenRouter : choisit un modèle gratuit
 *                                                 disponible (dernier recours, modèle non fixé)
 * Le catalogue :free tourne : un modèle retiré (404) est mis en cooldown 10 min
 * et la cascade continue. Surcharge : HERMES_OPENROUTER_FREE_MODELS (liste
 * séparée par des virgules ; chaque entrée doit rester :free ou openrouter/free).
 */
export const OPENROUTER_FREE_CASCADE: readonly string[] = [
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openrouter/free'
];
