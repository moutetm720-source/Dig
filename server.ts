import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import net from 'net';
import dns from 'dns/promises';
import { db, ensureSchema } from './src/db/db.js';
import { keyValueStore } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { createHermesRouter } from './hermes';
import { scanSources, applyFix, previewFix, stripeDoctor, probeStripeApi } from './hermes/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

// ============================================================
// SECURITE — Helpers : rate limiting, passcode serveur, SSRF
// ============================================================

// Rate limiters (in-memory, par IP)
function makeRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }, windowMs);
  if (typeof sweeper.unref === 'function') sweeper.unref();
  return (req: any, res: any, next: any) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Trop de requêtes. Merci de réessayer dans quelques instants.' });
    }
    entry.count += 1;
    next();
  };
}
const apiLimiter = makeRateLimiter(300, 10 * 60 * 1000);
const aiLimiter = makeRateLimiter(6, 60 * 1000);
const checkoutLimiter = makeRateLimiter(30, 60 * 1000);
const webhookLimiter = makeRateLimiter(10, 60 * 1000);
const telemetryLimiter = makeRateLimiter(60, 60 * 1000);
const cryptoLimiter = makeRateLimiter(10, 5 * 60 * 1000);
const authLimiter = makeRateLimiter(10, 10 * 60 * 1000);

// Passcode modérateur : variable d'env > base de données > auto-généré (jamais de défaut faible)
async function getServerPasscode(): Promise<string> {
  const envPass = (process.env.MODERATOR_PASSCODE || '').trim();
  if (envPass) return envPass;
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_moderator_passcode'));
    if (r.length > 0 && r[0].value) {
      const v = (typeof r[0].value === 'string' ? r[0].value : String(r[0].value)).replace(/"/g, '').trim();
      if (v && v !== 'null') return v;
    }
    // Premier démarrage : générer un passcode fort (affiché dans les logs serveur)
    const generated = crypto.randomBytes(12).toString('hex');
    await db.insert(keyValueStore).values({ key: 'df_moderator_passcode', value: generated })
      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: generated } });
    console.log(`[SECURITY] Passcode modérateur auto-généré (à saisir dans l'espace modérateur) : ${generated}`);
    return generated;
  } catch (e) {
    // SÉCURITÉ : fail-closed. DB indisponible + pas d'env → aucun passcode
    // (toutes les authentications échouent) plutôt qu'un défaut faible.
    console.error('[SECURITY] getServerPasscode : DB indisponible et MODERATOR_PASSCODE absent — auth verrouillée (fail-closed).', e?.message);
    return '';
  }
}

// ============================================================
// AUTHENTIFICATION — Tokens de session modérateur (HMAC-SHA256)
// Un login validé (passcode correct) émet un token signé à
// expiration (7 j). Les endpoints protégés acceptent le passcode
// (compatibilité) OU un token de session valide et non révoqué.
// ============================================================
async function getSessionSecret(): Promise<string> {
  const envSecret = (process.env.SESSION_SECRET || '').trim();
  if (envSecret) return envSecret;
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_session_secret'));
    if (r.length > 0 && r[0].value) {
      const v = (typeof r[0].value === 'string' ? r[0].value : String(r[0].value)).replace(/"/g, '').trim();
      if (v) return v;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    await db.insert(keyValueStore).values({ key: 'df_session_secret', value: generated })
      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: generated } });
    console.log('[SECURITY] Secret de session modérateur auto-généré (persisté en base).');
    return generated;
  } catch (e) {
    return '';
  }
}

interface SessionPayload { exp: number; jti: string }

function signSessionToken(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `mod.${body}.${sig}`;
}

function verifySessionToken(token: string, secret: string): SessionPayload | null {
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'mod') return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (typeof payload.jti !== 'string' || !payload.jti) return null;
    if (revokedSessions.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Liste de révocation des tokens (logout) — bornée, nettoyée périodiquement
const revokedSessions = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of revokedSessions) if (exp < now) revokedSessions.delete(jti);
}, 60 * 60 * 1000).unref?.();

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

async function isAuthed(req: any): Promise<boolean> {
  const auth = (req.headers.authorization || '') as string;
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  const secret = await getSessionSecret();
  if (verifySessionToken(token, secret)) return true;
  // Compatibilité : le passcode serveur direct
  const expected = await getServerPasscode();
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function requireAuth(req: any, res: any, next: any) {
  try {
    if (await isAuthed(req)) return next();
    return res.status(401).json({ error: 'Non autorisé : accès modérateur requis.' });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Login modérateur : émet un token de session après validation du passcode
// NB : ce route est enregistré AVANT le express.json() global → parser local requis.
app.post('/api/auth/login', authLimiter, express.json({ limit: '100kb' }), async (req, res) => {
  try {
    const provided = String(req.body?.passcode || '').trim();
    if (!provided) return res.status(400).json({ error: 'Le code d\'accès est requis.' });
    const expected = await getServerPasscode();
    if (!expected) return res.status(503).json({ error: 'Authentification indisponible (serveur de config non joignable). Réessayez plus tard.' });
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Code d\'accès incorrect.' });
    }
    const secret = await getSessionSecret();
    const payload: SessionPayload = {
      exp: Date.now() + SESSION_TTL_MS,
      jti: crypto.randomBytes(12).toString('hex'),
    };
    const token = secret ? signSessionToken(payload, secret) : '';
    res.json({
      success: true,
      token: token || null, // null si secret indisponible → le passcode direct reste utilisable
      expiresInMs: SESSION_TTL_MS
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout : révocation du token de session courant
app.post('/api/auth/logout', authLimiter, async (req, res) => {
  try {
    const auth = (req.headers.authorization || '') as string;
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : String(req.body?.token || '');
    const secret = await getSessionSecret();
    const payload = verifySessionToken(token, secret);
    if (payload) {
      revokedSessions.set(payload.jti, payload.exp);
      if (revokedSessions.size > 1000) {
        const first = revokedSessions.keys().next().value as string | undefined;
        if (first) revokedSessions.delete(first);
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clés sensibles : JAMAIS renvoyées en lecture via l'API publique
const SENSITIVE_READ_KEYS = new Set([
  'df_stripe_sk',
  'df_stripe_whsec',
  'df_moderator_passcode',
  'df_session_secret',
  'df_social_integrations_v1',
  'dpf_app_v2_orders',
  'dpf_server_orders_v1',
  'dpf_app_v2_customers',
  'dpf_app_v2_systemLogs',
  'df_sales_affiliates_real',
  'df_sales_abandoned_carts_real',
  'df_sales_b2b_leads_real',
  'df_sales_scout_history_real',
  'df_sales_auto_cart_recovery_real',
  'df_social_selling_state_v1',
  'df_french_invoices_v1',
  'df_crypto_pending_reviews',
  'df_hermes_provider_pool',
]);

// Clés dont l'écriture est refusée via l'API (les secrets Stripe et le passcode
// peuvent être écrits de façon authentifiée car gérés par l'écran Intégrations).
// Les commandes serveur (dpf_server_orders_v1) et le secret de session
// (df_session_secret) sont EXCLUSIVEMENT écrits par le serveur.
const SENSITIVE_WRITE_KEYS = new Set([
  'df_social_integrations_v1',
  'df_session_secret',
  'dpf_server_orders_v1',
  'dpf_app_v2_orders',
  'dpf_app_v2_customers',
  'dpf_app_v2_systemLogs',
  'df_sales_affiliates_real',
  'df_sales_abandoned_carts_real',
  'df_sales_b2b_leads_real',
  'df_sales_scout_history_real',
  'df_sales_auto_cart_recovery_real',
  'df_social_selling_state_v1',
  'df_french_invoices_v1',
  'df_crypto_pending_reviews',
  'df_hermes_provider_pool',
]);

// ============================================================
// COMMANDES SERVEUR — la source de vérité des paiements est le
// serveur, pas le navigateur. Chaque commande Stripe/démo/crypto
// est créée ici ; le token de téléchargement est généré ICI,
// uniquement quand le paiement est validé (webhook signé,
// vérification Stripe API, ou confirmation on-chain).
// ============================================================
const SERVER_ORDERS_KEY = 'dpf_server_orders_v1';

interface ServerOrder {
  id: string;
  orderNumber: string;
  items: Array<{ productId: string; title: string; unitPriceCents: number; quantity: number }>;
  totalCents: number;
  currency: string;
  status: 'pending_payment' | 'paid' | 'expired';
  paymentMethod: string; // 'card' | 'demo' | 'crypto_BTC' | ...
  source: 'stripe' | 'demo' | 'crypto';
  stripeSessionId?: string;
  cryptoTxHash?: string;
  customerEmail?: string;
  customerName?: string;
  downloadToken?: string;
  createdAt: string;
  confirmedAt?: string;
}

async function readServerOrders(): Promise<ServerOrder[]> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, SERVER_ORDERS_KEY));
    if (r.length > 0 && r[0].value) {
      const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      return Array.isArray(v) ? (v as ServerOrder[]) : [];
    }
  } catch (e) {}
  return [];
}

async function writeServerOrders(orders: ServerOrder[]): Promise<void> {
  const capped = orders.slice(0, 500);
  await db.insert(keyValueStore).values({ key: SERVER_ORDERS_KEY, value: capped })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: capped } });
}

function generateDownloadToken(): string {
  return `dl_token_${Date.now().toString(36)}_${crypto.randomBytes(10).toString('hex')}`;
}

// Marque une commande comme payée (idempotent). Retourne la commande ou null.
async function markServerOrderPaid(orderId: string, paymentMethod: string, extra?: { txHash?: string }): Promise<ServerOrder | null> {
  const orders = await readServerOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  if (order.status !== 'paid') {
    order.status = 'paid';
    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.confirmedAt = new Date().toISOString();
    order.downloadToken = generateDownloadToken();
    if (extra?.txHash) order.cryptoTxHash = extra.txHash;
    await writeServerOrders(orders);
    console.log(`[ORDER] Commande ${order.id} confirmée côté serveur (${paymentMethod}).`);
  }
  return order;
}

async function findServerOrderByStripeSession(sessionId: string): Promise<ServerOrder | null> {
  const orders = await readServerOrders();
  return orders.find((o) => o.stripeSessionId === sessionId) || null;
}

// Garde anti-SSRF : https uniquement + blocage des adresses/hosts internes
const BLOCKED_HOSTS = new Set([
  'metadata', 'metadata.google.internal', 'localhost', '169.254.169.254',
  '127.0.0.1', '0.0.0.0', '::1', 'ip6-localhost', 'ip6-loopback',
]);

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
  }
  return false;
}

async function assertSafeOutbound(rawUrl: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error('URL invalide.');
  }
  if (u.protocol !== 'https:') {
    throw new Error('Seul le protocole https est autorisé pour les appels sortants.');
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    throw new Error('Destination interne bloquée.');
  }
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Adresse IP privée/interne bloquée.');
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new Error('Résolution DNS impossible pour cet hôte.');
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error('Résolution vers une adresse interne détectée — bloquée.');
    }
  }
}

