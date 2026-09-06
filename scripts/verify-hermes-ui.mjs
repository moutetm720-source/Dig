/** Tests navigateur isolés : les réponses de chat ci-dessous sont des FIXTURES UI.
 * Aucun appel LLM, aucune publication, aucun paiement. Serveur npm run dev requis.
 * npm exec playwright install chromium puis npm run test:hermes:ui
 */
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.HERMES_TEST_BASE || 'http://127.0.0.1:3211';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Tests UI autorisés sur un serveur LOCAL uniquement.');
const status = await fetch(`${base}/api/hermes/status`).then(r => r.json());
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {})
});
const chats = [], decisions = [], storeWrites = [], errors = [];
const now = new Date().toISOString();
const confirmation = { actionId: 'a'.repeat(32), tool: 'catalog_set_price', summary: 'TEST UI uniquement — prix 12 EUR', agentId: 'pricing_expert', expiresAt: new Date(Date.now() + 600000).toISOString() };
const secondConfirmation = { ...confirmation, actionId: 'b'.repeat(32) };
const question = { id: 'q-test-ui', question: 'Quel public cibler ? (TEST UI)', options: ['Clients existants', 'Nouvelle audience'], allowCustom: true };
const response = (data = {}) => ({ response: '## Rapport de TEST\n\n**Données vérifiées** dans cette fixture uniquement.\n\n| Élément | Statut |\n| --- | --- |\n| Interface | Testée |\n\n```text\nRapport exportable de TEST\n```\n\n<script>window.hermesXss = true</script>\n![tracker](https://example.com/tracker.png)', provider: 'fixture-ui', model: 'test-only', agent: 'sales_analyst', steps: [], outcome: 'completed', ...data });
const answers = [
  response({ response: question.question, question, outcome: 'needs_input', steps: [{ id: 'ask-step', tool: 'ask_user', status: 'ok', summary: 'Question de TEST', agentId: 'sales_analyst', startedAt: now }] }),
  response({ response: '**Action en attente** (TEST UI).', pendingConfirmations: [confirmation], outcome: 'needs_confirmation' }),
  response(),
  response({ response: '**Nouvelle action en attente** (TEST UI).', pendingConfirmations: [secondConfirmation], outcome: 'needs_confirmation' })
];
async function context(viewport) {
  const c = await browser.newContext({ viewport });
  await c.addInitScript(() => {
    localStorage.setItem('df_user_role', 'moderator');
    localStorage.setItem('df_moderator_token', 'fixture-ui-no-real-access');
    localStorage.setItem('df_auto_pilot_enabled_v1', 'false');
    localStorage.setItem('df_auto_pilot_enabled', 'false');
  });
  await c.route('**/api/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname;
    const json = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (p === '/api/hermes/status') return json(status);
    if (p === '/api/hermes/autonomy') return json({ config: { enabled: false, intervalMinutes: 30, runs: 0 }, running: false, recent: [] });
    if (p === '/api/store') { if (req.method() === 'POST') storeWrites.push(req.postDataJSON()); return json(req.method() === 'GET' ? [] : { success: true }); }
    if (p === '/api/hermes/chat') {
      const body = req.postDataJSON(); chats.push(body);
      const answer = answers.shift() || response();
      const events = [
        { type: 'run_started', runId: `test-run-${chats.length}`, agent: body.agentId, freeOnly: true },
        { type: 'status', message: 'Exécution de transport TEST uniquement' },
        ...(answer.steps || []).flatMap(step => [{ type: 'step', step: { ...step, status: 'running' } }, { type: 'step', step }]),
        { type: 'done', result: answer }
      ];
      return route.fulfill({ contentType: 'text/event-stream', body: events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('') });
    }
    if (p === '/api/hermes/confirm') {
      const body = req.postDataJSON(); decisions.push(body);
      return json({ confirmed: body.decision === 'approve', refused: body.decision === 'refuse', tool: confirmation.tool, result: { testOnly: true } });
    }
    return json({});
  });
  return c;
}
const screenshot = async (page, name) => {
  if (!process.env.HERMES_UI_SCREENSHOT_DIR) return;
  await mkdir(process.env.HERMES_UI_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.HERMES_UI_SCREENSHOT_DIR, name), fullPage: false });
};

