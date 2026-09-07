/** Politique conservatrice : un nom « free » ne prouve jamais la gratuité. */
export interface ProviderCostInfo {
  kind: 'gemini' | 'openai';
  baseUrl?: string;
  model: string;
  /** Cascade complète (model + replis). Si absente, seul `model` est évalué. */
  models?: string[];
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

/** Un modèle OpenRouter est gratuit s'il est suffixé `:free` ou s'il s'agit du routeur gratuit. */
export function isOpenRouterFreeModel(model: string): boolean {
  const m = String(model || '').trim();
  return m.endsWith(':free') || m === 'openrouter/free';
}

/** Endpoints anonymes connus (sans clé) — la SEULE liste faisant foi pour la politique de coût. */
export const ANONYMOUS_FREE_BASE_URLS: readonly string[] = [
  'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
  'https://api.llm7.io/v1'
];

/**
 * Éligibilité au mode « sans API payante ». TOUS les modèles de la cascade
 * doivent être gratuits : un seul modèle payant glissé dans la liste bloque
 * l'entrée entière (aucun repli payant possible au sein d'un appel).
 */
export function providerCostPolicy(p: ProviderCostInfo): { eligible: boolean; label: string } {
  const models = [...new Set([p.model, ...(p.models || [])].map(m => String(m || '').trim()).filter(Boolean))];
  if (p.kind === 'openai' && p.local && isLoopbackUrl(p.baseUrl || '') && !models.some(m => /:cloud\b/i.test(m))) {
    return { eligible: true, label: 'Endpoint local — ressources serveur à votre charge, modèle local requis' };
  }
  try {
    const u = new URL(p.baseUrl || '');
    if (p.kind === 'openai' && u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.search && !u.hash) {
      if (u.hostname === 'openrouter.ai' && u.pathname.replace(/\/$/, '') === '/api/v1' && models.length > 0 && models.every(isOpenRouterFreeModel)) {
        return {
          eligible: true,
          label: models.length > 1
            ? `Cascade de ${models.length} modèles :free — quota gratuit du fournisseur, sans repli payant`
            : 'Modèle :free — quota gratuit du fournisseur, sans repli payant'
        };
      }
      if (!p.hasKey && ANONYMOUS_FREE_BASE_URLS.includes(u.href.replace(/\/$/, ''))) {
        return { eligible: true, label: 'Endpoint sans clé — disponibilité et quotas non garantis' };
      }
    }
  } catch { /* URL absente/invalide : refus conservateur */ }
  return { eligible: false, label: 'Bloqué : facturation inconnue (une clé « free tier » peut être facturable)' };
}
