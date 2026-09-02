import { 
  DigitalProduct, 
  ProductBundle, 
  Opportunity, 
  ContentItem, 
  AdCampaign, 
  EmailSequence, 
  Order, 
  Customer, 
  ApprovalItem, 
  Recommendation, 
  SystemJob, 
  SystemLog, 
  AutonomousAgentConfig, 
  PromptTemplate, 
  IntegrationStatus,
  OnboardingState 
} from '../types';
import { productsData } from './productsData';

export const initialOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Notion SaaS Operating System & Financial Engine',
    niche: 'Solopreneurs & Indie Hackers',
    category: 'Productivity & Management',
    targetAudience: 'Early-stage founders, solo developers, and bootstrap creators',
    problemStatement: 'Founders waste 15+ hours weekly juggling disconnected spreadsheets, CRM tools, and metric trackers with zero unified financial view.',
    suggestedFormat: 'template',
    demandScore: 94,
    competitionScore: 42,
    monetizationScore: 92,
    trendScore: 89,
    productionDifficulty: 28,
    estimatedMargin: 96,
    estimatedConversionPotential: 4.6,
    estimatedRevenuePotential: 5800,
    overallScore: 91,
    signals: [
      { source: 'google_trends', query: 'notion saas operating system template', volume: '18,500/mo', growthRate: '+142%', intent: 'transactional' },
      { source: 'marketplace', query: 'mrr tracker financial template notion', volume: '12,200/mo', growthRate: '+88%', intent: 'commercial' },
      { source: 'internal_search', query: 'complete saas starter kit notion', volume: '340 queries', growthRate: '+65%', intent: 'transactional' }
    ],
    status: 'completed',
    createdAt: '2026-08-10T08:00:00.000Z'
  },
  {
    id: 'opp-2',
    title: '500+ High-Converting AI Copywriting & Sales Prompts Pack',
    niche: 'Digital Marketers & E-commerce',
    category: 'AI & Marketing',
    targetAudience: 'Copywriters, agencies, Shopify store owners, growth leads',
    problemStatement: 'Marketers struggle to extract high-converting sales letters, VSL scripts, and email hooks from generic ChatGPT prompts.',
    suggestedFormat: 'prompt_pack',
    demandScore: 96,
    competitionScore: 55,
    monetizationScore: 88,
    trendScore: 95,
    productionDifficulty: 20,
    estimatedMargin: 98,
    estimatedConversionPotential: 5.2,
    estimatedRevenuePotential: 7200,
    overallScore: 89,
    signals: [
      { source: 'google_trends', query: 'claude 3.7 prompt pack copywriting', volume: '27,400/mo', growthRate: '+210%', intent: 'commercial' },
      { source: 'community', query: 'tested cold email framework prompts', volume: '8,900 mentions', growthRate: '+95%', intent: 'transactional' }
    ],
    status: 'completed',
    createdAt: '2026-08-11T10:30:00.000Z'
  },
  {
    id: 'opp-3',
    title: 'Micro-SaaS Zero-to-One Growth Playbook & Launch Checklists',
    niche: 'Tech Founders',
    category: 'Business & Strategy',
    targetAudience: 'Software engineers launching their first paid software',
    problemStatement: 'Engineers build great software but fail at distribution, pricing, ProductHunt launch, and cold outreach.',
    suggestedFormat: 'checklist',
    demandScore: 88,
    competitionScore: 38,
    monetizationScore: 86,
    trendScore: 84,
    productionDifficulty: 35,
    estimatedMargin: 95,
    estimatedConversionPotential: 3.9,
    estimatedRevenuePotential: 4400,
    overallScore: 85,
    signals: [
      { source: 'marketplace', query: 'product hunt launch checklist step by step', volume: '9,400/mo', growthRate: '+54%', intent: 'transactional' },
      { source: 'internal_search', query: 'b2b saas cold email checklist', volume: '210 queries', growthRate: '+40%', intent: 'commercial' }
    ],
    status: 'completed',
    createdAt: '2026-08-12T14:15:00.000Z'
  },
  {
    id: 'opp-4',
    title: 'AI Automation Agency (AAA) Workflow Blueprint & Client Kits',
    niche: 'Freelancers & Automation Builders',
    category: 'Agency & Services',
    targetAudience: 'Make.com & Zapier builders, AI agency owners, consultants',
    problemStatement: 'Builders lack client onboarding templates, SOPs, pricing calculators, and ready-to-deploy Make/n8n blueprints.',
    suggestedFormat: 'pro_kit',
    demandScore: 92,
    competitionScore: 48,
    monetizationScore: 95,
    trendScore: 91,
    productionDifficulty: 40,
    estimatedMargin: 94,
    estimatedConversionPotential: 4.1,
    estimatedRevenuePotential: 8900,
    overallScore: 88,
    signals: [
      { source: 'google_trends', query: 'n8n ai agent workflows pack', volume: '31,000/mo', growthRate: '+320%', intent: 'transactional' },
      { source: 'competitor_gap', query: 'ai automation agency proposal contract templates', volume: '14,000/mo', growthRate: '+115%', intent: 'commercial' }
    ],
    status: 'completed',
    createdAt: '2026-08-14T09:00:00.000Z'
  },
  {
    id: 'opp-5',
    title: 'Ultimate Figma Design System & UI Kit for Modern SaaS',
    niche: 'UI/UX Designers & Devs',
    category: 'Design & UI/UX',
    targetAudience: 'Product designers, indie developers needing clean dashboards',
    problemStatement: 'Building responsive SaaS dashboards from scratch takes 80+ hours of UI component and auto-layout configuration.',
    suggestedFormat: 'preset',
    demandScore: 89,
    competitionScore: 50,
    monetizationScore: 89,
    trendScore: 82,
    productionDifficulty: 45,
    estimatedMargin: 93,
    estimatedConversionPotential: 3.5,
    estimatedRevenuePotential: 5100,
    overallScore: 83,
    signals: [
      { source: 'marketplace', query: 'dark mode saas dashboard figma tokens', volume: '22,000/mo', growthRate: '+76%', intent: 'transactional' }
    ],
    status: 'completed',
    createdAt: '2026-08-15T11:20:00.000Z'
  },
  {
    id: 'opp-6',
    title: 'Content Creator Evergreen Video Hooks & Short-Form Script Engine',
    niche: 'Creators & Influencers',
    category: 'Social Media',
    targetAudience: 'TikTokers, YouTubers, IG Reels creators, course creators',
    problemStatement: 'Creators hit burnout after 30 days due to lack of high-retention 3-second hooks and algorithmic script pacing.',
    suggestedFormat: 'worksheet',
    demandScore: 91,
    competitionScore: 62,
    monetizationScore: 82,
    trendScore: 94,
    productionDifficulty: 22,
    estimatedMargin: 97,
    estimatedConversionPotential: 4.8,
    estimatedRevenuePotential: 6200,
    overallScore: 84,
    signals: [
      { source: 'google_trends', query: 'viral hook formulas for tiktok 2026', volume: '44,000/mo', growthRate: '+180%', intent: 'commercial' }
    ],
    status: 'selected',
    createdAt: '2026-08-17T16:00:00.000Z'
  },
  {
    id: 'opp-7',
    title: 'Freelance Tech Contract & Retainer Pitch Kit (Legal & Closing)',
    niche: 'Freelance Engineers',
    category: 'Legal & Finance',
    targetAudience: 'Senior contractors, developers transitioning to advisory retainers',
    problemStatement: 'Developers lose thousands on scope creep and late payments due to weak contract clauses and poor retainer packaging.',
    suggestedFormat: 'framework',
    demandScore: 85,
    competitionScore: 32,
    monetizationScore: 94,
    trendScore: 78,
    productionDifficulty: 30,
    estimatedMargin: 96,
    estimatedConversionPotential: 4.3,
    estimatedRevenuePotential: 4900,
    overallScore: 86,
    signals: [
      { source: 'internal_search', query: 'retainer contract template tech consulting', volume: '180 queries', growthRate: '+50%', intent: 'transactional' }
    ],
    status: 'scored',
    createdAt: '2026-08-18T07:45:00.000Z'
  },
  {
    id: 'opp-8',
    title: 'Complete B2B SaaS Cold Email & LinkedIn Inbound Playbook',
    niche: 'B2B Sales & Outbound',
    category: 'Sales & Growth',
    targetAudience: 'SDRs, founders doing founder-led sales, agency owners',
    problemStatement: 'Generic cold emails get 2% open rates and land in spam folders without domain warmups and intent personalization.',
    suggestedFormat: 'guide',
    demandScore: 90,
    competitionScore: 45,
    monetizationScore: 91,
    trendScore: 86,
    productionDifficulty: 25,
    estimatedMargin: 96,
    estimatedConversionPotential: 4.4,
    estimatedRevenuePotential: 6800,
    overallScore: 87,
    signals: [
      { source: 'marketplace', query: 'cold email templates 40 percent reply rate', volume: '19,800/mo', growthRate: '+92%', intent: 'transactional' }
    ],
    status: 'scored',
    createdAt: '2026-08-18T12:00:00.000Z'
  }
];

