/** Transport du moteur Hermes. Jamais de réponse IA inventée côté navigateur. */
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { fetchInitialState } from './syncState';
import { store } from './store';
import { getAuthBearer } from './authToken';
import { readHermesStream } from './hermesStream';
import type { AgentStep, HermesChatResponse, HermesConfirmation, HermesOutcome, HermesProgressEvent, HermesQuestion } from '../types/hermes';
export type { AgentStep } from '../types/hermes';

export interface HermesSkillInfo {
  name: string;
  description: string;
  dangerous: boolean;
  confirmation: boolean;
  access: string;
}
export interface HermesAgent {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  skills: string[] | 'tous';
  maxSteps: number;
}
export interface HermesServerStatus {
  status: 'active' | 'offline' | 'error';
  engine: string;
  provider: string;
  model: string;
  providerReason?: string;
  hasGeminiKey: boolean;
  skillsCount: number;
  agentsCount: number;
  memoriesCount: number;
  skills: HermesSkillInfo[];
  agents: HermesAgent[];
  budgetPolicy?: { freeOnly: boolean; eligibleProviders: number; blockedProviders: number; notice: string };
  providerPool?: Array<{ name: string; model: string; costPolicy: { eligible: boolean; label: string } }>;
}
export interface HermesMessage {
  id: string;
  sender: 'user' | 'hermes' | 'system';
  content: string;
  timestamp: string;
  agent?: string;
  provider?: string;
  model?: string;
  steps?: AgentStep[];
  pendingConfirmation?: HermesConfirmation;
  pendingConfirmations?: HermesConfirmation[];
  question?: HermesQuestion;
  outcome?: HermesOutcome;
  streaming?: boolean;
  updates?: Array<{ text: string; agentId: string }>;
  isAutonomous?: boolean;
}
export interface HermesAutonomyReport {
  at: string; trigger: string; provider: string; ms: number; report: string;
  actions: Array<{ tool: string; status: string; summary: string }>;
  recommendations: string[]; anomalies: string[];
}
export interface HermesAutonomyState {
  enabled: boolean; intervalMinutes: number; lastRunAt: string | null; lastReportAt: string | null;
  runs: number; running: boolean; recent: HermesAutonomyReport[];
}
export interface HermesAgentState {
  agentId: string;
  isAutonomousEnabled: boolean;
  autonomousIntervalMinutes: number;
  lastAutonomousRun: string | null;
  status: 'idle' | 'thinking' | 'executing' | 'error';
  serverStatus: HermesServerStatus | null;
  statusError?: string;
  autonomy: HermesAutonomyState | null;
  messages: HermesMessage[];
  activeRun?: { runId?: string; messageId: string; startedAt: number; label: string; stopping?: boolean };
  decidingAction?: string;
}

// Hors préfixes df_/dpf_ : syncState ne doit JAMAIS publier une conversation via /api/store.
const STORAGE_KEY = 'hermes:conversation:v1';
const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const id = () => crypto.randomUUID();
const welcome = (): HermesMessage => ({
  id: 'welcome', sender: 'hermes', timestamp: timestamp(),
  content: '**Travaillons sur du concret.**\n\nDécrivez votre objectif : je peux examiner la boutique, coordonner les spécialistes et préparer vos contenus. Vous verrez les outils réellement exécutés ici, et je vous poserai une question si une précision manque.\n\n**Vous gardez la main.** Les actions sensibles attendent votre accord. L’IA utilise uniquement les fournisseurs autorisés sans API payante ; les quotas restent limités. Aucun chiffre d’affaires n’est garanti.\n\nPar quoi voulez-vous commencer ?'
});

async function api(path: string, init: RequestInit = {}) {
  const bearer = getAuthBearer();
  return fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: bearer } : {}), ...init.headers } });
}
async function checkResponse(res: Response) {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Session expirée ou absente — reconnectez-vous en tant que modérateur.');
  if (res.status === 429) throw new Error('Quota de requêtes atteint. Patientez avant de réessayer.');
  throw new Error(body.error || `Erreur serveur (HTTP ${res.status}).`);
}

class HermesAgentService {
  private state: HermesAgentState;
  private listeners = new Set<() => void>();
  private controller?: AbortController;

