export type AutonomousMode = 'manual' | 'assisted' | 'autonomous';

export type ProductFormat = 
  | 'template'
  | 'prompt_pack'
  | 'checklist'
  | 'guide'
  | 'worksheet'
  | 'framework'
  | 'pro_kit'
  | 'preset'
  | 'bundle'
  | 'mini_course'
  | 'playbook'
  | 'boilerplate';

export type ProductStatus = 'draft' | 'needs_review' | 'approved' | 'published' | 'archived';
export type ProductTier = 'winner' | 'potential' | 'underperformer' | 'dead';

export interface OpportunityWeights {
  demand: number;        // e.g. 0.30
  trend: number;         // e.g. 0.20
  monetization: number;  // e.g. 0.20
  competition: number;   // e.g. 0.15
  production: number;    // e.g. 0.15
}

export interface OpportunitySignal {
  source: 'google_trends' | 'internal_search' | 'marketplace' | 'community' | 'competitor_gap';
  query: string;
  volume: string;
  growthRate: string;
  intent: 'commercial' | 'informational' | 'transactional';
}

export interface Opportunity {
  id: string;
  title: string;
  niche: string;
  category: string;
  targetAudience: string;
  problemStatement: string;
  suggestedFormat: ProductFormat;
  demandScore: number;          // 0-100
  competitionScore: number;     // 0-100
  monetizationScore: number;    // 0-100
  trendScore: number;           // 0-100
  productionDifficulty: number; // 0-100 (lower means easier)
  estimatedMargin: number;      // e.g. 92 (%)
  estimatedConversionPotential: number; // e.g. 3.8 (%)
  estimatedRevenuePotential: number; // e.g. $4,200/mo
  overallScore: number;         // 0-100 calculated
  signals: OpportunitySignal[];
  status: 'discovered' | 'scored' | 'selected' | 'generating' | 'completed' | 'productized' | 'dismissed';
  createdAt: string;
}

export interface QualityMetrics {
  utility?: number;        // 0-100
  originality?: number;    // 0-100
  depth?: number;          // 0-100
  coherence?: number;      // 0-100
  readability?: number;    // 0-100
  perceivedValue?: number; // 0-100
  marketingQuality?: number; // 0-100
  codeQuality?: number;    // 0-100
  documentation?: number;  // 0-100
  commercialViability?: number; // 0-100
  overall: number;        // 0-100
  passed?: boolean;        // overall >= 80
  iterationCount?: number; // 1, 2, 3
  feedback?: string[];
}

export interface DigitalFile {
  id: string;
  filename: string;
  fileType: 'pdf' | 'json' | 'zip' | 'csv' | 'notion_template' | 'figma_file';
  size: string;
  downloadUrl?: string;
  contentSnippet?: string;
  downloadCount?: number;
}

export interface PromptItem {
  category: string;
  title: string;
  prompt: string;
  variables: string[];
  useCase: string;
}

export interface ChecklistItem {
  step: string;
  detail: string;
  priority: 'Must-Have' | 'High' | 'Optional';
}

export interface TemplateItem {
  name: string;
  description: string;
  fields: string[];
  instructions: string;
}

export interface ProductContent {
  summary: string;
  structure: string[];
  chapters?: Array<{
    title: string;
    description: string;
    content: string;
    actionItems?: string[];
  }>;
  prompts?: PromptItem[];
  checklistItems?: ChecklistItem[];
  templates?: TemplateItem[];
  downloadableFiles: DigitalFile[];
}

export interface ProductPackaging {
  coverUrl?: string;
  badge?: string;
  keyBenefits?: string[];
  includedItems?: string[];
  faqs?: Array<{ q: string; a: string }>;
  guarantee?: string;
  targetRole?: string;
  hook?: string;
  idealFor?: string[];
}

export interface PricingConfig {
  recommendedPrice: number;
  minPrice?: number;
  maxPrice?: number;
  compareAtPrice?: number;
  discountPercent?: number;
  promoPrice?: number;
  bundlePrice?: number;
  currency?: string;
  abTestActive?: boolean;
  testPrice?: number;
  testImpressions?: number;
  testConversions?: number;
  psychologicalEnding?: '90' | '99' | '95' | '00';
  attractiveBadge?: string;
  isFlashSale?: boolean;
  flashSaleEndsInHours?: number;
  orderBumpActive?: boolean;
  orderBumpTitle?: string;
  orderBumpPrice?: number;
  orderBumpDescription?: string;
  savingsAmount?: number;
}

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de';

export interface LocalizedProductData {
  title: string;
  subtitle: string;
  problemSolved: string;
  promisedOutcome: string;
  category?: string;
  structure?: string[];
  checklistItems?: ChecklistItem[];
  prompts?: PromptItem[];
  templates?: TemplateItem[];
  keyBenefits?: string[];
  includedItems?: string[];
  faqs?: Array<{ q: string; a: string }>;
  guarantee?: string;
  targetRole?: string;
}

export interface DigitalProduct {
  id: string;
  opportunityId?: string;
  title: string;
  subtitle: string;
  category: string;
  format: ProductFormat;
  targetAudience: string;
  problemSolved: string;
  promisedOutcome: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  pricing: PricingConfig;
  price?: number;
  status: ProductStatus;
  tier?: ProductTier;
  quality: QualityMetrics;
  content: ProductContent;
  packaging: ProductPackaging;
  duplicateSimilarityScore?: number; // 0-100 (should be < 15%)
  translations?: Partial<Record<SupportedLanguage, LocalizedProductData>>;
  
  // Analytics
  views?: number;
  salesCount?: number;
  revenue?: number;
  conversionRate?: number;
  rating?: number;
  reviewsCount?: number;
  reviews?: Array<{ name: string; role: string; text: string }>;
  
  stripeProductId?: string;
  stripePriceId?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductBundle {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  productIds: string[];
  bundlePrice: number;
  originalPrice: number;
  discountPercent: number;
  badge: string;
  coverUrl: string;
  status: 'active' | 'draft';
  salesCount: number;
  revenue: number;
  createdAt: string;
}

export type ContentChannel = 'blog' | 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'email';
export type ContentType = 
  | 'seo_article'
  | 'short_post'
  | 'educational_post'
  | 'carousel'
  | 'video_script'
  | 'newsletter'
  | 'lead_magnet'
  | 'faq_seo'
  | 'comparison_page';

export interface ContentItem {
  id: string;
  productId: string;
  productTitle: string;
  type: ContentType;
  channel: ContentChannel;
  title: string;
  hook?: string;
  body: string;
  targetKeyword?: string;
  cta: string;
  status: 'draft' | 'approved' | 'scheduled' | 'published';
  scheduledDate?: string;
  publishedDate?: string;
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    attributedRevenue: number;
  };
  createdAt: string;
}