export const initialProducts: DigitalProduct[] = productsData;

export const initialBundles: ProductBundle[] = [
  {
    id: 'bundle-1',
    title: 'Ultimate Founder & Creator Revenue Suite',
    subtitle: 'The complete toolkit combining the Notion SaaS OS, 500+ AI Copywriting Vault, and Micro-SaaS Growth Playbook.',
    description: 'Everything you need to plan, build, write copy for, and scale a profitable digital product or SaaS business in 2026.',
    productIds: ['prod-1', 'prod-2', 'prod-3'],
    bundlePrice: 79,
    originalPrice: 113,
    discountPercent: 30,
    badge: 'Best Value Bundle ⚡ Save 30%',
    coverUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80',
    status: 'active',
    salesCount: 0,
    revenue: 0,
    createdAt: '2026-08-16T10:00:00.000Z'
  },
  {
    id: 'bundle-2',
    title: 'AI Agency & Solopreneur Growth Empire Kit',
    subtitle: 'All 5 flagship products in one master package: SaaS OS, 500+ Prompts, AAA Agency Kit, Growth Playbook, and Figma UI Kit.',
    description: 'Our entire digital ecosystem at our steepest discount. The ultimate asset library for builders, freelancers, and ambitious founders.',
    productIds: ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5'],
    bundlePrice: 167,
    originalPrice: 269,
    discountPercent: 38,
    badge: 'The Complete Empire Pack 🔥 38% Off',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
    status: 'active',
    salesCount: 0,
    revenue: 0,
    createdAt: '2026-08-17T12:00:00.000Z'
  }
];

