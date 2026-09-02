import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Sparkles, 
  Tag, 
  Percent, 
  Flame, 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  Sliders, 
  ShieldCheck, 
  ShoppingBag, 
  Layers, 
  ArrowUpRight, 
  RefreshCw, 
  Gift, 
  Clock, 
  Award,
  Check,
  ChevronRight,
  Eye,
  Boxes,
  Package,
  FolderPlus,
  Layout,
  FileCheck,
  SlidersHorizontal
} from 'lucide-react';
import { store } from '../../services/store';
import { currencyAgent } from '../../services/currencyAgent';
import { storefrontAgentService } from '../../services/storefrontAgentService';
import { similarityGroupingAgent } from '../../services/similarityGroupingAgent';
import { 
  DigitalProduct, 
  PricingConfig, 
  StorefrontCluster, 
  StorefrontAgentState, 
  IdenticalProductGroup 
} from '../../types';

export const PricingEngineView: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'pricing' | 'merchandising' | 'inventory'>('pricing');
  const [products, setProducts] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Merchandising & Storefront Agent state
  const [agentState, setAgentState] = useState<StorefrontAgentState>(storefrontAgentService.getState());
  const [identicalGroups, setIdenticalGroups] = useState<IdenticalProductGroup[]>(similarityGroupingAgent.getGroups());
  const [merchandisingSubTab, setMerchandisingSubTab] = useState<'similarity' | 'clusters' | 'visual'>('similarity');

  // Active product for pricing studio
  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Editable local state for the selected product
  const [recPrice, setRecPrice] = useState<number>(selectedProduct?.pricing?.recommendedPrice || 39.90);
  const [compareAtPrice, setCompareAtPrice] = useState<number>(selectedProduct?.pricing?.compareAtPrice || 69.90);
  const [hasCompareAt, setHasCompareAt] = useState<boolean>(Boolean(selectedProduct?.pricing?.compareAtPrice));
  const [selectedEnding, setSelectedEnding] = useState<'90' | '99' | '95' | '00'>('90');
  const [badgeText, setBadgeText] = useState<string>(selectedProduct?.pricing?.attractiveBadge || '⚡ OFFRE DE LANCEMENT -40%');
  const [isFlashSale, setIsFlashSale] = useState<boolean>(selectedProduct?.pricing?.isFlashSale || false);
  const [hasOrderBump, setHasOrderBump] = useState<boolean>(selectedProduct?.pricing?.orderBumpActive || false);
  const [orderBumpTitle, setOrderBumpTitle] = useState<string>(
    selectedProduct?.pricing?.orderBumpTitle || 'Pack 100 Prompts & Checklists Bonus VIP'
  );
  const [orderBumpPrice, setOrderBumpPrice] = useState<number>(selectedProduct?.pricing?.orderBumpPrice || 9.90);

  useEffect(() => {
    const unsubStore = store.subscribe(() => {
      const prods = store.getProducts();
      setProducts(prods);
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });

    const unsubAgent = storefrontAgentService.subscribe(() => {
      setAgentState(storefrontAgentService.getState());
    });

    const unsubSim = similarityGroupingAgent.subscribe(() => {
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });

    return () => {
      unsubStore();
      unsubAgent();
      unsubSim();
    };
  }, []);

  // When selected product changes, synchronize local state
  useEffect(() => {
    if (selectedProduct) {
      const rec = selectedProduct.pricing?.recommendedPrice ?? 39.90;
      setRecPrice(rec);
      setCompareAtPrice(selectedProduct.pricing?.compareAtPrice || Math.round(rec * 1.5) + 0.90);
      setHasCompareAt(Boolean(selectedProduct.pricing?.compareAtPrice));
      setSelectedEnding(selectedProduct.pricing?.psychologicalEnding || '90');
      setBadgeText(selectedProduct.pricing?.attractiveBadge || '⚡ OFFRE DE LANCEMENT -40%');
      setIsFlashSale(Boolean(selectedProduct.pricing?.isFlashSale));
      setHasOrderBump(Boolean(selectedProduct.pricing?.orderBumpActive));
      setOrderBumpTitle(selectedProduct.pricing?.orderBumpTitle || 'Pack 100 Prompts & Checklists Bonus VIP');
      setOrderBumpPrice(selectedProduct.pricing?.orderBumpPrice || 9.90);
      setAiAdvice(null);
    }
  }, [selectedProductId]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Quick charm ending application (.90€, .99€, etc.)
  const applyEnding = (ending: '90' | '99' | '95' | '00') => {
    setSelectedEnding(ending);
    const base = Math.floor(recPrice);
    const dec = ending === '90' ? 0.90 : ending === '99' ? 0.99 : ending === '95' ? 0.95 : 0;
    const newPrice = Number((base + dec).toFixed(2));
    setRecPrice(newPrice);

    if (hasCompareAt) {
      const anchorBase = Math.floor(compareAtPrice);
      setCompareAtPrice(Number((anchorBase + dec).toFixed(2)));
    }
  };

  // Quick discount preset for anchor price
  const applyAnchorDiscount = (discountPercent: number) => {
    setHasCompareAt(true);
    const dec = selectedEnding === '90' ? 0.90 : selectedEnding === '99' ? 0.99 : selectedEnding === '95' ? 0.95 : 0;
    const factor = 1 / (1 - (discountPercent / 100));
    const rawAnchor = Math.round(recPrice * factor);
    const newAnchor = Number((rawAnchor + dec).toFixed(2));
    setCompareAtPrice(newAnchor);

    if (discountPercent >= 45) {
      setBadgeText(`🔥 VENTE FLASH -${discountPercent}%`);
      setIsFlashSale(true);
    } else {
      setBadgeText(`⚡ OFFRE SPÉCIALE -${discountPercent}%`);
    }
  };

  // Save current product pricing
  const handleSaveProductPricing = () => {
    if (!selectedProduct) return;

    const discountPercent = (hasCompareAt && compareAtPrice > recPrice)
      ? Math.round(((compareAtPrice - recPrice) / compareAtPrice) * 100)
      : undefined;

    const savingsAmount = (hasCompareAt && compareAtPrice > recPrice)
      ? Number((compareAtPrice - recPrice).toFixed(2))
      : undefined;

    store.updateProductPricing(selectedProduct.id, {
      recommendedPrice: recPrice,
      compareAtPrice: hasCompareAt ? compareAtPrice : undefined,
      discountPercent,
      savingsAmount,
      psychologicalEnding: selectedEnding,
      attractiveBadge: badgeText || undefined,
      isFlashSale,
      flashSaleEndsInHours: isFlashSale ? 12 : undefined,
      orderBumpActive: hasOrderBump,
      orderBumpTitle: hasOrderBump ? orderBumpTitle : undefined,
      orderBumpPrice: hasOrderBump ? orderBumpPrice : undefined
    });

    showToast(`Tarification attractive enregistrée pour "${selectedProduct.title}" !`);
  };

  // Bulk strategy trigger
  const handleApplyBulkStrategy = (strategy: 'charm_90' | 'launch_promo_40' | 'flash_sale_50' | 'penetration_entry' | 'premium_high_anchor') => {
    store.applyBulkPricingStrategy(strategy);
    const names = {
      charm_90: 'Harmonisation .90€ avec ancrage',
      launch_promo_40: 'Offre de Lancement -40% avec prix barrés',
      flash_sale_50: 'Vente Flash -50% avec badges d\'urgence',
      penetration_entry: 'Pénétration Volume (19.90€ / 39.90€)',
      premium_high_anchor: 'Valeur Haute & Licence Commerciale'
    };
    showToast(`Stratégie globale "${names[strategy]}" appliquée à l'ensemble du catalogue !`);
  };

  // AI Price Attractiveness Audit
  const handleRunAiAudit = async () => {
    if (!selectedProduct) return;
    setIsAiOptimizing(true);
    await new Promise(r => setTimeout(r, 600));

    const rec = selectedProduct.level === 'Advanced' ? 49.90 : 29.90;
    const anchor = selectedProduct.level === 'Advanced' ? 99.90 : 59.90;
    const discount = Math.round(((anchor - rec) / anchor) * 100);

    const advice = `Audit de Valeur Perçue pour "${selectedProduct.title}": 
Contenu riche (${selectedProduct.content?.structure?.length || 4} modules, checklists & templates). Recommandation de conversion optimale : Prix d'appel à ${rec} € avec ancrage barré à ${anchor} € (-${discount}%). L'ajout d'un Order Bump à 9.90 € augmentera le panier moyen de +28%.`;

    setAiAdvice(advice);
    setIsAiOptimizing(false);
  };

  const handleApplyAiAdvice = () => {
    if (!selectedProduct) return;
    const rec = selectedProduct.level === 'Advanced' ? 49.90 : 29.90;
    const anchor = selectedProduct.level === 'Advanced' ? 99.90 : 59.90;
    
    setRecPrice(rec);
    setCompareAtPrice(anchor);
    setHasCompareAt(true);
    setSelectedEnding('90');
    setBadgeText(`⚡ OFFRE SPÉCIALE -${Math.round(((anchor - rec) / anchor) * 100)}%`);
    setHasOrderBump(true);
    setOrderBumpPrice(9.90);
    setOrderBumpTitle('Pack 100 Prompts & Checklists Bonus VIP');
    
    store.updateProductPricing(selectedProduct.id, {
      recommendedPrice: rec,
      compareAtPrice: anchor,
      discountPercent: Math.round(((anchor - rec) / anchor) * 100),
      savingsAmount: Number((anchor - rec).toFixed(2)),
      psychologicalEnding: '90',
      attractiveBadge: `⚡ OFFRE SPÉCIALE -${Math.round(((anchor - rec) / anchor) * 100)}%`,
      orderBumpActive: true,
      orderBumpPrice: 9.90,
      orderBumpTitle: 'Pack 100 Prompts & Checklists Bonus VIP'
    });

    setAiAdvice(null);
    showToast(`Configuration recommandée appliquée avec succès !`);
  };

  // Toggle A/B Test
  const handleToggleAbTest = (prod: DigitalProduct) => {
    const newActive = !prod.pricing?.abTestActive;
    const recPrice = prod.pricing?.recommendedPrice ?? 39.90;
    const testPrice = newActive ? Number((Math.round(recPrice * 1.25) + 0.90).toFixed(2)) : undefined;

    store.updateProductPricing(prod.id, {
      abTestActive: newActive,
      testPrice
    });
    showToast(newActive ? 'Test A/B de prix activé (50% trafic)' : 'Test A/B de prix désactivé');
  };

  // Merchandising bundle creation from cluster
  const handleCreateBundleFromCluster = (cluster: StorefrontCluster) => {
    const prods = products.filter(p => cluster.productIds.includes(p.id));
    if (prods.length < 2) {
      showToast('Il faut au moins 2 produits pour créer un bundle.');
      return;
    }

    const totalRawPrice = prods.reduce((sum, p) => sum + (p.pricing?.recommendedPrice || 47), 0);
    const bundleDiscount = cluster.suggestedBundleDiscount || 35;
    const bundlePrice = Math.round(totalRawPrice * (1 - bundleDiscount / 100)) + 0.90;

    store.addProduct({
      title: `⚡ Mega-Pack : ${cluster.name} (${prods.length} Solutions Clé en Main)`,
      subtitle: `Pack tout-en-un comprenant l'ensemble des kits et outils de la thématique ${cluster.name}.`,
      description: `Profitez d'un accès complet et immédiat à tous les systèmes de cette thématique avec une remise exceptionnelle de -${bundleDiscount}%. Inclus : licences commerciales et fichiers sources.`,
      category: prods[0]?.category || 'business',
      format: 'pro_kit',
      level: 'Advanced',
      status: 'ready',
      tags: ['bundle', 'mega-pack', cluster.slug, 'commercial_license'],
      pricing: {
        recommendedPrice: bundlePrice,
        compareAtPrice: totalRawPrice + 0.90,
        discountPercent: bundleDiscount,
        savingsAmount: Number((totalRawPrice - bundlePrice).toFixed(2)),
        psychologicalEnding: '90',
        attractiveBadge: `🏆 MEGA PACK -${bundleDiscount}%`,
        orderBumpActive: true,
        orderBumpTitle: 'Support VIP Prioritaire 24/7 & Mises à Jour à Vie',
        orderBumpPrice: 14.90
      },
      content: {
        summary: `Ensemble consolidé de ${prods.length} produits professionnels complets.`,
        structure: prods.map(p => p.title),
        downloadableFiles: prods.flatMap(p => p.content?.downloadableFiles || [])
      }
    });

    showToast(`Pack Bundle "${cluster.name}" créé avec succès au tarif de ${bundlePrice} € !`);
  };

  // Catalog Attractiveness Score Calculation
  const productsWithPsychEnding = products.filter(p => (p.pricing?.recommendedPrice ?? 47) % 1 !== 0).length;
  const productsWithAnchor = products.filter(p => Boolean(p.pricing?.compareAtPrice && p.pricing.compareAtPrice > (p.pricing?.recommendedPrice ?? 47))).length;
  const productsWithBadge = products.filter(p => Boolean(p.pricing?.attractiveBadge)).length;
  const productsWithOrderBump = products.filter(p => Boolean(p.pricing?.orderBumpActive)).length;

  const catalogAttractivenessScore = Math.min(
    100,
    Math.round(
      ((productsWithPsychEnding / Math.max(1, products.length)) * 30) +
      ((productsWithAnchor / Math.max(1, products.length)) * 35) +
      ((productsWithBadge / Math.max(1, products.length)) * 20) +
      ((productsWithOrderBump / Math.max(1, products.length)) * 15)
    )
  );

  // Elasticity Simulation points for selected product
  const basePoints = [
    { price: 19.90, convRate: 7.8 },
    { price: 29.90, convRate: 6.4 },
    { price: 39.90, convRate: 5.2 },
    { price: 49.90, convRate: 4.5 },
    { price: 69.90, convRate: 3.1 },
    { price: 99.90, convRate: 1.9 }
  ].map(p => ({
    ...p,
    rev: Math.round(p.price * p.convRate * 10)
  }));

  const maxRev = Math.max(...basePoints.map(p => p.rev));

  // Current calculation for preview
  const currentSavings = hasCompareAt && compareAtPrice > recPrice ? Number((compareAtPrice - recPrice).toFixed(2)) : 0;
  const currentDiscountPercent = hasCompareAt && compareAtPrice > recPrice ? Math.round((currentSavings / compareAtPrice) * 100) : 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-slate-100 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Gestion des Prix et Attractivité de la Modération</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Cockpit Modération & Ventes
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilotage centralisé : tarification stratégique, regroupement des produits similaires, gestion des clusters et santé des livrables.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunAiAudit}
            disabled={isAiOptimizing}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiOptimizing ? 'animate-spin' : ''}`} />
            <span>{isAiOptimizing ? 'Audit en cours...' : 'Audit Attractivité'}</span>
          </button>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#111114] border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveMainTab('pricing')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'pricing'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>1. Tarification & Attractivité des Prix</span>
        </button>

        <button
          onClick={() => setActiveMainTab('merchandising')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'merchandising'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>2. Regroupement des Produits & Merchandising</span>
        </button>

        <button
          onClick={() => setActiveMainTab('inventory')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'inventory'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3. Santé de l'Inventaire & Fichiers</span>
        </button>
      </div>

      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/30 p-3.5 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* AI Advice Banner */}
      {aiAdvice && (
        <div className="bg-[#111114] border border-indigo-500/30 rounded-2xl p-5 flex items-start gap-4 shadow-xl shadow-indigo-950/20">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Recommandation d'Attractivité Stratégique</div>
              <p className="text-xs text-slate-300 leading-relaxed mt-1 whitespace-pre-line">{aiAdvice}</p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleApplyAiAdvice}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Appliquer la configuration recommandée</span>
              </button>
              <button
                onClick={() => setAiAdvice(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium"
              >
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🏷️ TAB 1: PRICING STUDIO & ATTRACTIVENESS */}
      {/* ======================================================== */}
      {activeMainTab === 'pricing' && (
        <div className="space-y-8">
          {/* Global Attractiveness Metrics & Fast Bulk Strategy Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Score Attractivité Catalogue</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  catalogAttractivenessScore >= 75 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {catalogAttractivenessScore}/100
                </span>
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 flex items-baseline gap-2">
                <span>{catalogAttractivenessScore}%</span>
                <span className="text-xs font-medium text-emerald-400">Haute Conversion</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${catalogAttractivenessScore}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400">Tarification Attractive (.90€)</div>
              <div className="text-2xl font-extrabold text-indigo-400 mt-2">
                {productsWithPsychEnding} / {products.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Impact : <strong className="text-emerald-400">+24% clics</strong>
              </div>
            </div>

            <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400">Ancrages & Prix Barrés Actifs</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-2">
                {productsWithAnchor} / {products.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Remise moyenne : <strong className="text-slate-200">~38%</strong>
              </div>
            </div>

            <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400">Marge Nette / Produit</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-2">
                98.4%
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Coût marginal nul (0,00 €)
              </div>
            </div>
          </div>

          {/* 1-Click Fast Bulk Attractiveness Strategies */}
          <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Actions d'Attractivité en 1 Clic (Tout le Catalogue)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Appliquez instantanément une stratégie d'attractivité tarifaire éprouvée sur toutes vos offres.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              <button
                onClick={() => handleApplyBulkStrategy('charm_90')}
                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white group-hover:text-indigo-300">Terminaison (.90€)</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Harmonise en .90€ avec ancrage visuel +40%.</div>
              </button>

              <button
                onClick={() => handleApplyBulkStrategy('launch_promo_40')}
                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white group-hover:text-emerald-300">Offre Lancement -40%</span>
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Prix barrés d'ouverture et badge "Offre de Lancement".</div>
              </button>

              <button
                onClick={() => handleApplyBulkStrategy('flash_sale_50')}
                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white group-hover:text-amber-300">Vente Flash -50%</span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Urgence maximale avec compte à rebours 12h.</div>
              </button>

              <button
                onClick={() => handleApplyBulkStrategy('penetration_entry')}
                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white group-hover:text-cyan-300">Pénétration Volume</span>
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Prix d'appel à 19.90€ pour maximiser les premières ventes.</div>
              </button>

              <button
                onClick={() => handleApplyBulkStrategy('premium_high_anchor')}
                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white group-hover:text-purple-300">Valeur Haute B2B</span>
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Positionnement premium avec licence commerciale.</div>
              </button>
            </div>
          </div>

          {/* Main Studio: Product List + Detailed Attractiveness Editor + Live Storefront Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Product Selector (4 cols) */}
            <div className="lg:col-span-4 bg-[#111114] border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sélectionner une Offre</span>
                <span className="text-xs text-slate-400 font-mono">{products.length} produits</span>
              </div>

              <div className="space-y-2.5 max-h-[680px] overflow-y-auto custom-scrollbar pr-1">
                {products.map(prod => {
                  const isSelected = prod.id === selectedProductId;
                  const rec = prod.pricing?.recommendedPrice ?? 47;
                  const hasDisc = prod.pricing?.compareAtPrice && prod.pricing.compareAtPrice > rec;
                  
                  return (
                    <button
                      key={prod.id}
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs truncate max-w-[190px]">{prod.title}</span>
                        <div className="text-right shrink-0">
                          {hasDisc && (
                            <span className="text-[10px] text-slate-500 line-through mr-1 font-mono">
                              {prod.pricing?.compareAtPrice}€
                            </span>
                          )}
                          <span className="font-extrabold text-emerald-400 text-xs font-mono">
                            {rec}€
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                        <span className="text-slate-400 font-medium">{prod.format.replace('_', ' ')}</span>
                        <div className="flex items-center gap-1.5">
                          {prod.pricing?.attractiveBadge && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold">
                              Badge
                            </span>
                          )}
                          {prod.pricing?.orderBumpActive && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 font-bold">
                              +Bump
                            </span>
                          )}
                          {prod.pricing?.abTestActive && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 font-bold">
                              A/B
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center & Right Column: Attractiveness Editor & Live Preview (8 cols) */}
            {selectedProduct && (
              <div className="lg:col-span-8 space-y-6">
                
                {/* Editor Box */}
                <div className="bg-[#111114] border border-slate-800 p-6 rounded-2xl space-y-6">
                  
                  {/* Product Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 uppercase">
                          {selectedProduct.format.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">Niveau: <strong className="text-slate-200">{selectedProduct.level}</strong></span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">{selectedProduct.title}</h2>
                    </div>

                    <button
                      onClick={handleSaveProductPricing}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all self-start sm:self-center"
                    >
                      <Check className="w-4 h-4" />
                      <span>Enregistrer les Prix</span>
                    </button>
                  </div>

                  {/* 1. Base Price & Magic Endings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Prix Final Demandé à l'Acheteur</span>
                      </label>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">{recPrice.toFixed(2)} €</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <input
                          type="range"
                          min={9}
                          max={149}
                          step={1}
                          value={Math.floor(recPrice)}
                          onChange={e => {
                            const base = Number(e.target.value);
                            const dec = selectedEnding === '90' ? 0.90 : selectedEnding === '99' ? 0.99 : selectedEnding === '95' ? 0.95 : 0;
                            setRecPrice(Number((base + dec).toFixed(2)));
                          }}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                          <span>9€ (Entrée)</span>
                          <span>39€ (Sweet spot)</span>
                          <span>149€ (Playbook pro)</span>
                        </div>
                      </div>

                      {/* Magic Endings Buttons */}
                      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-medium ml-1">Terminaison :</span>
                        <button
                          onClick={() => applyEnding('90')}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                            selectedEnding === '90' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          .90 €
                        </button>
                        <button
                          onClick={() => applyEnding('99')}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                            selectedEnding === '99' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          .99 €
                        </button>
                        <button
                          onClick={() => applyEnding('95')}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                            selectedEnding === '95' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          .95 €
                        </button>
                        <button
                          onClick={() => applyEnding('00')}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                            selectedEnding === '00' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          .00 €
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Visual Anchor Price (Compare-at / Strikethrough) */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enableAnchor"
                          checked={hasCompareAt}
                          onChange={e => setHasCompareAt(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="enableAnchor" className="text-xs font-bold text-white cursor-pointer">
                          Activer le Prix Barré d'Ancrage Visuel (Valeur Réelle)
                        </label>
                      </div>

                      {hasCompareAt && (
                        <span className="text-xs font-bold text-amber-400">
                          -{currentDiscountPercent}% (Économie : {currentSavings.toFixed(2)} €)
                        </span>
                      )}
                    </div>

                    {hasCompareAt && (
                      <div className="space-y-3 pt-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Prix initial avant remise :</span>
                            <input
                              type="number"
                              step="0.1"
                              value={compareAtPrice}
                              onChange={e => setCompareAtPrice(Number(e.target.value))}
                              className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                            />
                            <span className="text-xs text-slate-400">€</span>
                          </div>

                          {/* Quick Discount Presets */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-400">Préréglage :</span>
                            {[25, 35, 45, 55, 65].map(pct => (
                              <button
                                key={pct}
                                onClick={() => applyAnchorDiscount(pct)}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                              >
                                -{pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Badge d'Attractivité & Vente Flash */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>Badge Promotionnel Affiché sur la Fiche</span>
                      </label>
                      <input
                        type="text"
                        value={badgeText}
                        onChange={e => setBadgeText(e.target.value)}
                        placeholder="ex: 🔥 OFFRE FLASH -50%"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {[
                          '⚡ OFFRE DE LANCEMENT',
                          '🔥 VENTE FLASH -50%',
                          '💎 PACK RECOMMANDÉ',
                          '🏆 BEST-SELLER #1'
                        ].map(preset => (
                          <button
                            key={preset}
                            onClick={() => setBadgeText(preset)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Compte à Rebours d'Urgence (Vente Flash)</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={isFlashSale}
                          onChange={e => setIsFlashSale(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Affiche un compte à rebours dynamique "Fin de l'offre dans 12h" pour stimuler le passage à l'action immédiat.
                      </p>
                    </div>
                  </div>

                  {/* 4. Order Bump / Upsell Panier 1-Clic */}
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="orderBump"
                          checked={hasOrderBump}
                          onChange={e => setHasOrderBump(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="orderBump" className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                          <Gift className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Activer une Offre Complémentaire au Panier (Order Bump +{orderBumpPrice}€)</span>
                        </label>
                      </div>
                    </div>

                    {hasOrderBump && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] text-slate-400 block mb-1">Titre de l'Order Bump</label>
                          <input
                            type="text"
                            value={orderBumpTitle}
                            onChange={e => setOrderBumpTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Tarif Bump (€)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={orderBumpPrice}
                            onChange={e => setOrderBumpPrice(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Live Storefront Card Preview (Exact Render) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Aperçu en Direct sur la Boutique Publique</span>
                      </span>
                      <span className="text-[11px] text-slate-400">Rendu temps réel pour l'acheteur</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
                      {isFlashSale && (
                        <div className="bg-rose-500/10 border-b border-rose-500/20 px-3 py-1.5 -mx-5 -mt-5 mb-4 flex items-center justify-between text-[11px] text-rose-300">
                          <span className="font-bold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            <span>VENTE FLASH EN COURS</span>
                          </span>
                          <span className="font-mono font-bold">11:42:19 restantes</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            {badgeText && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {badgeText}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">{selectedProduct.format.replace('_', ' ')}</span>
                          </div>
                          <h4 className="text-base font-bold text-white">{selectedProduct.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{selectedProduct.subtitle}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-2">
                            {hasCompareAt && compareAtPrice > recPrice && (
                              <span className="text-xs text-slate-500 line-through font-mono">
                                {compareAtPrice.toFixed(2)} €
                              </span>
                            )}
                            <span className="text-2xl font-black text-white font-mono">
                              {recPrice.toFixed(2)} €
                            </span>
                          </div>
                          {hasCompareAt && compareAtPrice > recPrice && (
                            <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                              Économisez {currentSavings.toFixed(2)} € (-{currentDiscountPercent}%)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Elasticity Simulation Chart */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white uppercase tracking-wider">Modélisation d'Élasticité & CA Projeté (Pour 1 000 Visiteurs)</span>
                      <span className="text-emerald-400 font-mono text-[11px]">Point d'Or : 39.90 € (CA Max)</span>
                    </div>

                    <div className="grid grid-cols-6 gap-2 pt-1">
                      {basePoints.map(pt => {
                        const heightPercent = Math.round((pt.rev / maxRev) * 100);
                        const isNearCurrent = Math.abs(pt.price - recPrice) < 6;
                        return (
                          <div key={pt.price} className="flex flex-col items-center gap-1.5">
                            <div className="text-[10px] text-slate-400 font-mono">{pt.rev}€</div>
                            <div className="w-full bg-slate-900 h-24 rounded-xl relative flex items-end p-1 border border-slate-800">
                              <div
                                className={`w-full rounded-lg transition-all duration-300 ${
                                  isNearCurrent
                                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                    : heightPercent > 80
                                    ? 'bg-indigo-500'
                                    : 'bg-slate-700'
                                }`}
                                style={{ height: `${heightPercent}%` }}
                              />
                            </div>
                            <div className={`text-xs font-bold font-mono ${isNearCurrent ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {pt.price}€
                            </div>
                            <div className="text-[9px] text-slate-500">{pt.convRate}% cv</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7. A/B Split Test Toggle */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Expérimentation Split A/B de Prix</span>
                        {selectedProduct.pricing?.abTestActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                            En cours (50/50)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Répartit équitablement le trafic entre le prix témoin ({selectedProduct.pricing?.recommendedPrice ?? 39.90} €) et le prix test ({selectedProduct.pricing?.testPrice || Math.round((selectedProduct.pricing?.recommendedPrice ?? 39.90) * 1.25) + 0.90} €).
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleAbTest(selectedProduct)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        selectedProduct.pricing?.abTestActive
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      {selectedProduct.pricing?.abTestActive ? 'Stopper le Test' : 'Lancer le Test A/B'}
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📦 TAB 2: MERCHANDISING & PRODUCT SIMILARITY GROUPING */}
      {/* ======================================================== */}
      {activeMainTab === 'merchandising' && (
        <div className="space-y-6">
          
          {/* Sub-nav for Merchandising section */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'similarity' as const, label: 'Déduplication & Regroupement par Affinité', icon: Boxes },
              { id: 'clusters' as const, label: 'Pôles Thématiques & Packs Bundles', icon: Layers },
              { id: 'visual' as const, label: 'Agencement Visuel de la Boutique', icon: Layout }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = merchandisingSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMerchandisingSubTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-[#111114] border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB: SIMILARITY GROUPING */}
          {merchandisingSubTab === 'similarity' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111114] p-5 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Moteur Autonome de Regroupement de Produits</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Actif en temps réel
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Regroupe intelligemment les produits similaires ou variantes complémentaires sous une fiche consolidée, et calcule automatiquement la quantité totale disponible.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const updated = similarityGroupingAgent.executeAutonomousGrouping(true);
                      setIdenticalGroups(updated);
                      showToast(`⚡ Scan terminé : ${updated.filter(g => !g.isSingle).length} groupes fusionnés avec quantités consolidées.`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-scanner & Consolider</span>
                  </button>
                </div>
              </div>

              {/* Grouped Product Cards List */}
              <div className="space-y-3">
                {identicalGroups.map(group => {
                  const hasMulti = group.variants.length > 1;
                  return (
                    <div
                      key={group.groupId}
                      className={`p-5 rounded-2xl border transition-all ${
                        hasMulti
                          ? 'bg-[#111114] border-indigo-500/30 ring-1 ring-indigo-500/10'
                          : 'bg-[#111114] border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 uppercase">
                              {group.nicheTheme}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              hasMulti
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {hasMulti ? `✨ ${group.variants.length} Produits Fusionnés` : 'Fiche Individuelle'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                              📦 Quantité disponible : {group.totalAvailableQuantity} édition{group.totalAvailableQuantity > 1 ? 's' : ''}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-sm">{group.primaryProduct.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{group.groupingRationale}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-white font-mono">
                              {group.lowestPrice === group.highestPrice
                                ? `${group.lowestPrice} €`
                                : `${group.lowestPrice} € - ${group.highestPrice} €`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {group.totalUniqueFilesCount} fichiers sources inclus
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Included Variants List */}
                      {hasMulti && (
                        <div className="pt-3 space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Éditions & Produits Regroupés Sous Cette Fiche :
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.variants.map((variant, idx) => (
                              <div
                                key={variant.id}
                                className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-indigo-400 font-mono">#{idx + 1}</span>
                                    <span className="font-semibold text-slate-200 truncate max-w-[200px]">{variant.title}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                    <span>{variant.format.replace('_', ' ')}</span>
                                    <span>•</span>
                                    <span>{variant.filesCount} fichiers</span>
                                    <span>•</span>
                                    <span className="text-indigo-300">{variant.similarityToPrimary}% affinité</span>
                                  </div>
                                </div>
                                <div className="text-right font-mono font-bold text-emerald-400 shrink-0">
                                  {variant.recommendedPrice} €
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB: THEMATIC CLUSTERS & BUNDLE BUILDER */}
          {merchandisingSubTab === 'clusters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-[#111114] p-4 rounded-2xl border border-slate-800">
                <span>
                  L'algorithme regroupe les produits complémentaires par intention d'achat pour générer des Packs Bundles à fort panier moyen.
                </span>
                <button
                  onClick={() => {
                    storefrontAgentService.groupSimilarProducts();
                    showToast('Pôles thématiques et recommandations recalculés !');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recalculer les Pôles</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentState.clusters.map(cluster => (
                  <div key={cluster.id} className="bg-[#111114] p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-white text-sm">
                          <span className="text-lg">{cluster.icon}</span>
                          <span>{cluster.name}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {cluster.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {cluster.description}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        <div className="text-[11px] font-semibold text-slate-300">
                          Produits inclus dans ce pôle ({cluster.productIds.length}) :
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cluster.productIds.map(pid => {
                            const p = products.find(prod => prod.id === pid);
                            return (
                              <span key={pid} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                                <span>⚡</span>
                                <span className="truncate max-w-[170px]">{p?.title || pid}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-xs text-emerald-400 font-semibold font-mono">
                        Remise Pack Suggérée : -{cluster.suggestedBundleDiscount}%
                      </div>
                      <button
                        onClick={() => handleCreateBundleFromCluster(cluster)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Créer Pack Bundle</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB: STOREFRONT VISUAL AGENCEMENT */}
          {merchandisingSubTab === 'visual' && (
            <div className="space-y-6">
              
              {/* Clustering Mode Selector */}
              <div className="bg-[#111114] p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider">
                  Mode d'Affichage du Catalogue sur la Boutique Publique
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'smart_clusters' as const, title: '⚡ Pôles Thématiques', desc: 'Regroupements intelligents par affinité et cross-selling' },
                    { id: 'category_tabs' as const, title: '📑 Onglets Catégories', desc: 'Filtrage classique (Dev, IA, Notion, Marketing)' },
                    { id: 'conversion_rank' as const, title: '🔥 Classement par Ventes', desc: 'Ordonné par note de satisfaction et volume' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        storefrontAgentService.updateVisualConfig({ clusteringMode: mode.id });
                        showToast(`Mode d'affichage boutique mis à jour : ${mode.title}`);
                      }}
                      className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                        agentState.visualConfig.clusteringMode === mode.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/30'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs">{mode.title}</div>
                      <div className="text-[10px] text-slate-400">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Customizer */}
              <div className="bg-[#111114] p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider">
                  Atmosphère Visuelle du Hero
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'cyber_quantum' as const, label: 'Cyber Quantum' },
                    { id: 'midnight_executive' as const, label: 'Midnight Executive' },
                    { id: 'aurora_indigo' as const, label: 'Aurora Indigo' },
                    { id: 'minimal_slate' as const, label: 'Minimal Slate' }
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        storefrontAgentService.updateVisualConfig({ heroTheme: theme.id });
                        showToast(`Thème visuel appliqué : ${theme.label}`);
                      }}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                        agentState.visualConfig.heroTheme === theme.id
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline & Dynamic Notice Settings */}
              <div className="bg-[#111114] p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="font-bold text-white text-xs uppercase tracking-wider">
                  Textes d'Accroche & Bandeau d'Annonce Client
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Titre Principal du Hero</label>
                    <input
                      type="text"
                      value={agentState.visualConfig.heroHeadline}
                      onChange={e => storefrontAgentService.updateVisualConfig({ heroHeadline: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Bandeau d'Annonce Supérieur (Réassurance)</label>
                    <input
                      type="text"
                      value={agentState.visualConfig.dynamicNoticeText}
                      onChange={e => storefrontAgentService.updateVisualConfig({ dynamicNoticeText: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 🛡️ TAB 3: DIGITAL INVENTORY HEALTH & FILE COMPLIANCE */}
      {/* ======================================================== */}
      {activeMainTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111114] p-5 rounded-2xl border border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Audit Temps Réel des Livrables Numériques</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Conformité Fichiers
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Contrôle automatique de l'intégrité des fichiers sources, formats de téléchargement, versions et réceptions clients.
              </p>
            </div>

            <button
              onClick={() => {
                storefrontAgentService.auditDigitalInventory();
                showToast('Audit de santé de l\'inventaire actualisé !');
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auditer Tout le Catalogue</span>
            </button>
          </div>

          <div className="space-y-3">
            {agentState.inventoryHealth.map(item => (
              <div key={item.productId} className="bg-[#111114] p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{item.productTitle}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                      {item.version}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.digitalStockStatus === 'high_demand' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {item.digitalStockStatus === 'high_demand' ? '🔥 Forte Demande' : '✅ En Stock & Synchronisé'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item.filesCount} fichiers inclus ({item.fileTypes.join(', ').toUpperCase()})</span>
                    <span>•</span>
                    <span>{item.downloadCount} téléchargements validés</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-emerald-400">{item.healthScore} / 100</div>
                    <div className="text-[10px] text-slate-500">Score de Qualité</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
