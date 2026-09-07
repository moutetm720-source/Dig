#!/usr/bin/env node
/**
 * verify-providers.mjs — Tests de TRANSPORT de la couche fournisseurs Hermes.
 *
 * ⚠️ Ces tests n'utilisent AUCUNE IA simulée côté produit : ils vérifient la
 * MÉCANIQUE (bascule de modèle Gemini sur 404 « déprécié », erreurs réseau
 * explicites, passage de clé) contre des stubs HTTP LOCAUX labellisés TEST.
 * Ils complètent scripts/verify-hermes.mjs (E2E, fournisseur réel requis).
 *
 * Lancement : ./node_modules/.bin/tsx scripts/verify-providers.mjs
 * (sortie 0 = succès ; compteur d'échecs sinon)
 *
 * Couverture :
 *   1. GeminiProvider : 404 « no longer available » → repli automatique sur le
 *      premier modèle dispo (GEMINI_MODEL_FALLBACKS) + mémorisation (plus de
 *      404 en rafale au 2e appel) — le bug initial du ticket :
 *      « This model models/gemini-2.5-flash is no longer available to new users ».
 *   2. GeminiProvider : tous les modèles en 404 → erreur agrégée explicite.
 *   3. OpenAICompatProvider : endpoint local éteint → erreur contenant l'URL,
 *      la cause réseau (ECONNREFUSED) et l'indice de réparation.
 *   4. OpenAICompatProvider : la clé apiKey DU POOL est bien envoyée
 *      (régression : seule HERMES_OPENAI_API_KEY était lue → 401 Groq/OpenRouter).
 *   5. OpenAICompatProvider : parsing des tool_calls (function calling).
 *   6. CASCADE DE MODÈLES intra-fournisseur (OpenRouter :free) : 404 « No
 *      endpoints found » / 429 / 5xx / réponse vide → modèle suivant DANS LE
 *      MÊME APPEL ; cooldown par modèle ; 401 et limite journalière de clé →
 *      arrêt immédiat ; modèle réellement servi (routeur openrouter/free) exposé.
 */
import http from 'node:http';
import assert from 'node:assert';

// ---- Environnement de test AVANT l'import des modules testés ----
process.env.GEMINI_API_KEY = 'test-key-local-stub';
delete process.env.HERMES_OPENAI_API_KEY;
delete process.env.HERMES_GEMINI_MODEL;
delete process.env.HERMES_OPENAI_BASE_URL;

const { GeminiProvider, OpenAICompatProvider, GEMINI_MODEL_FALLBACKS, geminiModelChain, openRouterFreeCascade, classifyFailure, modelCooldownRemainingMs, clearModelCooldowns } = await import('../hermes/providers.js');
const { DEFAULT_HERMES_CONFIG, OPENROUTER_FREE_CASCADE, HERMES_POOL } = await import('../hermes/types.js');
const { providerCostPolicy } = await import('../hermes/providerPolicy.js');

let passed = 0, failed = 0;
const ok = (name) => { passed++; console.log(`  ✅ ${name}`); };
const ko = (name, e) => { failed++; console.error(`  ❌ ${name}\n     ${String(e?.message || e).split('\n').slice(0, 4).join('\n     ')}`); };
async function test(name, fn) {
  process.stdout.write(`\n▶ ${name}\n`);
  try { await fn(); ok(name); } catch (e) { ko(name, e); }
}

// ---- Stub Gemini (API generateContent, format Google réel) ----
const geminiHits = [];
let geminiResponse = null;
let geminiRequest = null;
let geminiAllDead = false; // bascule : tue tous les modèles (test « aucun modèle »)
const geminiStub = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    geminiRequest = body ? JSON.parse(body) : null;
    const m = /\/models\/([^:]+):generateContent/.exec(req.url || '');
    const model = m ? m[1] : '?';
    geminiHits.push(model);
    if (geminiAllDead || model === 'gemini-2.5-flash' || model === 'gemini-2.5-pro') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: 404,
          message: `This model models/${model} is no longer available to new users. Please update your code to use a newer model for the latest features and improvements.`,
          status: 'NOT_FOUND'
        }
      }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(geminiResponse || {
      candidates: [{ content: { parts: [{ text: `réponse-réelle-de-${model}` }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 }
    }));
  });
});