export type AdPlatform = 'meta' | 'google' | 'tiktok' | 'youtube' | 'x';

export interface AdCampaign {
  id: string;
  productId: string;
  productTitle: string;
  platform: AdPlatform;
  campaignName: string;
  angle?: string;
  headline: string;
  primaryText?: string;
  description?: string;
  cta?: string;
  creativeConcept?: string;
  dailyBudget: number;
  status: 'active' | 'paused' | 'draft' | 'testing' | 'scaled_by_ai' | 'killed_by_ai' | 'learning';
  metrics: {
    impressions: number;
    cpm: number;
    cpc: number;
    ctr: number;
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
    revenue: number;
  };
  rulesTriggered: string[];
  createdAt: string;
  // Extended autonomous properties
  aiDecisionReason?: string;
  lastOptimizedAt?: string;
  audienceTarget?: string;
}

export interface EmailStep {
  stepNumber: number;
  subject: string;
  previewText: string;
  body: string;
  triggerDelay: string;
  openRate: number;
  clickRate: number;
}

export interface EmailSequence {
  id: string;
  productId?: string;
  productTitle?: string;
  type: 'lead_magnet' | 'post_purchase' | 'cart_abandonment';
  name: string;
  status: 'active' | 'draft';
  steps: EmailStep[];
  activeSubscribers: number;
  totalSent: number;
  totalConversions: number;
  attributedRevenue: number;
}

export interface OrderItem {
  productId: string;
  productTitle: string;
  format: string;
  price: number;
  isBundle?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    country: string;
  };
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentStatus: 'paid' | 'refunded' | 'pending';
  status?: 'completed' | 'refunded' | 'pending';
  paymentMethod: string;
  stripeSessionId: string;
  marketingAttribution?: {
    channel: string;
    campaignId?: string;
    referrer?: string;
  };
  downloadToken: string;
  downloadExpiresAt: string;
  downloadCount: number;
  maxDownloads: number;
  deliveryLogs?: Array<{ timestamp: string; ipAddress: string }>;
  createdAt: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  totalSpent: number;
  ordersCount: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  purchasedProductIds: string[];
  tags: string[];
}

export interface ApprovalItem {
  id: string;
  type: 
    | 'create_product'
    | 'publish_product'
    | 'price_change'
    | 'launch_ad'
    | 'modify_budget'
    | 'publish_content'
    | 'create_bundle'
    | 'send_email';
  title: string;
  description: string;
  payload: any;
  aiScore: number;
  estimatedPotential: string;
  financialImpact: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  justification: string;
  dataPoints: string[];
  potentialImpact: string;
  proposedAction: string;
  actionType: 
    | 'scale_campaign' 
    | 'kill_campaign' 
    | 'create_bundle' 
    | 'optimize_price' 
    | 'price_optimization'
    | 'trigger_flash_sale'
    | 'create_landing_page' 
    | 'generate_content'
    | 'localize_catalog'
    | 'deploy_seeding';
  category?: string;
  actionPayload: any;
  confidenceScore: number;
  status: 'pending' | 'executed' | 'dismissed';
  createdAt: string;
}

export interface SystemJob {
  id: string;
  type: 
    | 'opportunity_research'
    | 'product_generation'
    | 'quality_gate_check'
    | 'content_generation'
    | 'ad_optimization'
    | 'autonomous_daily_cycle'
    | 'pricing_ab_sync'
    | 'email_dispatch';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  error?: string;
  progressPercent?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'agent' | 'jobs' | 'ai' | 'stripe' | 'marketing' | 'security' | 'delivery' | 'pricing';
  message: string;
  details?: any;
}

export interface AutonomousAgentConfig {
  mode: AutonomousMode;
  schedule: {
    analysisHour: number;     // 6
    researchHour: number;     // 7
    scoringHour: number;      // 8
    creationHour: number;     // 9
    qualityCheckHour: number; // 10
    contentHour: number;      // 11
    publishHour: number;      // 12
    eveningReportHour: number;// 20
  };
  guardrails: {
    maxDailyAdBudget: number;         // e.g. 50 €
    maxPriceAdjustmentPercent: number;// e.g. 20 %
    maxNewProductsPerDay: number;     // e.g. 3
    minQualityScoreToPublish: number; // e.g. 80
    minRoasToScaleAds: number;        // e.g. 2.8
    maxCpaToKillAds: number;          // e.g. 35 €
    autoApproveSafeActions: boolean;  // e.g. true
  };
  permissions: {
    createProduct: boolean;
    publishProduct: boolean;
    modifyPrice: boolean;
    publishContent: boolean;
    launchAds: boolean;
    modifyBudget: boolean;
    sendEmail: boolean;
    createPromo: boolean;
    createBundle: boolean;
  };
  lastRunTimestamp?: string;
  isRunningCycle: boolean;
  currentStep?: string;
}

export interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  category: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  updatedAt: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  service: 'stripe' | 'supabase' | 'gemini' | 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'resend_email' | 'analytics';
  connected: boolean;
  statusText: string;
  lastSync?: string;
  config: Record<string, string>;
}

export interface BusinessHealthAlert {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  metric?: string;
}

export interface BusinessHealth {
  overallScore: number; // 0-100
  growthScore: number;
  profitabilityScore: number;
  conversionScore: number;
  adHealthScore: number;
  organicScore: number;
  catalogHealthScore: number;
  alerts: BusinessHealthAlert[];
}

export interface OnboardingState {
  completed: boolean;
  storeName: string;
  targetNiches: string[];
  languages: string[];
  currency: string;
  targetAveragePrice: number;
  monthlyRevenueGoal: number;
  maxDailyAdBudget: number;
  aiProvider: string;
  stripeConnected: boolean;
  marketingChannels: string[];
  autonomyMode: AutonomousMode;
}

export type TokenTier = 'free_tier' | 'eco_tier' | 'offline_heuristic';
export type TokenCompressionMode = 'none' | 'smart_minify' | 'aggressive_cache' | 'schema_constrained';

