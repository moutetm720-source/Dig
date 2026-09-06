/** Contrat partagé navigateur ↔ moteur. Aucun secret ni dépendance serveur. */
export type HermesOutcome = 'completed' | 'needs_input' | 'needs_confirmation' | 'partial' | 'blocked' | 'cancelled' | 'error';

export interface AgentStep {
  id?: string;
  agentId?: string;
  parentId?: string;
  tool: string;
  args?: Record<string, unknown>;
  status: 'running' | 'ok' | 'denied' | 'error' | 'confirmation_required' | 'cancelled';
  summary: string;
  startedAt?: string;
  durationMs?: number;
}

export interface HermesConfirmation {
  actionId: string;
  tool: string;
  summary: string;
  agentId?: string;
  expiresAt?: string;
  confirmed?: boolean;
  refused?: boolean;
  error?: string;
}

export interface HermesQuestion {
  id: string;
  question: string;
  options: string[];
  allowCustom: boolean;
  answer?: string;
}

export interface HermesChatResponse {
  response: string;
  provider: string;
  model: string;
  agent: string;
  steps: AgentStep[];
  outcome?: HermesOutcome;
  pendingConfirmation?: HermesConfirmation; // compatibilité API v5
  pendingConfirmations?: HermesConfirmation[];
  question?: HermesQuestion;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** Événements d'exécution observables, jamais de raisonnement interne du modèle. */
export type HermesProgressEvent =
  | { type: 'run_started'; runId: string; agent: string; freeOnly: boolean }
  | { type: 'status'; message: string; agentId?: string }
  | { type: 'step'; step: AgentStep }
  | { type: 'message'; text: string; agentId: string }
  | { type: 'confirmation'; confirmation: HermesConfirmation }
  | { type: 'question'; question: HermesQuestion }
  | { type: 'done'; result: HermesChatResponse }
  | { type: 'error'; message: string };