export const initialContentItems: ContentItem[] = [
  {
    id: 'cnt-1',
    productId: 'prod-1',
    productTitle: 'Notion SaaS Operating System & Financial Engine',
    type: 'seo_article',
    channel: 'blog',
    title: 'How to Track SaaS MRR, Churn & Runway in Notion (Without Breaking Excel Formulas)',
    targetKeyword: 'track saas mrr in notion',
    body: 'Managing early-stage SaaS metrics in fragmented spreadsheets is a recipe for silent churn and calculation errors. In this deep-dive guide, we explore the 4 essential interconnected databases required for real-time visibility into MRR expansion, cohort retention, and cash runway...',
    cta: 'Download the complete Notion SaaS OS template with pre-built financial formulas',
    status: 'published',
    publishedDate: '2026-08-14T09:00:00.000Z',
    performance: { impressions: 0, clicks: 0, conversions: 0, attributedRevenue: 0 },
    createdAt: '2026-08-13T11:00:00.000Z'
  },
  {
    id: 'cnt-2',
    productId: 'prod-2',
    productTitle: '500+ High-Converting AI Copywriting & Sales Prompts Pack',
    type: 'short_post',
    channel: 'twitter',
    title: 'Why 99% of ChatGPT Copywriting Sucks (And The 3 Negative Constraints to Fix It)',
    hook: 'Most AI-generated copy smells like robots in 0.5 seconds. Here is the exact negative prompt framing that gets human-level conversions: 🧵👇',
    body: 'Rule 1: Ban the 15 cliché words (elevate, unleash, powerhouse, game-changer).\nRule 2: Enforce dynamic sentence cadence: 5 words, then 14 words, then 3 words.\nRule 3: Frame the contrast before the promise.',
    cta: 'Get all 520+ high-converting prompts in the AI Copywriting Master Vault',
    status: 'published',
    publishedDate: '2026-08-16T14:30:00.000Z',
    performance: { impressions: 0, clicks: 0, conversions: 0, attributedRevenue: 0 },
    createdAt: '2026-08-15T10:00:00.000Z'
  },
  {
    id: 'cnt-3',
    productId: 'prod-4',
    productTitle: 'AI Automation Agency (AAA) Workflow Blueprint & Client Kits',
    type: 'carousel',
    channel: 'linkedin',
    title: 'How We Pitch a $5,000/Month n8n AI Automation Retainer to Traditional B2B Clients',
    hook: 'Traditional businesses do not care about Python or Webhooks. They care about recovered hours and pipeline throughput.',
    body: 'Slide 1: The Cost of Manual Inefficiency\nSlide 2: The 3 Core AI Automation Workflows Every B2B Needs\nSlide 3: How to Price Based on Value Rather Than Hours\nSlide 4: The 1-Page SLA Contract Framework',
    cta: 'Grab the exact pitch deck & 10 n8n workflows in the AAA Blueprint Kit',
    status: 'published',
    publishedDate: '2026-08-17T08:00:00.000Z',
    performance: { impressions: 0, clicks: 0, conversions: 0, attributedRevenue: 0 },
    createdAt: '2026-08-16T15:00:00.000Z'
  },
  {
    id: 'cnt-4',
    productId: 'prod-2',
    productTitle: '500+ High-Converting AI Copywriting & Sales Prompts Pack',
    type: 'video_script',
    channel: 'tiktok',
    title: 'Stop Asking ChatGPT To "Write A Sales Page" — Use This 3-Step Formula Instead',
    hook: 'If you ask AI to write a landing page, you get corporate slop. Do this instead.',
    body: 'Scene 1: Show blank AI screen vs high-converting copy.\nScene 2: Explain Eugene Schwartz 5 stages of customer awareness.\nScene 3: Reveal the exact 1-sentence prompt modifier.',
    cta: 'Link in bio for the 500+ Copywriting Prompts Vault',
    status: 'scheduled',
    scheduledDate: '2026-08-20T17:00:00.000Z',
    performance: { impressions: 0, clicks: 0, conversions: 0, attributedRevenue: 0 },
    createdAt: '2026-08-18T10:00:00.000Z'
  }
];

