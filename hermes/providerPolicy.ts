/** Politique conservatrice : un nom « free » ne prouve jamais la gratuité. */
export interface ProviderCostInfo {
  kind: 'gemini' | 'openai';
  baseUrl?: string;
  model: string;
  local?: boolean;
  hasKey?: boolean;
}

export function freeOnlyEnabled(requested?: boolean): boolean {
  // Seul l'opérateur serveur peut déverrouiller le mode payant. L'UI reste gratuite.
  return process.env.HERMES_FREE_ONLY !== '0' || requested !== false;
}

export function isLoopbackUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password &&
      ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch { return false; }
}

export function providerCostPolicy(p: ProviderCostInfo): { eligible: boolean; label: string } {
  if (p.kind === 'openai' && p.local && isLoopbackUrl(p.baseUrl || '') && !/:cloud\b/i.test(p.model)) {
    return { eligible: true, label: 'Endpoint local — ressources serveur à votre charge, modèle local requis' };
  }
  try {
    const u = new URL(p.baseUrl || '');
    if (p.kind === 'openai' && u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.search && !u.hash) {
      if (u.hostname === 'openrouter.ai' && u.pathname.replace(/\/$/, '') === '/api/v1' && (p.model.endsWith(':free') || p.model === 'openrouter/free')) {
        return { eligible: true, label: 'Modèle :free — quota gratuit du fournisseur, sans repli payant' };
      }
      if (!p.hasKey && [
        'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
        'https://api.llm7.io/v1'
      ].includes(u.href.replace(/\/$/, ''))) {
        return { eligible: true, label: 'Endpoint sans clé — disponibilité et quotas non garantis' };
      }
    }
  } catch { /* URL absente/invalide : refus conservateur */ }
  return { eligible: false, label: 'Bloqué : facturation inconnue (une clé « free tier » peut être facturable)' };
}