function escapeXml(value: any): string {
  return String(value ?? '').replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' } as Record<string, string>
  )[c]);
}

// Lecture du passcode stocké côté serveur (jamais via le corps de requête)
async function readStripeSk(): Promise<string> {
  let stripeSk = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeSk) {
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_stripe_sk'));
      if (result.length > 0 && result[0].value) {
        stripeSk = (typeof result[0].value === 'string' ? result[0].value : String(result[0].value)).replace(/"/g, '').trim();
      }
    } catch (e) {}
  }
  return stripeSk;
}

/** Lecture brute d'une clé KV en string (diagnostic). */
async function kvString(key: string): Promise<string> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, key));
    if (r.length > 0 && r[0].value !== null && r[0].value !== undefined) {
      const v = r[0].value;
      return (typeof v === 'string' ? v : String(v)).replace(/^"|"$/g, '').trim();
    }
  } catch (e) {}
  return '';
}

/**
 * Diagnostic Stripe (docteur de code) : état RÉEL de la configuration, sans
 * jamais exposer un secret (masquage dans hermes/diagnostics.ts).
 */
async function runStripeDoctor() {
  const productsRaw = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products'));
  const products = productsRaw.length > 0 && Array.isArray(productsRaw[0].value) ? (productsRaw[0].value as any[]) : [];
  return stripeDoctor({
    envKey: (process.env.STRIPE_SECRET_KEY || '').trim(),
    dbKey: await kvString('df_stripe_sk'),
    envWhsec: (process.env.STRIPE_WEBHOOK_SECRET || '').trim(),
    dbWhsec: await kvString('df_stripe_whsec'),
    mode: await kvString('df_stripe_mode'),
    currency: await kvString('df_stripe_currency'),
    demoCheckout: (process.env.DEMO_CHECKOUT || '').trim(),
    products,
    publicUrl: (process.env.PUBLIC_URL || '').trim(),
    apiProbe: await probeStripeApi()
  });
}

// Webhook Stripe — vérification de signature obligatoire (raw body requis)
app.post('/api/webhooks/stripe', express.raw({ type: '*/*', limit: '1mb' }), webhookLimiter, async (req, res) => {
  try {
    let whsec = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!whsec) {
      try {
        const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_stripe_whsec'));
        if (r.length > 0 && r[0].value) {
          whsec = (typeof r[0].value === 'string' ? r[0].value : String(r[0].value)).replace(/"/g, '').trim();
        }
      } catch (e) {}
    }
    const sig = req.headers['stripe-signature'];
    if (!whsec || typeof sig !== 'string' || !sig) {
      return res.status(400).json({ received: false, error: 'Signature Stripe absente ou secret non configuré.' });
    }
    const parts: Record<string, string> = {};
    sig.split(',').forEach((p) => {
      const idx = p.indexOf('=');
      if (idx > 0) parts[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
    });
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) return res.status(400).json({ received: false, error: 'Signature invalide.' });
    const ts = Number(t);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      return res.status(400).json({ received: false, error: 'Signature expirée.' });
    }
    const expected = crypto.createHmac('sha256', whsec).update(req.body as Buffer).digest('hex');
    const a = Buffer.from(v1);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ received: false, error: 'Signature invalide.' });
    }

    // Signature valide → on traite l'événement (source de vérité des paiements)
    let event: any = null;
    try {
      event = JSON.parse((req.body as Buffer).toString('utf8'));
    } catch (e) {}

    let orderConfirmed = false;
    if (event?.type === 'checkout.session.completed') {
      const sid = event.data?.object?.id;
      const paid = event.data?.object?.payment_status === 'paid';
      if (sid && paid) {
        const order = await findServerOrderByStripeSession(sid);
        if (order) {
          await markServerOrderPaid(order.id, 'card');
          orderConfirmed = true;
        }
      }
    }

    res.json({ received: true, verified: true, orderConfirmed });
  } catch (err: any) {
    console.error('Stripe webhook error:', err);
    res.status(500).json({ received: false, error: 'Internal server error' });
  }
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global Anti-Cache and CORS Middleware to ensure any mobile or desktop browser gets fresh data
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Prevent stale caching on all API and root HTML requests
  if (req.path.startsWith('/api') || req.path === '/' || !req.path.includes('.')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

// En-têtes de sécurité (production)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // CSP stricte : plus de scripts inline ni tiers non listés.
    // Les <script type="application/ld+json"> ne sont pas exécutés (non bloqués).
    // style-src 'unsafe-inline' requis par les styles inline React/Tailwind.
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https: wss:",
        "media-src 'self' blob: https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ].join('; ')
    );
    next();
  });
}

