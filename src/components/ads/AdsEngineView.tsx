import React, { useState } from 'react';
import { Megaphone, Plus, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Play, Pause, RefreshCw, Zap } from 'lucide-react';
import { store } from '../../services/store';
import { generateAdCampaign } from '../../services/geminiService';
import { AdCampaign, DigitalProduct } from '../../types';

export const AdsEngineView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(store.getAdCampaigns());
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [rulesFeedback, setRulesFeedback] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newProductId, setNewProductId] = useState<string>(products[0]?.id || '');
  const [newPlatform, setNewPlatform] = useState<'meta' | 'google' | 'tiktok'>('meta');
  const [newAngle, setNewAngle] = useState('Direct ROI & Time Savings');
  const [newHeadline, setNewHeadline] = useState('');
  const [newPrimaryText, setNewPrimaryText] = useState('');
  const [newBudget, setNewBudget] = useState<number>(30);

  const handleAiAutoGenerate = async () => {
    const prod = products.find(p => p.id === newProductId) || products[0];
    if (!prod) return;
    setIsAiGenerating(true);
    try {
      const generated = await generateAdCampaign(prod, newPlatform);
      if (generated.headline) setNewHeadline(generated.headline);
      if (generated.primaryText) setNewPrimaryText(generated.primaryText);
      if (generated.angle) setNewAngle(generated.angle);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      const actions = store.runAdOptimizationRules();
      setCampaigns(store.getAdCampaigns());
      setRulesFeedback(actions.length > 0 ? actions : ['All campaigns evaluated. No budget adjustments needed at this moment.']);
      setIsOptimizing(false);
    }, 600);
  };

  const handleToggleStatus = (camp: AdCampaign) => {
    const nextStatus = camp.status === 'active' ? 'paused' : 'active';
    store.updateAdCampaign(camp.id, { status: nextStatus });
    setCampaigns(store.getAdCampaigns());
  };

  const handleCreateCampaign = () => {
    const prod = products.find(p => p.id === newProductId);
    if (!prod) return;

    store.addAdCampaign({
      productId: prod.id,
      productTitle: prod.title,
      platform: newPlatform,
      campaignName: `${newPlatform.toUpperCase()} - ${prod.title.slice(0, 25)} - Scaled`,
      angle: newAngle,
      headline: newHeadline || `The #1 ${prod.format.replace('_', ' ')} for ${prod.category}`,
      primaryText: newPrimaryText || `Save 15+ hours this week with ${prod.title}. Instant download, 30-day money-back guarantee.`,
      description: `Trusted by 1,200+ verified buyers.`,
      cta: 'Download Now',
      creativeConcept: 'High contrast visual showing real before vs after workflow performance.',
      dailyBudget: newBudget,
      status: 'active',
      metrics: {
        impressions: 1200,
        cpm: 12.0,
        cpc: 0.6,
        ctr: 2.0,
        spend: 24.0,
        conversions: 4,
        cpa: 6.0,
        roas: 4.8,
        revenue: 148.0
      },
      rulesTriggered: ['Automated scaling rule active']
    });

    setCampaigns(store.getAdCampaigns());
    setShowCreateModal(false);
    setNewHeadline('');
    setNewPrimaryText('');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Ads Engine & Autonomous Rules</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Meta • Google • TikTok
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated creative variations, multi-channel performance tracking, and rule-based budget auto-scaling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunOptimizer}
            disabled={isOptimizing}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>Run Auto-Rule Audit</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Campaign</span>
          </button>
        </div>
      </div>

      {/* Rules feedback notification if run */}
      {rulesFeedback.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl space-y-1 text-xs">
          <div className="font-bold text-indigo-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Rule Engine Execution Summary:</span>
          </div>
          {rulesFeedback.map((r, i) => (
            <div key={i} className="text-slate-300 pl-6">• {r}</div>
          ))}
        </div>
      )}

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map(camp => (
          <div
            key={camp.id}
            className="bg-[#111114] border border-slate-800 rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#1A1A1E] text-indigo-300 border border-slate-800 uppercase">
                  {camp.platform} Ads
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    camp.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#1A1A1E] text-slate-400'
                  }`}>
                    {camp.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(camp)}
                    className="p-1 rounded bg-[#1A1A1E] hover:bg-slate-800 text-slate-300 border border-slate-800"
                    title={camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                  >
                    {camp.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{camp.campaignName}</h3>
              <div className="text-xs text-indigo-400 mb-3 font-medium">Angle: {camp.angle}</div>

              {/* Ad Creative Snippet */}
              <div className="bg-[#16161A] p-3.5 rounded-lg border border-slate-800/80 text-xs space-y-2 mb-4">
                <div className="font-bold text-slate-200">{camp.headline}</div>
                <p className="text-slate-400 line-clamp-2">{camp.primaryText}</p>
                <div className="text-[10px] text-slate-500 font-mono">Concept: {camp.creativeConcept}</div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs bg-[#16161A] p-3 rounded-lg border border-slate-800/60 mb-4">
                <div>
                  <div className="text-[10px] text-slate-500">Spend</div>
                  <div className="font-bold text-slate-200 mt-0.5">€{camp.metrics.spend.toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">CPA</div>
                  <div className="font-bold text-slate-200 mt-0.5">€{camp.metrics.cpa.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-indigo-400">ROAS</div>
                  <div className="font-extrabold text-indigo-400 mt-0.5">{camp.metrics.roas}x</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400">Revenue</div>
                  <div className="font-extrabold text-emerald-400 mt-0.5">€{camp.metrics.revenue.toFixed(0)}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Budget: <strong className="text-white">€{camp.dailyBudget}/day</strong></span>
              <span className="text-[11px] text-slate-500">{camp.metrics.conversions} conversions</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Ad Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Ad Campaign</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Product</label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Advertising Platform</label>
              <select
                value={newPlatform}
                onChange={e => setNewPlatform(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="meta">Meta Ads (Instagram & Facebook)</option>
                <option value="google">Google Search & Performance Max</option>
                <option value="tiktok">TikTok Ads</option>
              </select>
            </div>

            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] text-slate-400">Generate creative angles?</span>
              <button
                onClick={handleAiAutoGenerate}
                disabled={isAiGenerating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiGenerating ? 'Synthesizing with Free AI...' : 'Auto-Generate Ad Copy'}</span>
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Ad Headline</label>
              <input
                type="text"
                value={newHeadline}
                onChange={e => setNewHeadline(e.target.value)}
                placeholder="e.g. Save 15+ Hours Weekly With Our Master Toolkit"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Primary Text</label>
              <textarea
                rows={3}
                value={newPrimaryText}
                onChange={e => setNewPrimaryText(e.target.value)}
                placeholder="e.g. Stop wasting hours on manual tasks. Get 100+ proven templates and systems..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Angle / Positioning</label>
              <input
                type="text"
                value={newAngle}
                onChange={e => setNewAngle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Daily Budget (€)</label>
              <input
                type="number"
                value={newBudget}
                onChange={e => setNewBudget(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Deploy Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
