import { 
  DigitalProduct, 
  IdenticalProductGroup, 
  IdenticalProductVariant, 
  ProductFormat 
} from '../types';
import { store } from './store';

const STORAGE_KEY = 'df_similarity_grouping_agent_state_v1';

// Stopwords in FR and EN
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'pour', 'avec', 'sans', 'dans', 'sur', 'par',
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'is', 'all', 'one', 'pack',
  'kit', 'system', 'système', 'guide', 'playbook', 'template', 'pro', 'master', 'v2', 'v1', 'complete', 'complet'
]);

function tokenizeText(str: string): string[] {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  let intersectionCount = 0;
  setA.forEach(token => {
    if (setB.has(token)) intersectionCount++;
  });

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function calculateProductSimilarity(p1: DigitalProduct, p2: DigitalProduct): number {
  if (p1.id === p2.id) return 1.0;

  // Exact or near title match
  const title1 = (p1.title || '').toLowerCase().trim();
  const title2 = (p2.title || '').toLowerCase().trim();
  if (title1 === title2) return 0.98;

  const tokens1 = tokenizeText(`${p1.title} ${p1.subtitle} ${p1.problemSolved} ${p1.category} ${p1.targetAudience}`);
  const tokens2 = tokenizeText(`${p2.title} ${p2.subtitle} ${p2.problemSolved} ${p2.category} ${p2.targetAudience}`);

  const textSim = calculateJaccardSimilarity(tokens1, tokens2);

  // Title specific similarity (heavy weight)
  const titleTokens1 = tokenizeText(p1.title);
  const titleTokens2 = tokenizeText(p2.title);
  const titleSim = calculateJaccardSimilarity(titleTokens1, titleTokens2);

  // Format & category bonus
  let bonus = 0;
  if (p1.category === p2.category) bonus += 0.15;
  if (p1.format === p2.format) bonus += 0.10;

  // Keyword topic matches (e.g. Notion, SaaS, AI Prompt, Cold Email, Growth)
  const topicKeywords = ['notion', 'saas', 'prompt', 'copywriting', 'cold email', 'growth', 'agency', 'figma', 'boilerplate', 'n8n', 'workflow'];
  for (const kw of topicKeywords) {
    const has1 = `${p1.title} ${p1.subtitle}`.toLowerCase().includes(kw);
    const has2 = `${p2.title} ${p2.subtitle}`.toLowerCase().includes(kw);
    if (has1 && has2) {
      bonus += 0.20;
      break;
    }
  }

  const combinedScore = Math.min(1.0, (titleSim * 0.45) + (textSim * 0.35) + bonus);
  return combinedScore;
}

export class SimilarityGroupingAgent {
  private groups: IdenticalProductGroup[] = [];
  private isAutoGroupingEnabled: boolean = true;
  private listeners: Set<() => void> = new Set();
  private lastRunTimestamp: string = new Date().toISOString();

  constructor() {
    this.loadState();
    this.executeAutonomousGrouping(false);
  }

  private loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.isAutoGroupingEnabled = parsed.isAutoGroupingEnabled ?? true;
        this.lastRunTimestamp = parsed.lastRunTimestamp || new Date().toISOString();
      }
    } catch (e) {}
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isAutoGroupingEnabled: this.isAutoGroupingEnabled,
        lastRunTimestamp: this.lastRunTimestamp,
        groupsCount: this.groups.length
      }));
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

  public isAutoEnabled(): boolean {
    return this.isAutoGroupingEnabled;
  }

  public setAutoEnabled(enabled: boolean) {
    this.isAutoGroupingEnabled = enabled;
    this.saveState();
    if (enabled) {
      this.executeAutonomousGrouping(true);
    }
    store.addLog('info', 'marketing', `Agent Regroupement Produits Similaires : ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  public getGroups(): IdenticalProductGroup[] {
    if (this.groups.length === 0) {
      this.executeAutonomousGrouping(false);
    }
    return [...this.groups];
  }

  public getGroupForProduct(productId: string): IdenticalProductGroup | undefined {
    return this.groups.find(g => g.allProductIds.includes(productId));
  }

  // Core Autonomous Grouping Engine
  public executeAutonomousGrouping(logSuccess: boolean = false): IdenticalProductGroup[] {
    const allProducts = store.getProducts().filter(p => p.status === 'published');
    if (allProducts.length === 0) {
      this.groups = [];
      return [];
    }

    const visited = new Set<string>();
    const generatedGroups: IdenticalProductGroup[] = [];

    // Grouping threshold (similarity >= 82% strictly for actual identical/variant editions)
    const SIMILARITY_THRESHOLD = 0.82;

    for (let i = 0; i < allProducts.length; i++) {
      const current = allProducts[i];
      if (visited.has(current.id)) continue;

      const clusterProducts: Array<{ product: DigitalProduct; similarity: number }> = [
        { product: current, similarity: 1.0 }
      ];
      visited.add(current.id);

      for (let j = i + 1; j < allProducts.length; j++) {
        const candidate = allProducts[j];
        if (visited.has(candidate.id)) continue;

        const sim = calculateProductSimilarity(current, candidate);
        if (sim >= SIMILARITY_THRESHOLD) {
          clusterProducts.push({ product: candidate, similarity: sim });
          visited.add(candidate.id);
        }
      }

      // Elect primary product (best quality overall, or highest rating)
      clusterProducts.sort((a, b) => {
        const qA = a.product.quality?.overall || 80;
        const qB = b.product.quality?.overall || 80;
        if (qB !== qA) return qB - qA;
        return (b.product.rating || 5) - (a.product.rating || 5);
      });

      const primary = clusterProducts[0].product;
      const allProductIds = clusterProducts.map(c => c.product.id);

      // Construct variants
      const variants: IdenticalProductVariant[] = clusterProducts.map(c => {
        const p = c.product;
        const files = p.content?.downloadableFiles || [];
        const fileTypes = [...new Set(files.map(f => f.fileType || 'zip'))];
        const recPrice = p.pricing?.recommendedPrice ?? 47;
        const compPrice = p.pricing?.compareAtPrice ?? (recPrice + 20);
        return {
          id: p.id,
          title: p.title || 'Digital Product',
          subtitle: p.subtitle || '',
          format: p.format || 'template',
          level: p.level || 'All Levels',
          recommendedPrice: recPrice,
          compareAtPrice: compPrice,
          filesCount: Math.max(files.length, 1),
          fileTypes: fileTypes.length > 0 ? fileTypes : ['pdf', 'zip'],
          qualityScore: p.quality?.overall || 90,
          similarityToPrimary: Math.round((c.similarity || 0) * 100),
          category: p.category || 'Productivity',
          keyBenefitsCount: p.packaging?.keyBenefits?.length || 3,
          rating: p.rating || 5.0,
          availableQuantity: 1 // 1 edition unit
        };
      });

      const avgSim = Math.round(
        (clusterProducts.reduce((sum, c) => sum + (c.similarity || 0), 0) / clusterProducts.length) * 100
      );

      const prices = variants.map(v => v.recommendedPrice);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 47;
      const highestPrice = prices.length > 0 ? Math.max(...prices) : 47;

      // Collect total files
      const totalUniqueFiles = clusterProducts.reduce((sum, c) => {
        return sum + Math.max(c.product.content?.downloadableFiles?.length || 1, 1);
      }, 0);

      // Aggregate available quantity (count of identical editions available)
      const totalAvailableQuantity = variants.length;

      // Group rationale
      let rationale = 'Fiche individuelle optimisée';
      if (variants.length > 1) {
        rationale = `${variants.length} produits similaires fusionnés (${avgSim}% affinité sémantique) : même intention d'achat & audience cible.`;
      }

      // Group badge
      let unifiedBadge = primary.pricing?.attractiveBadge || '⭐ Choix Recommandé';
      if (variants.length > 1) {
        unifiedBadge = `✨ ${variants.length} ÉDITIONS REGROUPÉES`;
      }

      const group: IdenticalProductGroup = {
        groupId: `group-${primary.id}`,
        groupKey: (primary.category || 'general').toLowerCase().replace(/\s+/g, '-'),
        primaryProduct: primary,
        variants,
        allProductIds,
        totalAvailableQuantity,
        totalUniqueFilesCount: totalUniqueFiles,
        averageSimilarityScore: avgSim,
        groupingRationale: rationale,
        nicheTheme: primary.category,
        unifiedBadge,
        lowestPrice,
        highestPrice,
        hasDiscount: Boolean(primary.pricing?.compareAtPrice && primary.pricing.compareAtPrice > (primary.pricing?.recommendedPrice ?? 47)),
        maxDiscountPercent: primary.pricing?.discountPercent || undefined,
        isSingle: variants.length === 1,
        lastGroupedAt: new Date().toISOString()
      };

      generatedGroups.push(group);
    }

    this.groups = generatedGroups;
    this.lastRunTimestamp = new Date().toISOString();
    this.saveState();

    const mergedCount = generatedGroups.filter(g => !g.isSingle).length;
    if (logSuccess && mergedCount > 0) {
      store.addLog(
        'success',
        'marketing',
        `🤖 Agent Autonome : ${mergedCount} groupes de produits similaires fusionnés en fiches unifiées (Stock & quantités disponibles synchronisés).`
      );
    }

    return generatedGroups;
  }

  // Periodic tick for autonomous engine
  public runAutonomousGroupingTick() {
    if (!this.isAutoGroupingEnabled) return;
    this.executeAutonomousGrouping(false);
  }
}

export const similarityGroupingAgent = new SimilarityGroupingAgent();
