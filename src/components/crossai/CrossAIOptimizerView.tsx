import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Cpu, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  Sliders, 
  Code2, 
  ArrowRight,
  Database,
  Layers,
  Award,
  HelpCircle,
  Flame,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { crossAIOptimizerService } from '../../services/crossAIOptimizerService';
import { store } from '../../services/store';
import { ModelBenchmarkInsight, AgentPromptRefinement, AIEcosystemProvider } from '../../types';

export const CrossAIOptimizerView: React.FC = () => {
  const [state, setState] = useState(crossAIOptimizerService.getState());
  const [isScanning, setIsScanning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIEcosystemProvider | 'all'>('all');
  const [selectedRefinement, setSelectedRefinement] = useState<AgentPromptRefinement | null>(
    state.refinements.length > 0 ? state.refinements[0] : null
  );
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = crossAIOptimizerService.subscribe(() => {
      const newState = crossAIOptimizerService.getState();
      setState(newState);
      if (!selectedRefinement && newState.refinements.length > 0) {
        setSelectedRefinement(newState.refinements[0]);
      }
    });
    return unsub;
  }, [selectedRefinement]);

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      await crossAIOptimizerService.runCrossAIScanAndRefine();
      setSuccessToast('Scan d\'intelligence croisée terminé : Nouvelles techniques injectées à 0,00 €.');
      setTimeout(() => setSuccessToast(null), 4000);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePurgeFictitiousSales = () => {
    if (window.confirm('Confirmez-vous la purge totale des données fictives ? Le tableau de bord affichera 0,00 € vérifié en direct.')) {
      store.purgeFictitiousSales();
      setSuccessToast('Ventes fictives purgées : Votre base est désormais réinitialisée à 0,00 € vérifié.');
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleApplyRefinement = (refId: string) => {
    crossAIOptimizerService.applyRefinementToSystemPrompt(refId);
    setSuccessToast('Amélioration appliquée avec succès au bot correspondant.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const filteredInsights = selectedProvider === 'all' 
    ? state.insights 
    : state.insights.filter(i => i.sourceEcosystem === selectedProvider);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-xs hover:underline text-emerald-300">Fermer</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#13141C] to-slate-900 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                Agent 18 • Méta-Optimiseur Cross-IA
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% Gratuit • Zéro Token Payant
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Auto-Amélioration Continue
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Méta-Intelligence Cross-IA & Optimisation Autonome des 17 Bots
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Cet agent analyse en permanence les avancées des meilleurs modèles ouverts et propriétaires (DeepSeek-R1, Claude 3.7 Thinking, Mistral, Qwen, Llama, OpenAI) pour condenser les prompts, booster le taux de conversion et supprimer tout coût d'API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handlePurgeFictitiousSales}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors flex items-center gap-2"
              title="Réinitialise le compteur de ventes à 0,00 € réel"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Purger Ventes Fictives (0€)</span>
            </button>

            <button
              onClick={handleScanNow}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scan & Optimisation...' : 'Lancer Scan Cross-IA'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Coût Opérationnel IA</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">0,00 €</div>
          <div className="text-[11px] text-slate-400 mt-1">100% Free tier + Moteur local</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Compression des Prompts</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">-{state.blendedTokenCompressionRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Tokens éliminés sans perte de qualité</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Économies Évitées Estimées</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300">~{state.monthlyCostAvoidedEur} €/mois</div>
          <div className="text-[11px] text-slate-400 mt-1">Par rapport aux APIs LLM payantes</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Techniques Cross-IA Actives</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{state.totalTechniquesScanned}</div>
          <div className="text-[11px] text-slate-400 mt-1">Sur 7 écosystèmes majeurs</div>
        </div>
      </div>

      {/* Ecosystem Watchlist Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Écosystèmes d'IA Surveillés & Extraits en Continu
          </h2>
          <span className="text-xs text-slate-400">Dernier scan : {state.lastScanTimestamp ? new Date(state.lastScanTimestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {state.ecosystemsTracked.map(eco => (
            <div 
              key={eco.provider}
              className={`p-3.5 rounded-xl border transition-all ${
                selectedProvider === eco.provider 
                  ? 'bg-indigo-950/20 border-indigo-500/50' 
                  : 'bg-[#121318] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white truncate">{eco.name.split('(')[0]}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {eco.zeroCostScore}% Gratuit
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5 h-8">
                {eco.lastInsight}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                <span>{eco.techniquesExtracted} techniques extraites</span>
                <button
                  onClick={() => setSelectedProvider(selectedProvider === eco.provider ? 'all' : eco.provider)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {selectedProvider === eco.provider ? 'Voir tout' : 'Filtrer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Interactive Work Area: Prompt Comparator & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applied Refinements & Before/After Sandbox */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Comparateur & Sandbox d'Optimisation des Prompts</h3>
              </div>
              {selectedRefinement && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  -{selectedRefinement.tokenSavingsPercent}% Tokens
                </span>
              )}
            </div>

            {selectedRefinement ? (
              <div className="space-y-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs font-semibold text-indigo-300 mb-1">
                    Cible : {selectedRefinement.agentName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-300">Inspiration :</strong> {selectedRefinement.inspirationSource}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    <strong className="text-slate-300">Mécanisme :</strong> {selectedRefinement.enhancementDetails}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Before */}
                  <div className="border border-rose-900/40 bg-rose-950/10 rounded-lg p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 mb-1.5">
                      <span>AVANT (Prompt Brut / Verbeux)</span>
                      <span>~{selectedRefinement.originalTokensEstimated} tokens</span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed h-32 overflow-y-auto bg-black/30 p-2 rounded custom-scrollbar">
                      {selectedRefinement.beforeSnippet}
                    </pre>
                  </div>

                  {/* After */}
                  <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-lg p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-1.5">
                      <span>APRÈS (Cross-IA Optimisé 0€)</span>
                      <span>~{selectedRefinement.optimizedTokensEstimated} tokens</span>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed h-32 overflow-y-auto bg-black/30 p-2 rounded custom-scrollbar">
                      {selectedRefinement.afterSnippet}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    Appliqué le : {selectedRefinement.appliedAt ? new Date(selectedRefinement.appliedAt).toLocaleDateString() : 'Aujourd\'hui'} • Zéro surcoût
                  </span>
                  <button
                    onClick={() => handleApplyRefinement(selectedRefinement.id)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Appliquer au Bot Actif</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Sélectionnez un prompt ci-dessous pour inspecter les optimisations.
              </div>
            )}
          </div>

          {/* List of Refinements */}
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">
              Historique des Améliorations Systèmes Injectées ({state.refinements.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {state.refinements.map(ref => (
                <div
                  key={ref.id}
                  onClick={() => setSelectedRefinement(ref)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    selectedRefinement?.id === ref.id
                      ? 'bg-indigo-950/30 border-indigo-500/50'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-200 truncate">{ref.agentName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{ref.inspirationSource}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      -{ref.tokenSavingsPercent}% Tokens
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Model Insights Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Découvertes & Heuristiques Cross-IA ({filteredInsights.length})
              </h3>
              {selectedProvider !== 'all' && (
                <button 
                  onClick={() => setSelectedProvider('all')}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Voir tout
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {filteredInsights.map(insight => (
                <div key={insight.id} className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {insight.modelName}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-emerald-400" />
                      +{insight.conversionBoostRate}% Vente
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white">{insight.techniqueTitle}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {insight.keyMechanism}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Gain : -{insight.tokenSavingsRate}% tokens</span>
                    <span className="text-emerald-400 font-medium">0,00 € Coût</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