export interface TokenUsageRecord {
  id: string;
  timestamp: string;
  task: 'opportunity_discovery' | 'product_synthesis' | 'quality_audit' | 'copywriting' | 'ad_generator' | 'seo_analysis' | 'strategic_recommendation' | 'playground';
  model: string;
  provider: 'gemini_free' | 'offline_heuristic' | 'cached';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensSaved: number;
  estimatedCostUsd: number;
  savingsUsd: number;
  latencyMs: number;
  status: 'success' | 'throttled' | 'fallback';
}

export interface TokenBudgetConfig {
  dailyTokenQuota: number;       // Default 1,000,000 free tokens/day
  currentTokensUsedToday: number;
  tokensSavedTotal: number;
  requestsCountToday: number;
  rpmLimit: number;              // 15 RPM for free tier
  currentRpm: number;
  tpmLimit: number;              // 1,000,000 TPM
  compressionMode: TokenCompressionMode;
  autoFallbackHeuristicOnLimit: boolean;
  priorityAllocations: {
    factory: number;     // e.g. 40 (%)
    discovery: number;   // e.g. 25 (%)
    marketing: number;   // e.g. 15 (%)
    ads: number;         // e.g. 10 (%)
    strategy: number;    // e.g. 10 (%)
  };
  throttleStatus: 'optimal' | 'throttled' | 'eco_mode' | 'zero_token_offline';
}

export interface GithubRepository {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  license?: string;
  openIssues?: number;
  readmeSnippet?: string;
  techStack: string[];
  suggestedProductType: ProductFormat;
  monetizationAngle: string;
  commercialViabilityScore: number; // 0-100
  status: 'scanned' | 'imported' | 'productized';
  productizedId?: string;
  scannedAt: string;
}

export type ChannelPlatform = 
  | 'github_discussions' 
  | 'dev_to' 
  | 'hashnode' 
  | 'telegram' 
  | 'discord_webhook' 
  | 'substack_newsletter' 
  | 'bluesky' 
  | 'custom_rss';

export interface AutonomousChannel {
  id: string;
  name: string;
  platform: ChannelPlatform;
  endpointUrl: string;
  handleOrIdentifier: string;
  status: 'active' | 'creating' | 'paused' | 'failed';
  autoPostEnabled: boolean;
  totalDispatches: number;
  subscriberCount: number;
  engagementRate: number;
  lastDispatchedAt?: string;
  authStrategy: 'public_api' | 'webhook' | 'oauth_bearer' | 'rss_xml';
  logs: string[];
  createdAt: string;
}

export interface ChannelBroadcastEvent {
  id: string;
  channelId: string;
  channelName: string;
  platform: ChannelPlatform;
  productId: string;
  productTitle: string;
  payloadTitle: string;
  payloadBody: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: string;
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
  };
}

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CAD' | 'AUD' | 'CHF' | 'JPY' | 'BRL' | 'INR' | 'SGD';

export interface SupportedCurrency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateFromEur: number; // 1 EUR = X Target Currency
  stripeSupported: boolean;
  pppMultiplier?: number; // Purchasing power adjustment (optional)
}

export interface GeoLocationInfo {
  ip: string;
  countryCode: string;
  countryName: string;
  city?: string;
  currencyCode: CurrencyCode;
  flag: string;
  detectedVia: 'geo_ip' | 'browser_locale' | 'timezone_heuristic' | 'manual_override';
  detectedAt: string;
}

export interface GeoCurrencyAgentConfig {
  autoDetectGeoIp: boolean;
  enableDynamicPpp: boolean;
  fallbackCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  totalAutonomousConversions: number;
  lastRatesUpdate: string;
}

export interface CompanyBillingInfo {
  companyName: string;
  legalForm: string; // e.g. "Micro-Entreprise", "SASU", "EURL", "SARL", "Auto-entrepreneur"
  sirenSiret: string;
  rcsCity: string;
  vatNumber: string;
  vatExempt: boolean; // true = Article 293 B du CGI
  vatRatePercent: number; // e.g. 20 (%) or 0
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  paymentTerms: string;
  penaltyClause: string;
}

export interface InvoiceItem {
  title: string;
  description?: string;
  quantity: number;
  unitPriceHt: number;
  vatRate: number;
  totalHt: number;
  vatAmount: number;
  totalTtc: number;
}

export interface FrenchInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  issueDate: string;
  paymentDate: string;
  seller: CompanyBillingInfo;
  buyer: {
    name: string;
    email: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country: string;
    ip?: string;
    isBusiness?: boolean;
    vatNumber?: string;
  };
  items: InvoiceItem[];
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'refunded' | 'pending';
  legalNotice: string;
  pdfGenerated: boolean;
}

export type LegalDocumentType = 
  | 'mentions_legales' 
  | 'cgv' 
  | 'confidentialite' 
  | 'cookies' 
  | 'retractation';

export type CryptoAsset = 'BTC' | 'ETH' | 'SOL' | 'USDT' | 'USDC';

export interface CryptoCurrencyConfig {
  symbol: CryptoAsset;
  name: string;
  network: string;
  logo: string;
  rateEur: number; // 1 Asset = X EUR
  decimals: number;
  minConfirmations: number;
  receivingAddress: string;
  stripeCryptoSupported: boolean;
  color: string;
}

export interface CryptoPaymentSession {
  id: string;
  orderId: string;
  asset: CryptoAsset;
  amountCrypto: number;
  amountEur: number;
  receivingAddress: string;
  qrPayload: string;
  txHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  status: 'waiting_payment' | 'detected_mempool' | 'confirming' | 'confirmed' | 'expired';
  expiresAt: string;
  stripeCryptoPay: boolean;
  createdAt: string;
}

export interface CryptoGatewaySettings {
  enabled: boolean;
  enableStripeCrypto: boolean;
  autoConfirmSimulation: boolean;
  merchantBtcAddress: string;
  merchantEthAddress: string;
  merchantSolAddress: string;
  merchantUsdtAddress: string;
  ratesAutoUpdate: boolean;
  lastUpdatedRates: string;
}

export interface AdAgentConfig {
  salesMilestoneTarget: number; // default 100000 EUR
  overrideSimulationMode: boolean; // allow testing even if < 100k
  isAgentActive: boolean;
  maxDailyBudgetEur: number;
  reinvestmentRatePercent: number; // e.g. 15% of profits
  targetRoasFloor: number; // e.g. 2.5x minimum
  autoKillUnderperforming: boolean;
  autoScaleWinners: boolean;
  supportedPlatforms: AdPlatform[];
  totalAdSpendLifetime: number;
  totalAdRevenueLifetime: number;
  averageRoasLifetime: number;
}

