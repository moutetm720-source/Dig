#!/usr/bin/env node
/**
 * verify-capabilities.mjs — Vérification RÉELLE des capacités « agent évolutif » d'Hermes.
 *
 * Contrairement à verify-providers.mjs (transport, stubs), ce script exécute les
 * compétences pour de vrai quand le réseau le permet :
 *   - code_read / code_write : lecture + implantation réelle de fichier (backup vérifié)
 *   - refus de sécurité : traversée ../, .env, node_modules, references/, taille max
 *   - repo_clone / repo_files / repo_remove : clone GitHub LIVE (petit repo public),
 *     listing + lecture + suppression réels
 *   - memory_search : mémoire réellement consultable (KV)
 *   - skills custom : installation à chaud + EXÉCUTION webhook réelle contre un
 *     stub local (POST avec confirmation, GET sans), refus (nom builtin, loopback
 *     non déclaré, method invalide), retrait
 *   - parseurs DuckDuckGo (html + lite) sur fixtures réalistes
 *   - registre : getAllSkills() inclut les customs ; AUTONOMY_SAFE_SKILLS les exclut
 *
 * Prérequis : Postgres de test démarré (node scripts/start-test-pg.mjs) — les
 * skills lisent/écrivent la KV. Lancez avec tsx :
 *   DB_HOST=127.0.0.1 ./node_modules/.bin/tsx scripts/verify-capabilities.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_NAME = process.env.DB_NAME || 'applet';

const { getSkill, getAllSkills, declareSkills, AUTONOMY_SAFE_SKILLS, parseDdgHtmlResults, parseDdgLiteResults, resolveProjectFile, skillRegistry } = await import('../hermes/tools.js');
const { kvSet, kvGet, ensureCustomSkillsLoaded } = await import('../hermes/tools.js');
const { installCustomSkill, removeCustomSkill, listCustomSkillSpecs, recentMemories } = await import('../hermes/extendSkills.js');

const CTX = { actor: 'test-capabilities', agentId: 'orchestrator', conversation: 'verify-capabilities' };
let passed = 0, failed = 0;
const ok = (n) => { passed++; console.log(`  ✅ ${n}`); };
const ko = (n, e) => { failed++; console.error(`  ❌ ${n}\n     ${String(e?.message || e).split('\n').slice(0, 3).join('\n     ')}`); };
async function test(name, fn) {
  process.stdout.write(`\n▶ ${name}\n`);
  try { await fn(); ok(name); } catch (e) { ko(name, e); }
}
const refuses = async (name, fn, motif) => {
  try { await fn(); throw new Error(`devait être refusé (${motif})`); }
  catch (e) { assert.match(String(e.message), new RegExp(motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `message inattendu : ${e.message}`); }
};

// ---- Stub webhook local (endpoint du skill custom, loopback déclaré) ----
let lastStubBody = null;
const stub = http.createServer((req, res) => {
  let b = '';
  req.on('data', c => { b += c; });
  req.on('end', () => {
    lastStubBody = b;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ echo: true, method: req.method, received: b ? JSON.parse(b) : null, query: req.url }));
  });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));
const STUB = `http://127.0.0.1:${stub.address().port}`;

// ═══ Tests ═══

await test('registre : 9 nouveaux skills builtin présents', async () => {
  const names = ['memory_search', 'code_read', 'code_write', 'repo_clone', 'repo_files', 'repo_remove', 'skills_custom_list', 'skills_custom_install', 'skills_custom_remove'];
  for (const n of names) assert.ok(getSkill(n), `skill manquant : ${n}`);
});

await test('code_read : lit un fichier réel du projet', async () => {
  const r = await getSkill('code_read').run({ file: 'package.json', maxChars: 2000 }, CTX);
  assert.match(r.content, /"name"/, 'contenu package.json attendu');
  assert.equal(r.file, 'package.json');
});

await test('code_read : refus (traversée, .env, node_modules, references/)', async () => {
  await refuses('traversée', () => getSkill('code_read').run({ file: '../outside.txt' }, CTX), 'interdit');
  await refuses('env', () => getSkill('code_read').run({ file: '.env' }, CTX), 'interdits');
  await refuses('node_modules', () => getSkill('code_read').run({ file: 'node_modules/x/index.js' }, CTX), 'interdit');
  await refuses('references', () => getSkill('code_read').run({ file: 'references/x/README.md' }, CTX), 'interdit');
});

await test('code_write : implantation RÉELLE avec backup + refus hors périmètre', async () => {
  const target = 'scripts/_cap_test_file.txt';
  const r1 = await getSkill('code_write').run({ file: target, content: 'v1 — implanté par verify-capabilities', confirm: true }, CTX);
  assert.equal(r1.written, true);
  assert.equal(r1.created, true);
  assert.ok(fs.existsSync(path.resolve('scripts/_cap_test_file.txt')), 'fichier présent sur disque');

  const r2 = await getSkill('code_write').run({ file: target, content: 'v2 — réécriture (backup attendu)', confirm: true }, CTX);
  assert.equal(r2.created, false);
  assert.ok(r2.backup, 'backup du v1 attendu');
  assert.match(fs.readFileSync(r2.backup, 'utf-8'), /v1/, 'le backup contient bien l’ancien contenu');
  assert.match(fs.readFileSync(target, 'utf-8'), /v2/, 'le fichier contient le nouveau contenu');

  // code_read relit ce que code_write a implanté (boucle complète)
  const r3 = await getSkill('code_read').run({ file: target }, CTX);
  assert.match(r3.content, /v2/);

  // refus
  try {
    await refuses('env', () => getSkill('code_write').run({ file: '.env.local', content: 'x', confirm: true }, CTX), 'interdits');
    await refuses('hors périmètre', () => getSkill('code_write').run({ file: 'assets/payload.txt', content: 'x', confirm: true }, CTX), 'limité');
    await refuses('trop gros', () => getSkill('code_write').run({ file: target, content: 'x'.repeat(65 * 1024 + 1), confirm: true }, CTX), 'volumineux');
  } finally {
    if (fs.existsSync(target)) fs.rmSync(target); // nettoyage (backups dans .dig-doctor/, gitignoré)
  }
});

await test('repo_clone → repo_files → repo_remove : cycle RÉEL sur GitHub (live)', async () => {
  // LIVE : on tente le clone directement (le spawn git peut passer même quand
  // le fetch Node est filtré par un proxy TLS d'entreprise).
  const name = 'octocat__Hello-World';
  try { await getSkill('repo_remove').run({ name, confirm: true }, CTX); } catch {}
  let c;
  try {
    c = await getSkill('repo_clone').run({ url: 'https://github.com/octocat/Hello-World', confirm: true }, CTX);
  } catch (e) {
    console.log(`     ⚠️ clone live impossible depuis cet environnement (${String(e.message).slice(0, 80)}) — test live skippé (aucun échec)`);
    return;
  }
  assert.equal(c.cloned, true);
  assert.ok(c.files >= 1, `au moins 1 fichier attendu (${c.files})`);

  const list = await getSkill('repo_files').run({ name }, CTX);
  assert.ok(list.files.includes('README'), 'README attendu dans le clone');

  const rd = await getSkill('repo_files').run({ name, file: 'README' }, CTX);
  assert.match(rd.content, /Hello World/i, 'contenu du README lu réellement');

  const grep = await getSkill('repo_files').run({ name, search: 'hello' }, CTX);
  assert.ok(grep.matches >= 1, 'grep trouve au moins 1 match');

  await refuses('traversée', () => getSkill('repo_files').run({ name, file: '../../hermes/engine.ts' }, CTX), 'hors du clone');

  const rm = await getSkill('repo_remove').run({ name, confirm: true }, CTX);
  assert.equal(rm.removed, name);
  assert.ok(!fs.existsSync(path.resolve('references/_clones', name)), 'répertoire supprimé du disque');
});

await test('memory_search : mémoire réelle consultable (apprentissage)', async () => {
  const key = 'df_hermes_memories';
  const before = (await kvGet(key)) || [];
  const testEntry = { at: new Date().toISOString(), agent: 'orchestrator', prompt: 'test-capabilities : décision prix kit SEO à 39 euros', tools: ['memory_search'], response: 'Décision mémorisée pour le test verify-capabilities.' };
  await kvSet(key, [testEntry, ...before].slice(0, 50));
  try {
    const r = await getSkill('memory_search').run({ query: 'kit SEO' }, CTX);
    assert.ok(r.matches >= 1, 'au moins 1 souvenir trouvé');
    assert.match(r.memories[0].prompt, /kit SEO/);
    const rec = await recentMemories('orchestrator', 3);
    assert.ok(rec.length >= 1, 'recentMemories renvoie les derniers échanges');
  } finally {
    await kvSet(key, before); // nettoyage : la mémoire de test n'est pas conservée
  }
});

await test('skills custom : installation à chaud + exécution webhook RÉELLE (POST confirmé, GET lecture)', async () => {
  // idempotence : purge d'un éventuel résidu d'un run précédent
  for (const n of ['echo_cap_test', 'ping_cap_test', 'sneaky', 'bad_method']) {
    try { await removeCustomSkill(n); } catch {}
  }
  await ensureCustomSkillsLoaded();
  const builtinCount = getAllSkills().length;

  // POST : exige la confirmation par design (requiresConfirmation:true)
  const inst = await installCustomSkill({
    spec: { name: 'echo_cap_test', description: 'Echo de test (verify-capabilities)', url: `${STUB}/echo`, method: 'POST', parameters: { type: 'object', properties: { hello: { type: 'string' } } } },
    local: true, actor: CTX.actor, reservedNames: skillRegistry.map(s => s.name)
  });
  assert.equal(inst.name, 'echo_cap_test');
  assert.ok(getAllSkills().length === builtinCount + 1, 'le skill custom entre dans le registre immédiatement');
  const tool = getSkill('echo_cap_test');
  assert.ok(tool, 'skill visible via getSkill');
  assert.equal(tool.requiresConfirmation, true, 'POST → confirmation requise');
  const exec = await tool.run({ hello: 'world' }, CTX);
  assert.equal(exec.ok, true);
  assert.deepEqual(exec.response.received, { hello: 'world' }, 'le stub a reçu les args en JSON');

  // GET : lecture, sans confirmation
  await installCustomSkill({
    spec: { name: 'ping_cap_test', description: 'Ping lecture (verify-capabilities)', url: `${STUB}/ping`, method: 'GET' },
    local: true, actor: CTX.actor, reservedNames: skillRegistry.map(s => s.name)
  });
  const g = getSkill('ping_cap_test');
  assert.equal(g.requiresConfirmation, false, 'GET → pas de confirmation');
  const gexec = await g.run({}, CTX);
  assert.equal(gexec.response.method, 'GET');

  // declareSkills les expose ; l'autonomie les exclut
  assert.ok(declareSkills().some(t => t.name === 'echo_cap_test'), 'déclaré au LLM');
  assert.ok(!AUTONOMY_SAFE_SKILLS.includes('echo_cap_test'), 'jamais en autonomie');

  // refus
  await refuses('nom builtin', () => installCustomSkill({ spec: { name: 'catalog_list', description: 'x', url: `${STUB}/x`, method: 'GET' }, local: true, actor: 't', reservedNames: getAllSkills().filter(t => !t.name.includes('_cap_test')).map(s => s.name) }), 'réservé');
  await refuses('loopback non déclaré', () => installCustomSkill({ spec: { name: 'sneaky', description: 'x', url: `${STUB}/x`, method: 'GET' }, actor: 't', reservedNames: [] }), 'http non autorisé');
  await refuses('method', () => installCustomSkill({ spec: { name: 'bad_method', description: 'x', url: 'https://example.com', method: 'DELETE' }, actor: 't', reservedNames: [] }), 'method');

  // retrait
  await removeCustomSkill('echo_cap_test');
  await removeCustomSkill('ping_cap_test');
  assert.ok(!getSkill('echo_cap_test'), 'skill retiré du registre');
  assert.equal((await listCustomSkillSpecs()).length, 0, 'KV vidée des skills de test');
});

await test('parseurs DuckDuckGo (html + lite) sur fixtures réalistes', async () => {
  const htmlFixture = `<div class="result results_links">
    <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage1&amp;rut=abc">Résultat Un</a>
    <a class="result__snippet" href="#">Extrait du premier résultat de test</a></div>
    <div class="result">
    <a rel="nofollow" class="result__a" href="https://direct.example.org/page2">Résultat Deux</a>
    <a class="result__snippet" href="#">Second extrait</a></div>`;
  const r1 = parseDdgHtmlResults(htmlFixture, 5);
  assert.equal(r1.length, 2);
  assert.equal(r1[0].url, 'https://example.com/page1', 'lien uddg décodé');
  assert.match(r1[1].title, /Résultat Deux/);

  const liteFixture = `<table><tr><td>1.</td></tr>
    <tr><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Flite.example.net%2Fa&amp;rut=x" class="result-link">Lite Un</a></td></tr>
    <tr><td class="result-snippet">Snippet lite un</td></tr>
    <tr><td><a rel="nofollow" href="https://direct-lite.example.net/b" class="result-link">Lite Deux</a></td></tr>
    <tr><td class="result-snippet">Snippet lite deux</td></tr></table>`;
  const r2 = parseDdgLiteResults(liteFixture, 5);
  assert.equal(r2.length, 2);
  assert.equal(r2[0].url, 'https://lite.example.net/a');
  assert.match(r2[1].snippet, /Snippet lite deux/);
});

await test('resolveProjectFile : garde-fous unitaires', async () => {
  assert.equal(resolveProjectFile('src/app.ts', false).rel, 'src/app.ts');
  await refuses('absolu', () => resolveProjectFile('/etc/passwd', false), 'absolu');
  await refuses('remontée', () => resolveProjectFile('src/../../x', false), 'interdits');
  await refuses('verrou', () => resolveProjectFile('package-lock.json', true), 'verrous');
  await refuses('write racine ok / write subdir non listé', () => resolveProjectFile('assets/x.txt', true), 'limité');
  assert.equal(resolveProjectFile('README.md', true).rel, 'README.md', 'fichier racine autorisé en écriture');
});

// ---- Bilan ----
stub.close();
console.log(`\n${'═'.repeat(60)}\n${failed === 0 ? '✅' : '❌'} verify-capabilities : ${passed} réussi(s), ${failed} échec(s)\n${'═'.repeat(60)}`);
process.exit(failed === 0 ? 0 : 1);
