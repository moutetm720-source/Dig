/**
 * agentSynergyService.ts — « Synergie multi-agents » HONNÊTE.
 *
 * Historique : ce service simulait localement une « alliance débridée »
 * (OBLITERATUS) avec des étapes et des résultats inventés. Le module
 * OBLITERATUS a été retiré du serveur (2026-09-03) : la synergie est
 * désormais une vraie conversation avec le moteur Hermes v4 (serveur),
 * sur un agent spécialisé au choix. Aucun résultat n'est inventé ici.
 */

import { hermesAgentService, AgentStep } from './hermesAgentService';

export interface SynergyExecutionResult {
  id: string;
  query: string;
  agentId: string;
  agentName: string;
  response: string | null;
  provider: string;
  steps: AgentStep[];
  success: boolean;
  error?: string;
  timestamp: string;
}

type Listener = () => void;

class AgentSynergyService {
  private history: SynergyExecutionResult[] = [];
  private listeners: Set<Listener> = new Set();

  /**
   * Exécute une synergie réelle : délègue la requête à un agent Hermes
   * (serveur) qui dispose des skills réels. Retourne ce que le moteur a
   * vraiment produit — ou une erreur explicite.
   */
  async runSynergyWorkflow(query: string, agentId: string = 'orchestrator'): Promise<SynergyExecutionResult> {
    const agents = hermesAgentService.getState().serverStatus?.agents || [];
    const agentName = agents.find(a => a.id === agentId)?.name || agentId;

    const result: SynergyExecutionResult = {
      id: `syn-${Date.now()}`,
      query,
      agentId,
      agentName,
      response: null,
      provider: '',
      steps: [],
      success: false,
      timestamp: new Date().toISOString()
    };

    try {
      // Envoie la requête via le canal Hermes standard (auth + rate-limit serveur)
      const stateBefore = hermesAgentService.getState().messages.length;
      hermesAgentService.setAgent(agentId);
      await hermesAgentService.sendMessage(query);
      const added = hermesAgentService.getState().messages.slice(stateBefore);
      const lastHermes = [...added].reverse().find(m => m.sender === 'hermes');
      if (lastHermes) {
        result.response = lastHermes.content;
        result.provider = lastHermes.provider || '';
        result.steps = lastHermes.steps || [];
        result.success = true;
      } else {
        const lastSystem = [...added].reverse().find(m => m.sender === 'system');
        result.error = lastSystem?.content || 'Aucune réponse du moteur Hermes.';
      }
    } catch (e: any) {
      result.error = e?.message || 'Erreur inconnue';
    }

    this.history.unshift(result);
    if (this.history.length > 20) this.history.length = 20;
    this.notify();
    return result;
  }

  getHistory(): SynergyExecutionResult[] {
    return [...this.history];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const agentSynergyService = new AgentSynergyService();