try {
  const desktop = await context({ width: 1440, height: 1100 });
  const page = await desktop.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button', { name: /Hermes Agent IA/ }).click();
  const consoleView = page.getByRole('region', { name: 'Console interactive Hermes' });
  await expect(consoleView).toBeVisible();
  await expect(consoleView.getByLabel('Agent spécialisé').locator('option')).toHaveCount(10);
  await screenshot(page, 'hermes-desktop-welcome.png');
  await consoleView.getByLabel('Agent spécialisé').selectOption('sales_analyst');
  const input = consoleView.getByLabel('Votre message à Hermes');
  await input.fill('Objectif de TEST UI sans dépenses'); await input.press('Enter');
  await expect(consoleView.getByRole('button', { name: 'Clients existants', exact: true })).toBeEnabled();
  assert.equal(chats[0].agentId, 'sales_analyst'); assert.equal(chats[0].freeOnly, true);
  assert.ok(!chats[0].history.some(h => h.text === chats[0].prompt), 'le prompt courant ne doit pas se trouver aussi dans history');
  await consoleView.getByRole('button', { name: 'Clients existants', exact: true }).click();
  await expect(consoleView.getByRole('button', { name: 'Refuser', exact: true })).toBeEnabled();
  assert.match(chats[1].prompt, /Clients existants/);
  await consoleView.getByRole('button', { name: 'Refuser', exact: true }).click();
  await expect(consoleView.getByText(/supprimée côté serveur/)).toBeVisible();
  assert.equal(decisions[0].decision, 'refuse');
  await input.fill('Rapport de TEST UI'); await input.press('Enter');
  await expect(consoleView.getByRole('heading', { name: 'Rapport de TEST' })).toBeVisible();
  await expect(consoleView.locator('table')).toBeVisible();
  assert.equal(await page.evaluate(() => window.hermesXss), undefined);
  assert.equal(await consoleView.locator('img').count(), 0);
  const download = page.waitForEvent('download');
  await consoleView.getByRole('button', { name: 'Télécharger', exact: true }).last().click();
  assert.match((await download).suggestedFilename(), /\.md$/);
  await input.fill('Confirmation de TEST UI'); await input.press('Enter');
  await consoleView.getByRole('button', { name: 'Confirmer cette action', exact: true }).click();
  await expect(consoleView.getByText(/Cette autorisation ne s’étend/)).toBeVisible();
  assert.equal(decisions[1].decision, 'approve');
  await screenshot(page, 'hermes-desktop-conversation.png');
  await page.reload();
  await page.getByRole('button', { name: /Hermes Agent IA/ }).click();
  await expect(page.getByRole('region', { name: 'Console interactive Hermes' }).getByRole('heading', { name: 'Rapport de TEST' })).toBeVisible();
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('hermes:conversation:v1')).messages.length > 5));
  assert.ok(!storeWrites.some(w => /hermes.*conversation|hermes_agent_state|hermes:/.test(w.key)), 'la conversation doit rester locale, hors store public');
  await desktop.close();

  const mobile = await context({ width: 390, height: 844 });
  const phone = await mobile.newPage(); phone.on('pageerror', e => errors.push(e.message));
  await phone.goto(base); await phone.getByRole('button', { name: 'Ouvrir Hermes', exact: true }).click();
  const widget = phone.getByRole('region', { name: 'Fenêtre Hermes' });
  await expect(widget).toBeVisible();
  const box = await widget.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844, 'widget contenu dans le viewport mobile');
  await widget.getByRole('button', { name: /^Outils/ }).click();
  await widget.getByLabel('Rechercher une compétence').fill('ask_user');
  await expect(widget.getByText('ask_user', { exact: true })).toBeVisible();
  await widget.getByRole('button', { name: 'Discussion', exact: true }).click();
  await screenshot(phone, 'hermes-mobile.png');
  await mobile.close();
  assert.deepEqual(errors, [], 'aucune erreur JavaScript pendant les interactions Hermes');
  console.log('✅ UI : sélection agent, historique sans doublon, choix, refus/accord, Markdown sûr, export, persistance, confidentialité locale et widget mobile vérifiés. Fixtures UI uniquement, aucun appel LLM.');
} catch (e) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    console.error('Erreurs JS :', errors);
    console.error((await page.locator('body').innerText()).slice(0, 2500));
    await screenshot(page, 'hermes-ui-failure.png');
  }
  throw e;
} finally { await browser.close(); }
