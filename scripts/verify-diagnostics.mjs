/**
 * verify-diagnostics.mjs — Suite de régression du DOCTEUR DE CODE
 * (hermes/diagnostics.ts, agent Hermes `code_doctor`, endpoints /api/diagnostics/*).
 *
 * Prérequis : serveur démarré (base accessible), comme pour les autres suites :
 *   node scripts/start-test-pg.mjs
 *   PORT=3211 DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=*** DB_NAME=applet \
 *     DEMO_CHECKOUT=1 MODERATOR_PASSCODE=*** HERMES_PROVIDER=mock tsx server.ts
 *
 * Usage :
 *   node scripts/verify-diagnostics.mjs --base http://127.0.0.1:3211 --passcode <code>
 *
 * Couverture :
 *   1. contrat API_CONTRACT ↔ routes réelles de server.ts (anti-dérive)
 *   2. les endpoints /api/diagnostics/* et /api/integrations/* exigent l'auth (401)
 *   3. scan du dépôt réel : 0 finding (les bugs Stripe/réseaux sociaux sont corrigés)
 *   4. stripe_doctor : clé absente, clé pk_ refusée, mode live/test incohérent,
 *      devise invalide, secret masqué (aucune clé en clair dans la réponse)
 *   5. /api/integrations/social : aller-retour authentifié + clé toujours 403 via /api/store/get
 *   6. correctif automatique sur fixture : détection → réparation → re-scan à 0,
 *      TSX toujours valide, sauvegarde du fichier original
 *
 * Sortie : 0 si tout passe, 1 sinon.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function argValue(name, def) {
  const eq = process.argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}
const BASE = argValue('--base', 'http://127.0.0.1:3211');
const PASSCODE = argValue('--passcode', '');

let failures = 0;
function check(name, cond, detail = '') {
  const tag = cond ? 'PASS ✅' : 'FAIL ❌';
  if (!cond) failures++;
  console.log(`${tag}  ${name}${detail ? `  [${detail}]` : ''}`);
}

async function req(method, p, { body, auth, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json';
  if (auth) h['Authorization'] = `Bearer ${auth}`;
  const res = await fetch(BASE + p, {
    method,
    headers: h,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

(async () => {
  if (!PASSCODE) {
    console.error('Usage: node scripts/verify-diagnostics.mjs --base <url> --passcode <passcode>');
    process.exit(2);
  }
  const A = { auth: PASSCODE };

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Contrat API ↔ server.ts ═══`);
  // ═══════════════════════════════════════════════════════════
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf-8');
  const diagSrc = fs.readFileSync(path.join(ROOT, 'hermes', 'diagnostics.ts'), 'utf-8');

  // Routes réellement déclarées dans server.ts (hors routeur /api/hermes)
  const serverRoutes = [];
  const re = /app\.(get|post)\(\s*'([^']+)'\s*,([^\n]*)/g;
  let m;
  while ((m = re.exec(serverSrc)) !== null) {
    const [, verb, p, rest] = m;
    // requireAuth peut être passé plus loin dans la chaîne de middlewares
    const tail = serverSrc.slice(m.index, m.index + 400);
    serverRoutes.push({
      method: verb.toUpperCase(),
      path: p,
      auth: /requireAuth/.test(rest) || /requireAuth/.test(tail.split('\n')[0])
    });
  }
  const apiRoutes = serverRoutes.filter(r => r.path.startsWith('/api/') && !r.path.startsWith('/api/hermes'));

  // Contrat déclaré dans hermes/diagnostics.ts
  const contractBlock = /export const API_CONTRACT[\s\S]*?\n\];/.exec(diagSrc)?.[0] || '';
  const contract = [];
  const cre = /\{\s*method:\s*'(GET|POST)'\s*,\s*path:\s*'([^']+)'\s*,\s*auth:\s*(true|false)/g;
  let c;
  while ((c = cre.exec(contractBlock)) !== null) contract.push({ method: c[1], path: c[2], auth: c[3] === 'true' });

  check('API_CONTRACT déclaré (>= 20 endpoints)', contract.length >= 20, `${contract.length} entrées`);

  const norm = (p) => p.replace(/:[^/]+/g, ':param');
  let contractMismatch = [];
  for (const r of apiRoutes) {
    const found = contract.find(x => x.method === r.method && norm(x.path) === norm(r.path));
    if (!found) contractMismatch.push(`${r.method} ${r.path} absent du contrat`);
    else if (found.auth !== r.auth) contractMismatch.push(`${r.method} ${r.path} : contrat auth=${found.auth}, server.ts auth=${r.auth}`);
  }
  check('Chaque route /api/* de server.ts est dans le contrat avec le bon niveau d’auth',
    contractMismatch.length === 0, contractMismatch.slice(0, 3).join(' | '));

  const phantom = contract.filter(x => !apiRoutes.some(r => r.method === x.method && norm(r.path) === norm(x.path)));
  check('Aucun endpoint fantôme dans le contrat (route inexistante)', phantom.length === 0,
    phantom.slice(0, 3).map(x => `${x.method} ${x.path}`).join(' | '));

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Endpoints protégés ═══`);
  // ═══════════════════════════════════════════════════════════
  let r = await req('GET', '/api/diagnostics/scan');
  check('GET /api/diagnostics/scan SANS auth → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('GET', '/api/diagnostics/stripe');
  check('GET /api/diagnostics/stripe SANS auth → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/diagnostics/fix', { body: { id: 'x', confirm: true } });
  check('POST /api/diagnostics/fix SANS auth → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('GET', '/api/integrations/social');
  check('GET /api/integrations/social SANS auth → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/integrations/social', { body: { integrations: [] } });
  check('POST /api/integrations/social SANS auth → 401', r.status === 401, `HTTP ${r.status}`);

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Scan du dépôt réel ═══`);
  // ═══════════════════════════════════════════════════════════
  r = await req('GET', '/api/diagnostics/scan', A);
  const scan = r.json || {};
  check('GET /api/diagnostics/scan (auth) → 200 + rapport', r.status === 200 && typeof scan.scannedFiles === 'number',
    `HTTP ${r.status} fichiers=${scan.scannedFiles} appels=${scan.apiCalls}`);
  check('Le client ne contient AUCUNE erreur d’intégration (401/403/échec silencieux)',
    scan.count === 0, JSON.stringify(scan.byRule || {}) + (scan.findings || []).slice(0, 3).map(f => `${f.rule} ${f.file}:${f.line}`).join(' | '));

  r = await req('POST', '/api/diagnostics/fix', { body: { id: 'finding-inexistant', confirm: true }, ...A });
  check('POST /api/diagnostics/fix avec un id inconnu → 400', r.status === 400, `HTTP ${r.status}`);

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Diagnostic Stripe ═══`);
  // ═══════════════════════════════════════════════════════════
  r = await req('GET', '/api/diagnostics/stripe', A);
  let doc = r.json || {};
  const byId = (id) => (doc.checks || []).find(c => c.id === id);
  check('GET /api/diagnostics/stripe (auth) → 200 + checks', r.status === 200 && Array.isArray(doc.checks), `HTTP ${r.status}`);

  // Clé absente
  await req('POST', '/api/store', { body: { key: 'df_stripe_sk', value: '' }, ...A });
  r = await req('GET', '/api/diagnostics/stripe', A);
  doc = r.json || {};
  check('Clé Stripe absente → check stripe_key_present en FAIL', byId('stripe_key_present')?.status === 'fail',
    String(byId('stripe_key_present')?.message || '').slice(0, 60));

  // Clé PUBLIABLE collée à la place de la clé secrète (erreur classique)
  await req('POST', '/api/store', { body: { key: 'df_stripe_sk', value: 'pk_test_51ABCpublishableKEY' }, ...A });
  r = await req('GET', '/api/diagnostics/stripe', A);
  doc = r.json || {};
  check('Clé pk_… (publiable) → check stripe_key_format en FAIL', byId('stripe_key_format')?.status === 'fail',
    String(byId('stripe_key_format')?.message || '').slice(0, 70));
  check('Aucune clé en clair dans le diagnostic (masquage)',
    !r.text.includes('pk_test_51ABCpublishableKEY'), r.text.slice(0, 80));

  // Bonne clé + mode incohérent
  await req('POST', '/api/store', { body: { key: 'df_stripe_sk', value: 'sk_test_51ABCsecretKEY' }, ...A });
  await req('POST', '/api/store', { body: { key: 'df_stripe_mode', value: 'live' }, ...A });
  r = await req('GET', '/api/diagnostics/stripe', A);
  doc = r.json || {};
  check('Clé sk_test_ avec mode « live » → incohérence détectée', byId('stripe_mode_consistency')?.status === 'fail',
    String(byId('stripe_mode_consistency')?.message || '').slice(0, 70));
  check('Clé sk_test_ → format valide', byId('stripe_key_format')?.status === 'pass');

  // Devise invalide
  await req('POST', '/api/store', { body: { key: 'df_stripe_currency', value: 'XYZ' }, ...A });
  r = await req('GET', '/api/diagnostics/stripe', A);
  doc = r.json || {};
  check('Devise non ISO (XYZ) → check stripe_currency en FAIL', byId('stripe_currency')?.status === 'fail');

  // Configuration saine → ok:true
  await req('POST', '/api/store', { body: { key: 'df_stripe_mode', value: 'test' }, ...A });
  await req('POST', '/api/store', { body: { key: 'df_stripe_currency', value: 'EUR' }, ...A });
  r = await req('GET', '/api/diagnostics/stripe', A);
  doc = r.json || {};
  check('Configuration cohérente → ok:true', doc.ok === true,
    (doc.checks || []).filter(c => c.status === 'fail').map(c => c.id).join(','));

  // Nettoyage : on retire la clé de test (le serveur revient à « non configuré »)
  await req('POST', '/api/store', { body: { key: 'df_stripe_sk', value: '' }, ...A });

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Intégrations sociales (clé protégée) ═══`);
  // ═══════════════════════════════════════════════════════════
  const payload = [{ id: 'tg-test', platform: 'telegram', name: 'Test', connected: true, botToken: 'x' }];
  r = await req('POST', '/api/integrations/social', { body: { integrations: payload }, ...A });
  check('POST /api/integrations/social (auth) → 200', r.status === 200 && r.json?.count === 1, `HTTP ${r.status}`);
  r = await req('GET', '/api/integrations/social', A);
  check('GET /api/integrations/social → données relues', r.status === 200 && Array.isArray(r.json?.integrations) && r.json.integrations[0]?.id === 'tg-test');
  r = await req('POST', '/api/integrations/social', { body: { integrations: 'pas-un-tableau' }, ...A });
  check('POST /api/integrations/social avec un payload invalide → 400', r.status === 400, `HTTP ${r.status}`);
  r = await req('GET', '/api/store/get?key=df_social_integrations_v1', A);
  check('La clé reste protégée via /api/store/get → 403', r.status === 403, `HTTP ${r.status}`);
  r = await req('POST', '/api/store', { body: { key: 'df_social_integrations_v1', value: [] }, ...A });
  check('La clé reste protégée en écriture via /api/store → 403', r.status === 403, `HTTP ${r.status}`);

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Détection + correction sur fixture ═══`);
  // ═══════════════════════════════════════════════════════════
  const tsx = path.join(ROOT, 'node_modules', '.bin', 'tsx');
  const runner = path.join(HERE, 'fixtures', 'doctor', 'fixture-run.ts');
  let fx = null;
  try {
    const out = execFileSync(tsx, [runner], { cwd: ROOT, encoding: 'utf-8', timeout: 120000 });
    fx = JSON.parse(out.trim().split('\n').pop());
  } catch (e) {
    check('Exécution du scénario fixture (tsx)', false, String(e?.message || e).slice(0, 120));
  }
  if (fx) {
    check('Fixture cassée : 3 erreurs détectées (2× 401 + 1 échec silencieux)', fx.initialCount === 3,
      JSON.stringify(fx.initialByRule));
    check('Les 401 sont bien attribués aux endpoints protégés',
      fx.initialFindings.filter(f => f.rule === 'missing_auth').every(f => f.httpStatus === 401));
    check('Chaque erreur détectée propose un correctif automatique',
      fx.initialFindings.every(f => f.autoFix), fx.initialFindings.map(f => f.autoFix).join(','));
    check('Les 3 correctifs sont appliqués', fx.appliedCount === 3, `appliqués=${fx.appliedCount}`);
    check('Re-scan après correctifs → 0 erreur restante', fx.remaining === 0, JSON.stringify(fx.remainingFindings));
    check('Le fichier corrigé reste du TSX valide (esbuild)', fx.parseErrors.length === 0, fx.parseErrors.join(' | '));
    check('Fichiers originaux sauvegardés avant écriture', fx.backups.length === 3, fx.backups.length);
    check('L’import getAuthBearer ajouté est correct', /import \{ getAuthBearer \} from '\.\.\/services\/authToken';/.test(fx.finalSource));
    check('L’en-tête Authorization injecté est conditionnel (pas de Bearer vide)',
      /headers: \{ \.\.\.\(getAuthBearer\(\) \? \{ Authorization: getAuthBearer\(\) \} : \{\}\), 'Content-Type': 'application\/json' \}/.test(fx.finalSource));
    check('La garde res.ok injectée porte le bon endpoint',
      /if \(!res\.ok\) throw new Error\(`HTTP \$\{res\.status\} — \/api\/checkout\/verify-keys`\);/.test(fx.finalSource));
  }

  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══ DOCTEUR DE CODE — Agent Hermes code_doctor (boucle réelle) ═══`);
  // ═══════════════════════════════════════════════════════════
  // Fenêtre IA : 6 req/min → on attend la fin de fenêtre sur 429 (comme les
  // autres suites) pour que ces tests soient rejouables.
  async function chat(prompt, agent = 'code_doctor') {
    let r = await req('POST', '/api/hermes/chat', { body: { prompt, agent }, ...A });
    if (r.status === 429) {
      console.log('   … 429 (quota IA 6/min) — pause 61 s …');
      await new Promise(rs => setTimeout(rs, 61_000));
      r = await req('POST', '/api/hermes/chat', { body: { prompt, agent }, ...A });
    }
    return r;
  }

  r = await chat('Les fonctions Stripe ne fonctionnent pas, diagnostique');
  let steps = (r.json?.steps || []);
  check('« Stripe ne fonctionne pas » → l’agent exécute stripe_doctor',
    steps.some(s => s.tool === 'stripe_doctor' && s.status === 'ok'), steps.map(s => s.tool).join(',') || `HTTP ${r.status}`);

  r = await chat('scanne le code client et liste les erreurs d’intégration API');
  steps = (r.json?.steps || []);
  check('« scanne le code » → l’agent exécute code_scan',
    steps.some(s => s.tool === 'code_scan' && s.status === 'ok'), steps.map(s => s.tool).join(',') || `HTTP ${r.status}`);

  r = await chat('corrige le finding missing_auth-zzz999 dans le code');
  const pending = r.json?.pendingConfirmation;
  check('« corrige le finding » → code_fix exige une confirmation (action non exécutée)',
    (r.json?.steps || []).some(s => s.tool === 'code_fix' && s.status === 'confirmation_required')
    && Boolean(pending?.actionId) && pending?.tool === 'code_fix',
    JSON.stringify(pending || null).slice(0, 100));

  console.log(`\n${failures === 0 ? '🟢 TOUS LES TESTS DOCTEUR DE CODE PASSENT' : `🔴 ${failures} TEST(S) EN ÉCHEC`}\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('Erreur de la suite de tests:', e.message); process.exit(1); });
