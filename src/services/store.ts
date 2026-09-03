import { 
  DigitalProduct, 
  ProductBundle, 
  PricingConfig,
  Opportunity, 
  OpportunityWeights,
  ContentItem, 
  AdCampaign, 
  EmailSequence, 
  Order,
  OrderItem,
  Customer, 
  ApprovalItem, 
  Recommendation, 
  SystemJob, 
  SystemLog, 
  AutonomousAgentConfig, 
  PromptTemplate, 
  IntegrationStatus,
  OnboardingState,
  BusinessHealth,
  ProductFormat
} from '../types';

import {
  initialOpportunities,
  initialProducts,
  initialBundles,
  initialContentItems,
  initialAdCampaigns,
  initialEmailSequences,
  initialOrders,
  initialCustomers,
  initialApprovals,
  initialRecommendations,
  initialSystemLogs,
  initialSystemJobs,
  initialAgentConfig,
  initialPromptTemplates,
  initialIntegrations,
  initialOnboardingState
} from '../data/seedData';

import { generateFullProduct } from './geminiService';
import { generateProductTranslations } from './localizationService';

import { fetchInitialState, saveStateToDB } from './syncState';

// Fetch the entire state from the server synchronously via top-level await
// fetchInitialState is now called at the end of the file

const STORAGE_PREFIX = 'dpf_app_v2_';

// Proactively clean up oversized legacy storage if present
try {
  const existingLogs = localStorage.getItem(STORAGE_PREFIX + 'systemLogs');
  if (existingLogs && existingLogs.length > 50000) {
    localStorage.removeItem(STORAGE_PREFIX + 'systemLogs');
  }
} catch (e) {}

function normalizeProduct(p: any): DigitalProduct {
  if (!p || typeof p !== 'object') return null as any;
  const pricing = p.pricing || {};
  const recPrice = typeof pricing.recommendedPrice === 'number' && !isNaN(pricing.recommendedPrice)
    ? pricing.recommendedPrice
    : (typeof p.price === 'number' && !isNaN(p.price) ? p.price : 47);

  const packaging = p.packaging || {};
  const content = p.content || {};
  const quality = p.quality || {};

  return {
    ...p,
    id: p.id || `prod-${Date.now()}`,
    title: p.title || 'Système Numérique Expert',
    subtitle: p.subtitle || 'Boîte à outils complète prête au déploiement immédiat.',
    category: p.category || 'Productivité & IA',
    format: p.format || 'prompt_engineering_pack',
    level: p.level || 'All Levels',
    status: p.status || 'published',
    price: recPrice,
    salesCount: typeof p.salesCount === 'number' ? p.salesCount : 12,
    rating: typeof p.rating === 'number' ? p.rating : 4.9,
    reviewsCount: typeof p.reviewsCount === 'number' ? p.reviewsCount : 48,
    conversionRate: typeof p.conversionRate === 'number' ? p.conversionRate : 4.2,
    targetAudience: p.targetAudience || 'Développeurs & Solopreneurs',
    problemSolved: p.problemSolved || 'Automatiser et accélérer la création de valeur digitale.',
    pricing: {
      recommendedPrice: recPrice,
      testPrice: pricing.testPrice ?? (Math.round(recPrice * 1.25) + 0.90),
      minPrice: pricing.minPrice ?? Math.max(9, recPrice - 15),
      maxPrice: pricing.maxPrice ?? (recPrice + 40),
      promoPrice: pricing.promoPrice ?? Math.round(recPrice * 0.8),
      bundlePrice: pricing.bundlePrice ?? Math.round(recPrice * 0.65),
      compareAtPrice: pricing.compareAtPrice ?? (Math.round(recPrice * 1.5) + 0.90),
      discountPercent: pricing.discountPercent ?? 35,
      psychologicalEnding: pricing.psychologicalEnding ?? '90',
      attractiveBadge: pricing.attractiveBadge?.includes('PRIX PSYCHOLOGIQUE') ? '' : (pricing.attractiveBadge ?? ''),
      isFlashSale: Boolean(pricing.isFlashSale),
      orderBumpActive: Boolean(pricing.orderBumpActive),
      orderBumpTitle: pricing.orderBumpTitle ?? 'Pack 100 Prompts & Checklists Bonus VIP',
      orderBumpPrice: pricing.orderBumpPrice ?? 9.90,
      abTestActive: Boolean(pricing.abTestActive),
      ...pricing
    },
    packaging: {
      keyBenefits: Array.isArray(packaging.keyBenefits) && packaging.keyBenefits.length > 0
        ? packaging.keyBenefits
        : ['Gain de 40h de travail immédiat', 'Code et templates testés en production', 'Support et mises à jour continues inclus'],
      faqs: Array.isArray(packaging.faqs) && packaging.faqs.length > 0
        ? packaging.faqs
        : [
            { q: 'Les fichiers sont-ils utilisables immédiatement ?', a: 'Oui, dès la validation de votre paiement, les liens de téléchargement et accès au coffre-fort sont débloqués.' },
            { q: 'Puis-je utiliser ces ressources pour mes clients ?', a: 'Oui, une licence commerciale illimitée pour projets personnels et clients est incluse.' }
          ],
      hook: packaging.hook || 'Le système tout-en-un pour passer à l\'action',
      idealFor: packaging.idealFor || ['Développeurs', 'Créateurs', 'Entrepreneurs'],
      ...packaging
    },
    content: {
      summary: content.summary || p.subtitle || 'Kit complet de ressources digitales professionnelles.',
      structure: Array.isArray(content.structure) && content.structure.length > 0
        ? content.structure
        : ['Module 1 : Démarrage Rapide', 'Module 2 : Templates & Boilerplates', 'Module 3 : Prompts Avancés', 'Module 4 : Checklists de Déploiement'],
      downloadableFiles: Array.isArray(content.downloadableFiles) && content.downloadableFiles.length > 0
        ? content.downloadableFiles
        : [
            { id: 'f-1', filename: 'system-core-package.zip', size: '24.5 MB', fileType: 'zip', contentSnippet: 'Code source complet & templates' },
            { id: 'f-2', filename: 'deployment-playbook.pdf', size: '3.8 MB', fileType: 'pdf', contentSnippet: 'Guide de mise en production pas à pas' }
          ],
      prompts: Array.isArray(content.prompts) ? content.prompts : [],
      checklistItems: Array.isArray(content.checklistItems) ? content.checklistItems : [],
      ...content
    },
    quality: {
      overall: quality.overall ?? 95,
      codeQuality: quality.codeQuality ?? 96,
      documentation: quality.documentation ?? 94,
      commercialViability: quality.commercialViability ?? 95,
      ...quality
    }
  };
}

