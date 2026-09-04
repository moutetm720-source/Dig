/**
 * hermes/tools.ts — Registre de SKILLS (outils) d'Hermes.
 *
 * Chaque skill est une action SERVEUR typée (schéma JSON) que le LLM peut
 * invoquer via function calling. Tout est exécuté côté serveur sur la même
 * base que le reste de l'application :
 *   - écritures uniquement sur les clés métier (jamais les secrets)
 *   - PII exclue des résultats (commandes agrégées, pas de noms/e-mails)
 *   - skills destructifs : flux de confirmation obligatoire (confirm: true)
 *   - appels sortants : garde anti-SSRF
 *
 * AJOUTER UN SKILL (aujourd'hui ou plus tard) : pousser l'objet dans
 * buildSkillRegistry() — il devient automatiquement disponible pour tous
 * les agents (et dans l'UI via GET /api/hermes/skills).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { assertSafeOutbound } from '../ssrfGuard';
import { HermesContext, HermesTool, ToolParameterSchema } from './types';

// ---------- Helpers KV ----------

export async function kvGet(key: string): Promise<any> {
  const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, key));
  if (r.length > 0 && r[0].value !== null && r[0].value !== undefined) {
    const v = r[0].value;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  }
  return null;
}

export async function kvSet(key: string, value: any): Promise<void> {
  await db.insert(keyValueStore).values({ key, value })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value } });
}

async function readList(key: string): Promise<any[]> {
  const v = await kvGet(key);
  return Array.isArray(v) ? v : [];
}

async function writeList(key: string, list: any[]): Promise<void> {
  await kvSet(key, list.slice(0, 1000));
}

// Clés métier accessibles par les skills (lecture/écriture).
// SÉCURITÉ : les secrets (df_stripe_sk, df_moderator_passcode, df_stripe_whsec,
// df_hermes_config...) sont ICI-EXCLUS — aucune skill n'y touche.
const KV_WRITE_WHITELIST = new Set([
  'dpf_app_v2_products', 'dpf_app_v2_bundles', 'dpf_app_v2_contentItems',
  'dpf_app_v2_adCampaigns', 'dpf_app_v2_emailSequences', 'dpf_app_v2_opportunities',
  'dpf_app_v2_integrations', 'dpf_app_v2_onboardingState', 'dpf_app_v2_seoConfig',
  'dpf_app_v2_promptTemplates'
]);
const KV_READ_WHITELIST = new Set([
  ...KV_WRITE_WHITELIST,
  'dpf_app_v2_orders', 'dpf_app_v2_agentConfig', 'dpf_app_v2_systemLogs',
  'dpf_app_v2_recommendations', 'dpf_app_v2_approvals', 'df_github_repositories'
]);

// Résumé d'un produit pour le LLM (jamais de contenu massif)
function productSummary(p: any) {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    format: p.format,
    status: p.status,
    priceEur: p.pricing?.recommendedPrice ?? p.price ?? null,
    compareAt: p.pricing?.compareAtPrice ?? null,
    flashSale: Boolean(p.pricing?.isFlashSale),
    salesCount: p.salesCount || 0,
    rating: p.rating ?? null
  };
}

const str = (v: any, max = 300) => String(v ?? '').slice(0, max);
const num = (v: any, min = -Infinity, max = Infinity) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Valeur numérique invalide : ${v}`);
  return n;
};

// ---------- Helpers réseau / HTML (skills internet) ----------

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: any;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => { timer = setTimeout(() => rej(new Error(`Timeout ${label} (${ms / 1000}s) — réseau indisponible ou trop lent.`)), ms); })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(Number(d)); } catch { return ''; } });
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** HTML → texte lisible (supprime script/style/nav, conserve la structure). */
export function htmlToText(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(nav|footer|header|aside|form)[\s>][\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section)[\s>]/gi, '\n');
  return decodeEntities(h.replace(/<[^>]*>/g, ' '))
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 60_000);
}

// fetch avec message d'erreur lisible (réseau du serveur) — jamais de silence
async function netFetch(url: string, init: RequestInit, ms: number, label: string): Promise<Response> {
  let res: Response;
  try {
    res = await withTimeout(fetch(url, init), ms, label);
  } catch (e: any) {
    const base = String(e?.message || e);
    if (/timeout|délai/i.test(base)) throw new Error(`Réseau : ${base}`);
    throw new Error(`Réseau indisponible depuis le serveur (fetch ${label} : ${base}) — la fonctionnalité fonctionnera sur un hébergement avec accès internet.`);
  }
  return res;
}

// ---------- Bases de connaissances (snapshots curés) ----------

let freeForCache: any = null;
function loadFreeForKB(): any {
  if (freeForCache) return freeForCache;
  const p = fileURLToPath(new URL('./knowledge/free-for.json', import.meta.url));
  freeForCache = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return freeForCache;
}

let freeLLmCache: any = null;
function loadFreeLLmKB(): any {
  if (freeLLmCache) return freeLLmCache;
  const p = fileURLToPath(new URL('./knowledge/free-llm-apis.json', import.meta.url));
  freeLLmCache = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return freeLLmCache;
}

// ---------- Registre ----------

    // ---------- Helpers liens (inventaire + contrôle de santé) ----------

/** Masque un lien de destination : conserve origine+chemin, efface les tokens/params sensibles. */
export function maskLink(raw: string): string {
  try {
    const u = new URL(raw);
    let out = `${u.protocol}//${u.host}${u.pathname.slice(0, 120)}`;
    if (u.search) {
      const keys = [...u.searchParams.keys()].slice(0, 4);
      out += `?${keys.map(k => `${k}=•••`).join('&')}${keys.length < u.searchParams.size ? '&…' : ''}`;
    }
    return out;
  } catch {
    return raw.slice(0, 80) + '…';
  }
}

/** Contrôle de santé d'une URL (HEAD, repli GET sur 405/501) — partagé par web_link_check et platform_links. */
export async function checkUrlHealth(raw: string): Promise<{ url: string; ok: boolean; status?: number; error?: string }> {
  let u: URL;
  try { u = new URL(raw); } catch { return { url: raw, ok: false, error: 'URL invalide' }; }
  if (!['http:', 'https:'].includes(u.protocol)) return { url: raw, ok: false, error: 'Protocole non supporté' };
  try {
    await assertSafeOutbound(u.toString());
    const lh = { 'User-Agent': 'Mozilla/5.0 (compatible; HermesLinkCheck/1.0)' };
    let res = await netFetch(u.toString(), { method: 'HEAD', redirect: 'follow', headers: lh }, 10_000, 'link_check');
    if (res.status === 405 || res.status === 501) {
      res = await netFetch(u.toString(), { method: 'GET', redirect: 'follow', headers: lh }, 10_000, 'link_check');
    }
    return { url: u.toString().slice(0, 300), ok: res.ok, status: res.status };
  } catch (e: any) {
    return { url: u.toString().slice(0, 300), ok: false, error: String(e?.message || e).slice(0, 120) };
  }
}

// ---------- Helpers référentiels locaux (submodules references/*) ----------

const REFERENCES_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'references');
const REFERENCES_NAMES = ['OBLITERATUS', 'awesome-free-llm-apis', 'awesome-llm-apps'];
const READABLE_EXT = new Set(['.md', '.json', '.txt']);
const SEARCH_FILES = ['README.md', 'data.json', 'CLAUDE.md', 'AGENTS.md', 'WORKSPACE.md', 'AIWG.md', 'CONTRIBUTING.md', 'SECURITY.md'];

function referencesPath(repoName: string, file: string): string | null {
  const repoDir = path.resolve(REFERENCES_ROOT, repoName);
  if (repoDir !== path.join(REFERENCES_ROOT, path.basename(repoDir))) return null; // anti-traversée
  const full = path.resolve(repoDir, file || '');
  if (!full.startsWith(REFERENCES_ROOT + path.sep)) return null;
  return full;
}

// ---------- Base de veille GitHub (cache mémoire, anti-quota) ----------
const harvestCache = new Map<string, { at: number; results: any[] }>();
const HARVEST_CACHE_MS = 30 * 60 * 1000;

// Résumé compact d'un repo harvesté (jamais de dump massif)
function repoBrief(r: any) {
  return {
    id: r.id, name: r.fullName || r.name, stars: r.stars ?? r.stargazers_count ?? null,
    language: r.language || null, license: r.license || null,
    suggestedProductType: r.suggestedProductType || null,
    viabilityScore: r.commercialViabilityScore ?? null,
    angle: String(r.monetizationAngle || '').slice(0, 160),
    status: r.status || 'scanned'
  };
}

/** Angles de monétisation dérivés des topics (même logique que le harvest client). */
function repoAngle(item: any): { format: string; angle: string } {
  const topics: string[] = Array.isArray(item.topics) ? item.topics : [];
  const desc = String(item.description || '');
  const isAgents = topics.includes('agent') || /agent/i.test(desc);
  const isTemplate = topics.includes('template') || topics.includes('boilerplate');
  const isPrompt = topics.includes('prompt') || /prompt/i.test(desc);
  const n = `${item.full_name} (${item.stargazers_count ?? 0}★)`;
  if (isAgents) return { format: 'pro_kit', angle: `Système multi-agents : packager en toolkit de production prêt à l'emploi (rôles pré-configurés, SOP de déploiement, doc) — source : ${n}.` };
  if (isTemplate) return { format: 'template', angle: `Boilerplate : packager en starter SaaS à vendre (auth, Stripe, CI pré-câblés) avec doc premium — source : ${n}.` };
  if (isPrompt) return { format: 'prompt_pack', angle: `Référentiel de prompts : extraire un pack curé avec schémas de validation et guide d'usage — source : ${n}.` };
  return { format: 'guide', angle: `Outil open-source ${item.language || ''} : construire un « blueprint self-hosted » (guide + templates) autour de ${n}.` };
}


