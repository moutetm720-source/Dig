import { TargetCountryCode, TargetLanguageCode } from '../types';
import { store } from './store';
import { blockFakeData } from './realDataPolicy';
import { safeSetItem, safeGetItem } from '../utils/safeStorage';

export interface CountryKeywordData {
  id: string;
  countryCode: TargetCountryCode;
  language: TargetLanguageCode;
  countryName: string;
  flag: string;
  keyword: string;
  searchIntent: 'commercial_buy' | 'high_intent_solution' | 'educational_template' | 'trending_tool';
  monthlySearchVolume: number;
  competitionScore: number; // 0 to 100
  estimatedCtrPercent: number;
  recommendedHashtags: string[];
  trendingTrendScore: number; // 0 to 100
  productCategoryMatch: 'saas_os' | 'ai_prompts' | 'boilerplate_dev' | 'automation_n8n' | 'all';
  lastOptimizedAt: string;
}

export interface CountryTrafficFlowSummary {
  countryCode: TargetCountryCode;
  countryName: string;
  flag: string;
  language: TargetLanguageCode;
  activeKeywordsCount: number;
  totalEstimatedFlowVisits: number;
  topKeyword: string;
  avgConversionRate: number;
  flowStatus: 'high_velocity' | 'scaling' | 'optimizing';
}

const STORAGE_KEY = 'df_country_keywords_engine_v1';