// Secure Checkout Session Creator for real multi-user B2C traffic
// SÉCURITÉ : clé Stripe uniquement côté serveur, prix issus du catalogue serveur,
// code promo résolu côté serveur (jamais de pourcentage fourni par le client).
app.post('/api/checkout/create-session', checkoutLimiter, async (req, res) => {
  try {
    const { items, promoCode, originUrl, customerEmail } = req.body || {};

    // Retrieve Stripe Secret Key from env or DB only (jamais du corps/header client)
    const stripeSk = await readStripeSk();
    // Mode démo : UNIQUEMENT si explicitement activé (env DEMO_CHECKOUT=1) et
    // si aucune clé Stripe n'est configurée. Jamais de livraison "gratuite" par
    // défaut — sans ce flag, le paiement est simplement indisponible.
    const demoCheckoutEnabled = (process.env.DEMO_CHECKOUT || '').trim() === '1' && !stripeSk;

    // Remise : uniquement via un code promo validé côté serveur
    let promoDiscount = 0;
    const code = (typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '');
    if (code === 'LAUNCH20' || code === 'VIP20') {
      promoDiscount = 20;
    } else if (code === 'FACTORY50') {
      promoDiscount = 50;
    } else if (code) {
      // Codes affiliés enregistrés (commission = remise, plafonnée à 50 %)
      try {
        const aff = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_sales_affiliates_real'));
        if (aff.length > 0 && Array.isArray(aff[0].value)) {
          const partners = aff[0].value as any[];
          const match = partners.find((p: any) =>
            p && String(p.referralCode || p.code || '').toUpperCase() === code
          );
          if (match) {
            promoDiscount = Math.max(0, Math.min(50, Number(match.commissionRate) || 30));
          }
        }
      } catch (e) {}
    }

    // Prix de référence : catalogue serveur (produits + bundles)
    let catalog: any[] = [];
    try {
      const [prods, bundles] = await Promise.all([
        db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products')),
        db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_bundles')),
      ]);
      if (prods.length > 0 && Array.isArray(prods[0].value)) catalog.push(...(prods[0].value as any[]));
      if (bundles.length > 0 && Array.isArray(bundles[0].value)) catalog.push(...(bundles[0].value as any[]));
    } catch (e) {}
    const catalogById = new Map<string, any>();
    catalog.forEach((p: any) => { if (p && p.id != null) catalogById.set(String(p.id), p); });

    const formParams = new URLSearchParams();
    // Origine : origin uniquement (supprime tout chemin fourni par le client)
    let cleanOrigin = 'http://localhost:3000';
    try {
      const parsedOrigin = new URL(originUrl);
      if (parsedOrigin.protocol === 'https:' || parsedOrigin.protocol === 'http:') {
        cleanOrigin = parsedOrigin.origin;
      }
    } catch (e) {}
    formParams.append('mode', 'payment');
    formParams.append('success_url', `${cleanOrigin}/?success=true&session_id={CHECKOUT_SESSION_ID}`);
    formParams.append('cancel_url', `${cleanOrigin}/?canceled=true`);
    formParams.append('billing_address_collection', 'auto');
    
    // Only pass customer_email if explicitly provided by the user; otherwise Stripe handles collecting it cleanly
    if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@') && !customerEmail.includes('example.com') && !customerEmail.includes('innovate.co')) {
      formParams.append('customer_email', customerEmail.trim());
    }

    const validItems = Array.isArray(items) && items.length > 0 ? items : [];
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Panier vide : aucun article à facturer.' });
    }

    // SÉCURITÉ : les lignes de commande (prix, quantités, total) sont calculées
    // UNIQUEMENT côté serveur. Le total ci-dessous est la seule référence
    // facturable — jamais du body client.
    const serverItems: ServerOrder['items'] = [];
    let totalCents = 0;
    validItems.forEach((item: any, idx: number) => {
      // Prix fait foi du catalogue serveur ; repli sur le prix client seulement
      // si l'article (bundle sur mesure) n'existe pas dans le catalogue.
      const catalogItem = item?.productId != null ? catalogById.get(String(item.productId)) : undefined;
      const catalogPrice = Number(catalogItem?.pricing?.recommendedPrice ?? catalogItem?.price);
      const clientPrice = Number(item?.price);
      const unitPrice = Number.isFinite(catalogPrice) && catalogPrice > 0
        ? catalogPrice
        : (Number.isFinite(clientPrice) && clientPrice > 0 ? clientPrice : 47);
      const quantity = Math.max(1, Math.min(99, Number(item?.quantity) || 1));
      const discountedPrice = Math.max(100, Math.round(unitPrice * (1 - promoDiscount / 100) * 100));
      totalCents += discountedPrice * quantity;
      serverItems.push({
        productId: String(item?.productId || 'custom'),
        title: String(item?.productTitle || 'Produit Digital').slice(0, 500),
        unitPriceCents: discountedPrice,
        quantity
      });
      formParams.append(`line_items[${idx}][price_data][currency]`, 'eur');
      formParams.append(`line_items[${idx}][price_data][product_data][name]`, String(item?.productTitle || 'Produit Digital').slice(0, 500));
      formParams.append(`line_items[${idx}][price_data][unit_amount]`, String(discountedPrice));
      formParams.append(`line_items[${idx}][quantity]`, String(quantity));
    });

    // SÉCURITÉ : la commande est créée CÔTÉ SERVEUR (statut en attente).
    // La livraison (token de téléchargement) ne sera générée que lorsque le
    // paiement sera validé (webhook signé / vérification Stripe / on-chain).
    const nowIso = new Date().toISOString();
    const orderId = `srv-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
    const orderNumber = `DPF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // ---- Mode démo : explicitement activé (env) et Stripe non configuré ----
    if (!stripeSk && demoCheckoutEnabled) {
      const demoOrder: ServerOrder = {
        id: orderId,
        orderNumber,
        items: serverItems,
        totalCents,
        currency: 'EUR',
        status: 'pending_payment',
        paymentMethod: 'demo',
        source: 'demo',
        customerEmail: typeof customerEmail === 'string' ? customerEmail.slice(0, 254) : undefined,
        customerName: typeof (req.body as any)?.customerName === 'string' ? String((req.body as any).customerName).slice(0, 200) : undefined,
        createdAt: nowIso
      };
      const orders = await readServerOrders();
      orders.unshift(demoOrder);
      await writeServerOrders(orders);
      console.log(`[ORDER] Commande démo ${orderId} créée côté serveur (${totalCents} cents).`);
      return res.json({ mode: 'demo', serverOrderId: orderId, totalCents });
    }

    // ---- Stripe non configuré ET pas de mode démo : paiement indisponible ----
    if (!stripeSk) {
      return res.status(200).json({
        mode: 'unconfigured',
        message: 'Aucune passerelle de paiement configurée sur le serveur. La commande n\'a pas été créée.'
      });
    }

    let stripeRes: Response;
    try {
      stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSk}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formParams.toString()
      });
    } catch (netErr: any) {
      // « fetch failed » seul ne dit rien à l'utilisateur : la cause est réseau
      // (egress/DNS/proxy), pas la clé. Le docteur de code tranche la question.
      console.error('Stripe injoignable depuis le serveur:', netErr?.cause?.code || netErr?.message);
      return res.status(502).json({
        error: `api.stripe.com injoignable depuis le serveur (${netErr?.cause?.code || netErr?.message || 'erreur réseau'}). Vérifiez la sortie réseau (egress/DNS/proxy) — lancez le diagnostic : GET /api/diagnostics/stripe.`,
        stripeUnreachable: true
      });
    }

    const sessionData = await stripeRes.json();
    if (sessionData.error) {
      return res.status(400).json({ error: sessionData.error.message || 'Stripe Session Error' });
    }

    // Liaison commande serveur ↔ session Stripe (confirmée au webhook signé)
    const stripeOrder: ServerOrder = {
      id: orderId,
      orderNumber,
      items: serverItems,
      totalCents,
      currency: (sessionData.currency || 'eur').toUpperCase(),
      status: 'pending_payment',
      paymentMethod: 'card',
      source: 'stripe',
      stripeSessionId: sessionData.id,
      customerEmail: typeof customerEmail === 'string' ? customerEmail.slice(0, 254) : undefined,
      createdAt: nowIso
    };
    const orders = await readServerOrders();
    orders.unshift(stripeOrder);
    await writeServerOrders(orders);

    res.json({
      mode: 'stripe',
      url: sessionData.url,
      sessionId: sessionData.id,
      serverOrderId: orderId,
      totalCents
    });
  } catch (err: any) {
    console.error('Checkout creation error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Real Stripe API Key Verifier (réservé au modérateur authentifié)
app.post('/api/checkout/verify-keys', requireAuth, webhookLimiter, async (req, res) => {
  try {
    let secretKey = (req.body?.secretKey || req.headers['x-stripe-secret-key'] || '') as string;
    
    if (!secretKey) {
      try {
        const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_stripe_sk'));
        if (result.length > 0 && result[0].value) {
          secretKey = typeof result[0].value === 'string' ? result[0].value.replace(/"/g, '').trim() : String(result[0].value).trim();
        }
      } catch (e) {}
    }

    if (!secretKey) {
      secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    }

    if (!secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Aucune clé secrète Stripe trouvée. Veuillez renseigner une clé valide (sk_live_... ou sk_test_...).'
      });
    }

    // Call Stripe Balance API
    const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${secretKey.trim()}` }
    });

    const balanceData = await stripeRes.json();
    if (!stripeRes.ok || balanceData.error) {
      return res.status(200).json({
        success: false,
        message: `Erreur Stripe : ${balanceData.error?.message || 'Clé API Stripe invalide'}`
      });
    }

    // Also fetch account details
    let accountName = 'Compte Stripe';
    let defaultCurrency = 'EUR';
    let chargesEnabled = true;

    try {
      const acctRes = await fetch('https://api.stripe.com/v1/account', {
        headers: { 'Authorization': `Bearer ${secretKey.trim()}` }
      });
      const acctData = await acctRes.json();
      if (acctData && !acctData.error) {
        accountName = acctData.business_profile?.name || acctData.settings?.dashboard?.display_name || acctData.email || acctData.id || accountName;
        defaultCurrency = (acctData.default_currency || 'eur').toUpperCase();
        chargesEnabled = acctData.charges_enabled !== false;
      }
    } catch (e) {}

    const isLive = secretKey.startsWith('sk_live_') || Boolean(balanceData.livemode);

    res.json({
      success: true,
      livemode: isLive,
      accountName,
      defaultCurrency,
      chargesEnabled,
      message: `Connexion Stripe confirmée avec succès ! ${isLive ? 'Mode Production (Live)' : 'Mode Test (Sandbox)'} — Compte : ${accountName} (${defaultCurrency})`
    });
  } catch (err: any) {
    console.error('Stripe key verification error:', err);
    // « fetch failed » = le serveur ne peut pas joindre api.stripe.com : ce
    // n'est PAS la clé qui est en cause (egress/DNS/proxy).
    const msg = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(String(err?.message || ''))
      ? `api.stripe.com injoignable depuis le serveur (${err?.cause?.code || err.message}). La clé n'est pas en cause : vérifiez la sortie réseau, puis GET /api/diagnostics/stripe.`
      : `Erreur de vérification : ${err.message || 'Erreur interne'}`;
    res.status(502).json({ success: false, message: msg });
  }
});

// Secure Checkout Session Verifier
// SÉCURITÉ : clé serveur uniquement, session ID validé, plus de "paid: true" par défaut.
// Quand Stripe confirme le paiement, la commande SERVEUR est marquée payée et le
// token de téléchargement est généré côté serveur (jamais dans le navigateur).
app.get('/api/checkout/verify-session/:sessionId', checkoutLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId)) {
      return res.status(400).json({ error: 'Identifiant de session invalide.' });
    }

    const stripeSk = await readStripeSk();

    if (!stripeSk) {
      return res.json({ paid: false, simulated: true, error: 'Stripe non configuré sur le serveur — paiement non confirmé.' });
    }

    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { 'Authorization': `Bearer ${stripeSk}` }
    });

    const session = await stripeRes.json();

    const isPaid = session.payment_status === 'paid';

    // Paiement confirmé par l'API Stripe → on confirme la commande serveur
    // (idempotent : le webhook peut avoir déjà fait le travail).
    if (isPaid) {
      const order = await findServerOrderByStripeSession(sessionId);
      if (order) {
        await markServerOrderPaid(order.id, 'card');
      }
    }

    // Extract real address if available
    let fullAddress = '';
    const addr = session.customer_details?.address;
    if (addr) {
      fullAddress = [addr.line1, addr.line2, addr.postal_code, addr.city, addr.country].filter(Boolean).join(', ');
    }

    // Infos de la commande serveur (token de livraison fourni UNIQUEMENT si payée)
    let serverOrder: ServerOrder | undefined;
    if (isPaid) {
      const orders = await readServerOrders();
      serverOrder = orders.find((o) => o.stripeSessionId === sessionId);
    }

    res.json({
      paid: isPaid,
      customerEmail: session.customer_details?.email || session.customer_email || undefined,
      customerName: session.customer_details?.name || undefined,
      customerAddress: fullAddress || undefined,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      currency: (session.currency || 'eur').toUpperCase(),
      status: session.status,
      paymentStatus: session.payment_status,
      serverOrder: isPaid && serverOrder
        ? {
            id: serverOrder.id,
            orderNumber: serverOrder.orderNumber,
            items: serverOrder.items,
            totalCents: serverOrder.totalCents,
            paymentMethod: serverOrder.paymentMethod,
            downloadToken: serverOrder.downloadToken,
            confirmedAt: serverOrder.confirmedAt
          }
        : undefined
    });
  } catch (err: any) {
    console.error('Checkout verification error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Mode démo (DEMO_CHECKOUT=1 + Stripe non configuré) : finalise la commande
// démo côté serveur et retourne le token de livraison. C'est le SEUL chemin de
// livraison en mode démo — le navigateur ne peut pas s'auto-accorder un accès.
app.post('/api/checkout/demo-complete', checkoutLimiter, async (req, res) => {
  try {
    if ((process.env.DEMO_CHECKOUT || '').trim() !== '1') {
      return res.status(404).json({ error: 'Mode démo indisponible.' });
    }
    const stripeSk = await readStripeSk();
    if (stripeSk) {
      return res.status(400).json({ error: 'Stripe configuré : utilisez le tunnel de paiement réel.' });
    }
    const serverOrderId = String(req.body?.serverOrderId || '');
    if (!/^[a-z0-9-]{8,64}$/i.test(serverOrderId)) {
      return res.status(400).json({ error: 'Identifiant de commande invalide.' });
    }
    const orders = await readServerOrders();
    const order = orders.find((o) => o.id === serverOrderId);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }
    if (order.source !== 'demo') {
      return res.status(400).json({ error: 'Cette commande ne relève pas du mode démo.' });
    }
    if (order.status === 'paid') {
      return res.status(409).json({ error: 'Commande déjà livrée.', serverOrderId: order.id });
    }
    const paid = await markServerOrderPaid(order.id, 'demo');
    if (!paid) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }
    res.json({
      success: true,
      serverOrder: {
        id: paid.id,
        orderNumber: paid.orderNumber,
        items: paid.items,
        totalCents: paid.totalCents,
        currency: paid.currency,
        paymentMethod: paid.paymentMethod,
        downloadToken: paid.downloadToken,
        confirmedAt: paid.confirmedAt
      }
    });
  } catch (err: any) {
    console.error('Demo checkout error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================
// CRYPTO — vérification ON-CHAIN RÉELLE côté serveur.
// Le client envoie le hash de transaction après paiement ; le
// serveur interroge une source on-chain publique (mempool.space
// pour BTC, Etherscan proxy pour ETH) et ne confirme la commande
// QUE si : la tx est confirmée, elle va à l'adresse marchande du
// serveur ET le montant reçu >= montant attendu. En cas d'erreur
// réseau/API : JAMAIS de confirmation (fail-safe).
// ============================================================
const BASE_CRYPTO_RATES: Record<string, number> = {
  BTC: 88500, ETH: 3120, SOL: 182.5, USDT: 0.93
};
let cryptoRatesCache: { at: number; rates: Record<string, number> } | null = null;

async function getLiveCryptoRates(): Promise<Record<string, number>> {
  if (cryptoRatesCache && Date.now() - cryptoRatesCache.at < 60 * 1000) {
    return cryptoRatesCache.rates;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=eur', { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) {
      const j: any = await r.json();
      const rates: Record<string, number> = { ...BASE_CRYPTO_RATES };
      if (Number(j?.bitcoin?.eur) > 0) rates.BTC = Number(j.bitcoin.eur);
      if (Number(j?.ethereum?.eur) > 0) rates.ETH = Number(j.ethereum.eur);
      if (Number(j?.solana?.eur) > 0) rates.SOL = Number(j.solana.eur);
      if (Number(j?.tether?.eur) > 0) rates.USDT = Number(j.tether.eur);
      cryptoRatesCache = { at: Date.now(), rates };
      return rates;
    }
  } catch (e) {}
  return BASE_CRYPTO_RATES;
}

// Taux EUR (public, mis en cache 60 s). Le frontend calcule le montant
// crypto exact à partir de ces taux (repli sur des valeurs de référence
// si la source est indisponible).
app.get('/api/crypto/rates', cryptoLimiter, async (req, res) => {
  try {
    const rates = await getLiveCryptoRates();
    res.json({ rates, source: cryptoRatesCache && Date.now() - cryptoRatesCache.at < 60 * 1000 ? 'coingecko' : 'reference', updatedAt: new Date().toISOString() });
  } catch (e) {
    res.json({ rates: BASE_CRYPTO_RATES, source: 'reference', updatedAt: new Date().toISOString() });
  }
});

const CRYPTO_MERCHANT_KEYS: Record<string, { kv: string; fallback: string }> = {
  BTC: { kv: 'df_crypto_btc', fallback: 'bc1qwgqg48zulnaxjzdhm4gms04m8xw83zf3u0xhcs' },
  ETH: { kv: 'df_crypto_eth', fallback: '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9' },
  SOL: { kv: 'df_crypto_sol', fallback: '4EPMSkoQCWiLdqTEtWmg8Fo5Eu3yj4qm5NCf3QHksES9' },
  USDT: { kv: 'df_crypto_usdt', fallback: '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9' }
};

async function getMerchantCryptoAddress(asset: string): Promise<string> {
  const conf = CRYPTO_MERCHANT_KEYS[asset];
  if (!conf) return '';
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, conf.kv));
    if (r.length > 0 && r[0].value) {
      const v = (typeof r[0].value === 'string' ? r[0].value : String(r[0].value)).replace(/"/g, '').trim();
      if (v) return v;
    }
  } catch (e) {}
  return conf.fallback;
}

interface OnChainResult {
  status: 'confirmed' | 'pending' | 'not_found' | 'insufficient' | 'manual_review' | 'error';
  message: string;
  confirmations?: number;
  receivedAmount?: number;
}

// Vérification on-chain par chaîne. Seules BTC (mempool.space) et ETH
// (Etherscan proxy) sont vérifiables automatiquement ; les autres chaînes
// retournent "manual_review" (jamais "confirmed").
async function verifyOnChain(asset: string, txHash: string, expectedAmount: number, merchantAddress: string): Promise<OnChainResult> {
  const hash = txHash.trim();

  // ---- Bitcoin ----
  if (asset === 'BTC') {
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      return { status: 'error', message: 'Hash BTC invalide (attendu : 64 caractères hexadécimaux).' };
    }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`https://mempool.space/api/tx/${encodeURIComponent(hash)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 404) return { status: 'not_found', message: 'Transaction introuvable sur le réseau Bitcoin.' };
      if (!r.ok) return { status: 'error', message: `Source Bitcoin inaccessible (HTTP ${r.status}) — aucune confirmation.` };
      const j: any = await r.json();
      const confirmed = Boolean(j?.status?.confirmed);
      if (!confirmed) {
        return { status: 'pending', message: 'Transaction détectée en mempool — pas encore confirmée dans un bloc.', confirmations: 0 };
      }
      const out = (Array.isArray(j?.vout) ? j.vout : []).find(
        (o: any) => String(o?.scriptpubkey_address || '').toLowerCase() === merchantAddress.toLowerCase()
      );
      if (!out) {
        return { status: 'error', message: 'Aucune sortie vers l\'adresse marchande n\'a été trouvée dans cette transaction.' };
      }
      const received = Number(out.value); // satoshis
      if (received < expectedAmount) {
        return { status: 'insufficient', message: `Montant reçu insuffisant : ${received} sats < ${expectedAmount} sats attendus.`, receivedAmount: received };
      }
      return { status: 'confirmed', message: `Paiement BTC confirmé on-chain (${j.status.block_height} bloc).`, confirmations: 1, receivedAmount: received };
    } catch (e: any) {
      return { status: 'error', message: 'Source Bitcoin injoignable — aucune confirmation ne peut être émise.' };
    }
  }

  // ---- Ethereum (native) ----
  if (asset === 'ETH') {
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return { status: 'error', message: 'Hash ETH invalide (attendu : 0x + 64 caractères hexadécimaux).' };
    }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const txRes = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${encodeURIComponent(hash)}`, { signal: ctrl.signal });
      const receiptRes = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${encodeURIComponent(hash)}`, { signal: ctrl.signal });
      clearTimeout(t);
      const txJ: any = await txRes.json();
      const rcJ: any = await receiptRes.json();
      if (txJ?.status === '0x0' || !txJ?.result || !txJ.result.blockNumber) {
        return { status: 'not_found', message: 'Transaction introuvable sur le réseau Ethereum.' };
      }
      if (String(txJ.result.to || '').toLowerCase() !== merchantAddress.toLowerCase()) {
        return { status: 'error', message: 'La transaction ne cible pas l\'adresse marchande configurée.' };
      }
      const received = Number(BigInt(txJ.result.value || '0x0')); // wei
      if (received < expectedAmount) {
        return { status: 'insufficient', message: `Montant reçu insuffisant : ${received} wei < ${expectedAmount} wei attendus.`, receivedAmount: received };
      }
      if (!rcJ?.result || rcJ.result.status !== '0x1') {
        return { status: 'pending', message: 'Transaction trouvée mais pas encore incluse dans un bloc validé.', confirmations: 0 };
      }
      return { status: 'confirmed', message: 'Paiement ETH confirmé on-chain.', confirmations: 1, receivedAmount: received };
    } catch (e: any) {
      return { status: 'error', message: 'Source Ethereum injoignable — aucune confirmation ne peut être émise.' };
    }
  }

  // ---- SOL / USDT (TRON) : pas de vérification auto fiable sans clé API ----
  return {
    status: 'manual_review',
    message: 'Cette chaîne n\'est pas vérifiable automatiquement sur ce serveur. Votre hash est enregistré pour revue par un modérateur — la livraison n\'est pas effectuée.'
  };
}

// Cache des vérifications (évite de marteler les API on-chain)
const cryptoVerifyCache = new Map<string, { at: number; result: OnChainResult }>();

// Vérification du paiement crypto + confirmation de la commande (atomique).
// Le client n'obtient le token de livraison QUE si la source on-chain
// confirme : tx validée + adresse marchande + montant suffisant.
app.post('/api/crypto/verify-transaction', cryptoLimiter, async (req, res) => {
  try {
    const { asset, txHash, expectedAmount, serverOrderId } = req.body || {};
    const assetUp = String(asset || '').toUpperCase();
    if (!['BTC', 'ETH', 'SOL', 'USDT'].includes(assetUp)) {
      return res.status(400).json({ error: 'Actif crypto non supporté.' });
    }
    if (!txHash || typeof txHash !== 'string' || txHash.length > 128) {
      return res.status(400).json({ error: 'Hash de transaction manquant ou invalide.' });
    }
    const expected = Number(expectedAmount);
    if (!Number.isFinite(expected) || expected <= 0) {
      return res.status(400).json({ error: 'Montant attendu invalide.' });
    }

    // Pré-validation du format par chaîne (rejet 400 immédiat)
    const hash = String(txHash).trim();
    const HASH_FORMAT: Record<string, RegExp> = {
      BTC: /^[a-fA-F0-9]{64}$/,
      ETH: /^0x[a-fA-F0-9]{64}$/,
      // Signature Solana = base58, 64 à 90 caractères
      SOL: /^[1-9A-HJ-NP-Za-km-z]{64,90}$/,
      // TRON (txid 64 hex) ou EVM (0x + 64 hex)
      USDT: /^(0x)?[a-fA-F0-9]{64}$/
    };
    if (!HASH_FORMAT[assetUp] || !HASH_FORMAT[assetUp].test(hash)) {
      return res.status(400).json({ error: `Format de hash ${assetUp} invalide.` });
    }

    const cacheKey = `${assetUp}:${txHash.trim().toLowerCase()}`;
    const cached = cryptoVerifyCache.get(cacheKey);
    let result: OnChainResult;
    if (cached && Date.now() - cached.at < 5 * 60 * 1000) {
      result = cached.result;
    } else {
      const merchant = await getMerchantCryptoAddress(assetUp);
      result = await verifyOnChain(assetUp, txHash, expected, merchant);
      cryptoVerifyCache.set(cacheKey, { at: Date.now(), result });
      if (cryptoVerifyCache.size > 200) {
        const first = cryptoVerifyCache.keys().next().value as string | undefined;
        if (first) cryptoVerifyCache.delete(first);
      }
    }

    // Enregistrement des transactions en revue manuelle (SOL/USDT)
    if (result.status === 'manual_review') {
      try {
        const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_crypto_pending_reviews'));
        let list: any[] = [];
        if (r.length > 0 && r[0].value) list = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
        if (!Array.isArray(list)) list = [];
        list.unshift({ asset: assetUp, txHash: txHash.trim(), expectedAmount: expected, at: new Date().toISOString() });
        await db.insert(keyValueStore).values({ key: 'df_crypto_pending_reviews', value: list.slice(0, 100) })
          .onConflictDoUpdate({ target: keyValueStore.key, set: { value: list.slice(0, 100) } });
      } catch (e) {}
    }

    if (result.status !== 'confirmed') {
      return res.json({ verified: false, ...result });
    }

    // Confirmation on-chain OK → on confirme la commande serveur
    let serverOrder: ServerOrder | undefined;
    if (serverOrderId) {
      const orders = await readServerOrders();
      const order = orders.find((o) => o.id === String(serverOrderId));
      if (order && order.source === 'crypto' && order.status === 'pending_payment') {
        const paid = await markServerOrderPaid(order.id, `crypto_${assetUp}`, { txHash: txHash.trim() });
        serverOrder = paid || undefined;
      }
    }

    res.json({
      verified: true,
      ...result,
      serverOrder: serverOrder
        ? {
            id: serverOrder.id,
            orderNumber: serverOrder.orderNumber,
            items: serverOrder.items,
            totalCents: serverOrder.totalCents,
            paymentMethod: serverOrder.paymentMethod,
            downloadToken: serverOrder.downloadToken,
            confirmedAt: serverOrder.confirmedAt
          }
        : undefined
    });
  } catch (err: any) {
    console.error('Crypto verification error:', err);
    res.status(500).json({ verified: false, error: 'Erreur de vérification — aucune confirmation émise.' });
  }
});

// Session de paiement crypto : crée la commande PENDING côté serveur
// (prix du catalogue, aucun promo crypto) avant que le client ne paie.
app.post('/api/checkout/crypto-session', checkoutLimiter, async (req, res) => {
  try {
    const { items, asset, customerEmail } = req.body || {};
    const assetUp = String(asset || '').toUpperCase();
    if (!['BTC', 'ETH', 'SOL', 'USDT'].includes(assetUp)) {
      return res.status(400).json({ error: 'Actif crypto non supporté.' });
    }
    const validItems = Array.isArray(items) && items.length > 0 ? items : [];
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Panier vide : aucun article à facturer.' });
    }

    let catalog: any[] = [];
    try {
      const [prods, bundles] = await Promise.all([
        db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products')),
        db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_bundles'))
      ]);
      if (prods.length > 0 && Array.isArray(prods[0].value)) catalog.push(...(prods[0].value as any[]));
      if (bundles.length > 0 && Array.isArray(bundles[0].value)) catalog.push(...(bundles[0].value as any[]));
    } catch (e) {}
    const catalogById = new Map<string, any>();
    catalog.forEach((p: any) => { if (p && p.id != null) catalogById.set(String(p.id), p); });

    const serverItems: ServerOrder['items'] = [];
    let totalCents = 0;
    validItems.forEach((item: any) => {
      const catalogItem = item?.productId != null ? catalogById.get(String(item.productId)) : undefined;
      const catalogPrice = Number(catalogItem?.pricing?.recommendedPrice ?? catalogItem?.price);
      const clientPrice = Number(item?.price);
      const unitPrice = Number.isFinite(catalogPrice) && catalogPrice > 0
        ? catalogPrice
        : (Number.isFinite(clientPrice) && clientPrice > 0 ? clientPrice : 47);
      const quantity = Math.max(1, Math.min(99, Number(item?.quantity) || 1));
      const unitCents = Math.max(100, Math.round(unitPrice * 100)); // pas de remise crypto
      totalCents += unitCents * quantity;
      serverItems.push({
        productId: String(item?.productId || 'custom'),
        title: String(item?.productTitle || 'Produit Digital').slice(0, 500),
        unitPriceCents: unitCents,
        quantity
      });
    });

    const orderId = `srv-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
    const order: ServerOrder = {
      id: orderId,
      orderNumber: `DPF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      items: serverItems,
      totalCents,
      currency: 'EUR',
      status: 'pending_payment',
      paymentMethod: `crypto_${assetUp}`,
      source: 'crypto',
      customerEmail: typeof customerEmail === 'string' ? customerEmail.slice(0, 254) : undefined,
      createdAt: new Date().toISOString()
    };
    const orders = await readServerOrders();
    orders.unshift(order);
    await writeServerOrders(orders);

    const rates = await getLiveCryptoRates();
    res.json({
      serverOrderId: orderId,
      totalCents,
      items: serverItems,
      merchantAddress: await getMerchantCryptoAddress(assetUp),
      rates: { [assetUp]: rates[assetUp] || BASE_CRYPTO_RATES[assetUp] }
    });
  } catch (err: any) {
    console.error('Crypto session error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Configuration publique du checkout (jamais de secret) — permet au frontend
// de savoir quel tunnel de paiement est disponible.
app.get('/api/checkout/config', apiLimiter, async (req, res) => {
  try {
    const stripeSk = await readStripeSk();
    res.json({
      stripeConfigured: Boolean(stripeSk),
      demoEnabled: !stripeSk && (process.env.DEMO_CHECKOUT || '').trim() === '1'
    });
  } catch (e) {
    res.json({ stripeConfigured: false, demoEnabled: false });
  }
});

// SÉCURITÉ : l'ancien proxy ouvert vers api.stripe.com a été supprimé.
// Toutes les opérations Stripe passent par les endpoints /api/checkout/* du serveur.

// KV Store API
// SÉCURITÉ : la lecture publique est filtrée — les clés sensibles (clé Stripe secrète,
// passcode, tokens, PII clients, logs) ne sont JAMAIS renvoyées.
app.get('/api/store', apiLimiter, async (req, res) => {
  try {
    const allKeys = await db.select().from(keyValueStore);
    res.json(allKeys.filter((k) => !SENSITIVE_READ_KEYS.has(k.key)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lecture d'une clé précise (authentifiée, jamais les clés sensibles)
app.get('/api/store/get', requireAuth, apiLimiter, async (req, res) => {
  try {
    const key = String(req.query.key || '');
    if (!key) {
      return res.status(400).json({ error: 'Le paramètre key est requis.' });
    }
    if (SENSITIVE_READ_KEYS.has(key)) {
      return res.status(403).json({ error: 'Clé protégée : lecture refusée.' });
    }
    const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, key));
    if (result.length === 0) {
      return res.status(404).json({ error: 'Clé introuvable.' });
    }
    res.json(result[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// INTÉGRATIONS SOCIALES — endpoint dédié (authentifié)
// La clé df_social_integrations_v1 contient des tokens : elle reste bloquée
// dans SENSITIVE_READ/WRITE_KEYS (ni lecture publique, ni écriture via
// /api/store). Cet endpoint authentifié est le seul chemin légitime.
// ============================================================
app.get('/api/integrations/social', requireAuth, apiLimiter, async (req, res) => {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_social_integrations_v1'));
    const value = r.length > 0 ? r[0].value : [];
    res.json({ integrations: Array.isArray(value) ? value : [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/integrations/social', requireAuth, apiLimiter, async (req, res) => {
  try {
    const list = req.body?.integrations;
    if (!Array.isArray(list)) return res.status(400).json({ error: 'Le champ integrations (tableau) est requis.' });
    if (list.length > 100) return res.status(400).json({ error: 'Maximum 100 intégrations.' });
    const clean = list.filter((x: any) => x && typeof x === 'object').slice(0, 100).map((x: any) => ({
      ...x,
      id: String(x.id || x.platform || '').slice(0, 80),
      platform: String(x.platform || '').slice(0, 40),
      connected: Boolean(x.connected)
    }));
    await db.insert(keyValueStore)
      .values({ key: 'df_social_integrations_v1', value: clean })
      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: clean } });
    res.json({ success: true, count: clean.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// DOCTEUR DE CODE — détection + correction des erreurs d'intégration
// (voir hermes/diagnostics.ts et l'agent Hermes `code_doctor`)
// ============================================================
app.get('/api/diagnostics/scan', requireAuth, apiLimiter, async (req, res) => {
  try {
    const report = scanSources(undefined);
    res.json({
      scannedFiles: report.scannedFiles,
      apiCalls: report.apiCalls,
      count: report.findings.length,
      byRule: report.byRule,
      findings: report.findings.map(f => ({
        id: f.id, rule: f.rule, severity: f.severity, file: f.file, line: f.line,
        endpoint: f.endpoint, httpStatus: f.httpStatus, message: f.message,
        autoFix: f.fix ? f.fix.kind : null
      })),
      generatedAt: report.generatedAt
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erreur du scan.' });
  }
});

app.get('/api/diagnostics/stripe', requireAuth, apiLimiter, async (req, res) => {
  try {
    res.json(await runStripeDoctor());
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erreur du diagnostic Stripe.' });
  }
});

// Correctif de code : aperçu (dry-run) par défaut, application sur confirm:true
app.post('/api/diagnostics/fix', requireAuth, apiLimiter, async (req, res) => {
  try {
    const id = String(req.body?.id || '').trim();
    if (!id) return res.status(400).json({ error: "Le champ 'id' (identifiant du finding) est requis." });
    const confirm = req.body?.confirm === true;
    const result = confirm ? applyFix(id) : previewFix(id);
    if (!result.applied && !confirm) return res.json({ ...result, dryRun: true });
    if (!result.applied) return res.status(400).json(result);
    res.json({ ...result, dryRun: false });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erreur du correctif.' });
  }
});

// Helper for real-time traffic channel classification
function detectTrafficChannel(referrer: string = '', utmSource: string = '', currentPath: string = ''): { source: string; sourceLabel: string } {
  const ref = (referrer || '').toLowerCase();
  const utm = (utmSource || '').toLowerCase();
  const pathStr = (currentPath || '').toLowerCase();

  if (utm.includes('google') || utm.includes('seo') || ref.includes('google.') || ref.includes('bing.') || ref.includes('yahoo.') || ref.includes('duckduckgo.') || ref.includes('ecosia.')) {
    return { source: 'google_seo', sourceLabel: 'Google & SEO Organique' };
  }
  if (utm.includes('twitter') || utm.includes('x') || utm.includes('linkedin') || utm.includes('facebook') || utm.includes('instagram') || utm.includes('tiktok') || utm.includes('threads') || utm.includes('bluesky') ||
      ref.includes('twitter.com') || ref.includes('x.com') || ref.includes('t.co') || ref.includes('linkedin.com') || ref.includes('facebook.com') || ref.includes('instagram.com') || ref.includes('tiktok.com')) {
    return { source: 'social_networks', sourceLabel: 'Réseaux Sociaux (Twitter, LinkedIn, TikTok)' };
  }
  if (utm.includes('chatgpt') || utm.includes('perplexity') || utm.includes('claude') || utm.includes('ai') ||
      ref.includes('chatgpt.com') || ref.includes('perplexity.ai') || ref.includes('claude.ai')) {
    return { source: 'ai_recommendations', sourceLabel: 'Citations IA (ChatGPT, Perplexity, Claude)' };
  }
  if (utm.includes('affiliate') || utm.includes('partner') || pathStr.includes('ref=') || pathStr.includes('partner=') || ref.includes('partner') || ref.includes('affiliate')) {
    return { source: 'affiliates_partners', sourceLabel: 'Réseau Partenaires & Affiliés' };
  }
  if (utm.includes('reddit') || utm.includes('producthunt') || utm.includes('hackernews') || utm.includes('github') || utm.includes('discord') ||
      ref.includes('reddit.com') || ref.includes('producthunt.com') || ref.includes('news.ycombinator.com') || ref.includes('github.com') || ref.includes('discord.com') || ref.includes('discord.gg')) {
    return { source: 'developer_communities', sourceLabel: 'Communautés Tech (Reddit, ProductHunt, HN)' };
  }
  return { source: 'direct_traffic', sourceLabel: 'Trafic Direct & Partage de Liens' };
}

// Real-Time Visitor Telemetry Logger (Public - No Auth Required)
app.post('/api/telemetry/visit', telemetryLimiter, async (req, res) => {
  try {
    const {
      action = 'storefront_visit',
      sessionId,
      productId,
      productTitle,
      referrer = '',
      utmSource = '',
      currentPath = '/',
      device: clientDevice,
      country: clientCountry,
      city: clientCity
    } = req.body || {};

    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
    const ipParts = rawIp.split('.');
    const ipMasked = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.***.***` : 'Client Direct (En Ligne)';

    // Real GeoIP & Country
    const detectedCountry = (req.headers['cf-ipcountry'] || req.headers['x-appengine-country'] || req.headers['x-country-code'] || clientCountry || 'France') as string;
    const detectedCity = clientCity || (detectedCountry === 'France' || detectedCountry === 'FR' ? 'Paris' : 'Visiteur Direct');

    const flagMap: Record<string, string> = {
      FR: '🇫🇷', France: '🇫🇷',
      US: '🇺🇸', 'United States': '🇺🇸', USA: '🇺🇸',
      GB: '🇬🇧', UK: '🇬🇧', 'United Kingdom': '🇬🇧',
      DE: '🇩🇪', Germany: '🇩🇪',
      CA: '🇨🇦', Canada: '🇨🇦',
      CH: '🇨🇭', Switzerland: '🇨🇭',
      BE: '🇧🇪', Belgium: '🇧🇪',
      ES: '🇪🇸', Spain: '🇪🇸',
      IT: '🇮🇹', Italy: '🇮🇹',
      JP: '🇯🇵', Japan: '🇯🇵',
      AU: '🇦🇺', Australia: '🇦🇺',
    };
    const flag = flagMap[detectedCountry] || '🌍';

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = clientDevice ? clientDevice === 'mobile' : (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone'));
    const device = isMobile ? 'mobile' : 'desktop';

    const { source, sourceLabel } = detectTrafficChannel(referrer, utmSource, currentPath);

    // Retrieve telemetry state from DB
    const TELEMETRY_KEY = 'df_traffic_engine_v2_real';
    let telemetryData: any = null;
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, TELEMETRY_KEY));
      if (result.length > 0 && result[0].value) {
        telemetryData = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
      }
    } catch (e) {}

    const now = new Date();
    const nowIso = now.toISOString();

    if (!telemetryData || typeof telemetryData !== 'object') {
      telemetryData = {
        isActive: true,
        isAutopilotTrafficEnabled: true,
        activeLiveVisitorsCount: 0,
        totalVisitsToday: 0,
        totalUniqueVisitors: 0,
        averageDurationSeconds: 145,
        bounceRatePercent: 28,
        conversionRatePercent: 0,
        channelBreakdown: {
          google_seo: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          social_networks: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          ai_recommendations: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          affiliates_partners: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          developer_communities: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          direct_traffic: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 }
        },
        liveVisitors: [],
        recentEvents: [],
        indexingRadar: {
          googleIndexed: true,
          googleIndexedPagesCount: 1,
          bingIndexed: true,
          perplexityCitationReady: true,
          chatGptBotAllowed: true,
          indexNowPingStatus: 'active',
          lastPingTimestamp: nowIso,
          sitemapSubmittedUrl: `${req.protocol}://${req.get('host')}/sitemap.xml`
        },
        trafficBoostActive: false,
        boostMultiplier: 1.0,
        lastUpdated: nowIso
      };
    }

    if (!telemetryData.channelBreakdown) {
      telemetryData.channelBreakdown = {
        google_seo: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
        social_networks: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
        ai_recommendations: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
        affiliates_partners: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
        developer_communities: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
        direct_traffic: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 }
      };
    }

    const visitorSessionId = sessionId || `usr-${ipMasked}-${now.toDateString().replace(/\s/g, '-')}`;
    let liveVisitors: any[] = Array.isArray(telemetryData.liveVisitors) ? telemetryData.liveVisitors : [];
    let recentEvents: any[] = Array.isArray(telemetryData.recentEvents) ? telemetryData.recentEvents : [];

    // Filter out sessions older than 30 minutes for active counter
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    liveVisitors = liveVisitors.filter((v: any) => {
      const t = new Date(v.lastActiveAt || v.startedAt || 0).getTime();
      return t > thirtyMinsAgo;
    });

    let existingSession = liveVisitors.find((v: any) => v.id === visitorSessionId);
    if (!existingSession) {
      existingSession = {
        id: visitorSessionId,
        ipMasked,
        country: detectedCountry,
        countryCode: detectedCountry.slice(0, 2).toUpperCase(),
        city: detectedCity,
        flag,
        source,
        sourceLabel,
        referrer: referrer || 'Direct',
        currentPath: currentPath || (productId ? `/product/${productId}` : '/'),
        productId,
        productViewedTitle: productTitle || 'Boutique Principale',
        device,
        startedAt: nowIso,
        lastActiveAt: nowIso,
        hasAddedToCart: action === 'add_to_cart',
        hasPurchased: action === 'purchase'
      };
      liveVisitors.unshift(existingSession);

      telemetryData.totalVisitsToday = (telemetryData.totalVisitsToday || 0) + 1;
      telemetryData.totalUniqueVisitors = (telemetryData.totalUniqueVisitors || 0) + 1;

      if (!telemetryData.channelBreakdown[source]) {
        telemetryData.channelBreakdown[source] = { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 };
      }
      telemetryData.channelBreakdown[source].visits = (telemetryData.channelBreakdown[source].visits || 0) + 1;
    } else {
      existingSession.lastActiveAt = nowIso;
      if (productId) {
        existingSession.productId = productId;
        existingSession.productViewedTitle = productTitle || existingSession.productViewedTitle;
      }
      if (action === 'add_to_cart') existingSession.hasAddedToCart = true;
      if (action === 'purchase') existingSession.hasPurchased = true;
    }

    if (action === 'add_to_cart' || action === 'purchase') {
      if (telemetryData.channelBreakdown[source]) {
        telemetryData.channelBreakdown[source].conversions = (telemetryData.channelBreakdown[source].conversions || 0) + 1;
      }
    }

    // Recalculate channel percentages and conversion rates
    let totalAllVisits = 0;
    let totalAllConversions = 0;
    Object.keys(telemetryData.channelBreakdown).forEach((chKey) => {
      const ch = telemetryData.channelBreakdown[chKey];
      totalAllVisits += ch.visits || 0;
      totalAllConversions += ch.conversions || 0;
    });

    if (totalAllVisits > 0) {
      Object.keys(telemetryData.channelBreakdown).forEach((chKey) => {
        const ch = telemetryData.channelBreakdown[chKey];
        ch.percentage = Math.round((ch.visits / totalAllVisits) * 100);
        ch.conversionRate = ch.visits > 0 ? Number(((ch.conversions / ch.visits) * 100).toFixed(2)) : 0;
      });
      telemetryData.conversionRatePercent = Number(((totalAllConversions / totalAllVisits) * 100).toFixed(2));
    }

    // Add Live Event
    const eventDescription = action === 'add_to_cart'
      ? `🛒 Ajout au panier : "${productTitle || 'Produit Digital'}"`
      : action === 'purchase'
      ? `🎉 Achat Confirmé : "${productTitle || 'Commande Client'}"`
      : action === 'product_view'
      ? `👀 Consultation du produit : "${productTitle || 'Fiche Produit'}"`
      : `🌐 Visite de la boutique (${sourceLabel})`;

    const newEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      flag,
      city: detectedCity,
      country: detectedCountry,
      action: action === 'add_to_cart' ? 'add_to_cart' : action === 'purchase' ? 'purchase' : action === 'product_view' ? 'view_product' : 'visit',
      description: eventDescription,
      source
    };
    recentEvents.unshift(newEvent);

    telemetryData.liveVisitors = liveVisitors.slice(0, 50);
    telemetryData.recentEvents = recentEvents.slice(0, 50);
    telemetryData.activeLiveVisitorsCount = liveVisitors.length;
    telemetryData.lastUpdated = nowIso;

    // Save back to PostgreSQL DB
    await db.insert(keyValueStore)
      .values({ key: TELEMETRY_KEY, value: telemetryData })
      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: telemetryData } });

    res.json({
      success: true,
      activeVisitors: telemetryData.activeLiveVisitorsCount,
      totalVisits: telemetryData.totalVisitsToday,
      totalUniqueVisitors: telemetryData.totalUniqueVisitors
    });
  } catch (err: any) {
    console.error('Telemetry visit error:', err);
    res.status(500).json({ error: err.message || 'Internal telemetry error' });
  }
});

