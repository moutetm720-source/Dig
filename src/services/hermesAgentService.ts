/**
 * hermesAgentService.ts — Client du moteur HERMES v4 (réel, côté serveur).
 *
 * Le moteur (boucle d'agent avec tool-calling, 29 skills, 8 agents
 * spécialisés) vit entièrement côté serveur : /api/hermes/*.
 * Ce service n'est qu'un fin canal de transport — il ne génère AUCUNE
 * réponse en local (plus de « fallback factice »).
 */

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { fetchInitialState } from './syncState';
import { store } from './store';
import { getAuthBearer } from './authToken';

export interface HermesSkillInfo {
  name: string;
  description: string;
  dangerous: boolean;
  confirmation: boolean;
}

export interface HermesAgent {
  id: string;
  name: string;
  description: string;
  skills: string[];
  maxSteps: number;
}

export interface HermesServerStatus {
  status: 'active' | 'inactive';
  engine: string;
  provider: string;
  providerReason: string;
  hasGeminiKey: boolean;
  skillsCount: number;
  agentsCount: number;
  memoriesCount: number;
  skills: HermesSkillInfo[];
  agents: HermesAgent[];
}

export interface AgentStep {
  tool: string;
  args?: any;
  status: 'ok' | 'error' | 'denied' | 'timeout';
  summary?: string;
}

export interface HermesMessage {
  id: string;
  sender: 'user' | 'hermes' | 'system';
  content: string;
  timestamp: string;
  agent?: string;
  provider?: string;
  steps?: AgentStep[];
  pendingConfirmation?: {
    actionId: string;
    tool: string;
    summary: string;
    confirmed?: boolean;
    refused?: boolean;
  };
  isAutonomous?: boolean;
}

export interface HermesAgentState {
  agentId: string;
  isAutonomousEnabled: boolean;
  autonomousIntervalMinutes: number;
  lastAutonomousRun: string | null;
  status: 'idle' | 'thinking' | 'executing' | 'error';
  serverStatus: HermesServerStatus | null;
  messages: HermesMessage[];
}

const STORAGE_KEY = 'df_hermes_agent_state_v4';

async function api(path: string, init: RequestInit = {}) {
  const bearer = getAuthBearer();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: bearer } : {}),
      ...(init.headers || {})
    }
  });
  return res;
}

class HermesAgentService {
  private state: HermesAgentState;
  private listeners: Array<() => void> = [];
  private autoLoopTimer: any = null;

