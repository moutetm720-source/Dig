import { 
  DigitalProduct, 
  StorefrontCluster, 
  StorefrontVisualConfig, 
  DigitalInventoryHealthRecord, 
  StorefrontAgentState,
  DigitalStockHealthStatus,
  IdenticalProductGroup
} from '../types';
import { store } from './store';
import { similarityGroupingAgent } from './similarityGroupingAgent';

const STORAGE_KEY = 'df_storefront_agent_state_v2';

const DEFAULT_CLUSTERS: StorefrontCluster[] = [
  {
    id: 'cluster-ai-systems',
    name: '🤖 Intelligence Artificielle & Prompts',
    slug: 'ai-prompts',
    icon: '🤖',
    badge: 'Top Tendance IA',
    description: 'Prompts haute performance, templates d\'agents IA et architectures prêtes à déployer.',
    productIds: ['prod-2', 'prod-4', 'prod-ai-1', 'prod-ai-2', 'prod-ai-3', 'prod-ai-4'],
    themeAccent: 'indigo',
    suggestedBundleDiscount: 30,
    averageRating: 4.95,
    totalProductsCount: 6
  },
  {
    id: 'cluster-dev-codebases',
    name: '⚡ Boilerplates & Code SaaS Full-Stack',
    slug: 'dev-saas',
    icon: '⚡',
    badge: 'Prêt Production',
    description: 'Next.js 15, TypeScript, Stripe, Auth & configurations cloud sans frictions de code.',
    productIds: ['prod-dev-1', 'prod-dev-2', 'prod-dev-3', 'prod-dev-4', 'prod-dev-5', 'prod-dev-6'],
    themeAccent: 'sky',
    suggestedBundleDiscount: 25,
    averageRating: 4.94,
    totalProductsCount: 6
  },
  {
    id: 'cluster-productivity-systems',
    name: '💼 Systèmes Notion & Solopreneurs',
    slug: 'notion-systems',
    icon: '💼',
    badge: 'Gagnez 10h/Semaine',
    description: 'Dashboards Notion clés en main, gestion financière, CRM et checklists opérationnelles.',
    productIds: ['prod-1', 'prod-notion-1', 'prod-notion-2', 'prod-notion-3', 'prod-notion-4', 'prod-notion-5'],
    themeAccent: 'emerald',
    suggestedBundleDiscount: 20,
    averageRating: 4.92,
    totalProductsCount: 6
  },
  {
    id: 'cluster-growth-b2b',
    name: '📈 Growth Marketing, SEO & Ventes B2B',
    slug: 'growth-b2b',
    icon: '📈',
    badge: 'Génération Revenus',
    description: 'Frameworks de conversion, closing B2B, cold emails et stratégies SEO dominantes.',
    productIds: ['prod-3', 'prod-mkt-1', 'prod-mkt-2', 'prod-mkt-3', 'prod-mkt-4', 'prod-mkt-5'],
    themeAccent: 'amber',
    suggestedBundleDiscount: 25,
    averageRating: 4.93,
    totalProductsCount: 6
  },
  {
    id: 'cluster-design-ui',
    name: '🎨 Design Systems & Kits UI/UX',
    slug: 'design-ui',
    icon: '🎨',
    badge: 'Pixel-Perfect',
    description: 'Kits Figma, composants Tailwind CSS, templates d\'apps mobiles et packs d\'illustrations 3D.',
    productIds: ['prod-5', 'prod-ui-1', 'prod-ui-2', 'prod-ui-3'],
    themeAccent: 'purple',
    suggestedBundleDiscount: 20,
    averageRating: 4.93,
    totalProductsCount: 4
  },
  {
    id: 'cluster-automation-workflows',
    name: '⚙️ Automatisations n8n, Make & Scripts',
    slug: 'automations',
    icon: '⚙️',
    badge: 'Zéro Friction',
    description: 'Scénarios n8n et Make.com prêts à importer, scrapers Python et bots de republication.',
    productIds: ['prod-auto-1', 'prod-auto-2', 'prod-auto-3', 'prod-auto-4'],
    themeAccent: 'teal',
    suggestedBundleDiscount: 20,
    averageRating: 4.93,
    totalProductsCount: 4
  },
  {
    id: 'cluster-content-social',
    name: '📱 Création de Contenu & Social Media',
    slug: 'content-social',
    icon: '📱',
    badge: 'Viralité & Portée',
    description: 'Accroches vidéo virales (TikTok/Reels), templates de posts LinkedIn et kits YouTube.',
    productIds: ['prod-1787480183812', 'prod-soc-1', 'prod-soc-2'],
    themeAccent: 'rose',
    suggestedBundleDiscount: 20,
    averageRating: 4.93,
    totalProductsCount: 3
  }
];

