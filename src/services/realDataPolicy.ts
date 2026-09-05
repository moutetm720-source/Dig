/**
 * realDataPolicy.ts — Politique « 100 % RÉEL » (anti-données inventées).
 *
 * Règle : aucune donnée chiffrée (vente, conversion, vue, clic, abonné,
 * tendance de marché…) ne doit être FABRIQUÉE par le code. Un chiffre affiché
 * provient soit d'une source externe réelle (API Stripe, webhook, plateforme
 * sociale, marché), soit d'un événement réellement produit par un utilisateur.
 *
 * Les anciens générateurs aléatoires (Math.random sur des métriques) sont
 * neutralisés : ils renvoient 0 / « non mesuré » au lieu d'inventer.
 *
 * Bascule : DIG_REAL_DATA_ONLY=0 réactive les anciens comportements simulés
 * (uniquement pour un environnement de démonstration isolé — jamais en prod).
 */

export const REAL_DATA_ONLY: boolean = (process.env.DIG_REAL_DATA_ONLY || '1').trim() !== '0';

const warned = new Set<string>();

/**
 * Vrai si le générateur de données simulées `domain` doit être BLOQUÉ.
 * Journalise une fois par domaine pour garder la trace du comportement.
 */
export function blockFakeData(domain: string): boolean {
  if (!REAL_DATA_ONLY) return false;
  if (!warned.has(domain)) {
    warned.add(domain);
    if (typeof console !== 'undefined') {
      console.info(`[real-data] « ${domain} » : génération de données simulées désactivée (100 % réel). Valeur non mesurée renvoyée à la place.`);
    }
  }
  return true;
}

/** Vrai si les données simulées sont autorisées (mode démo isolé uniquement). */
export function fakeDataAllowed(): boolean {
  return !REAL_DATA_ONLY;
}

/** Résumé affichable (UI / Hermes) de la politique en vigueur. */
export function realDataPolicyInfo(): { realDataOnly: boolean; env: string; note: string } {
  return {
    realDataOnly: REAL_DATA_ONLY,
    env: REAL_DATA_ONLY ? 'DIG_REAL_DATA_ONLY=1 (défaut)' : 'DIG_REAL_DATA_ONLY=0',
    note: REAL_DATA_ONLY
      ? 'Aucune métrique n’est inventée : les chiffres affichés proviennent de sources réelles (paiements vérifiés, API plateformes, interactions utilisateur).'
      : 'ATTENTION : les générateurs de données simulées sont réactivés (mode démo). Ne pas utiliser en production.'
  };
}
