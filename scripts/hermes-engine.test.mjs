/**
 * Tests de mécanique uniquement : API LLM locale explicitement factice, PostgreSQL
 * éphémère isolé. Aucune IA de test ajoutée au produit, aucun achat/appel cloud.
 * Lancez avec npm run test:hermes. Ne touche jamais à la base de l'environnement.
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import EmbeddedPostgres from 'embedded-postgres';
import { readHermesStream } from '../src/services/hermesStream.ts';

let pg, pgDir, apiServer, fixtureServer, base, tools, engine, db, providers;
let calls = [];
let replies = [];
const text = (content = 'Conclusion de transport TEST. Aucune vente simulée.') => ({ choices: [{ message: { content } }] });
const tool = (name, args, extra = []) => ({ choices: [{ message: { content: null, tool_calls: [{ function: { name, arguments: JSON.stringify(args) } }, ...extra.map(([n, a]) => ({ function: { name: n, arguments: JSON.stringify(a) } }))] } }] });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const post = async (endpoint, body, owner = 'test-A') => {
  const res = await fetch(`${base}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: `Bearer ${owner}` } : {}) }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
};
const chat = (prompt = 'Demande de transport TEST', extra = {}) => post('/chat', { prompt, ...extra });

before(async () => {
  const portProbe = http.createServer();
  const port = await listen(portProbe);
  await new Promise(r => portProbe.close(r));
  pgDir = await mkdtemp(path.join(tmpdir(), 'dig-hermes-test-'));
  pg = new EmbeddedPostgres({ databaseDir: pgDir, port, user: 'postgres', password: 'isolated-test-only', persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise(); await pg.start(); await pg.createDatabase('hermes_interaction_test');
  delete process.env.DATABASE_URL; delete process.env.SQL_URL;
  Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: String(port), DB_USER: 'postgres', DB_PASSWORD: 'isolated-test-only', DB_NAME: 'hermes_interaction_test', DB_SSL: 'disable', HERMES_PROVIDER: 'openai', HERMES_FREE_ONLY: '1', HERMES_ANONYMOUS_FALLBACK: '0' });
  delete process.env.GEMINI_API_KEY; delete process.env.HERMES_OPENAI_API_KEY;
  fixtureServer = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    const parsed = JSON.parse(body || '{}'); calls.push(parsed);
    try {
      const next = replies.length ? replies.shift() : text();
      const result = typeof next === 'function' ? await next(parsed, res) : next;
      if (!res.destroyed) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(result)); }
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  const fixturePort = await listen(fixtureServer);
  process.env.HERMES_OPENAI_BASE_URL = `http://127.0.0.1:${fixturePort}/v1`;
  process.env.HERMES_OPENAI_MODEL = 'transport-test-local';
  const database = await import('../src/db/db.ts');
  db = database.db;
  assert.equal(await database.ensureSchema(), true);
  tools = await import('../hermes/tools.ts');
  engine = await import('../hermes/engine.ts');
  providers = await import('../hermes/providers.ts');
  // Les appels anonymes/cloud sont désactivés pour ce processus de test.
  const { createHermesRouter } = await import('../hermes/index.ts');
  const app = express(); app.use(express.json());
  app.use(createHermesRouter({
    requireAuth: (req, res, next) => /^Bearer test-[AB]$/.test(req.headers.authorization || '') ? next() : res.status(401).json({ error: 'Test : authentification requise' }),
    aiLimiter: (_req, _res, next) => next(), apiLimiter: (_req, _res, next) => next()
  }));
  apiServer = http.createServer(app); base = `http://127.0.0.1:${await listen(apiServer)}`;
}, { timeout: 60000 });

beforeEach(async () => {
  replies = []; calls = [];
  process.env.HERMES_PROVIDER = 'openai';
  await tools.kvSet('dpf_app_v2_products', [{ id: 'test-product', title: 'Produit de TEST isolé', status: 'draft', price: 10, pricing: { recommendedPrice: 10 } }]);
  await tools.kvSet('dpf_app_v2_orders', []);
});

after(async () => {
  apiServer?.closeAllConnections(); fixtureServer?.closeAllConnections();
  if (apiServer) await new Promise(r => apiServer.close(r));
  if (fixtureServer) await new Promise(r => fixtureServer.close(r));
  if (db) await db.$client.end({ timeout: 1 });
  if (pg) await pg.stop();
  if (pgDir) await rm(pgDir, { recursive: true, force: true });
});

test('status : registres complets pour le sélecteur et les compétences, politique explicite', async () => {
  const res = await fetch(`${base}/status`); const data = await res.json();
  assert.equal(data.agents.length, 10); assert.equal(data.skills.length, data.skillsCount);
  assert.ok(data.skills.some(s => s.name === 'ask_user'));
  assert.ok(data.skills.find(s => s.name === 'channels_dispatch').requiresConfirmation);
  assert.equal(data.budgetPolicy.freeOnly, true);
  assert.equal(data.providerPool[0].costPolicy.eligible, true);
});

test('API : chat / inspect / confirmations / stop protégés, validation des entrées', async () => {
  for (const endpoint of ['/chat', '/inspect', '/confirm', '/chat/stop']) assert.equal((await post(endpoint, { prompt: 'TEST', stream: true }, null)).status, 401);
  assert.equal((await chat('   ')).status, 400);
  assert.equal((await chat('TEST', { agentId: 'intrus' })).status, 400);
  assert.equal((await post('/inspect', { tool: 'catalog_delete' })).status, 400);
  assert.equal(calls.length, 0);
});

test('sélection : agentId et ancien champ agent pilotent réellement le moteur', async () => {
  assert.equal((await chat('TEST', { agentId: 'sales_analyst' })).data.agent, 'sales_analyst');
  assert.match(calls[0].messages[0].content, /ANALYSTE VENTES/);
  assert.equal((await chat('TEST', { agent: 'pricing_expert' })).data.agent, 'pricing_expert');
});

test('SSE : début, outil en cours, résultat et conclusion dans le bon ordre', async () => {
  replies = [tool('catalog_list', { limit: 2 }), text('Catalogue TEST lu.')];
  const res = await fetch(`${base}/chat`, { method: 'POST', headers: { Authorization: 'Bearer test-A', 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ prompt: 'Lis le catalogue de TEST', stream: true }) });
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const events = []; await readHermesStream(res, e => events.push(e));
  assert.equal(events[0].type, 'run_started');
  const steps = events.filter(e => e.type === 'step');
  assert.deepEqual(steps.map(e => e.step.status), ['running', 'ok']);
  assert.equal(steps[0].step.id, steps[1].step.id);
  assert.equal(events.at(-1).type, 'done');
  assert.equal(events.at(-1).result.response, 'Catalogue TEST lu.');
});

test('réponse vide : erreur visible, jamais « action terminée »', async () => {
  replies = [{ choices: [{ message: { content: null } }] }];
  const { data } = await chat();
  assert.equal(data.outcome, 'error'); assert.match(data.response, /Réponse vide/);
  assert.equal(data.steps.length, 0); assert.doesNotMatch(data.response, /Action terminée/);
});

test('erreur LLM après une action : bilan partiel conservé, pas « aucune action »', async () => {
  replies = [tool('catalog_list', { limit: 1 }), { choices: [{ message: { content: null } }] }];
  const { data } = await chat();
  assert.equal(data.outcome, 'partial'); assert.equal(data.steps[0].status, 'ok');
  assert.match(data.response, /catalog_list/); assert.doesNotMatch(data.response, /Aucune action exécutée/);
});

test('consentement : confirm:true du modèle ne vaut rien ; propriétaire et usage unique', async () => {
  replies = [tool('catalog_delete', { id: 'test-product', confirm: true })];
  const { data } = await chat();
  assert.equal(data.outcome, 'needs_confirmation'); assert.equal(calls.length, 1);
  assert.equal((await tools.kvGet('dpf_app_v2_products')).length, 1);
  const actionId = data.pendingConfirmation.actionId;
  assert.equal((await post('/confirm', { actionId }, 'test-B')).status, 400);
  const accepted = await post('/confirm', { actionId });
  assert.equal(accepted.status, 200); assert.equal(accepted.data.tool, 'catalog_delete');
  assert.equal((await tools.kvGet('dpf_app_v2_products')).length, 0);
  assert.equal((await post('/confirm', { actionId })).status, 400);
});

test('refus : révocation réelle côté serveur, impossible de confirmer ensuite', async () => {
  replies = [tool('catalog_delete', { id: 'test-product' })];
  const { data } = await chat(); const actionId = data.pendingConfirmation.actionId;
  assert.equal((await post('/confirm', { actionId, decision: 'refuse' })).data.refused, true);
  assert.equal((await post('/confirm', { actionId })).status, 400);
  assert.equal((await tools.kvGet('dpf_app_v2_products')).length, 1);
});

test('consentement : confirmation expirée refusée sans effet', async () => {
  replies = [tool('catalog_delete', { id: 'test-product' })];
  const { data } = await chat();
  const now = Date.now;
  try {
    Date.now = () => now() + 11 * 60 * 1000;
    assert.equal((await post('/confirm', { actionId: data.pendingConfirmation.actionId })).status, 400);
  } finally { Date.now = now; }
  assert.equal((await tools.kvGet('dpf_app_v2_products')).length, 1);
});

test('sous-agent : étapes et confirmation remontent à l’humain principal', async () => {
  replies = [tool('dispatch_agent', { agentId: 'pricing_expert', task: 'TEST prix à 12' }), tool('catalog_set_price', { id: 'test-product', scope: 'one', price: 12, confirm: true })];
  const { data } = await chat();
  assert.equal(data.outcome, 'needs_confirmation');
  assert.equal(data.pendingConfirmations[0].agentId, 'pricing_expert');
  const child = data.steps.find(s => s.agentId === 'pricing_expert');
  assert.ok(child.parentId); assert.equal(child.status, 'confirmation_required');
  assert.equal((await tools.kvGet('dpf_app_v2_products'))[0].price, 10);
  const confirmed = await post('/confirm', { actionId: data.pendingConfirmations[0].actionId });
  assert.equal(confirmed.data.result.oldPrice, 10); assert.equal(confirmed.data.result.newPrice, 12);
});

test('question : choix structurés et pause immédiate avant le reste du batch', async () => {
  replies = [tool('ask_user', { question: 'Quelle audience de TEST ?', options: ['Clients existants', 'Nouvelle audience'] }, [['catalog_create', { title: 'Ne doit pas exister' }]])];
  const { data } = await chat();
  assert.equal(data.outcome, 'needs_input'); assert.deepEqual(data.question.options, ['Clients existants', 'Nouvelle audience']);
  assert.equal(data.steps.length, 1); assert.equal(calls.length, 1);
  assert.equal((await tools.kvGet('dpf_app_v2_products')).length, 1);
});

test('question : options invalides ne produisent pas de carte cassée', async () => {
  replies = [tool('ask_user', { question: 'TEST', options: ['unique'] }), text()];
  const { data } = await chat(); assert.equal(data.question, undefined); assert.equal(data.steps[0].status, 'error');
});

test('périmètre : un analyste ne peut pas appeler un outil interdit même avec confirm:true', async () => {
  replies = [tool('catalog_delete', { id: 'test-product', confirm: true }), text()];
  const { data } = await chat('TEST', { agentId: 'sales_analyst' });
  assert.equal(data.steps[0].status, 'denied'); assert.equal(data.pendingConfirmation, undefined);
  assert.equal((await tools.kvGet('dpf_app_v2_products')).length, 1);
});

test('autonomie : allowedTools est contrôlé à l’exécution, pas seulement dans le prompt', async () => {
  replies = [tool('catalog_delete', { id: 'test-product', confirm: true }), text()];
  const data = await engine.runAgentChat({ prompt: 'TEST', actor: 'test', allowedTools: ['catalog_list'] });
  assert.equal(data.steps[0].status, 'denied'); assert.equal(data.pendingConfirmation, undefined);
});

test('budget zéro : campagne avec budget positif refusée sans écriture', async () => {
  await tools.kvSet('dpf_app_v2_adCampaigns', []);
  replies = [tool('campaigns_create', { name: 'Interdit TEST', platform: 'meta_ads', budget: 100 }), text()];
  const { data } = await chat();
  assert.equal(data.steps[0].status, 'error'); assert.match(data.steps[0].summary, /Budget zéro/);
  assert.deepEqual(await tools.kvGet('dpf_app_v2_adCampaigns'), []);
});

test('gratuit : un fournisseur inconnu prioritaire n’est jamais appelé, même freeOnly:false côté client', async () => {
  process.env.HERMES_PROVIDER = 'auto';
  const paidPort = fixtureServer.address().port;
  await tools.kvSet('df_hermes_provider_pool', [{ name: 'fake-free-paid-test', kind: 'openai', baseUrl: `http://127.0.0.1:${paidPort}/paid`, model: 'paid-test', local: false, priority: 1 }]);
  const { data } = await chat('TEST', { freeOnly: false });
  assert.equal(data.provider, 'openai-env'); assert.ok(calls.every(c => c.model !== 'paid-test'));
  await tools.kvSet('df_hermes_provider_pool', []);
});

test('cascade : 404 → 429 → 3e modèle répond dans le MÊME appel ; cascade épuisée → fournisseur suivant', async () => {
  process.env.HERMES_PROVIDER = 'auto';
  providers.clearModelCooldowns();
  const port = fixtureServer.address().port;
  // Fournisseur local prioritaire avec une cascade de 3 modèles (loopback → éligible en mode gratuit).
  await tools.kvSet('df_hermes_provider_pool', [{ name: 'cascade-test', kind: 'openai', baseUrl: `http://127.0.0.1:${port}/cascade`, model: 'c-un', fallbackModels: ['c-deux', 'c-trois'], local: true, priority: 1 }]);
  const fail = (status, message) => (_body, res) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { code: status, message } })); return null; };
  // 1) c-un : 404 catalogue, c-deux : 429, c-trois : répond → un seul tour de chat, provider cascade-test, modèle c-trois.
  replies = [fail(404, 'No endpoints found for this model.'), fail(429, 'Rate limit exceeded: free-models-per-min.'), text('Réponse via le 3e modèle TEST.')];
  let { data } = await chat('TEST cascade');
  assert.equal(data.outcome, 'completed'); assert.equal(data.provider, 'cascade-test'); assert.equal(data.model, 'c-trois');
  assert.deepEqual(calls.map(c => c.model), ['c-un', 'c-deux', 'c-trois']);
  // 2) Appel suivant : c-un/c-deux en cooldown → c-trois directement (zéro requête gaspillée).
  calls = []; replies = [text('Direct 3e modèle TEST.')];
  ({ data } = await chat('TEST cascade 2'));
  assert.equal(data.model, 'c-trois'); assert.deepEqual(calls.map(c => c.model), ['c-trois']);
  // 3) Cascade entièrement épuisée (c-trois en 502) → bascule vers le fournisseur suivant (openai-env) dans le même appel.
  calls = []; replies = [fail(502, 'Provider returned error'), fail(404, 'No endpoints found'), fail(429, 'Rate limit'), text('Repli fournisseur env TEST.')];
  ({ data } = await chat('TEST cascade 3'));
  assert.equal(data.outcome, 'completed'); assert.equal(data.provider, 'openai-env'); assert.equal(data.model, 'transport-test-local');
  assert.deepEqual(calls.map(c => c.model), ['c-trois', 'c-un', 'c-deux', 'transport-test-local'], 'modèles en cooldown retentés en dernier, puis fournisseur suivant');
  const status = await (await fetch(`${base}/providers`, { headers: { Authorization: 'Bearer test-A' } })).json();
  const entry = status.pool.find(p => p.name === 'cascade-test');
  assert.deepEqual(entry.models, ['c-un', 'c-deux', 'c-trois']);
  assert.equal(entry.cascade.filter(c => c.inCooldown).length, 3, 'l\'état par modèle est exposé, sans faux « disponible »');
  await tools.kvSet('df_hermes_provider_pool', []);
  providers.clearModelCooldowns();
});

test('délégation : pas de récursion vers l’orchestrateur', async () => {
  replies = [tool('dispatch_agent', { agentId: 'orchestrator', task: 'TEST récursion' }), text()];
  const { data } = await chat(); assert.equal(data.steps[0].status, 'error'); assert.equal(calls.length, 2);
});

test('budgets : limite globale commune aux sous-agents, synthèse sans nouveaux outils', async () => {
  const repeat = body => body.tools?.length ? tool('catalog_list', {}) : text();
  replies = [tool('dispatch_agent', { agentId: 'product_factory', task: 'TEST budget' }), ...Array(20).fill(repeat)];
  const { data } = await chat();
  assert.ok(calls.length <= 12); assert.ok(data.steps.filter(s => s.status === 'ok').length <= 10);
  assert.ok(data.response.trim());
});

test('audit sans IA : données serveur consultables, zéro appel LLM', async () => {
  const { data, status } = await post('/inspect', { tool: 'metrics_summary' });
  assert.equal(status, 200); assert.equal(calls.length, 0);
  assert.equal(data.steps[0].status, 'ok'); assert.match(data.response, /sans IA/);
});

test('arrêt : session propriétaire, pas de double exécution, fin cancelled et aucun nouvel outil', async () => {
  const entered = deferred();
  replies = [(_body, res) => { entered.resolve(); return new Promise(resolve => res.on('close', () => resolve(text()))); }];
  const res = await fetch(`${base}/chat`, { method: 'POST', headers: { Authorization: 'Bearer test-A', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'TEST arrêt', stream: true }) });
  const started = deferred(); const events = [];
  const reading = readHermesStream(res, e => { events.push(e); if (e.type === 'run_started') started.resolve(e.runId); });
  const runId = await started.promise; await entered.promise;
  assert.equal((await chat()).status, 409);
  assert.equal((await post('/chat/stop', { runId }, 'test-B')).status, 404);
  assert.equal((await post('/chat/stop', { runId })).status, 200);
  await reading;
  assert.equal(events.at(-1).result.outcome, 'cancelled'); assert.equal(calls.length, 1);
  assert.equal(events.at(-1).result.steps.length, 0);
});

test('sans fournisseur : blocage honnête du chat, diagnostic sans IA toujours disponible', async () => {
  const original = await providers.getHermesConfig();
  try {
    await providers.saveHermesConfig({ openaiBaseUrl: '' });
    const { data } = await chat();
    assert.equal(data.outcome, 'blocked'); assert.match(data.response, /Aucune action exécutée/);
    assert.equal(calls.length, 0);
    const inspection = await post('/inspect', { tool: 'metrics_summary' });
    assert.equal(inspection.data.steps[0].status, 'ok'); assert.equal(calls.length, 0);
  } finally { await providers.saveHermesConfig(original); }
});