export const initialAdCampaigns: AdCampaign[] = [
  {
    id: 'ad-1',
    productId: 'prod-2',
    productTitle: '500+ High-Converting AI Copywriting & Sales Prompts Pack',
    platform: 'meta',
    campaignName: 'Meta - AI Copy Pack - Broad Founders & Marketers',
    angle: 'Contrarian: Stop Writing Boring AI Copy',
    headline: '500+ Tested Direct-Response Prompts for Claude & GPT-4',
    primaryText: 'Tired of generic ChatGPT copy that sounds like a robot wrote it? Get 520+ multi-shot prompts engineered with real persuasive psychology and zero fluff. Download instant access today.',
    description: 'Join marketers and founders closing higher sales today.',
    cta: 'Get Instant Access',
    creativeConcept: 'Split screen showing bland robot output vs crisp Dan Kennedy-style sales letter generated in 8 seconds.',
    dailyBudget: 35,
    status: 'testing',
    metrics: {
      impressions: 0,
      cpm: 0,
      cpc: 0,
      ctr: 0,
      spend: 0,
      conversions: 0,
      cpa: 0,
      roas: 0,
      revenue: 0
    },
    rulesTriggered: ['Garde-Fou 100k€ Actif : Budget publicitaire gelé à 0,00 € tant que 100 000 € de ventes organiques ne sont pas atteints.'],
    createdAt: '2026-08-13T08:00:00.000Z'
  }
];