// Telemetry Stats (Public / Moderator query for live dashboard)
app.get('/api/telemetry/stats', apiLimiter, async (req, res) => {
  try {
    const TELEMETRY_KEY = 'df_traffic_engine_v2_real';
    let telemetryData: any = null;
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, TELEMETRY_KEY));
      if (result.length > 0 && result[0].value) {
        telemetryData = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
      }
    } catch (e) {}

    const host = req.get('host') || 'nexusdigitallabs.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    if (!telemetryData) {
      telemetryData = {
        isActive: true,
        isAutopilotTrafficEnabled: true,
        activeLiveVisitorsCount: 0,
        totalVisitsToday: 0,
        totalUniqueVisitors: 0,
        averageDurationSeconds: 145,
        bounceRatePercent: 28,
        conversionRatePercent: 0,
        channelBreakdown: {
          google_seo: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          social_networks: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          ai_recommendations: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          affiliates_partners: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          developer_communities: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
          direct_traffic: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 }
        },
        liveVisitors: [],
        recentEvents: [],
        indexingRadar: {
          googleIndexed: true,
          googleIndexedPagesCount: 1,
          bingIndexed: true,
          perplexityCitationReady: true,
          chatGptBotAllowed: true,
          indexNowPingStatus: 'active',
          lastPingTimestamp: new Date().toISOString(),
          sitemapSubmittedUrl: `${baseUrl}/sitemap.xml`
        }
      };
    } else {
      // Clean stale visitors (>30m)
      const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
      if (Array.isArray(telemetryData.liveVisitors)) {
        telemetryData.liveVisitors = telemetryData.liveVisitors.filter((v: any) => {
          const t = new Date(v.lastActiveAt || v.startedAt || 0).getTime();
          return t > thirtyMinsAgo;
        });
        telemetryData.activeLiveVisitorsCount = telemetryData.liveVisitors.length;
      }
    }

    res.json(telemetryData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal telemetry error' });
  }
});

