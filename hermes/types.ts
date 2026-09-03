/**
 * hermes/types.ts — Types du moteur agent Hermes (v4 réelle).
 *
 * Architecture inspirée des frameworks open-source (hermes-agent de
 * NousResearch, LoCoAgent/ReAct) : boucle plan → action → observation avec
 * function calling réel, registres de skills et d'agents spécialisés,
 * multi-fournisseurs LLM (Gemini, compatible OpenAI/Ollama, mock test).
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
  | { type: 'tool_call'; name: string; args: Record<string, any> }
  | { type: 'tool_result'; name: string; result: any };

export interface LLMChatOptions {
  system: string;
  events: AgentEvent[];
  tools: ToolDeclaration[];
}

export interface LLMChatResult {
  text?: string;
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface LLMProvider {
  id: 'gemini' | 'openai' | 'mock';
  label: string;
  model: string;
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
}

export interface HermesTool {
  name: string;
  description: string;
  access: SkillAccess;
  /** Les skills destructifs exigent args.confirm === true (flux de confirmation). */
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

export interface AgentStep {
  tool: string;
  args: Record<string, any>;
  status: 'ok' | 'denied' | 'error' | 'confirmation_required';
  summary: string;
}

export interface HermesChatResponse {
  response: string;
  provider: string;
  model: string;
  agent: string;
  steps: AgentStep[];
  pendingConfirmation?: {
    actionId: string;
    tool: string;
    summary: string;
  };
  usage?: { inputTokens?: number; outputTokens?: number };
}

// ---------- Config ----------

export interface HermesConfig {
  provider: 'auto' | 'gemini' | 'openai' | 'mock';
  geminiModel: string;
  openaiBaseUrl: string;
  openaiModel: string;
}

export const DEFAULT_HERMES_CONFIG: HermesConfig = {
  provider: 'auto',
  geminiModel: process.env.HERMES_GEMINI_MODEL || 'gemini-2.5-flash',
  openaiBaseUrl: process.env.HERMES_OPENAI_BASE_URL || '',
  openaiModel: process.env.HERMES_OPENAI_MODEL || 'llama3.1'
};

export const HERMES_LIMITS = {
  MAX_STEPS: 6,            // appels LLM max par requête
  MAX_TOOL_CALLS: 10,      // exécutions d'outils max par requête
  TOOL_RESULT_CHARS: 4000, // troncature des résultats d'outils
  SUB_AGENT_STEPS: 3,      // budget des sous-agents (dispatch_agent)
  CONFIRM_TTL_MS: 10 * 60 * 1000,
  LLM_TIMEOUT_MS: 90 * 1000
};