// ---- Stub OpenAI-compatible ----
let openaiAuthHeader = null;
let openaiResponse = null;
const openaiHits = [];          // modèles demandés (body.model), dans l'ordre
let openaiByModel = null;       // (model) => { status, headers?, body } | null  → scénario de cascade
const openaiStub = http.createServer((req, res) => {
  openaiAuthHeader = req.headers['authorization'] || null;
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    let parsed = {};
    try { parsed = body ? JSON.parse(body) : {}; } catch { /* corps vide */ }
    openaiHits.push(parsed.model);
    const scripted = openaiByModel ? openaiByModel(parsed.model, parsed) : null;
    if (scripted) {
      res.writeHead(scripted.status, { 'content-type': 'application/json', ...(scripted.headers || {}) });
      res.end(JSON.stringify(scripted.body));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(openaiResponse || {
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            id: 'call_0', type: 'function',
            function: { name: 'catalog_list', arguments: '{"limit":3}' }
          }]
        }
      }]
    }));
  });
});

await new Promise(r => geminiStub.listen(0, '127.0.0.1', r));
await new Promise(r => openaiStub.listen(0, '127.0.0.1', r));
const geminiPort = geminiStub.address().port;
const openaiPort = openaiStub.address().port;
process.env.GEMINI_BASE_URL = `http://127.0.0.1:${geminiPort}`; // lu à la création du client

const EVENTS = [{ type: 'text', role: 'user', text: 'Bonjour' }];
const TOOLS = [{ name: 'catalog_list', description: 'Liste les produits', parameters: { type: 'object', properties: { limit: { type: 'number' } } } }];

// ---- Tests ----

await test('constantes : défaut gemini-3.5-flash-lite + chaîne de repli', () => {
  assert.equal(DEFAULT_HERMES_CONFIG.geminiModel, 'gemini-3.5-flash-lite', 'le défaut doit être le remplaçant recommandé');
  assert.ok(GEMINI_MODEL_FALLBACKS.includes('gemini-3.5-flash-lite'));
  assert.ok(GEMINI_MODEL_FALLBACKS.includes('gemini-2.5-flash'), 'les anciennes clés peuvent encore utiliser 2.5-flash (arrêt 20/10/2026)');
  assert.ok(geminiModelChain('x').length >= 4);
});

await test('Gemini : 404 « no longer available » → repli automatique + mémorisation', async () => {
  const p = new GeminiProvider('gemini-2.5-flash'); // modèle déprécié pour les nouvelles clés
  geminiHits.length = 0;
  const r1 = await p.chat({ system: 'test', events: EVENTS, tools: [] });
  assert.match(r1.text || '', /réponse-réelle-de-gemini-3\.5-flash-lite/, 'doit répondre via le 1er modèle de repli');
  assert.equal(p.effectiveModel, 'gemini-3.5-flash-lite');
  assert.deepEqual(geminiHits, ['gemini-2.5-flash', 'gemini-3.5-flash-lite'], '1 essai 404 puis repli');
  // 2e appel : le modèle résolu est mémorisé → un seul appel, plus aucun 404
  geminiHits.length = 0;
  const r2 = await p.chat({ system: 'test', events: EVENTS, tools: [] });
  assert.match(r2.text || '', /gemini-3\.5-flash-lite/);
  assert.deepEqual(geminiHits, ['gemini-3.5-flash-lite'], 'résolution mémorisée : un seul appel, zéro 404');
});

await test('Gemini : modèle à jour → aucun repli inutile', async () => {
  const p = new GeminiProvider('gemini-3.5-flash-lite');
  geminiHits.length = 0;
  await p.chat({ system: 'test', events: EVENTS, tools: [] });
  assert.deepEqual(geminiHits, ['gemini-3.5-flash-lite'], 'un seul appel quand le modèle est à jour');
});