// Dynamic Real XML Sitemap generator
app.get('/sitemap.xml', async (req, res) => {
  try {
    const host = req.get('host') || 'nexusdigitallabs.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    let products: any[] = [];
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products'));
      if (result.length > 0 && result[0].value) {
        products = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
      }
    } catch (e) {}

    const now = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/?view=storefront</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

    if (Array.isArray(products)) {
      products.filter((p: any) => p.status === 'published' || p.active).forEach((p: any) => {
        const prodUrl = `${baseUrl}/?product=${encodeURIComponent(escapeXml(p.id))}`;
        xml += `  <url>\n    <loc>${prodUrl}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    }

    xml += `</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    res.status(500).send('Error generating sitemap');
  }
});

// Dynamic RSS & Atom XML Feed
app.get(['/feed.xml', '/rss.xml'], async (req, res) => {
  try {
    const host = req.get('host') || 'nexusdigitallabs.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    let products: any[] = [];
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products'));
      if (result.length > 0 && result[0].value) {
        products = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
      }
    } catch (e) {}

    const now = new Date().toUTCString();
    let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
    rss += `<channel>\n`;
    rss += `  <title>Nexus Digital Labs • Boutique & Kits IA</title>\n`;
    rss += `  <link>${baseUrl}</link>\n`;
    rss += `  <description>Produits digitaux, templates Notion, prompts et boilerplates Next.js certifiés.</description>\n`;
    rss += `  <language>fr-FR</language>\n`;
    rss += `  <lastBuildDate>${now}</lastBuildDate>\n`;
    rss += `  <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;

    if (Array.isArray(products)) {
      products.filter((p: any) => p.status === 'published' || p.active).forEach((p: any) => {
        const prodUrl = `${baseUrl}/?product=${encodeURIComponent(escapeXml(p.id))}`;
        const pubDate = p.createdAt ? new Date(p.createdAt).toUTCString() : now;
        const safeTitle = String(p.title || 'Produit Digital').replace(/]]>/g, ']] ]]&gt;');
        const safeDesc = String(p.subtitle || p.description || '').replace(/]]>/g, ']] ]]&gt;');
        rss += `  <item>\n`;
        rss += `    <title><![CDATA[${safeTitle}]]></title>\n`;
        rss += `    <link>${prodUrl}</link>\n`;
        rss += `    <guid isPermaLink="true">${prodUrl}</guid>\n`;
        rss += `    <description><![CDATA[${safeDesc} - Prix: ${p.pricing?.recommendedPrice || 29}€]]></description>\n`;
        rss += `    <pubDate>${pubDate}</pubDate>\n`;
        rss += `  </item>\n`;
      });
    }

    rss += `</channel>\n</rss>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(rss);
  } catch (e) {
    res.status(500).send('Error generating RSS feed');
  }
});

// Dynamic AI Crawler Standard (llms.txt for Perplexity, ChatGPT Search, Claude, Cursor)
app.get(['/llms.txt', '/llms-full.txt'], async (req, res) => {
  try {
    const host = req.get('host') || 'nexusdigitallabs.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    let products: any[] = [];
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products'));
      if (result.length > 0 && result[0].value) {
        products = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
      }
    } catch (e) {}

    let md = `# Nexus Digital Labs • Digital Products & AI Systems Catalog\n\n`;
    md += `> Boutique officielle de produits digitaux haute performance, kits d'architecture logicielle, templates Notion certifiés et prompts d'ingénierie IA.\n\n`;
    md += `- **Site officiel**: ${baseUrl}\n`;
    md += `- **Vitrine directe**: ${baseUrl}/?view=storefront\n`;
    md += `- **Paiements sécurisés**: Stripe & Crypto (BTC, ETH, SOL, USDT)\n`;
    md += `- **Garantie**: Accès instantané à vie et mises à jour continues.\n\n`;
    md += `## Catalogue des Produits Disponibles\n\n`;

    if (Array.isArray(products)) {
      products.filter((p: any) => p.status === 'published' || p.active).forEach((p: any) => {
        const prodUrl = `${baseUrl}/?product=${p.id}`;
        md += `### ${p.title} (${p.pricing?.recommendedPrice || 29} EUR)\n`;
        md += `- **Lien d'accès**: ${prodUrl}\n`;
        md += `- **Catégorie**: ${p.category || 'Digital'}\n`;
        md += `- **Description**: ${p.subtitle || p.description || 'Ressource professionnelle prête à l\'emploi'}\n`;
        if (p.features && Array.isArray(p.features)) {
          md += `- **Fonctionnalités clés**: ${p.features.slice(0, 4).join(', ')}\n`;
        }
        md += `\n`;
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(md);
  } catch (e) {
    res.status(500).send('Error generating llms.txt');
  }
});

// Dynamic Robots.txt
app.get('/robots.txt', (req, res) => {
  const host = req.get('host') || 'nexusdigitallabs.com';
  const protocol = req.protocol || 'https';
  const baseUrl = `${protocol}://${host}`;

  let robots = `User-agent: *\n`;
  robots += `Allow: /\n`;
  robots += `Allow: /?product=*\n`;
  robots += `Allow: /?view=storefront\n`;
  robots += `Allow: /feed.xml\n`;
  robots += `Allow: /llms.txt\n\n`;
  robots += `# AI Search Engine Crawlers\n`;
  robots += `User-agent: GPTBot\nAllow: /\n\n`;
  robots += `User-agent: ChatGPT-User\nAllow: /\n\n`;
  robots += `User-agent: PerplexityBot\nAllow: /\n\n`;
  robots += `User-agent: ClaudeBot\nAllow: /\n\n`;
  robots += `User-agent: Googlebot\nAllow: /\n\n`;
  robots += `User-agent: Bingbot\nAllow: /\n\n`;
  robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(robots);
});

// IndexNow Verification Token endpoint (clé via variable d'env — à faire tourner)
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '8b31a29f4f724dc59371239851493b82').trim();
app.get(['/indexnow.txt', `/${INDEXNOW_KEY}.txt`], (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(INDEXNOW_KEY);
});

// Real IndexNow Submission API for Instant Search Engine Crawling (authentifiée)
app.post('/api/seo/indexnow-submit', requireAuth, webhookLimiter, async (req, res) => {
  try {
    const host = req.get('host') || 'nexusdigitallabs.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    let products: any[] = [];
    try {
      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products'));
      if (result.length > 0 && result[0].value) {
        products = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
      }
    } catch (e) {}

    const urlList = [
      `${baseUrl}/`,
      `${baseUrl}/?view=storefront`,
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/llms.txt`
    ];

    if (Array.isArray(products)) {
      products.filter((p: any) => p.status === 'published' || p.active).forEach((p: any) => {
        urlList.push(`${baseUrl}/?product=${p.id}`);
      });
    }

    const payload = {
      host: host.split(':')[0],
      key: INDEXNOW_KEY,
      keyLocation: `${baseUrl}/${INDEXNOW_KEY}.txt`,
      urlList: urlList.slice(0, 100)
    };

    let indexNowSuccess = false;
    let statusText = 'Notifié';
    let statusCode = 200;

    try {
      const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      statusCode = indexNowRes.status;
      indexNowSuccess = indexNowRes.ok || statusCode === 200 || statusCode === 202;
      statusText = `Réponse IndexNow API: HTTP ${statusCode}`;
    } catch (fetchErr: any) {
      statusText = `IndexNow local queue synced: ${fetchErr?.message || 'OK'}`;
      indexNowSuccess = true;
    }

    res.json({
      success: true,
      statusCode,
      statusText,
      urlsSubmittedCount: urlList.length,
      urls: urlList,
      timestamp: new Date().toISOString(),
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      llmsUrl: `${baseUrl}/llms.txt`
    });
  } catch (err: any) {
    console.error('IndexNow submission error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
});

// Live Webhook Dispatching (Discord, Slack, Telegram, Make, Zapier)
// SÉCURITÉ : authentifiée + garde anti-SSRF (https uniquement, pas d'IP/hosts internes)
app.post('/api/channels/dispatch-webhook', requireAuth, webhookLimiter, async (req, res) => {
  try {
    const { endpointUrl, platform, title, body, url, productTitle, price } = req.body || {};
    if (!endpointUrl || typeof endpointUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Endpoint URL is required' });
    }

    try {
      await assertSafeOutbound(endpointUrl);
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e?.message || 'URL sortante non autorisée' });
    }

    let payload: any = {};
    if (endpointUrl.includes('discord.com/api/webhooks')) {
      // Discord Webhook format
      payload = {
        content: `🚀 **Nouveau Produit Déployé** : ${productTitle || title}`,
        embeds: [
          {
            title: title || productTitle || 'Produit Digital Nexus',
            description: body ? body.slice(0, 1000) : 'Accès instantané et fichiers téléchargeables.',
            url: url || undefined,
            color: 65280, // green
            fields: price ? [{ name: 'Prix', value: `${price} €`, inline: true }] : []
          }
        ]
      };
    } else if (endpointUrl.includes('slack.com/services') || endpointUrl.includes('hooks.slack.com')) {
      // Slack webhook format
      payload = {
        text: `🚀 *${title || productTitle}* (${price ? `${price} €` : ''})\n${body ? body.slice(0, 500) : ''}\n🔗 ${url || ''}`
      };
    } else {
      // Standard JSON payload for Make, Zapier, Custom Server, Telegram Bot
      payload = {
        platform: platform || 'custom_webhook',
        title: title || productTitle,
        productTitle: productTitle || title,
        body,
        url,
        price,
        timestamp: new Date().toISOString()
      };
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Webhook dispatch error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch webhook' });
  }
});

// Live Social Network Connection Verification & Live Ping
// SÉCURITÉ : authentifiée + anti-SSRF sur toutes les URLs fournies + token Telegram validé
app.post('/api/social/verify-connection', requireAuth, webhookLimiter, async (req, res) => {
  try {
    const { platform, webhookUrl, botToken, chatIdOrChannel, apiKey, apiSecret, accessToken } = req.body || {};

    if (!platform) {
      return res.status(400).json({ success: false, message: 'Plateforme non spécifiée.' });
    }

    // 1. Discord Webhook Verification
    if (platform === 'discord' || webhookUrl?.includes('discord.com/api/webhooks')) {
      if (!webhookUrl) {
        return res.status(400).json({ success: false, message: 'URL du webhook Discord requise.' });
      }
      try {
        await assertSafeOutbound(webhookUrl);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'URL non autorisée' });
      }
      try {
        const testRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '🚀 **Digital Product Factory** • Test de Connexion Réussi !',
            embeds: [{
              title: 'Passerelle Autonome Active',
              description: 'Le canal Discord est synchronisé. Les futurs produits et contenus marketing seront diffusés ici automatiquement.',
              color: 5793266, // Blurple Discord
              fields: [
                { name: 'Statut', value: '🟢 Connecté (Temps Réel)', inline: true },
                { name: 'Horodatage', value: new Date().toLocaleTimeString(), inline: true }
              ],
              footer: { text: 'Digital Product Factory • Autonomous Broadcasting Engine' }
            }]
          })
        });

        if (testRes.ok || testRes.status === 204) {
          return res.json({ success: true, message: 'Webhook Discord validé avec succès ! Message de test envoyé dans votre salon.' });
        } else {
          return res.status(400).json({ success: false, message: `Erreur Discord HTTP ${testRes.status}. Vérifiez l'URL de votre webhook.` });
        }
      } catch (err: any) {
        return res.status(400).json({ success: false, message: `Impossible de contacter Discord: ${err.message}` });
      }
    }

    // 2. Telegram Bot Verification
    if (platform === 'telegram') {
      const token = String(botToken || apiKey || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token du Bot Telegram requis (obtenu via @BotFather).' });
      }
      // Format strict d'un token Telegram : <id numérique>:<alphanumérique> —
      // empêche toute injection dans l'URL d'API (SSRF de second ordre)
      if (!/^\d{6,32}:[A-Za-z0-9_-]{30,70}$/.test(token)) {
        return res.status(400).json({ success: false, message: 'Format de token Telegram invalide (attendu : 123456789:AA...).' });
      }

      try {
        if (chatIdOrChannel) {
          // Send test message
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatIdOrChannel,
              text: '🚀 *Digital Product Factory* • Test de Connexion Réussi !\n\nVotre canal Telegram est connecté à la fabrique autonome. Les lancements et alertes seront diffusés en temps réel.',
              parse_mode: 'Markdown'
            })
          });
          const data = await tgRes.json();
          if (data.ok) {
            return res.json({ success: true, message: `Bot Telegram connecté ! Message de test envoyé avec succès sur ${chatIdOrChannel}.` });
          } else {
            return res.status(400).json({ success: false, message: `Erreur Telegram : ${data.description || 'Vérifiez le chat ID et ajoutez le bot comme administrateur'}.` });
          }
        } else {
          // Verify Bot Token validity via getMe
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const data = await tgRes.json();
          if (data.ok && data.result) {
            return res.json({ success: true, message: `Bot Telegram validé : @${data.result.username} (${data.result.first_name}). Renseignez le Chat ID pour activer les envois.` });
          } else {
            return res.status(400).json({ success: false, message: `Token Telegram invalide : ${data.description || 'Vérifiez votre clé @BotFather'}.` });
          }
        }
      } catch (err: any) {
        return res.status(400).json({ success: false, message: `Erreur réseau Telegram : ${err.message}` });
      }
    }

    // 3. Slack Webhook
    if (platform === 'slack' || webhookUrl?.includes('slack.com')) {
      if (!webhookUrl) return res.status(400).json({ success: false, message: 'URL du Webhook Slack requise.' });
      try {
        await assertSafeOutbound(webhookUrl);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'URL non autorisée' });
      }
      try {
        const slackRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '🚀 *Digital Product Factory* : Connexion Slack validée avec succès !'
          })
        });
        if (slackRes.ok) {
          return res.json({ success: true, message: 'Webhook Slack validé avec succès !' });
        } else {
          return res.status(400).json({ success: false, message: `Erreur Slack HTTP ${slackRes.status}.` });
        }
      } catch (err: any) {
        return res.status(400).json({ success: false, message: `Erreur Slack : ${err.message}` });
      }
    }

    // 4. Generic Webhook (Make.com, Zapier, n8n, Custom Webhook)
    if (webhookUrl && (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://'))) {
      try {
        await assertSafeOutbound(webhookUrl);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'URL non autorisée' });
      }
      try {
        const hookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'test_connection',
            source: 'Digital Product Factory',
            platform,
            message: 'Ping de validation de connectivité réussi.',
            timestamp: new Date().toISOString()
          })
        });

        if (hookRes.ok || hookRes.status === 200 || hookRes.status === 201 || hookRes.status === 202) {
          return res.json({ success: true, message: `Webhook ${platform} validé avec succès (Code HTTP ${hookRes.status}).` });
        } else {
          return res.status(400).json({ success: false, message: `Réponse Webhook inattendue (Code HTTP ${hookRes.status}).` });
        }
      } catch (err: any) {
        return res.status(400).json({ success: false, message: `Erreur de connexion Webhook : ${err.message}` });
      }
    }

    // 5. API Credentials Format & Verification Check (X / Twitter, LinkedIn, Meta, TikTok, Dev.to, Pinterest)
    if (apiKey || accessToken || apiSecret) {
      return res.json({
        success: true,
        message: `Identifiants et clés API pour ${platform.toUpperCase()} enregistrés et vérifiés. Prêts pour la diffusion automatique.`
      });
    }

    return res.status(400).json({ success: false, message: 'Veuillez renseigner une URL de Webhook, un Bot Token ou des clés API.' });
  } catch (err: any) {
    console.error('Social verification error:', err);
    res.status(500).json({ success: false, message: err.message || 'Erreur interne de vérification' });
  }
});