export const initialEmailSequences: EmailSequence[] = [
  {
    id: 'seq-1',
    productId: 'prod-2',
    productTitle: '500+ High-Converting AI Copywriting & Sales Prompts Pack',
    type: 'lead_magnet',
    name: 'Free 25 High-Converting Prompts Nurture Flow',
    status: 'active',
    activeSubscribers: 0,
    totalSent: 0,
    totalConversions: 0,
    attributedRevenue: 0,
    steps: [
      {
        stepNumber: 1,
        subject: '🎁 Your 25 Free High-Converting AI Prompts are here',
        previewText: 'Instant download link inside + quick setup instructions.',
        body: 'Hey {{first_name}},\n\nHere is your instant link to the 25 High-Converting AI Prompts...\n\nUse Prompt #4 today on your next LinkedIn post and watch the comment velocity.',
        triggerDelay: 'Immediate (0 min)',
        openRate: 0,
        clickRate: 0
      }
    ]
  }
];

export const initialOrders: Order[] = [];

export const initialCustomers: Customer[] = [];

export const initialApprovals: ApprovalItem[] = [
  {
    id: 'appr-1',
    type: 'create_product',
    title: 'Generate New Product: Content Creator Video Hook Engine',
    description: 'High opportunity score (84/100). Validated market demand on TikTok & YouTube Shorts with 44k monthly search volume.',
    payload: { opportunityId: 'opp-6', format: 'worksheet', suggestedPrice: 39 },
    aiScore: 88,
    estimatedPotential: '+€3,400/mo estimated MRR',
    financialImpact: 'Creation Cost: €0.00 (AI) — Zero Risk',
    riskLevel: 'low',
    status: 'pending',
    createdAt: '2026-08-19T06:45:00.000Z'
  },
  {
    id: 'appr-2',
    type: 'modify_budget',
    title: 'Scale Meta Ads Budget for 500+ Prompts Pack (+€15/day)',
    description: 'ROAS over the last 7 days is 4.83x with €7.66 CPA against €37 average cart value. Autonomous rule recommends scaling daily budget from €35 to €50.',
    payload: { campaignId: 'ad-1', currentBudget: 35, proposedBudget: 50 },
    aiScore: 94,
    estimatedPotential: '+€1,800/mo incremental revenue at ~4.2x ROAS',
    financialImpact: '+€15.00/day ad spend',
    riskLevel: 'low',
    status: 'pending',
    createdAt: '2026-08-19T07:15:00.000Z'
  },
  {
    id: 'appr-3',
    type: 'price_change',
    title: 'Increase Notion SaaS OS base price from €47 to €57',
    description: 'A/B pricing elasticity test demonstrated that €49 had a 4.79% conversion rate vs 4.81% for €47, capturing +17% net margin per sale without volume drop.',
    payload: { productId: 'prod-1', currentPrice: 47, proposedPrice: 57 },
    aiScore: 91,
    estimatedPotential: '+€1,240/mo gross margin boost',
    financialImpact: '+€10.00 gross margin per unit',
    riskLevel: 'medium',
    status: 'pending',
    createdAt: '2026-08-19T07:30:00.000Z'
  }
];

export const initialRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    title: '500+ AI Copywriting Pack converts 1.8x higher than store average',
    justification: 'The product has achieved a 7.67% conversion rate with strong Meta ads performance (4.83x ROAS). Increasing direct top-of-funnel ad spend is highly profitable.',
    dataPoints: ['7.67% conversion rate', '4.83x ROAS on Meta', '€17,316 total revenue to date'],
    potentialImpact: '+€3,200/month incremental profit',
    proposedAction: 'Increase daily Meta ad budget by 40% and launch lookalike audience campaign.',
    actionType: 'scale_campaign',
    actionPayload: { campaignId: 'ad-1', budgetIncrease: 15 },
    confidenceScore: 96,
    status: 'pending',
    createdAt: '2026-08-19T06:00:00.000Z'
  },
  {
    id: 'rec-2',
    title: 'New emerging trend: "Claude 3.7 Agent Prompts" up +320%',
    justification: 'Opportunity scanner detected 31,000 monthly searches for agentic workflow prompts with near-zero structured commercial competitors.',
    dataPoints: ['+320% search growth on Google Trends', 'High commercial intent (92/100)', 'Zero dominant product on Gumroad/LemonSqueezy'],
    potentialImpact: '+€4,500 in first 30 days',
    proposedAction: 'Trigger AI Product Factory to generate an Agentic Prompt Kit & n8n workflow pack.',
    actionType: 'generate_content',
    actionPayload: { opportunityId: 'opp-4' },
    confidenceScore: 92,
    status: 'pending',
    createdAt: '2026-08-19T06:30:00.000Z'
  },
  {
    id: 'rec-3',
    title: 'Create cross-sell bundle for Micro-SaaS Playbook + UI Kit',
    justification: '42% of Micro-SaaS Playbook buyers visited the Figma UI Kit page within 48 hours but did not complete checkout due to separate cart friction.',
    dataPoints: ['42% visitor overlap', 'Estimated +28% average order value uplift'],
    potentialImpact: '+€1,450/month in upsell revenue',
    proposedAction: 'Generate an automatic "SaaS Builder Launch Duo" bundle priced at €67 (saving 25%).',
    actionType: 'create_bundle',
    actionPayload: { productIds: ['prod-3', 'prod-5'], bundlePrice: 67 },
    confidenceScore: 89,
    status: 'pending',
    createdAt: '2026-08-19T07:00:00.000Z'
  }
];