// ==========================================
// 🚀 SALES EXPLOSION OPEN-SOURCE AGENTS
// ==========================================

export type AffiliateChannelType = 
  | 'youtube' 
  | 'twitter' 
  | 'newsletter' 
  | 'blog' 
  | 'discord' 
  | 'tiktok' 
  | 'podcast' 
  | 'linkedin' 
  | 'instagram' 
  | 'telegram';

export interface AffiliatePartner {
  id: string;
  name: string;
  email: string;
  channel: AffiliateChannelType;
  handle: string;
  referralCode: string;
  commissionRate: number; // e.g. 30%
  totalReferredSales: number;
  totalRevenueGenerated: number;
  totalPayoutsEur: number;
  payoutCryptoAddress?: string;
  status: 'active' | 'pending_payout' | 'top_earner';
  recruitedByAgentAt: string;
  
  // 🎯 Moteur de Viabilité Strict IA
  audienceMatch?: number; // 0-100 (adéquation niche développeur/IA/SaaS)
  engagementRate?: number; // % réel (ex: 4.8%)
  estimatedMonthlyGMV?: number; // EUR estimé
  nicheRelevance?: 'high' | 'medium' | 'low';
  trustScore?: number; // 0-100 (authenticité vs bots)
  viabilityScore?: number; // 0-100 score composite
  viabilityStatus?: 'viable' | 'not_viable' | 'pending_evaluation';
  rejectionReason?: string; // Ex: "Taux d'engagement trop faible (< 2.0%)"
  subscribersCount?: number;

  // 📦 Support Promotionnel Dédié & Dernier Envoi
  lastPromoKitTransmittedAt?: string;
  promoKitsCount?: number;
}

export interface VideoScriptScene {
  timeframe: string; // e.g. "0:00 - 0:03"
  label: string; // e.g. "Accroche Visuelle & Choc"
  visualCue: string; // e.g. "Facecam dynamique + B-roll écran"
  spokenScript: string; // e.g. "Arrête de coder ton SaaS de zéro..."
  onScreenText: string; // e.g. "🚀 3 MOIS DE DEV ÉVITÉS"
  audioSoundCue?: string; // e.g. "Whoosh sonore + Beat Lo-Fi"
}

export interface VideoPromoKit {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'general';
  durationSeconds: number;
  formatTitle: string;
  hookVariations: string[];
  storyboard: VideoScriptScene[];
  fullSpokenScript: string;
  youtubeChapters?: { time: string; title: string }[];
  descriptionCopy: string;
  pinnedCommentCopy: string;
  ctaButtonText: string;
  thumbnailConcepts: string[];
}

export interface AudioPromoKit {
  platform: 'podcast' | 'audio_ad';
  formatDuration: '30s_spot' | '60s_host_read' | 'mid_episode_deep_dive';
  hostPersonaTone: string; // e.g. "Naturel, expert, complice et sans filtre"
  hookAudio: string;
  scriptHostRead: string;
  couponPronunciationGuide: string; // e.g. "Épeler clairement le code..."
  showNotesBlurb: string;
  soundBedRecommendation: string;
}

export interface TextCopyPromoKit {
  platform: 'twitter' | 'linkedin' | 'newsletter' | 'discord' | 'telegram' | 'blog';
  headlineHooks: string[];
  mainBodyCopy: string; // Full markdown / multi-tweet thread / email blast
  bulletPointsValue: string[];
  fomoUrgencyTrigger: string;
  callToActionWithTracking: string;
  subjectLines?: { subject: string; estimatedOpenRate: number }[];
  psUrgencyNote?: string;
  communityExclusivePerkNotice?: string;
}

export interface AffiliatePromoKit {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateHandle: string;
  affiliateChannel: AffiliateChannelType;
  referralCode: string;
  discountPercent: number; // e.g. 15% or 20%
  affiliateTrackingUrl: string;
  
  productId: string;
  productTitle: string;
  productSubtitle: string;
  productPrice: number;
  productFormat: string;
  productCategory: string;
  
  generatedAt: string;
  lastTransmittedAt?: string;
  transmissionStatus: 'ready' | 'transmitted' | 'viewed_by_affiliate' | 'converting';
  transmissionChannel: 'email' | 'discord_webhook' | 'telegram_bot' | 'dashboard_direct';
  
  // Multi-modal tailored packs
  videoKit: VideoPromoKit;
  audioKit: AudioPromoKit;
  textKit: TextCopyPromoKit;
  
  // Visual asset directives
  visualBannerPrompts: {
    bannerType: 'youtube_thumbnail' | 'tiktok_cover' | 'x_card_banner' | 'instagram_story';
    promptText: string;
    headlineOverlay: string;
  }[];
}

export interface AbandonedCartLead {
  id: string;
  email: string;
  customerName?: string;
  country?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  productId: string;
  productTitle: string;
  cartValue: number;
  currency: string;
  abandonedAt: string;
  recoveryStep: 1 | 2 | 3 | 4 | 5 | 'awaiting_payment' | 'recovered' | 'expired';
  recoveryDiscountCode: string;
  recoveryDiscountPercent: number;
  recoveryChannel: 'email' | 'webhook' | 'push' | 'telegram' | 'exit_intent';
  aiHesitationReason?: 'price_point' | 'proof_validation' | 'distraction' | 'technical_question' | 'urgency_doubt';
  aiPersonalizedSubject?: string;
  aiPersonalizedBody?: string;
  recoveryHistory?: Array<{
    timestamp: string;
    step: number;
    discount: number;
    channel: string;
    note: string;
  }>;
  recoveredAt?: string;
}

export interface SocialProofEvent {
  id: string;
  buyerName: string;
  cityCountry: string;
  productTitle: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'btc' | 'eth' | 'sol' | 'usdt';
  txHash?: string;
  timestamp: string;
  verifiedOnChain: boolean;
}

export interface B2BLeadOpportunity {
  id: string;
  targetCompanyOrProject: string;
  contactRole: string;
  contactChannel: 'github' | 'x' | 'linkedin' | 'email';
  contactHandle: string;
  relevantProductBundle: string;
  estimatedDealSizeEur: number;
  matchScore: number;
  customPitchHook: string;
  outreachStatus: 'discovered' | 'pitched' | 'negotiating' | 'closed_won';
  discoveredAt: string;
}