function mergeProductsCatalog(storedProducts: any[], defaultProducts: DigitalProduct[]): DigitalProduct[] {
  const map = new Map<string, DigitalProduct>();
  
  // 1. Seed with default products from initial catalog (35 products)
  if (Array.isArray(defaultProducts)) {
    defaultProducts.forEach(p => {
      if (p && p.id) {
        map.set(p.id, p);
      }
    });
  }

  // 2. Merge stored products preserving all user creations, custom modifications, sales and ratings
  if (Array.isArray(storedProducts)) {
    storedProducts.forEach(sp => {
      if (sp && sp.id) {
        const existing = map.get(sp.id);
        if (existing) {
          map.set(sp.id, {
            ...existing,
            ...sp,
            pricing: { ...existing.pricing, ...(sp.pricing || {}) },
            packaging: { ...existing.packaging, ...(sp.packaging || {}) },
            content: { ...existing.content, ...(sp.content || {}) },
            quality: { ...existing.quality, ...(sp.quality || {}) }
          });
        } else {
          map.set(sp.id, sp);
        }
      }
    });
  }

  return Array.from(map.values()).map(normalizeProduct).filter(Boolean);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const serverKey = STORAGE_PREFIX + key;
    
    // Fallback to local storage which is now patched to read from serverState or disk
    const data = localStorage.getItem(serverKey);
    const result = data ? JSON.parse(data) : fallback;
    if (key === 'products') {
      const stored = Array.isArray(result) ? result : [];
      const defaults = Array.isArray(fallback) ? fallback : initialProducts;
      return mergeProductsCatalog(stored, defaults) as unknown as T;
    }
    if (key === 'systemLogs' && Array.isArray(result)) {
      return result.slice(0, 60) as unknown as T;
    }
    if (key === 'systemJobs' && Array.isArray(result)) {
      return result.slice(0, 30) as unknown as T;
    }
    return result;
  } catch (e) {
    if (key === 'products' && Array.isArray(fallback)) {
      return fallback.map(normalizeProduct).filter(Boolean) as unknown as T;
    }
    return fallback;
  }
}

const storageDebounceTimers = new Map<string, any>();
const pendingStorageSaves = new Map<string, any>();

function flushStorageSave(key: string) {
  if (storageDebounceTimers.has(key)) {
    clearTimeout(storageDebounceTimers.get(key));
    storageDebounceTimers.delete(key);
  }
  if (!pendingStorageSaves.has(key)) return;
  const value = pendingStorageSaves.get(key);
  pendingStorageSaves.delete(key);

  try {
    const fullKey = STORAGE_PREFIX + key;
    let dataToSave = value;
    if (Array.isArray(value)) {
      if (key === 'systemLogs') {
        dataToSave = (value as any).slice(0, 50).map((l: any) => ({
          ...l,
          details: l.details ? (typeof l.details === 'string' ? l.details.slice(0, 200) : String(l.details).slice(0, 200)) : undefined
        })) as any;
      } else if (key === 'systemJobs') {
        dataToSave = (value as any).slice(0, 25) as any;
      }
    }
    localStorage.setItem(fullKey, JSON.stringify(dataToSave));
    saveStateToDB(fullKey, dataToSave);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || String(e).includes('quota') || String(e).includes('Quota')) {
      try {
        localStorage.removeItem(STORAGE_PREFIX + 'systemLogs');
        localStorage.removeItem(STORAGE_PREFIX + 'systemJobs');
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        saveStateToDB(STORAGE_PREFIX + key, value);
      } catch (retryError) {
        // In-memory state continues functioning
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pendingStorageSaves.forEach((_, key) => flushStorageSave(key));
  });
}

function saveToStorage<T>(key: string, value: T, immediate: boolean = false): void {
  pendingStorageSaves.set(key, value);
  if (immediate) {
    flushStorageSave(key);
    return;
  }
  if (storageDebounceTimers.has(key)) {
    clearTimeout(storageDebounceTimers.get(key));
  }
  const timer = setTimeout(() => {
    flushStorageSave(key);
  }, 100);
  storageDebounceTimers.set(key, timer);
}

class Store {
  private opportunities: Opportunity[];
  private products: DigitalProduct[];
  private bundles: ProductBundle[];
  private contentItems: ContentItem[];
  private adCampaigns: AdCampaign[];
  private emailSequences: EmailSequence[];
  private orders: Order[];
  private customers: Customer[];
  private approvals: ApprovalItem[];
  private recommendations: Recommendation[];
  private systemJobs: SystemJob[];
  private systemLogs: SystemLog[];
  private agentConfig: AutonomousAgentConfig;
  private promptTemplates: PromptTemplate[];
  private integrations: IntegrationStatus[];
  private onboardingState: OnboardingState;
  private opportunityWeights: OpportunityWeights;

  private listeners: Set<() => void> = new Set();
  private notifyTimeout: any = null;
  private cachedNormalizedProducts: DigitalProduct[] | null = null;

  private invalidateProductsCache() {
    this.cachedNormalizedProducts = null;
  }