export const initialSystemLogs: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-08-19T06:00:02.000Z',
    level: 'info',
    category: 'agent',
    message: 'Autonomous Engine: Daily 06:00 Business Health Analysis cycle started.'
  },
  {
    id: 'log-2',
    timestamp: '2026-08-19T06:02:15.000Z',
    level: 'success',
    category: 'ai',
    message: 'Opportunity Scanner: Scanned 14 market data feeds and indexed 8 high-potential demand signals.'
  },
  {
    id: 'log-3',
    timestamp: '2026-08-19T06:14:20.000Z',
    level: 'success',
    category: 'stripe',
    message: 'Stripe Webhook: payment_intent.succeeded for order #DPF-2026-8942 (€47.00 EUR from Alexandre Dupont).'
  },
  {
    id: 'log-4',
    timestamp: '2026-08-19T06:14:21.000Z',
    level: 'info',
    category: 'delivery',
    message: 'Digital Delivery Engine: Generated secure signed token tok_live_notion_8942_99x (5 max downloads, 30-day validity).'
  },
  {
    id: 'log-5',
    timestamp: '2026-08-19T07:00:00.000Z',
    level: 'info',
    category: 'marketing',
    message: 'Ads Optimization Loop: Analyzed 4 live campaigns across Meta, Google & TikTok. All active campaigns operating above target ROAS (average 4.35x).'
  },
  {
    id: 'log-6',
    timestamp: '2026-08-19T07:45:00.000Z',
    level: 'success',
    category: 'stripe',
    message: 'Stripe Webhook: payment_intent.succeeded for order #DPF-2026-8944 (€97.00 EUR from Marcus Vance).'
  },
  {
    id: 'log-7',
    timestamp: '2026-08-19T08:00:12.000Z',
    level: 'info',
    category: 'agent',
    message: 'Autonomous Guardrails Check: All spend limits within daily threshold (€115.00 spend vs €150.00 ceiling).'
  }
];

export const initialSystemJobs: SystemJob[] = [
  {
    id: 'job-1',
    type: 'autonomous_daily_cycle',
    payload: { date: '2026-08-19' },
    status: 'completed',
    attempts: 1,
    maxAttempts: 3,
    progressPercent: 100,
    startedAt: '2026-08-19T06:00:00.000Z',
    completedAt: '2026-08-19T06:04:12.000Z',
    createdAt: '2026-08-19T05:59:50.000Z'
  },
  {
    id: 'job-2',
    type: 'quality_gate_check',
    payload: { productId: 'prod-4' },
    status: 'completed',
    attempts: 1,
    maxAttempts: 3,
    progressPercent: 100,
    startedAt: '2026-08-19T06:20:00.000Z',
    completedAt: '2026-08-19T06:21:40.000Z',
    createdAt: '2026-08-19T06:19:30.000Z'
  },
  {
    id: 'job-3',
    type: 'pricing_ab_sync',
    payload: { productId: 'prod-1' },
    status: 'completed',
    attempts: 1,
    maxAttempts: 3,
    progressPercent: 100,
    startedAt: '2026-08-19T07:10:00.000Z',
    completedAt: '2026-08-19T07:11:05.000Z',
    createdAt: '2026-08-19T07:09:50.000Z'
  }
];

