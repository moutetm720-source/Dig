import test from 'node:test';
import assert from 'node:assert/strict';
import { readHermesStream } from '../src/services/hermesStream.ts';
import { freeOnlyEnabled, isLoopbackUrl, providerCostPolicy } from '../hermes/providerPolicy.ts';

const result = { response: 'Réponse de transport TEST, aucune vente.', provider: 'test', model: 'test', agent: 'orchestrator', steps: [] };
function streamResponse(text, chunkSize = 3) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
    controller.close();
  } }), { headers: { 'content-type': 'text/event-stream' } });
}

test('SSE : UTF-8 fragmenté, CRLF, commentaires, ordre et done', async () => {
  const events = [
    { type: 'status', message: 'Étape vérifiée 💬' },
    { type: 'step', step: { id: '1', tool: 'catalog_list', status: 'running', summary: 'Lecture' } },
    { type: 'done', result }
  ];
  const text = ': heartbeat\r\n\r\n' + events.map(e => `data: ${JSON.stringify(e)}\r\n\r\n`).join('');
  const received = [];
  await readHermesStream(streamResponse(text, 1), e => received.push(e));
  assert.deepEqual(received, events);
});

test('SSE : un flux interrompu conserve les étapes mais ne devient pas un succès', async () => {
  const received = [];
  await assert.rejects(() => readHermesStream(streamResponse('data: {"type":"status","message":"Outil terminé"}\n\n'), e => received.push(e)), /avant la conclusion/);
  assert.equal(received.length, 1);
});

test('SSE : erreur serveur propagée, pas de done inventé', async () => {
  await assert.rejects(() => readHermesStream(streamResponse('data: {"type":"error","message":"Quota épuisé"}\n\n'), () => {}), /Quota/);
});

test('SSE : réponse finale vide rejetée', async () => {
  await assert.rejects(() => readHermesStream(streamResponse(`data: ${JSON.stringify({ type: 'done', result: { ...result, response: '   ' } })}\n\n`), () => {}), /vide/);
});

test('JSON : ancien transport toujours accepté avec une vraie conclusion', async () => {
  const events = [];
  await readHermesStream(Response.json(result), e => events.push(e));
  assert.deepEqual(events, [{ type: 'done', result }]);
  await assert.rejects(() => readHermesStream(Response.json({ response: '' }), () => {}), /vide/);
});

test('Politique : une demande client ne peut pas déverrouiller le mode gratuit serveur', () => {
  const before = process.env.HERMES_FREE_ONLY;
  try {
    delete process.env.HERMES_FREE_ONLY;
    assert.equal(freeOnlyEnabled(false), true);
    process.env.HERMES_FREE_ONLY = '0';
    assert.equal(freeOnlyEnabled(false), false);
    assert.equal(freeOnlyEnabled(true), true);
    assert.equal(freeOnlyEnabled(), true);
  } finally { if (before === undefined) delete process.env.HERMES_FREE_ONLY; else process.env.HERMES_FREE_ONLY = before; }
});

test('Politique : endpoint local exact et modèles :free uniquement, noms trompeurs refusés', () => {
  const openai = { kind: 'openai', model: 'qwen2.5', local: true };
  assert.equal(providerCostPolicy({ ...openai, baseUrl: 'http://127.0.0.1:11434/v1' }).eligible, true);
  for (const baseUrl of ['https://localhost.evil.example/v1', 'https://evil.example/localhost', 'https://localhost@evil.example/v1', 'ftp://localhost/v1']) {
    assert.equal(isLoopbackUrl(baseUrl), false);
    assert.equal(providerCostPolicy({ ...openai, baseUrl }).eligible, false);
  }
  assert.equal(providerCostPolicy({ ...openai, model: 'model:cloud', baseUrl: 'http://localhost:11434/v1' }).eligible, false);
  assert.equal(providerCostPolicy({ kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'model:free', hasKey: true }).eligible, true);
  assert.equal(providerCostPolicy({ kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'paid-model', hasKey: true }).eligible, false);
  assert.equal(providerCostPolicy({ kind: 'openai', baseUrl: 'https://not-free.example/v1', model: 'fake:free' }).eligible, false);
  assert.equal(providerCostPolicy({ kind: 'gemini', model: 'flash', hasKey: true }).eligible, false);
  assert.equal(providerCostPolicy({ kind: 'openai', baseUrl: 'https://api.llm7.io/v1', model: 'test', hasKey: false }).eligible, true);
  assert.equal(providerCostPolicy({ kind: 'openai', baseUrl: 'https://api.llm7.io/v1', model: 'test', hasKey: true }).eligible, false);
});

// Aucune somme issue des compteurs UI ni d'un checkout TEST n'est un encaissement.
test('chiffres : tests/démos/impayés/doublons exclus et devises jamais additionnées', async () => {
  const { salesFacts } = await import('../hermes/salesFacts.ts');
  const base = { id: 'live', status: 'paid', source: 'stripe', stripeSessionId: 'cs_live_fixture', confirmedAt: '2026-09-06T10:00:00Z', totalCents: 2500, currency: 'EUR', items: [{ productId: 'p', title: 'Produit test isolé', quantity: 1 }], customerEmail: 'private@example.test' };
  const facts = salesFacts([
    base, { ...base }, { ...base, id: 'test', stripeSessionId: 'cs_test_fixture' },
    { ...base, id: 'pending', status: 'pending_payment' }, { ...base, id: 'no-proof', confirmedAt: undefined },
    { ...base, id: 'demo', source: 'demo' }, { ...base, id: 'dollars', currency: 'USD', totalCents: 9000 }
  ], [{ id: 'p', title: 'Produit TEST', salesCount: 999999, revenue: 10000000 }], new Date('2026-09-06'));
  assert.equal(facts.orders, 2); assert.equal(facts.totalRevenueEur, 25); assert.equal(facts.todayRevenueEur, 25);
  assert.equal(facts.totalsByCurrency.USD, 90); assert.equal(facts.topProducts[0].sales, 2);
  assert.equal(facts.excludedOrders, 5); assert.doesNotMatch(JSON.stringify(facts), /private@example/);
});