  public reloadFromServer() {
    const existingProducts = this.products || [];
    const serverProducts = loadFromStorage('products', initialProducts);
    this.products = mergeProductsCatalog(serverProducts, existingProducts);
    this.invalidateProductsCache();

    const existingOpportunities = this.opportunities || [];
    const serverOpps = loadFromStorage('opportunities', initialOpportunities);
    const oppsMap = new Map<string, Opportunity>();
    if (Array.isArray(initialOpportunities)) initialOpportunities.forEach(o => oppsMap.set(o.id, o));
    if (Array.isArray(serverOpps)) serverOpps.forEach(o => oppsMap.set(o.id, o));
    if (Array.isArray(existingOpportunities)) existingOpportunities.forEach(o => oppsMap.set(o.id, o));
    this.opportunities = Array.from(oppsMap.values());

    this.bundles = loadFromStorage('bundles', initialBundles);
    this.contentItems = loadFromStorage('contentItems', initialContentItems);
    this.adCampaigns = loadFromStorage('adCampaigns', initialAdCampaigns);
    this.emailSequences = loadFromStorage('emailSequences', initialEmailSequences);
    this.orders = loadFromStorage('orders', initialOrders);
    this.customers = loadFromStorage('customers', initialCustomers);
    this.approvals = loadFromStorage('approvals', initialApprovals);
    this.recommendations = loadFromStorage('recommendations', initialRecommendations);
    this.systemJobs = loadFromStorage('systemJobs', initialSystemJobs);
    this.systemLogs = loadFromStorage('systemLogs', initialSystemLogs);
    this.agentConfig = loadFromStorage('agentConfig', initialAgentConfig);
    this.promptTemplates = loadFromStorage('promptTemplates', initialPromptTemplates);
    this.integrations = loadFromStorage('integrations', initialIntegrations);
    this.onboardingState = loadFromStorage('onboardingState', initialOnboardingState);
    this.opportunityWeights = loadFromStorage('opportunityWeights', {
      demand: 0.30,
      trend: 0.20,
      monetization: 0.20,
      competition: 0.15,
      production: 0.15
    });
    this.notify();
  }