export const initialAgentConfig: AutonomousAgentConfig = {
  mode: 'assisted',
  schedule: {
    analysisHour: 6,
    researchHour: 7,
    scoringHour: 8,
    creationHour: 9,
    qualityCheckHour: 10,
    contentHour: 11,
    publishHour: 12,
    eveningReportHour: 20
  },
  guardrails: {
    maxDailyAdBudget: 75,
    maxPriceAdjustmentPercent: 25,
    maxNewProductsPerDay: 3,
    minQualityScoreToPublish: 80,
    minRoasToScaleAds: 3.0,
    maxCpaToKillAds: 30,
    autoApproveSafeActions: true
  },
  permissions: {
    createProduct: true,
    publishProduct: false,
    modifyPrice: false,
    publishContent: true,
    launchAds: false,
    modifyBudget: false,
    sendEmail: true,
    createPromo: false,
    createBundle: true
  },
  lastRunTimestamp: '2026-08-19T06:00:00.000Z',
  isRunningCycle: false,
  currentStep: 'Idle (Next scheduled check: 09:00 Creation Cycle)'
};

export const initialPromptTemplates: PromptTemplate[] = [
  {
    id: 'p-1',
    key: 'opportunity_research',
    name: 'Opportunity Market Research Engine',
    category: 'Research',
    version: '2.3',
    systemPrompt: 'You are an elite digital product researcher analyzing real market search volume, commercial purchase intent, consumer frustration signals, and competitor saturation.',
    userPromptTemplate: 'Analyze the niche: {{NICHE}}. Identify 5 high-demand digital product opportunities. For each, evaluate: Problem solved, target buyer, search signals, suggested format, monetization score (0-100), and competition score (0-100). Return clean structured JSON.',
    variables: ['NICHE', 'TARGET_MARKET'],
    updatedAt: '2026-08-15T10:00:00.000Z'
  },
  {
    id: 'p-2',
    key: 'product_creation',
    name: 'Full Digital Product Generator',
    category: 'Product Factory',
    version: '3.1',
    systemPrompt: 'You are a master product designer creating high-value, non-fluff digital assets (templates, prompt packs, guides, checklists). Every output must have concrete, immediately usable content.',
    userPromptTemplate: 'Generate a complete {{FORMAT}} for the topic: "{{TITLE}}". Target Audience: {{AUDIENCE}}. Include executive summary, detailed multi-chapter structure, actionable step-by-step materials, checklists, and ready-to-use formulas.',
    variables: ['FORMAT', 'TITLE', 'AUDIENCE'],
    updatedAt: '2026-08-17T14:00:00.000Z'
  },
  {
    id: 'p-3',
    key: 'quality_control',
    name: 'AI Quality Gate & Anti-Slop Evaluator',
    category: 'Quality Assurance',
    version: '2.0',
    systemPrompt: 'You are a ruthless quality gate auditor for digital products. Score products from 0-100 across 7 strict criteria: Utility, Originality, Depth, Coherence, Readability, Perceived Value, and Marketing Quality. Flag any cliché, vague, or repetitive content.',
    userPromptTemplate: 'Audit the following digital product: Title: {{TITLE}}, Format: {{FORMAT}}, Content: {{CONTENT_SNIPPET}}. Provide scores for each metric, pass/fail decision (threshold 80), and specific improvement suggestions if score is under 80.',
    variables: ['TITLE', 'FORMAT', 'CONTENT_SNIPPET'],
    updatedAt: '2026-08-18T09:00:00.000Z'
  },
  {
    id: 'p-4',
    key: 'landing_page',
    name: 'Direct-Response Landing Page Copywriter',
    category: 'Marketing Copy',
    version: '2.8',
    systemPrompt: 'You are a legendary direct-response copywriter in the style of Eugene Schwartz, David Ogilvy, and Gary Halbert. Write punchy, believable, high-converting copy without SaaS buzzwords.',
    userPromptTemplate: 'Generate a high-converting landing page for "{{TITLE}}". Price: {{PRICE}}. Deliver: 3 Hero variations (H1, Subhead, CTA), Core Problem breakdown, 5 Unfair Advantages/Benefits, What is Inside bullet points, Objections & FAQs, and Ironclad Guarantee.',
    variables: ['TITLE', 'PRICE', 'PROMISED_OUTCOME'],
    updatedAt: '2026-08-18T16:00:00.000Z'
  },
  {
    id: 'p-5',
    key: 'ad_copy',
    name: 'Multi-Channel Ad Creative Generator',
    category: 'Advertising',
    version: '2.4',
    systemPrompt: 'You are a senior media buyer and creative strategist producing viral, high-CTR ads for Meta, Google Search, and TikTok.',
    userPromptTemplate: 'Create 3 distinct ad creative angles for "{{TITLE}}". Angle 1: Contrarian Truth. Angle 2: Pain & Fast Relief. Angle 3: Direct Value Demonstration. Include Headline, Primary Text (under 120 words), and Creative Visual Concept.',
    variables: ['TITLE', 'BENEFITS'],
    updatedAt: '2026-08-19T05:00:00.000Z'
  }
];

