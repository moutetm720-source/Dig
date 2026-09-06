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
 */
import http from 'node:http';
import assert from 'node:assert';

// ---- Environnement de test AVANT l'import des modules testés ----
process.env.GEMINI_API_KEY = 'test-key-local-stub';
delete process.env.HERMES_OPENAI_API_KEY;
delete process.env.HERMES_GEMINI_MODEL;
delete process.env.HERMES_OPENAI_BASE_URL;

const { GeminiProvider, OpenAICompatProvider, GEMINI_MODEL_FALLBACKS, geminiModelChain } = await import('../hermes/providers.js');
const { DEFAULT_HERMES_CONFIG } = await import('../hermes/types.js');

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
const openaiStub = http.createServer((req, res) => {
  openaiAuthHeader = req.headers['authorization'] || null;
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
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

// ---- Bilan ----
geminiStub.close(); openaiStub.close();
console.log(`\n${'═'.repeat(60)}\n${failed === 0 ? '✅' : '❌'} verify-providers : ${passed} réussi(s), ${failed} échec(s)\n${'═'.repeat(60)}`);
process.exit(failed === 0 ? 0 : 1);
