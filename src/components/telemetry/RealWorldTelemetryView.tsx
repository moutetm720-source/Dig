import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles, 
  Search, 
  Coins, 
  Flame, 
  CheckCircle2, 
  Layers, 
  Sliders, 
  BarChart3,
  Calendar,
  Compass,
  Tag
} from 'lucide-react';
import { realWorldTelemetryService } from '../../services/realWorldTelemetryService';
import { store } from '../../services/store';
import { MacroEconomicsMetric, RealWorldTrendSignal, BusinessOptimizationRule } from '../../types';

export const RealWorldTelemetryView: React.FC = () => {
  const [state, setState] = useState(realWorldTelemetryService.getState());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = realWorldTelemetryService.subscribe(() => {
      setState(realWorldTelemetryService.getState());
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      realWorldTelemetryService.syncRealWorldDataNow();
      setIsSyncing(false);
      showToast('Télémesure du monde réel synchronisée avec succès (Devises, Google Trends, Fuseaux). 0,00 € Coût.');
    }, 600);
  };

  const filteredRules = selectedDomain === 'all'
    ? state.activeOptimizations
    : state.activeOptimizations.filter(r => r.domain === selectedDomain);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs hover:underline text-emerald-300">Fermer</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#13141C] to-slate-900 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                Agent 21 • Télémesure du Monde Réel & Macro-Optimiseur 24/24
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Coût d'Opération : 0,00 € Strict
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Parité Pouvoir d'Achat (PPP) & Google Trends
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Actualisation des Données du Réel & Optimisation Globale de l'Entreprise
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Cet agent écoute en continu les marchés mondiaux (taux de change EUR/USD/JPY/Crypto, tendances de recherche émergentes, fuseaux d'achat actifs) et réajuste automatiquement l'élasticité des prix, le SEO et les accroches marketing de votre boutique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation Macro...' : 'Synchroniser Monde Réel (0€)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Coût d'Opération Télémétrie</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">0,00 €</div>
          <div className="text-[11px] text-slate-400 mt-1">100% Scraping heuristique local & Gratuit</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Devises & Paires Crypto Actives</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{state.currencies.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">EUR, USD, GBP, JPY, BTC, SOL...</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Tendances Google Détectées</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-300">{state.trendSignals.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Requêtes à haute intention d'achat</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Règles d'Optimisation Appliquées</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-300">{state.activeOptimizations.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Prix, SEO, Heures d'envoi & Copy</div>
        </div>
      </div>

      {/* SECTION 1: MACRO CURRENCIES & PPP PRICING */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            Télémesure des Devises & Parité de Pouvoir d'Achat (PPP) en Direct
          </h3>
          <span className="text-xs text-slate-400">
            Dernière mise à jour : {new Date(state.lastSyncTimestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {state.currencies.map(curr => (
            <div key={curr.currency} className="bg-[#121318] border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="font-mono text-amber-400">{curr.symbol}</span>
                  <span>{curr.currency} / EUR</span>
                </span>
                <span className={`text-[10px] font-mono font-bold ${
                  curr.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {curr.change24hPercent >= 0 ? '+' : ''}{curr.change24hPercent}%
                </span>
              </div>

              <div className="text-lg font-bold font-mono text-white">
                {curr.rateToEur < 0.01 ? curr.rateToEur.toFixed(6) : curr.rateToEur.toFixed(2)}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Multiplicateur PPP :</span>
                <span className="text-indigo-300 font-bold font-mono">x{curr.purchasingPowerParityMultiplier}</span>
              </div>

              {curr.suggestedLocalPromoPercent > 0 && (
                <div className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 text-center font-semibold">
                  Remise locale auto : -{curr.suggestedLocalPromoPercent}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: GOOGLE SEARCH TRENDS & HIGH BUYING INTENT SIGNALS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Radar des Tendances Mondiales & Spikes de Demande Google Search
          </h3>
          <span className="text-xs text-slate-400">Écoute continue 24/24</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.trendSignals.map(trend => (
            <div key={trend.id} className="bg-[#121318] border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {trend.category}
                </span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  {trend.searchVolumeGrowth}
                </span>
              </div>

              <h4 className="text-xs font-bold text-white">"{trend.query}"</h4>
              <p className="text-[11px] text-slate-400">{trend.macroDriver}</p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Produit associé : <strong className="text-white">{trend.relatedProductNiche}</strong></span>
                <span className="text-amber-300 font-mono font-bold">Vélocité : {trend.velocityIndex}/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: CROSS-BUSINESS AUTONOMOUS OPTIMIZATIONS */}
      <div className="bg-[#121318] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-400" />
              Règles d'Auto-Optimisation Active sur la Société (24/24)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajustements déclenchés de manière autonome par l'Agent 21 sans nécessiter d'intervention humaine.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedDomain('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedDomain === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Tous ({state.activeOptimizations.length})
            </button>
            <button
              onClick={() => setSelectedDomain('dynamic_pricing')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedDomain === 'dynamic_pricing' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Prix
            </button>
            <button
              onClick={() => setSelectedDomain('seo_keywords')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedDomain === 'seo_keywords' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              SEO
            </button>
            <button
              onClick={() => setSelectedDomain('email_timing')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedDomain === 'email_timing' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Emails
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRules.map(rule => (
            <div key={rule.id} className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase">
                    {rule.domain.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-white">{rule.ruleName}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(rule.appliedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="text-[11px] text-slate-400">
                <strong className="text-slate-300">Déclencheur Réel :</strong> {rule.triggerSignal}
              </div>

              <div className="text-[11px] text-slate-300 bg-black/40 p-2 rounded border border-slate-800/80">
                <strong className="text-teal-400">Action Autonome Exécutée :</strong> {rule.autonomousActionTaken}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-emerald-400 font-semibold">Impact Mesuré : {rule.impactEstimated}</span>
                <span className="text-slate-500">Statut : Actif en Production</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
