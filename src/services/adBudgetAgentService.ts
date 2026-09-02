import { AdCampaign, AdAgentConfig, AdPlatform, DigitalProduct } from '../types';
import { store } from './store';

const STORAGE_CONFIG_KEY = 'df_ad_agent_config_v1';
const STORAGE_CAMPAIGNS_KEY = 'df_ad_campaigns_v1';

const DEFAULT_CONFIG: AdAgentConfig = {
  salesMilestoneTarget: 100000, // Strict 100k € milestone threshold required by user
  overrideSimulationMode: false,
  isAgentActive: false,
  maxDailyBudgetEur: 450,
  reinvestmentRatePercent: 15,
  targetRoasFloor: 2.4,
  autoKillUnderperforming: true,
  autoScaleWinners: true,
  supportedPlatforms: ['meta', 'google', 'tiktok', 'youtube'],
  totalAdSpendLifetime: 4120,
  totalAdRevenueLifetime: 17850,
  averageRoasLifetime: 4.33
};

const INITIAL_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'camp-meta-001',
    productId: 'prod-001',
    productTitle: 'Mega-Pack 5000+ Prompts IA Business & Marketing',
    platform: 'meta',
    campaignName: 'Meta Ads - Scale Lookalike Top Buyers 1%',
    angle: 'Gain de productivité 10x',
    headline: 'Multipliez votre productivité par 10 avec le coffre ultime de prompts ChatGPT & Claude',
    primaryText: 'Découvrez la bibliothèque exhaustive de 5000+ prompts structurés pour le business, marketing et dev.',
    description: 'Accès instantané et mises à jour gratuites à vie.',
    cta: 'Acheter maintenant',
    creativeConcept: 'Démonstration vidéo de workflow accéléré',
    dailyBudget: 150,
    status: 'scaled_by_ai',
    metrics: {
      impressions: 48500,
      cpm: 12.5,
      cpc: 0.85,
      ctr: 3.42,
      spend: 1850,
      conversions: 168,
      cpa: 11.01,
      roas: 4.45,
      revenue: 8240
    },
    rulesTriggered: ['Auto-Scale +20% (ROAS > 3.8x)'],
    aiDecisionReason: 'ROAS exceptionnel (4.45x > seuil 3.5x). Budget augmenté automatiquement de +20%.',
    lastOptimizedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    audienceTarget: 'Entrepreneurs, Freelances, Agences Marketing (25-45 ans, France/Belgique/Suisse)',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString()
  },
  {
    id: 'camp-google-002',
    productId: 'prod-002',
    productTitle: 'Système OS Notion Entreprise & Second Cerveau',
    platform: 'google',
    campaignName: 'Google Ads PMax - Intention d\'Achat "Templates Notion"',
    angle: 'Organisation absolue',
    headline: 'Structurez toute votre activité avec le Système Notion 2.0 Clé en Main',
    primaryText: 'Le template Notion tout-en-un pour gérer projets, finances, CRM et base de connaissances.',
    description: 'Prêt à l\'emploi en 2 clics.',
    cta: 'Obtenir le Template',
    creativeConcept: 'Capture d\'écran interactive du dashboard Notion',
    dailyBudget: 120,
    status: 'active',
    metrics: {
      impressions: 32000,
      cpm: 14.2,
      cpc: 1.15,
      ctr: 4.85,
      spend: 1120,
      conversions: 110,
      cpa: 10.18,
      roas: 4.80,
      revenue: 5380
    },
    rulesTriggered: ['Maintien palier optimal'],
    aiDecisionReason: 'CPA très bas (10.18€) et ROAS optimal. Maintien du palier de dépense actuel.',
    lastOptimizedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    audienceTarget: 'Mots-clés exacts : "meilleur template notion", "second brain notion template"',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'camp-tiktok-003',
    productId: 'prod-003',
    productTitle: 'Checklist Ultime Lancement SaaS & Produits Digitaux',
    platform: 'tiktok',
    campaignName: 'TikTok Spark Ads - Vidéos Hooks Viraux & Démonstrations',
    angle: 'Éviter les erreurs de lancement',
    headline: 'Arrêtez d\'oublier des étapes critiques avant votre prochain lancement digital',
    primaryText: 'La checklist exhaustive de 150 points de contrôle pour réussir son lancement.',
    description: 'Téléchargement immédiat.',
    cta: 'Accéder à la checklist',
    creativeConcept: 'Vidéo POV TikTok de créateur',
    dailyBudget: 80,
    status: 'active',
    metrics: {
      impressions: 89000,
      cpm: 6.8,
      cpc: 0.45,
      ctr: 2.91,
      spend: 750,
      conversions: 71,
      cpa: 10.56,
      roas: 3.70,
      revenue: 2780
    },
    rulesTriggered: ['Audience chaude active'],
    aiDecisionReason: 'Engagement créatif fort. Re-ciblage vidéo 50%+ enclenché.',
    lastOptimizedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    audienceTarget: 'Créateurs digitaux, Développeurs, Solopreneurs (18-35 ans)',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'camp-meta-004',
    productId: 'prod-001',
    productTitle: 'Mega-Pack 5000+ Prompts IA Business & Marketing',
    platform: 'meta',
    campaignName: 'Meta Ads - Retargeting Visiteurs Panier Abandonné 7j',
    angle: 'Relance avec promo',
    headline: 'Votre panier vous attend avec le code promo LAUNCH20 (-20%)',
    primaryText: 'Finalisez votre commande aujourd\'hui et débloquez 3 bonus exclusifs supplémentaires.',
    description: 'Offre limitée dans le temps.',
    cta: 'Finaliser ma commande',
    creativeConcept: 'Bannière carrousel des bonus',
    dailyBudget: 50,
    status: 'active',
    metrics: {
      impressions: 12000,
      cpm: 18.0,
      cpc: 1.40,
      ctr: 5.12,
      spend: 400,
      conversions: 32,
      cpa: 12.50,
      roas: 3.62,
      revenue: 1450
    },
    rulesTriggered: ['Retargeting Pixel'],
    aiDecisionReason: 'Audience chaude à haute intention. Fréquence maîtrisée à 2.1.',
    lastOptimizedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    audienceTarget: 'Visiteurs storefront sans achat dans les 7 derniers jours',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

class AdBudgetAgentService {
  private config: AdAgentConfig;
  private campaigns: AdCampaign[];
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load config
    const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (savedConfig) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      } catch (e) {
        this.config = DEFAULT_CONFIG;
      }
    } else {
      this.config = DEFAULT_CONFIG;
    }

    // Load campaigns
    const savedCampaigns = localStorage.getItem(STORAGE_CAMPAIGNS_KEY);
    if (savedCampaigns) {
      try {
        this.campaigns = JSON.parse(savedCampaigns);
      } catch (e) {
        this.campaigns = INITIAL_CAMPAIGNS;
      }
    } else {
      this.campaigns = INITIAL_CAMPAIGNS;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public getConfig(): AdAgentConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<AdAgentConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.config));
    this.notify();
    store.addLog('info', 'ai', 'Configuration de l\'Agent IA Budget Publicitaire mise à jour.');
  }

  public getCampaigns(): AdCampaign[] {
    return this.campaigns;
  }

  public getTotalCurrentSalesRevenue(): number {
    const orders = store.getOrders();
    const realRevenue = orders.reduce((sum, ord) => sum + (ord.paymentStatus === 'paid' ? ord.totalAmount : 0), 0);
    // Baseline organic sales record
    const baselineOrganic = 24650;
    return realRevenue + baselineOrganic;
  }

  public getTotalUnitSales(): number {
    const orders = store.getOrders();
    const realUnits = orders.reduce((sum, ord) => sum + (ord.paymentStatus === 'paid' ? ord.items.length : 0), 0);
    const baselineUnits = 680;
    return realUnits + baselineUnits;
  }

  public isAgentUnlocked(): boolean {
    if (this.config.overrideSimulationMode) {
      return true;
    }
    return this.getTotalCurrentSalesRevenue() >= this.config.salesMilestoneTarget;
  }

  public getUnlockProgress(): {
    currentRevenue: number;
    targetRevenue: number;
    percent: number;
    remaining: number;
    isUnlocked: boolean;
  } {
    const currentRevenue = this.getTotalCurrentSalesRevenue();
    const targetRevenue = this.config.salesMilestoneTarget;
    const isUnlocked = this.isAgentUnlocked();
    const percent = Math.min(100, Math.round((currentRevenue / targetRevenue) * 1000) / 10);
    const remaining = Math.max(0, targetRevenue - currentRevenue);

    return {
      currentRevenue,
      targetRevenue,
      percent,
      remaining,
      isUnlocked
    };
  }

  public triggerAutonomousOptimizationCycle(): {
    scaledCount: number;
    killedCount: number;
    rebalancedCount: number;
    newTotalDailyBudget: number;
  } {
    if (!this.isAgentUnlocked()) {
      throw new Error('Action impossible : L\'Agent IA Publicitaire est verrouillé jusqu\'au palier de 100 000 € de ventes.');
    }

    let scaledCount = 0;
    let killedCount = 0;
    let rebalancedCount = 0;

    this.campaigns = this.campaigns.map(camp => {
      const roas = camp.metrics.roas;

      // Rule 1: Auto-Scale winners (ROAS > 3.8x)
      if (roas >= 3.8 && camp.status !== 'killed_by_ai') {
        const newBudget = Math.round(camp.dailyBudget * 1.2);
        scaledCount++;
        return {
          ...camp,
          dailyBudget: newBudget,
          status: 'scaled_by_ai',
          aiDecisionReason: `ROAS ultra-rentable (${roas.toFixed(2)}x). Dépense augmentée de +20% (${camp.dailyBudget}€ → ${newBudget}€/j).`,
          lastOptimizedAt: new Date().toISOString()
        };
      }

      // Rule 2: Auto-Kill / Pause underperforming campaigns (ROAS < targetRoasFloor)
      if (roas < this.config.targetRoasFloor && camp.metrics.spend > 300) {
        killedCount++;
        return {
          ...camp,
          status: 'killed_by_ai',
          dailyBudget: 0,
          aiDecisionReason: `ROAS sous le seuil critique (${roas.toFixed(2)}x < ${this.config.targetRoasFloor}x). Campagne coupée immédiatement pour protéger la trésorerie.`,
          lastOptimizedAt: new Date().toISOString()
        };
      }

      // Rule 3: Rebalance learning / active
      rebalancedCount++;
      return {
        ...camp,
        lastOptimizedAt: new Date().toISOString()
      };
    });

    localStorage.setItem(STORAGE_CAMPAIGNS_KEY, JSON.stringify(this.campaigns));
    this.notify();

    const newTotalDailyBudget = this.campaigns.reduce((sum, c) => sum + c.dailyBudget, 0);

    store.addLog(
      'success',
      'ai',
      `Cycle d'optimisation IA exécuté : ${scaledCount} campagnes augmentées, ${killedCount} coupées. Budget quotidien global : ${newTotalDailyBudget}€/j.`
    );

    return {
      scaledCount,
      killedCount,
      rebalancedCount,
      newTotalDailyBudget
    };
  }

  public createCampaignForProduct(params: {
    productId: string;
    platform: AdPlatform;
    dailyBudgetEur: number;
  }): AdCampaign {
    if (!this.isAgentUnlocked()) {
      throw new Error('L\'Agent IA est verrouillé avant 100k€ de ventes.');
    }

    const product = store.getProducts().find(p => p.id === params.productId);
    const productTitle = product?.title || 'Produit Digital Dématérialisé';

    const newCamp: AdCampaign = {
      id: `camp-${params.platform}-${Date.now().toString().slice(-4)}`,
      productId: params.productId,
      productTitle: productTitle,
      platform: params.platform,
      campaignName: `${params.platform.toUpperCase()} Ads - ${productTitle.slice(0, 30)}...`,
      headline: `Découvrez ${productTitle} : Le système conçu pour maximiser vos résultats`,
      dailyBudget: params.dailyBudgetEur,
      status: 'learning',
      metrics: {
        impressions: 1200,
        cpm: 10.0,
        cpc: 0.9,
        ctr: 3.2,
        spend: 0,
        conversions: 0,
        cpa: 12.0,
        roas: 3.5,
        revenue: 0
      },
      rulesTriggered: ['Nouvelle campagne IA'],
      aiDecisionReason: 'Nouvelle campagne lancée. Phase d\'apprentissage de l\'algorithme d\'enchères.',
      lastOptimizedAt: new Date().toISOString(),
      audienceTarget: 'Audience ciblée par affinité & comportement d\'achat numérique',
      createdAt: new Date().toISOString()
    };

    this.campaigns.unshift(newCamp);
    localStorage.setItem(STORAGE_CAMPAIGNS_KEY, JSON.stringify(this.campaigns));
    this.notify();

    store.addLog(
      'info',
      'ai',
      `Nouvelle campagne ${params.platform.toUpperCase()} créée par l'Agent IA (${params.dailyBudgetEur}€/jour).`
    );

    return newCamp;
  }

  public toggleCampaignStatus(id: string) {
    this.campaigns = this.campaigns.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'paused' || c.status === 'killed_by_ai' ? 'active' : 'paused';
        return {
          ...c,
          status: nextStatus,
          dailyBudget: nextStatus === 'paused' ? 0 : 75,
          lastOptimizedAt: new Date().toISOString()
        };
      }
      return c;
    });

    localStorage.setItem(STORAGE_CAMPAIGNS_KEY, JSON.stringify(this.campaigns));
    this.notify();
  }
}

export const adBudgetAgentService = new AdBudgetAgentService();
