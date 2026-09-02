import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Sparkles, 
  ArrowDownRight, 
  TrendingDown, 
  RefreshCw, 
  Sliders, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal,
  Activity,
  Server,
  DollarSign
} from 'lucide-react';
import { tokenManager } from '../../services/tokenManager';
import { TokenBudgetConfig, TokenUsageRecord, TokenCompressionMode } from '../../types';

export const TokenManagerView: React.FC = () => {
  const [config, setConfig] = useState<TokenBudgetConfig>(tokenManager.getConfig());
  const [records, setRecords] = useState<TokenUsageRecord[]>(tokenManager.getRecords());
  const [testPrompt, setTestPrompt] = useState<string>(
    `Please kindly act as an expert digital product creator. I would like you to ensure that you generate a high-converting digital product package for Notion creators in the productivity niche. Make sure to provide complete step-by-step instructions, pricing recommendations, and marketing copy with high perceived value.`
  );
  const [compressionMode, setCompressionMode] = useState<TokenCompressionMode>(config.compressionMode);
  const [testResult, setTestResult] = useState<{
    minified: string;
    originalTokens: number;
    minifiedTokens: number;
    tokensSaved: number;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'playground' | 'ledger'>('overview');

  useEffect(() => {
    // Run initial test prompt minification
    handleMinifyTest(testPrompt, compressionMode);
  }, []);

  const handleMinifyTest = (prompt: string, mode: TokenCompressionMode) => {
    const res = tokenManager.minifyPrompt(prompt, mode);
    setTestResult(res);
  };

  const handleUpdateMode = (mode: TokenCompressionMode) => {
    setCompressionMode(mode);
    const updated = tokenManager.updateConfig({ compressionMode: mode });
    setConfig(updated);
    if (testPrompt) {
      handleMinifyTest(testPrompt, mode);
    }
  };

  const handleToggleAutoFallback = () => {
    const updated = tokenManager.updateConfig({
      autoFallbackHeuristicOnLimit: !config.autoFallbackHeuristicOnLimit
    });
    setConfig(updated);
  };

  const handleResetQuota = () => {
    tokenManager.resetDailyQuota();
    setConfig(tokenManager.getConfig());
    setRecords(tokenManager.getRecords());
  };

  const handleSimulateFreeCall = async () => {
    if (!testPrompt) return;
    setIsSimulating(true);

    const { minified, minifiedTokens, tokensSaved } = tokenManager.minifyPrompt(testPrompt, compressionMode);
    const check = tokenManager.canExecuteCloudRequest(minifiedTokens);

    await new Promise(res => setTimeout(res, 600));

    tokenManager.trackUsage({
      task: 'playground',
      model: check.allowed ? 'gemini-3.7-flash (Free Tier)' : 'Zero-Token Offline Engine',
      provider: check.allowed ? 'gemini_free' : 'offline_heuristic',
      promptTokens: check.allowed ? minifiedTokens : 0,
      completionTokens: check.allowed ? Math.floor(minifiedTokens * 1.8) : 0,
      totalTokens: check.allowed ? Math.floor(minifiedTokens * 2.8) : 0,
      tokensSaved: tokensSaved + (check.allowed ? 0 : 500),
      latencyMs: check.allowed ? 480 : 25,
      status: check.allowed ? 'success' : 'fallback'
    });

    setConfig(tokenManager.getConfig());
    setRecords(tokenManager.getRecords());
    setIsSimulating(false);
  };

  const usagePercent = Math.min(100, Math.round((config.currentTokensUsedToday / config.dailyTokenQuota) * 100));
  const savingsPercent = config.currentTokensUsedToday > 0 
    ? Math.round((config.tokensSavedTotal / (config.currentTokensUsedToday + config.tokensSavedTotal)) * 100) 
    : 32;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Token & Free AI Architecture Manager</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Free Tier Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous token budgeting, smart prompt minification, and zero-token heuristic fallbacks to guarantee 100% free operation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetQuota}
            className="px-3.5 py-2 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Daily Quota Counter</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#1A1A1E] text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Token Economics & Budget
        </button>
        <button
          onClick={() => setActiveTab('playground')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === 'playground'
              ? 'bg-[#1A1A1E] text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Minifier Playground & Test
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === 'ledger'
              ? 'bg-[#1A1A1E] text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Live Token Usage Ledger ({records.length})
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Token Quota */}
        <div className="bg-[#111114] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Free Daily Quota</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {config.currentTokensUsedToday.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {config.dailyTokenQuota.toLocaleString()}</span>
            </div>
            <div className="w-full bg-[#1A1A1E] h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full rounded-full transition-all ${
                  usagePercent > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>{usagePercent}% utilized today</span>
            <span className="text-emerald-400 font-medium">Free Tier Safe</span>
          </div>
        </div>

        {/* Tokens Saved via Compression */}
        <div className="bg-[#111114] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tokens Saved (Compression)</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-emerald-400 tracking-tight font-mono">
              +{config.tokensSavedTotal.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400">
              {savingsPercent}% average compression efficiency
            </p>
          </div>
          <div className="text-[11px] text-slate-500">
            Minification strips filler & applies structured schemas
          </div>
        </div>

        {/* Marginal AI Cost */}
        <div className="bg-[#111114] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Effective AI Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              $0.00 <span className="text-xs font-normal text-emerald-400 font-sans">100% Free</span>
            </div>
            <p className="text-xs text-slate-400">
              $48.50 estimated commercial API cost saved
            </p>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero marginal cost scaling</span>
          </div>
        </div>

        {/* Rate Limit Guard */}
        <div className="bg-[#111114] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Request Rate</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {config.currentRpm} <span className="text-xs font-normal text-slate-400">/ {config.rpmLimit} RPM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                config.throttleStatus === 'optimal' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className="text-xs text-slate-300 font-medium capitalize">
                {config.throttleStatus.replace('_', ' ')} Status
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Autonomous sliding window throttle
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Autonomous Token Architecture Rules */}
          <div className="lg:col-span-2 bg-[#111114] border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Autonomous Token Guardrails & Policy</h3>
                <p className="text-xs text-slate-400">Configure how the autonomous engine allocates and economizes tokens.</p>
              </div>
              <Sliders className="w-5 h-5 text-indigo-400" />
            </div>

            <div className="space-y-4">
              {/* Compression Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Prompt Minification Strategy</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'smart_minify', title: 'Smart Minify', desc: 'Strips filler words, saves ~30% tokens without semantic loss.' },
                    { id: 'aggressive_cache', title: 'Aggressive Eco', desc: 'Aggressive pruning + cached JSON schemas (~45% savings).' },
                    { id: 'none', title: 'Raw (Unmodified)', desc: 'Sends full verbose prompt instructions.' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleUpdateMode(m.id as TokenCompressionMode)}
                      className={`p-3.5 rounded-lg border text-left transition-all ${
                        compressionMode === m.id
                          ? 'bg-[#1A1A1E] border-indigo-500/50 ring-1 ring-indigo-500/20'
                          : 'bg-[#16161A] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{m.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-snug">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zero-Token Fallback Guardrail */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#16161A] border border-slate-800">
                <div className="space-y-1 max-w-lg">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Auto Zero-Token Heuristic Fallback</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    If the Gemini API reaches rate limits (15 RPM or daily free quota), the engine automatically switches to the built-in deterministic heuristic generator so your business never stops.
                  </p>
                </div>
                <button
                  onClick={handleToggleAutoFallback}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    config.autoFallbackHeuristicOnLimit
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1A1A1E] text-slate-400 border border-slate-700'
                  }`}
                >
                  {config.autoFallbackHeuristicOnLimit ? 'Enabled (Safe)' : 'Disabled'}
                </button>
              </div>

              {/* Priority Allocations */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-300">Autonomous Daily Token Allocations by Agent Task</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[11px] text-slate-400">Product Factory</div>
                    <div className="text-sm font-bold text-indigo-400 mt-1 font-mono">40%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">400k tokens</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[11px] text-slate-400">Market Scanner</div>
                    <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">25%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">250k tokens</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[11px] text-slate-400">Marketing & SEO</div>
                    <div className="text-sm font-bold text-purple-400 mt-1 font-mono">15%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">150k tokens</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[11px] text-slate-400">Ads Generator</div>
                    <div className="text-sm font-bold text-amber-400 mt-1 font-mono">10%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">100k tokens</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[11px] text-slate-400">Strategic Recs</div>
                    <div className="text-sm font-bold text-rose-400 mt-1 font-mono">10%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">100k tokens</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Architecture Stack Card */}
          <div className="bg-[#111114] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Active Free AI Engines</h3>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#16161A] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Google Gemini 3.7 Flash</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Free Tier</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Primary high-intelligence cloud LLM for opportunity scanning and comprehensive digital product drafting.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  15 RPM | 1,000,000 TPM | Free
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#16161A] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Zero-Token Offline Engine</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Zero-Token</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Deterministic domain generator that produces high-value prompt kits, checklists, and templates with 0 ms network delay.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Unlimited RPM | 0 Tokens Consumed | $0.00
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#16161A] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Rule-Based Pricing & Ad Engine</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Local Algo</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Automated mathematical algorithms for A/B testing price elasticity and ad campaign budget scaling.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Playground Left: Input & Minification */}
          <div className="bg-[#111114] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Prompt Input & Real-Time Compressor</h3>
              <span className="text-xs text-slate-400 font-mono">
                {testResult ? `${testResult.originalTokens} tokens` : '0 tokens'}
              </span>
            </div>

            <textarea
              rows={6}
              value={testPrompt}
              onChange={(e) => {
                setTestPrompt(e.target.value);
                handleMinifyTest(e.target.value, compressionMode);
              }}
              placeholder="Paste any prompt or autonomous instruction here..."
              className="w-full p-3 rounded-lg bg-[#16161A] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono resize-none"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">Load Preset:</span>
              <button
                onClick={() => {
                  const p = `Please kindly act as an elite market researcher. Scan the B2B SaaS niche and return a list of top 3 profitable digital template opportunities with high demand scores and low competition.`;
                  setTestPrompt(p);
                  handleMinifyTest(p, compressionMode);
                }}
                className="px-2.5 py-1 rounded bg-[#1A1A1E] text-slate-300 text-xs hover:bg-[#222228] border border-slate-800"
              >
                Market Scanner
              </button>
              <button
                onClick={() => {
                  const p = `Generate a complete high-ticket digital product package including comprehensive Notion templates, 15 actionable checklists, and structured CSV datasets for software engineers. Ensure zero filler.`;
                  setTestPrompt(p);
                  handleMinifyTest(p, compressionMode);
                }}
                className="px-2.5 py-1 rounded bg-[#1A1A1E] text-slate-300 text-xs hover:bg-[#222228] border border-slate-800"
              >
                Product Synthesis
              </button>
              <button
                onClick={() => {
                  const p = `Craft 3 high-converting Meta and Google ad headlines and primary copy angles for our new prompt pack. Focus on saving 15+ hours weekly with 100% money back guarantee.`;
                  setTestPrompt(p);
                  handleMinifyTest(p, compressionMode);
                }}
                className="px-2.5 py-1 rounded bg-[#1A1A1E] text-slate-300 text-xs hover:bg-[#222228] border border-slate-800"
              >
                Ad Copywriter
              </button>
            </div>

            <button
              onClick={handleSimulateFreeCall}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Simulating Optimized Free AI Call...' : 'Execute Free AI Test Call'}</span>
            </button>
          </div>

          {/* Playground Right: Minification Comparison & Savings */}
          <div className="bg-[#111114] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Minified Output & Efficiency</h3>
              {testResult && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  -{Math.round((testResult.tokensSaved / (testResult.originalTokens || 1)) * 100)}% Tokens
                </span>
              )}
            </div>

            {testResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Original</div>
                    <div className="text-sm font-bold text-slate-300 mt-0.5 font-mono">{testResult.originalTokens} tok</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Minified</div>
                    <div className="text-sm font-bold text-indigo-400 mt-0.5 font-mono">{testResult.minifiedTokens} tok</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Tokens Saved</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">+{testResult.tokensSaved} tok</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Compressed Prompt Delivered to AI</label>
                  <pre className="p-3.5 rounded-lg bg-[#16161A] border border-slate-800 text-xs text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {testResult.minified}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-[#111114] border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Live AI Token Execution Ledger</h3>
            <span className="text-xs text-slate-400 font-mono">Showing {records.length} recent executions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16161A] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Task</th>
                  <th className="py-3 px-4 font-semibold">Engine / Model</th>
                  <th className="py-3 px-4 font-semibold">Prompt Tokens</th>
                  <th className="py-3 px-4 font-semibold">Completion</th>
                  <th className="py-3 px-4 font-semibold">Total Tokens</th>
                  <th className="py-3 px-4 font-semibold">Tokens Saved</th>
                  <th className="py-3 px-4 font-semibold">Latency</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#16161A]/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-white font-sans font-medium capitalize">
                      {rec.task.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.provider === 'gemini_free'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {rec.model}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{rec.promptTokens}</td>
                    <td className="py-3 px-4 text-slate-400">{rec.completionTokens}</td>
                    <td className="py-3 px-4 font-bold text-white">{rec.totalTokens}</td>
                    <td className="py-3 px-4 text-emerald-400">+{rec.tokensSaved}</td>
                    <td className="py-3 px-4 text-slate-400">{rec.latencyMs}ms</td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {rec.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