await test('Gemini : tous les modèles en 404 → erreur agrégée explicite', async () => {
  geminiAllDead = true;
  try {
    const p = new GeminiProvider('gemini-2.5-flash');
    await p.chat({ system: 'test', events: EVENTS, tools: [] });
    throw new Error('devait échouer');
  } catch (e) {
    assert.match(String(e.message), /Aucun modèle Gemini disponible/, 'erreur agrégée');
    assert.match(String(e.message), /no longer available/, 'cause 404 conservée');
  } finally {
    geminiAllDead = false;
  }
});

await test('OpenAI-compat : endpoint éteint → erreur explicite (URL + cause + indice)', async () => {
  const p = new OpenAICompatProvider('http://127.0.0.1:9/v1', 'qwen2.5:1.5b'); // port 9 = discard, fermé
  await assert.rejects(
    () => p.chat({ system: 's', events: EVENTS, tools: [] }),
    (e) => {
      const m = String(e.message);
      assert.match(m, /injoignable/, 'mention injoignable');
      assert.match(m, /127\.0\.0\.1:9/, 'URL de l\'endpoint visible');
      assert.match(m, /setup-local-llm|ollama serve/, 'indice de réparation');
      return true;
    }
  );
});

await test('OpenAI-compat : la clé apiKey du POOL est envoyée (régression 401)', async () => {
  process.env.HERMES_OPENAI_API_KEY = 'cle-env-ne-doit-pas-passer';
  const p = new OpenAICompatProvider(`http://127.0.0.1:${openaiPort}/v1`, 'groq-model', 'cle-pool-gq_123');
  await p.chat({ system: 's', events: EVENTS, tools: [] });
  assert.equal(openaiAuthHeader, 'Bearer cle-pool-gq_123', 'la clé du pool prime sur l\'env');
  delete process.env.HERMES_OPENAI_API_KEY;
});

await test('OpenAI-compat : repli sur HERMES_OPENAI_API_KEY si pas de clé pool (Ollama local)', async () => {
  process.env.HERMES_OPENAI_API_KEY = 'ollama';
  const p = new OpenAICompatProvider(`http://127.0.0.1:${openaiPort}/v1`, 'qwen2.5:1.5b');
  await p.chat({ system: 's', events: EVENTS, tools: [] });
  assert.equal(openaiAuthHeader, 'Bearer ollama');
  delete process.env.HERMES_OPENAI_API_KEY;
});

await test('OpenAI-compat : parsing des tool_calls', async () => {
  const p = new OpenAICompatProvider(`http://127.0.0.1:${openaiPort}/v1`, 'qwen2.5:1.5b', 'k');
  const r = await p.chat({ system: 's', events: EVENTS, tools: TOOLS });
  assert.equal(r.toolCalls?.[0]?.name, 'catalog_list');
  assert.deepEqual(r.toolCalls?.[0]?.args, { limit: 3 });
});

await test('Gemini : signature et functionCall sur le MÊME Part (régression réponse vide)', async () => {
  geminiResponse = { candidates: [{ content: { parts: [{ thoughtSignature: 'test-signature', functionCall: { name: 'catalog_list', args: { limit: 2 } } }] } }] };
  const p = new GeminiProvider('gemini-3.5-flash-lite');
  const result = await p.chat({ system: 's', events: EVENTS, tools: TOOLS });
  assert.equal(result.toolCalls[0].name, 'catalog_list');
  assert.equal(result.toolCalls[0].thoughtSignature, 'test-signature');
  await p.chat({ system: 's', events: [...EVENTS, { type: 'tool_call', ...result.toolCalls[0] }, { type: 'tool_result', name: 'catalog_list', result: { count: 0 } }], tools: TOOLS });
  const part = geminiRequest.contents.find(c => c.parts.some(p => p.functionCall)).parts[0];
  assert.equal(part.thoughtSignature, 'test-signature');
  assert.equal(part.functionCall.thoughtSignature, undefined);
  geminiResponse = null;
});