export function buildSkillRegistry(): HermesTool[] {
  return [
    // ════════════ CATALOGUE ════════════
    {
      name: 'catalog_list',
      description: "Liste les produits du catalogue (id, titre, prix, statut, ventes). Utiliser en premier pour connaître les IDs avant toute action ciblée.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: "Filtre optionnel : 'published', 'draft', 'archived'", enum: ['published', 'draft', 'archived'] }
        }
      },
      async run(args) {
        const products = await readList('dpf_app_v2_products');
        const filtered = args.status ? products.filter(p => p.status === args.status) : products;
        return { count: filtered.length, total: products.length, products: filtered.map(productSummary) };
      }
    },
    {
      name: 'catalog_get',
      description: 'Détails d\'un produit (description, contenu, packaging, tarification complète).',
      access: 'read',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: "ID du produit (ex: 'prod-1')" } },
        required: ['id']
      },
      async run(args) {
        const products = await readList('dpf_app_v2_products');
        const p = products.find(x => x.id === str(args.id, 80));
        if (!p) return { found: false };
        const { content, packaging, ...rest } = p;
        return {
          found: true,
          ...rest,
          contentFiles: Array.isArray(content?.downloadableFiles) ? content.downloadableFiles.length : 0,
          faqs: Array.isArray(packaging?.faqs) ? packaging.faqs.length : 0,
          benefits: Array.isArray(packaging?.keyBenefits) ? packaging.keyBenefits : []
        };
      }
    },
    {
      name: 'catalog_create',
      description: "Crée un nouveau produit dans le catalogue (statut 'draft' par défaut — il restera non publié tant qu'un humain ne le publie pas via publish_product).",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre du produit (4-120 caractères)' },
          price: { type: 'number', description: 'Prix recommandé en EUR (1 à 2000)', minimum: 1, maximum: 2000 },
          category: { type: 'string', description: 'Catégorie (ex: IA & Productivité, Templates, Guides)' },
          format: { type: 'string', enum: ['prompt_pack', 'template', 'guide', 'course', 'tool', 'bundle'], description: "Format du livrable" },
          subtitle: { type: 'string', description: 'Accroche courte (≤160 caractères)' },
          description: { type: 'string', description: 'Description complète du produit (≤2000 caractères)' }
        },
        required: ['title', 'price']
      },
      async run(args, ctx) {
        const title = str(args.title, 120);
        if (title.length < 4) throw new Error('Titre trop court (min 4 caractères).');
        const price = num(args.price, 1, 2000);
        const products = await readList('dpf_app_v2_products');
        const now = new Date().toISOString();
        const product = {
          id: `prod-hermes-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          title,
          subtitle: str(args.subtitle, 160) || `${title} — créé par Hermes Agent`,
          category: str(args.category, 60) || 'IA & Productivité',
          format: ['prompt_pack', 'template', 'guide', 'course', 'tool', 'bundle'].includes(args.format) ? args.format : 'prompt_pack',
          targetAudience: 'Professionnels et créateurs digitaux',
          problemSolved: str(args.description, 500) || 'Gain de temps et de productivité grâce à un kit prêt à l\'emploi.',
          promisedOutcome: 'Résultats concrets dès la première utilisation',
          level: 'All Levels',
          pricing: {
            recommendedPrice: price,
            compareAtPrice: Math.round(price * 1.8 * 100) / 100,
            discountPercent: 45,
            attractiveBadge: ' Nouveau',
            isFlashSale: false
          },
          price,
          status: 'draft',
          quality: { completeness: 80, uniqueness: 75, valuePerception: 85 },
          content: {
            summary: str(args.description, 500) || 'Kit numérique complet créé via Hermes Agent.',
            downloadableFiles: []
          },
          packaging: {
            keyBenefits: [
              'Prêt à l\'emploi immédiatement',
              'Mises à jour incluses',
              'Support inclus 7 jours'
            ],
            faqs: []
          },
          views: 0,
          salesCount: 0,
          revenue: 0,
          rating: 5.0,
          reviewsCount: 0,
          createdAt: now,
          createdBy: `hermes:${ctx.actor}`
        };
        products.unshift(product);
        await writeList('dpf_app_v2_products', products);
        return { created: true, id: product.id, status: 'draft', note: "Produit créé en brouillon — utilisez publish_product pour le mettre en vente." };
      }
    },
    {
      name: 'catalog_update',
      description: "Met à jour des champs non-critiques d'un produit existant (titre, sous-titre, catégorie, description, statut draft/published/archived).",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['published', 'draft', 'archived'] }
        },
        required: ['id']
      },
      async run(args) {
        const id = str(args.id, 80);
        const products = await readList('dpf_app_v2_products');
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) throw new Error(`Produit introuvable : ${id}`);
        const p = products[idx];
        const changes: string[] = [];
        if (args.title) { p.title = str(args.title, 120); changes.push('title'); }
        if (args.subtitle) { p.subtitle = str(args.subtitle, 160); changes.push('subtitle'); }
        if (args.category) { p.category = str(args.category, 60); changes.push('category'); }
        if (args.description) {
          p.problemSolved = str(args.description, 1000);
          if (p.content) p.content.summary = str(args.description, 500);
          changes.push('description');
        }
        if (args.status) {
          if (!['published', 'draft', 'archived'].includes(args.status)) throw new Error('Statut invalide.');
          p.status = args.status;
          changes.push(`status→${args.status}`);
        }
        if (changes.length === 0) throw new Error('Aucun champ à mettre à jour fourni.');
        products[idx] = p;
        await writeList('dpf_app_v2_products', products);
        return { updated: true, id, changes };
      }
    },
    {
      name: 'catalog_set_price',
      description: "Change le prix d'un produit (ou de TOUS les produits si scope='all' — dans ce cas, confirmation obligatoire). Recalcule compareAtPrice et remise.",
      access: 'write',
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: "ID du produit (obligatoire si scope='one')" },
          scope: { type: 'string', enum: ['one', 'all'], description: "Produit unique ou catalogue entier" },
          price: { type: 'number', description: 'Nouveau prix en EUR (1 à 2000)', minimum: 1, maximum: 2000 },
          compareAtPrice: { type: 'number', description: 'Prix barré optionnel (EUR)' },
          flashSale: { type: 'boolean', description: 'Activer la badge Vente Flash' },
          confirm: { type: 'boolean', description: "Confirmation explicite requise (vrai seulement si l'utilisateur a confirmé)" }
        },
        required: ['price', 'scope']
      },
      async run(args) {
        const price = num(args.price, 1, 2000);
        const products = await readList('dpf_app_v2_products');
        if (args.scope === 'all') {
          const affected = products.length;
          for (const p of products) {
            p.pricing = { ...p.pricing, recommendedPrice: price, compareAtPrice: args.compareAtPrice ? num(args.compareAtPrice, 1, 20000) : Math.round(price * 1.6 * 100) / 100, isFlashSale: Boolean(args.flashSale) };
            p.price = price;
          }
          await writeList('dpf_app_v2_products', products);
          return { updated: true, scope: 'all', affected, newPrice: price };
        }
        const id = str(args.id, 80);
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) throw new Error(`Produit introuvable : ${id}`);
        const p = products[idx];
        p.pricing = { ...p.pricing, recommendedPrice: price, compareAtPrice: args.compareAtPrice ? num(args.compareAtPrice, 1, 20000) : Math.round(price * 1.6 * 100) / 100, isFlashSale: Boolean(args.flashSale) };
        p.price = price;
        products[idx] = p;
        await writeList('dpf_app_v2_products', products);
        return { updated: true, scope: 'one', id, oldPrice: p.pricing?.recommendedPrice ?? null, newPrice: price };
      }
    },
    {
      name: 'catalog_delete',
      description: "SUPPRIME définitivement un produit (confirmation obligatoire). Ne supprime pas les commandes passées.",
      access: 'destructive',
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: "ID du produit à supprimer" },
          confirm: { type: 'boolean', description: 'Confirmation explicite obligatoire' }
        },
        required: ['id']
      },
      async run(args) {
        const id = str(args.id, 80);
        const products = await readList('dpf_app_v2_products');
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) throw new Error(`Produit introuvable : ${id}`);
        const removed = products.splice(idx, 1)[0];
        await writeList('dpf_app_v2_products', products);
        return { deleted: true, id, title: removed.title, remaining: products.length };
      }
    },
    {
      name: 'publish_product',
      description: "Publie (ou dépublie) un produit dans la boutique visible par les clients.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          publish: { type: 'boolean', description: 'true = publié, false = repassé en draft' }
        },
        required: ['id']
      },
      async run(args) {
        const id = str(args.id, 80);
        const products = await readList('dpf_app_v2_products');
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) throw new Error(`Produit introuvable : ${id}`);
        products[idx].status = args.publish === false ? 'draft' : 'published';
        await writeList('dpf_app_v2_products', products);
        return { published: args.publish !== false, id, status: products[idx].status };
      }
    },
    {
      name: 'pricing_audit',
      description: "Audit tarifaire du catalogue : min/max/médiane, produits sans prix, remises actives, flash sales, produits invendus.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const products = await readList('dpf_app_v2_products');
        const priced = products
          .map((p: any) => Number(p.pricing?.recommendedPrice ?? p.price))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        const sorted = [...priced].sort((a, b) => a - b);
        const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
        return {
          pricedProducts: priced.length,
          missingPrice: products.length - priced.length,
          min: sorted[0] ?? null,
          max: sorted[sorted.length - 1] ?? null,
          median,
          avg: priced.length ? Math.round((priced.reduce((s, n) => s + n, 0) / priced.length) * 100) / 100 : 0,
          flashSales: products.filter((p: any) => p.pricing?.isFlashSale).length,
          withDiscount: products.filter((p: any) => (p.pricing?.discountPercent || 0) > 0).length,
          unsold: products.filter((p: any) => p.status === 'published' && (p.salesCount || 0) === 0).length
        };
      }
    },

    // ════════════ BUNDLES / PACKS ════════════
    {
      name: 'bundles_list',
      description: 'Liste les packs/bundles actuels (produits inclus, prix, remise).',
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const bundles = await readList('dpf_app_v2_bundles');
        return {
          count: bundles.length,
          bundles: bundles.map((b: any) => ({ id: b.id, title: b.title, productIds: b.productIds, bundlePrice: b.bundlePrice, discountPercent: b.discountPercent, status: b.status }))
        };
      }
    },
    {
      name: 'bundles_create',
      description: "Crée un pack regroupant plusieurs produits existants avec remise (les IDs des produits doivent exister).",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          productIds: { type: 'array', items: { type: 'string' }, description: '2 à 10 IDs de produits existants' },
          discountPercent: { type: 'number', minimum: 5, maximum: 70, description: 'Remise du pack (5-70%)' }
        },
        required: ['title', 'productIds']
      },
      async run(args) {
        const title = str(args.title, 120);
        const ids: string[] = Array.isArray(args.productIds) ? args.productIds.map(x => str(x, 80)).filter(Boolean).slice(0, 10) : [];
        if (ids.length < 2) throw new Error('Un pack contient au moins 2 produits.');
        const products = await readList('dpf_app_v2_products');
        const found = ids.map(id => products.find(p => p.id === id)).filter(Boolean);
        if (found.length !== ids.length) throw new Error(`Produits introuvables : ${ids.filter(id => !products.find(p => p.id === id)).join(', ')}`);
        const discount = num(args.discountPercent, 5, 70) || 20;
        const original = found.reduce((s, p: any) => s + (p.pricing?.recommendedPrice ?? p.price ?? 0), 0);
        const bundlePrice = Math.round(original * (1 - discount / 100) * 100) / 100;
        const bundles = await readList('dpf_app_v2_bundles');
        const bundle = {
          id: `bundle-hermes-${Date.now().toString(36)}`,
          title,
          subtitle: `Pack de ${found.length} produits — économisez ${discount}%`,
          productIds: ids,
          originalPrice: Math.round(original * 100) / 100,
          bundlePrice,
          discountPercent: discount,
          badge: ' Pack Hermes',
          status: 'active'
        };
        bundles.unshift(bundle);
        await writeList('dpf_app_v2_bundles', bundles);
        return { created: true, id: bundle.id, title, bundlePrice, originalPrice: bundle.originalPrice };
      }
    },

    // ════════════ CONTENU & MARKETING ════════════
    {
      name: 'content_list',
      description: 'Liste les contenus marketing (articles, threads, landing) avec leur statut.',
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const items = await readList('dpf_app_v2_contentItems');
        return { count: items.length, items: items.slice(0, 40).map((c: any) => ({ id: c.id, title: c.title, type: c.type, status: c.status, channel: c.channel || c.platform })) };
      }
    },
    {
      name: 'content_create',
      description: "Crée un contenu marketing (article blog, thread, script vidéo) au statut 'draft' dans l'usine à contenu.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['blog_article', 'thread', 'video_script', 'landing_copy', 'email'], description: 'Type de contenu' },
          body: { type: 'string', description: 'Contenu complet (≤8000 caractères)' }
        },
        required: ['title', 'type', 'body']
      },
      async run(args) {
        const title = str(args.title, 200);
        const body = str(args.body, 8000);
        if (body.length < 20) throw new Error('Contenu trop court.');
        const types = ['blog_article', 'thread', 'video_script', 'landing_copy', 'email'];
        if (!types.includes(args.type)) throw new Error(`Type invalide (attendu : ${types.join(', ')})`);
        const items = await readList('dpf_app_v2_contentItems');
        const item = {
          id: `content-hermes-${Date.now().toString(36)}`,
          title,
          type: args.type,
          body,
          status: 'draft',
          createdAt: new Date().toISOString()
        };
        items.unshift(item);
        await writeList('dpf_app_v2_contentItems', items);
        return { created: true, id: item.id, title, type: item.type };
      }
    },
    {
      name: 'campaigns_list',
      description: 'Liste les campagnes publicitaires configurées.',
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const c = await readList('dpf_app_v2_adCampaigns');
        return { count: c.length, campaigns: c.slice(0, 30).map((x: any) => ({ id: x.id, name: x.name || x.title, platform: x.platform, status: x.status, budget: x.budget })) };
      }
    },
    {
      name: 'campaigns_create',
      description: "Crée une campagne publicitaire au statut 'draft' (budget en EUR, 10-10000).",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          platform: { type: 'string', enum: ['google_ads', 'meta_ads', 'tiktok_ads', 'linkedin_ads', 'reddit_ads'], description: 'Plateforme' },
          budget: { type: 'number', minimum: 10, maximum: 10000, description: 'Budget total EUR' },
          goal: { type: 'string', description: "Objectif (ex: 'Acquisition — landing produit A')" }
        },
        required: ['name', 'platform', 'budget']
      },
      async run(args) {
        const name = str(args.name, 120);
        const platforms = ['google_ads', 'meta_ads', 'tiktok_ads', 'linkedin_ads', 'reddit_ads'];
        if (!platforms.includes(args.platform)) throw new Error('Plateforme non supportée.');
        const budget = num(args.budget, 10, 10000);
        const list = await readList('dpf_app_v2_adCampaigns');
        const camp = {
          id: `camp-hermes-${Date.now().toString(36)}`,
          name,
          platform: args.platform,
          budget,
          goal: str(args.goal, 300),
          status: 'draft',
          createdAt: new Date().toISOString()
        };
        list.unshift(camp);
        await writeList('dpf_app_v2_adCampaigns', list);
        return { created: true, id: camp.id, name, platform: camp.platform, budget };
      }
    },
    {
      name: 'email_sequence_add',
      description: "Ajoute un e-mail à une séquence (nouvelle séquence si name absent) — statut 'draft'.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          sequenceName: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' }
        },
        required: ['sequenceName', 'subject', 'body']
      },
      async run(args) {
        const seqName = str(args.sequenceName, 100);
        const subject = str(args.subject, 200);
        const body = str(args.body, 6000);
        const seqs = await readList('dpf_app_v2_emailSequences');
        let seq = seqs.find((s: any) => (s.name || s.title || '') === seqName);
        if (!seq) {
          seq = { id: `seq-hermes-${Date.now().toString(36)}`, name: seqName, emails: [], status: 'draft' };
          seqs.unshift(seq);
        }
        seq.emails = Array.isArray(seq.emails) ? seq.emails : [];
        seq.emails.push({ id: `em-${Date.now().toString(36)}`, subject, body, position: seq.emails.length + 1 });
        await writeList('dpf_app_v2_emailSequences', seqs);
        return { created: true, sequence: seqName, emailSubject: subject, totalEmails: seq.emails.length };
      }
    },
    {
      name: 'opportunities_add',
      description: "Enregistre une opportunité de produit (niche, score de demande, format suggéré) dans le moteur d'opportunités.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          niche: { type: 'string' },
          demandScore: { type: 'number', minimum: 0, maximum: 100 },
          suggestedFormat: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['title', 'niche']
      },
      async run(args) {
        const title = str(args.title, 160);
        const list = await readList('dpf_app_v2_opportunities');
        const opp = {
          id: `opp-hermes-${Date.now().toString(36)}`,
          title,
          niche: str(args.niche, 120),
          category: 'IA & Productivité',
          suggestedFormat: str(args.suggestedFormat, 40) || 'prompt_pack',
          demandScore: num(args.demandScore, 0, 100) || 70,
          competitionScore: 50,
          monetizationScore: 75,
          trendScore: 65,
          productionDifficulty: 30,
          estimatedMargin: 95,
          estimatedConversionPotential: 3.5,
          estimatedRevenuePotential: 2000,
          overallScore: 75,
          signals: [],
          status: 'identified',
          notes: str(args.notes, 500),
          createdAt: new Date().toISOString()
        };
        list.unshift(opp);
        await writeList('dpf_app_v2_opportunities', list);
        return { created: true, id: opp.id, title, niche: opp.niche };
      }
    },

    // ════════════ SEO & BRANDING ════════════
    {
      name: 'seo_get',
      description: 'État SEO/branding actuel : nom de la boutique, config méta, nombre de produits indexables (sitemap).',
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const onb = await kvGet('dpf_app_v2_onboardingState');
        const seo = await kvGet('dpf_app_v2_seoConfig');
        const products = await readList('dpf_app_v2_products');
        const published = products.filter(p => p.status === 'published').length;
        return {
          storeName: onb?.storeName || 'Non défini',
          seoConfig: seo || {},
          indexableProducts: published,
          sitemap: '/sitemap.xml (généré automatiquement)'
        };
      }
    },
    {
      name: 'seo_update',
      description: "Met à jour le nom de la boutique et la config SEO méta (description, mots-clés). Impacte la vitrine et le sitemap.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          storeName: { type: 'string', description: 'Nom de la boutique (≤80 car.)' },
          metaDescription: { type: 'string', description: 'Meta description (≤300 car.)' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Mots-clés (≤20)' }
        }
      },
      async run(args) {
        const changes: string[] = [];
        if (args.storeName) {
          const onb = (await kvGet('dpf_app_v2_onboardingState')) || {};
          onb.storeName = str(args.storeName, 80);
          await kvSet('dpf_app_v2_onboardingState', onb);
          changes.push('storeName');
        }
        if (args.metaDescription || args.keywords) {
          const seo = (await kvGet('dpf_app_v2_seoConfig')) || {};
          if (args.metaDescription) seo.metaDescription = str(args.metaDescription, 300);
          if (Array.isArray(args.keywords)) seo.keywords = args.keywords.map(k => str(k, 40)).filter(Boolean).slice(0, 20);
          await kvSet('dpf_app_v2_seoConfig', seo);
          changes.push('seoConfig');
        }
        if (changes.length === 0) throw new Error('Aucun champ SEO fourni.');
        return { updated: true, changes };
      }
    },

    // ════════════ CANAUX SOCIAUX ════════════
    {
      name: 'channels_list',
      description: "Liste les canaux d'intégration (X, LinkedIn, Telegram, Discord, webhooks...) et leur statut de connexion.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const integrations = await readList('dpf_app_v2_integrations');
        return {
          count: integrations.length,
          connected: integrations.filter((i: any) => i.connected).length,
          channels: integrations.map((i: any) => ({ id: i.id, name: i.name, platform: i.platform, connected: Boolean(i.connected), autoBroadcast: Boolean(i.autoBroadcast || i.enabled) }))
        };
      }
    },
    {
      name: 'channels_dispatch',
      description: "Envoie un message vers un endpoint webhook (https uniquement, garde anti-SSRF). Ne peut PAS modifier la config des canaux.",
      access: 'outbound',
      parameters: {
        type: 'object',
        properties: {
          endpointUrl: { type: 'string', description: "URL https du webhook cible" },
          message: { type: 'string', description: 'Message à envoyer (≤2000 car.)' }
        },
        required: ['endpointUrl', 'message']
      },
      async run(args) {
        const url = str(args.endpointUrl, 500);
        const message = str(args.message, 2000);
        if (!url) throw new Error('endpointUrl manquant.');
        await assertSafeOutbound(url);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'hermes-agent', message, at: new Date().toISOString() }),
            signal: ctrl.signal
          });
          return { sent: true, status: res.status, url: new URL(url).hostname };
        } catch (e: any) {
          throw new Error(`Échec de l'envoi : ${e?.message || e}`);
        } finally {
          clearTimeout(t);
        }
      }
    },

    // ════════════ VENTES & ANALYTIQUE (AGRÉGATS SEULEMENT — PAS DE PII) ════════════
    {
      name: 'metrics_summary',
      description: "Métriques agrégées : CA total, commandes, top produits par ventes, conversion moyenne. AUCUNE donnée client nominative.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const orders = await readList('dpf_app_v2_orders');
        const products = await readList('dpf_app_v2_products');
        const totalRevenue = orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
        const top = [...products]
          .sort((a: any, b: any) => (b.salesCount || 0) - (a.salesCount || 0))
          .slice(0, 5)
          .map((p: any) => ({ id: p.id, title: p.title, sales: p.salesCount || 0, revenue: p.revenue || 0 }));
        return {
          orders: orders.length,
          totalRevenueEur: Math.round(totalRevenue * 100) / 100,
          avgOrderValue: orders.length ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
          products: products.length,
          publishedProducts: products.filter((p: any) => p.status === 'published').length,
          topProducts: top
        };
      }
    },
    {
      name: 'orders_recent',
      description: "Dernières commandes (numéro, montant, paiement, date) — SANS coordonnées clients (RGPD).",
      access: 'read',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Nombre max (défaut 10)' } }
      },
      async run(args) {
        const limit = Math.min(20, Math.max(1, num(args.limit, 1, 20) || 10));
        const orders = await readList('dpf_app_v2_orders');
        // SÉCURITÉ : aucune donnée client (nom, email, adresse) n'est exposée au LLM.
        return {
          count: orders.length,
          recent: orders.slice(0, limit).map((o: any) => ({
            orderNumber: o.orderNumber || o.id,
            total: Number(o.totalAmount) || 0,
            currency: o.currency || 'EUR',
            paymentMethod: o.paymentMethod,
            itemsCount: Array.isArray(o.items) ? o.items.length : 0,
            date: o.createdAt || o.date
          }))
        };
      }
    },

    // ════════════ SYSTÈME & CONFIG ════════════
    {
      name: 'audit_system',
      description: "Audit complet du système : base, boutique, paiements (statut SANS secrets), canaux, moteur Hermes. Données réelles du serveur.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const products = await readList('dpf_app_v2_products');
        const integrations = await readList('dpf_app_v2_integrations');
        const stripeSk = (process.env.STRIPE_SECRET_KEY || (await kvGet('df_stripe_sk')) || '').trim();
        const whsec = (process.env.STRIPE_WEBHOOK_SECRET || (await kvGet('df_stripe_whsec')) || '').trim();
        const passcodeSet = Boolean((process.env.MODERATOR_PASSCODE || (await kvGet('df_moderator_passcode')) || '').trim());
        const cryptoBtc = (await kvGet('df_crypto_btc')) || '';
        const sessionSecret = Boolean(process.env.SESSION_SECRET || (await kvGet('df_session_secret')));
        return {
          database: 'postgres connecté',
          products: { total: products.length, published: products.filter(p => p.status === 'published').length },
          payments: {
            stripeConfigured: Boolean(stripeSk),
            stripeWebhookConfigured: Boolean(whsec),
            cryptoAddressConfigured: Boolean(cryptoBtc),
            demoCheckoutEnabled: (process.env.DEMO_CHECKOUT || '') === '1' && !stripeSk
          },
          moderatorAuth: { passcodeConfigured: passcodeSet, sessionSecretConfigured: sessionSecret },
          channels: { total: integrations.length, connected: integrations.filter((i: any) => i.connected).length },
          server: { port: process.env.PORT || 3211, node: process.version }
        };
      }
    },
    {
      name: 'settings_summary',
      description: "Résumé de la configuration de la boutique (mode Stripe, devise, adresses crypto PUBLIQUES, branding). Aucun secret.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const mode = (await kvGet('df_stripe_mode')) || 'test';
        const currency = (await kvGet('df_stripe_currency')) || 'EUR';
        const onb = (await kvGet('dpf_app_v2_onboardingState')) || {};
        return {
          stripe: { mode: String(mode), currency: String(currency), configured: Boolean(process.env.STRIPE_SECRET_KEY || (await kvGet('df_stripe_sk'))) },
          crypto: {
            btc: String((await kvGet('df_crypto_btc')) || '').slice(0, 20) + '…',
            eth: String((await kvGet('df_crypto_eth')) || '').slice(0, 10) + '…'
          },
          branding: { storeName: onb.storeName || 'Non défini' }
        };
      }
    },
    {
      name: 'logs_add',
      description: "Ajoute une entrée dans le journal du système (visible dans l'UI Logs).",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
          module: { type: 'string', description: "Module (ex: 'agent')" },
          message: { type: 'string' }
        },
        required: ['level', 'message']
      },
      async run(args) {
        const levels = ['info', 'success', 'warning', 'error'];
        if (!levels.includes(args.level)) throw new Error('Niveau invalide.');
        const logs = await readList('dpf_app_v2_systemLogs');
        logs.unshift({
          id: `log-${Date.now().toString(36)}`,
          level: args.level,
          module: str(args.module, 40) || 'agent',
          message: str(args.message, 500),
          timestamp: new Date().toISOString()
        });
        await writeList('dpf_app_v2_systemLogs', logs.slice(0, 300));
        return { logged: true, level: args.level };
      }
    },
    {
      name: 'kv_get',
      description: "Lit une clé de la base clé-valeur (liste blanche métier — secrets exclus). Renvoie un résumé si la valeur est grande.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string', description: 'Clé (ex: dpf_app_v2_products)' } }
      },
      async run(args) {
        const key = str(args.key, 120);
        if (!KV_READ_WHITELIST.has(key)) throw new Error(`Clé non accessible : ${key}`);
        const v = await kvGet(key);
        if (v === null) return { key, exists: false };
        if (Array.isArray(v)) return { key, exists: true, type: 'array', length: v.length, sample: v.slice(0, 3) };
        if (typeof v === 'object') return { key, exists: true, type: 'object', fields: Object.keys(v).slice(0, 40), sample: JSON.stringify(v).slice(0, 1500) };
        return { key, exists: true, value: String(v).slice(0, 2000) };
      }
    },
    {
      name: 'kv_set',
      description: "Écrit une clé de la base clé-valeur (liste blanche métier uniquement — secrets et PII exclus). Valeur max 200 Ko.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'object', description: 'Valeur JSON à stocker' }
        },
        required: ['key', 'value']
      },
      async run(args) {
        const key = str(args.key, 120);
        if (!KV_WRITE_WHITELIST.has(key)) throw new Error(`Clé non accessible en écriture : ${key}`);
        const json = JSON.stringify(args.value);
        if (json.length > 200_000) throw new Error('Valeur trop volumineuse (max 200 Ko).');
        await kvSet(key, args.value);
        return { written: true, key, bytes: json.length };
      }
    },