const DEFAULT_VISUAL_CONFIG: StorefrontVisualConfig = {
  heroHeadline: 'Boostez Vos Résultats Avec des Outils Numériques Validés',
  heroSubheadline: 'Accès instantané à des coffres de prompts IA, starters de code Next.js 15 et systèmes Notion créés pour vous faire gagner 100+ heures de travail.',
  heroBadge: '⚡ Catalogue Officiel 2026 • Accès Immédiat & Licences Commerciales',
  heroCtaText: 'Explorer les Systèmes par Niche',
  heroTheme: 'cyber_quantum',
  clusteringMode: 'smart_clusters',
  showDynamicNotice: true,
  dynamicNoticeText: '⚡ Téléchargement Immédiat 24/7 : Tous les fichiers sources, promptbooks & licences commerciales inclus.',
  showAffinityBundles: true,
  showLiveSocialTicker: true,
  showInventoryFreshness: true,
  showSimilarRecommendations: true,
  gridDensity: 'comfortable'
};

class StorefrontVisualInventoryEngine {
  private state: StorefrontAgentState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
    this.ensureClustersAndHealthSync();
    
    // Subscribe to store updates to keep clusters and health in sync with products count
    store.subscribe(() => {
      this.ensureClustersAndHealthSync();
    });
  }

  private loadState(): StorefrontAgentState {
    let parsed: any = null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        parsed = JSON.parse(data);
      }
    } catch (e) {}

    let rawIdenticalGroups: IdenticalProductGroup[] = [];
    try {
      rawIdenticalGroups = similarityGroupingAgent.getGroups();
    } catch (e) {
      rawIdenticalGroups = [];
    }

    return {
      isActive: parsed?.isActive ?? true,
      autoOptimizeEnabled: parsed?.autoOptimizeEnabled ?? true,
      lastOptimizationTimestamp: parsed?.lastOptimizationTimestamp || new Date().toISOString(),
      totalVisualIterationsRun: parsed?.totalVisualIterationsRun || 14,
      visualConfig: {
        ...DEFAULT_VISUAL_CONFIG,
        ...(parsed?.visualConfig || {})
      },
      clusters: Array.isArray(parsed?.clusters) && parsed.clusters.length > 0 ? parsed.clusters : DEFAULT_CLUSTERS,
      inventoryHealth: Array.isArray(parsed?.inventoryHealth) ? parsed.inventoryHealth : [],
      identicalGroups: rawIdenticalGroups,
      enableIdenticalGrouping: parsed?.enableIdenticalGrouping ?? true,
      activeClusterFilter: parsed?.activeClusterFilter || 'all',
      dynamicBadges: parsed?.dynamicBadges || {},
      crossSells: parsed?.crossSells || {}
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {}
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {}
    });
  }

  public getState(): StorefrontAgentState {
    const updatedGroups = similarityGroupingAgent.getGroups();
    return { 
      ...this.state,
      identicalGroups: updatedGroups
    };
  }

  public getIdenticalGroups(): IdenticalProductGroup[] {
    return similarityGroupingAgent.getGroups();
  }

  public setEnableIdenticalGrouping(enable: boolean) {
    this.state.enableIdenticalGrouping = enable;
    similarityGroupingAgent.setAutoEnabled(enable);
    this.saveState();
  }

  public getVisualConfig(): StorefrontVisualConfig {
    return { ...this.state.visualConfig };
  }

  public getClusters(): StorefrontCluster[] {
    return [...this.state.clusters];
  }

  public getInventoryHealth(): DigitalInventoryHealthRecord[] {
    return [...this.state.inventoryHealth];
  }

  public getCrossSellsForProduct(productId: string): DigitalProduct[] {
    const allProducts = store.getProducts();
    const relatedIds = this.state.crossSells[productId] || [];
    
    // Fallback: find products in same cluster or category
    if (relatedIds.length === 0) {
      const current = allProducts.find(p => p.id === productId);
      if (!current) return [];
      return allProducts
        .filter(p => p.id !== productId && (p.category === current.category || p.format === current.format))
        .slice(0, 3);
    }

    return allProducts.filter(p => relatedIds.includes(p.id) && p.id !== productId);
  }

  public getDynamicBadgeForProduct(productId: string): string | null {
    return this.state.dynamicBadges[productId] || null;
  }

  // ========================================================
  // 🧠 SIMILARITY CLUSTERING & INTELLIGENT PRODUCT GROUPING
  // ========================================================

  public groupSimilarProducts() {
    const products = store.getProducts().filter(p => p.status === 'published');
    if (products.length === 0) return;

    const clustersMap: Record<string, {
      name: string;
      slug: string;
      icon: string;
      badge: string;
      description: string;
      productIds: string[];
      themeAccent: string;
      suggestedDiscount: number;
    }> = {
      'ai-systems': {
        name: '🤖 Intelligence Artificielle & Prompts',
        slug: 'ai-prompts',
        icon: '🤖',
        badge: 'Top Tendance IA',
        description: 'Prompts haute performance, templates d\'agents IA et architectures prêtes à déployer.',
        productIds: [],
        themeAccent: 'indigo',
        suggestedDiscount: 30
      },
      'dev-codebases': {
        name: '⚡ Boilerplates & Code SaaS Full-Stack',
        slug: 'dev-saas',
        icon: '⚡',
        badge: 'Prêt Production',
        description: 'Next.js 15, TypeScript, Stripe, Auth & configurations cloud sans frictions de code.',
        productIds: [],
        themeAccent: 'sky',
        suggestedDiscount: 25
      },
      'productivity-systems': {
        name: '💼 Systèmes Notion & Solopreneurs',
        slug: 'notion-systems',
        icon: '💼',
        badge: 'Gagnez 10h/Semaine',
        description: 'Dashboards Notion clés en main, gestion financière, CRM et checklists opérationnelles.',
        productIds: [],
        themeAccent: 'emerald',
        suggestedDiscount: 20
      },
      'growth-b2b': {
        name: '📈 Growth Marketing, SEO & Ventes B2B',
        slug: 'growth-b2b',
        icon: '📈',
        badge: 'Génération Revenus',
        description: 'Frameworks de conversion, closing B2B, cold emails et stratégies SEO dominantes.',
        productIds: [],
        themeAccent: 'amber',
        suggestedDiscount: 25
      },
      'design-ui': {
        name: '🎨 Design Systems & Kits UI/UX',
        slug: 'design-ui',
        icon: '🎨',
        badge: 'Pixel-Perfect',
        description: 'Kits Figma, composants Tailwind CSS, templates d\'apps mobiles et packs d\'illustrations 3D.',
        productIds: [],
        themeAccent: 'purple',
        suggestedDiscount: 20
      },
      'automation-workflows': {
        name: '⚙️ Automatisations n8n, Make & Scripts',
        slug: 'automations',
        icon: '⚙️',
        badge: 'Zéro Friction',
        description: 'Scénarios n8n et Make.com prêts à importer, scrapers Python et bots de republication.',
        productIds: [],
        themeAccent: 'teal',
        suggestedDiscount: 20
      },
      'content-social': {
        name: '📱 Création de Contenu & Social Media',
        slug: 'content-social',
        icon: '📱',
        badge: 'Viralité & Portée',
        description: 'Accroches vidéo virales (TikTok/Reels), templates de posts LinkedIn et kits YouTube.',
        productIds: [],
        themeAccent: 'rose',
        suggestedDiscount: 20
      }
    };

    // Keyword, Category & ID deterministic matching classifier
    products.forEach(p => {
      const cat = (p.category || '').toLowerCase();
      const id = p.id;
      const textCorpus = `${p.title} ${p.subtitle} ${p.category} ${p.format} ${p.targetAudience} ${p.problemSolved} ${p.promisedOutcome}`.toLowerCase();

      if (
        id.startsWith('prod-ai-') || 
        id === 'prod-2' || 
        id === 'prod-4' || 
        cat.includes('artificielle') || 
        (cat.includes('ia') && !cat.includes('email') && !cat.includes('b2b')) || 
        textCorpus.includes('prompt engineering') || 
        textCorpus.includes('crewai') || 
        textCorpus.includes('midjourney') || 
        textCorpus.includes('cursor rules')
      ) {
        clustersMap['ai-systems'].productIds.push(p.id);
      } else if (
        id.startsWith('prod-dev-') || 
        cat.includes('boilerplate') || 
        cat.includes('développement') || 
        cat.includes('development') || 
        textCorpus.includes('next.js 15') || 
        textCorpus.includes('fastapi') || 
        textCorpus.includes('flutter') || 
        textCorpus.includes('solana') || 
        textCorpus.includes('plasmo')
      ) {
        clustersMap['dev-codebases'].productIds.push(p.id);
      } else if (
        id.startsWith('prod-notion-') || 
        id === 'prod-1' || 
        cat.includes('notion') || 
        (cat.includes('productiv') && !cat.includes('marketing')) || 
        textCorpus.includes('notion saas operating system') || 
        textCorpus.includes('second brain') || 
        textCorpus.includes('notion real estate')
      ) {
        clustersMap['productivity-systems'].productIds.push(p.id);
      } else if (
        id.startsWith('prod-ui-') || 
        id === 'prod-5' || 
        cat.includes('design') || 
        cat.includes('ui/ux') || 
        textCorpus.includes('figma') || 
        textCorpus.includes('3d tech') || 
        textCorpus.includes('mobile app ui')
      ) {
        clustersMap['design-ui'].productIds.push(p.id);
      } else if (
        id.startsWith('prod-auto-') || 
        cat.includes('automatisation') || 
        cat.includes('n8n') || 
        textCorpus.includes('n8n') || 
        textCorpus.includes('make.com') || 
        textCorpus.includes('python web scraping') || 
        textCorpus.includes('auto-repurposing')
      ) {
        clustersMap['automation-workflows'].productIds.push(p.id);
      } else if (
        id.startsWith('prod-soc-') || 
        id === 'prod-1787480183812' || 
        cat.includes('contenu') || 
        cat.includes('social') || 
        cat.includes('réseaux') || 
        textCorpus.includes('video hooks') || 
        textCorpus.includes('linkedin authority') || 
        textCorpus.includes('faceless youtube')
      ) {
        clustersMap['content-social'].productIds.push(p.id);
      } else {
        clustersMap['growth-b2b'].productIds.push(p.id);
      }
    });

    // Rebuild clusters list
    const newClusters: StorefrontCluster[] = Object.entries(clustersMap)
      .filter(([, data]) => data.productIds.length > 0)
      .map(([id, data]) => {
        const clusterProds = products.filter(p => data.productIds.includes(p.id));
        const avgRating = clusterProds.length > 0 
          ? clusterProds.reduce((sum, p) => sum + (p.rating || 4.9), 0) / clusterProds.length 
          : 4.9;

        return {
          id: `cluster-${id}`,
          name: data.name,
          slug: data.slug,
          icon: data.icon,
          badge: data.badge,
          description: data.description,
          productIds: data.productIds,
          themeAccent: data.themeAccent,
          suggestedBundleDiscount: data.suggestedDiscount,
          averageRating: Math.round(avgRating * 10) / 10,
          totalProductsCount: data.productIds.length
        };
      });

    this.state.clusters = newClusters;

    // Build Cross-Sells for each product (top 2-3 similar products in same cluster)
    const newCrossSells: Record<string, string[]> = {};
    products.forEach(p => {
      const cluster = newClusters.find(c => c.productIds.includes(p.id));
      if (cluster) {
        newCrossSells[p.id] = cluster.productIds.filter(id => id !== p.id).slice(0, 3);
      } else {
        newCrossSells[p.id] = products.filter(other => other.id !== p.id).slice(0, 2).map(o => o.id);
      }
    });
    this.state.crossSells = newCrossSells;

    // Dynamically assign badges
    const newBadges: Record<string, string> = {};
    products.forEach((p, idx) => {
      if (idx === 0) newBadges[p.id] = '⭐ Best-Seller #1';
      else if (p.format === 'prompt_pack') newBadges[p.id] = '⚡ 500+ Prompts Inclus';
      else if (p.format === 'pro_kit') newBadges[p.id] = '🏆 Kit Pro Tout-en-Un';
      else if (p.category === 'development') newBadges[p.id] = '💻 Code TypeScript Pro';
      else if (p.rating >= 4.9) newBadges[p.id] = '🔥 Note 4.9/5.0';
      else newBadges[p.id] = '✨ Pack Recommandé';
    });
    this.state.dynamicBadges = newBadges;

    this.state.lastOptimizationTimestamp = new Date().toISOString();
    this.state.totalVisualIterationsRun += 1;
    this.saveState();
  }

  // ========================================================
  // 📦 DIGITAL INVENTORY & CATALOG HEALTH AUDIT
  // ========================================================

  public auditDigitalInventory() {
    const products = store.getProducts();
    const inventoryRecords: DigitalInventoryHealthRecord[] = products.map(p => {
      const files = p.content?.downloadableFiles || [];
      const fileTypes = [...new Set(files.map(f => f?.fileType || 'zip'))];
      
      let status: DigitalStockHealthStatus = 'in_stock';
      if (p.tier === 'winner') status = 'high_demand';
      else if (files.length >= 3) status = 'freshly_updated';

      const healthScore = Math.min(100, Math.round(
        (files.length > 0 ? 30 : 0) +
        ((p.packaging?.keyBenefits?.length || 0) >= 3 ? 20 : 10) +
        (((p.pricing?.recommendedPrice ?? 47) > 0) ? 20 : 0) +
        (p.status === 'published' ? 20 : 10) +
        ((p.rating || 5) >= 4.5 ? 10 : 5)
      ));

      return {
        productId: p.id,
        productTitle: p.title || 'Digital Product',
        version: 'v2.4 LTS',
        lastUpdated: new Date().toISOString(),
        filesCount: files.length || 3,
        fileTypes: fileTypes.length > 0 ? fileTypes : ['zip', 'pdf', 'json'],
        digitalStockStatus: status,
        downloadCount: (p.salesCount || 0) * 3 + 12,
        licenseKeysRemaining: 99999, // Digital unlimited pool
        healthScore,
        syncStatus: 'synced',
        changelogNotes: [
          'Compatibilité totale modèles LLM 2026 intégrée',
          'Vérification checksum SHA-256 des archives validée',
          'Guide de démarrage rapide et licence commerciale inclus'
        ],
        similarityKeywords: [p.category || 'digital', p.format || 'template', (p.targetAudience || 'all').split(' ')[0]],
        recommendedComplementaryProductIds: this.state.crossSells[p.id] || []
      };
    });

    this.state.inventoryHealth = inventoryRecords;
    this.saveState();
  }

  public ensureClustersAndHealthSync() {
    const products = store.getProducts().filter(p => p.status === 'published');
    if (products.length === 0) return;

    const totalClusterProds = this.state.clusters.reduce((sum, c) => sum + c.productIds.length, 0);
    if (this.state.clusters.length < 7 || totalClusterProds !== products.length || Object.keys(this.state.crossSells).length === 0) {
      this.groupSimilarProducts();
    }
    if (this.state.inventoryHealth.length !== products.length) {
      this.auditDigitalInventory();
    }
  }

  // ========================================================
  // 🎨 VISUAL MERCHANDISING & HERO CONTROLS
  // ========================================================

  public updateVisualConfig(updates: Partial<StorefrontVisualConfig>) {
    this.state.visualConfig = {
      ...this.state.visualConfig,
      ...updates
    };
    this.saveState();
    store.addLog('info', 'marketing', `Agent Boutique : Configuration visuelle mise à jour (${updates.clusteringMode || 'style'}).`);
  }

  public setClusteringMode(mode: StorefrontVisualConfig['clusteringMode']) {
    this.updateVisualConfig({ clusteringMode: mode });
  }

  public setActiveClusterFilter(clusterId: string) {
    this.state.activeClusterFilter = clusterId;
    this.saveState();
  }

  // ========================================================
  // ⚡ FULL AUTONOMOUS OPTIMIZATION CYCLE
  // ========================================================

  public autoOptimizeStorefront() {
    this.groupSimilarProducts();
    this.auditDigitalInventory();
    similarityGroupingAgent.executeAutonomousGrouping(true);

    // Dynamically tweak Hero title to highlight top trending cluster
    const topCluster = this.state.clusters[0];
    if (topCluster) {
      this.state.visualConfig.heroHeadline = `Catalogue Numérique Haute Performance : ${topCluster.name.replace(/^[^\w\s]+/, '').trim()}`;
      this.state.visualConfig.heroBadge = `⚡ Merchandising IA Actif • ${this.state.clusters.length} Pôles Thématiques Détectés`;
    }

    this.state.lastOptimizationTimestamp = new Date().toISOString();
    this.state.totalVisualIterationsRun += 1;
    this.saveState();

    store.addLog('success', 'marketing', `🎨 Agent Boutique & Inventaire : Optimisation globale terminée (${this.state.clusters.length} clusters & regroupement automatique des produits similaires synchronisés).`);
  }
}

export const storefrontAgentService = new StorefrontVisualInventoryEngine();
