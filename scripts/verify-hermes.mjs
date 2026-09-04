/**
 * verify-hermes.mjs — Tests E2E du moteur HERMES v4 (tests uniquement).
 *
 * Prérequis : serveur démarré avec HERMES_PROVIDER=mock (fournisseur
 * déterministe qui teste la boucle complète plan→outils→observation sans
 * réseau ni clé API), base seedée par scripts/start-test-pg.mjs.
 *
 * NB : les rate-limiters sont en mémoire — ne pas lancer cette suite et
 * verify-security.mjs dans la même minute (ou redémarrer le serveur).
 *
 * Usage :
 *   node scripts/verify-hermes.mjs --base http://127.0.0.1:3211 --passcode <code>
 */

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

async function req(method, path, { body, auth, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json';
  if (auth) h['Authorization'] = `Bearer ${auth}`;
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

const A = { auth: PASSCODE };

// Appels IA robustes : si 429 (fenêtre de 60 s encore active), on attend
// la fin de la fenêtre et on réessaie UNE fois. La suite reste rejouable
// à la suite d'une autre exécution.
async function aiPost(path, body) {
  let r = await req('POST', path, { body, ...A });
  if (r.status === 429) {
    console.log('   … 429 (quota IA) — pause 61 s …');
    await new Promise(r2 => setTimeout(r2, 61_000));
    r = await req('POST', path, { body, ...A });
  }
  return r;
}
const aiChat = (prompt, agentId = 'orchestrator') => aiPost('/api/hermes/chat', { prompt, agentId });

// ---- Re-seed idempotent (la suite est rejouable sans réinitialiser la base) ----
async function reseed() {
  const postgres = (await import('postgres')).default;
  const sql = postgres({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'password', database: 'applet' });
  const products = [
    { id: 'prod-test-1', title: 'Guide IA Automatisation', subtitle: 'Automatisez vos tâches avec l\'IA', category: 'IA & Productivité', format: 'guide', status: 'published', pricing: { recommendedPrice: 47, compareAtPrice: 89, discountPercent: 47, isFlashSale: false }, price: 47, salesCount: 12, revenue: 564, rating: 4.9 },
    { id: 'prod-test-2', title: 'Pack 500 Prompts Marketing', subtitle: 'Prompts haute conversion', category: 'IA & Productivité', format: 'prompt_pack', status: 'published', pricing: { recommendedPrice: 29, compareAtPrice: 59, discountPercent: 50, isFlashSale: false }, price: 29, salesCount: 5, revenue: 145, rating: 4.8 },
    { id: 'prod-test-3', title: 'Template SaaS Notion OS', subtitle: 'OS Notion complet pour SaaS', category: 'Templates', format: 'template', status: 'draft', pricing: { recommendedPrice: 67, compareAtPrice: 99, discountPercent: 32, isFlashSale: false }, price: 67, salesCount: 0, revenue: 0, rating: 5.0 }
  ];
  // Remplace le catalogue (supprime au passage les prod-hermes-* des runs précédents)
  await sql`INSERT INTO key_value_store (key, value) VALUES ('dpf_app_v2_products', ${JSON.stringify(products)}::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  await sql.end();
}

(async () => {
  if (!PASSCODE) {
    console.error('Usage: node scripts/verify-hermes.mjs --base <url> --passcode <passcode>');
    process.exit(2);
  }
  await reseed();

  console.log('\n═══ HERMES V4 — État réel & registres ═══');

  let r = await req('GET', '/api/hermes/status');
  check('status → 200 + moteur v5 (pool multi-fournisseurs) + fournisseur mock', r.status === 200 && String(r.json.engine).startsWith('hermes-core-v5') && String(r.json.provider).startsWith('Mock'), JSON.stringify(r.json).slice(0, 140));
  check('status → 25+ skills déclarées', r.json.skillsCount >= 25, `skills=${r.json.skillsCount}`);
  check('status → 10 agents spécialisés', r.json.agentsCount === 10, `agents=${r.json.agentsCount}`);

  r = await req('GET', '/api/hermes/agents');
  const agentIds = (r.json.agents || []).map(a => a.id);
  check('agents → liste avec orchestrator + 9 spécialistes (dont web_explorer et code_doctor)', r.status === 200 && agentIds.includes('orchestrator') && agentIds.includes('web_explorer') && agentIds.includes('code_doctor') && agentIds.length === 10, agentIds.join(','));

  r = await req('GET', '/api/hermes/skills');
  const skillNames = (r.json.skills || []).map(s => s.name);
  check('skills → registre complet (catalogue, pricing, contenu, canaux, ventes, système, internet)', ['catalog_create', 'catalog_set_price', 'catalog_delete', 'publish_product', 'pricing_audit', 'content_create', 'seo_update', 'channels_dispatch', 'metrics_summary', 'orders_recent', 'audit_system', 'kv_set', 'dispatch_agent', 'web_search', 'web_fetch', 'web_link_check', 'free_tier_lookup', 'free_llm_lookup', 'providers_list', 'providers_add', 'providers_remove', 'providers_test'].every(s => skillNames.includes(s)), `${skillNames.length} skills`);

  console.log('\n═══ HERMES V4 — Sécurité ═══');

  r = await req('POST', '/api/hermes/chat', { body: { prompt: 'test' } });
  check('chat SANS auth → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/hermes/confirm', { body: { actionId: 'abc' }, ...A });
  check('confirm avec actionId invalide → 400', r.status === 400, `HTTP ${r.status}`);

  console.log('\n═══ HERMES V4 — Boucle agent réelle (plan → outils → observation) ═══');

  // H1 : re-pricing réel via tool calling
  r = await aiChat('Change le prix de prod-test-1 à 39 €');
  check('chat re-pricing → réponse + étapes d\u2019outils', r.status === 200 && Array.isArray(r.json.steps) && r.json.steps.some(s => s.tool === 'catalog_set_price' && s.status === 'ok'), JSON.stringify(r.json.steps || []).slice(0, 160));
  let store = await req('GET', '/api/store');
  let prods = (store.json || []).filter(x => x.key === 'dpf_app_v2_products');
  let price1 = prods[0]?.value?.find(p => p.id === 'prod-test-1')?.pricing?.recommendedPrice;
  check('BOUTIQUE RÉELLEMENT MODIFIÉE : prod-test-1 à 39 €', price1 === 39, `prix=${price1}`);

  // H2 : suppression → confirmation obligatoire
  r = await aiChat('Supprime prod-test-3');
  check('suppression → demande de confirmation (pas d\u2019exécution)', r.status === 200 && r.json.pendingConfirmation && r.json.pendingConfirmation.tool === 'catalog_delete', JSON.stringify(r.json.pendingConfirmation || {}).slice(0, 120));
  store = await req('GET', '/api/store');
  prods = (store.json || []).filter(x => x.key === 'dpf_app_v2_products');
  check('produit TOUTESFOIS PRÉSENT (non supprimé sans confirmation)', prods[0]?.value?.some(p => p.id === 'prod-test-3'));

  // H3 : confirmation explicite → exécution
  const actionId = r.json?.pendingConfirmation?.actionId;
  r = await req('POST', '/api/hermes/confirm', { body: { actionId }, ...A });
  check('confirmation → exécution de la suppression', r.status === 200 && r.json.confirmed === true, `HTTP ${r.status}`);
  store = await req('GET', '/api/store');
  prods = (store.json || []).filter(x => x.key === 'dpf_app_v2_products');
  check('produit RÉELLEMENT SUPPRIMÉ après confirmation', !prods[0]?.value?.some(p => p.id === 'prod-test-3'));

  // H4 : création de produit réel (draft)
  r = await aiChat('Crée un produit « Test Kit Hermes » à 19.90 €');
  check('création → outil catalog_create exécuté', r.status === 200 && r.json.steps.some(s => s.tool === 'catalog_create' && s.status === 'ok'), JSON.stringify(r.json.steps || []).slice(0, 140));
  store = await req('GET', '/api/store');
  prods = (store.json || []).filter(x => x.key === 'dpf_app_v2_products');
  const newProd = prods[0]?.value?.find(p => p.id?.startsWith('prod-hermes-'));
  check('produit RÉELLEMENT CRÉÉ (statut draft, prix 19.90)', newProd && newProd.status === 'draft' && newProd.pricing?.recommendedPrice === 19.9, newProd ? `${newProd.id} ${newProd.status} ${newProd.pricing?.recommendedPrice}` : 'introuvable');

  console.log('\n═══ HERMES V4 — RGPD : aucune PII au LLM ═══');

  r = await aiChat('Fais un audit global de la fabrique');
  const auditResponse = r.json?.response || '';
  check('audit exécuté via outil réel', r.status === 200 && r.json.steps.some(s => s.tool === 'audit_system' && s.status === 'ok'));
  check('réponse SANS e-mail client (PII filtrée)', !auditResponse.includes('jeanne.dupont@example.com') && !auditResponse.includes('paul.martin@example.com'));
  check('réponse SANS noms de clients', !auditResponse.includes('Jeanne Dupont') && !auditResponse.includes('Paul Martin'));

  // Journal d'audit des actions
  r = await req('GET', '/api/hermes/activity', A);
  const toolsLogged = (r.json.activity || []).map(a => a.tool);
  check('journal d\u2019audit : actions outillées tracées', r.status === 200 && toolsLogged.includes('catalog_set_price') && toolsLogged.includes('catalog_delete') && toolsLogged.includes('catalog_create'), toolsLogged.slice(0, 6).join(','));

  console.log('\n═══ HERMES V4 — Agent Internet (web_explorer) ═══');

  // I1 : base de connaissances gratuite (offline, déterministe)
  r = await aiChat('Quels outils gratuits pour héberger mon application ?', 'web_explorer');
  const kbStep = (r.json.steps || []).find(s => s.tool === 'free_tier_lookup');
  check('free_tier_lookup → skill exécutée', r.status === 200 && kbStep && kbStep.status === 'ok', JSON.stringify(kbStep || {}).slice(0, 120));
  check('réponse KB → services réels listés (Render/Vercel/Netlify…)', (r.json.response || '').includes('free-for.dev') || /Render|Vercel|Netlify|Cloudflare/i.test(r.json.response || ''), (r.json.response || '').slice(0, 100).replace(/\n/g, ' '));

  // I1b : base des API LLM gratuites (offline, déterministe)
  r = await aiChat('Quelle API LLM gratuite me recommandes-tu ?', 'web_explorer');
  const llmStep = (r.json.steps || []).find(s => s.tool === 'free_llm_lookup');
  check('free_llm_lookup → skill exécutée', r.status === 200 && llmStep && llmStep.status === 'ok', JSON.stringify(llmStep || {}).slice(0, 120));
  check('réponse KB LLM → providers réels (Groq/OpenRouter/Gemini…)', /awesome-free-llm-apis|Groq|OpenRouter|Gemini|Mistral/i.test(r.json.response || ''), (r.json.response || '').slice(0, 100).replace(/\n/g, ' '));

  // I2 : lecture d'une page réelle (host autorisé dans le sandbox : npmjs)
  r = await aiChat('Lis la page https://registry.npmjs.org/ et dis-moi ce que c\'est', 'web_explorer');
  const fetchStep = (r.json.steps || []).find(s => s.tool === 'web_fetch');
  check('web_fetch → lecture de page réelle', r.status === 200 && fetchStep && (fetchStep.status === 'ok' || /timeout|indisponible|réseau/i.test(fetchStep.summary || r.json.response || '')), JSON.stringify(fetchStep || {}).slice(0, 120));

  // I3 : recherche web (si le sandbox bloque l'egress → échec HONNÊTE, jamais inventé)
  r = await aiChat('Cherche sur internet les tendances des produits digitaux 2026', 'web_explorer');
  const searchStep = (r.json.steps || []).find(s => s.tool === 'web_search');
  const searchHonest = searchStep && (searchStep.status === 'ok' || /échec|error|indisponible|timeout|réseau|bloqu|failed/i.test(JSON.stringify(searchStep)));
  check('web_search → exécutée OU échec réseau signalé honnêtement (sandbox)', r.status === 200 && searchHonest, JSON.stringify(searchStep || {}).slice(0, 120));
  check('web_search → jamais de résultat inventé en cas d\'échec', !(searchStep && searchStep.status !== 'ok' && /résultat.*trouvé|source :.*https/i.test(r.json.response || '')), (r.json.response || '').slice(0, 80).replace(/\n/g, ' '));

  console.log('\n═══ HERMES V4 — Cycle autonome & multi-agents ═══');

  r = await aiPost('/api/hermes/autonomous-loop', {});
  check('cycle autonome → insight réel (agent security_auditor)', r.status === 200 && r.json.success === true && typeof r.json.insight === 'string' && r.json.insight.length > 30, (r.json.insight || '').slice(0, 80).replace(/\n/g, ' '));

  r = await req('POST', '/api/agents/synergy', { body: { prompt: 'Analyse mes ventes et propose une action' } });
  check('synergy SANS auth → 401 (régression phase 1)', r.status === 401, `HTTP ${r.status}`);
  r = await req('POST', '/api/obliteratus/ablate', { body: { modelName: 'x' } });
  check('module OBLITERATUS factice retiré → 410 Gone', r.status === 410, `HTTP ${r.status}`);

  console.log('\n═══ HERMES V5 — Gestionnaire d\u2019API & tokens (pool multi-fournisseurs, jamais bloqué) ═══');

  // P1 : endpoints protégés
  r = await req('GET', '/api/hermes/providers');
  check('providers SANS auth → 401', r.status === 401, `HTTP ${r.status}`);
  r = await req('GET', '/api/hermes/providers', A);
  check('providers (auth) → 200 + pool ≥1 + aucune clé en clair', r.status === 200 && Array.isArray(r.json.pool) && r.json.pool.length >= 1 && !/sk-|ghp_|api[_-]?key.{0,4}["']\s*:\s*["'][A-Za-z0-9]{12,}/i.test(r.text), `pool=${(r.json.pool || []).map(e => e.name).join(',')}`);

  // P2 : ajout d'un fournisseur cassé (priorité 1) + clé masquée dans la réponse
  r = await req('POST', '/api/hermes/providers', { body: { name: 'test-broken', kind: 'openai', model: 'fake-1', baseUrl: 'https://registry.npmjs.org/v1', apiKey: 'sk-fake-test-1234567890abcdef', priority: 1 }, ...A });
  check('ajout fournisseur (baseUrl https, prio 1) → 200', r.status === 200 && r.json.added === true, `HTTP ${r.status}`);
  check('clé JAMAIS en clair dans la réponse (masquée)', r.status === 200 && !r.text.includes('sk-fake-test-1234567890abcdef') && /•|masqu|\(\d+ car\.\)/.test(r.text), r.text.slice(0, 120));

  // P3 : test de connexion → échec HONNÊTE (404 npmjs), pas de faux succès
  r = await req('POST', '/api/hermes/providers/test-broken/test', A);
  check('test du fournisseur cassé → ok:false + erreur réelle', r.status === 200 && r.json.ok === false && /404|HTTP|erreur|indispo/i.test(r.json.error || ''), JSON.stringify(r.json).slice(0, 120));

  // P4 : BASCULE AUTOMATIQUE — chat malgré le fournisseur cassé en priorité 1
  r = await aiChat('statut');
  const fallbackOk = r.status === 200 && String(r.json.provider || '').startsWith('Mock');
  check('chat RÉUSSIT via bascule automatique (cassé → mock) — jamais bloqué', fallbackOk && r.json.steps.some(s => s.tool === 'audit_system' && s.status === 'ok'), `provider=${r.json?.provider}`);
  r = await req('GET', '/api/hermes/providers', A);
  const brokenStat = (r.json.pool || []).find(e => e.name === 'test-broken');
  check('fournisseur cassé → cooldown + erreur tracée (stats transparentes)', brokenStat && brokenStat.errors >= 1 && brokenStat.inCooldown === true, JSON.stringify(brokenStat || {}).slice(0, 120));

  // P5 : rejets de validation (SSRF, clé manquante, nom invalide)
  r = await req('POST', '/api/hermes/providers', { body: { name: 'bad-ssrf', kind: 'openai', model: 'x', baseUrl: 'http://192.168.1.10/v1' }, ...A });
  check('SSRF : baseUrl privée http 192.168.x → 400', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/hermes/providers', { body: { name: 'bad-meta', kind: 'openai', model: 'x', baseUrl: 'https://metadata.google.internal/' }, ...A });
  check('SSRF : metadata cloud → 400', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/hermes/providers', { body: { name: 'no-key', kind: 'gemini', model: 'gemini-2.5-flash' }, ...A });
  check('gemini sans apiKey → 400', r.status === 400, `HTTP ${r.status}`);
  r = await req('POST', '/api/hermes/providers', { body: { name: 'X', kind: 'openai' }, ...A });
  check('nom invalide → 400', r.status === 400, `HTTP ${r.status}`);

  // P6 : exception Ollama (http loopback local déclaré)
  r = await req('POST', '/api/hermes/providers', { body: { name: 'ollama-local', kind: 'openai', model: 'llama3.1', baseUrl: 'http://localhost:11434/v1', local: true, priority: 5 }, ...A });
  check('Ollama local (http + local:true) → accepté', r.status === 200, `HTTP ${r.status}`);
  r = await req('POST', '/api/hermes/providers', { body: { name: 'ollama-nolocal', kind: 'openai', model: 'llama3.1', baseUrl: 'http://localhost:11434/v1' }, ...A });
  check('http localhost SANS local:true → 400 (exception explicite)', r.status === 400, `HTTP ${r.status}`);

  // P7 : la clé du pool est PROTÉGÉE de /api/store (lecture ET écriture, même auth)
  r = await req('GET', '/api/store');
  check('/api/store : clé pool absente de la liste publique', r.status === 200 && !(r.json || []).some(k => k.key === 'df_hermes_provider_pool'));
  r = await req('GET', '/api/store/get?key=df_hermes_provider_pool', { auth: PASSCODE });
  check('/api/store/get (auth) de la clé pool → 403', r.status === 403, `HTTP ${r.status}`);
  r = await req('POST', '/api/store', { body: { key: 'df_hermes_provider_pool', value: 'HACKED' }, auth: PASSCODE });
  check('écriture (auth) de la clé pool via /api/store → 403', r.status === 403, `HTTP ${r.status}`);

  // P8 : HERMES GÈRE LE POOL LUI-MÊME (skills) — « ajoute… » / « liste… » / « supprime… »
  r = await aiChat('liste les fournisseurs');
  const listStep = (r.json.steps || []).find(s => s.tool === 'providers_list');
  check('chat « liste les fournisseurs » → skill providers_list', r.status === 200 && listStep && listStep.status === 'ok', JSON.stringify(listStep || {}).slice(0, 120));
  r = await aiChat('ajoute groq au pool: baseUrl https://api.groq.com/openai/v1 modèle: llama-3.3-70b-versatile clé: sk-groq-suite-123456789');
  const addStep = (r.json.steps || []).find(s => s.tool === 'providers_add');
  check('chat « ajoute groq au pool » → skill providers_add exécutée', r.status === 200 && addStep && addStep.status === 'ok', JSON.stringify(addStep || {}).slice(0, 140));
  r = await req('GET', '/api/hermes/activity', A);
  const addAudit = (r.json.activity || []).find(a => a.tool === 'providers_add');
  check('audit : apiKey du providers_add MASQUÉE (jamais en clair)', addAudit && !String(addAudit.args || '').includes('sk-groq-suite-123456789') && /•/.test(String(addAudit.args || '')), String(addAudit?.args || '').slice(0, 120));
  r = await aiChat('supprime le fournisseur groq');
  const rmStep = (r.json.steps || []).find(s => s.tool === 'providers_remove');
  check('chat « supprime le fournisseur groq » → skill providers_remove', r.status === 200 && rmStep && rmStep.status === 'ok', JSON.stringify(rmStep || {}).slice(0, 120));

  // P9 : nettoyage — retour au pool minimal (mock-env seul)
  r = await req('DELETE', '/api/hermes/providers/test-broken', A);
  check('retrait du fournisseur cassé (DELETE) → ok', r.status === 200 && r.json.removed === 'test-broken', `HTTP ${r.status}`);
  r = await req('DELETE', '/api/hermes/providers/ollama-local', A);
  check('retrait du fournisseur Ollama (DELETE) → ok', r.status === 200 && r.json.removed === 'ollama-local', `HTTP ${r.status}`);
  r = await req('GET', '/api/hermes/providers', A);
  check('pool final → mock-env seul (filet de sécurité)', r.status === 200 && (r.json.pool || []).map(e => e.name).join(',') === 'mock-env', (r.json.pool || []).map(e => e.name).join(','));

  console.log('\n═══ HERMES V4 — Rate limiting IA ═══');
  // 5 appels IA déjà consommés (H1,H2,H3? non confirm n'est pas IA, H4, audit, autonome)
  let limited = false;
  for (let i = 0; i < 6; i++) {
    const rr = await req('POST', '/api/hermes/chat', { body: { prompt: 'statut' }, ...A });
    if (rr.status === 429) { limited = true; break; }
  }
  check('chat rate-limité (429 après quota IA)', limited);

  console.log(`\n${failures === 0 ? '🟢 TOUS LES TESTS HERMES PASSENT' : `🔴 ${failures} TEST(S) HERMES EN ÉCHEC`}\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('Erreur de la suite Hermes:', e.message); process.exit(1); });