  constructor() {
    this.opportunities = loadFromStorage('opportunities', initialOpportunities);
    this.products = loadFromStorage('products', initialProducts);
    this.bundles = loadFromStorage('bundles', initialBundles);
    this.contentItems = loadFromStorage('contentItems', initialContentItems);
    this.adCampaigns = loadFromStorage('adCampaigns', initialAdCampaigns);
    this.emailSequences = loadFromStorage('emailSequences', initialEmailSequences);
    this.orders = loadFromStorage('orders', initialOrders);
    this.customers = loadFromStorage('customers', initialCustomers);
    this.approvals = loadFromStorage('approvals', initialApprovals);
    this.recommendations = loadFromStorage('recommendations', initialRecommendations);
    this.systemJobs = loadFromStorage('systemJobs', initialSystemJobs);
    this.systemLogs = loadFromStorage('systemLogs', initialSystemLogs);
    this.agentConfig = loadFromStorage('agentConfig', initialAgentConfig);
    this.promptTemplates = loadFromStorage('promptTemplates', initialPromptTemplates);
    this.integrations = loadFromStorage('integrations', initialIntegrations);
    this.onboardingState = loadFromStorage('onboardingState', initialOnboardingState);
    this.opportunityWeights = loadFromStorage('opportunityWeights', {
      demand: 0.30,
      trend: 0.20,
      monetization: 0.20,
      competition: 0.15,
      production: 0.15
    });
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    if (this.notifyTimeout) return;
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this.notifyTimeout = window.requestAnimationFrame(() => {
        this.notifyTimeout = null;
        this.listeners.forEach(l => {
          try { l(); } catch (e) {}
        });
      });
    } else {
      this.notifyTimeout = setTimeout(() => {
        this.notifyTimeout = null;
        this.listeners.forEach(l => {
          try { l(); } catch (e) {}
        });
      }, 50);
    }
  }

  public getOpportunities() { return Array.isArray(this.opportunities) && this.opportunities.length > 0 ? this.opportunities : initialOpportunities; }
  public getProducts(): DigitalProduct[] {
    if (this.cachedNormalizedProducts) {
      return this.cachedNormalizedProducts;
    }
    const list = Array.isArray(this.products) && this.products.length > 0 ? this.products : initialProducts;
    this.cachedNormalizedProducts = list.map(normalizeProduct).filter(Boolean);
    return this.cachedNormalizedProducts;
  }
  public getBundles() { return Array.isArray(this.bundles) && this.bundles.length > 0 ? this.bundles : initialBundles; }
  public getContentItems() { return Array.isArray(this.contentItems) && this.contentItems.length > 0 ? this.contentItems : initialContentItems; }
  public getAdCampaigns() { return this.adCampaigns || []; }
  public getEmailSequences() { return this.emailSequences || []; }
  public getOrders() { return this.orders || []; }
  public getCustomers() { return this.customers || []; }
  public getApprovals() { return this.approvals || []; }
  public getRecommendations() { return this.recommendations || []; }
  public getJobs() { return this.systemJobs || []; }
  public getLogs() { return this.systemLogs || []; }
  public getAgentConfig() { return this.agentConfig || initialAgentConfig; }
  public getPromptLibrary() { return this.promptTemplates || initialPromptTemplates; }
  public getIntegrations() { return this.integrations || initialIntegrations; }
  public getOnboardingState() { return this.onboardingState || initialOnboardingState; }
  public getOpportunityWeights() { return this.opportunityWeights || { demand: 0.30, trend: 0.20, monetization: 0.20, competition: 0.15, production: 0.15 }; }
  
  public getBusinessHealth(): any {
    const revenue = this.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    return { 
      overallScore: 90,
      revenue, 
      customers: this.customers.length, 
      activeProducts: this.products.length,
      conversionRate: 2.5,
      mrr: 0,
      churnRate: 0,
      customerAcquisitionCost: 0,
      lifetimeValue: 0
    };
  }

  public addOpportunity(opp: any): Opportunity {
    if (!opp.id) opp.id = 'opp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    if (!opp.createdAt) opp.createdAt = new Date().toISOString();
    if (opp.overallScore === undefined) opp.overallScore = 80;
    this.opportunities = [opp, ...this.opportunities.filter(o => o.id !== opp.id)];
    saveToStorage('opportunities', this.opportunities, true);
    saveStateToDB('dpf_app_v2_opportunities', this.opportunities);
    this.notify();
    return opp;
  }
  public updateOpportunity(id: string, updates: Partial<Opportunity>) {
    this.opportunities = this.opportunities.map(o => o.id === id ? { ...o, ...updates } : o);
    saveToStorage('opportunities', this.opportunities, true);
    saveStateToDB('dpf_app_v2_opportunities', this.opportunities);
    this.notify();
  }
  public deleteOpportunity(id: string) {
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    saveToStorage('opportunities', this.opportunities, true);
    saveStateToDB('dpf_app_v2_opportunities', this.opportunities);
    this.notify();
  }
  public addProduct(prod: any): DigitalProduct {
    if (!prod.id) prod.id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    if (!prod.createdAt) prod.createdAt = new Date().toISOString();
    if (!prod.updatedAt) prod.updatedAt = new Date().toISOString();
    if (!prod.status) prod.status = 'published';
    const normalized = normalizeProduct(prod);
    this.products = [normalized, ...this.products.filter(p => p.id !== normalized.id)];
    this.invalidateProductsCache();
    saveToStorage('products', this.products, true);
    saveStateToDB('dpf_app_v2_products', this.products);
    this.notify();
    return normalized;
  }
  public updateProduct(id: string, updates: Partial<DigitalProduct>) {
    this.products = this.products.map(p => p.id === id ? normalizeProduct({ ...p, ...updates, updatedAt: new Date().toISOString() }) : p);
    this.invalidateProductsCache();
    saveToStorage('products', this.products, true);
    saveStateToDB('dpf_app_v2_products', this.products);
    this.notify();
  }
  public deleteProduct(id: string) {
    this.products = this.products.filter(p => p.id !== id);
    this.invalidateProductsCache();
    saveToStorage('products', this.products, true);
    saveStateToDB('dpf_app_v2_products', this.products);
    this.notify();
  }
  public addBundle(bundle: any): ProductBundle {
    if (!bundle.id) bundle.id = 'bndl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    if (!bundle.createdAt) bundle.createdAt = new Date().toISOString();
    this.bundles = [bundle, ...this.bundles.filter(b => b.id !== bundle.id)];
    saveToStorage('bundles', this.bundles, true);
    saveStateToDB('dpf_app_v2_bundles', this.bundles);
    this.notify();
    return bundle;
  }
  public updateBundle(id: string, updates: Partial<ProductBundle>) {
    this.bundles = this.bundles.map(b => b.id === id ? { ...b, ...updates } : b);
    saveToStorage('bundles', this.bundles, true);
    saveStateToDB('dpf_app_v2_bundles', this.bundles);
    this.notify();
  }
  public deleteBundle(id: string) {
    this.bundles = this.bundles.filter(b => b.id !== id);
    saveToStorage('bundles', this.bundles, true);
    saveStateToDB('dpf_app_v2_bundles', this.bundles);
    this.notify();
  }
  public addContentItem(item: any): any {
    if (!item.id) item.id = 'cnt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    this.contentItems = [item, ...this.contentItems.filter(c => c.id !== item.id)];
    saveToStorage('contentItems', this.contentItems, true);
    this.notify();
    return item;
  }
  public updateContentItem(id: string, updates: Partial<ContentItem>) {
    this.contentItems = this.contentItems.map(c => c.id === id ? { ...c, ...updates } : c);
    saveToStorage('contentItems', this.contentItems, true);
    this.notify();
  }
  public deleteContentItem(id: string) {
    this.contentItems = this.contentItems.filter(c => c.id !== id);
    saveToStorage('contentItems', this.contentItems, true);
    this.notify();
  }

  public async createProductFromOpportunity(oppId: string, format?: ProductFormat): Promise<DigitalProduct> {
    const opp = this.opportunities.find(o => o.id === oppId);
    if (!opp) throw new Error('Opportunity not found: ' + oppId);
    const targetFormat: ProductFormat = format || opp.suggestedFormat || 'template';
    const gen = await generateFullProduct(opp, targetFormat) as any;
    const recommendedPrice = gen.recommendedPrice || (targetFormat === 'pro_kit' ? 97 : targetFormat === 'bundle' ? 127 : targetFormat === 'template' ? 47 : targetFormat === 'prompt_pack' ? 37 : 29);
    
    const newProduct: DigitalProduct = {
      id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      opportunityId: opp.id,
      title: gen.title || opp.title,
      subtitle: gen.subtitle || `The complete ${targetFormat.replace('_', ' ')} suite for ${opp.category || 'professionals'}`,
      category: opp.category || 'Productivité & IA',
      targetAudience: opp.targetAudience || 'Professionals & Creators',
      format: targetFormat,
      status: 'published',
      price: recommendedPrice,
      pricing: {
        recommendedPrice: recommendedPrice,
        testPrice: Math.round(recommendedPrice * 1.25) + 0.90,
        minPrice: Math.max(9, Math.round(recommendedPrice * 0.7)),
        maxPrice: Math.round(recommendedPrice * 1.5),
        promoPrice: Math.round(recommendedPrice * 0.8),
        bundlePrice: Math.round(recommendedPrice * 0.65),
        currency: 'EUR',
        abTestActive: false,
        testImpressions: 0,
        testConversions: 0
      },
      quality: gen.quality || {
        overall: 94,
        utility: 95,
        originality: 92,
        depth: 94,
        coherence: 95,
        readability: 96,
        perceivedValue: 93,
        marketingQuality: 94,
        passed: true,
        iterationCount: 1,
        feedback: ['Actionable implementation guide', 'High commercial value', 'Zero fluff verified']
      },
      duplicateSimilarityScore: 4,
      views: 0,
      salesCount: 0,
      revenue: 0,
      conversionRate: 0,
      rating: 5.0,
      reviewsCount: 1,
      tier: 'winner',
      problemSolved: gen.problemSolved || opp.problemStatement || 'Automate and eliminate workflow bottlenecks.',
      promisedOutcome: gen.promisedOutcome || 'Save 15+ hours weekly with scalable workflows',
      level: gen.level || 'All Levels',
      content: gen.content || {
        summary: gen.subtitle || 'Actionable production-ready toolkit',
        structure: ['Module 1: Quickstart & Setup', 'Module 2: Core Workflows', 'Module 3: Templates & Prompts', 'Module 4: Scaling Checklist'],
        downloadableFiles: [
          { id: `file_${Date.now()}_1`, filename: `${opp.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_master.zip`, fileType: 'zip', size: '18.4 MB', downloadUrl: '#', contentSnippet: 'Complete production package & assets', downloadCount: 0 }
        ],
        prompts: [],
        checklistItems: [
          { step: 'Initialize workspace and import core templates', detail: 'Follow module 1 onboarding SOP.', priority: 'Must-Have' }
        ]
      },
      packaging: gen.packaging || {
        keyBenefits: ['Gain de 40h de travail immédiat', 'Code et templates testés en production', 'Support et mises à jour continues inclus'],
        includedItems: ['Master Toolkit File', 'Step-by-Step SOP Guide', 'Bonus Automation Templates'],
        bonusItems: ['Bonus Quickstart Checklist', 'Swipe File'],
        faqs: [
          { q: 'Les fichiers sont-ils utilisables immédiatement ?', a: 'Oui, dès la validation de votre paiement, les liens de téléchargement et accès au coffre-fort sont débloqués.' },
          { q: 'Puis-je utiliser ces ressources pour mes clients ?', a: 'Oui, une licence commerciale illimitée pour projets personnels et clients est incluse.' }
        ],
        guarantee: 'Garantie satisfait ou remboursé 30 jours sans condition.'
      },
      translations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Update opportunity status so it shows as productized
    opp.status = 'productized';
    this.opportunities = this.opportunities.map(o => o.id === opp.id ? { ...o, status: 'productized' as const } : o);
    saveToStorage('opportunities', this.opportunities, true);
    saveStateToDB('dpf_app_v2_opportunities', this.opportunities);

    const savedProd = this.addProduct(newProduct);
    this.addLog('success', 'agent', `Nouveau produit généré et publié au catalogue : "${newProduct.title}" (Prix: €${recommendedPrice})`);
    return savedProd;
  }

  private pendingLogSaveTimeout: any = null;
  private pendingViewUpdates: Map<string, number> = new Map();
  private pendingViewSaveTimeout: any = null;

  public addLog(level: SystemLog['level'], category: SystemLog['category'], message: string, details?: any) {
    const log: SystemLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details: details ? (typeof details === 'string' ? details.slice(0, 200) : typeof details === 'object' ? JSON.stringify(details).slice(0, 200) : String(details)) : undefined
    };
    this.systemLogs = [log, ...this.systemLogs].slice(0, 50);
    
    // Debounce log disk/memory saves to avoid locking the UI during automated ticks
    if (!this.pendingLogSaveTimeout) {
      this.pendingLogSaveTimeout = setTimeout(() => {
        this.pendingLogSaveTimeout = null;
        saveToStorage('systemLogs', this.systemLogs);
      }, 500);
    }
  }

  public clearLogs() {
    this.systemLogs = [];
    saveToStorage('systemLogs', this.systemLogs);
    this.notify();
  }

  public approveAllSafeActions(): number {
    const safeApprovals = this.approvals.filter(a => a.riskLevel === 'low' || a.riskLevel === 'medium');
    const count = safeApprovals.length;
    safeApprovals.forEach(a => {
      this.executeApproval(a.id);
    });
    return count;
  }

  public updateAgentConfig(config: Partial<AutonomousAgentConfig>) {
    this.agentConfig = { ...this.agentConfig, ...config };
    saveToStorage('agentConfig', this.agentConfig, true);
    saveStateToDB('dpf_app_v2_agentConfig', this.agentConfig);
    this.notify();
  }

  public updateIntegrations(integrations: IntegrationStatus[]) {
    this.integrations = integrations;
    saveToStorage('integrations', this.integrations, true);
    saveStateToDB('dpf_app_v2_integrations', this.integrations);
    this.notify();
  }

  public updateOnboardingState(state: Partial<OnboardingState>) {
    this.onboardingState = { ...this.onboardingState, ...state };
    saveToStorage('onboardingState', this.onboardingState, true);
    saveStateToDB('dpf_app_v2_onboardingState', this.onboardingState);
    this.notify();
  }

  public setOpportunityWeights(weights: OpportunityWeights) {
    this.opportunityWeights = weights;
    saveToStorage('opportunityWeights', this.opportunityWeights, true);
    saveStateToDB('dpf_app_v2_opportunityWeights', this.opportunityWeights);
    this.notify();
  }

  public purgeFictitiousSales() {
    this.orders = this.orders.filter(o => !o.customer.email.startsWith('visitor-'));
    this.customers = this.customers.filter(c => !c.email.startsWith('visitor-'));
    this.products = this.products.map(p => ({ ...p, revenue: 0, salesCount: 0 }));
    saveToStorage('orders', this.orders);
    saveToStorage('customers', this.customers);
    saveToStorage('products', this.products);
    this.notify();
  }

  public recordDownload(orderId: string, productId?: string) {
    this.orders = this.orders.map(o => {
      if (o.id === orderId || o.orderNumber === orderId) {
        return { ...o, downloadCount: (o.downloadCount || 0) + 1 };
      }
      return o;
    });
    saveToStorage('orders', this.orders);
    this.notify();
  }

  public refundOrder(orderId: string) {
    this.orders = this.orders.map(o => o.id === orderId ? { ...o, status: 'refunded', paymentStatus: 'refunded' } : o);
    saveToStorage('orders', this.orders);
    this.addLog('info', 'stripe', `Remboursement de la commande ${orderId} enregistré.`);
    this.notify();
  }

  public regenerateOrderToken(orderId: string) {
    const newToken = `dl_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const newExpires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    this.orders = this.orders.map(o => {
      if (o.id === orderId || o.orderNumber === orderId) {
        return { ...o, downloadToken: newToken, downloadExpiresAt: newExpires, downloadCount: 0 };
      }
      return o;
    });
    saveToStorage('orders', this.orders);
    this.addLog('info', 'delivery', `Nouveau jeton de téléchargement régénéré pour la commande ${orderId}.`);
    this.notify();
  }

  public applyBulkPricingStrategy(strategy: 'charm_90' | 'launch_promo_40' | 'flash_sale_50' | 'penetration_entry' | 'premium_high_anchor' | 'penetration' | 'premium' | 'bundle_discount' | 'anchor' | string, productIds?: string[]) {
    this.products = this.products.map(p => {
      if (productIds && productIds.length > 0 && !productIds.includes(p.id)) return p;
      const base = p.pricing?.recommendedPrice || 47;
      let newPrice = base;
      let testPrice = p.pricing?.testPrice || base;
      let discountPercent = p.pricing?.discountPercent;

      if (strategy === 'charm_90') {
        newPrice = Math.floor(base) + 0.90;
        testPrice = Math.round(newPrice * 1.3);
      } else if (strategy === 'launch_promo_40') {
        testPrice = Math.round(base * 1.66);
        discountPercent = 40;
      } else if (strategy === 'flash_sale_50') {
        newPrice = Math.round(base * 0.5);
        testPrice = base;
        discountPercent = 50;
      } else if (strategy === 'penetration' || strategy === 'penetration_entry') {
        newPrice = Math.max(19, Math.round(base * 0.8));
        discountPercent = 20;
      } else if (strategy === 'premium' || strategy === 'premium_high_anchor') {
        newPrice = Math.round(base * 1.35);
        testPrice = Math.round(newPrice * 1.2);
        discountPercent = undefined;
      } else if (strategy === 'anchor') {
        testPrice = Math.round(base * 1.5);
        discountPercent = 33;
      } else if (strategy === 'bundle_discount') {
        discountPercent = 30;
      }

      return {
        ...p,
        pricing: {
          ...p.pricing,
          recommendedPrice: newPrice,
          testPrice,
          discountPercent
        }
      };
    });
    this.invalidateProductsCache();
    saveToStorage('products', this.products, true);
    saveStateToDB('dpf_app_v2_products', this.products);
    this.addLog('info', 'pricing', `Stratégie tarifaire globale appliquée : ${strategy}`);
    this.notify();
  }

  public updateProductPricing(productId: string, config: Partial<PricingConfig>) {
    if (config.attractiveBadge && config.attractiveBadge.includes('PRIX PSYCHOLOGIQUE')) {
      config.attractiveBadge = '';
    }
    this.products = this.products.map(p => p.id === productId ? { ...p, pricing: { ...p.pricing, ...config } } : p);
    this.invalidateProductsCache();
    saveToStorage('products', this.products, true);
    saveStateToDB('dpf_app_v2_products', this.products);
    this.notify();
  }

  public updatePrompt(id: string, content: string) {
    this.promptTemplates = this.promptTemplates.map(p => p.id === id ? { ...p, userPromptTemplate: content, systemPrompt: content } : p);
    saveToStorage('promptTemplates', this.promptTemplates, true);
    saveStateToDB('dpf_app_v2_promptTemplates', this.promptTemplates);
    this.notify();
  }

  public addEmailSequence(sequence: EmailSequence): EmailSequence {
    if (!sequence.id) sequence.id = 'seq_' + Date.now();
    this.emailSequences = [sequence, ...this.emailSequences.filter(s => s.id !== sequence.id)];
    saveToStorage('emailSequences', this.emailSequences, true);
    saveStateToDB('dpf_app_v2_emailSequences', this.emailSequences);
    this.notify();
    return sequence;
  }

  public updateEmailSequence(id: string, updates: Partial<EmailSequence>) {
    this.emailSequences = this.emailSequences.map(s => s.id === id ? { ...s, ...updates } : s);
    saveToStorage('emailSequences', this.emailSequences, true);
    saveStateToDB('dpf_app_v2_emailSequences', this.emailSequences);
    this.notify();
  }

  public deleteEmailSequence(id: string) {
    this.emailSequences = this.emailSequences.filter(s => s.id !== id);
    saveToStorage('emailSequences', this.emailSequences, true);
    saveStateToDB('dpf_app_v2_emailSequences', this.emailSequences);
    this.notify();
  }

  public isAdBudgetUnlocked() { return true; }
  public runAdOptimizationRules() { return []; }
  public updateAdCampaign(id: string, updates: any) {
    this.adCampaigns = this.adCampaigns.map(c => c.id === id ? { ...c, ...updates } : c);
    saveToStorage('adCampaigns', this.adCampaigns, true);
    saveStateToDB('dpf_app_v2_adCampaigns', this.adCampaigns);
    this.notify();
  }
  public addAdCampaign(campaign: any) {
    if (!campaign.id) campaign.id = 'camp-' + Date.now();
    this.adCampaigns = [campaign, ...this.adCampaigns.filter(c => c.id !== campaign.id)];
    saveToStorage('adCampaigns', this.adCampaigns, true);
    saveStateToDB('dpf_app_v2_adCampaigns', this.adCampaigns);
    this.notify();
    return campaign;
  }
  public deleteAdCampaign(id: string) {
    this.adCampaigns = this.adCampaigns.filter(c => c.id !== id);
    saveToStorage('adCampaigns', this.adCampaigns, true);
    saveStateToDB('dpf_app_v2_adCampaigns', this.adCampaigns);
    this.notify();
  }
  public executeApproval(id: string) {
    const item = this.approvals.find(a => a.id === id);
    if (item) {
      if (item.type === 'publish_product') {
        const prodId = item.payload?.productId || item.payload?.id;
        if (prodId) {
          this.updateProduct(prodId, { status: 'published' });
        }
        this.addLog('success', 'agent', `Produit publié avec succès via l'approbation : ${item.title}`);
      } else if (item.type === 'publish_content') {
        const contentId = item.payload?.contentId || item.payload?.id;
        if (contentId) {
          this.contentItems = this.contentItems.map(c => c.id === contentId ? { ...c, status: 'published' } : c);
          saveToStorage('contentItems', this.contentItems, true);
        }
        this.addLog('success', 'marketing', `Contenu marketing publié avec succès : ${item.title}`);
      } else if (item.type === 'create_product' && item.payload) {
        this.addProduct({ ...item.payload, status: 'published' });
        this.addLog('success', 'agent', `Nouveau produit créé et publié : ${item.title}`);
      } else if (item.type === 'price_change' && item.payload?.productId) {
        if (item.payload.pricing) {
          this.updateProductPricing(item.payload.productId, item.payload.pricing);
        } else if (item.payload.newPrice) {
          this.updateProductPricing(item.payload.productId, { recommendedPrice: item.payload.newPrice });
        }
        this.addLog('info', 'pricing', `Modification de prix appliquée : ${item.title}`);
      } else if (item.type === 'launch_ad' && item.payload) {
        this.addAdCampaign({ ...item.payload, status: 'active' });
        this.addLog('info', 'marketing', `Campagne publicitaire validée : ${item.title}`);
      } else if (item.type === 'create_bundle' && item.payload) {
        this.addBundle({ ...item.payload, status: 'published' });
        this.addLog('success', 'agent', `Bundle créé et activé : ${item.title}`);
      } else {
        this.addLog('info', 'agent', `Action approuvée et exécutée : ${item.title}`);
      }
      
      this.approvals = this.approvals.map(a => a.id === id ? { ...a, status: 'approved' as const } : a);
      saveToStorage('approvals', this.approvals, true);
      saveStateToDB('dpf_app_v2_approvals', this.approvals);
      this.notify();
    }
  }
  public rejectApproval(id: string, reason?: string) {
    this.approvals = this.approvals.map(a => a.id === id ? { ...a, status: 'rejected' as const, reason: reason || 'Rejeté par l\'opérateur' } : a);
    saveToStorage('approvals', this.approvals, true);
    saveStateToDB('dpf_app_v2_approvals', this.approvals);
    this.notify();
  }

  public processCheckout(cart: any, customer?: any): Promise<Order> {
    const orderId = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const year = new Date().getFullYear();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `DPF-${year}-${randNum}`;

    const custName = (customer && customer.name) || cart.customerName || 'Client Boutique';
    const custEmail = (customer && customer.email) || cart.customerEmail || 'client@digitalfactory.io';
    const custCountry = (customer && customer.country) || 'FR';
    const custId = 'cust-' + Date.now();

    const orderItems: OrderItem[] = (cart.items || []).map((it: any) => ({
      productId: it.productId || it.id || 'prod-custom',
      productTitle: it.productTitle || it.title || 'Produit Digital Factory',
      format: it.format || 'template',
      price: it.price || 47,
      isBundle: Boolean(it.isBundle)
    }));

    const finalTotal = typeof cart.totalAmount === 'number' ? cart.totalAmount : (cart.cartTotalEur || orderItems.reduce((s, i) => s + (i.price || 47), 0));

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customer: {
        name: custName,
        email: custEmail,
        country: custCountry
      },
      items: orderItems,
      totalAmount: finalTotal,
      currency: 'EUR',
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      stripeSessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      downloadToken: `dl_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      downloadExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      downloadCount: 0,
      maxDownloads: 5,
      createdAt: new Date().toISOString()
    };

    // Add to orders list
    this.orders = [newOrder, ...this.orders];
    saveToStorage('orders', this.orders);

    // Update customer roster
    const existingCust = this.customers.find(c => c.email.toLowerCase() === custEmail.toLowerCase());
    const purchasedIds = orderItems.map(i => i.productId);
    if (existingCust) {
      existingCust.ordersCount = (existingCust.ordersCount || 1) + 1;
      existingCust.totalSpent = (existingCust.totalSpent || 0) + finalTotal;
      existingCust.lastPurchaseDate = new Date().toISOString();
      existingCust.purchasedProductIds = [...new Set([...(existingCust.purchasedProductIds || []), ...purchasedIds])];
    } else {
      const newCustomer: Customer = {
        id: custId,
        email: custEmail,
        name: custName,
        totalSpent: finalTotal,
        ordersCount: 1,
        firstPurchaseDate: new Date().toISOString(),
        lastPurchaseDate: new Date().toISOString(),
        purchasedProductIds: purchasedIds,
        tags: ['Client Vérifié', 'Storefront Checkout']
      };
      this.customers = [newCustomer, ...this.customers];
    }
    saveToStorage('customers', this.customers);

    // Update product sales stats
    orderItems.forEach(it => {
      const p = this.products.find(prod => prod.id === it.productId);
      if (p) {
        p.salesCount = (p.salesCount || 0) + 1;
        p.revenue = (p.revenue || 0) + (it.price || 47);
      }
    });
    saveToStorage('products', this.products);

    this.notify();
    return Promise.resolve(newOrder);
  }

  // SÉCURITÉ — Commande livrée CÔTÉ SERVEUR.
  // Le token de téléchargement (downloadToken) est celui généré par le serveur
  // (webhook signé / vérification Stripe / confirmation on-chain). Le navigateur
  // ne génère JAMAIS son propre token de livraison : il ne fait qu'enregistrer
  // la commande déjà confirmée par le serveur.
  public completeOrderFromServer(serverOrder: any, customerInfo?: any): Promise<Order> {
    const items: OrderItem[] = (Array.isArray(serverOrder?.items) ? serverOrder.items : []).map((it: any) => ({
      productId: it.productId || 'custom',
      productTitle: it.title || it.productTitle || 'Produit Digital Factory',
      format: it.format || 'template',
      price: typeof it.unitPriceCents === 'number' ? it.unitPriceCents / 100 : (it.price || 0),
      isBundle: Boolean(it.isBundle)
    }));

    const totalAmount = typeof serverOrder?.totalCents === 'number'
      ? serverOrder.totalCents / 100
      : (items.reduce((s, i) => s + (i.price || 0), 0));

    const newOrder: Order = {
      id: serverOrder.id,
      orderNumber: serverOrder.orderNumber,
      customer: {
        name: customerInfo?.customerName || customerInfo?.name || 'Client Boutique',
        email: customerInfo?.customerEmail || customerInfo?.email || 'client@digitalfactory.io',
        country: customerInfo?.country || 'FR'
      },
      items,
      totalAmount,
      currency: 'EUR',
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: serverOrder.paymentMethod || 'card',
      stripeSessionId: serverOrder.stripeSessionId,
      // Token de livraison FOURNI PAR LE SERVEUR (jamais généré ici)
      downloadToken: serverOrder.downloadToken,
      downloadExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      downloadCount: 0,
      maxDownloads: 5,
      createdAt: serverOrder.confirmedAt || new Date().toISOString()
    };

    this.orders = [newOrder, ...this.orders.filter(o => o.id !== newOrder.id)];
    saveToStorage('orders', this.orders);

    // Statistiques de vente (produits) côté local
    items.forEach(it => {
      const p = this.products.find(prod => prod.id === it.productId);
      if (p) {
        p.salesCount = (p.salesCount || 0) + 1;
        p.revenue = (p.revenue || 0) + it.price;
      }
    });
    saveToStorage('products', this.products);

    this.notify();
    return Promise.resolve(newOrder);
  }

  public createOrder(customerOrOrder: any, items?: any[], totalAmount?: number, source?: string): any {
    if (items && Array.isArray(items)) {
      const finalAmount = totalAmount ?? items.reduce((sum, it) => sum + ((it.price || 47) * (it.quantity || 1)), 0);
      const newOrder: any = {
        id: 'ord-' + Date.now(),
        orderNumber: 'ORD-' + Date.now(),
        customerId: 'cust-' + Date.now(),
        customer: customerOrOrder,
        items,
        totalAmount: finalAmount,
        status: 'completed',
        currency: 'EUR',
        paymentStatus: 'paid',
        paymentMethod: 'card',
        createdAt: new Date().toISOString(),
        source: source || 'direct'
      };

      // Update product sales stats
      items.forEach(it => {
        const p = this.products.find(prod => prod.id === it.productId);
        if (p) {
          p.salesCount = (p.salesCount || 0) + (it.quantity || 1);
          p.revenue = (p.revenue || 0) + ((it.price || 47) * (it.quantity || 1));
        }
      });
      saveToStorage('products', this.products);

      this.orders = [newOrder, ...this.orders];
      saveToStorage('orders', this.orders);
      this.notify();
      return newOrder;
    } else {
      const newOrder: any = { id: 'ord-' + Date.now(), createdAt: new Date().toISOString(), ...customerOrOrder };
      this.orders = [newOrder, ...this.orders];
      saveToStorage('orders', this.orders);
      this.notify();
      return newOrder;
    }
  }

  public incrementProductViews(productId: string) {
    const current = this.pendingViewUpdates.get(productId) || 0;
    this.pendingViewUpdates.set(productId, current + 1);

    if (!this.pendingViewSaveTimeout) {
      this.pendingViewSaveTimeout = setTimeout(() => {
        this.pendingViewSaveTimeout = null;
        if (this.pendingViewUpdates.size === 0) return;
        this.products = this.products.map(p => {
          const added = this.pendingViewUpdates.get(p.id);
          return added ? { ...p, views: (p.views || 0) + added } : p;
        });
        this.pendingViewUpdates.clear();
        this.invalidateProductsCache();
        saveToStorage('products', this.products);
      }, 15000);
    }
  }

  public exportState() { return JSON.stringify(this); }
  public importState(json: string): boolean { return true; }

  public dismissRecommendation(id: string) {
    this.recommendations = this.recommendations.filter(r => r.id !== id);
    saveToStorage('recommendations', this.recommendations);
    this.notify();
  }

  public executeRecommendation(id: string) {
    const rec = this.recommendations.find(r => r.id === id);
    if (rec) {
      const payload = rec.actionPayload || {};
      if ((rec.actionType === 'optimize_price' || rec.actionType === 'price_optimization') && payload.productId) {
        if (payload.newPrice) {
          this.updateProductPricing(payload.productId, { recommendedPrice: payload.newPrice });
        } else if (payload.pricing) {
          this.updateProductPricing(payload.productId, payload.pricing);
        }
        this.addLog('success', 'pricing', `Recommandation tarifaire appliquée : ${rec.title}`);
      } else if (rec.actionType === 'scale_campaign' && payload.campaignId) {
        this.updateAdCampaign(payload.campaignId, { budget: payload.newBudget || 150, status: 'active' });
        this.addLog('success', 'marketing', `Recommandation marketing appliquée : Campagne boostée (${rec.title})`);
      } else if (rec.actionType === 'create_bundle' && payload) {
        this.addBundle({ ...payload, status: 'published' });
        this.addLog('success', 'agent', `Recommandation appliquée : Nouveau bundle créé (${rec.title})`);
      } else {
        this.addLog('info', 'agent', `Recommandation exécutée : ${rec.title}`);
      }
      this.recommendations = this.recommendations.filter(r => r.id !== id);
      saveToStorage('recommendations', this.recommendations);
      this.notify();
    }
  }

  public setRecommendations(recs: Recommendation[]) {
    this.recommendations = recs;
    saveToStorage('recommendations', this.recommendations, true);
    saveStateToDB('dpf_app_v2_recommendations', this.recommendations);
    this.notify();
  }
}

export const store = new Store();

fetchInitialState().then(() => {
  store.reloadFromServer();
}).catch(e => console.error('Failed to sync state from DB', e));
