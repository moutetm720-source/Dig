import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  Users, 
  ShoppingCart, 
  Radio, 
  Briefcase, 
  DollarSign, 
  Send, 
  CheckCircle2, 
  Plus, 
  Coins, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles,
  Zap,
  Tag,
  Clock,
  ExternalLink,
  Filter,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Search,
  Video,
  Mic,
  FileText,
  Copy,
  Check,
  Download,
  Share2,
  Package,
  Layers,
  Trash2,
  Laptop,
  Smartphone,
  Inbox,
  RefreshCw,
  Sliders,
  Shield,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { salesExplosionAgents, CartRecoveryMetrics } from '../../services/salesExplosionAgents';
import { affiliatePromoKitService } from '../../services/affiliatePromoKitService';
import { AffiliatePartner, AbandonedCartLead, SocialProofEvent, B2BLeadOpportunity, AffiliatePromoKit } from '../../types';
import { AffiliatePromoKitModal } from './AffiliatePromoKitModal';
import { downloadAffiliatePromoKitMarkdown } from '../../utils/fileDownloader';

export const SalesExplosionView: React.FC = () => {
  const [affiliates, setAffiliates] = useState<AffiliatePartner[]>(salesExplosionAgents.getAffiliates());
  const [scoutHistory, setScoutHistory] = useState<AffiliatePartner[]>(salesExplosionAgents.getScoutHistory());
  const [carts, setCarts] = useState<AbandonedCartLead[]>(salesExplosionAgents.getAbandonedCarts());
  const [socialProofs, setSocialProofs] = useState<SocialProofEvent[]>(salesExplosionAgents.getSocialProofs());
  const [b2bLeads, setB2BLeads] = useState<B2BLeadOpportunity[]>(salesExplosionAgents.getB2BLeads());
  const [promoKits, setPromoKits] = useState<AffiliatePromoKit[]>(affiliatePromoKitService.getAllKits());
  const [activeTab, setActiveTab] = useState<'affiliates' | 'promo_kits' | 'abandoned_carts' | 'social_proof' | 'b2b'>('affiliates');

  // Affiliate Sub-filter
  const [affiliateFilter, setAffiliateFilter] = useState<'viable' | 'rejected' | 'all'>('viable');
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState('');
  const [affiliatePage, setAffiliatePage] = useState(1);
  const affiliatePageSize = 50;
  const [scoutBatchSize, setScoutBatchSize] = useState<number>(50);
  const [viabilityThreshold, setViabilityThreshold] = useState<number>(salesExplosionAgents.getMinViabilityThreshold());
  const [isScouting, setIsScouting] = useState(false);
  const [lastScoutResult, setLastScoutResult] = useState<{ total: number; viable: number; rejected: number } | null>(null);

  // Promo Kits Filter & Modal State
  const [selectedAffiliateForPromo, setSelectedAffiliateForPromo] = useState<AffiliatePartner | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoSearchTerm, setPromoSearchTerm] = useState('');
  const [promoFilterChannel, setPromoFilterChannel] = useState<string>('all');
  const [promoKitPage, setPromoKitPage] = useState(1);
  const PROMO_KITS_PAGE_SIZE = 12;
  const [isBroadcastingAllPacks, setIsBroadcastingAllPacks] = useState(false);
  const [broadcastSuccessNotice, setBroadcastSuccessNotice] = useState<string | null>(null);
  const [copiedKitId, setCopiedKitId] = useState<string | null>(null);

  // Form for recruiting a new affiliate
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [newAffName, setNewAffName] = useState('');
  const [newAffEmail, setNewAffEmail] = useState('');
  const [newAffChannel, setNewAffChannel] = useState<any>('youtube');
  const [newAffHandle, setNewAffHandle] = useState('');
  const [newAffCode, setNewAffCode] = useState('');
  const [newAffRate, setNewAffRate] = useState(30);
  const [newAffSubs, setNewAffSubs] = useState(25000);
  const [newAffEngagement, setNewAffEngagement] = useState(4.8);
  const [newAffNiche, setNewAffNiche] = useState<'high' | 'medium' | 'low'>('high');

  // Cart Recovery Metrics & Batch Actions
  const [cartMetrics, setCartMetrics] = useState<CartRecoveryMetrics>(salesExplosionAgents.getCartRecoveryMetrics());
  const [isBatchRecovering, setIsBatchRecovering] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubSales = salesExplosionAgents.subscribe(() => {
      setAffiliates(salesExplosionAgents.getAffiliates());
      setScoutHistory(salesExplosionAgents.getScoutHistory());
      setCarts(salesExplosionAgents.getAbandonedCarts());
      setSocialProofs(salesExplosionAgents.getSocialProofs());
      setB2BLeads(salesExplosionAgents.getB2BLeads());
      setViabilityThreshold(salesExplosionAgents.getMinViabilityThreshold());
      setCartMetrics(salesExplosionAgents.getCartRecoveryMetrics());
    });

    const unsubPromo = affiliatePromoKitService.subscribe(() => {
      setPromoKits(affiliatePromoKitService.getAllKits());
    });

    return () => {
      unsubSales();
      unsubPromo();
    };
  }, []);

  const handleOpenPromoModal = (aff: AffiliatePartner) => {
    setSelectedAffiliateForPromo(aff);
    setIsPromoModalOpen(true);
  };

  const handleBroadcastAllPacks = () => {
    setIsBroadcastingAllPacks(true);
    setTimeout(() => {
      const res = affiliatePromoKitService.transmitAllPacksToViableAffiliates();
      setIsBroadcastingAllPacks(false);
      setBroadcastSuccessNotice(`⚡ ${res.totalTransmitted} kits de supports (Vidéo/Audio/Texte) transmis à l'ensemble des créateurs viables !`);
      setTimeout(() => setBroadcastSuccessNotice(null), 5000);
    }, 600);
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKitId(id);
    setTimeout(() => setCopiedKitId(null), 2000);
  };

  const handleRunMassScout = (count: number) => {
    setIsScouting(true);
    setTimeout(() => {
      const res = salesExplosionAgents.scoutAndRecruitAffiliates(count);
      setLastScoutResult({
        total: res.totalScouted,
        viable: res.viableRecruitedCount,
        rejected: res.rejectedCount
      });
      setIsScouting(false);
    }, 400);
  };

  const handleThresholdChange = (val: number) => {
    setViabilityThreshold(val);
    salesExplosionAgents.setMinViabilityThreshold(val);
  };

  const handleCreateAffiliate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAffName || !newAffCode) return;
    salesExplosionAgents.recruitNewAffiliate({
      name: newAffName,
      email: newAffEmail || `${newAffCode.toLowerCase()}@partner.io`,
      channel: newAffChannel,
      handle: newAffHandle || `@${newAffName.replace(/\s+/g, '')}`,
      referralCode: newAffCode.toUpperCase(),
      commissionRate: newAffRate,
      subscribersCount: newAffSubs,
      engagementRate: newAffEngagement,
      nicheRelevance: newAffNiche
    });
    setShowAffiliateModal(false);
    setNewAffName('');
    setNewAffCode('');
  };

  const handleTriggerRecovery = (cartId: string) => {
    salesExplosionAgents.triggerCartRecovery(cartId);
  };

  const handleToggleAutoRecovery = () => {
    salesExplosionAgents.toggleAutonomousCartRecovery();
  };

  const handleBatchRecoverAll = () => {
    setIsBatchRecovering(true);
    setTimeout(() => {
      const res = salesExplosionAgents.recoverAllCartsImmediately();
      setIsBatchRecovering(false);
      setBatchFeedback(
        res.recoveredCount > 0
          ? `⚡ ${res.recoveredCount} panier(s) réellement converti(s) (commandes payées vérifiées) — +€${Math.round(res.totalGmvAddedEur * 100) / 100} de CA confirmé.`
          : '⏳ Aucune conversion réelle à confirmer : aucun de ces paniers n’est relié à une commande payée (aucun chiffre inventé).'
      );
      setTimeout(() => setBatchFeedback(null), 5000);
    }, 500);
  };

  const handleSimulateDropoff = () => {
    const newCart = salesExplosionAgents.generateSimulatedDropoffCart();
    setBatchFeedback(
      newCart
        ? `🛒 Abandon simulé pour ${newCart.customerName} (${newCart.productTitle} - €${newCart.cartValue}). Séquence autonome initiée.`
        : '🔒 Données réelles uniquement : les paniers abandonnés simulés sont désactivés. Seuls les vrais visiteurs alimentent la relance.'
    );
    setTimeout(() => setBatchFeedback(null), 4000);
  };

  const handleDeleteCart = (cartId: string) => {
    salesExplosionAgents.deleteAbandonedCart(cartId);
  };

  const handleRestoreViralNetwork = () => {
    const res = salesExplosionAgents.generateViralAffiliateNetwork(1550);
    setAffiliates(salesExplosionAgents.getAffiliates());
    setScoutHistory(salesExplosionAgents.getScoutHistory());
    setAffiliatePage(1);
    setBroadcastSuccessNotice(`🎉 ${res.count.toLocaleString()} Affiliés et Créateurs Viables restaurés et synchronisés en base de données !`);
    setTimeout(() => setBroadcastSuccessNotice(null), 6000);
  };

  const totalAffiliateSales = affiliates.reduce((sum, a) => sum + a.totalReferredSales, 0);
  const totalAffiliateRevenue = affiliates.reduce((sum, a) => sum + a.totalRevenueGenerated, 0);
  const totalRecoveredCarts = carts.filter(c => c.recoveryStep === 'recovered').length;

  // Compute displayed list based on filter & search (memoized for max 60fps performance)
  const rawDisplayedAffiliates = useMemo(() => {
    return affiliateFilter === 'viable'
      ? affiliates
      : affiliateFilter === 'rejected'
      ? scoutHistory.filter(s => s.viabilityStatus === 'not_viable')
      : [...affiliates, ...scoutHistory.filter(s => s.viabilityStatus === 'not_viable')];
  }, [affiliateFilter, affiliates, scoutHistory]);

  const displayedAffiliates = useMemo(() => {
    if (!affiliateSearchTerm) return rawDisplayedAffiliates;
    const term = affiliateSearchTerm.toLowerCase();
    return rawDisplayedAffiliates.filter(aff => (
      aff.name.toLowerCase().includes(term) ||
      aff.handle.toLowerCase().includes(term) ||
      aff.referralCode.toLowerCase().includes(term) ||
      aff.channel.toLowerCase().includes(term) ||
      (aff.email && aff.email.toLowerCase().includes(term))
    ));
  }, [rawDisplayedAffiliates, affiliateSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(displayedAffiliates.length / affiliatePageSize));
  const currentAffiliatePage = Math.min(affiliatePage, totalPages);
  
  const paginatedAffiliates = useMemo(() => {
    return displayedAffiliates.slice(
      (currentAffiliatePage - 1) * affiliatePageSize,
      currentAffiliatePage * affiliatePageSize
    );
  }, [displayedAffiliates, currentAffiliatePage, affiliatePageSize]);

  const viableCount = affiliates.length;
  const rejectedCount = scoutHistory.filter(s => s.viabilityStatus === 'not_viable').length;

  // Filtered & Paginated promo kits
  const filteredPromoKits = useMemo(() => {
    return promoKits.filter(kit => {
      const matchesChannel = promoFilterChannel === 'all' || kit.affiliateChannel === promoFilterChannel;
      const matchesSearch = !promoSearchTerm || 
        kit.affiliateName.toLowerCase().includes(promoSearchTerm.toLowerCase()) ||
        kit.affiliateHandle.toLowerCase().includes(promoSearchTerm.toLowerCase()) ||
        kit.productTitle.toLowerCase().includes(promoSearchTerm.toLowerCase()) ||
        kit.referralCode.toLowerCase().includes(promoSearchTerm.toLowerCase());
      return matchesChannel && matchesSearch;
    });
  }, [promoKits, promoFilterChannel, promoSearchTerm]);

  const totalPromoKitPages = Math.max(1, Math.ceil(filteredPromoKits.length / PROMO_KITS_PAGE_SIZE));
  const paginatedPromoKits = useMemo(() => {
    const start = (promoKitPage - 1) * PROMO_KITS_PAGE_SIZE;
    return filteredPromoKits.slice(start, start + PROMO_KITS_PAGE_SIZE);
  }, [filteredPromoKits, promoKitPage, PROMO_KITS_PAGE_SIZE]);

  useEffect(() => {
    setPromoKitPage(1);
  }, [promoSearchTerm, promoFilterChannel]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Agent Recruteur d'Affiliation & Explosion des Ventes</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Filtre de Viabilité Strict Activé</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            L'agent recrute en masse des créateurs (YouTube, X, Newsletters, TikTok) mais ne sélectionne et n'active que les profils strictement rentables et viables (score ≥ {viabilityThreshold}%).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRestoreViralNetwork}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 text-xs font-bold flex items-center gap-2 border border-indigo-500/30 transition-all shadow-sm"
            title="Régénérer et resynchroniser instantanément le réseau de 1 500+ affiliés"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Restaurer Réseau (1500+)</span>
          </button>

          <button
            onClick={() => setShowAffiliateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tester une Candidature</span>
          </button>

          <button
            onClick={() => handleRunMassScout(scoutBatchSize)}
            disabled={isScouting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isScouting ? 'Scan en cours...' : `Scanner & Recruter ${scoutBatchSize} Créateurs`}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Affiliés Viables Actifs</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {viableCount} <span className="text-xs font-normal text-emerald-400 font-sans">({rejectedCount} rejetés par filtre)</span>
          </div>
          <div className="text-xs text-indigo-400 font-medium">
            Seuil strict : Viabilité ≥ {viabilityThreshold}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Paniers Sauvetage Récupérés</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {totalRecoveredCarts} / {carts.length}
          </div>
          <div className="text-xs text-emerald-300 font-medium">
            Taux de récupération IA : {carts.length ? Math.round((totalRecoveredCarts / carts.length) * 100) : 0}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Preuves Sociales Live</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">
            {socialProofs.length} <span className="text-sm font-normal text-slate-400">acheteurs</span>
          </div>
          <div className="text-xs text-amber-400 font-medium">
            Transactions vérifiées on-chain & fiat
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Opportunités B2B Détectées</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-teal-300 font-mono">
            {b2bLeads.length} <span className="text-sm font-normal text-slate-400">deals</span>
          </div>
          <div className="text-xs text-teal-400 font-medium">
            Pitches B2B personnalisés
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'affiliates' as const, label: 'Réseau d\'Affiliation & Partenaires', count: affiliates.length, icon: Users },
          { id: 'promo_kits' as const, label: 'Kits Supports Promotionnels (Vidéo/Audio/Texte)', count: promoKits.length, icon: Video },
          { id: 'abandoned_carts' as const, label: 'Relance Autonome Paniers', count: carts.length, icon: ShoppingCart },
          { id: 'social_proof' as const, label: 'Preuve Sociale & FOMO Live', count: socialProofs.length, icon: Radio },
          { id: 'b2b' as const, label: 'Prospection B2B Développeurs', count: b2bLeads.length, icon: Briefcase }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#16161A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Global Broadcast Notification Banner */}
      {broadcastSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{broadcastSuccessNotice}</span>
          </div>
          <button 
            onClick={() => setActiveTab('promo_kits')}
            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 rounded-lg text-[11px] font-bold border border-emerald-500/30 transition-colors"
          >
            Voir les Kits
          </button>
        </div>
      )}

      {/* TAB CONTENT 1: AFFILIATES WITH STRICT VIABILITY FILTER */}
      {activeTab === 'affiliates' && (
        <div className="space-y-6">
          {/* Autonomous Recruiter Controller Banner */}
          <div className="bg-[#14141A] border border-indigo-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white text-sm">Scan & Recrutement Autonome des Créateurs (&gt;85% Fiabilité Certifiée)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Standard &gt;85% Actif
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  L'agent analyse en continu YouTube, TikTok, X, Podcasts et Newsletters. Seuls les créateurs avec un score de viabilité et d'authenticité ≥ 85% sont automatiquement recrutés et pourvus de kits promotionnels.
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const active = salesExplosionAgents.toggleAutonomousRecruiting();
                    // trigger re-render
                    setViabilityThreshold(salesExplosionAgents.getMinViabilityThreshold());
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    salesExplosionAgents.isAutonomousRecruiting()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${salesExplosionAgents.isAutonomousRecruiting() ? 'animate-pulse text-emerald-400' : ''}`} />
                  <span>{salesExplosionAgents.isAutonomousRecruiting() ? 'Autopilote Recrutement : ON' : 'Autopilote : OFF'}</span>
                </button>

                <div className="flex items-center gap-2 bg-[#1A1A22] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Volume Scan :</span>
                  {[10, 25, 50, 100, 250, 500].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setScoutBatchSize(sz)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        scoutBatchSize === sz ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-[#1A1A22] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Seuil Fiabilité :</span>
                  <select
                    value={Math.max(85, viabilityThreshold)}
                    onChange={e => handleThresholdChange(Number(e.target.value))}
                    className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                  >
                    <option value={85}>85% (Standard Certifié)</option>
                    <option value={88}>88% (Excellence Alpha)</option>
                    <option value={90}>90% (Top 5% Créateurs)</option>
                    <option value={95}>95% (Élite Mondiale)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRunMassScout(scoutBatchSize)}
                  disabled={isScouting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isScouting ? 'Analyse...' : 'Lancer Scan Immédiat'}</span>
                </button>
              </div>
            </div>

            {/* Last Scout Report */}
            {lastScoutResult && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs animate-fade-in">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Dernier scan terminé : <strong className="text-white">{lastScoutResult.total}</strong> créateurs analysés •{' '}
                    <strong className="text-emerald-400">{lastScoutResult.viable} viables recrutés</strong> •{' '}
                    <strong className="text-rose-400">{lastScoutResult.rejected} écartés</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Filtrage mathématique temps réel</span>
              </div>
            )}
          </div>

          {/* Sub-Filters Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setAffiliateFilter('viable'); setAffiliatePage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  affiliateFilter === 'viable'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#111114] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Viables & Recrutés ({viableCount.toLocaleString()})</span>
              </button>

              <button
                onClick={() => { setAffiliateFilter('rejected'); setAffiliatePage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  affiliateFilter === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-[#111114] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejetés ({rejectedCount.toLocaleString()})</span>
              </button>

              <button
                onClick={() => { setAffiliateFilter('all'); setAffiliatePage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  affiliateFilter === 'all'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-[#111114] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Tous ({(viableCount + rejectedCount).toLocaleString()})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher créateur, code, handle..."
                  value={affiliateSearchTerm}
                  onChange={e => {
                    setAffiliateSearchTerm(e.target.value);
                    setAffiliatePage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#111114] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="text-xs text-slate-400 whitespace-nowrap">
                <strong className="text-white">{displayedAffiliates.length.toLocaleString()}</strong> créateurs
              </div>
            </div>
          </div>

          {/* Affiliates List Table / Cards */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Créateur & Média</th>
                    <th className="py-3 px-3">Canal</th>
                    <th className="py-3 px-3">Audience & Engagement</th>
                    <th className="py-3 px-3">Score Viabilité IA</th>
                    <th className="py-3 px-3">CA Mensuel Estimé</th>
                    <th className="py-3 px-3">Code & Comm.</th>
                    <th className="py-3 px-3">Supports Promotionnels</th>
                    <th className="py-3 px-3">Décision de l'Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedAffiliates.map(aff => {
                    const isViable = aff.viabilityStatus !== 'not_viable';
                    return (
                      <tr key={aff.id} className="hover:bg-[#16161A] transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {aff.channel === 'youtube' ? '🎥' : aff.channel === 'twitter' ? '🐦' : aff.channel === 'newsletter' ? '📰' : aff.channel === 'tiktok' ? '📱' : aff.channel === 'podcast' ? '🎙️' : aff.channel === 'linkedin' ? '💼' : '🌐'}
                            </span>
                            <div>
                              <div>{aff.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{aff.handle}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 capitalize text-slate-300 font-mono">{aff.channel}</td>

                        <td className="py-3.5 px-3">
                          <div className="text-slate-200 font-mono font-bold">
                            {(aff.subscribersCount || 15000).toLocaleString()} abonnés
                          </div>
                          <div className="text-[11px] text-emerald-400 font-semibold">
                            {aff.engagementRate ? `${aff.engagementRate}% engagement` : '4.5% engagement'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (aff.viabilityScore || 85) >= viabilityThreshold ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${aff.viabilityScore || 85}%` }}
                              />
                            </div>
                            <span className={`font-mono font-bold ${
                              (aff.viabilityScore || 85) >= viabilityThreshold ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {aff.viabilityScore || 85}%
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Niche match: {aff.audienceMatch || 90}% • Trust: {aff.trustScore || 90}%
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-200">
                          €{(aff.estimatedMonthlyGMV || 1500).toLocaleString()} / mois
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-mono font-bold text-indigo-400">{aff.referralCode}</div>
                          <div className="text-[10px] text-slate-400">{aff.commissionRate}% comm.</div>
                        </td>

                        {/* Supports Promotionnels Action */}
                        <td className="py-3.5 px-3">
                          {isViable ? (
                            <button
                              onClick={() => handleOpenPromoModal(aff)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1.5 transition-all text-[11px]"
                            >
                              <Video className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Kit Promo ({aff.channel})</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600 italic">Non éligible</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {isViable ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Viable & Actif</span>
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" />
                                <span>Rejeté</span>
                              </span>
                              <div className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                                {aff.rejectionReason}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-400">
                  Affichage de <strong className="text-white">{(currentAffiliatePage - 1) * affiliatePageSize + 1}</strong> à{' '}
                  <strong className="text-white">{Math.min(currentAffiliatePage * affiliatePageSize, displayedAffiliates.length)}</strong> sur{' '}
                  <strong className="text-indigo-400">{displayedAffiliates.length.toLocaleString()}</strong> créateurs
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAffiliatePage(1)}
                    disabled={currentAffiliatePage === 1}
                    className="px-2.5 py-1 rounded-lg bg-[#16161A] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 border border-slate-800"
                  >
                    Premier
                  </button>

                  <button
                    onClick={() => setAffiliatePage(prev => Math.max(1, prev - 1))}
                    disabled={currentAffiliatePage === 1}
                    className="p-1.5 rounded-lg bg-[#16161A] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 border border-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 rounded-lg font-mono font-bold">
                    Page {currentAffiliatePage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setAffiliatePage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentAffiliatePage === totalPages}
                    className="p-1.5 rounded-lg bg-[#16161A] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 border border-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setAffiliatePage(totalPages)}
                    disabled={currentAffiliatePage === totalPages}
                    className="px-2.5 py-1 rounded-lg bg-[#16161A] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 border border-slate-800"
                  >
                    Dernier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROMO KITS (VIDÉO, AUDIO, TEXTE) */}
      {activeTab === 'promo_kits' && (
        <div className="space-y-6">
          {/* Header & Broadcast Controller */}
          <div className="bg-[#14141A] border border-indigo-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>MOTEUR DE SUPPORTS PROMOTIONNELS MULTI-CANAUX</span>
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Génération & Transmission des Supports de Vente (Vidéo, Audio, Texte)
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  L'agent génère automatiquement des kits complets adaptés aux plateformes de chaque partenaire : Storyboards 9:16 pour TikTok/Reels, Scripts 16:9 pour YouTube, Scripts Audio Host-Read pour Podcasts, Threads X et Campagnes Email.
                </p>
              </div>

              <button
                onClick={handleBroadcastAllPacks}
                disabled={isBroadcastingAllPacks}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{isBroadcastingAllPacks ? 'Distribution en cours...' : 'Diffuser Kits à Tous les Partenaires'}</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2 bg-[#181822] px-3 py-1.5 rounded-xl border border-slate-800 flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher par affilié, produit, code..."
                  value={promoSearchTerm}
                  onChange={e => setPromoSearchTerm(e.target.value)}
                  className="bg-transparent text-white text-xs outline-none w-full placeholder-slate-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { key: 'all', label: 'Tous les canaux' },
                  { key: 'youtube', label: '🎥 YouTube' },
                  { key: 'tiktok', label: '📱 TikTok/Shorts' },
                  { key: 'podcast', label: '🎙️ Podcast' },
                  { key: 'twitter', label: '🐦 X / Twitter' },
                  { key: 'newsletter', label: '📰 Newsletter' },
                  { key: 'linkedin', label: '💼 LinkedIn' }
                ].map(c => (
                  <button
                    key={c.key}
                    onClick={() => setPromoFilterChannel(c.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      promoFilterChannel === c.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-[#181822] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards Grid of Kits */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPromoKits.map(kit => {
              const aff = affiliates.find(a => a.id === kit.affiliateId);
              return (
                <div 
                  key={kit.id} 
                  className="bg-[#111114] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all"
                >
                  <div className="space-y-3">
                    {/* Top Creator Badge & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {kit.affiliateChannel === 'youtube' ? '🎥' : kit.affiliateChannel === 'tiktok' ? '📱' : kit.affiliateChannel === 'podcast' ? '🎙️' : kit.affiliateChannel === 'newsletter' ? '📰' : '🐦'}
                        </span>
                        <div>
                          <div className="font-bold text-white text-xs">{kit.affiliateName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{kit.affiliateHandle} ({kit.affiliateChannel})</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        kit.transmissionStatus === 'transmitted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {kit.transmissionStatus === 'transmitted' ? 'Transmis' : 'Prêt'}
                      </span>
                    </div>

                    {/* Product & Promo Details */}
                    <div className="p-3 rounded-xl bg-[#161620] border border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Produit Promotionné :</div>
                      <div className="font-bold text-indigo-300 text-xs truncate">{kit.productTitle}</div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                        <span className="font-mono text-emerald-400 font-bold">Code : {kit.referralCode} (-{kit.discountPercent}%)</span>
                        <span className="text-slate-400">Prix : €{kit.productPrice}</span>
                      </div>
                    </div>

                    {/* Available Multi-modal Formats */}
                    <div className="space-y-2 text-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supports Inclus :</div>
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
                        <div className="bg-[#181824] p-1.5 rounded-lg border border-slate-800 text-indigo-300 flex items-center justify-center gap-1">
                          <Video className="w-3 h-3 text-indigo-400" />
                          <span>Vidéo ({kit.videoKit.durationSeconds}s)</span>
                        </div>
                        <div className="bg-[#181824] p-1.5 rounded-lg border border-slate-800 text-emerald-300 flex items-center justify-center gap-1">
                          <Mic className="w-3 h-3 text-emerald-400" />
                          <span>Audio (60s)</span>
                        </div>
                        <div className="bg-[#181824] p-1.5 rounded-lg border border-slate-800 text-amber-300 flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>Copywriting</span>
                        </div>
                      </div>

                      {/* Hook Preview */}
                      <div className="text-[11px] text-slate-300 bg-[#14141C] p-2.5 rounded-lg border border-slate-800/60 italic truncate">
                        « {kit.videoKit.hookVariations[0] || kit.textKit.headlineHooks[0]} »
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyLink(kit.affiliateTrackingUrl, kit.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Copier le lien d'affiliation tracké"
                    >
                      {copiedKitId === kit.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKitId === kit.id ? 'Copié' : 'Lien'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const md = affiliatePromoKitService.generateMarkdownExport(kit);
                        downloadAffiliatePromoKitMarkdown(md, kit.affiliateHandle, kit.productTitle);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Télécharger le pack complet (.MD)"
                    >
                      <Download className="w-3 h-3 text-indigo-400" />
                      <span>.MD</span>
                    </button>

                    <button
                      onClick={() => {
                        if (aff) {
                          handleOpenPromoModal(aff);
                        } else {
                          handleOpenPromoModal({
                            id: kit.affiliateId,
                            name: kit.affiliateName,
                            email: `${kit.affiliateHandle.replace('@', '')}@partner.io`,
                            channel: kit.affiliateChannel,
                            handle: kit.affiliateHandle,
                            referralCode: kit.referralCode,
                            commissionRate: 30,
                            totalReferredSales: 12,
                            totalRevenueGenerated: 850,
                            totalPayoutsEur: 255,
                            status: 'active',
                            recruitedByAgentAt: new Date().toISOString()
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-md shadow-indigo-600/20"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Ouvrir Studio</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Promo Kits Pagination Controls */}
          {totalPromoKitPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
              <div className="text-slate-400">
                Affichage de <span className="text-white font-semibold">{((promoKitPage - 1) * PROMO_KITS_PAGE_SIZE) + 1}</span> à <span className="text-white font-semibold">{Math.min(promoKitPage * PROMO_KITS_PAGE_SIZE, filteredPromoKits.length)}</span> sur <span className="text-white font-semibold">{filteredPromoKits.length}</span> kits promotionnels
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPromoKitPage(p => Math.max(1, p - 1))}
                  disabled={promoKitPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-[#141418] border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                  Page {promoKitPage} / {totalPromoKitPages}
                </div>
                <button
                  onClick={() => setPromoKitPage(p => Math.min(totalPromoKitPages, p + 1))}
                  disabled={promoKitPage === totalPromoKitPages}
                  className="px-3 py-1.5 rounded-lg bg-[#141418] border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ABANDONED CARTS */}
      {activeTab === 'abandoned_carts' && (
        <div className="space-y-6">
          {/* Header & Autonomous Control Bar */}
          <div className="bg-[#14141A] border border-emerald-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>MOTEUR DE RELANCE PANIER IA ILLIMITÉ (24/24H)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Zéro Quota • Sans Limites
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Récupération & Conversion Autonome des Paniers Abandonnés
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  L'IA intercepte en continu les abandons de session et déploie des séquences de conversion sur-mesure (diagnostic d'hésitation, remises dynamiques progressives de 10% à 30%, et objection busting personnalisé) pour transformer chaque visiteur en acheteur vérifié.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleToggleAutoRecovery}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                    salesExplosionAgents.isAutonomousCartRecovery()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${salesExplosionAgents.isAutonomousCartRecovery() ? 'animate-pulse text-emerald-400' : ''}`} />
                  <span>{salesExplosionAgents.isAutonomousCartRecovery() ? 'Autopilote Panier : ACTIF' : 'Autopilote : PAUSE'}</span>
                </button>

                <button
                  onClick={handleSimulateDropoff}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Simuler Abandon</span>
                </button>

                <button
                  onClick={handleBatchRecoverAll}
                  disabled={isBatchRecovering || carts.filter(c => c.recoveryStep !== 'recovered').length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isBatchRecovering ? 'Conversion en cours...' : '⚡ Récupérer Tout en 1-Clic'}</span>
                </button>
              </div>
            </div>

            {batchFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{batchFeedback}</span>
              </div>
            )}

            {/* Performance KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
              <div className="bg-[#111116] p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Récupéré (€)</div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">€{cartMetrics.totalRecoveredRevenueEur.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{cartMetrics.totalRecovered} commandes finalisées</div>
              </div>

              <div className="bg-[#111116] p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Taux de Récupération</div>
                <div className="text-xl font-extrabold text-indigo-400 font-mono">{cartMetrics.recoveryRatePercent}%</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span>+28% vs moyenne SaaS</span>
                </div>
              </div>

              <div className="bg-[#111116] p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Paniers en Séquence</div>
                <div className="text-xl font-extrabold text-white font-mono">{cartMetrics.activeSequenceCount}</div>
                <div className="text-[10px] text-amber-400">Relances actives (Étape 1-5)</div>
              </div>

              <div className="bg-[#111116] p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Potentiel en Attente</div>
                <div className="text-xl font-extrabold text-amber-300 font-mono">€{cartMetrics.pendingRecoveryRevenueEur.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">À convertir en automatique</div>
              </div>
            </div>
          </div>

          {/* Active Carts List */}
          <div className="space-y-3">
            {carts.length === 0 ? (
              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Aucun abandon de panier en attente</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Le système est en écoute active sur de vrais visiteurs (aucun panier ni conversion n’est simulé : 100 % réel).
                </p>
                <button
                  onClick={handleSimulateDropoff}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Générer un Panier Test</span>
                </button>
              </div>
            ) : (
              carts.map(cart => {
                const isRecovered = cart.recoveryStep === 'recovered';
                const stepNum = typeof cart.recoveryStep === 'number' ? cart.recoveryStep : 5;
                const minutesAgo = Math.round((Date.now() - new Date(cart.abandonedAt).getTime()) / 60000);

                const diagnosticLabels: Record<string, { label: string; color: string }> = {
                  price_point: { label: 'Sensibilité au Prix', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
                  proof_validation: { label: 'Validation Preuve & Sécurité', color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
                  distraction: { label: 'Distraction Visiteur', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
                  technical_question: { label: 'Doute Technique', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
                  urgency_doubt: { label: 'Manque d\'Urgence', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20' }
                };

                const diag = diagnosticLabels[cart.aiHesitationReason || 'proof_validation'];

                return (
                  <div 
                    key={cart.id} 
                    className={`p-5 rounded-2xl border transition-all ${
                      isRecovered 
                        ? 'bg-[#111614] border-emerald-500/30 shadow-sm' 
                        : 'bg-[#121216] border-slate-800 hover:border-slate-700'
                    } space-y-4`}
                  >
                    {/* Top line info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{cart.productTitle}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-900 text-emerald-400 border border-slate-800">
                            €{cart.cartValue}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isRecovered 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                              : cart.recoveryStep === 'awaiting_payment'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {isRecovered ? '🎉 Panier Récupéré & Payé' : cart.recoveryStep === 'awaiting_payment' ? '⏳ Paiement en attente' : `Étape de Relance ${stepNum}/5`}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${diag.color}`}>
                            🧠 {diag.label}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Prospect : <strong className="text-slate-200">{cart.customerName || cart.email}</strong> ({cart.email})</span>
                          <span>•</span>
                          <span>{cart.country || 'International'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {cart.device === 'mobile' ? <Smartphone className="w-3 h-3 text-slate-400" /> : <Laptop className="w-3 h-3 text-slate-400" />}
                            <span>{cart.device || 'desktop'}</span>
                          </span>
                          <span>•</span>
                          <span className="text-slate-500">Abandonné il y a {minutesAgo} min</span>
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-indigo-400">{cart.recoveryDiscountCode}</div>
                          <div className="text-[10px] text-slate-400">-{cart.recoveryDiscountPercent}% appliquée</div>
                        </div>

                        {isRecovered ? (
                          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Converti (+€{Math.round(cart.cartValue * (1 - cart.recoveryDiscountPercent / 100))})</span>
                          </div>
                        ) : cart.recoveryStep === 'awaiting_payment' ? (
                          <div 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-help"
                            title="Le client a cliqué sur le lien de relance. En attente de validation Webhooks (Stripe / Blockchain)."
                          >
                            <div className="w-3 h-3 border-2 border-amber-500/50 border-t-amber-400 rounded-full animate-spin"></div>
                            <span>Attente Stripe...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTriggerRecovery(cart.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                          >
                            <Send className="w-3 h-3" />
                            <span>{stepNum >= 5 ? 'Lien Cliqué (Attente)' : `Envoyer Relance #${stepNum + 1}`}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCart(cart.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Supprimer le panier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Step Timeline Indicator */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        {[
                          { step: 1, label: 'T+5m (Rappel -10%)' },
                          { step: 2, label: 'T+30m (VIP -15%)' },
                          { step: 3, label: 'T+2h (Garantie -20%)' },
                          { step: 4, label: 'T+6h (Bonus -25%)' },
                          { step: 5, label: 'T+24h (Ultime -30%)' }
                        ].map(st => {
                          const isActive = !isRecovered && stepNum === st.step;
                          const isDone = isRecovered || stepNum > st.step;
                          return (
                            <div 
                              key={st.step}
                              className={`flex-1 text-center py-1 rounded-md border text-[10px] font-semibold transition-all ${
                                isDone 
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                                  : isActive 
                                  ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/40 ring-1 ring-indigo-500/30 font-bold'
                                  : 'bg-slate-900/50 text-slate-500 border-slate-800/60'
                              }`}
                            >
                              {st.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Copywriting Snippet */}
                    {cart.aiPersonalizedSubject && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800/60 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400">
                          <Sparkles className="w-3 h-3" />
                          <span>Accroche & Email IA Généré en Direct :</span>
                        </div>
                        <div className="text-slate-300 font-medium text-[11px]">
                          <strong>Objet :</strong> {cart.aiPersonalizedSubject}
                        </div>
                        {cart.aiPersonalizedBody && (
                          <div className="text-slate-400 text-[10px] line-clamp-1 italic">
                            "{cart.aiPersonalizedBody}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: SOCIAL PROOF */}
      {activeTab === 'social_proof' && (
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Flux de Preuve Sociale & Transactions Vérifiées en Direct</span>
            </h3>
            <span className="text-xs text-slate-400">Affiché en direct sur la boutique</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {socialProofs.map(sp => (
              <div key={sp.id} className="p-4 rounded-xl bg-[#16161A] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {sp.buyerName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{sp.buyerName}</div>
                      <div className="text-[10px] text-slate-400">{sp.cityCountry}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-emerald-400 border border-slate-800">
                    €{sp.amount}
                  </span>
                </div>

                <div className="text-xs text-slate-300 line-clamp-1">{sp.productTitle}</div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                  <span className="uppercase font-mono flex items-center gap-1">
                    {sp.paymentMethod.toUpperCase()} {sp.verifiedOnChain && '⛓️ On-Chain'}
                  </span>
                  <span>{new Date(sp.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: B2B HARVESTER */}
      {activeTab === 'b2b' && (
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-400" />
              <span>Pépites B2B & Pitches Personnalisés pour Développeurs</span>
            </h3>
            <span className="text-xs text-slate-400">Licences commerciales & Agences</span>
          </div>

          <div className="space-y-3">
            {b2bLeads.map(lead => (
              <div key={lead.id} className="p-4 rounded-xl bg-[#16161A] border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{lead.targetCompanyOrProject}</span>
                      <span className="text-[10px] text-slate-400">({lead.contactRole})</span>
                    </div>
                    <div className="text-[11px] text-indigo-400 font-mono">{lead.contactHandle}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-teal-400">Deal: €{lead.estimatedDealSizeEur}</div>
                      <div className="text-[10px] text-slate-400">Score de fit: {lead.matchScore}%</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 uppercase">
                      {lead.outreachStatus}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-900 text-xs text-slate-300 font-mono leading-relaxed">
                  💬 <strong className="text-indigo-300">Pitch IA :</strong> "{lead.customPitchHook}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recruiter Modal with Live Viability Assessment */}
      {showAffiliateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#141418] border border-slate-800 p-6 rounded-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Tester & Recruter un Partenaire</span>
              </h3>
              <button onClick={() => setShowAffiliateModal(false)} className="text-slate-500 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              L'agent évaluera la viabilité selon l'audience, l'engagement et l'alignement niche avant de valider l'inscription.
            </p>

            <form onSubmit={handleCreateAffiliate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nom du Créateur / Média</label>
                <input
                  type="text"
                  required
                  value={newAffName}
                  onChange={e => setNewAffName(e.target.value)}
                  placeholder="ex: Lucas Tech Reviews"
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Canal Principal</label>
                  <select
                    value={newAffChannel}
                    onChange={e => setNewAffChannel(e.target.value as any)}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="newsletter">Newsletter Substack</option>
                    <option value="blog">Blog Tech / Dev.to</option>
                    <option value="tiktok">TikTok Tech</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Code Promo Dédié</label>
                  <input
                    type="text"
                    required
                    value={newAffCode}
                    onChange={e => setNewAffCode(e.target.value)}
                    placeholder="ex: LUCAS30"
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Abonnés</label>
                  <input
                    type="number"
                    min={1000}
                    value={newAffSubs}
                    onChange={e => setNewAffSubs(Number(e.target.value))}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Engagement (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={25}
                    value={newAffEngagement}
                    onChange={e => setNewAffEngagement(Number(e.target.value))}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Affinité Niche</label>
                  <select
                    value={newAffNiche}
                    onChange={e => setNewAffNiche(e.target.value as any)}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="high">Élevée (Dev/IA)</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Faible</option>
                  </select>
                </div>
              </div>

              {/* Viability Pre-Check Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-300">Test de Viabilité Immédiat :</div>
                  <div className="text-[10px] text-slate-400">
                    {newAffEngagement >= 2.8 && newAffNiche !== 'low' ? '✅ Profil estimé rentable' : '⚠️ Risque de rejet par le filtre'}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                  newAffEngagement >= 2.8 && newAffNiche !== 'low' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {newAffEngagement >= 2.8 && newAffNiche !== 'low' ? 'Éligible ≥75%' : '<75% Non Viable'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAffiliateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Évaluer & Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Affiliate Promo Kit Multi-modal Studio Modal */}
      {selectedAffiliateForPromo && (
        <AffiliatePromoKitModal
          isOpen={Boolean(selectedAffiliateForPromo)}
          onClose={() => {
            setSelectedAffiliateForPromo(null);
          }}
          affiliate={selectedAffiliateForPromo}
        />
      )}
    </div>
  );
};