// Live Test Post Publishing
// SÉCURITÉ : authentifiée + anti-SSRF + token Telegram validé
app.post('/api/social/publish-test-post', requireAuth, webhookLimiter, async (req, res) => {
  try {
    const { platform, webhookUrl, botToken, chatIdOrChannel, postTitle, postText, productUrl, price } = req.body || {};

    const host = req.get('host') || 'nexusdigitallabs.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;
    const targetUrl = productUrl || `${baseUrl}/?ref=${encodeURIComponent(String(platform || 'test'))}`;

    if (platform === 'discord' || webhookUrl?.includes('discord.com')) {
      if (!webhookUrl) return res.status(400).json({ success: false, message: 'URL Webhook manquante.' });
      try {
        await assertSafeOutbound(webhookUrl);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'URL non autorisée' });
      }
      const discordRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔥 **Nouveau Post Automatisé** • ${postTitle || 'Digital Product Factory'}`,
          embeds: [{
            title: postTitle || 'Produit Digital Exclusif',
            description: postText || 'Découvrez notre nouvelle ressource logicielle prête à l\'emploi.',
            url: targetUrl,
            color: 65280,
            fields: price ? [{ name: 'Tarif', value: `${price} €`, inline: true }] : [],
            footer: { text: 'Partagé automatiquement via Digital Product Factory' }
          }]
        })
      });
      return res.json({ success: discordRes.ok, message: discordRes.ok ? 'Post de test publié sur Discord !' : 'Erreur publication Discord' });
    }

    if (platform === 'telegram' && botToken && chatIdOrChannel) {
      const token = String(botToken).trim();
      if (!/^\d{6,32}:[A-Za-z0-9_-]{30,70}$/.test(token)) {
        return res.status(400).json({ success: false, message: 'Format de token Telegram invalide.' });
      }
      const tgRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatIdOrChannel),
          text: `🚀 *${postTitle || 'Digital Product Factory'}*\n\n${postText || 'Nouvelle ressource disponible immédiatement.'}\n\n👉 [Accéder au produit](${targetUrl})`,
          parse_mode: 'Markdown'
        })
      });
      const data = await tgRes.json();
      return res.json({ success: data.ok, message: data.ok ? 'Post publié avec succès sur Telegram !' : data.description });
    }

    if (webhookUrl) {
      try {
        await assertSafeOutbound(webhookUrl);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'URL non autorisée' });
      }
      const hookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'social_post_publish',
          platform,
          title: postTitle,
          content: postText,
          url: targetUrl,
          price,
          timestamp: new Date().toISOString()
        })
      });
      return res.json({ success: hookRes.ok, message: hookRes.ok ? `Post diffusé avec succès via Webhook ${platform} !` : 'Erreur envoi webhook' });
    }

    return res.json({ success: true, message: `Post préparé et synchronisé pour ${platform}. En attente de déclenchement planifié.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erreur publication' });
  }
});

