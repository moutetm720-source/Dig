/**
 * FIXTURE DE TEST — n'est JAMAIS importée par l'application.
 *
 * Reproduit volontairement les erreurs d'intégration que le docteur de code
 * (hermes/diagnostics.ts) doit DÉTECTER puis CORRIGER :
 *   - testStripe()  : endpoint requireAuth appelé sans Authorization (→ 401)
 *                     + réponse jamais vérifiée (échec silencieux)
 *   - saveConfig()  : idem sur /api/store
 *
 * Consommée par scripts/fixtures/doctor/fixture-run.ts (appelé par
 * scripts/verify-diagnostics.mjs) : scan → correctifs → re-scan → 0 finding.
 */

export async function testStripe(secretKey: string) {
  try {
    const res = await fetch('/api/checkout/verify-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey })
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function saveConfig(mode: string) {
  try {
    const r = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'df_stripe_mode', value: mode })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return true;
  } catch {
    return false;
  }
}