await test('Gemini : texte signé conservé, raisonnement interne jamais affiché', async () => {
  geminiResponse = { candidates: [{ content: { parts: [
    { thought: true, text: 'raisonnement privé TEST' },
    { thoughtSignature: 'sig-text', text: 'Conclusion visible TEST' }
  ] } }] };
  const result = await new GeminiProvider('gemini-3.5-flash-lite').chat({ system: 's', events: EVENTS, tools: [] });
  assert.equal(result.text, 'Conclusion visible TEST');
  geminiResponse = null;
});

await test('OpenAI : endpoint anonyme ne reçoit pas la clé de l’environnement', async () => {
  process.env.HERMES_OPENAI_API_KEY = 'ne-pas-exfiltrer-cette-cle-test';
  await new OpenAICompatProvider(`http://127.0.0.1:${openaiPort}/v1`, 'test', '').chat({ system: 's', events: EVENTS, tools: [] });
  assert.equal(openaiAuthHeader, null);
  delete process.env.HERMES_OPENAI_API_KEY;
});

await test('OpenAI : JSON de tool-call invalide refusé, pas d’exécution avec args vides', async () => {
  openaiResponse = { choices: [{ message: { tool_calls: [{ function: { name: 'catalog_delete', arguments: '{oops' } }] } }] };
  await assert.rejects(() => new OpenAICompatProvider(`http://127.0.0.1:${openaiPort}/v1`, 'test', '').chat({ system: 's', events: EVENTS, tools: TOOLS }), /JSON invalides/);
  openaiResponse = null;
});

// ---- Cascade de modèles gratuits (OpenRouter :free) ----
const OR = `http://127.0.0.1:${openaiPort}/api/v1`;
const [M1, M2, M3, M4] = OPENROUTER_FREE_CASCADE;
const textOf = (model, servedAs) => ({ status: 200, body: { model: servedAs || model, choices: [{ message: { content: `réponse-de-${servedAs || model}` } }], usage: { prompt_tokens: 3, completion_tokens: 2 } } });
const gone404 = { status: 404, body: { error: { code: 404, message: 'No endpoints found for this model.' } } };
const rate429 = { status: 429, headers: { 'retry-after': '7' }, body: { error: { code: 429, message: 'Rate limit exceeded: free-models-per-min.' } } };
const down502 = { status: 502, body: { error: { code: 502, message: 'Provider returned error' } } };

await test('cascade : ordre par défaut gemma-4-31b → gpt-oss-120b → qwen3-next → openrouter/free (tous :free)', () => {
  assert.deepEqual(OPENROUTER_FREE_CASCADE, ['google/gemma-4-31b-it:free', 'openai/gpt-oss-120b:free', 'qwen/qwen3-next-80b-a3b-instruct:free', 'openrouter/free']);
  assert.deepEqual(openRouterFreeCascade({}), OPENROUTER_FREE_CASCADE, 'sans variable d\'env : la cascade par défaut, dans cet ordre');
  const p = new OpenAICompatProvider(OR, M1, 'sk-or-test', OPENROUTER_FREE_CASCADE.slice(1));
  assert.deepEqual(p.models, OPENROUTER_FREE_CASCADE, 'le provider expose la cascade complète, dédupliquée');
  assert.ok(p.label.includes('cascade'));
  assert.ok(HERMES_POOL.MAX_MODEL_CASCADE >= 4);
});

await test('cascade : surcharge HERMES_OPENROUTER_FREE_MODELS (CSV) et refus silencieux des modèles payants', () => {
  const custom = openRouterFreeCascade({ HERMES_OPENROUTER_FREE_MODELS: ' nvidia/nemotron-3-super-120b-a12b:free, openai/gpt-4o ,openrouter/free ' });
  assert.deepEqual(custom, ['nvidia/nemotron-3-super-120b-a12b:free', 'openrouter/free'], 'gpt-4o (payant) écarté, ordre conservé, espaces tolérés');
  const legacy = openRouterFreeCascade({ HERMES_OPENROUTER_FREE_MODEL: 'openrouter/free' });
  assert.equal(legacy[0], 'openrouter/free', 'variable historique = tête de cascade');
  assert.equal(new Set(legacy).size, legacy.length, 'aucun doublon');
  assert.deepEqual(openRouterFreeCascade({ HERMES_OPENROUTER_FREE_MODELS: 'openai/gpt-4o' }), OPENROUTER_FREE_CASCADE, 'liste 100 % payante → retour au défaut gratuit');
});

