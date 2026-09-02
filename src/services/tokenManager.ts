import { TokenBudgetConfig, TokenUsageRecord, TokenCompressionMode } from '../types';

const TOKEN_CONFIG_KEY = 'dpf_token_budget_config_v1';
const TOKEN_RECORDS_KEY = 'dpf_token_usage_records_v1';

const DEFAULT_CONFIG: TokenBudgetConfig = {
  dailyTokenQuota: 1000000, // 1M free tokens per day
  currentTokensUsedToday: 42350,
  tokensSavedTotal: 18920,
  requestsCountToday: 38,
  rpmLimit: 15,
  currentRpm: 2,
  tpmLimit: 1000000,
  compressionMode: 'smart_minify',
  autoFallbackHeuristicOnLimit: true,
  priorityAllocations: {
    factory: 40,
    discovery: 25,
    marketing: 15,
    ads: 10,
    strategy: 10
  },
  throttleStatus: 'optimal'
};

const INITIAL_RECORDS: TokenUsageRecord[] = [
  {
    id: 'tok_rec_1',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    task: 'opportunity_discovery',
    model: 'gemini-3.7-flash (Free)',
    provider: 'gemini_free',
    promptTokens: 420,
    completionTokens: 850,
    totalTokens: 1270,
    tokensSaved: 480,
    estimatedCostUsd: 0,
    savingsUsd: 0.00127,
    latencyMs: 820,
    status: 'success'
  },
  {
    id: 'tok_rec_2',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    task: 'product_synthesis',
    model: 'gemini-3.7-flash (Free)',
    provider: 'gemini_free',
    promptTokens: 1100,
    completionTokens: 2900,
    totalTokens: 4000,
    tokensSaved: 1450,
    estimatedCostUsd: 0,
    savingsUsd: 0.0040,
    latencyMs: 1420,
    status: 'success'
  },
  {
    id: 'tok_rec_3',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    task: 'quality_audit',
    model: 'Zero-Token Offline Engine',
    provider: 'offline_heuristic',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    tokensSaved: 1200,
    estimatedCostUsd: 0,
    savingsUsd: 0.0012,
    latencyMs: 35,
    status: 'success'
  },
  {
    id: 'tok_rec_4',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    task: 'ad_generator',
    model: 'gemini-3.7-flash (Free)',
    provider: 'gemini_free',
    promptTokens: 380,
    completionTokens: 620,
    totalTokens: 1000,
    tokensSaved: 320,
    estimatedCostUsd: 0,
    savingsUsd: 0.0010,
    latencyMs: 640,
    status: 'success'
  }
];

class TokenManagerService {
  private config: TokenBudgetConfig;
  private records: TokenUsageRecord[];
  private rpmTimestamps: number[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.records = this.loadRecords();
    this.cleanupOldRpm();
  }

