import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  Sliders, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { store } from '../../services/store';
import { Opportunity, OpportunityWeights, ProductFormat } from '../../types';
import { generateAIOpportunities } from '../../services/geminiService';

interface OpportunityEngineViewProps {
  setCurrentView: (view: string) => void;
}

export const OpportunityEngineView: React.FC<OpportunityEngineViewProps> = ({ setCurrentView }) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => store.getOpportunities());
  const [weights, setWeights] = useState<OpportunityWeights>(() => store.getOpportunityWeights());
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSendingToFactoryId, setIsSendingToFactoryId] = useState<string | null>(null);
  const [scanNiche, setScanNiche] = useState('AI Agents & Prompt Engineering');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setOpportunities(store.getOpportunities());
      setWeights(store.getOpportunityWeights());
    });
  }, []);

  const handleWeightChange = (key: keyof OpportunityWeights, val: number) => {
    const newWeights = { ...weights, [key]: val / 100 };
    setWeights(newWeights);
  };

  const handleSaveWeights = () => {
    store.setOpportunityWeights(weights);
    setOpportunities(store.getOpportunities());
    setShowWeightsModal(false);
  };

  const handleScanOpportunities = async () => {
    if (!scanNiche.trim()) return;
    setIsScanning(true);
    try {
      const generated = await generateAIOpportunities(scanNiche, 3);
      for (const opp of generated) {
        if (opp.title) {
          store.addOpportunity({
            title: opp.title,
            niche: opp.niche || scanNiche,
            category: opp.category || 'AI & Productivity',
            targetAudience: opp.targetAudience || 'Indie creators & founders',
            problemStatement: opp.problemStatement || 'Struggling with manual friction and lack of structured systems.',
            suggestedFormat: (opp.suggestedFormat as ProductFormat) || 'template',
            demandScore: opp.demandScore || 92,
            competitionScore: opp.competitionScore || 40,
            monetizationScore: opp.monetizationScore || 90,
            trendScore: opp.trendScore || 94,
            productionDifficulty: opp.productionDifficulty || 22,
            estimatedMargin: opp.estimatedMargin || 97,
            estimatedConversionPotential: opp.estimatedConversionPotential || 5.0,
            estimatedRevenuePotential: opp.estimatedRevenuePotential || 5800,
            signals: opp.signals || [
              { source: 'google_trends', query: `${scanNiche.toLowerCase()} templates`, volume: '24,000/mo', growthRate: '+190%', intent: 'transactional' }
            ],
            status: 'discovered'
          });
        }
      }
      setOpportunities(store.getOpportunities());
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendToFactory = async (opp: Opportunity) => {
    setIsSendingToFactoryId(opp.id);
    try {
      await store.createProductFromOpportunity(opp.id, opp.suggestedFormat);
      setOpportunities(store.getOpportunities());
      setCurrentView('products');
    } catch (e) {
      console.error('Failed to create product from opportunity', e);
    } finally {
      setIsSendingToFactoryId(null);
    }
  };

  const filteredOpps = opportunities.filter(opp => {
    if (selectedFormat !== 'all' && opp.suggestedFormat !== selectedFormat) return false;
    if (selectedCategory !== 'all' && opp.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return opp.title.toLowerCase().includes(q) || opp.niche.toLowerCase().includes(q) || opp.problemStatement.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Opportunity Discovery Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {opportunities.length} Signals Indexed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detecting market demand, query surges, search intent, and commercial monetization gaps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWeightsModal(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Config Formula ({Math.round(weights.demand * 100)}% Demand)</span>
          </button>
        </div>
      </div>

      {/* Live Scanner Bar */}
      <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Market Scanner & Signal Analyzer</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={scanNiche}
              onChange={e => setScanNiche(e.target.value)}
              placeholder="Enter niche or market keyword (e.g. Solopreneur CRM, AI Claude Prompts, Freelance Contracts)..."
              className="w-full bg-[#1A1A1E] border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={handleScanOpportunities}
            disabled={isScanning}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Feeds...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Scan Market Opportunities</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111114] p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword..."
              className="w-full bg-[#1A1A1E] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedFormat}
            onChange={e => setSelectedFormat(e.target.value)}
            className="bg-[#1A1A1E] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Formats</option>
            <option value="template">Templates</option>
            <option value="prompt_pack">Prompt Packs</option>
            <option value="checklist">Checklists</option>
            <option value="guide">Guides</option>
            <option value="pro_kit">Pro Kits</option>
            <option value="preset">Presets</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-semibold">{filteredOpps.length}</span> opportunities
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOpps.map(opp => (
          <div
            key={opp.id}
            className="bg-[#111114] border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              {/* Header tags */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1A1A1E] text-indigo-300 border border-slate-800 uppercase tracking-wider">
                  {opp.suggestedFormat.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Score</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                    opp.overallScore >= 90
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : opp.overallScore >= 80
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {opp.overallScore}/100
                  </span>
                </div>
              </div>

              {/* Title & Niche */}
              <h3 className="font-bold text-white text-base leading-snug mb-1">
                {opp.title}
              </h3>
              <div className="text-xs text-indigo-400 font-medium mb-3">
                Niche: {opp.niche}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {opp.problemStatement}
              </p>

              {/* Scores breakdown mini grid */}
              <div className="grid grid-cols-3 gap-2 bg-[#16161A] p-3 rounded-lg border border-slate-800/80 mb-4 text-center text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">Demand</div>
                  <div className="font-bold text-slate-200 mt-0.5">{opp.demandScore}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Trend</div>
                  <div className="font-bold text-indigo-400 mt-0.5">{opp.trendScore}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Monetization</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{opp.monetizationScore}</div>
                </div>
              </div>

              {/* Signal Highlights */}
              <div className="space-y-1.5 mb-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Top Signals</div>
                {opp.signals.slice(0, 2).map((sig, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-400 bg-[#16161A] px-2.5 py-1.5 rounded border border-slate-800/50">
                    <span className="truncate max-w-[180px]">🔍 {sig.query}</span>
                    <span className="text-emerald-400 font-medium shrink-0">{sig.growthRate}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-500">Est. MRR: </span>
                <strong className="text-slate-200">€{opp.estimatedRevenuePotential.toLocaleString()}</strong>
              </div>

              {opp.status === 'completed' || opp.status === 'productized' ? (
                <button
                  onClick={() => setCurrentView('products')}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A1E] text-slate-300 text-xs font-semibold flex items-center gap-1 hover:text-white border border-slate-800 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>In Catalog</span>
                </button>
              ) : (
                <button
                  disabled={isSendingToFactoryId === opp.id}
                  onClick={() => handleSendToFactory(opp)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {isSendingToFactoryId === opp.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Send to Factory</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weights Customizer Modal */}
      {showWeightsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Config Opportunity Scoring Weights</h3>
                <p className="text-xs text-slate-400">Total weight must equal 100%. Adjust formula priority.</p>
              </div>
              <button onClick={() => setShowWeightsModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Market Demand Weight</span>
                  <span className="text-indigo-400 font-bold">{Math.round(weights.demand * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.demand * 100}
                  onChange={e => handleWeightChange('demand', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Trend Growth Surge Weight</span>
                  <span className="text-indigo-400 font-bold">{Math.round(weights.trend * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.trend * 100}
                  onChange={e => handleWeightChange('trend', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Monetization & Willingness to Pay</span>
                  <span className="text-indigo-400 font-bold">{Math.round(weights.monetization * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.monetization * 100}
                  onChange={e => handleWeightChange('monetization', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Low Competition Advantage</span>
                  <span className="text-indigo-400 font-bold">{Math.round(weights.competition * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.competition * 100}
                  onChange={e => handleWeightChange('competition', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Production Simplicity & Speed</span>
                  <span className="text-indigo-400 font-bold">{Math.round(weights.production * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.production * 100}
                  onChange={e => handleWeightChange('production', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowWeightsModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWeights}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Save & Recalculate Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