await test('cascade : politique sans API payante — éligible seulement si TOUS les modèles sont :free', () => {
  const free = providerCostPolicy({ name: 'openrouter-free', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: M1, models: OPENROUTER_FREE_CASCADE, hasKey: true });
  assert.equal(free.eligible, true, free.label);
  assert.match(free.label, /4 modèles/);
  const mixed = providerCostPolicy({ name: 'openrouter-mixed', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: M1, models: [M1, 'openai/gpt-4o'], hasKey: true });
  assert.equal(mixed.eligible, false, 'un seul modèle payant dans la cascade → bloqué');
});

await test('cascade : 404 « No endpoints found » puis 429 → 3e modèle répond DANS LE MÊME APPEL', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  const events = [];
  openaiByModel = (model) => model === M1 ? gone404 : model === M2 ? rate429 : textOf(model);
  const p = new OpenAICompatProvider(OR, M1, 'sk-or-test', OPENROUTER_FREE_CASCADE.slice(1));
  const r = await p.chat({ system: 's', events: EVENTS, tools: TOOLS, onProviderEvent: (m) => events.push(m) });
  assert.equal(r.text, `réponse-de-${M3}`);
  assert.equal(r.model, M3, 'le modèle qui a réellement répondu est exposé');
  assert.equal(p.effectiveModel, M3);
  assert.deepEqual(openaiHits, [M1, M2, M3], 'un seul appel HTTP par modèle, dans l\'ordre, arrêt dès le premier succès');
  assert.equal(events.filter(e => /Modèle suivant de la cascade/.test(e)).length, 2, 'l\'utilisateur voit chaque bascule');
  assert.ok(modelCooldownRemainingMs(OR, M1) > 9 * 60 * 1000, '404 catalogue → cooldown long (10 min) sur CE modèle seulement');
  const cd2 = modelCooldownRemainingMs(OR, M2);
  assert.ok(cd2 > 5000 && cd2 <= 7000, `429 avec retry-after 7 s → cooldown 7 s (obtenu ${cd2} ms)`);
  assert.equal(modelCooldownRemainingMs(OR, M3), 0, 'le modèle qui a répondu n\'est pas pénalisé');
  assert.equal(classifyFailure('Fournisseur OpenAI-compatible (x) : HTTP 404 {"error":{"message":"No endpoints found"}}'), 'model_gone');
});

await test('cascade : 2e appel — les modèles en cooldown passent en fin de file (zéro requête gaspillée)', async () => {
  openaiHits.length = 0;
  const p = new OpenAICompatProvider(OR, M1, 'sk-or-test', OPENROUTER_FREE_CASCADE.slice(1));
  const r = await p.chat({ system: 's', events: EVENTS, tools: [] });
  assert.equal(r.model, M3);
  assert.deepEqual(openaiHits, [M3], 'M1/M2 en cooldown → M3 directement, un seul appel HTTP');
});

await test('cascade : cooldown mémorisé PAR endpoint — un autre baseUrl repart de zéro', async () => {
  openaiHits.length = 0;
  const other = new OpenAICompatProvider(`http://127.0.0.1:${openaiPort}/autre/v1`, M1, 'k', [M3]);
  openaiByModel = (model) => textOf(model);
  const r = await other.chat({ system: 's', events: EVENTS, tools: [] });
  assert.equal(r.model, M1);
  assert.deepEqual(openaiHits, [M1]);
});

await test('cascade : réponse vide d\'un modèle gratuit → modèle suivant, sans cooldown', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  openaiByModel = (model) => model === M1 ? { status: 200, body: { model, choices: [{ message: { content: '' } }] } } : textOf(model);
  const r = await new OpenAICompatProvider(OR, M1, 'k', [M2]).chat({ system: 's', events: EVENTS, tools: TOOLS });
  assert.equal(r.model, M2);
  assert.deepEqual(openaiHits, [M1, M2]);
  assert.equal(modelCooldownRemainingMs(OR, M1), 0, 'une réponse vide n\'est pas une panne');
});