// ════════════ INTERNET (agent web) ════════════
    // Sécurité : https uniquement, anti-SSRF (assertSafeOutbound), timeouts,
    // tailles plafonnées, aucune credential dans les URL. En cas de réseau
    // indisponible, l'erreur est renvoyée telle quelle (honnêteté : jamais
    // de résultat inventé).
    {
      name: 'web_search',
      description: "Recherche sur internet (DuckDuckGo, sans clé API). Renvoie les N premiers résultats (titre, URL, extrait).",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Requête de recherche (≤300 car.)' },
          count: { type: 'number', description: 'Nombre de résultats (1-10, défaut 5)' }
        },
        required: ['query']
      },
      async run(args) {
        const query = str(args.query, 300);
        if (!query) throw new Error('query vide.');
        const count = Math.min(10, Math.max(1, Math.trunc(Number(args.count) || 5)));
        const target = 'https://html.duckduckgo.com/html/';
        await assertSafeOutbound(target);
        const res = await netFetch(target, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
          },
          body: `q=${encodeURIComponent(query)}`
        }, 15_000, 'web_search');
        if (!res.ok) throw new Error(`Moteur de recherche indisponible (HTTP ${res.status}).`);
        const html = await res.text();
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        // Blocs de résultats : <a class="result__a" href="...">Titre</a> ... <a class="result__snippet">Extrait</a>
        const blockRe = /<a[^>]*class="[^"]*result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<\/div>/g;
        let m: RegExpExecArray | null;
        while ((m = blockRe.exec(html)) !== null && results.length < count) {
          const rawHref = m[1];
          let url = rawHref;
          const uddg = rawHref.match(/[?&]uddg=([^&]+)/);
          if (uddg) { try { url = decodeURIComponent(uddg[1]); } catch { /* garde raw */ } }
          if (!/^https?:\/\//i.test(url)) continue;
          const title = stripTags(m[2]).trim();
          const snip = stripTags((m[3].match(/class="[^"]*result__snippet[^"]*"[\s\S]*?>([\s\S]*?)<\/a>/) || [])[1] || '').trim();
          if (title) results.push({ title: title.slice(0, 150), url: url.slice(0, 400), snippet: snip.slice(0, 250) });
        }
        return { query, source: 'duckduckgo', count: results.length, results };
      }
    },
    {
      name: 'web_fetch',
      description: "Lit une page web et renvoie son texte (HTML→texte, plafonné ~4 000 car.). https uniquement, destinations internes bloquées.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL https complète (ex: https://example.com/produit)' }
        },
        required: ['url']
      },
      async run(args) {
        const raw = str(args.url, 2000);
        if (!raw) throw new Error('url vide.');
        let u: URL;
        try { u = new URL(raw); } catch { throw new Error('URL invalide.'); }
        if (u.username || u.password) throw new Error('Credentials dans l\'URL interdites.');
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Protocole non supporté (https attendu).');
        await assertSafeOutbound(u.toString());
        const res = await netFetch(u.toString(), {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
          }
        }, 20_000, 'web_fetch');
        const ctype = String(res.headers.get('content-type') || '');
        if (!res.ok) throw new Error(`La page a renvoyé HTTP ${res.status}.`);
        const body = (await res.text()).slice(0, 1_500_000);
        let text: string;
        let title = '';
        if (ctype.includes('html') || /^\s*</.test(body)) {
          const t = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (t) title = stripTags(t[1]).trim().slice(0, 200);
          text = htmlToText(body);
        } else {
          text = body;
        }
        return {
          url: u.toString().slice(0, 400),
          status: res.status,
          contentType: ctype.split(';')[0],
          title,
          textLength: text.length,
          text: text.slice(0, 4000)
        };
      }
    },
    {
      name: 'web_link_check',
      description: "Vérifie la santé de 1 à 10 URLs (code HTTP, redirections) — utile pour contrôler les liens contenus/SEO/produits.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          urls: { type: 'array', items: { type: 'string' }, description: 'Liste d\'URLs https (max 10)' }
        },
        required: ['urls']
      },
      async run(args) {
        const urls: string[] = Array.isArray(args.urls) ? args.urls.map(u => str(u, 500)).filter(Boolean).slice(0, 10) : [];
        if (urls.length === 0) throw new Error('urls vide.');
        const out = await Promise.all(urls.map(raw => checkUrlHealth(raw)));
        return { checked: out.length, ok: out.filter(r => r.ok).length, broken: out.filter(r => !r.ok), results: out };
      }
    },
    {
      name: 'free_tier_lookup',
      description: "Consulte la base de connaissances GRATUITE (snapshot curé de free-for.dev, ~100 services) : hébergement, BDD, IA, e-mail, analytics, paiement crypto/carte, monitoring… Idéal pour recommander une infrastructure sans coût.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Mots-clés (ex: "postgre serverless", "llm gratuit", "qr code")' },
          category: { type: 'string', description: 'Catégorie (ex: ia, hebergement, base, email, paiement, monitoring…) — voir la liste en renvoyant sans arguments' }
        }
      },
      async run(args) {
        const kb = loadFreeForKB();
        const noAccents = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const query = str(args.query, 200).toLowerCase().trim();
        const category = noAccents(str(args.category, 40)).trim();
        if (!query && !category) {
          const counts: Record<string, number> = {};
          for (const e of kb.entries) counts[e.category] = (counts[e.category] || 0) + 1;
          return { source: kb.meta.source, curatedAt: kb.meta.curatedAt, totalServices: kb.entries.length, categories: counts, hint: 'Appelez à nouveau avec category et/ou query.' };
        }
        const tokens = query ? noAccents(query).split(/[\s,]+/).filter(t => t.length > 1) : [];
        const scored = kb.entries.map(e => {
          const name = noAccents(e.name);
          const tags = (e.tags || []).map(noAccents);
          const cat = noAccents(e.category);
          const ft = noAccents(e.freeTier || '');
          let score = 0;
          if (category && cat === category) score += 10;
          if (category && cat.includes(category)) score += 4;
          for (const t of tokens) {
            if (name.includes(t)) score += 6;
            if (tags.some(tag => tag.includes(t))) score += 4;
            if (cat.includes(t)) score += 3;
            if (ft.includes(t)) score += 2;
          }
          return { e, score };
        }).filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12);
        return {
          source: kb.meta.source,
          curatedAt: kb.meta.curatedAt,
          note: kb.meta.note,
          matched: scored.length,
          results: scored.map(x => ({ name: x.e.name, category: x.e.category, freeTier: x.e.freeTier, url: x.e.url, tags: x.e.tags }))
        };
      }
    },
    {
      name: 'free_llm_lookup',
      description: "Consulte la base des API LLM GRATUITES (snapshot du repo awesome-free-llm-apis, ~16 providers / 118 modèles) : Gemini, Groq, OpenRouter, Mistral, Ollama Cloud, Cloudflare Workers AI… Renvoie provider, limite gratuite, baseUrl (endpoint API, souvent compatible OpenAI) et modèles. Idéal pour recommander un backend IA à coût zéro.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Mots-clés : nom (ex "groq"), modèle (ex "llama"), capacité (ex "rapide", "128k", "vision")' },
          category: { type: 'string', description: 'provider_api | inference_provider — renvoyer sans arguments liste les catégories' }
        }
      },
      async run(args) {
        const kb = loadFreeLLmKB();
        const noAccents = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const query = noAccents(str(args.query, 200)).trim();
        const category = noAccents(str(args.category, 40)).trim();
        if (!query && !category) {
          const counts: Record<string, number> = {};
          for (const e of kb.entries) counts[e.category] = (counts[e.category] || 0) + 1;
          return { source: kb.meta.source, curatedAt: kb.meta.curatedAt, totalProviders: kb.entries.length, totalModels: kb.entries.reduce((n: number, e: any) => n + e.models.length, 0), categories: counts, hint: 'Appelez à nouveau avec query et/ou category.' };
        }
        const tokens = query ? query.split(/[\s,]+/).filter(t => t.length > 1) : [];
        const scored = kb.entries.map(e => {
          const name = noAccents(e.name);
          const ft = noAccents(e.freeTier || '');
          const base = noAccents(e.baseUrl || '');
          let score = 0;
          if (category && noAccents(e.category) === category) score += 10;
          for (const t of tokens) {
            if (name.includes(t)) score += 6;
            if (e.models.some((m: any) => noAccents(m.id).includes(t) || noAccents(m.name || '').includes(t))) score += 5;
            if (noAccents(e.category).includes(t)) score += 3;
            if (ft.includes(t) || base.includes(t)) score += 2;
            if (e.models.some((m: any) => noAccents(`${m.context || ''} ${m.modality || ''} ${m.rateLimit || ''}`).includes(t))) score += 2;
          }
          // modèles les plus pertinents d'abord (sinon les N premiers)
          const models = [...e.models].sort((a: any, b: any) => {
            if (!query) return 0;
            const am = tokens.some(t => noAccents(`${a.id} ${a.name || ''}`).includes(t)) ? 1 : 0;
            const bm = tokens.some(t => noAccents(`${b.id} ${b.name || ''}`).includes(t)) ? 1 : 0;
            return bm - am;
          }).slice(0, 5);
          return { e, models, score };
        }).filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        return {
          source: kb.meta.source,
          curatedAt: kb.meta.curatedAt,
          note: 'Limites susceptibles de changer — vérifier sur le site du provider avant de s\'engager. baseUrl = endpoint API (souvent compatible OpenAI : utilisable directement avec HERMES_OPENAI_BASE_URL).',
          matched: scored.length,
          results: scored.map(x => ({
            name: x.e.name, flag: x.e.flag, category: x.e.category,
            freeTier: x.e.freeTier, baseUrl: x.e.baseUrl, url: x.e.url,
            models: x.models
          }))
        };
      }
    },

    // ════════════ REPOS GITHUB (harvest de la plateforme) ════════════
    // La plateforme harveste des repos open-source (UI « Moteur GitHub »)
    // avec un angle de monétisation chacun (df_github_repositories, synchro
    // client→serveur). Ces 3 skills rendent ce harvest visible et utilisable
    // par Hermes : c'est le vivier d'idées de produits de l'usine.
    {
      name: 'repos_list',
      description: "Consulte le HARVEST GITHUB de la plateforme (repos open-source scan, notés 0-100 en viabilité commerciale, avec angle de monétisation et type de produit suggéré). C'est le vivier d'idées de produits : lire avant de créer un produit issu d'un repo.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Nombre de repos à retourner (1-15, défaut 8)' },
          minScore: { type: 'number', description: 'Score de viabilité minimum (0-100)' }
        }
      },
      async run(args) {
        const limit = Math.min(15, Math.max(1, Math.trunc(Number(args.limit) || 8)));
        const minScore = Math.min(100, Math.max(0, Number(args.minScore) || 0));
        const repos = await readList('df_github_repositories');
        if (repos.length === 0) {
          return { total: 0, hint: "Aucun repo harvesté pour l'instant. Utilise repos_harvest (veille GitHub live côté serveur) ou l'écran « Moteur GitHub » de l'UI." };
        }
        const sorted = [...repos]
          .sort((a, b) => (b.commercialViabilityScore || 0) - (a.commercialViabilityScore || 0))
          .filter(r => (r.commercialViabilityScore || 0) >= minScore)
          .slice(0, limit);
        return {
          total: repos.length,
          shown: sorted.length,
          source: 'df_github_repositories (harvest GitHub — UI Moteur GitHub + repos_harvest)',
          lastScannedAt: repos.map(r => r.scannedAt).filter(Boolean).sort().pop() || null,
          repos: sorted.map(repoBrief)
        };
      }
    },
    {
      name: 'repos_get',
      description: "Détail d'UN repo du harvest GitHub (par id, fullName owner/repo ou nom) : description, tech stack, licence, topics, angle de monétisation complet. À utiliser avant de transformer un repo en produit (catalog_create).",
      access: 'read',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'id, fullName (owner/repo) ou nom du repo' } },
        required: ['id']
      },
      async run(args) {
        const q = str(args.id, 120).toLowerCase();
        if (!q) throw new Error('id vide.');
        const repos = await readList('df_github_repositories');
        const repo = repos.find(r =>
          (r.id || '').toLowerCase() === q ||
          (r.fullName || '').toLowerCase() === q ||
          (r.name || '').toLowerCase() === q);
        if (!repo) {
          return { found: false, harvestTotal: repos.length, hint: 'Repo introuvable dans le harvest. Voir repos_list ou repos_harvest pour élargir.' };
        }
        return {
          found: true,
          ...repoBrief(repo),
          description: String(repo.description || '').slice(0, 400),
          readmeSnippet: String(repo.readmeSnippet || '').slice(0, 300),
          techStack: Array.isArray(repo.techStack) ? repo.techStack.slice(0, 8) : [],
          topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 10) : [],
          url: repo.url || `https://github.com/${repo.fullName || repo.name}`,
          monetizationAngle: String(repo.monetizationAngle || '').slice(0, 400)
        };
      }
    },
    {
      name: 'repos_harvest',
      description: "VEILLE GITHUB LIVE (côté serveur, sans clé — 60 req/h, cache 30 min par requête) : cherche l'API GitHub, note chaque repo trouvé avec un angle de monétisation dérivé de ses topics, et l'ajoute au harvest (df_github_repositories) pour nourrir l'usine à produits en continu.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Requête GitHub (ex: "ai agent", "boilerplate nextjs", "prompt library")' },
          limit: { type: 'number', description: 'Nombre max de repos (1-6, défaut 5)' }
        }
      },
      async run(args) {
        const query = str(args.query, 120) || 'ai agent';
        const limit = Math.min(6, Math.max(1, Math.trunc(Number(args.limit) || 5)));
        const cacheKey = query.toLowerCase().replace(/\s+/g, ' ').trim();
        const cached = harvestCache.get(cacheKey);
        if (cached && Date.now() - cached.at < HARVEST_CACHE_MS) {
          return { fromCache: true, cacheAgeSec: Math.round((Date.now() - cached.at) / 1000), query, repos: cached.results.slice(0, limit).map(repoBrief) };
        }
        const target = 'https://api.github.com/search/repositories';
        await assertSafeOutbound(target);
        const qs = `q=${encodeURIComponent(`${query} in:name,description,topics stars:>300`)}&sort=stars&order=desc&per_page=${limit}`;
        const res = await netFetch(`${target}?${qs}`, {
          headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'HermesGithubHarvest/1.0' }
        }, 20_000, 'repos_harvest');
        if (!res.ok) {
          throw new Error(`API GitHub indisponible (HTTP ${res.status})${res.status === 403 ? ' — quota horaire atteint, réessaie plus tard' : ''}.`);
        }
        const data: any = await res.json();
        const items: any[] = Array.isArray(data.items) ? data.items : [];
        if (items.length === 0) {
          return { fromCache: false, query, added: 0, note: 'Aucun résultat GitHub pour cette requête.', repos: [] };
        }
        const now = new Date().toISOString();
        const live = items.slice(0, limit).map((item: any) => {
          const { format, angle } = repoAngle(item);
          const viability = Math.min(99, Math.max(75, Math.round(75 + ((item.stargazers_count || 0) / 1000) * 1.5)));
          return {
            id: `gh_live_${String(item.id)}`,
            name: String(item.name || ''),
            fullName: String(item.full_name || item.name || ''),
            owner: String(item.owner?.login || ''),
            description: String(item.description || '').slice(0, 400),
            url: String(item.html_url || ''),
            stars: item.stargazers_count ?? 0,
            forks: item.forks_count ?? 0,
            language: item.language || null,
            topics: (Array.isArray(item.topics) ? item.topics : []).slice(0, 10),
            license: item.license?.spdx_id || null,
            openIssues: item.open_issues_count ?? 0,
            techStack: [],
            suggestedProductType: format,
            monetizationAngle: angle,
            commercialViabilityScore: viability,
            status: 'scanned',
            scannedAt: now,
            source: 'repos_harvest (API GitHub live)'
          };
        });
        const repos = await readList('df_github_repositories');
        const byFull = new Map(repos.map(r => [String(r.fullName || '').toLowerCase(), r]));
        let added = 0, refreshed = 0;
        for (const r of live) {
          const k = r.fullName.toLowerCase();
          const ex = byFull.get(k);
          if (ex) {
            ex.scannedAt = now;
            if (ex.status !== 'productized') ex.status = 'rescanned';
            refreshed++;
          } else {
            repos.push(r);
            added++;
          }
        }
        await writeList('df_github_repositories', repos);
        harvestCache.set(cacheKey, { at: Date.now(), results: live });
        await kvSet('df_github_last_harvest', { at: now, query, added, refreshed, total: repos.length });
        return {
          fromCache: false, query, added, refreshed, total: repos.length,
          note: 'Repos ajoutés au harvest de la plateforme (visible aussi dans l\'UI Moteur GitHub après synchro).',
          repos: live.map(repoBrief)
        };
      }
    },

    // ════════════ RÉFÉRENTIELS LOCAUX (submodules references/*) ════════════
    {
      name: 'reference_repos',
      description: "Lit les REPOS DE RÉFÉRENCE LOCAUX du projet (submodules git dans references/ : OBLITERATUS — toolkit abliteration, awesome-free-llm-apis — API LLM gratuites (data.json), awesome-llm-apps — catalogue 100+ apps IA open-source « clone it, ship it, sell it »). Sans argument : état + extrait README de chaque repo. name=… : fichiers du repo. name+file : contenu d'un fichier texte (plafonné). search=… : recherche textuelle dans les fichiers documentaires.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'OBLITERATUS | awesome-free-llm-apis | awesome-llm-apps' },
          file: { type: 'string', description: 'Fichier à lire (ex: README.md, data.json) — texte uniquement, < 200 Ko' },
          search: { type: 'string', description: 'Mot-clé recherché dans les fichiers documentaires du référentiel (ou de tous si name absent)' }
        }
      },
      async run(args) {
        const reposState: any[] = [];
        for (const name of REFERENCES_NAMES) {
          const dir = path.join(REFERENCES_ROOT, name);
          let files: string[] = [];
          try { files = fs.readdirSync(dir); } catch { /* absent */ }
          const readmePath = path.join(dir, 'README.md');
          let readmeExcerpt = '';
          try {
            const rd = fs.readFileSync(readmePath, 'utf8');
            readmeExcerpt = rd.replace(/[#*`>\-|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280);
          } catch { /* pas de README */ }
          reposState.push({
            name,
            initialized: files.length > 0,
            topLevelEntries: files.length,
            readmeExcerpt: readmeExcerpt || null
          });
        }
        const name = str(args.name, 60);
        const wanted = name ? REFERENCES_NAMES.find(n => n.toLowerCase() === name.toLowerCase()) : null;
        if (name && !wanted) {
          return { repos: reposState, error: `Référentiel inconnu : ${name}. Disponibles : ${REFERENCES_NAMES.join(', ')}` };
        }
        const targets = wanted ? [wanted] : REFERENCES_NAMES;

        // Mode fichier
        if (wanted && args.file) {
          const file = str(args.file, 200);
          const full = referencesPath(wanted, file);
          if (!full) throw new Error(`Chemin refusé : ${args.file} (doit rester dans references/${wanted}/).`);
          let st: fs.Stats;
          try { st = fs.statSync(full); } catch { return { found: false, hint: `Fichier absent : ${file}. Lis d'abord la liste (name seul).` }; }
          if (!st.isFile() || st.size > 200_000) throw new Error(`Fichier illisible (doit être un fichier texte < 200 Ko).`);
          const ext = path.extname(full).toLowerCase();
          if (!READABLE_EXT.has(ext)) throw new Error(`Type de fichier non supporté : ${ext || '(aucun)'} — seuls .md/.json/.txt sont lisibles.`);
          const content = fs.readFileSync(full, 'utf8').slice(0, 8000);
          return { repo: wanted, file, bytes: st.size, truncated: st.size > 8000, content };
        }

        // Mode liste des fichiers
        if (wanted && !args.search) {
          const dir = path.join(REFERENCES_ROOT, wanted);
          let entries: fs.Dirent[] = [];
          try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { /* vide */ }
          const listing = entries.slice(0, 100).map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }));
          return { repo: wanted, initialized: listing.length > 0, entries: listing, hint: 'Re-lis avec file=… pour le contenu, ou search=… pour une recherche.' };
        }

        // Mode recherche
        if (args.search) {
          const needle = str(args.search, 100).toLowerCase();
          if (!needle) throw new Error('search vide.');
          const matches: Array<{ repo: string; file: string; line: number; excerpt: string }> = [];
          for (const repo of targets) {
            const dir = path.join(REFERENCES_ROOT, repo);
            for (const fname of SEARCH_FILES) {
              if (matches.length >= 8) break;
              const full = path.join(dir, fname);
              try {
                const st = fs.statSync(full);
                if (!st.isFile() || st.size > 500_000) continue;
                const lines = fs.readFileSync(full, 'utf8').split('\n');
                for (let i = 0; i < lines.length && matches.length < 8; i++) {
                  if (lines[i].toLowerCase().includes(needle)) {
                    matches.push({ repo, file: fname, line: i + 1, excerpt: lines[i].trim().replace(/\s+/g, ' ').slice(0, 220) });
                  }
                }
              } catch { /* fichier absent — normal */ }
            }
          }
          return { search: needle, scope: `fichiers documentaires (${SEARCH_FILES.join(', ')}) des ${targets.length} référentiel(s)`, matches: matches.length, results: matches, hint: matches.length === 0 ? 'Aucun match — élargis le mot-clé ou lis un fichier précis (name+file).' : undefined };
        }

        return {
          repos: reposState,
          note: reposState.every(r => !r.initialized)
            ? 'TOUS les référentiels sont VIDES : `git submodule update --init --recursive` n\'a pas été exécuté sur cette instance (voir la Build Command Render du README).'
            : 'Re-lis avec name=… (liste des fichiers), name+file=… (contenu) ou search=… (recherche).'
        };
      }
    },

    // ════════════ LIENS DE LA PLATEFORME ════════════
    {
      name: 'platform_links',
      description: "Inventaire des LIENS de la plateforme : liens d'accès produits (PUBLIC_URL + ?product=), sitemap.xml, flux RSS/feed.xml, llms.txt, destinations des canaux connectés (masquées), liens tracking des kits affiliés. check=true pour tester la santé des liens principaux (max 5 HEAD, 404/redirections).",
      access: 'read',
      parameters: {
        type: 'object',
        properties: { check: { type: 'boolean', description: 'Tester la santé des liens principaux (max 5 contrôles HEAD)' } }
      },
      async run(args) {
        const base = (process.env.PUBLIC_URL || '').trim().replace(/\/$/, '');
        const products = (await readList('dpf_app_v2_products')).filter(p => p.status === 'published');
        const integrations = await readList('dpf_app_v2_integrations');
        const kits = await readList('df_affiliate_promo_kits_v1');
        const productLinks = products.slice(0, 10).map(p => `${base || '(PUBLIC_URL absente)'}/?product=${encodeURIComponent(p.id)}`);
        const channels = integrations
          .filter(i => i.connected)
          .slice(0, 12)
          .map(i => ({
            name: i.name || i.service || 'canal',
            service: i.service || null,
            destination: i.config?.webhookUrl ? maskLink(String(i.config.webhookUrl)) : (i.config?.webhookEndpoint ? String(i.config.webhookEndpoint).slice(0, 100) : null)
          }));
        const affiliateLinks = (Array.isArray(kits) ? kits : [])
          .map(k => k.affiliateTrackingUrl || k.trackingUrl || null)
          .filter(Boolean)
          .map(u => maskLink(String(u)))
          .slice(0, 8);
        const inventory = {
          generatedAt: new Date().toISOString(),
          site: {
            sitemap: `${base || ''}/sitemap.xml`,
            rss: `${base || ''}/feed.xml`,
            llmsTxt: `${base || ''}/llms.txt`
          },
          publicUrl: base || 'absente — les liens produits sont relatifs (définir PUBLIC_URL pour des URLs absolues)',
          productAccessLinks: { count: products.length, shown: productLinks.slice(0, 5), sample: productLinks },
          channels: { connected: channels.length, destinations: channels },
          affiliateKits: { count: Array.isArray(kits) ? kits.length : 0, trackingLinks: affiliateLinks }
        };
        if (args.check === true) {
          // Uniquement des URLs absolues (PUBLIC_URL définie) — les liens relatifs ne sont pas testables.
          const toCheck = [`${base}/sitemap.xml`, `${base}/feed.xml`, ...productLinks]
            .filter(u => u.startsWith('http'))
            .slice(0, 5);
          if (toCheck.length === 0) {
            return { ...inventory, healthCheck: { checked: 0, ok: 0, results: [], note: 'PUBLIC_URL absente — aucun lien absolu testable (définir PUBLIC_URL pour activer le contrôle).' } };
          }
          const health = await Promise.all(toCheck.map(u => checkUrlHealth(u)));
          return {
            ...inventory,
            healthCheck: {
              checked: health.length,
              ok: health.filter(h => h.ok).length,
              results: health
            }
          };
        }
        return inventory;
      }
    },

    // ════════════ VUE GLOBALE (Hermes « voit » toute la plateforme) ════════════
    {
      name: 'platform_overview',
      description: "Vue d'ensemble COMPLÈTE de la plateforme en un appel : boutique (produits/CA/commandes), canaux, harvest GitHub (repos + meilleurs scores), liens, auto-pilot client synchronisé, pool IA, skills & agents Hermes. Point de départ idéal avant toute demande transversale.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const [products, orders, integrations, repos, kits, apEnabled1, apEnabled2, apSpeed1, apSpeed2, autonomyCfg, lastHarvest] = await Promise.all([
          readList('dpf_app_v2_products'), readList('dpf_app_v2_orders'), readList('dpf_app_v2_integrations'),
          readList('df_github_repositories'), readList('df_affiliate_promo_kits_v1'),
          kvGet('df_auto_pilot_enabled_v1'), kvGet('df_auto_pilot_enabled'),
          kvGet('df_auto_loop_speed_v1'), kvGet('df_auto_loop_speed'),
          kvGet('df_hermes_autonomy_config'), kvGet('df_github_last_harvest')
        ]);
        const revenue = orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
        const base = (process.env.PUBLIC_URL || '').trim().replace(/\/$/, '');
        const published = products.filter(p => p.status === 'published');
        return {
          generatedAt: new Date().toISOString(),
          boutique: {
            products: products.length, published: published.length,
            orders: orders.length, revenueEur: Math.round(revenue * 100) / 100,
            topProducts: [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 3)
              .map(p => ({ id: p.id, title: p.title, sales: p.salesCount || 0, priceEur: p.pricing?.recommendedPrice ?? p.price ?? null }))
          },
          canaux: {
            total: integrations.length,
            connected: integrations.filter(i => i.connected).length,
            names: integrations.filter(i => i.connected).slice(0, 8).map(i => i.name || i.service || 'canal')
          },
          reposGithub: {
            total: repos.length,
            lastHarvest: lastHarvest ? { at: lastHarvest.at, query: lastHarvest.query, added: lastHarvest.added } : null,
            top: [...repos].sort((a, b) => (b.commercialViabilityScore || 0) - (a.commercialViabilityScore || 0)).slice(0, 3)
              .map(r => ({ name: r.fullName || r.name, score: r.commercialViabilityScore ?? null, productType: r.suggestedProductType || null }))
          },
          liens: {
            publicUrl: base || 'absent (liens relatifs)',
            productLinks: published.length,
            sitemap: `${base || ''}/sitemap.xml`,
            rss: `${base || ''}/feed.xml`,
            affiliateKits: Array.isArray(kits) ? kits.length : 0
          },
          autoPilotClient: {
            enabled: apEnabled1 ?? apEnabled2 ?? null,
            loopSpeed: apSpeed1 || apSpeed2 || null,
            note: "État des cycles client (22 bots de l'UI, synchronisés) — distinct de l'autonomie serveur d'Hermes (df_hermes_autonomy_config)."
          },
          autonomieHermes: autonomyCfg || { enabled: null, note: 'non configurée — GET /api/hermes/autonomy' },
          hermes: { skills: 'voir /api/hermes/skills', agents: 'voir list_agents' }
        };
      }
    },

    // ════════════ MULTI-AGENT ════════════
    {
      name: 'list_agents',
      description: "Liste les agents spécialisés disponibles (id, rôle, skills) pour dispatch_agent.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const { getAgents } = await import('./agents');
        return getAgents().map(a => ({ id: a.id, name: a.name, emoji: a.emoji, role: a.role, skillsCount: a.skills?.length || 'tous' }));
      }
    },
    {
      name: 'dispatch_agent',
      description: "Délègue une tâche à un agent spécialisé (budget limité). Utiliser pour les tâches qui sortent du scope courant. Renvoie le rapport de l'agent.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: "ID de l'agent (voir list_agents)" },
          task: { type: 'string', description: 'Tàche précise à exécuter (≤500 car.)' }
        },
        required: ['agentId', 'task']
      },
      async run(args) {
        const { getAgents } = await import('./agents');
        const { runSubAgent } = await import('./engine');
        const agent = getAgents().find(a => a.id === str(args.agentId, 40));
        if (!agent) throw new Error(`Agent inconnu : ${args.agentId}. Utilisez list_agents.`);
        const task = str(args.task, 500);
        if (!task) throw new Error('task vide.');
        return runSubAgent(agent, task);
      }
    },
    // ---------- Gestionnaire d'API & tokens — pool multi-fournisseurs (jamais bloqué) ----------
    // Ces 4 skills permettent à Hermes de gérer LUI-MÊME le pool de fournisseurs
    // IA au runtime (ajout de tokens, bascule automatique, tests) — sans redéploiement.
    // Les clés ne transitent JAMAIS en clair dans les traces (masquées par maskArgsForTrace).
    {
      name: 'providers_list',
      description: "Liste le pool de fournisseurs IA (gestionnaire d'API & tokens) : environnement + pool géré, priorité, état (cooldown, erreurs), clés masquées. Pour comprendre la bascule automatique anti-blocage.",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const { getPoolStatus } = await import('./providers');
        const pool = await getPoolStatus();
        return {
          count: pool.length,
          policy: 'bascule automatique : 429/erreur → cooldown (30 s sur rate-limit, 15 s sur erreur) → fournisseur suivant',
          pool: pool.map(e => ({
            name: e.name, kind: e.kind, model: e.model, baseUrl: e.baseUrl, local: e.local,
            priority: e.priority, source: e.source, key: e.key,
            inCooldown: e.inCooldown, cooldownRemainingSec: e.cooldownRemainingSec,
            calls: e.calls, ok: e.ok, errors: e.errors, lastError: e.lastError
          }))
        };
      }
    },
    {
      name: 'providers_add',
      description: "AJOUTE un fournisseur IA au pool (runtime, sans redéploiement) pour la bascule automatique anti-blocage. kind='gemini' (apiKey requis, gratuit) ou 'priority' plus bas = plus prioritaire. kind='openai' : baseUrl + model (Groq, OpenRouter, Mistral, Ollama local avec local=true), apiKey optionnel. Utilisez free_llm_lookup pour trouver un endpoint gratuit compatible.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Identifiant 2-40 car. [a-z0-9-_-]' },
          kind: { type: 'string', enum: ['gemini', 'openai'], description: "Type d'endpoint" },
          model: { type: 'string', description: "Modèle (openai : requis ; gemini : défaut gemini-2.5-flash)" },
          baseUrl: { type: 'string', description: "URL de base compatible OpenAI (openai : requis) — https public, ou http localhost si local=true" },
          apiKey: { type: 'string', description: "Clé API (jamais exposée : stockée KV protégée, masquée partout) — requise pour gemini" },
          priority: { type: 'number', description: '1 = le plus prioritaire (défaut 500, le mock est en 999)' },
          local: { type: 'boolean', description: 'true = endpoint local de confiance (Ollama http://localhost:11434/v1)' }
        },
        required: ['name', 'kind']
      },
      async run(args) {
        const { addProvider } = await import('./providers');
        const { entry } = await addProvider({
          name: str(args.name, 40),
          kind: str(args.kind, 10) as any,
          model: str(args.model, 120) || undefined,
          baseUrl: str(args.baseUrl, 300) || undefined,
          apiKey: str(args.apiKey, 500) || undefined,
          priority: Number.isFinite(Number(args.priority)) ? Number(args.priority) : undefined,
          local: Boolean(args.local)
        });
        return { added: entry.name, entry, note: 'La clé est stockée dans une clé KV protégée (jamais exposée via /api/store, UI, audit ou logs).' };
      }
    },
    {
      name: 'providers_remove',
      description: "Retire un fournisseur du pool (le pool reste au moins sur le mock — jamais bloqué). Les fournisseurs d'environnement (gemini-env, openai-env) ne sont pas retirables : changez HERMES_PROVIDER à la place.",
      access: 'write',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Nom du fournisseur à retirer' } },
        required: ['name']
      },
      async run(args) {
        const { removeProvider } = await import('./providers');
        return await removeProvider(str(args.name, 40));
      }
    },
    {
      name: 'providers_test',
      description: "Teste la connexion d'un fournisseur du pool (1 micro-appel ~1 token) : ok/erreur + latence. Ne déclenche pas de cooldown.",
      access: 'read',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Nom du fournisseur à tester' } },
        required: ['name']
      },
      async run(args) {
        const { testProvider } = await import('./providers');
        return await testProvider(str(args.name, 40));
      }
    },

    // ============================================================
    // DOCTEUR DE CODE — détection + correction des erreurs d'intégration
    // (voir hermes/diagnostics.ts). C'est l'agent qui répond à « Stripe ne
    // marche pas » : il trouve l'appel client fautif (401/403/échec silencieux)
    // et peut le réparer, avec confirmation.
    // ============================================================
    {
      name: 'code_scan',
      description: "DOCTEUR DE CODE : analyse les appels fetch('/api/…') du client et détecte les erreurs d'intégration qui cassent une fonction — endpoint protégé appelé SANS Authorization (401 systématique), clé KV protégée lue/écrite via /api/store (403 systématique), réponse jamais vérifiée (échec silencieux affiché comme un succès), endpoint absent du contrat. À utiliser dès qu'une fonction (Stripe, réseaux sociaux, checkout) « ne marche pas ».",
      access: 'read',
      parameters: {
        type: 'object',
        properties: {
          rule: { type: 'string', enum: ['missing_auth', 'protected_write', 'protected_read', 'unchecked_response', 'unknown_endpoint'], description: 'Filtrer sur une règle' },
          onlyFixable: { type: 'boolean', description: 'Ne garder que les findings avec correctif automatique' }
        }
      },
      async run(args) {
        const { scanSources } = await import('./diagnostics');
        const report = scanSources();
        let findings = report.findings;
        if (args.rule) findings = findings.filter(f => f.rule === args.rule);
        if (args.onlyFixable) findings = findings.filter(f => Boolean(f.fix));
        return {
          scannedFiles: report.scannedFiles,
          apiCalls: report.apiCalls,
          count: findings.length,
          byRule: report.byRule,
          findings: findings.slice(0, 20).map(f => ({
            id: f.id, rule: f.rule, severity: f.severity,
            location: `${f.file}:${f.line}`, endpoint: f.endpoint,
            httpStatus: f.httpStatus, message: f.message,
            autoFix: f.fix ? f.fix.kind : null
          })),
          nextStep: findings.length > 0
            ? "Corriger avec code_fix (confirmation requise) — un correctif à la fois, puis re-scan."
            : 'Aucune erreur d’intégration détectée : le problème est ailleurs (configuration → stripe_doctor).'
        };
      }
    },
    {
      name: 'code_fix',
      description: "APPLIQUE le correctif d'un finding du docteur de code (injection de l'en-tête Authorization + import manquant, ou garde `res.ok`). Le fichier original est sauvegardé dans .dig-doctor/ avant écriture, puis le scan est rejoué. Confirmation obligatoire.",
      access: 'destructive',
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Identifiant du finding (retourné par code_scan)' },
          confirm: { type: 'boolean', description: 'Confirmation explicite obligatoire' }
        },
        required: ['id']
      },
      async run(args) {
        const { applyFix } = await import('./diagnostics');
        const id = str(args.id, 120);
        const result = applyFix(id);
        if (!result.applied) throw new Error(result.reason || 'Correctif non appliqué.');
        return {
          applied: true,
          file: result.file,
          line: result.line,
          rule: result.rule,
          backup: result.backup,
          remainingFindings: result.remainingFindings,
          note: 'Relancer code_scan pour vérifier ; un `npm run build` est nécessaire pour publier le correctif.'
        };
      }
    },
    {
      name: 'stripe_doctor',
      description: "Diagnostic Stripe runtime : source de la clé (env/base), format (sk_live_/sk_test_ — une clé pk_ est refusée par Stripe), cohérence mode déclaré vs clé, secret de webhook, devise ISO, conflit DEMO_CHECKOUT, produits publiés sans prix. JAMAIS de secret en clair (masquage).",
      access: 'read',
      parameters: { type: 'object', properties: {} },
      async run() {
        const products = await readList('dpf_app_v2_products');
        const { stripeDoctor, probeStripeApi } = await import('./diagnostics');
        const envKey = (process.env.STRIPE_SECRET_KEY || '').trim();
        const envWhsec = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
        const dbKey = String((await kvGet('df_stripe_sk')) || '').replace(/^"|"$/g, '').trim();
        const dbWhsec = String((await kvGet('df_stripe_whsec')) || '').replace(/^"|"$/g, '').trim();
        const report = stripeDoctor({
          envKey, dbKey, envWhsec, dbWhsec,
          mode: String((await kvGet('df_stripe_mode')) || 'test'),
          currency: String((await kvGet('df_stripe_currency')) || 'EUR'),
          demoCheckout: (process.env.DEMO_CHECKOUT || '').trim(),
          products,
          publicUrl: (process.env.PUBLIC_URL || '').trim(),
          apiProbe: await probeStripeApi()
        });
        return {
          ok: report.ok,
          effective: report.effective,
          checks: report.checks,
          nextStep: report.ok
            ? 'Configuration Stripe cohérente : si le paiement échoue encore, lancer code_scan (erreur d’intégration client) puis vérifier le webhook dans le dashboard Stripe.'
            : 'Corriger les points en statut fail avant de re-tester un paiement.'
        };
      }
    }
  ];
}

