/**
 * verify-security.mjs — Suite de regression SÉCURITÉ (TEST uniquement).
 *
 * Prérequis : le serveur `tsx server.ts` tourne avec une base accessible, et
 * la base contient :
 *   - df_stripe_whsec            (secret de signature Stripe)
 *   - df_moderator_passcode      (passcode modérateur connu — voir --passcode)
 *   - dpf_app_v2_products        (catalogue de test)
 *   - dpf_app_v2_orders          (PII de test, doit être filtrée)
 *
 * Usage :
 *   node scripts/verify-security.mjs --base http://127.0.0.1:3211 --passcode MON_PASSCODE
 *
 * Chaque test simule une attaque réelle de l'audit (AUDIT_SECURITE.md) et
 * vérifie qu'elle est neutralisée. Sortie : 0 si tout passe, 1 sinon.
 */
import crypto from 'crypto';

function argValue(name, def) {
  const eq = process.argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}
const BASE = argValue('--base', 'http://127.0.0.1:3211');
const PASSCODE = argValue('--passcode', '');
const WHSEC = argValue('--whsec', 'whsec_test_secret_abc123');

let failures = 0;
function check(name, cond, detail = '') {
  const tag = cond ? 'PASS ✅' : 'FAIL ❌';
  if (!cond) failures++;
  console.log(`${tag}  ${name}${detail ? `  [${detail}]` : ''}`);
}