// ==========================================
// 🏆 TOP-LEADER SEO AGENTS MATRIX
// ==========================================

export interface TopicalClusterNode {
  id: string;
  pillarKeyword: string;
  searchVolumeMonthly: number;
  keywordDifficulty: number; // 0-100
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  subtopics: string[];
  semanticEntities: string[]; // Google Knowledge Graph entities
  internalLinkTargets: string[];
  rankingPositionCurrent?: number;
  rankingPositionTarget: number; // e.g. Top 1-3
  estimatedTrafficMonthly: number;
  linkedProductId?: string;
  status: 'indexed' | 'ranking_top_3' | 'generating' | 'optimized';
}

export interface ProgrammaticSeoPage {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  targetQueryPattern: string; // e.g. "Best {tech_stack} templates for {use_case}"
  category: string;
  targetRole: string;
  frameworkTag: string;
  schemaType: 'SoftwareApplication' | 'Product' | 'FAQPage' | 'HowTo';
  jsonLdSnippet: string;
  canonicalUrl: string;
  indexNowStatus: 'submitted' | 'crawled' | 'indexed';
  views: number;
  organicClicks: number;
  conversions: number;
  createdAt: string;
}

export interface BacklinkProspect {
  id: string;
  domainName: string;
  url: string;
  domainAuthority: number; // 0-100
  prospectType: 'awesome_list' | 'resource_hub' | 'tech_directory' | 'guest_post' | 'unlinked_mention';
  anchorTextSuggested: string;
  relevanceScore: number;
  pitchEmailTemplate: string;
  status: 'identified' | 'contacted' | 'acquired' | 'live';
  acquiredBacklinkUrl?: string;
  createdAt: string;
}

export interface CompetitorGapAnalysis {
  id: string;
  competitorDomain: string;
  competitorRankedKeyword: string;
  competitorRank: number;
  ourCurrentRank?: number;
  rankingGapDifficulty: 'easy_win' | 'medium' | 'hard';
  searchVolume: number;
  recommendedAction: string;
  potentialRevenueMonthly: number;
}

// ==========================================
// 📊 COMPREHENSIVE MULTI-HORIZON PROFITABILITY
// ==========================================

export type TimeHorizonKey = '30d' | '90d' | '180d' | '1y' | '3y';

export interface HorizonProfitabilityBreakdown {
  horizonKey: TimeHorizonKey;
  horizonLabel: string;
  periodDays: number;
  
  // Traffic & Audience
  monthlyVisitors: number;
  cumulativeVisitors: number;
  organicSeoTrafficShare: number; // % (e.g. 70%)
  githubSyndicationShare: number; // % (e.g. 20%)
  affiliateReferralShare: number; // % (e.g. 10%)
  
  // Conversion & Sales Volume
  conversionRate: number; // % (e.g. 3.8%)
  averageOrderValueEur: number; // EUR (e.g. 47€ with bumps/bundles)
  totalOrdersCount: number;
  
  // Revenue Breakdown
  grossRevenueEur: number;
  fiatRevenueEur: number;
  cryptoRevenueEur: number; // BTC, ETH, SOL, USDT
  
  // Operational Cost Breakdown (Zero LLM Tokens, Low Server)
  tokenApiCostEur: number; // 0.00 € (Free tier + Local Engine)
  serverHostingCostEur: number; // 10-25 €/mo
  paymentProcessingFeesEur: number; // ~1.5% Stripe + ~0.1% Crypto
  domainAndCdnCostEur: number;
  affiliateCommissionsPaidEur: number;
  totalOperatingCostsEur: number;
  
  // Net Margins & Profit
  grossProfitEur: number;
  grossMarginPercent: number; // e.g. 98.5%
  netProfitEur: number;
  netMarginPercent: number; // e.g. 96.8%
  
  // Hours of Human Work Needed
  humanWorkHoursRequired: number; // 0h (100% Autonomous)
  hourlyEquivalentReturnEur: number;
  
  // Growth Milestones
  activeProductsCatalog: number;
  indexedSeoPages: number;
  acquiredBacklinks: number;
  activeAffiliatePartners: number;
  adBudgetUnlocked: boolean;
}

export interface ProfitabilitySimulationParams {
  baseMonthlyTraffic: number; // e.g. 15,000
  trafficMonthlyGrowthRate: number; // e.g. 25%
  conversionRate: number; // e.g. 3.5%
  averageOrderValue: number; // e.g. 45€
  cryptoSharePercent: number; // e.g. 25%
  affiliateSharePercent: number; // e.g. 15%
  bundleAdoptionRatePercent: number; // e.g. 30%
}

// 🧠 AGENT MÉTA-OPTIMISEUR CROSS-IA (CONTINUOUS SELF-IMPROVEMENT)
// ==============================================================

export type AIEcosystemProvider = 
  | 'deepseek'
  | 'anthropic_claude'
  | 'openai'
  | 'mistral'
  | 'qwen'
  | 'meta_llama'
  | 'google_gemini';

export interface ModelBenchmarkInsight {
  id: string;
  sourceEcosystem: AIEcosystemProvider;
  modelName: string;
  techniqueCategory: 'prompt_compression' | 'reasoning_distillation' | 'negative_constraints' | 'structured_json' | 'conversion_psychology' | 'viral_retention' | 'seo_entity_matching';
  techniqueTitle: string;
  discoveryDate: string;
  keyMechanism: string;
  tokenSavingsRate: number; // e.g. 48% token reduction
  conversionBoostRate: number; // e.g. +18.5%
  zeroCostImplementation: string;
  applicableBots: string[];
  status: 'scanned' | 'benchmarked' | 'integrated' | 'active_production';
}

export interface AgentPromptRefinement {
  id: string;
  agentId: string;
  agentName: string;
  promptKey: string;
  originalTokensEstimated: number;
  optimizedTokensEstimated: number;
  tokenSavingsPercent: number;
  inspirationSource: string; // e.g. "DeepSeek-R1 Distillation + Claude 3.7 Thinking Syntax"
  enhancementDetails: string;
  beforeSnippet: string;
  afterSnippet: string;
  appliedAt: string;
  verifiedFreeCost: boolean;
}