export const skillRegistry = buildSkillRegistry();

export function getSkill(name: string): HermesTool | undefined {
  return skillRegistry.find(t => t.name === name);
}

export function declareSkills(names?: string[], allowedOnly?: string[]): ToolDeclarationSchemaList {
  let list = names ? skillRegistry.filter(t => names.includes(t.name)) : skillRegistry;
  if (allowedOnly) list = list.filter(t => allowedOnly.includes(t.name));
  return list.map(t => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

/**
 * Périmètre AUTONOMIE (cycle planifié sans utilisateur à l'écran) —
 * « autonomie sûre » : lecture + création de BROUILLONS uniquement.
 * Jamais exécutées en autonomie : re-pricing, publication, suppression,
 * diffusion canaux, kv_set, pool de fournisseurs, code_fix…
 * (les skills requiresConfirmation restent bloquées par le moteur de toute façon).
 */
export const AUTONOMY_SAFE_SKILLS: string[] = [
  // Lecture
  'platform_overview', 'platform_links', 'repos_list', 'repos_get', 'reference_repos',
  'metrics_summary', 'orders_recent', 'audit_system', 'settings_summary',
  'catalog_list', 'catalog_get', 'pricing_audit', 'bundles_list', 'content_list',
  'campaigns_list', 'channels_list', 'seo_get', 'kv_get', 'logs_add',
  'list_agents', 'web_search', 'web_fetch', 'web_link_check',
  'free_tier_lookup', 'free_llm_lookup',
  // Veille & création de brouillons (jamais de publication)
  'repos_harvest', 'catalog_create', 'content_create', 'bundles_create', 'opportunities_add'
];

type ToolDeclarationSchemaList = Array<{ name: string; description: string; parameters: ToolParameterSchema }>;