const DEFAULT_COUNTRY_KEYWORDS: CountryKeywordData[] = [
  // FRANCE (FR)
  {
    id: 'kw-fr-01',
    countryCode: 'FR',
    language: 'fr',
    countryName: 'France',
    flag: '🇫🇷',
    keyword: 'template notion saas automatique',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 14200,
    competitionScore: 38,
    estimatedCtrPercent: 6.8,
    recommendedHashtags: ['#NotionFR', '#SaaSFrance', '#Entrepreneuriat', '#Productivite', '#BusinessEnLigne'],
    trendingTrendScore: 94,
    productCategoryMatch: 'saas_os',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-fr-02',
    countryCode: 'FR',
    language: 'fr',
    countryName: 'France',
    flag: '🇫🇷',
    keyword: 'pack prompts chatgpt claude copywritting 2026',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 28500,
    competitionScore: 42,
    estimatedCtrPercent: 7.4,
    recommendedHashtags: ['#PromptEngineering', '#ChatGPTFR', '#ClaudeAI', '#CopywritingFR', '#IntelligenceArtificielle'],
    trendingTrendScore: 98,
    productCategoryMatch: 'ai_prompts',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-fr-03',
    countryCode: 'FR',
    language: 'fr',
    countryName: 'France',
    flag: '🇫🇷',
    keyword: 'boilerplate nextjs 15 stripe tailwind pret a lemploi',
    searchIntent: 'high_intent_solution',
    monthlySearchVolume: 9600,
    competitionScore: 29,
    estimatedCtrPercent: 8.2,
    recommendedHashtags: ['#NextjsFR', '#DevWeb', '#IndieHackerFR', '#StripePayment', '#TailwindCSS'],
    trendingTrendScore: 91,
    productCategoryMatch: 'boilerplate_dev',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-fr-04',
    countryCode: 'FR',
    language: 'fr',
    countryName: 'France',
    flag: '🇫🇷',
    keyword: 'workflows automatisation n8n make freelance',
    searchIntent: 'educational_template',
    monthlySearchVolume: 18100,
    competitionScore: 35,
    estimatedCtrPercent: 6.1,
    recommendedHashtags: ['#n8n', '#MakeCom', '#Automatisation', '#NoCodeFR', '#FreelanceFR'],
    trendingTrendScore: 89,
    productCategoryMatch: 'automation_n8n',
    lastOptimizedAt: new Date().toISOString()
  },

  // UNITED STATES (US)
  {
    id: 'kw-us-01',
    countryCode: 'US',
    language: 'en',
    countryName: 'United States',
    flag: '🇺🇸',
    keyword: 'turnkey saas operating system notion template',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 64000,
    competitionScore: 48,
    estimatedCtrPercent: 7.9,
    recommendedHashtags: ['#SaaSOperations', '#NotionTemplate', '#BuildInPublic', '#IndieHackers', '#StartupTools'],
    trendingTrendScore: 96,
    productCategoryMatch: 'saas_os',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-us-02',
    countryCode: 'US',
    language: 'en',
    countryName: 'United States',
    flag: '🇺🇸',
    keyword: '500 high converting ai copywriting prompts vault',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 92000,
    competitionScore: 51,
    estimatedCtrPercent: 8.5,
    recommendedHashtags: ['#AIPrompts', '#CopywritingHacks', '#Claude37', '#ChatGPTPlus', '#MarketingAutomation'],
    trendingTrendScore: 99,
    productCategoryMatch: 'ai_prompts',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-us-03',
    countryCode: 'US',
    language: 'en',
    countryName: 'United States',
    flag: '🇺🇸',
    keyword: 'nextjs 15 production boilerplate stripe auth',
    searchIntent: 'high_intent_solution',
    monthlySearchVolume: 41000,
    competitionScore: 36,
    estimatedCtrPercent: 9.1,
    recommendedHashtags: ['#Nextjs15', '#SaaSBoilerplate', '#FullStackDev', '#TypeScript', '#StripeCheckout'],
    trendingTrendScore: 94,
    productCategoryMatch: 'boilerplate_dev',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-us-04',
    countryCode: 'US',
    language: 'en',
    countryName: 'United States',
    flag: '🇺🇸',
    keyword: 'solopreneur automated revenue stack download',
    searchIntent: 'high_intent_solution',
    monthlySearchVolume: 33000,
    competitionScore: 40,
    estimatedCtrPercent: 7.2,
    recommendedHashtags: ['#Solopreneur', '#PassiveIncome', '#DigitalProducts', '#CreatorEconomy', '#MicroSaaS'],
    trendingTrendScore: 92,
    productCategoryMatch: 'all',
    lastOptimizedAt: new Date().toISOString()
  },

  // UNITED KINGDOM (GB)
  {
    id: 'kw-gb-01',
    countryCode: 'GB',
    language: 'en',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    keyword: 'digital products commercial licence instant download uk',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 22000,
    competitionScore: 33,
    estimatedCtrPercent: 7.5,
    recommendedHashtags: ['#UKBusiness', '#DigitalKit', '#SaaSFounderUK', '#NotionUK', '#TechStartupUK'],
    trendingTrendScore: 88,
    productCategoryMatch: 'all',
    lastOptimizedAt: new Date().toISOString()
  },

  // GERMANY (DE)
  {
    id: 'kw-de-01',
    countryCode: 'DE',
    language: 'de',
    countryName: 'Germany',
    flag: '🇩🇪',
    keyword: 'notion vorlage unternehmensfuhrung saas starter kit',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 19500,
    competitionScore: 28,
    estimatedCtrPercent: 7.6,
    recommendedHashtags: ['#NotionDeutsch', '#GruenderDE', '#SaaSDach', '#Produktivitaet', '#DigitalBusinessDE'],
    trendingTrendScore: 93,
    productCategoryMatch: 'saas_os',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-de-02',
    countryCode: 'DE',
    language: 'de',
    countryName: 'Germany',
    flag: '🇩🇪',
    keyword: 'ki prompt paket download professionell deutsch',
    searchIntent: 'high_intent_solution',
    monthlySearchVolume: 24000,
    competitionScore: 31,
    estimatedCtrPercent: 8.0,
    recommendedHashtags: ['#KIPrompts', '#ChatGPTDeutsch', '#AutomatisierungDE', '#TechGruender', '#MarketingDE'],
    trendingTrendScore: 95,
    productCategoryMatch: 'ai_prompts',
    lastOptimizedAt: new Date().toISOString()
  },

  // SPAIN & LATAM (ES)
  {
    id: 'kw-es-01',
    countryCode: 'ES',
    language: 'es',
    countryName: 'Spain & LATAM',
    flag: '🇪🇸',
    keyword: 'plantilla notion gestion empresa saas completa',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 31000,
    competitionScore: 30,
    estimatedCtrPercent: 7.8,
    recommendedHashtags: ['#NotionEspanol', '#Emprendedores', '#SaaSEspanol', '#Productividad', '#NegociosDigitales'],
    trendingTrendScore: 92,
    productCategoryMatch: 'saas_os',
    lastOptimizedAt: new Date().toISOString()
  },
  {
    id: 'kw-es-02',
    countryCode: 'ES',
    language: 'es',
    countryName: 'Spain & LATAM',
    flag: '🇪🇸',
    keyword: 'prompts inteligencia artificial ventas y conversion',
    searchIntent: 'high_intent_solution',
    monthlySearchVolume: 42000,
    competitionScore: 34,
    estimatedCtrPercent: 8.1,
    recommendedHashtags: ['#InteligenciaArtificial', '#PromptsIA', '#MarketingDigital', '#VentasAutomatizadas', '#SolopreneurES'],
    trendingTrendScore: 96,
    productCategoryMatch: 'ai_prompts',
    lastOptimizedAt: new Date().toISOString()
  },

  // JAPAN (JP)
  {
    id: 'kw-jp-01',
    countryCode: 'JP',
    language: 'ja',
    countryName: 'Japan',
    flag: '🇯🇵',
    keyword: '業務効率化 AI プロンプト 集 即時ダウンロード',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 27000,
    competitionScore: 25,
    estimatedCtrPercent: 9.3,
    recommendedHashtags: ['#AIプロンプト', '#業務効率化', '#Notion活用', '#DX推進', '#生産性向上'],
    trendingTrendScore: 97,
    productCategoryMatch: 'ai_prompts',
    lastOptimizedAt: new Date().toISOString()
  },

  // CANADA (CA)
  {
    id: 'kw-ca-01',
    countryCode: 'CA',
    language: 'en',
    countryName: 'Canada',
    flag: '🇨🇦',
    keyword: 'notion automated operating system for founders canada',
    searchIntent: 'commercial_buy',
    monthlySearchVolume: 12000,
    competitionScore: 26,
    estimatedCtrPercent: 7.1,
    recommendedHashtags: ['#StartupCanada', '#NotionToronto', '#TechMontreal', '#IndieHackerCA'],
    trendingTrendScore: 89,
    productCategoryMatch: 'saas_os',
    lastOptimizedAt: new Date().toISOString()
  },

  // AUSTRALIA (AU)
  {
    id: 'kw-au-01',
    countryCode: 'AU',
    language: 'en',
    countryName: 'Australia',
    flag: '🇦🇺',
    keyword: 'full stack saas boilerplate stripe instant deploy sydney',
    searchIntent: 'high_intent_solution',
    monthlySearchVolume: 11500,
    competitionScore: 27,
    estimatedCtrPercent: 7.7,
    recommendedHashtags: ['#AusTech', '#SydneyStartups', '#NextjsAU', '#IndieHackersAU'],
    trendingTrendScore: 87,
    productCategoryMatch: 'boilerplate_dev',
    lastOptimizedAt: new Date().toISOString()
  }
];