  constructor() {
    const saved = safeGetItem(STORAGE_KEY, null);
    let parsed: any = null;
    if (saved) {
      try { parsed = JSON.parse(saved); } catch { parsed = null; }
    }
    this.state = {
      agentId: 'orchestrator',
      isAutonomousEnabled: false,
      autonomousIntervalMinutes: 30,
      lastAutonomousRun: null,
      status: 'idle',
      serverStatus: null,
      messages: []
    };
    // On ne restaure que les préférences locales (jamais d'état factice)
    if (parsed) {
      this.state.agentId = parsed.agentId || this.state.agentId;
      this.state.isAutonomousEnabled = !!parsed.isAutonomousEnabled;
      this.state.autonomousIntervalMinutes = parsed.autonomousIntervalMinutes || 30;
      this.state.lastAutonomousRun = parsed.lastAutonomousRun || null;
    }

    if (this.state.messages.length === 0) {
      this.state.messages = [
        {
          id: 'welcome-1',
          sender: 'hermes',
          content: `👋 **Je suis Hermes Agent v4** — un moteur d'agent réel qui tourne sur votre serveur.\n\nJ'ai **29 compétences** (créer/publier des produits, re-pricing, SEO, diffusion sur vos canaux, audit, maintenance) et **7 agents spécialisés** que je peux dispatcher. Chaque action est exécutée côté serveur, tracée dans le journal d'audit, et les actions sensibles demandent votre confirmation.\n\n*Que puis-je faire pour votre fabrique ?*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }

    this.startAutoLoopIfNeeded();
    void this.loadServerStatus();
  }

  private getDefaultState(): HermesAgentState {
    return {
      agentId: 'orchestrator',
      isAutonomousEnabled: false,
      autonomousIntervalMinutes: 30,
      lastAutonomousRun: null,
      status: 'idle',
      serverStatus: null,
      messages: []
    };
  }

  public getState(): HermesAgentState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    safeSetItem(STORAGE_KEY, JSON.stringify(this.state));
    this.listeners.forEach(l => l());
  }

  public setAgent(agentId: string) {
    this.state.agentId = agentId;
    this.notify();
  }

  /** État réel du moteur (fournisseur, registres, compteurs). */
  public async loadServerStatus(): Promise<HermesServerStatus | null> {
    try {
      const res = await api('/api/hermes/status');
      if (!res.ok) return null;
      const data = await res.json();
      this.state.serverStatus = {
        status: data.status,
        engine: data.engine,
        provider: data.provider,
        providerReason: data.providerReason,
        hasGeminiKey: data.hasGeminiKey,
        skillsCount: data.skillsCount,
        agentsCount: data.agentsCount,
        memoriesCount: data.memoriesCount,
        skills: data.skills || [],
        agents: data.agents || []
      };
      this.notify();
      return this.state.serverStatus;
    } catch (e) {
      console.warn('Hermes status indisponible', e);
      return null;
    }
  }

  public toggleAutonomy(enabled?: boolean) {
    this.state.isAutonomousEnabled = enabled !== undefined ? enabled : !this.state.isAutonomousEnabled;
    this.notify();
    this.startAutoLoopIfNeeded();
  }

  public setAutoInterval(minutes: number) {
    this.state.autonomousIntervalMinutes = minutes;
    this.notify();
    this.startAutoLoopIfNeeded();
  }

  private startAutoLoopIfNeeded() {
    if (this.autoLoopTimer) {
      clearInterval(this.autoLoopTimer);
      this.autoLoopTimer = null;
    }
    if (this.state.isAutonomousEnabled) {
      const ms = Math.max(1, this.state.autonomousIntervalMinutes) * 60 * 1000;
      this.autoLoopTimer = setInterval(() => {
        void this.runAutonomousNow(true);
      }, ms);
    }
  }

  /** Cycle autonome réel (agent security_auditor) — silencieux s'il n'y a pas de fournisseur IA. */
  public async runAutonomousNow(silentIfEmpty = false): Promise<string | null> {
    if (this.state.status === 'thinking') return null;
    this.state.status = 'executing';
    this.notify();
    try {
      const res = await api('/api/hermes/autonomous-loop', { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      this.state.lastAutonomousRun = new Date().toISOString();
      if (data.insight) {
        this.state.messages.push({
          id: `auto-${Date.now()}`,
          sender: 'hermes',
          content: `🤖 **Cycle autonome Hermes v4** (${data.agent || 'security_auditor'})\n\n${data.insight}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agent: data.agent,
          provider: data.provider,
          steps: data.steps,
          isAutonomous: true
        });
        store.addLog('info', 'agent', `[Hermes autonome] ${String(data.insight).slice(0, 100)}…`);
        return data.insight;
      }
      if (!silentIfEmpty) {
        this.state.messages.push({
          id: `auto-${Date.now()}`,
          sender: 'system',
          content: `⚙️ **Cycle autonome** : exécuté, mais aucun insight produit — ${data.reason || 'aucun fournisseur IA configuré'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      return null;
    } catch (e) {
      console.warn('Hermes autonomous loop error', e);
      return null;
    } finally {
      this.state.status = 'idle';
      this.notify();
    }
  }

  public async sendMessage(text: string): Promise<void> {
    if (!text.trim()) return;
    this.state.messages.push({
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.state.status = 'thinking';
    this.notify();

    try {
      const history = this.state.messages
        .filter(m => m.sender === 'user' || m.sender === 'hermes')
        .slice(-8)
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.content }));

      const res = await api('/api/hermes/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt: text.trim(), history, agentId: this.state.agentId })
      });

      if (res.status === 429) {
        throw new Error('Limite de requêtes IA atteinte (6/min). Patientez une minute.');
      }
      if (res.status === 401) {
        throw new Error('Session expirée — reconnectez-vous (passcode modérateur).');
      }
      if (!res.ok) {
        throw new Error(`Erreur serveur (HTTP ${res.status})`);
      }

      const data = await res.json();
      const msg: HermesMessage = {
        id: `hermes-${Date.now()}`,
        sender: 'hermes',
        content: data.response || '—',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agent: data.agent,
        provider: data.provider,
        steps: data.steps
      };
      if (data.pendingConfirmation) {
        msg.pendingConfirmation = data.pendingConfirmation;
      }
      this.state.messages.push(msg);
      this.notify();

      // Hermes a peut-être modifié la boutique (prix, produits, SEO…) → resynchronisation
      await new Promise(r => setTimeout(r, 400));
      await fetchInitialState();
      await store.reloadFromServer();
    } catch (err: any) {
      // Pas de réponse inventée : on signale l'échec honnêtement.
      this.state.messages.push({
        id: `hermes-error-${Date.now()}`,
        sender: 'system',
        content: `⚠️ **Hermes n'a pas pu répondre** : ${err?.message || 'erreur réseau'}. Vérifiez que le serveur est démarré et que votre session est valide.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      this.state.status = 'idle';
      this.notify();
    }
  }

  /** Confirme une action sensible précédemment bloquée (actionId). */
  public async confirmAction(actionId: string): Promise<void> {
    const pending = this.state.messages.find(m => m.pendingConfirmation?.actionId === actionId);
    if (pending?.pendingConfirmation) pending.pendingConfirmation.confirmed = false;
    this.state.status = 'executing';
    this.notify();
    try {
      const res = await api('/api/hermes/confirm', {
        method: 'POST',
        body: JSON.stringify({ actionId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const resultSummary = data.result ? JSON.stringify(data.result).slice(0, 200) : 'confirmée';
      this.state.messages.push({
        id: `confirm-${Date.now()}`,
        sender: 'system',
        content: `✅ **Action confirmée et exécutée** (${data.tool || 'outil'}): \`${resultSummary}\``,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      if (pending) pending.pendingConfirmation!.confirmed = true;
      await fetchInitialState();
      await store.reloadFromServer();
    } catch (err: any) {
      this.state.messages.push({
        id: `confirm-error-${Date.now()}`,
        sender: 'system',
        content: `⚠️ **Confirmation refusée par le serveur** (action expirée ou invalide) : ${err?.message || 'HTTP ' + (err?.status || '?')}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      this.state.status = 'idle';
      this.notify();
    }
  }

  /** Refuse une action en attente (côté client uniquement — l'action expirera côté serveur). */
  public refuseAction(actionId: string) {
    const pending = this.state.messages.find(m => m.pendingConfirmation?.actionId === actionId);
    if (pending?.pendingConfirmation) pending.pendingConfirmation.refused = true;
    this.state.messages.push({
      id: `refuse-${Date.now()}`,
      sender: 'system',
      content: '🚫 **Action refusée.** Elle ne sera pas exécutée (expirera automatiquement côté serveur).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.notify();
  }

  public clearHistory() {
    this.state.messages = [
      {
        id: 'welcome-reset',
        sender: 'system',
        content: '🧹 **Historique réinitialisé.** (Le journal d\'audit serveur, lui, est conservé.)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    this.notify();
  }
}

export const hermesAgentService = new HermesAgentService();