async function req(method, path, { body, auth, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json';
  if (auth) h['Authorization'] = `Bearer ${auth}`;
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

(async () => {
  if (!PASSCODE) {
    console.error('Usage: node scripts/verify-security.mjs --base <url> --passcode <passcode> [--whsec <secret>]');
    process.exit(2);
  }

  console.log(`\n═══ SÉCURITÉ — Store clé-valeur ═══`);

  // C1 : fuite de la base (clé Stripe, passcode, PII)
  let r = await req('GET', '/api/store');
  let keys = (r.json || []).map(x => x.key);
  check('GET /api/store ne révèle PAS la clé Stripe secrète', !keys.includes('df_stripe_sk'));
  check('GET /api/store ne révèle PAS le passcode', !keys.includes('df_moderator_passcode'));
  check('GET /api/store ne révèle PAS les webhooks/secret Stripe', !keys.includes('df_stripe_whsec'));
  check('GET /api/store ne révèle PAS les PII (commandes/clients)', !keys.includes('dpf_app_v2_orders') && !keys.includes('dpf_app_v2_customers'));
  check('GET /api/store reste lisible pour le catalogue public', keys.includes('dpf_app_v2_products'));

  // C2 : écriture non auth / mauvais passcode
  r = await req('POST', '/api/store', { body: { key: 'df_stripe_sk', value: 'sk_live_ATTACKER' } });
  check('Écriture NON auth de la clé Stripe → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/store', { body: { key: 'df_stripe_sk', value: 'sk_live_ATTACKER' }, auth: 'mauvais-passcode' });
  check('Écriture avec MAUVAIS passcode → 401', r.status === 401, `HTTP ${r.status}`);

  // C2b : même authentifié, les clés PII/secrets sont protégées
  r = await req('POST', '/api/store', { body: { key: 'dpf_app_v2_orders', value: 'HACKED' }, auth: PASSCODE });
  check('Écriture auth d\'une clé PII protégée → 403', r.status === 403, `HTTP ${r.status}`);
  r = await req('GET', '/api/store/get?key=df_stripe_sk', { auth: PASSCODE });
  check('Lecture auth de la clé Stripe secrète → 403', r.status === 403, `HTTP ${r.status}`);

  console.log(`\n═══ SÉCURITÉ — Tunnel de paiement ═══`);

  // C3 : plus de paid:true par défaut
  r = await req('GET', '/api/checkout/verify-session/cs_test_NONEXISTANT');
  check('verify-session (session inconnue) ne répond JAMAIS paid:true', r.json && r.json.paid !== true, `paid=${r.json && r.json.paid}`);

  // C3 : le paramètre ?sk= client est ignoré (même réponse sans clé serveur)
  r = await req('GET', '/api/checkout/verify-session/cs_test_NONEXISTANT?sk=sk_live_ATTACKER');
  check('verify-session ignore la clé fournie par le client (?sk=)', r.json && r.json.paid !== true);

  console.log(`\n═══ SÉCURITÉ — Anti-SSRF ═══`);

  const auth = { auth: PASSCODE };
  r = await req('POST', '/api/channels/dispatch-webhook', { body: { endpointUrl: 'http://169.254.169.254/computeMetadata/v1/', platform: 'custom' }, ...auth });
  check('SSRF → metadata GCP (http) bloqué', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/channels/dispatch-webhook', { body: { endpointUrl: 'https://10.0.0.1/x', platform: 'custom' }, ...auth });
  check('SSRF → IP privée (10/8) bloqué', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/social/verify-connection', { body: { platform: 'custom', webhookUrl: 'https://127.0.0.1:5432' }, ...auth });
  check('SSRF → localhost bloqué', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/social/verify-connection', { body: { platform: 'telegram', botToken: '123:AAAA@/../../../internal' }, ...auth });
  check('Token Telegram malformé (injection URL) rejeté', r.status === 400, `HTTP ${r.status}`);

  console.log(`\n═══ SÉCURITÉ — Webhook Stripe signé ═══`);

  const body = '{"type":"checkout.session.completed","data":{"id":"cs_123"}}';
  r = await req('POST', '/api/webhooks/stripe', { body, headers: { 'Content-Type': 'application/json' } });
  check('Webhook SANS signature → 400', r.status === 400, `HTTP ${r.status}`);

  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', WHSEC).update(body).digest('hex');
  r = await req('POST', '/api/webhooks/stripe', { body, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${v1}` } });
  check('Webhook avec signature VALIDE → 200 verified', r.status === 200 && r.json && r.json.verified === true, `HTTP ${r.status}`);
  r = await req('POST', '/api/webhooks/stripe', { body, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${'0'.repeat(64)}` } });
  check('Webhook avec signature FALSIFIÉE → 400', r.status === 400, `HTTP ${r.status}`);

  console.log(`\n═══ SÉCURITÉ — Endpoints modérateur ═══`);

  r = await req('POST', '/api/hermes/chat', { body: { prompt: 'optimise la boutique' } });
  check('Hermes chat SANS auth → 401 (plus d\'écriture base anonyme)', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/checkout/verify-keys', { body: { secretKey: 'sk_test_x' } });
  check('verify-keys SANS auth → 401 (oracle de clés fermé)', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/agents/synergy', { body: { prompt: 'test' } });
  check('agents/synergy SANS auth → 401 (consommation Gemini protégée)', r.status === 401, `HTTP ${r.status}`);

  console.log(`\n═══ SÉCURITÉ — Rate limiting ═══`);

  let limited = false;
  for (let i = 0; i < 8; i++) {
    const rr = await req('POST', '/api/hermes/chat', { body: { prompt: 'x' }, auth: PASSCODE });
    if (rr.status === 429) { limited = true; break; }
  }
  check('Hermes chat rate-limite (429 après quota IA)', limited);

  console.log(`\n═══ SÉCURITÉ — Proxy Stripe ouvert ═══`);
  // Avant : GET /api/stripe/v1/balance était proxifié vers api.stripe.com (JSON).
  // Après : aucun proxy — le path renvoie le fallback SPA (HTML) ou une erreur.
  r = await req('GET', '/api/stripe/v1/balance');
  const isJsonApi = r.json !== null && r.json !== undefined;
  check('Proxy /api/stripe* supprimé (plus de relais JSON vers api.stripe.com)', !isJsonApi, `HTTP ${r.status}`);

  console.log(`\n\n═══ SÉCURITÉ PHASE 2 — Auth token de session ═══`);

  // A1 : login valide → token signé
  r = await req('POST', '/api/auth/login', { body: { passcode: PASSCODE } });
  const TOKEN = r.json && r.json.token;
  check('Login passcode valide → 200 + token de session', r.status === 200 && typeof TOKEN === 'string' && TOKEN.length > 20, `HTTP ${r.status}`);

  // A2 : login invalide → 401
  r = await req('POST', '/api/auth/login', { body: { passcode: 'passcode-inauthentique-xxxx' } });
  check('Login passcode INVALIDE → 401', r.status === 401, `HTTP ${r.status}`);

  // A3 : token accepté comme credential modérateur
  r = await req('POST', '/api/store', { body: { key: 'dpf_test_token_write', value: 'ok' }, auth: TOKEN || 'token-inexistant' });
  check('Écriture avec TOKEN de session valide → 200', r.status === 200, `HTTP ${r.status}`);

  // A4 : révocation — après logout, le token est mort
  r = await req('POST', '/api/auth/logout', { auth: TOKEN || 'x' });
  check('Logout → 200 (token révoqué)', r.status === 200, `HTTP ${r.status}`);
  r = await req('POST', '/api/store', { body: { key: 'dpf_test_token_write', value: 'ok2' }, auth: TOKEN || 'x' });
  check('Écriture avec token RÉVOQUÉ → 401', r.status === 401, `HTTP ${r.status}`);

  console.log(`\n\n═══ SÉCURITÉ PHASE 2 — Commandes 100% serveur (mode démo) ═══`);

  // D0 : configuration publique
  r = await req('GET', '/api/checkout/config');
  check('checkout/config : sans Stripe → demoEnabled=true', r.status === 200 && r.json && r.json.stripeConfigured === false && r.json.demoEnabled === true, JSON.stringify(r.json));

  // D1 : création de session démo → commande PENDING côté serveur
  const items = [
    { productId: 'test-a', productTitle: 'Guide A', price: 27, quantity: 1 },
    { productId: 'test-b', productTitle: 'Ebook B', price: 19.5, quantity: 2 }
  ];
  r = await req('POST', '/api/checkout/create-session', { body: { items, customer: { email: 'test@example.com', name: 'Test' } } });
  const srvOrderId = r.json && r.json.serverOrderId;
  const expectedCents = Math.round((27 * 1 + 19.5 * 2) * 100);
  check('create-session (mode démo) → serverOrderId + totalCents calculé SERVEUR', r.status === 200 && r.json && r.json.mode === 'demo' && !!srvOrderId && r.json.totalCents === expectedCents, `totalCents=${r.json && r.json.totalCents} attendu=${expectedCents}`);

  // D2 : rejeu client — aucun serverOrderId réel → jamais de livraison
  r = await req('POST', '/api/checkout/demo-complete', { body: { serverOrderId: 'srv-fabrique-attack-0000000000', customerEmail: 'hacker@evil.com' } });
  check('demo-complete avec ID FABRIQUÉ → 404 (pas de livraison fantôme)', r.status === 404, `HTTP ${r.status}`);
  r = await req('POST', '/api/checkout/demo-complete', { body: {} });
  check('demo-complete SANS ID → 400', r.status === 400, `HTTP ${r.status}`);

  // D3 : livraison valide → token de téléchargement ÉMIS PAR LE SERVEUR
  r = await req('POST', '/api/checkout/demo-complete', { body: { serverOrderId: srvOrderId, customerEmail: 'test@example.com' } });
  check('demo-complete valide → 200 + downloadToken SERVEUR', r.status === 200 && r.json && r.json.success === true && typeof (r.json.serverOrder || {}).downloadToken === 'string' && (r.json.serverOrder || {}).downloadToken.startsWith('dl_token_'), `token=${(r.json && r.json.serverOrder && r.json.serverOrder.downloadToken || '').slice(0, 12)}…`);
  check('demo-complete : paymentMethod=demo, totalCents conforme', r.json && (r.json.serverOrder || {}).paymentMethod === 'demo' && (r.json.serverOrder || {}).totalCents === expectedCents);

  // D4 : idempotence — un second appel ne re-livre PAS (409)
  r = await req('POST', '/api/checkout/demo-complete', { body: { serverOrderId: srvOrderId, customerEmail: 'test@example.com' } });
  check('demo-complete en double → 409 (livraison unique)', r.status === 409, `HTTP ${r.status}`);

  console.log(`\n\n═══ SÉCURITÉ PHASE 2 — Crypto on-chain (fail-safe) ═══`);

  // K1 : taux publics
  r = await req('GET', '/api/crypto/rates');
  check('GET /api/crypto/rates → 200 + taux > 0', r.status === 200 && r.json && Number(r.json.rates.BTC) > 0, JSON.stringify(r.json && r.json.rates));

  // K2 : session crypto → commande PENDING + adresse SERVEUR
  r = await req('POST', '/api/checkout/crypto-session', { body: { items: [items[0]], asset: 'BTC', customerEmail: 'test@example.com' } });
  const cryptoOrderId = r.json && r.json.serverOrderId;
  check('crypto-session BTC → serverOrderId + merchantAddress + totalCents', r.status === 200 && !!cryptoOrderId && typeof (r.json || {}).merchantAddress === 'string' && (r.json || {}).merchantAddress.length > 20 && (r.json || {}).totalCents === 2700, `addr=${(r.json || {}).merchantAddress || ''}`.slice(0, 40));
  r = await req('POST', '/api/checkout/crypto-session', { body: { items: [items[0]], asset: 'DOGE' } });
  check('crypto-session actif non supporté → 400', r.status === 400, `HTTP ${r.status}`);

  // K3 : formats de hash invalides → 400
  r = await req('POST', '/api/crypto/verify-transaction', { body: { asset: 'BTC', txHash: 'pas-un-hash', expectedAmount: '270000', serverOrderId: cryptoOrderId } });
  check('verify-transaction hash BTC malformé → 400', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/crypto/verify-transaction', { body: { asset: 'ETH', txHash: 'xyz', expectedAmount: '1', serverOrderId: cryptoOrderId } });
  check('verify-transaction hash ETH malformé → 400', r.status === 400, `HTTP ${r.status}`);

  // K4 : hash BTC bien formé mais inexistant → JAMAIS verified:true
  // (sandbox sans egress : status error ; en prod : not_found ou pending)
  r = await req('POST', '/api/crypto/verify-transaction', { body: { asset: 'BTC', txHash: 'ab'.repeat(32), expectedAmount: '270000', serverOrderId: cryptoOrderId } });
  check('verify-transaction BTC inconnu → verified:FALSE (jamais de confirmation fantôme)', r.status === 200 && r.json && r.json.verified === false && r.json.status !== 'confirmed', `status=${r.json && r.json.status}`);

  // K5 : SOL/USDT → revue manuelle, jamais confirmé auto
  r = await req('POST', '/api/crypto/verify-transaction', { body: { asset: 'SOL', txHash: '5'.repeat(88), expectedAmount: '2700000000', serverOrderId: cryptoOrderId } });
  check('verify-transaction SOL → manual_review (jamais confirmed auto)', r.status === 200 && r.json && r.json.verified === false && r.json.status === 'manual_review', `status=${r.json && r.json.status}`);

  // K6 : la commande crypto PENDING n'a PAS été livrée malgré les tentatives
  r = await req('POST', '/api/checkout/demo-complete', { body: { serverOrderId: cryptoOrderId, customerEmail: 'test@example.com' } });
  check('Commande crypto PENDING refusée par demo-complete (mauvaise source)', r.status === 400, `HTTP ${r.status}`);

  console.log(`\n${failures === 0 ? '🟢 TOUS LES TESTS SÉCURITÉ PASSENT' : `🔴 ${failures} TEST(S) EN ÉCHEC`}\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('Erreur de la suite de tests:', e.message); process.exit(1); });