  private loadConfig(): TokenBudgetConfig {
    try {
      const raw = localStorage.getItem(TOKEN_CONFIG_KEY);
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (e) {
      console.warn('Failed to load token config from localStorage', e);
    }
    return DEFAULT_CONFIG;
  }

  private saveConfig() {
    try {
      localStorage.setItem(TOKEN_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error(e);
    }
  }

  private loadRecords(): TokenUsageRecord[] {
    try {
      const raw = localStorage.getItem(TOKEN_RECORDS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load token records from localStorage', e);
    }
    return INITIAL_RECORDS;
  }

  private saveRecords() {
    try {
      localStorage.setItem(TOKEN_RECORDS_KEY, JSON.stringify(this.records.slice(0, 100)));
    } catch (e) {
      console.error(e);
    }
  }

  public getConfig(): TokenBudgetConfig {
    this.cleanupOldRpm();
    return { ...this.config };
  }

  public updateConfig(partial: Partial<TokenBudgetConfig>): TokenBudgetConfig {
    this.config = { ...this.config, ...partial };
    this.saveConfig();
    return this.config;
  }

  public getRecords(): TokenUsageRecord[] {
    return [...this.records];
  }

  public estimateTokens(text: string): number {
    if (!text) return 0;
    // Approximates token count (avg 3.8 chars per token for English/technical JSON)
    return Math.ceil(text.length / 3.8);
  }

  public minifyPrompt(prompt: string, mode?: TokenCompressionMode): { minified: string; originalTokens: number; minifiedTokens: number; tokensSaved: number } {
    const activeMode = mode || this.config.compressionMode;
    const originalTokens = this.estimateTokens(prompt);

    if (activeMode === 'none') {
      return { minified: prompt, originalTokens, minifiedTokens: originalTokens, tokensSaved: 0 };
    }

    let minified = prompt;

    // 1. Remove superfluous markdown headers and filler greetings
    minified = minified.replace(/^(Please|Kindly|Could you please|I would like you to)\s+/gim, '');
    minified = minified.replace(/\n\s*\n\s*\n/g, '\n\n'); // collapse 3+ newlines to 2
    minified = minified.replace(/[ \t]+/g, ' '); // collapse double spaces

    if (activeMode === 'smart_minify' || activeMode === 'aggressive_cache') {
      // Clean up common filler words in instructions
      minified = minified.replace(/Ensure that you /gi, '');
      minified = minified.replace(/Make sure to /gi, '');
      minified = minified.replace(/It is critical that you /gi, '');
    }

    const minifiedTokens = this.estimateTokens(minified);
    const tokensSaved = Math.max(0, originalTokens - minifiedTokens);

    return {
      minified,
      originalTokens,
      minifiedTokens,
      tokensSaved
    };
  }

  private cleanupOldRpm() {
    const now = Date.now();
    this.rpmTimestamps = this.rpmTimestamps.filter(t => now - t < 60000);
    this.config.currentRpm = this.rpmTimestamps.length;
    
    // Check throttle status
    const usageRatio = this.config.currentTokensUsedToday / this.config.dailyTokenQuota;
    if (this.config.currentRpm >= this.config.rpmLimit - 2) {
      this.config.throttleStatus = 'throttled';
    } else if (usageRatio > 0.9) {
      this.config.throttleStatus = 'eco_mode';
    } else {
      this.config.throttleStatus = 'optimal';
    }
  }

  public canExecuteCloudRequest(estimatedPromptTokens: number = 500): { allowed: boolean; reason?: string; useFallback?: boolean } {
    this.cleanupOldRpm();

    // Check RPM
    if (this.config.currentRpm >= this.config.rpmLimit) {
      return {
        allowed: false,
        reason: `RPM limit reached (${this.config.currentRpm}/${this.config.rpmLimit} req/min). Auto-switching to zero-token offline mode to preserve free tier quota.`,
        useFallback: this.config.autoFallbackHeuristicOnLimit
      };
    }

    // Check Daily Quota
    const dailyQuota = this.config?.dailyTokenQuota ?? 1000000;
    if ((this.config?.currentTokensUsedToday ?? 0) + estimatedPromptTokens > dailyQuota) {
      return {
        allowed: false,
        reason: `Daily free token budget (${dailyQuota.toLocaleString()} tokens) limit reached. Auto-switching to zero-token offline heuristic engine.`,
        useFallback: this.config?.autoFallbackHeuristicOnLimit ?? true
      };
    }

    return { allowed: true };
  }

  public trackUsage(record: Omit<TokenUsageRecord, 'id' | 'timestamp' | 'estimatedCostUsd' | 'savingsUsd'>): TokenUsageRecord {
    const now = Date.now();
    this.rpmTimestamps.push(now);
    this.cleanupOldRpm();

    const savingsUsd = Number(((record.totalTokens + record.tokensSaved) * 0.000001 * 1.5).toFixed(5));

    const completeRecord: TokenUsageRecord = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      estimatedCostUsd: 0, // 100% Free via Google AI Studio Free Tier
      savingsUsd,
      ...record
    };

    this.records.unshift(completeRecord);
    if (this.records.length > 100) this.records.pop();

    this.config.currentTokensUsedToday += record.totalTokens;
    this.config.tokensSavedTotal += record.tokensSaved;
    this.config.requestsCountToday += 1;

    this.saveRecords();
    this.saveConfig();

    return completeRecord;
  }

  public resetDailyQuota() {
    this.config.currentTokensUsedToday = 0;
    this.config.requestsCountToday = 0;
    this.config.throttleStatus = 'optimal';
    this.rpmTimestamps = [];
    this.saveConfig();
  }
}

export const tokenManager = new TokenManagerService();
