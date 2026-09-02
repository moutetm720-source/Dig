import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Lock, 
  Unlock, 
  TrendingUp, 
  Zap, 
  ShieldAlert, 
  DollarSign, 
  CheckCircle2, 
  Play, 
  Pause, 
  Sparkles, 
  Layers,
  Sliders,
  Plus
} from 'lucide-react';
import { adBudgetAgentService } from '../../services/adBudgetAgentService';
import { store } from '../../services/store';
import { AdCampaign, AdAgentConfig, AdPlatform } from '../../types';

export const AdBudgetAgentView: React.FC = () => {
  const [config, setConfig] = useState<AdAgentConfig>(adBudgetAgentService.getConfig());
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(adBudgetAgentService.getCampaigns());
  const [progress, setProgress] = useState(adBudgetAgentService.getUnlockProgress());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationToast, setOptimizationToast] = useState<string | null>(null);

  // New campaign modal state
  const [isNewCampModalOpen, setIsNewCampModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<AdPlatform>('meta');
  const [selectedDailyBudget, setSelectedDailyBudget] = useState<number>(75);

  const publishedProducts = store.getProducts().filter(p => p.status === 'published');

  useEffect(() => {
    const unsub = adBudgetAgentService.subscribe(() => {
      setConfig(adBudgetAgentService.getConfig());
      setCampaigns(adBudgetAgentService.getCampaigns());
      setProgress(adBudgetAgentService.getUnlockProgress());
    });
    return () => unsub();
  }, []);

  const handleToggleSimulationMode = () => {
    const nextMode = !config.overrideSimulationMode;
    adBudgetAgentService.updateConfig({ overrideSimulationMode: nextMode });
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setOptimizationToast(null);

    setTimeout(() => {
      try {
        const result = adBudgetAgentService.triggerAutonomousOptimizationCycle();
        setOptimizationToast(
          `Cycle IA terminé : ${result.scaledCount} campagnes augmentées (+20%), ${result.killedCount} coupées. Budget global : ${result.newTotalDailyBudget}€/jour.`
        );
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsOptimizing(false);
        setTimeout(() => setOptimizationToast(null), 5000);
      }
    }, 800);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Veuillez sélectionner un produit du catalogue.');
      return;
    }

    try {
      adBudgetAgentService.createCampaignForProduct({
        productId: selectedProductId,
        platform: selectedPlatform,
        dailyBudgetEur: selectedDailyBudget
      });
      setIsNewCampModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalDailyBudget = campaigns
    .filter(c => c.status !== 'paused' && c.status !== 'killed_by_ai')
    .reduce((sum, c) => sum + c.dailyBudget, 0);

  const totalSpent = campaigns.reduce((sum, c) => sum + c.metrics.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.metrics.revenue, 0);
  const globalRoas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : '0.00';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span>Agent IA Media Buying & Budget Ads</span>
                {progress.isUnlocked ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Unlock className="w-3 h-3" />
                    <span>Actif & Débloqué (Palier 100k)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Verrouillé (&lt; 100k€ de Ventes)</span>
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestionnaire autonome des budgets publicitaires (Meta, Google, TikTok, YouTube). Optimisation continue du ROAS et coupure automatique des pertes.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Simulation / Override Toggle */}
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Mode Test Milestone 100k :</span>
          <button
            onClick={handleToggleSimulationMode}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              config.overrideSimulationMode
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {config.overrideSimulationMode ? 'Simulation 100k Active' : 'Règle Stricte (En Attente)'}
          </button>
        </div>
      </div>

      {/* 1. FINANCIAL SAFETY GUARDRAIL PANEL (Visible when Locked or as Reminder) */}
      {!progress.isUnlocked ? (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Garde-Fou Financier : Verrouillage Préventif du Budget Ads</span>
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Règle Impérative : 100k€ de Ventes
                </span>
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                L'Agent IA a interdiction formelle de déployer du capital publicitaire tant que le cap des <strong>100 000 € de ventes</strong> n'est pas atteint. Cette règle protège votre trésorerie contre le brûlage prématuré de budget (*Cash Burn*) et garantit que votre catalogue bénéficie déjà d'une traction organique et d'un taux de conversion validé.
              </p>
            </div>
          </div>

          {/* Progress Bar towards 100k */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Progression vers le Déblocage Automatique :</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono font-bold text-sm">€{(progress?.currentRevenue ?? 0).toLocaleString()} EUR</span>
                <span className="text-slate-500">/ €{(progress?.targetRevenue ?? 100000).toLocaleString()} EUR ({progress?.percent ?? 0}%)</span>
              </div>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Manque encore : <strong>€{(progress?.remaining ?? 100000).toLocaleString()} EUR</strong> de ventes avant autonomie totale</span>
              <span>Validation par commande Stripe / Crypto</span>
            </div>
          </div>

          {/* Test Unlock CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400">
              💡 Vous souhaitez prévisualiser les algorithmes d'arbitrage et les campagnes multi-plateformes ?
            </span>
            <button
              onClick={handleToggleSimulationMode}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0 transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Activer le Mode Simulation 100k</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2. UNLOCKED AGENT CONTROL SUITE */
        <div className="space-y-8 animate-fade-in">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Budget Quotidien Alloué</span>
                <Sliders className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                €{totalDailyBudget} <span className="text-xs text-slate-500 font-normal">/ jour</span>
              </div>
              <div className="text-[10px] text-indigo-400">Plafond max : €{config.maxDailyBudgetEur}/j</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ROAS Global IA</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {globalRoas}x
              </div>
              <div className="text-[10px] text-slate-400">Seuil de coupure (Floor) : {config.targetRoasFloor}x</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Chiffre d'Affaires Ads</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                €{(totalRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400">Généré sur dépenses de €{(totalSpent ?? 0).toLocaleString()}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Campagnes Monitorées</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {campaigns.length}
              </div>
              <div className="text-[10px] text-slate-400">Meta, Google, TikTok, YouTube</div>
            </div>
          </div>

          {/* Autonomous Actions Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Moteur d'Arbitrage Autonome des Budgets</h3>
              </div>
              <p className="text-xs text-slate-400">
                L'Agent IA analyse chaque 60 minutes les métriques de conversion, coupe les annonces non-rentables (&lt; {config.targetRoasFloor}x) et scale les gagnantes (+20%).
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  setSelectedProductId(publishedProducts[0]?.id || '');
                  setIsNewCampModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Campagne</span>
              </button>

              <button
                onClick={handleRunOptimization}
                disabled={isOptimizing}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isOptimizing ? 'Optimisation en cours...' : 'Exécuter Cycle IA'}</span>
              </button>
            </div>
          </div>

          {/* Optimization Toast Banner */}
          {optimizationToast && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="font-medium">{optimizationToast}</span>
            </div>
          )}

          {/* Campaigns Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Campagnes Publicitaires Gérées par l'IA</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  {campaigns.length} actives
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Plateforme & Nom</th>
                    <th className="py-3.5 px-4 font-semibold">Produit Cible</th>
                    <th className="py-3.5 px-4 font-semibold">Budget / Jour</th>
                    <th className="py-3.5 px-4 font-semibold">Dépensé / CA</th>
                    <th className="py-3.5 px-4 font-semibold">ROAS IA</th>
                    <th className="py-3.5 px-4 font-semibold">Statut & Décision IA</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.map(camp => (
                    <tr key={camp.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            camp.platform === 'meta' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            camp.platform === 'google' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            camp.platform === 'tiktok' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {camp.platform}
                          </span>
                          <span className="font-bold text-white">{camp.campaignName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 max-w-sm truncate italic">
                          "{camp.headline}"
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-300 max-w-xs truncate">
                        {camp.productTitle}
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white">
                        €{camp.dailyBudget} <span className="text-[10px] text-slate-500 font-normal">/j</span>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <div className="text-white font-bold">€{(camp.metrics?.revenue ?? 0).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">Dépensé: €{(camp.metrics?.spend ?? 0).toLocaleString()}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`font-mono font-extrabold text-sm px-2 py-0.5 rounded ${
                          camp.metrics.roas >= 3.8 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                          camp.metrics.roas >= 2.4 ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' :
                          'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                        }`}>
                          {camp.metrics.roas.toFixed(2)}x
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            camp.status === 'scaled_by_ai' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            camp.status === 'killed_by_ai' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            camp.status === 'learning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {camp.status === 'scaled_by_ai' ? '🚀 Scalé par IA (+20%)' :
                             camp.status === 'killed_by_ai' ? '🛑 Coupé par IA (Perte)' :
                             camp.status === 'learning' ? '⏳ Apprentissage Enchères' :
                             camp.status === 'paused' ? '⏸️ En Pause' : '✅ Actif'}
                          </span>
                          <p className="text-[10px] text-slate-400 max-w-xs">{camp.aiDecisionReason}</p>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => adBudgetAgentService.toggleCampaignStatus(camp.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title={camp.status === 'paused' || camp.status === 'killed_by_ai' ? 'Relancer la campagne' : 'Mettre en pause'}
                        >
                          {camp.status === 'paused' || camp.status === 'killed_by_ai' ? (
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Creation Modal */}
      {isNewCampModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Créer une Campagne avec l'Agent IA</span>
              </h3>
              <button onClick={() => setIsNewCampModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Produit Digital du Catalogue :</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {publishedProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} (€{p.pricing?.recommendedPrice ?? 47})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Canal Publicitaire :</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['meta', 'google', 'tiktok', 'youtube'] as AdPlatform[]).map(plat => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setSelectedPlatform(plat)}
                      className={`py-2 rounded-xl border text-xs font-bold uppercase transition-colors ${
                        selectedPlatform === plat
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Budget Quotidien Initial (€/jour) :</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={selectedDailyBudget}
                  onChange={e => setSelectedDailyBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-200">Génération Automatique par l'IA :</div>
                <p>L'agent va automatiquement générer 3 variations de hooks copywriting, configurer les pixels et cibler les audiences d'acheteurs vérifiés.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCampModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Lancer la Campagne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
