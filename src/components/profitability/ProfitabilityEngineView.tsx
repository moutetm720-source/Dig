import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Cpu, 
  Server, 
  CreditCard, 
  Coins, 
  Download, 
  RefreshCw, 
  Layers, 
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  Search,
  Zap,
  FileText
} from 'lucide-react';
import { profitabilityEngine } from '../../services/profitabilityEngine';
import { TimeHorizonKey, HorizonProfitabilityBreakdown, ProfitabilitySimulationParams } from '../../types';
import { store } from '../../services/store';

export const ProfitabilityEngineView: React.FC = () => {
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizonKey>('1y');
  const [params, setParams] = useState<ProfitabilitySimulationParams>(profitabilityEngine.getParams());
  const [projections, setProjections] = useState<Record<TimeHorizonKey, HorizonProfitabilityBreakdown>>(profitabilityEngine.getProjections());
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingParams, setIsEditingParams] = useState<boolean>(false);

  useEffect(() => {
    const unsub = profitabilityEngine.subscribe(() => {
      setParams(profitabilityEngine.getParams());
      setProjections(profitabilityEngine.getProjections());
    });
    return () => unsub();
  }, []);

  const handleParamChange = (key: keyof ProfitabilitySimulationParams, val: number) => {
    profitabilityEngine.updateParams({ [key]: val });
  };

  const handleResetParams = () => {
    profitabilityEngine.resetParams();
  };

  const currentProjection: HorizonProfitabilityBreakdown = 
    projections?.[selectedHorizon] || 
    profitabilityEngine.getProjections()[selectedHorizon] || 
    profitabilityEngine.getProjections()['1y'];

  const handleExportReport = () => {
    const reportText = profitabilityEngine.generateAuditReportText();
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_rentabilite_digitalforge_${selectedHorizon}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const horizons: Array<{ key: TimeHorizonKey; label: string; tag: string; color: string }> = [
    { key: '30d', label: 'Mois 1 (J+30)', tag: 'Lancement', color: 'from-sky-500/20 to-indigo-500/20' },
    { key: '90d', label: 'Trimestre 1 (J+90)', tag: 'Effet de Levier', color: 'from-indigo-500/20 to-violet-500/20' },
    { key: '180d', label: 'Semestre 1 (J+180)', tag: 'Expansion', color: 'from-violet-500/20 to-purple-500/20' },
    { key: '1y', label: 'An 1 (J+365)', tag: 'Palier 100k+ Domination', color: 'from-emerald-500/20 to-teal-500/20' },
    { key: '3y', label: 'An 3 (J+1095)', tag: 'Monopole & Rente', color: 'from-amber-500/20 to-orange-500/20' }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Title & Export Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit & Évaluation Précise de Rentabilité Multi-Horizons</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Modèle Zéro-Coût Token</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Modélisation financière mathématique exacte : Décomposition du CA brut, marges nettes (96.8% - 98.5%), répartition Crypto/Fiat et coûts d'infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditingParams(!isEditingParams)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              isEditingParams 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                : 'bg-[#111114] text-slate-300 border-slate-800 hover:bg-[#16161A]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEditingParams ? 'Fermer Simulateur' : 'Ajuster Paramètres'}</span>
          </button>

          <button
            onClick={handleExportReport}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{copied ? 'Rapport Téléchargé !' : 'Exporter Rapport d\'Audit (.TXT)'}</span>
          </button>
        </div>
      </div>

      {/* Horizon Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {horizons.map(h => {
          const isSelected = selectedHorizon === h.key;
          const proj = projections?.[h.key] || profitabilityEngine.getProjections()[h.key];
          const netProfit = proj?.netProfitEur ?? 0;
          const visitors = proj?.cumulativeVisitors ?? 0;
          return (
            <button
              key={h.key}
              onClick={() => setSelectedHorizon(h.key)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-[#16161A] border-indigo-500/50 ring-1 ring-indigo-500/50 shadow-lg'
                  : 'bg-[#111114] border-slate-800 hover:bg-[#16161A] text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1">
                <span className={isSelected ? 'text-indigo-400' : 'text-slate-500'}>{h.tag}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
              </div>
              <div className="font-bold text-sm text-white">{h.label}</div>
              <div className="mt-2 text-base font-extrabold font-mono text-emerald-400">
                €{netProfit.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">net</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {visitors.toLocaleString()} visiteurs
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Simulation Sliders Drawer */}
      {isEditingParams && (
        <div className="p-6 rounded-2xl bg-[#111114] border border-indigo-500/30 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Curseurs Dynamiques de Simulation</h2>
            </div>
            <button
              onClick={handleResetParams}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Trafic Initial (Visiteurs/mois)</span>
                <span className="text-indigo-400 font-mono font-bold">{params.baseMonthlyTraffic.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={3000}
                max={50000}
                step={500}
                value={params.baseMonthlyTraffic}
                onChange={e => handleParamChange('baseMonthlyTraffic', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Croissance Organique Mensuelle</span>
                <span className="text-emerald-400 font-mono font-bold">+{params.trafficMonthlyGrowthRate}% / mois</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={1}
                value={params.trafficMonthlyGrowthRate}
                onChange={e => handleParamChange('trafficMonthlyGrowthRate', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Taux de Conversion Global</span>
                <span className="text-amber-400 font-mono font-bold">{params.conversionRate}%</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={8.0}
                step={0.1}
                value={params.conversionRate}
                onChange={e => handleParamChange('conversionRate', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Panier Moyen (AOV avec Bundles)</span>
                <span className="text-sky-400 font-mono font-bold">{params.averageOrderValue} €</span>
              </div>
              <input
                type="range"
                min={25}
                max={150}
                step={1}
                value={params.averageOrderValue}
                onChange={e => handleParamChange('averageOrderValue', Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Part Règlements Crypto (BTC/SOL/ETH/USDT)</span>
                <span className="text-teal-400 font-mono font-bold">{params.cryptoSharePercent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={70}
                step={1}
                value={params.cryptoSharePercent}
                onChange={e => handleParamChange('cryptoSharePercent', Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Part Ventes Générées par Affiliés</span>
                <span className="text-violet-400 font-mono font-bold">{params.affiliateSharePercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={params.affiliateSharePercent}
                onChange={e => handleParamChange('affiliateSharePercent', Number(e.target.value))}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main KPI Quad Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Bénéfice Net Réel</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            €{(currentProjection?.netProfitEur ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Marge Nette Exceptionnelle de {currentProjection?.netMarginPercent ?? 97}%</span>
          </div>
        </div>

        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Chiffre d'Affaires Brut</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            €{(currentProjection?.grossRevenueEur ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">
            {(currentProjection?.totalOrdersCount ?? 0).toLocaleString()} commandes (AOV: {currentProjection?.averageOrderValueEur ?? 47}€)
          </div>
        </div>

        {/* Operating Costs */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Coûts d'Exploitation Totaux</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono">
            €{(currentProjection?.totalOperatingCostsEur ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">
            Frais serveurs + Passerelles + Comms
          </div>
        </div>

        {/* AI & Token Cost */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Coût LLM & Tokens IA</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-teal-400 font-mono">
            0,00 €
          </div>
          <div className="text-xs text-teal-300 font-medium">
            100% Free-Tier & Moteur Heuristique
          </div>
        </div>
      </div>

      {/* Detailed Financial Breakdown & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Complete P&L Breakdown Table */}
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Compte de Résultat Prévisionnel ({currentProjection?.horizonLabel ?? 'Horizon'})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Période: {currentProjection?.periodDays ?? 365} jours</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Revenue lines */}
            <div className="p-3 rounded-xl bg-[#16161A] border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold text-white text-sm">
                <span>1. Chiffre d'Affaires Brut (Gross Revenue)</span>
                <span className="font-mono text-emerald-400">€{(currentProjection?.grossRevenueEur ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pl-3">
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-sky-400" /> Règlements Fiat (CB / Stripe) :</span>
                <span className="font-mono text-slate-200">€{(currentProjection?.fiatRevenueEur ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pl-3">
                <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400" /> Règlements Crypto Directs (BTC/ETH/SOL/USDT) :</span>
                <span className="font-mono text-amber-300 font-bold">€{(currentProjection?.cryptoRevenueEur ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Operating expenses */}
            <div className="p-3 rounded-xl bg-[#16161A] border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold text-slate-300 text-sm">
                <span>2. Coûts d'Exploitation (Operating Expenses)</span>
                <span className="font-mono text-rose-400">-€{(currentProjection?.totalOperatingCostsEur ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pl-3">
                <span>• Tokens LLM / Cloud AI APIs :</span>
                <span className="font-mono text-teal-400 font-bold">0,00 € (Free-Tier)</span>
              </div>
              <div className="flex justify-between text-slate-400 pl-3">
                <span>• Hébergement Serveur & Edge CDN :</span>
                <span className="font-mono text-slate-300">-€{(currentProjection?.serverHostingCostEur ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pl-3">
                <span>• Frais de transaction (Stripe 1.5% / Crypto 0.1%) :</span>
                <span className="font-mono text-slate-300">-€{(currentProjection?.paymentProcessingFeesEur ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pl-3">
                <span>• Commissions d'affiliation reversées (25%) :</span>
                <span className="font-mono text-slate-300">-€{(currentProjection?.affiliateCommissionsPaidEur ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Net Result */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-sm font-extrabold text-white block">3. Résultat Net avant Impôt (Bénéfice Réel)</span>
                <span className="text-emerald-400 text-[11px]">Temps de travail requis : 0h (100% Autonome)</span>
              </div>
              <div className="text-right font-mono">
                <div className="text-xl font-extrabold text-emerald-300">
                  €{(currentProjection?.netProfitEur ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-emerald-400 font-semibold">
                  Marge: {currentProjection?.netMarginPercent ?? 97}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Growth Engine Drivers & Asset Milestones */}
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Actifs Numériques & Métriques de Croissance</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Effet d'Échelle</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block">Catalogue Produits Actifs</span>
              <div className="text-lg font-bold text-white font-mono">
                {currentProjection?.activeProductsCatalog ?? 32} Produits & Packs
              </div>
              <p className="text-[10px] text-slate-500">Générés et packagés par l'IA</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block">Pages SEO Programmatiques</span>
              <div className="text-lg font-bold text-indigo-400 font-mono">
                {(currentProjection?.indexedSeoPages ?? 0).toLocaleString()} URLs Indexées
              </div>
              <p className="text-[10px] text-slate-500">Mots-clés haute intention ciblés</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block">Backlinks Qualifiés</span>
              <div className="text-lg font-bold text-teal-400 font-mono">
                {currentProjection?.acquiredBacklinks ?? 38} Liens DA 70+
              </div>
              <p className="text-[10px] text-slate-500">Dépôts GitHub, dev.to, hubs</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] block">Affiliés Recrutés</span>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {currentProjection?.activeAffiliatePartners ?? 28} Créateurs Actifs
              </div>
              <p className="text-[10px] text-slate-500">Canaux YouTube, X, Newsletters</p>
            </div>
          </div>

          {/* Ad Guardian Status for this Horizon */}
          <div className="p-4 rounded-xl bg-[#16161A] border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentProjection.adBudgetUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {currentProjection.adBudgetUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold text-white text-xs">
                  {currentProjection.adBudgetUnlocked 
                    ? 'Palier 100k€ Franchi : Scaling Ads ROAS IA Actif' 
                    : 'Garde-Fou 100k€ Actif : Acquisition 100% Organique'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentProjection.adBudgetUnlocked
                    ? 'L\'IA optimise les enchères publicitaires sans risquer la rentabilité.'
                    : 'Zéro dépense en publicité jusqu\'à 100 000 € de ventes validées.'}
                </div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              currentProjection.adBudgetUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {currentProjection.adBudgetUnlocked ? 'DÉBLOQUÉ' : 'SÉCURISÉ'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