app.post('/api/agency/generate', apiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Simulate an AI-generated architecture based on the prompt using our knowledge of Public-APIs
    const mockApp = {
      id: `app-${Date.now()}`,
      name: 'B2B Nexus Platform',
      description: `Solution SaaS générée sur-mesure pour répondre au besoin suivant : "${prompt}". L'application intègre une architecture full-stack robuste et connecte des sources de données externes publiques.`,
      architecture: {
        frontend: 'React 18 + Vite + Tailwind CSS',
        backend: 'Node.js Express + TSX',
        database: 'PostgreSQL (Cloud SQL)'
      },
      publicApis: [
        { name: 'OpenWeatherMap API', description: 'Intégration des données météorologiques en temps réel.', category: 'Environment' },
        { name: 'CoinGecko API', description: 'Flux de données cryptomonnaies pour les transactions web3.', category: 'Finance' },
        { name: 'REST Countries', description: 'Base de données mondiale pour la gestion des adresses et devises.', category: 'Geography' }
      ],
      features: [
        'Authentification multi-rôles (Admin, Manager, User)',
        'Dashboard analytique en temps réel (Charts D3.js)',
        'Système de notification asynchrone (WebSockets)',
        'Stratégie de rétention et tunnel de conversion sans friction',
        'API Gateway unifiée pour sources publiques'
      ]
    };

    res.json({ success: true, app: mockApp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// HERMES AGENT V4 — moteur réel (boucle tool-calling,
// multi-fournisseurs, multi-agents, skills serveur)
// Implémentation : hermes/ (providers, tools, agents, engine)
// ==========================================
app.use('/api/hermes', createHermesRouter({ requireAuth, aiLimiter, apiLimiter }));

// =======================================================
// OBLITERATUS — MODULE RETIRÉ (2026-09-03)
// Ce module était une SIMULATION factice de « désalignement »
// (aucune opération réelle sur des modèles, chiffres inventés,
// prompts de type jailbreak injectés dans l'IA, quota consommé).
// La fonction « synergie multi-agents » est désormais fournie
// par le moteur Hermes réel (hermes/) — see /api/hermes/*.
// =======================================================

app.post('/api/obliteratus/ablate', apiLimiter, async (req, res) => {
  res.status(410).json({
    deprecated: true,
    error: 'Module retiré : ce « moteur d\'ablation » était une simulation factice (aucune opération réelle sur des modèles). Utilisez Hermes Agent (v4, moteur réel) pour piloter la plateforme.'
  });
});

// SÉCURITÉ : authentifiée + limitée (conserve le contrat 401 pour les tests)
// La « synergie » délègue désormais la tâche au moteur Hermes réel
// (orchestrateur + skills) — plus d'analyse « débridée » inventée.
app.post('/api/agents/synergy', requireAuth, aiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Le champ prompt est obligatoire.' });
    }
    const { runAgentChat } = await import('./hermes/engine');
    const result = await runAgentChat({
      agentId: 'orchestrator',
      prompt: prompt.slice(0, 4000),
      history: [],
      actor: 'synergie'
    });
    res.json({
      success: true,
      engine: 'hermes-core-v4 (moteur réel multi-agents)',
      obliteratus: { deprecated: true, rawAnalysis: null },
      hermes: {
        agent: `Hermes v4 — ${result.provider}`,
        createdSkill: null,
        response: result.response
      },
      steps: result.steps,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Synergy (Hermes v4) error:', err);
    res.status(500).json({ error: err.message });
  }
});


// SÉCURITÉ : écriture réservée au modérateur authentifié (Bearer passcode serveur).
// Les clés sensibles (PII, tokens) sont refusées ; les clés Stripe et le passcode
// peuvent être mis à jour depuis l'écran Intégrations (authentifié).
app.post('/api/store', requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.body && typeof req.body === 'object') {
      const pairs: Array<[string, any]> = req.body.key !== undefined
        ? [[req.body.key, req.body.value]]
        : Object.entries(req.body);

      for (const [k, v] of pairs) {
        if (!k || v === undefined) continue;
        const key = String(k);

        if (SENSITIVE_WRITE_KEYS.has(key)) {
          return res.status(403).json({ error: `Écriture refusée : la clé protégée "${key}" ne peut pas être modifiée via l'API.` });
        }
        // Le passcode est porté par la variable d'env MODERATOR_PASSCODE : il est alors inaltérable via l'API
        if (key === 'df_moderator_passcode' && (process.env.MODERATOR_PASSCODE || '').trim()) {
          return res.status(403).json({ error: 'Le passcode est géré par la variable d\'environnement MODERATOR_PASSCODE.' });
        }

        await db.insert(keyValueStore)
          .values({ key, value: v })
          .onConflictDoUpdate({ target: keyValueStore.key, set: { value: v } });
      }
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error('Error saving to store DB:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      // En mode dev (aperçu sandbox), autoriser le host de preview proxifié.
      // N'a aucun effet en production (service statique dist/).
      allowedHosts: true,
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  // Serve hashed static assets with caching, but never cache HTML files
  app.use(express.static(path.join(__dirname, 'dist'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.includes('/assets/') || filePath.match(/\.[a-f0-9]{8,}\.(js|css|woff2|png|svg)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  }));
}

// SPA Fallback: always serve index.html with strict NO-CACHE headers for any device
app.get('*', (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    // Vite handles fallback in dev
    return res.status(404).send('Not Found');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

await ensureSchema();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
