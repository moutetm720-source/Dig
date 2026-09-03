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

// ---------- Registre ----------

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
    }
  ];
}

export const skillRegistry = buildSkillRegistry();

export function getSkill(name: string): HermesTool | undefined {
  return skillRegistry.find(t => t.name === name);
}

export function declareSkills(names?: string[]): ToolDeclarationSchemaList {
  const list = names ? skillRegistry.filter(t => names.includes(t.name)) : skillRegistry;
  return list.map(t => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

type ToolDeclarationSchemaList = Array<{ name: string; description: string; parameters: ToolParameterSchema }>;