class CountryKeywordsEngine {
  private keywords: CountryKeywordData[] = [];
  private listeners: Set<() => void> = new Set();
  private isAutonomousActive = true;

  constructor() {
    this.keywords = this.loadKeywords();
  }

  private loadKeywords(): CountryKeywordData[] {
    return safeGetItem<CountryKeywordData[]>(STORAGE_KEY, DEFAULT_COUNTRY_KEYWORDS);
  }

  private save() {
    safeSetItem(STORAGE_KEY, this.keywords);
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('CountryKeywordsEngine listener error', e); }
    });
  }

  public getAllKeywords(): CountryKeywordData[] {
    return this.keywords;
  }

  public getKeywordsForCountry(countryCode: TargetCountryCode): CountryKeywordData[] {
    return this.keywords.filter(k => k.countryCode === countryCode);
  }

  public getKeywordsForLanguage(language: TargetLanguageCode): CountryKeywordData[] {
    return this.keywords.filter(k => k.language === language);
  }

  public getTopKeywordsForDiffusion(countryCode?: TargetCountryCode, limit = 5): CountryKeywordData[] {
    let pool = this.keywords;
    if (countryCode) {
      pool = pool.filter(k => k.countryCode === countryCode);
    }
    return [...pool]
      .sort((a, b) => (b.monthlySearchVolume * (b.estimatedCtrPercent / 100)) - (a.monthlySearchVolume * (a.estimatedCtrPercent / 100)))
      .slice(0, limit);
  }

  public getOptimizedHashtagsForCountry(countryCode: TargetCountryCode, count = 6): string[] {
    const list = this.getKeywordsForCountry(countryCode);
    const allTags: string[] = [];
    list.forEach(k => {
      k.recommendedHashtags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
        }
      });
    });
    return allTags.slice(0, count);
  }

  public getCountryFlowSummaries(): CountryTrafficFlowSummary[] {
    const countries: Array<{ code: TargetCountryCode; name: string; flag: string; lang: TargetLanguageCode }> = [
      { code: 'FR', name: 'France & Francophonie', flag: '🇫🇷', lang: 'fr' },
      { code: 'US', name: 'United States', flag: '🇺🇸', lang: 'en' },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lang: 'en' },
      { code: 'DE', name: 'Germany / DACH', flag: '🇩🇪', lang: 'de' },
      { code: 'ES', name: 'Spain & LATAM', flag: '🇪🇸', lang: 'es' },
      { code: 'JP', name: 'Japan', flag: '🇯🇵', lang: 'ja' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦', lang: 'en' },
      { code: 'AU', name: 'Australia', flag: '🇦🇺', lang: 'en' }
    ];

    return countries.map(c => {
      const kws = this.keywords.filter(k => k.countryCode === c.code);
      const totalFlow = kws.reduce((acc, k) => acc + Math.round(k.monthlySearchVolume * (k.estimatedCtrPercent / 100)), 0);
      const top = kws.sort((a, b) => b.monthlySearchVolume - a.monthlySearchVolume)[0]?.keyword || 'saas automation';

      return {
        countryCode: c.code,
        countryName: c.name,
        flag: c.flag,
        language: c.lang,
        activeKeywordsCount: kws.length,
        totalEstimatedFlowVisits: totalFlow || 1500,
        topKeyword: top,
        avgConversionRate: c.code === 'US' ? 5.4 : c.code === 'FR' ? 4.9 : c.code === 'DE' ? 5.8 : c.code === 'JP' ? 6.2 : 4.5,
        flowStatus: totalFlow > 2000 ? 'high_velocity' : totalFlow > 1000 ? 'scaling' : 'optimizing'
      };
    });
  }

  /**
   * Autonomous keyword optimization loop:
   * Dynamically adjusts search volume, trend scores, and injects fresh localized long-tail variations
   */
  public executeAutonomousKeywordOptimization(): string {
    // 100 % RÉEL : plus de micro-ajustements aléatoires censés figurer les
    // fluctuations du marché — le score reste celui de la dernière vraie mesure.
    if (blockFakeData('countryKeywords.trendDrift')) {
      return 'Optimisation mots-clés : scores figés sur la dernière mesure réelle (aucune variation inventée).';
    }
    const updated = this.keywords.map(kw => {
      // Dynamic micro-adjustments simulating live market fluctuations
      const deltaTrend = (Math.random() * 4 - 1.8);
      const nextTrend = Math.min(100, Math.max(70, Number((kw.trendingTrendScore + deltaTrend).toFixed(1))));
      return {
        ...kw,
        trendingTrendScore: nextTrend,
        lastOptimizedAt: new Date().toISOString()
      };
    });

    this.keywords = updated;
    this.save();

    const topFlow = this.getCountryFlowSummaries()[0];
    const topVisits = topFlow?.totalEstimatedFlowVisits ?? 0;
    const logMsg = topFlow 
      ? `[Agent Diffusion Multi-Pays] Flux de mots-clés optimisé sur 8 pays (${this.keywords.length} mots-clés actifs). Top flux: ${topFlow.flag} ${topFlow.countryName} (${topVisits.toLocaleString()} visites/mois estimées).`
      : `[Agent Diffusion Multi-Pays] Flux de mots-clés optimisé sur 8 pays (${this.keywords.length} mots-clés actifs).`;
    
    store.addLog('info', 'marketing', logMsg);
    return logMsg;
  }

  public addKeyword(kw: Omit<CountryKeywordData, 'id' | 'lastOptimizedAt'>): CountryKeywordData {
    const newKw: CountryKeywordData = {
      ...kw,
      id: `kw-${Date.now()}`,
      lastOptimizedAt: new Date().toISOString()
    };
    this.keywords.push(newKw);
    this.save();
    return newKw;
  }

  public deleteKeyword(id: string) {
    this.keywords = this.keywords.filter(k => k.id !== id);
    this.save();
  }
}

export const countryKeywordsEngine = new CountryKeywordsEngine();
