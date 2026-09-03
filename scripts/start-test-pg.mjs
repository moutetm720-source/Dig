/**
 * start-test-pg.mjs — Infrastructure de TEST uniquement.
 *
 * Démarre un PostgreSQL 18 embarqué (binaire npm `embedded-postgres`, devDependency)
 * sur 127.0.0.1:5432, crée la table key_value_store et une base de données
 * de test minimaliste (catalogue, commandes PII, secret webhook) :
 *
 *   node scripts/start-test-pg.mjs
 *
 * Puis :
 *   PORT=3211 DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=password DB_NAME=applet \
 *     ./node_modules/.bin/tsx server.ts
 *
 * Ce script n'est JAMAIS utilisé en production.
 */
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';

const pg = new EmbeddedPostgres({
  databaseDir: '/tmp/pgdata-dig',
  user: 'postgres',
  password: 'password',
  port: 5432,
  persistent: false,
});

try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('applet');
  console.log('PG_READY');

  // ---- Table + données de test ----
  const sql = postgres({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'password', database: 'applet' });
  await sql`CREATE TABLE IF NOT EXISTS key_value_store (key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}')`;

  const products = [
    {
      id: 'prod-test-1', title: 'Guide IA Automatisation', subtitle: 'Automatisez vos tâches avec l\'IA',
      category: 'IA & Productivité', format: 'guide', status: 'published',
      pricing: { recommendedPrice: 47, compareAtPrice: 89, discountPercent: 47, isFlashSale: false },
      price: 47, salesCount: 12, revenue: 564, rating: 4.9
    },
    {
      id: 'prod-test-2', title: 'Pack 500 Prompts Marketing', subtitle: 'Prompts haute conversion',
      category: 'IA & Productivité', format: 'prompt_pack', status: 'published',
      pricing: { recommendedPrice: 29, compareAtPrice: 59, discountPercent: 50, isFlashSale: false },
      price: 29, salesCount: 5, revenue: 145, rating: 4.8
    },
    {
      id: 'prod-test-3', title: 'Template SaaS Notion OS', subtitle: 'OS Notion complet pour SaaS',
      category: 'Templates', format: 'template', status: 'draft',
      pricing: { recommendedPrice: 67, compareAtPrice: 99, discountPercent: 32, isFlashSale: false },
      price: 67, salesCount: 0, revenue: 0, rating: 5.0
    }
  ];

  // Commandes de test AVEC PII — doivent rester invisibles dans GET /api/store
  // et dans les skills Hermes (agrégats uniquement).
  const orders = [
    { id: 'ord-1', orderNumber: 'DPF-TEST-0001', totalAmount: 47, currency: 'EUR', paymentMethod: 'card', customerName: 'Jeanne Dupont', customerEmail: 'jeanne.dupont@example.com', customerAddress: '1 rue de Test, 75001 Paris', items: [{ productId: 'prod-test-1', title: 'Guide IA', price: 47, quantity: 1 }], createdAt: '2026-08-20T10:00:00.000Z' },
    { id: 'ord-2', orderNumber: 'DPF-TEST-0002', totalAmount: 29, currency: 'EUR', paymentMethod: 'crypto_BTC', customerName: 'Paul Martin', customerEmail: 'paul.martin@example.com', customerAddress: '2 av Exemple, 69001 Lyon', items: [{ productId: 'prod-test-2', title: 'Pack Prompts', price: 29, quantity: 1 }], createdAt: '2026-08-25T14:30:00.000Z' }
  ];

  const seed = [
    ['dpf_app_v2_products', products],
    ['dpf_app_v2_orders', orders],
    ['dpf_app_v2_customers', [{ id: 'cust-1', name: 'Jeanne Dupont', email: 'jeanne.dupont@example.com' }]],
    ['df_stripe_whsec', 'whsec_test_secret_abc123'],
    ['df_stripe_mode', 'test'],
    ['df_stripe_currency', 'EUR'],
    ['df_crypto_btc', 'bc1qwgqg48zulnaxjzdhm4gms04m8xw83zf3u0xhcs'],
    ['df_crypto_eth', '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9'],
    ['dpf_app_v2_onboardingState', { completed: true, storeName: 'Nexus Digital Labs' }],
    ['dpf_app_v2_integrations', [
      { id: 'int-1', name: 'X (Twitter)', platform: 'x', connected: true },
      { id: 'int-2', name: 'Telegram', platform: 'telegram', connected: true },
      { id: 'int-3', name: 'Discord', platform: 'discord', connected: false }
    ]]
  ];

  for (const [k, v] of seed) {
    await sql`INSERT INTO key_value_store (key, value) VALUES (${k}, ${JSON.stringify(v)}::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }
  console.log('SEED_READY (catalogue, commandes PII, webhook, canaux)');
  await sql.end();

  // keep process alive
  setInterval(() => {}, 60_000);
} catch (e) {
  console.error('PG_FAIL', e);
  process.exit(1);
}