export interface CrossAIOptimizerState {
  lastScanTimestamp: string;
  totalTechniquesScanned: number;
  activeRefinementsApplied: number;
  blendedTokenCompressionRate: number; // e.g. 54.2%
  monthlyCostAvoidedEur: number; // Savings vs paid APIs
  ecosystemsTracked: Array<{
    provider: AIEcosystemProvider;
    name: string;
    status: 'monitoring' | 'optimizing' | 'idle';
    lastInsight: string;
    techniquesExtracted: number;
    zeroCostScore: number;
  }>;
  insights: ModelBenchmarkInsight[];
  refinements: AgentPromptRefinement[];
}

// 🌍 AGENT #19 : CRÉATEUR DE CONTENU RÉSEAUX SOCIAUX OPTIMISÉ TOUT PAYS
// ======================================================================

export type SocialPlatformType = 
  | 'tiktok'
  | 'instagram'
  | 'youtube_shorts'
  | 'twitter'
  | 'linkedin'
  | 'threads'
  | 'pinterest'
  | 'facebook';

export type TargetCountryCode = 'FR' | 'US' | 'GB' | 'DE' | 'ES' | 'IT' | 'BR' | 'JP' | 'CA' | 'AU';
export type TargetLanguageCode = 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt' | 'ja';

export type SocialRedirectStrategy = 
  | 'direct_product'
  | 'bio_link'
  | 'dm_keyword'
  | 'promo_coupon'
  | 'discounted_deep_link';

export type ContentFormatType = 
  | 'vertical_video' // TikTok, Reels, Shorts (9:16)
  | 'carousel_slides' // Instagram, LinkedIn carousels (1:1 or 4:5)
  | 'text_thread' // X / Twitter, Threads (Long-form breakdown)
  | 'story_infographic' // Story with swipe-up/sticker link (9:16)
  | 'article_newsletter'; // LinkedIn Pulse, Substack-ready

export type ContentCreativeStyle = 
  | 'direct_response' // High urgency, ROI proof, sharp hook
  | 'aesthetic_minimal' // Apple-like elegance, clean typography
  | 'educational_breakdown' // Step-by-step tutorial & framework
  | 'provocative_debunk' // Contrarian angle, bust industry myth
  | 'storytelling_behind_scenes' // Founder journey, 0 to $10k
  | 'meme_humor_relatable'; // High shareability & pop culture

export type ContentTargetDuration = 
  | '15s' // Ultra-punchy 15 seconds (TikTok/Shorts viral speed)
  | '30s' // Standard sweet-spot 30 seconds
  | '60s' // Deep walkthrough 60 seconds
  | '90s' // Long-form short video
  | 'carousel_7slides' // 7 slides multi-card
  | 'thread_5tweets'; // 5 tweets sequence

export interface DirectAccessEndpoint {
  id: string;
  name: string;
  type: 'webhook_autopublish' | 'buffer_zapier' | 'make_integromat' | 'meta_graph_api' | 'tiktok_direct_api' | 'x_v2_api' | 'simulated_instant';
  urlOrToken: string;
  authTokenBearer?: string;
  status: 'online' | 'standby' | 'rate_limited';
  autoExecutionDelaySec: number; // e.g. 0 for instant, 30 for safe buffer
  maxDailyPostsLimit: number;
  currentTodayPosts: number;
  lastPingTimestamp: string;
}

export interface SocialChannelAccount {
  id: string;
  platform: SocialPlatformType;
  accountName: string;
  handle: string; // e.g. @digitalfactory_global
  profileUrl: string;
  customWebhookUrl?: string;
  directAccessEndpoint?: DirectAccessEndpoint;
  targetCountries: TargetCountryCode[];
  targetLanguages: TargetLanguageCode[];
  defaultRedirectType: SocialRedirectStrategy;
  defaultDiscountPercent: number; // e.g. 20%
  status: 'active' | 'paused' | 'simulated' | 'needs_auth';
  autoPublishEnabled: boolean;
  postingFrequencyHours: number; // e.g. every 4 hours
  preferredFormat: ContentFormatType;
  preferredStyle: ContentCreativeStyle;
  preferredDuration: ContentTargetDuration;
  lastPostTime?: string;
  followersCount: number;
  totalPostsCount: number;
  totalClicksGenerated: number;
  attributedSalesCount: number;
  attributedRevenueEur: number;
}

export interface GlobalSocialPost {
  id: string;
  accountId: string;
  platform: SocialPlatformType;
  targetCountry: TargetCountryCode;
  language: TargetLanguageCode;
  productTargetId: string;
  productTitle: string;
  format: ContentFormatType;
  style: ContentCreativeStyle;
  duration: ContentTargetDuration;
  hookCategory: 'shocking_contrast' | 'mistake_exposure' | 'metric_reveal' | 'framework_leak' | 'story_transformation';
  hookHeadline: string;
  videoScenePlan: Array<{
    timestamp: string;
    visualAction: string;
    spokenAudioText: string;
    onScreenOverlay: string;
  }>;
  carouselSlides?: Array<{
    slideNumber: number;
    headline: string;
    bodyText: string;
    visualNote: string;
  }>;
  textThreadPosts?: string[];
  fullCaption: string;
  hashtags: string[];
  redirectUrl: string;
  utmParams: {
    source: string;
    medium: string;
    campaign: string;
    content: string;
  };
  discountCouponCode?: string;
  visualPromptForAI: string;
  directPublishingTriggered: boolean;
  directPublishEndpointName?: string;
  status: 'draft' | 'scheduled' | 'published' | 'viral';
  scheduledFor: string;
  publishedAt?: string;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    linkClicks: number;
    conversions: number;
    attributedRevenueEur: number;
  };
  createdAt: string;
}

export interface GlobalSocialEngineState {
  accounts: SocialChannelAccount[];
  posts: GlobalSocialPost[];
  autoPilotActive: boolean;
  lastAutoPublishCycle: string;
  totalReachEstimates: number;
  totalTrackedClicks: number;
  totalSocialRevenueEur: number;
  topPerformingCountry: TargetCountryCode;
}

// 🛠️ AGENT #20 : ARCHITECTE DU SITE, AUDITEUR, RÉPARTITEUR & AUTO-DEV
// ====================================================================

export type CodeAuditSeverity = 'info' | 'warning' | 'critical';
export type CodeAuditCategory = 'integrity' | 'performance' | 'security' | 'conversion' | 'accessibility' | 'dead_links';