  constructor() {
    let saved: any = null;
    try {
      const raw = safeGetItem<any>(STORAGE_KEY, null);
      saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch { /* stockage corrompu */ }
    const messages: HermesMessage[] = Array.isArray(saved?.messages) ? saved.messages.slice(-60).filter((m: any) => m && typeof m.id === 'string' && typeof m.content === 'string' && ['user', 'hermes', 'system'].includes(m.sender)).map((m: HermesMessage) => m.streaming ? {
      ...m, streaming: false, outcome: 'cancelled', content: `${m.content}\n\n**Discussion interrompue par le rechargement.** Aucun rejeu automatique ; consultez les étapes avant de continuer.`
    } : m) : [];
    this.state = {
      agentId: typeof saved?.agentId === 'string' ? saved.agentId : 'orchestrator',
      isAutonomousEnabled: false, autonomousIntervalMinutes: 30, lastAutonomousRun: null,
      status: 'idle', serverStatus: null, autonomy: null, messages: messages.length ? messages : [welcome()]
    };
    void this.loadServerStatus();
    if (getAuthBearer()) void this.loadAutonomy();
    setInterval(() => { if (getAuthBearer()) void this.loadAutonomy(); }, 60_000);
  }
  public getState = (): HermesAgentState => this.state;
  public subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(patch: Partial<HermesAgentState>) {
    this.state = { ...this.state, ...patch };
    // Conversations locales bornées ; pas de copie de l'état du serveur / tokens.
    safeSetItem(STORAGE_KEY, JSON.stringify({ agentId: this.state.agentId, messages: this.state.messages.slice(-60) }));
    this.listeners.forEach(listener => listener());
  }
  private changeMessage(messageId: string, update: (message: HermesMessage) => HermesMessage) {
    this.patch({ messages: this.state.messages.map(m => m.id === messageId ? update(m) : m) });
  }
  private append(message: HermesMessage) { this.patch({ messages: [...this.state.messages, message].slice(-80) }); }
  private system(content: string) { this.append({ id: id(), sender: 'system', content, timestamp: timestamp() }); }
  private busy() { return this.state.status === 'thinking' || this.state.status === 'executing'; }
  public setAgent(agentId: string) { if (!this.busy()) this.patch({ agentId }); }

  public async loadServerStatus(): Promise<HermesServerStatus | null> {
    try {
      const res = await api('/api/hermes/status');
      await checkResponse(res);
      const data = await res.json();
      if (data.status === 'error') throw new Error(data.error || 'État serveur indisponible.');
      const status: HermesServerStatus = {
        ...data,
        skills: (data.skills || []).map((s: any) => ({ ...s, dangerous: ['destructive', 'outbound'].includes(s.access), confirmation: !!s.requiresConfirmation })),
        agents: (data.agents || []).map((a: any) => ({ ...a, description: a.role || a.description }))
      };
      this.patch({ serverStatus: status, statusError: undefined, agentId: status.agents.some(a => a.id === this.state.agentId) ? this.state.agentId : 'orchestrator' });
      return status;
    } catch (e: any) { this.patch({ statusError: e.message }); return null; }
  }

  public async loadAutonomy(): Promise<void> {
    try {
      const res = await api('/api/hermes/autonomy');
      if (!res.ok) return;
      const data = await res.json();
      const c = data.config || {};
      this.patch({
        autonomy: { enabled: !!c.enabled, intervalMinutes: c.intervalMinutes || 30, lastRunAt: c.lastRunAt || null, lastReportAt: c.lastReportAt || null, runs: c.runs || 0, running: !!data.running, recent: data.recent || [] },
        isAutonomousEnabled: !!c.enabled, autonomousIntervalMinutes: c.intervalMinutes || 30, lastAutonomousRun: c.lastRunAt || null
      });
    } catch { /* le chat reste utilisable si le journal est momentanément indisponible */ }
  }
  private async saveAutonomy(patch: { enabled?: boolean; intervalMinutes?: number }) {
    try {
      const res = await api('/api/hermes/autonomy', { method: 'POST', body: JSON.stringify(patch) });
      await checkResponse(res);
      await this.loadAutonomy();
    } catch (e: any) { this.system(`**Configuration non enregistrée** : ${e.message}`); }
  }
  public toggleAutonomy(enabled?: boolean) { void this.saveAutonomy({ enabled: enabled ?? !this.state.isAutonomousEnabled }); }
  public setAutoInterval(intervalMinutes: number) { void this.saveAutonomy({ intervalMinutes }); }
  public async runAutonomousNow(silentIfEmpty = false): Promise<string | null> {
    if (this.busy()) return null;
    this.patch({ status: 'executing' });
    try {
      const res = await api('/api/hermes/autonomy/run', { method: 'POST' });
      await checkResponse(res);
      const { report: r } = await res.json();
      if (r?.report) this.append({
        id: id(), sender: 'hermes', content: `### Cycle autonome serveur\n${r.report}`, timestamp: timestamp(), agent: 'autonomy', provider: r.provider,
        steps: (r.actions || []).map((s: any) => ({ ...s, status: s.status === 'ok' ? 'ok' : 'error' })), isAutonomous: true
      });
      await this.loadAutonomy();
      return r?.report || null;
    } catch (e: any) { if (!silentIfEmpty) this.system(`**Cycle non abouti** : ${e.message}`); return null; }
    finally { this.patch({ status: 'idle' }); }
  }

  private applyResult(messageId: string, result: HermesChatResponse) {
    this.changeMessage(messageId, m => ({
      ...m, content: result.response, provider: result.provider, model: result.model, agent: result.agent,
      steps: result.steps || m.steps, streaming: false, outcome: result.outcome,
      pendingConfirmations: result.pendingConfirmations || (result.pendingConfirmation ? [result.pendingConfirmation] : []), question: result.question
    }));
  }
  private onProgress = (messageId: string, event: HermesProgressEvent) => {
    if (event.type === 'run_started') {
      this.patch({ activeRun: { ...this.state.activeRun!, runId: event.runId } });
    } else if (event.type === 'status') {
      if (this.state.activeRun && !this.state.activeRun.stopping) this.patch({ activeRun: { ...this.state.activeRun, label: event.message } });
    } else if (event.type === 'step') {
      this.changeMessage(messageId, m => {
        const steps = [...(m.steps || [])];
        const index = steps.findIndex(s => s.id === event.step.id);
        if (index >= 0) steps[index] = event.step; else steps.push(event.step);
        return { ...m, steps };
      });
    } else if (event.type === 'message') {
      this.changeMessage(messageId, m => ({ ...m, updates: [...(m.updates || []), { text: event.text, agentId: event.agentId }].slice(-12) }));
    } else if (event.type === 'confirmation') {
      this.changeMessage(messageId, m => ({ ...m, pendingConfirmations: [...(m.pendingConfirmations || []), event.confirmation] }));
    } else if (event.type === 'question') {
      this.changeMessage(messageId, m => ({ ...m, question: event.question }));
    } else if (event.type === 'done') this.applyResult(messageId, event.result);
  };

  public async sendMessage(text: string): Promise<void> {
    const prompt = text.trim();
    if (!prompt || this.busy()) return;
    if (prompt.length > 4000) { this.system('Message trop long : limitez votre demande à 4 000 caractères.'); return; }
    // Historique AVANT d'insérer le prompt courant : il n'est plus envoyé deux fois.
    const history = this.state.messages.filter(m => m.id !== 'welcome' && m.content.trim())
      .slice(-10).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.content.slice(0, 4000) }));
    const messageId = id();
    this.controller = new AbortController();
    this.patch({
      status: 'thinking', activeRun: { messageId, startedAt: Date.now(), label: 'Connexion au moteur…' },
      messages: [...this.state.messages,
        { id: id(), sender: 'user', content: prompt, timestamp: timestamp() },
        { id: messageId, sender: 'hermes', content: '', timestamp: timestamp(), agent: this.state.agentId, steps: [], streaming: true }
      ]
    });
    try {
      const res = await api('/api/hermes/chat', {
        method: 'POST', headers: { Accept: 'text/event-stream' }, signal: this.controller.signal,
        body: JSON.stringify({ prompt, history, agentId: this.state.agentId, stream: true, freeOnly: true })
      });
      await checkResponse(res);
      await readHermesStream(res, event => this.onProgress(messageId, event));
      await this.syncStore();
      void this.loadServerStatus();
    } catch (e: any) {
      const aborted = this.controller?.signal.aborted;
      this.changeMessage(messageId, m => ({
        ...m, streaming: false, outcome: aborted ? 'cancelled' : 'error',
        content: `### ${aborted ? 'Connexion arrêtée' : 'Demande non aboutie'}\n${aborted ? 'Aucune nouvelle étape ne doit être lancée. Une action déjà engagée peut se terminer : vérifiez le journal serveur.' : e.message}\n\nLes étapes déjà reçues restent visibles. Aucune réussite n’est présumée.`,
        steps: m.steps?.map(s => s.status === 'running' ? { ...s, status: 'cancelled', summary: 'Connexion interrompue : résultat non confirmé. Vérifiez le journal serveur.' } : s)
      }));
    } finally {
      this.controller = undefined;
      this.patch({ status: 'idle', activeRun: undefined });
    }
  }
  public async stopCurrentRun() {
    const run = this.state.activeRun;
    if (!run || run.stopping) return;
    this.patch({ activeRun: { ...run, stopping: true, label: 'Arrêt demandé — attente de la fin de l’action engagée…' } });
    if (!run.runId) { this.controller?.abort(); return; }
    try {
      const res = await api('/api/hermes/chat/stop', { method: 'POST', body: JSON.stringify({ runId: run.runId }) });
      if (res.status !== 404) await checkResponse(res);
    } catch (e: any) { this.system(`Arrêt non confirmé par le serveur : ${e.message}`); this.controller?.abort(); }
  }

  public async answerQuestion(messageId: string, answer: string) {
    const q = this.state.messages.find(m => m.id === messageId)?.question;
    if (!q || q.answer || this.busy() || !answer.trim() || (!q.allowCustom && !q.options.includes(answer))) return;
    this.changeMessage(messageId, m => ({ ...m, question: { ...q, answer: answer.trim() } }));
    await this.sendMessage(`En réponse à « ${q.question} » : ${answer.trim()}`);
  }
  public async continueMessage(messageId: string) {
    const index = this.state.messages.findIndex(m => m.id === messageId);
    const msg = this.state.messages[index];
    const request = this.state.messages.slice(0, index).reverse().find(m => m.sender === 'user');
    if (!request || !msg) return;
    const hasActions = msg.steps?.some(s => s.tool !== 'ask_user');
    await this.sendMessage(hasActions ? `Vérifie les résultats et le journal, puis poursuis sans répéter les écritures effectuées ou de résultat incertain : ${request.content}`.slice(0, 4000) : request.content);
  }
  public async inspect(tool = 'audit_system') {
    if (this.busy()) return;
    this.patch({ status: 'executing' });
    try {
      const res = await api('/api/hermes/inspect', { method: 'POST', body: JSON.stringify({ tool }) });
      await checkResponse(res);
      const result: HermesChatResponse = await res.json();
      this.append({ id: id(), sender: 'hermes', content: result.response, timestamp: timestamp(), steps: result.steps, outcome: result.outcome, provider: result.provider, model: result.model, agent: result.agent });
    } catch (e: any) { this.system(`**Diagnostic indisponible** : ${e.message}`); }
    finally { this.patch({ status: 'idle' }); }
  }

  private async decideAction(actionId: string, decision: 'approve' | 'refuse') {
    if (this.busy()) return;
    const msg = this.state.messages.find(m => m.pendingConfirmations?.some(p => p.actionId === actionId));
    const pc = msg?.pendingConfirmations?.find(p => p.actionId === actionId);
    if (!msg || !pc || pc.confirmed || pc.refused) return;
    this.patch({ status: 'executing', decidingAction: actionId });
    const update = (fields: Partial<HermesConfirmation>) => this.changeMessage(msg.id, m => ({ ...m, pendingConfirmations: m.pendingConfirmations?.map(p => p.actionId === actionId ? { ...p, ...fields } : p) }));
    try {
      const res = await api('/api/hermes/confirm', { method: 'POST', body: JSON.stringify({ actionId, decision }) });
      await checkResponse(res);
      const data = await res.json();
      update({ confirmed: !!data.confirmed, refused: !!data.refused, error: undefined });
      this.append({
        id: id(), sender: 'system', timestamp: timestamp(), agent: pc.agentId, steps: data.steps,
        content: data.refused ? `**Action refusée : ${pc.tool}.** La demande a été supprimée côté serveur.`
          : `**Action exécutée : ${data.tool}.**\n\n\`\`\`json\n${JSON.stringify(data.result, null, 2).slice(0, 4000)}\n\`\`\`\n\nCette autorisation ne s’étend à aucune autre action.`
      });
      if (data.confirmed) await this.syncStore();
    } catch (e: any) { update({ error: e.message }); }
    finally { this.patch({ status: 'idle', decidingAction: undefined }); }
  }
  public confirmAction(actionId: string) { return this.decideAction(actionId, 'approve'); }
  public refuseAction(actionId: string) { return this.decideAction(actionId, 'refuse'); }
  private async syncStore() {
    try { await fetchInitialState(); await store.reloadFromServer(); }
    catch { this.system('Résultat conservé, mais la boutique n’a pas pu être resynchronisée. Actualisez-la avant une nouvelle modification.'); }
  }
  public clearHistory() { if (!this.busy()) this.patch({ messages: [welcome()] }); }
}
export const hermesAgentService = new HermesAgentService();