await test('cascade : 5xx → suivant ; tous en échec → erreur agrégée listant chaque modèle (jamais de faux succès)', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  openaiByModel = (model) => model === M1 ? down502 : model === M2 ? gone404 : rate429;
  await assert.rejects(
    () => new OpenAICompatProvider(OR, M1, 'k', OPENROUTER_FREE_CASCADE.slice(1)).chat({ system: 's', events: EVENTS, tools: [] }),
    (e) => {
      assert.match(e.message, /Cascade épuisée/);
      for (const m of OPENROUTER_FREE_CASCADE) assert.ok(e.message.includes(m), `modèle ${m} cité dans l'erreur`);
      assert.match(e.message, /502/); assert.match(e.message, /No endpoints found/); assert.match(e.message, /429/);
      return true;
    });
  assert.deepEqual(openaiHits, OPENROUTER_FREE_CASCADE, 'les 4 modèles ont été essayés une fois chacun');
  assert.ok(modelCooldownRemainingMs(OR, M1) > 0 && modelCooldownRemainingMs(OR, M1) <= HERMES_POOL.COOLDOWN_ERROR_MS, '5xx → cooldown court');
});

await test('cascade : 401 (clé invalide) → arrêt immédiat, aucun autre modèle essayé', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  openaiByModel = () => ({ status: 401, body: { error: { code: 401, message: 'No auth credentials found' } } });
  await assert.rejects(() => new OpenAICompatProvider(OR, M1, 'mauvaise-cle', OPENROUTER_FREE_CASCADE.slice(1)).chat({ system: 's', events: EVENTS, tools: [] }), /HTTP 401/);
  assert.deepEqual(openaiHits, [M1], 'changer de modèle ne corrige pas une clé : un seul appel');
  assert.equal(classifyFailure('HTTP 401 No auth credentials found'), 'fatal');
});

await test('cascade : limite JOURNALIÈRE de la clé (free-models-per-day) → arrêt immédiat, fournisseur suivant', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  openaiByModel = () => ({ status: 429, body: { error: { code: 429, message: 'Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day' } } });
  await assert.rejects(() => new OpenAICompatProvider(OR, M1, 'k', OPENROUTER_FREE_CASCADE.slice(1)).chat({ system: 's', events: EVENTS, tools: [] }), /per-day/);
  assert.deepEqual(openaiHits, [M1], 'la limite frappe toute la clé : inutile d\'essayer les 3 autres modèles');
});

await test('cascade : le routeur openrouter/free renvoie le modèle réellement servi (vérité du routeur)', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  openaiByModel = (model) => model === 'openrouter/free' ? textOf(model, 'meta-llama/llama-3.3-70b-instruct:free') : gone404;
  const p = new OpenAICompatProvider(OR, M1, 'k', OPENROUTER_FREE_CASCADE.slice(1));
  const r = await p.chat({ system: 's', events: EVENTS, tools: TOOLS });
  assert.equal(r.model, 'meta-llama/llama-3.3-70b-instruct:free', 'affiché tel quel, pas le slug demandé');
  assert.deepEqual(openaiHits, OPENROUTER_FREE_CASCADE);
});

await test('cascade : annulation utilisateur → arrêt net, pas de modèle suivant', async () => {
  clearModelCooldowns();
  openaiHits.length = 0;
  const ac = new AbortController();
  openaiByModel = () => { ac.abort(); return gone404; };
  await assert.rejects(() => new OpenAICompatProvider(OR, M1, 'k', OPENROUTER_FREE_CASCADE.slice(1)).chat({ system: 's', events: EVENTS, tools: [], signal: ac.signal }));
  assert.equal(openaiHits.length, 1, 'aucune requête après l\'annulation');
});

openaiByModel = null;
clearModelCooldowns();

// ---- Bilan ----
geminiStub.close(); openaiStub.close();
console.log(`\n${'═'.repeat(60)}\n${failed === 0 ? '✅' : '❌'} verify-providers : ${passed} réussi(s), ${failed} échec(s)\n${'═'.repeat(60)}`);
process.exit(failed === 0 ? 0 : 1);