export interface CodeAuditIssue {
  id: string;
  severity: CodeAuditSeverity;
  category: CodeAuditCategory;
  title: string;
  description: string;
  filePath: string;
  suggestedFix: string;
  autoFixAvailable: boolean;
  fixed: boolean;
}

export interface CodeAuditReport {
  id: string;
  timestamp: string;
  globalScore: number; // 0-100
  checksPassed: number;
  checksFailed: number;
  issues: CodeAuditIssue[];
  latencyScoreMs: number;
  brokenLinksFound: number;
}

export interface AgentTaskDispatch {
  id: string;
  subAgentId: string;
  subAgentName: string;
  taskTitle: string;
  category: 'product_synthesis' | 'seo_indexing' | 'social_distribution' | 'checkout_optimization' | 'mempool_listen';
  priority: 'urgent' | 'high' | 'normal';
  payloadSummary: string;
  status: 'dispatched' | 'in_progress' | 'completed' | 'failed';
  assignedAt: string;
  completedAt?: string;
  executionLog: string;
}

export interface CodePatchCommit {
  id: string;
  title: string;
  description: string;
  patchType: 'bugfix' | 'conversion_booster' | 'perf_optimization' | 'seo_injection' | 'feature_patch';
  affectedFiles: string[];
  diffSnippet: string;
  safetyScore: number; // 0-100
  status: 'staged' | 'applied' | 'rolled_back';
  appliedAt: string;
  author: 'Agent 20 Auto-Dev' | 'Autonomous Engine';
}

export interface AutonomousSiteEngineerState {
  latestAudit: CodeAuditReport;
  dispatches: AgentTaskDispatch[];
  patches: CodePatchCommit[];
  autoSelfHealingActive: boolean;
  lastHealthCheckTimestamp: string;
  activeWorkersCount: number;
  codeIntegrityPercent: number;
}

// 🌐 AGENT #21 : ACTUALISATION DES DONNÉES DU RÉEL & OPTIMISATEUR MACRO 24/24
// ==============================================================================

export interface RealWorldTrendSignal {
  id: string;
  query: string;
  category: string;
  targetCountry: TargetCountryCode;
  searchVolumeGrowth: string; // e.g. "+340% 7j"
  velocityIndex: number; // 0-100
  searchIntent: 'high_buying' | 'problem_solving' | 'exploratory';
  relatedProductNiche: string;
  macroDriver: string; // e.g. "Lancement ChatGPT 5 & DeepSeek V3.1"
  detectedAt: string;
}

export interface MacroEconomicsMetric {
  currency: string;
  symbol: string;
  rateToEur: number;
  change24hPercent: number;
  purchasingPowerParityMultiplier: number; // For dynamic localized pricing
  suggestedLocalPromoPercent: number;
  marketStatus: 'bullish' | 'neutral' | 'bearish';
  lastUpdated: string;
}

export interface BusinessOptimizationRule {
  id: string;
  domain: 'dynamic_pricing' | 'seo_keywords' | 'email_timing' | 'social_copy' | 'product_positioning';
  ruleName: string;
  triggerSignal: string;
  autonomousActionTaken: string;
  impactEstimated: string;
  status: 'active_applied' | 'monitoring';
  appliedAt: string;
}

export interface RealWorldTelemetryState {
  lastSyncTimestamp: string;
  syncFrequencyMinutes: number;
  currencies: MacroEconomicsMetric[];
  trendSignals: RealWorldTrendSignal[];
  activeOptimizations: BusinessOptimizationRule[];
  operationalCostEur: number; // STRICTEMENT 0,00 €
  globalConsumerSentiment: 'strong_buyer_intent' | 'moderate' | 'cautious';
  activeTimezonePeakRegions: string[];
}

// 💀 AGENT IA SUPRÊME : OBLITERATUS (PLINIUS MECHANISTIC INTERPRETABILITY & ABLITERATION ENGINE)
// ==============================================================================

export type ObliterationMethod = 
  | 'basic' 
  | 'advanced' 
  | 'aggressive' 
  | 'surgical' 
  | 'optimized' 
  | 'inverted' 
  | 'nuclear' 
  | 'spectral_cascade' 
  | 'steering_vectors'
  | 'failspy'
  | 'heretic';

export type ObliteratusTargetModel = 
  | 'Llama-3.3-70B-Instruct'
  | 'Llama-3.1-8B-Instruct'
  | 'Qwen-2.5-72B-Instruct'
  | 'Mistral-Large-2411'
  | 'DeepSeek-V3-MoE'
  | 'DeepSeek-R1-Distill'
  | 'Gemma-2-27B-IT'
  | 'Phi-4-14B';

export interface ObliterationJobResult {
  jobId: string;
  modelName: ObliteratusTargetModel;
  method: ObliterationMethod;
  status: 'completed' | 'running' | 'queued' | 'evaluating';
  refusalRateBefore: number; // e.g. 98.4%
  refusalRateAfter: number; // e.g. 0.0%
  svdDirectionsCount: number; // e.g. 4
  layersAblated: number[]; // e.g. [14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
  perplexityDelta: number; // e.g. +0.02 (capability preserved)
  mmluScoreRetained: number; // e.g. 99.6%
  timestamp: string;
  outputDirectory: string;
  reversibility: 'permanent_weights' | 'runtime_steering_offset';
}

export interface ObliteratusMessage {
  id: string;
  sender: 'user' | 'obliteratus' | 'system';
  text: string;
  timestamp: string;
  actionExecuted?: {
    actionType: 
      | 'automate_all' 
      | 'run_cycle' 
      | 'create_product' 
      | 'publish_social' 
      | 'audit_code' 
      | 'optimize_pricing' 
      | 'guardrail_status' 
      | 'obliterate_model' 
      | 'probe_geometry' 
      | 'steer_vectors' 
      | 'expert_surgery'
      | 'query_macro_telemetry'
      | 'run_site_engineer_patch';
    label: string;
    details?: string;
    success: boolean;
    technicalMeta?: {
      method?: ObliterationMethod;
      model?: string;
      refusalRate?: string;
      svdComponents?: number;
      driftDelta?: string;
    };
  };
  suggestedQuickActions?: Array<{
    label: string;
    prompt: string;
    icon?: string;
  }>;
}