export const initialIntegrations: IntegrationStatus[] = [
  {
    id: 'int-stripe',
    name: 'Stripe Payments',
    service: 'stripe',
    connected: true,
    statusText: 'Connected (Live Checkout & Webhook Listener active)',
    lastSync: '2026-08-19T08:05:10.000Z',
    config: {
      mode: 'Test Mode & Live Simulation',
      publishableKey: 'pk_test_51Nx...factory',
      webhookEndpoint: '/api/webhooks/stripe',
      autoDeliverOnPayment: 'true'
    }
  },
  {
    id: 'int-gemini',
    name: 'Google Gemini 2.5 AI',
    service: 'gemini',
    connected: true,
    statusText: 'Connected (gemini-2.5-flash & gemini-2.5-pro active)',
    lastSync: '2026-08-19T08:00:00.000Z',
    config: {
      model: 'gemini-2.5-flash',
      fallbackModel: 'gemini-2.5-pro',
      temperature: '0.7',
      maxTokens: '8192'
    }
  },
  {
    id: 'int-supabase',
    name: 'Supabase Database & Auth',
    service: 'supabase',
    connected: true,
    statusText: 'Connected (PostgreSQL Schema & RLS active)',
    lastSync: '2026-08-19T07:55:00.000Z',
    config: {
      url: 'https://o7x7qgnd3gcv6bny2mih.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      rlsEnforced: 'true'
    }
  },
  {
    id: 'int-meta',
    name: 'Meta Marketing API (Facebook / Instagram)',
    service: 'meta_ads',
    connected: true,
    statusText: 'Connected (Ad Account #act_90428120)',
    lastSync: '2026-08-19T07:30:00.000Z',
    config: {
      adAccountId: 'act_90428120',
      pixelId: 'pix_8894102',
      autoRulesActive: 'true'
    }
  },
  {
    id: 'int-google',
    name: 'Google Ads API',
    service: 'google_ads',
    connected: true,
    statusText: 'Connected (Customer ID 824-910-4491)',
    lastSync: '2026-08-19T07:15:00.000Z',
    config: {
      customerId: '824-910-4491',
      conversionTrackingId: 'AW-9841289'
    }
  },
  {
    id: 'int-resend',
    name: 'Resend / Transactional Email',
    service: 'resend_email',
    connected: true,
    statusText: 'Connected (Sender: orders@digitalfactory.io)',
    lastSync: '2026-08-19T08:05:12.000Z',
    config: {
      senderDomain: 'digitalfactory.io',
      dkimVerified: 'true'
    }
  }
];

export const initialOnboardingState: OnboardingState = {
  completed: true,
  storeName: 'Digital Product Factory',
  targetNiches: ['Indie Hackers & SaaS', 'AI & Copywriting', 'Agency Automation', 'Design & UI/UX'],
  languages: ['French', 'English'],
  currency: 'EUR',
  targetAveragePrice: 49,
  monthlyRevenueGoal: 25000,
  maxDailyAdBudget: 75,
  aiProvider: 'Google Gemini 2.5 Flash',
  stripeConnected: true,
  marketingChannels: ['Meta Ads', 'SEO Blog', 'Twitter/X', 'LinkedIn', 'Email Newsletters'],
  autonomyMode: 'assisted'
};
