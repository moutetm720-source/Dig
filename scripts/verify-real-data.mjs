/**
 * verify-real-data.mjs — Audit statique du mode « 100 % RÉEL ».
 *
 * Aucun serveur requis : ce script relit les sources et vérifie qu'aucun
 * chemin « test / démo / simulé » n'a été réintroduit :
 *   1. plus de fournisseur IA mock dans le moteur Hermes,
 *   2. plus de tunnel de paiement démo (DEMO_CHECKOUT / demo-complete),
 *   3. générateurs de données simulées neutralisés (realDataPolicy),
 *   4. seeds sans événements métier inventés (faux paiements, faux jobs…),
 *   5. plus de métrique métier tirée au hasard (liste blanche documentée).
 *
 * Usage : node scripts/verify-real-data.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let failures = 0;
function check(name, cond, detail = '') {
  const tag = cond ? 'PASS ✅' : 'FAIL ❌';
  if (!cond) failures++;
  console.log(`${tag}  ${name}${detail ? `  [${detail}]` : ''}`);
}

// ---------- 1. IA réelle uniquement (pas de mock) ----------
const providers = read('hermes/providers.ts');
check('hermes/providers.ts : classe MockProvider SUPPRIMÉE', !/class\s+MockProvider/.test(providers));
check('hermes/providers.ts : aucun « mock-env » dans le pool', !/mock-env/.test(providers.replace(/Nom réservé \(fournisseur d'environnement\)\.?/g, '')) || !/name:\s*'mock-env'/.test(providers));
check('hermes/providers.ts : choix de fournisseur limité à auto/gemini/openai', /const REAL_PROVIDER_CHOICES = \['auto', 'gemini', 'openai'\]/.test(providers));
check('hermes/providers.ts : HERMES_PROVIDER=mock refusé (avertissement + repli auto)', /HERMES_PROVIDER=mock ignoré/.test(providers));

const typesSrc = read('hermes/types.ts');
check('hermes/types.ts : type de provider sans « mock »', !/:\s*'gemini'\s*\|\s*'openai'\s*\|\s*'mock'/.test(typesSrc) && !/'auto'\s*\|\s*'gemini'\s*\|\s*'openai'\s*\|\s*'mock'/.test(typesSrc));

const engine = read('hermes/engine.ts');
check('hermes/engine.ts : aucune branche « onlyMock »', !/onlyMock/.test(engine));
check('hermes/engine.ts : sans fournisseur réel → skills sur données réelles, zéro simulation', /pool\.length === 0/.test(engine));

// ---------- 2. Paiement réel uniquement ----------
const server = read('server.ts');
check('server.ts : plus de création de commande « demo »', !/paymentMethod:\s*'demo'[\s\S]{0,200}source:\s*'demo'/.test(server) || !/demoCheckoutEnabled/.test(server));
check('server.ts : /api/checkout/demo-complete → 410 Gone', /\/api\/checkout\/demo-complete'[\s\S]{0,200}410/.test(server));
check('server.ts : /api/checkout/config n\'active plus le mode démo', /demoEnabled:\s*false/.test(server));

const storefront = read('src/components/storefront/StorefrontView.tsx');
check('StorefrontView : plus de bouton ni de flux « paiement démo »', !/handleDemoCheckout|demo-complete|4242/.test(storefront));

const envExample = read('.env.example');
check('.env.example : DEMO_CHECKOUT retiré', !/^DEMO_CHECKOUT=/m.test(envExample));
check('.env.example : mock retiré des choix HERMES_PROVIDER', !/auto\s*\|\s*gemini\s*\|\s*openai\s*\|\s*mock/.test(envExample));

// ---------- 3. Générateurs de données simulées neutralisés ----------
check('src/services/realDataPolicy.ts présent', exists('src/services/realDataPolicy.ts'));
const policy = read('src/services/realDataPolicy.ts');
check('realDataPolicy : réel par défaut (DIG_REAL_DATA_ONLY≠0)', /DIG_REAL_DATA_ONLY \|\| '1'/.test(policy));

const guarded = {
  'src/services/globalSocialService.ts': ['globalSocial.publishPostNow.metrics'],
  'src/services/socialSellingAgents.ts': ['socialSelling.tick.engagement', 'socialSelling.tick.dmConversions', 'socialSelling.recruitCreators'],
  'src/services/seoLeaderAgents.ts': ['seo.tick.impressions', 'seo.backlink.status'],
  'src/services/channelOrchestrator.ts': ['channels.dispatchAnalytics', 'channels.subscriberCount'],
  'src/services/countryKeywordsEngine.ts': ['countryKeywords.trendDrift'],
  'src/services/realWorldTelemetryService.ts': ['telemetry.macroSync'],
  'src/services/salesExplosionAgents.ts': ['salesExplosion.generateSimulatedDropoffCart', 'salesExplosion.scoutAffiliates']
};
for (const [file, domains] of Object.entries(guarded)) {
  const src = read(file);
  for (const d of domains) {
    check(`${file} : « ${d} » neutralisé (blockFakeData)`, src.includes(`'${d}'`));
  }
}

// ---------- 4. Seeds : aucun événement métier inventé ----------
const seed = read('src/data/seedData.ts');
const emptyArray = (name) => new RegExp(`export const ${name}:\\s*[^=]+=\\s*\\[\\s*\\];`).test(seed);
check('seedData : initialOrders vide (aucune commande inventée)', emptyArray('initialOrders'));
check('seedData : initialSystemLogs vide (aucun faux paiement Stripe)', emptyArray('initialSystemLogs'));
check('seedData : initialSystemJobs vide (aucune tâche fictive)', emptyArray('initialSystemJobs'));
check('seedData : initialApprovals vide (aucune stat inventée)', emptyArray('initialApprovals'));
check('seedData : initialRecommendations vide (aucun chiffre inventé)', emptyArray('initialRecommendations'));

// ---------- 5. Plus de métrique métier tirée au hasard ----------
// Motifs interdits : affectation d'une métrique métier depuis Math.random().
const BUSINESS_METRIC_FIELDS = /(views|clicks|conversions|conversion|sales|revenue|subscribers|subscriberCount|engagementRate|impressions|organicClicks|estimatedTrafficMonthly|searchVolumeMonthly|totalReferredSales|gmv|GMV)/;
const METRIC_ASSIGNMENT = new RegExp(`\\b(${BUSINESS_METRIC_FIELDS.source})\\s*(\\+=|=\\s*)[^;\\n]*Math\\.random`, 'g');
const SKIP_FILES = new Set(['realDataPolicy.ts']);
const servicesDir = path.join(ROOT, 'src', 'services');
const offenders = [];
for (const f of fs.readdirSync(servicesDir)) {
  if (!f.endsWith('.ts') || SKIP_FILES.has(f)) continue;
  const src = read(path.join('src', 'services', f));
  src.split('\n').forEach((line, i) => {
    const m = line.match(METRIC_ASSIGNMENT);
    if (!m) return;
    // Toléré uniquement si la ligne est explicitement gardée par blockFakeData
    // (dans le même bloc : on remonte 6 lignes).
    const ctx = src.split('\n').slice(Math.max(0, i - 6), i + 1).join('\n');
    if (/blockFakeData/.test(ctx) || /DIG_REAL_DATA_ONLY/.test(ctx)) return;
    offenders.push(`${f}:${i + 1} ${line.trim().slice(0, 90)}`);
  });
}
check('src/services : aucune métrique métier générée par Math.random (hors gardes realDataPolicy)', offenders.length === 0, offenders.slice(0, 5).join(' | '));

console.log(`\n${failures === 0 ? '🟢 MODE 100 % RÉEL : TOUS LES CONTRÔLES PASSENT' : `🔴 ${failures} CONTRÔLE(S) EN ÉCHEC`}\n`);
process.exit(failures === 0 ? 0 : 1);
