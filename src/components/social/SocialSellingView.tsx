import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, 
  Sparkles, 
  Send, 
  MessageSquare, 
  Users, 
  Zap, 
  TrendingUp, 
  Flame, 
  Video, 
  Twitter, 
  Linkedin, 
  Copy, 
  CheckCircle2, 
  Play, 
  Check, 
  ExternalLink,
  DollarSign,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { store } from '../../services/store';
import { socialSellingAgents, ViralHook, DmAutomationRule, CommunitySeedPost, InfluencerOutreachCampaign } from '../../services/socialSellingAgents';
import { autonomousEngine } from '../../services/autonomousEngine';
import { DigitalProduct } from '../../types';

export const SocialSellingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hooks' | 'dm_funnel' | 'community' | 'influencers'>('hooks');
  const [hooks, setHooks] = useState<ViralHook[]>(socialSellingAgents.getViralHooks());
  const [dmRules, setDmRules] = useState<DmAutomationRule[]>(socialSellingAgents.getDmRules());
  const [communityPosts, setCommunityPosts] = useState<CommunitySeedPost[]>(socialSellingAgents.getCommunityPosts());
  const [influencers, setInfluencers] = useState<InfluencerOutreachCampaign[]>(socialSellingAgents.getInfluencerOutreach());
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedProductForHook, setSelectedProductForHook] = useState<string>(products[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks Search, Filter & Pagination
  const [hookSearch, setHookSearch] = useState('');
  const [hookChannelFilter, setHookChannelFilter] = useState<'all' | 'tiktok' | 'twitter' | 'linkedin' | 'instagram'>('all');
  const [hookPage, setHookPage] = useState(1);
  const HOOKS_PER_PAGE = 12;

  const filteredHooks = useMemo(() => {
    return hooks.filter(hook => {
      const matchesChannel = hookChannelFilter === 'all' || hook.channel === hookChannelFilter;
      const matchesSearch = !hookSearch || 
        hook.hookText.toLowerCase().includes(hookSearch.toLowerCase()) ||
        hook.bodyScript.toLowerCase().includes(hookSearch.toLowerCase()) ||
        hook.productTitle.toLowerCase().includes(hookSearch.toLowerCase()) ||
        hook.hookType.toLowerCase().includes(hookSearch.toLowerCase());
      return matchesChannel && matchesSearch;
    });
  }, [hooks, hookChannelFilter, hookSearch]);

  const totalHookPages = Math.max(1, Math.ceil(filteredHooks.length / HOOKS_PER_PAGE));
  const paginatedHooks = useMemo(() => {
    const start = (hookPage - 1) * HOOKS_PER_PAGE;
    return filteredHooks.slice(start, start + HOOKS_PER_PAGE);
  }, [filteredHooks, hookPage]);

  useEffect(() => {
    setHookPage(1);
  }, [hookSearch, hookChannelFilter]);

  // New DM rule modal state
  const [showDmModal, setShowDmModal] = useState(false);
  const [dmKeyword, setDmKeyword] = useState('');
  const [dmPlatform, setDmPlatform] = useState<'instagram' | 'twitter' | 'linkedin'>('instagram');
  const [dmProdId, setDmProdId] = useState(products[0]?.id || '');
  const [dmDiscount, setDmDiscount] = useState(25);
  const [dmMessage, setDmMessage] = useState('');

  useEffect(() => {
    const unsubStore = store.subscribe(() => {
      setHooks([...socialSellingAgents.getViralHooks()]);
      setDmRules([...socialSellingAgents.getDmRules()]);
      setCommunityPosts([...socialSellingAgents.getCommunityPosts()]);
      setInfluencers([...socialSellingAgents.getInfluencerOutreach()]);
    });
    const unsubEngine = autonomousEngine.subscribe(() => {
      setHooks([...socialSellingAgents.getViralHooks()]);
      setDmRules([...socialSellingAgents.getDmRules()]);
      setCommunityPosts([...socialSellingAgents.getCommunityPosts()]);
    });

    return () => {
      unsubStore();
      unsubEngine();
    };
  }, []);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateViralHooks = () => {
    const prod = products.find(p => p.id === selectedProductForHook) || products[0];
    if (!prod) return;
    setIsGenerating(true);
    setTimeout(() => {
      socialSellingAgents.generateFastHooksForProduct(prod, true);
      setHooks([...socialSellingAgents.getViralHooks()]);
      setIsGenerating(false);
    }, 400);
  };

  const handleGenerateAndPublishAllProducts = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const count = socialSellingAgents.generateAndPublish4HooksForAllProducts();
      setHooks([...socialSellingAgents.getViralHooks()]);
      setIsGenerating(false);
      store.addLog('success', 'marketing', `🚀 ${count} Hooks Viraux générés et PUBLIÉS DIRECTEMENT pour l'ensemble des produits du catalogue !`);
    }, 600);
  };

  const handleRecruitMoreCreators = () => {
    const recruits = socialSellingAgents.recruitUnlimitedCreators(5);
    setInfluencers([...socialSellingAgents.getInfluencerOutreach()]);
  };

  const handlePublishHook = (hookId: string) => {
    socialSellingAgents.publishHookImmediately(hookId);
    setHooks([...socialSellingAgents.getViralHooks()]);
  };

  const handleCreateDmRule = () => {
    if (!dmKeyword.trim()) return;
    const prod = products.find(p => p.id === dmProdId);
    const promoCode = `${dmKeyword.toUpperCase().replace(/\s+/g, '')}${dmDiscount}`;
    
    socialSellingAgents.addDmRule({
      triggerKeyword: dmKeyword.toUpperCase(),
      platform: dmPlatform,
      targetProductId: dmProdId,
      promoCode,
      discountPercent: dmDiscount,
      replyMessage: dmMessage || `Hello ! 👋 Voici ton code secret -${dmDiscount}% (${promoCode}) pour télécharger ${prod?.title || 'le produit'} : https://digitalfactory.io/checkout/${prod?.id}?coupon=${promoCode}`,
      isActive: true
    });

    setDmRules([...socialSellingAgents.getDmRules()]);
    setShowDmModal(false);
    setDmKeyword('');
    setDmMessage('');
  };

  const totalDmRevenue = dmRules.reduce((acc, r) => acc + r.revenueGenerated, 0);
  const totalDmTriggers = dmRules.reduce((acc, r) => acc + r.totalTriggered, 0);
  const totalCommunityReferrals = communityPosts.reduce((acc, p) => acc + p.referralVisits, 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Agents de Vente Rapide sur les Réseaux Sociaux</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Conversion Ultra-Rapide</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Scripts vidéo 3-secondes TikTok/Reels, auto-répondeurs DM & commentaires, threads X et seeding viral Reddit/ProductHunt.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#111114] border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Revenus DM Auto</span>
              <span className="text-emerald-400 font-bold">€{totalDmRevenue.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Trafic Seeding</span>
              <span className="text-indigo-400 font-bold">{totalCommunityReferrals.toLocaleString()} clics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'hooks' as const, label: 'Hooks & Scripts Vidéo (TikTok / Reels / X)', icon: Video, count: hooks.length },
          { id: 'dm_funnel' as const, label: 'Funnels DM & Auto-Commentaires', icon: MessageSquare, count: dmRules.length },
          { id: 'community' as const, label: 'Seeding Reddit & HackerNews', icon: Share2, count: communityPosts.length },
          { id: 'influencers' as const, label: 'Outreach Créateurs Tech (Affiliation 35%)', icon: Users, count: influencers.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[#111114] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: VIRAL HOOKS & SCRIPTS */}
      {activeTab === 'hooks' && (
        <div className="space-y-6 animate-fade-in">
          {/* Action Bar */}
          <div className="bg-[#111114] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs text-slate-400 font-semibold shrink-0">Produit Cible :</label>
              <select
                value={selectedProductForHook}
                onChange={e => setSelectedProductForHook(e.target.value)}
                className="bg-[#16161A] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 w-full md:w-80"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleGenerateViralHooks}
                disabled={isGenerating}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1A1A1E] hover:bg-[#25252A] text-white border border-slate-700 disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>4 Hooks (Ce Produit)</span>
              </button>

              <button
                onClick={handleGenerateAndPublishAllProducts}
                disabled={isGenerating}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Publication Directe...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ 4 Hooks / Produit (Tout le Catalogue - Direct)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search & Channel Filter Toolbar */}
          <div className="bg-[#111114] border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-[#16161A] px-3 py-1.5 rounded-lg border border-slate-800 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher par hook, produit, script..."
                value={hookSearch}
                onChange={e => setHookSearch(e.target.value)}
                className="bg-transparent text-white text-xs outline-none w-full placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: `Tous (${hooks.length})` },
                { key: 'tiktok', label: '📱 TikTok' },
                { key: 'instagram', label: '📷 Instagram' },
                { key: 'twitter', label: '🐦 X / Twitter' },
                { key: 'linkedin', label: '💼 LinkedIn' }
              ].map(c => (
                <button
                  key={c.key}
                  onClick={() => setHookChannelFilter(c.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    hookChannelFilter === c.key
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-[#16161A] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hooks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginatedHooks.map(hook => (
              <div key={hook.id} className="bg-[#111114] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        hook.channel === 'tiktok' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        hook.channel === 'twitter' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        hook.channel === 'linkedin' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {hook.channel.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {hook.hookType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        Score Viral : {hook.engagementScore}%
                      </span>
                      {hook.status === 'viral' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          🔥 En Ligne
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                          Prêt
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hook Text Box */}
                  <div className="bg-[#16161A] p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      <span>Accroche 3-Secondes (Hook)</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-relaxed">
                      "{hook.hookText}"
                    </p>
                  </div>

                  {/* Script Body */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400">Corps du Script & Démontration :</div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 font-sans">
                      {hook.bodyScript}
                    </p>
                  </div>

                  {/* Visual Cue */}
                  <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                    <span className="font-bold text-[10px] uppercase text-amber-400 block">Indication Visuelle :</span>
                    {hook.visualCue}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                  <div className="text-[10px] text-slate-400 font-mono">
                    ~{hook.viewsEstimated.toLocaleString()} vues est.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(`${hook.hookText}\n\n${hook.bodyScript}\n\n${hook.callToAction}`, hook.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === hook.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === hook.id ? 'Copié !' : 'Copier'}</span>
                    </button>

                    {hook.status !== 'viral' && (
                      <button
                        onClick={() => handlePublishHook(hook.id)}
                        className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publier en 1 Clic</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hooks Pagination Controls */}
          {totalHookPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
              <div className="text-slate-400">
                Affichage de <span className="text-white font-semibold">{((hookPage - 1) * HOOKS_PER_PAGE) + 1}</span> à <span className="text-white font-semibold">{Math.min(hookPage * HOOKS_PER_PAGE, filteredHooks.length)}</span> sur <span className="text-white font-semibold">{filteredHooks.length}</span> hooks & scripts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHookPage(p => Math.max(1, p - 1))}
                  disabled={hookPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-[#141418] border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 font-bold">
                  Page {hookPage} / {totalHookPages}
                </div>
                <button
                  onClick={() => setHookPage(p => Math.min(totalHookPages, p + 1))}
                  disabled={hookPage === totalHookPages}
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

      {/* TAB 2: DM & AUTO-COMMENT FUNNELS */}
      {activeTab === 'dm_funnel' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Auto-Répondeur DM & Commentaires (ManyChat / Direct Funnel)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                L’agent écoute les mots-clés postés sous vos vidéos et envoie instantanément le lien de paiement avec un code promo personnalisé par DM.
              </p>
            </div>

            <button
              onClick={() => setShowDmModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Trigger DM</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dmRules.map(rule => (
              <div key={rule.id} className="bg-[#111114] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Mot-Clé : "{rule.triggerKeyword}"
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      rule.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {rule.isActive ? '● Écoute Active' : 'En Pause'}
                    </span>
                  </div>

                  <div className="bg-[#16161A] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Message DM Automatique :</span>
                    <p className="line-clamp-3 italic">"{rule.replyMessage}"</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <div className="text-[9px] text-slate-500 uppercase">DMs Envoyés</div>
                      <div className="text-xs font-bold text-white">{rule.totalTriggered}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <div className="text-[9px] text-slate-500 uppercase">Ventes</div>
                      <div className="text-xs font-bold text-indigo-400">{rule.conversionsCount}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <div className="text-[9px] text-slate-500 uppercase">Revenus</div>
                      <div className="text-xs font-bold text-emerald-400">€{rule.revenueGenerated}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Remise : -{rule.discountPercent}%</span>
                  <button
                    onClick={() => {
                      socialSellingAgents.toggleDmRule(rule.id);
                      setDmRules([...socialSellingAgents.getDmRules()]);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    {rule.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMMUNITY SEEDING */}
      {activeTab === 'community' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Seeding Organique & Posts Viraux (Reddit, HackerNews, ProductHunt)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Distribution éthique sans spam : L'agent formule des études de cas complètes et des retours d'expérience apportant une valeur maximale aux développeurs et créateurs.
            </p>
          </div>

          <div className="space-y-4">
            {communityPosts.map(post => (
              <div key={post.id} className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {post.platform.toUpperCase()} • {post.subredditOrChannel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Stratégie : {post.strategy.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-amber-400 font-bold">▲ {post.upvotesCount} upvotes</span>
                    <span className="text-indigo-400 font-bold">{post.referralVisits} visites</span>
                    <span className="text-emerald-400 font-bold">{post.salesAttributed} ventes</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white">{post.postTitle}</h3>
                <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-900 font-sans leading-relaxed">
                  {post.postContent}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleCopyText(`${post.postTitle}\n\n${post.postContent}`, post.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === post.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === post.id ? 'Texte Copié !' : 'Copier le Post Entier'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TECH INFLUENCER OUTREACH */}
      {activeTab === 'influencers' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Outreach & Recrutement Créateurs Tech (Sans Limite)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {influencers.length} Créateurs en Base
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scan et recrutement automatisé de créateurs YouTube, TikTok et X avec propositions personnalisées et reversement de **35% de commissions d'affiliation**.
              </p>
            </div>

            <button
              onClick={handleRecruitMoreCreators}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>🚀 Scanner & Recruter +5 Créateurs</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {influencers.map(inf => (
              <div key={inf.id} className="bg-[#111114] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white">{inf.creatorName}</h3>
                      <div className="text-[10px] text-slate-400">{inf.handle} • {inf.followersCount}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      inf.status === 'partnered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {inf.status === 'partnered' ? '🤝 Partenaire Actif' : 'Négociation'}
                    </span>
                  </div>

                  <div className="bg-[#16161A] p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Objet du Pitch :</div>
                    <p className="text-xs font-semibold text-white">{inf.pitchSubject}</p>
                    <div className="text-[10px] font-bold text-slate-400 uppercase pt-1">Message personnalisé :</div>
                    <p className="text-xs text-slate-300 italic line-clamp-3">"{inf.pitchBody}"</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-emerald-400 font-mono font-bold">Commission : {inf.affiliateCommission}%</span>
                  <button
                    onClick={() => handleCopyText(inf.pitchBody, inf.id)}
                    className="px-2.5 py-1 rounded bg-[#1A1A1E] text-slate-300 text-xs font-semibold border border-slate-700 hover:text-white"
                  >
                    {copiedId === inf.id ? 'Copié !' : 'Copier Pitch'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE DM RULE MODAL */}
      {showDmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Nouveau Trigger DM / Commentaire</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Mot-Clé Déclencheur (ex: NOTION, CODE, IA) :</label>
                <input
                  type="text"
                  value={dmKeyword}
                  onChange={e => setDmKeyword(e.target.value)}
                  placeholder="EX: PROMPTS"
                  className="w-full bg-[#16161A] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Plateforme :</label>
                <select
                  value={dmPlatform}
                  onChange={e => setDmPlatform(e.target.value as any)}
                  className="w-full bg-[#16161A] border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Produit Associé :</label>
                <select
                  value={dmProdId}
                  onChange={e => setDmProdId(e.target.value)}
                  className="w-full bg-[#16161A] border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Remise Offerte (%) :</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={dmDiscount}
                  onChange={e => setDmDiscount(Number(e.target.value))}
                  className="w-full bg-[#16161A] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Message Personnalisé (laisser vide pour auto-généré) :</label>
                <textarea
                  value={dmMessage}
                  onChange={e => setDmMessage(e.target.value)}
                  placeholder="Hello ! Voici ton code secret..."
                  className="w-full bg-[#16161A] border border-slate-700 rounded-lg px-3 py-2 text-white h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateDmRule}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Activer l'Agent DM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