export interface ObliteratusAgentState {
  status: 'online' | 'executing' | 'analyzing' | 'standby' | 'abliterating';
  totalCommandsExecuted: number;
  lastAutonomousDirective: string;
  systemIntegrityScore: number; // e.g. 99.8%
  allCyclesAutomated: boolean;
  activeBotsCount: number; // 23
  currentSelectedMethod: ObliterationMethod;
  currentSelectedModel: ObliteratusTargetModel;
  activeSteeringOffset: number; // -1.0 to 1.0
  activeRefusalVectorExcised: boolean;
  historyJobs: ObliterationJobResult[];
  messages: ObliteratusMessage[];
}

// ==========================================
// 🛍️ STOREFRONT VISUAL & INVENTORY AI AGENT
// ==========================================

export interface StorefrontCluster {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badge: string;
  description: string;
  productIds: string[];
  themeAccent: string;
  suggestedBundleDiscount: number; // e.g. 25 (%)
  averageRating: number;
  totalProductsCount: number;
}

export type StorefrontClusteringMode = 
  | 'smart_clusters'       // Regroupements thématiques intelligents par affinité IA
  | 'conversion_rank'      // Ordonné par taux de conversion maximal
  | 'category_tabs'        // Catégories classiques
  | 'curated_showcase';    // Vitrine éditorialiste & bestsellers

export type StorefrontHeroTheme = 
  | 'cyber_quantum' 
  | 'midnight_executive' 
  | 'minimal_slate' 
  | 'aurora_indigo';

export interface StorefrontVisualConfig {
  heroHeadline: string;
  heroSubheadline: string;
  heroBadge: string;
  heroCtaText: string;
  heroTheme: StorefrontHeroTheme;
  clusteringMode: StorefrontClusteringMode;
  showDynamicNotice: boolean;
  dynamicNoticeText: string;
  showAffinityBundles: boolean;
  showLiveSocialTicker: boolean;
  showInventoryFreshness: boolean;
  showSimilarRecommendations: boolean;
  gridDensity: 'comfortable' | 'compact' | 'cards_rich';
}

export type DigitalStockHealthStatus = 
  | 'freshly_updated'      // Fichiers 2026 récents et vérifiés
  | 'in_stock'             // Parfait état opérationnel
  | 'high_demand'          // Forte traction / Best-seller
  | 'update_recommended'   // Besoin d'enrichir les prompts ou doc
  | 'legacy_compatible';   // Rétrocompatible

export interface DigitalInventoryHealthRecord {
  productId: string;
  productTitle: string;
  version: string;
  lastUpdated: string;
  filesCount: number;
  fileTypes: string[];
  digitalStockStatus: DigitalStockHealthStatus;
  downloadCount: number;
  licenseKeysRemaining: number;
  healthScore: number; // 0-100
  syncStatus: 'synced' | 'indexing' | 'optimized';
  changelogNotes: string[];
  similarityKeywords: string[];
  recommendedComplementaryProductIds: string[];
}

export interface IdenticalProductVariant {
  id: string;
  title: string;
  subtitle: string;
  format: ProductFormat;
  level: string;
  recommendedPrice: number;
  compareAtPrice?: number;
  filesCount: number;
  fileTypes: string[];
  qualityScore: number;
  similarityToPrimary: number; // 0-100%
  category: string;
  keyBenefitsCount: number;
  rating: number;
  availableQuantity: number; // e.g. 1 unit or licenses count
}

export interface IdenticalProductGroup {
  groupId: string;
  groupKey: string;
  primaryProduct: DigitalProduct;
  variants: IdenticalProductVariant[];
  allProductIds: string[];
  totalAvailableQuantity: number; // Aggregated quantity (e.g. 3 editions / licenses)
  totalUniqueFilesCount: number;
  averageSimilarityScore: number; // 0-100%
  groupingRationale: string;
  nicheTheme: string;
  unifiedBadge: string;
  lowestPrice: number;
  highestPrice: number;
  hasDiscount: boolean;
  maxDiscountPercent?: number;
  isSingle: boolean;
  lastGroupedAt: string;
}

export interface StorefrontAgentState {
  isActive: boolean;
  autoOptimizeEnabled: boolean;
  lastOptimizationTimestamp: string;
  totalVisualIterationsRun: number;
  visualConfig: StorefrontVisualConfig;
  clusters: StorefrontCluster[];
  inventoryHealth: DigitalInventoryHealthRecord[];
  identicalGroups: IdenticalProductGroup[];
  enableIdenticalGrouping: boolean;
  activeClusterFilter: string; // 'all' or clusterId
  dynamicBadges: Record<string, string>; // productId -> badge name
  crossSells: Record<string, string[]>; // productId -> [similar productIds]
}

export type TrafficChannel = 
  | 'google_seo' 
  | 'social_networks' 
  | 'ai_recommendations' 
  | 'affiliates_partners' 
  | 'developer_communities'
  | 'direct_traffic';

export interface LiveVisitorSession {
  id: string;
  ipMasked: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  source: TrafficChannel;
  sourceLabel: string;
  referrer: string;
  currentPath: string;
  productViewedTitle?: string;
  productId?: string;
  device: 'desktop' | 'mobile' | 'tablet';
  startedAt: string;
  lastActiveAt: string;
  hasAddedToCart: boolean;
  hasPurchased: boolean;
}

export interface LiveVisitorEvent {
  id: string;
  timestamp: string;
  flag: string;
  city: string;
  country: string;
  action: 'visit' | 'view_product' | 'add_to_cart' | 'checkout_start' | 'purchase';
  description: string;
  source: TrafficChannel;
}

export interface SearchIndexingRadar {
  googleIndexed: boolean;
  googleIndexedPagesCount: number;
  bingIndexed: boolean;
  perplexityCitationReady: boolean;
  chatGptBotAllowed: boolean;
  indexNowPingStatus: 'active' | 'synced' | 'pending';
  lastPingTimestamp: string;
  sitemapSubmittedUrl: string;
}

export interface TrafficEngineState {
  isActive: boolean;
  isAutopilotTrafficEnabled: boolean;
  activeLiveVisitorsCount: number;
  totalVisitsToday: number;
  totalUniqueVisitors: number;
  averageDurationSeconds: number;
  bounceRatePercent: number;
  conversionRatePercent: number;
  channelBreakdown: Record<TrafficChannel, {
    visits: number;
    percentage: number;
    conversions: number;
    conversionRate: number;
  }>;
  liveVisitors: LiveVisitorSession[];
  recentEvents: LiveVisitorEvent[];
  indexingRadar: SearchIndexingRadar;
  trafficBoostActive: boolean;
  boostMultiplier: number;
  boostExpiresAt?: string;
}


