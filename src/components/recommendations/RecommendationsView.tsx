import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Globe, 
  Layers, 
  DollarSign, 
  Target,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';
import { store } from '../../services/store';
import { 
  strategicAdvisorAgent, 
  StrategicAdvisorState, 
  StrategicCategory 
} from '../../services/strategicAdvisorAgent';
import { Recommendation } from '../../types';

interface RecommendationsViewProps {
  setCurrentView: (view: string) => void;
}

const CATEGORY_TABS: Array<{ id: StrategicCategory; label: string; icon: any }> = [
  { id: 'all', label: 'Toutes les Recommandations', icon: Sparkles },
  { id: 'revenue_growth', label: 'Croissance & Revenus', icon: TrendingUp },
  { id: 'pricing_margins', label: 'Tarification & Marges', icon: DollarSign },
  { id: 'bundles_upsell', label: 'Packs & Bundles', icon: Layers },
  { id: 'international_i18n', label: 'International FR/EN/ES/DE', icon: Globe },
  { id: 'traffic_seo', label: 'Trafic & Acquisition 0€', icon: Target }
];

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ setCurrentView }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(store.getRecommendations());
  const [agentState, setAgentState] = useState<StrategicAdvisorState>(strategicAdvisorAgent.getState());
  const [activeCategory, setActiveCategory] = useState<StrategicCategory>('all');
  const [isRefreshingManual, setIsRefreshingManual] = useState(false);

  useEffect(() => {
    const unsubAdvisor = strategicAdvisorAgent.subscribe(() => {
      setAgentState(strategicAdvisorAgent.getState());
      setRecommendations(store.getRecommendations());
    });

    const unsubStore = store.subscribe(() => {
      setRecommendations(store.getRecommendations());
    });

    return () => {
      unsubAdvisor();
      unsubStore();
    };
  }, []);

  const handleApply = (id: string) => {
    strategicAdvisorAgent.applyRecommendation(id);
    setRecommendations(store.getRecommendations());
  };

  const handleDismiss = (id: string) => {
    strategicAdvisorAgent.dismissRecommendation(id);
    setRecommendations(store.getRecommendations());
  };

  const handleManualRefresh = async () => {
    setIsRefreshingManual(true);
    try {
      await strategicAdvisorAgent.evaluateAndRefreshRecommendations(true);
      setRecommendations(store.getRecommendations());
    } finally {
      setIsRefreshingManual(false);
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'bundles_upsell') return rec.actionType === 'create_bundle' || rec.category === 'bundles_upsell';
    if (activeCategory === 'pricing_margins') return rec.actionType === 'price_optimization' || rec.category === 'pricing_margins';
    if (activeCategory === 'international_i18n') return rec.actionType === 'localize_catalog' || rec.category === 'international_i18n';
    if (activeCategory === 'traffic_seo') return rec.actionType === 'deploy_seeding' || rec.actionType === 'scale_campaign' || rec.category === 'traffic_seo';
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      
      {/* Top Header & Strategy Control Deck */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Agent IA de Recommandation Stratégique
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En Ligne (Heuristique 24/24)</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Synthèse prédictive continue : anomalies de conversion, élasticité des prix, opportunités de bundles et expansion multi-langues.
              </p>
            </div>
          </div>
        </div>

        {/* Live Auto-Refresh Controller Card */}
        <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto relative z-10 shrink-0">
          {/* Live countdown badge */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Actualisation Automatique :</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm font-bold ${agentState.isAutoRefreshActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {agentState.isAutoRefreshActive 
                  ? `Dans ${agentState.nextEvaluationInSec}s` 
                  : 'En pause'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                (Cycle : {agentState.autoRefreshIntervalSec}s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0 sm:border-l sm:border-slate-800 sm:pl-4">
            {/* Toggle Pause / Resume */}
            <button
              onClick={() => strategicAdvisorAgent.setAutoRefreshActive(!agentState.isAutoRefreshActive)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                agentState.isAutoRefreshActive
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-400'
                  : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
              }`}
              title={agentState.isAutoRefreshActive ? 'Suspendre l\'actualisation automatique' : 'Reprendre l\'actualisation automatique'}
            >
              {agentState.isAutoRefreshActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Interval selector */}
            <select
              value={agentState.autoRefreshIntervalSec}
              onChange={(e) => strategicAdvisorAgent.setAutoRefreshInterval(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value={30}>30s</option>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
            </select>

            {/* Instant Manual Refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshingManual || agentState.isEvaluating}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingManual || agentState.isEvaluating ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strategy Synthesis Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Potentiel Mensuel Identifié</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            +€{agentState.totalEstimatedMonthlyGain.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Marge brute additionnelle estimée</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Score de Santé Stratégique</div>
          <div className="text-2xl font-extrabold text-indigo-400 font-mono">
            {agentState.overallStrategyHealthScore}/100
          </div>
          <div className="text-[11px] text-slate-500">Alignement offre & vélocité de vente</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions Appliquées</div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {agentState.appliedRecommendationsCount}
          </div>
          <div className="text-[11px] text-slate-500">Directives exécutées en production</div>
        </div>

        {/* High Confidence Auto-Pilot Toggle */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Auto-Exécution Haute Confiance</div>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold">Seuil ≥ 92%</span>
            <button
              onClick={() => strategicAdvisorAgent.setAutoApplyHighConfidence(!agentState.autoApplyHighConfidence)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                agentState.autoApplyHighConfidence
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {agentState.autoApplyHighConfidence ? 'ACTIF (Auto)' : 'Manuel'}
            </button>
          </div>
        </div>
      </div>

      {/* Strategic Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {CATEGORY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Toutes les opportunités de cette catégorie sont optimisées !</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              L'agent IA analyse le marché en continu. De nouvelles recommandations apparaîtront dès qu'un signal d'optimisation sera détecté.
            </p>
          </div>
        ) : (
          filteredRecommendations.map(rec => (
            <div
              key={rec.id}
              className={`bg-slate-900 border rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all hover:border-slate-700 ${
                rec.status === 'executed' 
                  ? 'border-emerald-500/20 bg-slate-900/40 opacity-75' 
                  : 'border-slate-800'
              }`}
            >
              <div className="space-y-2.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wide">
                    {rec.actionType.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {rec.potentialImpact}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <span>Indice de Confiance :</span>
                    <strong className="text-white bg-slate-800 px-1.5 py-0.2 rounded">{rec.confidenceScore}%</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">{rec.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{rec.justification}</p>

                {/* Concrete Data Points */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {rec.dataPoints.map((dp, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 text-[11px] border border-slate-800 flex items-center gap-1.5 font-mono">
                      <span className="text-indigo-400">📊</span>
                      <span>{dp}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 pt-2 lg:pt-0 w-full lg:w-auto flex items-center justify-end gap-3">
                {rec.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                    >
                      Ignorer
                    </button>
                    <button
                      onClick={() => handleApply(rec.id)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <span>{rec.proposedAction}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>EXÉCUTÉ EN PRODUCTION</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
