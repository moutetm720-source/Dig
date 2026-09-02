import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Share2, 
  Sparkles, 
  Link as LinkIcon, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Settings, 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Play, 
  Layers, 
  DollarSign, 
  Sliders, 
  Tag, 
  ShieldCheck,
  Video,
  Clock,
  ChevronRight,
  ChevronLeft,
  Eye,
  MousePointerClick,
  Filter,
  Zap,
  Radio,
  FileText,
  LayoutGrid,
  Key,
  Activity,
  Check,
  Volume2,
  Tv
} from 'lucide-react';
import { globalSocialService } from '../../services/globalSocialService';
import { countryKeywordsEngine } from '../../services/countryKeywordsEngine';
import { store } from '../../services/store';
import { 
  GlobalSocialPost, 
  SocialChannelAccount, 
  TargetCountryCode, 
  TargetLanguageCode, 
  SocialPlatformType,
  SocialRedirectStrategy,
  ContentFormatType,
  ContentCreativeStyle,
  ContentTargetDuration
} from '../../types';

export const GlobalSocialCreatorView: React.FC = () => {
  const [state, setState] = useState(globalSocialService.getState());
  const [products, setProducts] = useState(store.getProducts());
  const [activeTab, setActiveTab] = useState<'generator' | 'accounts' | 'direct_access' | 'countries' | 'country_keywords'>('generator');
  const [keywordsList, setKeywordsList] = useState(() => countryKeywordsEngine.getAllKeywords());
  const [selectedKwCountry, setSelectedKwCountry] = useState<string>('all');
  const [newKwCountry, setNewKwCountry] = useState<TargetCountryCode>('FR');
  const [newKwText, setNewKwText] = useState('');
  const [newKwIntent, setNewKwIntent] = useState<'commercial_buy' | 'high_intent_solution' | 'educational_template' | 'trending_tool'>('commercial_buy');
  const [newKwVolume, setNewKwVolume] = useState(15000);
  const [newKwCategory, setNewKwCategory] = useState<'saas_os' | 'ai_prompts' | 'boilerplate_dev' | 'automation_n8n' | 'all'>('saas_os');
  
  // Post generation form state
  const [selectedAccountId, setSelectedAccountId] = useState(state.accounts[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [targetCountry, setTargetCountry] = useState<TargetCountryCode>('FR');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguageCode>('fr');
  const [selectedHookType, setSelectedHookType] = useState<GlobalSocialPost['hookCategory']>('shocking_contrast');
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatType>('vertical_video');
  const [selectedStyle, setSelectedStyle] = useState<ContentCreativeStyle>('direct_response');
  const [selectedDuration, setSelectedDuration] = useState<ContentTargetDuration>('30s');
  
  // Feed filters & Pagination
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [postsPage, setPostsPage] = useState(1);
  const POSTS_PER_PAGE = 20;
  
  const filteredPosts = useMemo(() => {
    return state.posts.filter(post => {
      if (filterProduct !== 'all' && post.productTargetId !== filterProduct) return false;
      if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
      if (filterCountry !== 'all' && post.targetCountry !== filterCountry) return false;
      return true;
    });
  }, [state.posts, filterProduct, filterPlatform, filterCountry]);

  const totalPostsPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = useMemo(() => {
    const start = (postsPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, postsPage]);

  // Reset page when filters change
  useEffect(() => {
    setPostsPage(1);
  }, [filterProduct, filterPlatform, filterCountry]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit account modal / drawer state
  const [editingAccount, setEditingAccount] = useState<SocialChannelAccount | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [newAccForm, setNewAccForm] = useState({
    platform: 'tiktok' as SocialPlatformType,
    accountName: '',
    handle: '',
    profileUrl: '',
    customWebhookUrl: '',
    targetCountries: ['FR'] as TargetCountryCode[],
    targetLanguages: ['fr'] as TargetLanguageCode[],
    defaultRedirectType: 'direct_product' as SocialRedirectStrategy,
    defaultDiscountPercent: 20,
    postingFrequencyHours: 4,
    preferredFormat: 'vertical_video' as ContentFormatType,
    preferredStyle: 'direct_response' as ContentCreativeStyle,
    preferredDuration: '30s' as ContentTargetDuration
  });

  useEffect(() => {
    const unsubSocial = globalSocialService.subscribe(() => {
      setState(globalSocialService.getState());
    });
    const unsubStore = store.subscribe(() => {
      setProducts(store.getProducts());
    });
    const unsubKeywords = countryKeywordsEngine.subscribe(() => {
      setKeywordsList(countryKeywordsEngine.getAllKeywords());
    });
    return () => {
      unsubSocial();
      unsubStore();
      unsubKeywords();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAccountSelectionChange = (accId: string) => {
    setSelectedAccountId(accId);
    const acc = state.accounts.find(a => a.id === accId);
    if (acc) {
      if (acc.preferredFormat) setSelectedFormat(acc.preferredFormat);
      if (acc.preferredStyle) setSelectedStyle(acc.preferredStyle);
      if (acc.preferredDuration) setSelectedDuration(acc.preferredDuration);
      if (acc.targetCountries[0]) {
        setTargetCountry(acc.targetCountries[0]);
        if (acc.targetLanguages[0]) setTargetLanguage(acc.targetLanguages[0]);
      }
    }
  };

  const handleGeneratePost = () => {
    if (!selectedAccountId || !selectedProductId) {
      showToast('Veuillez sélectionner un compte émetteur et un produit cible.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      globalSocialService.generateTargetedPost(
        selectedAccountId,
        selectedProductId,
        targetCountry,
        targetLanguage,
        selectedHookType,
        selectedFormat,
        selectedStyle,
        selectedDuration
      );
      setIsGenerating(false);
      showToast(`Contenu IA (${selectedFormat.replace('_', ' ').toUpperCase()} • ${selectedDuration}) généré pour ${targetCountry} (${targetLanguage.toUpperCase()}) !`);
    }, 600);
  };

  const handlePublishNow = (postId: string) => {
    globalSocialService.publishPostNow(postId);
    showToast('Publication en direct déclenchée avec tracking et redirection activés.');
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Lien de redirection avec tracking copié dans le presse-papier !');
  };

  const handleSaveAccountEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    globalSocialService.updateAccount(editingAccount.id, {
      accountName: editingAccount.accountName,
      handle: editingAccount.handle,
      profileUrl: editingAccount.profileUrl,
      customWebhookUrl: editingAccount.customWebhookUrl,
      defaultRedirectType: editingAccount.defaultRedirectType,
      defaultDiscountPercent: editingAccount.defaultDiscountPercent,
      postingFrequencyHours: editingAccount.postingFrequencyHours,
      autoPublishEnabled: editingAccount.autoPublishEnabled,
      preferredFormat: editingAccount.preferredFormat,
      preferredStyle: editingAccount.preferredStyle,
      preferredDuration: editingAccount.preferredDuration
    });

    setEditingAccount(null);
    showToast('Paramètres et accès direct du compte mis à jour avec succès.');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccForm.accountName || !newAccForm.handle) {
      showToast('Nom du compte et identifiant requis.');
      return;
    }

    globalSocialService.addAccount({
      platform: newAccForm.platform,
      accountName: newAccForm.accountName,
      handle: newAccForm.handle,
      profileUrl: newAccForm.profileUrl || `https://${newAccForm.platform}.com/${newAccForm.handle.replace('@', '')}`,
      customWebhookUrl: newAccForm.customWebhookUrl,
      directAccessEndpoint: {
        id: `ep-custom-${Date.now()}`,
        name: `Webhook Direct API ${newAccForm.platform.toUpperCase()}`,
        type: 'webhook_autopublish',
        urlOrToken: newAccForm.customWebhookUrl || 'https://api.digitalfactory.io/webhooks/custom',
        status: 'online',
        autoExecutionDelaySec: 0,
        maxDailyPostsLimit: 10,
        currentTodayPosts: 0,
        lastPingTimestamp: new Date().toISOString()
      },
      targetCountries: newAccForm.targetCountries,
      targetLanguages: newAccForm.targetLanguages,
      defaultRedirectType: newAccForm.defaultRedirectType,
      defaultDiscountPercent: newAccForm.defaultDiscountPercent,
      status: 'active',
      autoPublishEnabled: true,
      postingFrequencyHours: newAccForm.postingFrequencyHours,
      preferredFormat: newAccForm.preferredFormat,
      preferredStyle: newAccForm.preferredStyle,
      preferredDuration: newAccForm.preferredDuration,
      followersCount: 1000
    });

    setNewAccountOpen(false);
    showToast(`Compte ${newAccForm.accountName} créé et connecté avec accès direct !`);
  };

  const countryLabels: Record<TargetCountryCode, { name: string; flag: string; lang: TargetLanguageCode }> = {
    FR: { name: 'France & Francophonie', flag: '🇫🇷', lang: 'fr' },
    US: { name: 'United States', flag: '🇺🇸', lang: 'en' },
    GB: { name: 'United Kingdom', flag: '🇬🇧', lang: 'en' },
    DE: { name: 'Deutschland (DACH)', flag: '🇩🇪', lang: 'de' },
    ES: { name: 'España & LATAM', flag: '🇪🇸', lang: 'es' },
    IT: { name: 'Italia', flag: '🇮🇹', lang: 'it' },
    BR: { name: 'Brasil (Português)', flag: '🇧🇷', lang: 'pt' },
    JP: { name: 'Japan (日本語)', flag: '🇯🇵', lang: 'ja' },
    CA: { name: 'Canada (Bilingual)', flag: '🇨🇦', lang: 'en' },
    AU: { name: 'Australia / Oceania', flag: '🇦🇺', lang: 'en' }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1E202E] border border-pink-500/40 text-pink-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-[#121318] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Agent #19 — Créateur & Diffuseur Réseaux Multi-Pays
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30 uppercase">
                  IA Autonome 24/24
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Accès Direct Réglable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Génération IA sur-mesure (Format, Style, Durée, Langue) par plateforme (TikTok, Reels, Shorts, X, LinkedIn) 
                avec auto-publication programmée, injection de coupons et redirection directe vers chaque page produit du site.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const count = globalSocialService.generateAndPublishGlobalBatchForAllChannelsAndCountries();
                showToast(`🚀 ${count} publications ciblées publiées directement sur tous les pays et plateformes avec redirections actives !`);
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Diffuser & Rediriger Tous Canaux / Tout Pays (Direct)</span>
            </button>

            <button
              onClick={() => {
                globalSocialService.runAutonomousSocialTick();
                showToast('Cycle de publication autonome exécuté sur tous les comptes actifs.');
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
              <span>Forcer Cycle</span>
            </button>

            <button
              onClick={() => {
                const cur = state.autoPilotActive;
                globalSocialService.toggleAutoPilot(!cur);
                showToast(cur ? 'Mode automatique 24/24 mis en pause.' : 'Mode automatique 24/24 activé avec succès.');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                state.autoPilotActive 
                  ? 'bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-900/20' 
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{state.autoPilotActive ? 'Auto-Pilote 24/24 : ACTIF' : 'Auto-Pilote : EN PAUSE'}</span>
            </button>
          </div>
        </div>

        {/* Global KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-[#181920] border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-pink-400" />
              <span>Portée Internationale</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {state.totalReachEstimates.toLocaleString()} vues
            </div>
            <div className="text-[10px] text-pink-400 font-semibold mt-0.5">
              100% Organique • 0€ Pub
            </div>
          </div>

          <div className="bg-[#181920] border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clics Redirigés</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {state.totalTrackedClicks.toLocaleString()} clics
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              UTM & Coupons intégrés
            </div>
          </div>

          <div className="bg-[#181920] border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chiffre d'Affaires Réseaux</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {state.totalSocialRevenueEur.toLocaleString()} €
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Attribution directe 100%
            </div>
          </div>

          <div className="bg-[#181920] border border-slate-800 p-3 rounded-lg">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Accès Directs Connectés</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {state.accounts.length} Canaux
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              APIs & Webhooks actifs
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('generator')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'generator'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Générateur Multi-Format & File ({state.posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Comptes Réglables ({state.accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('direct_access')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'direct_access'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Accès Direct & Endpoints API</span>
        </button>

        <button
          onClick={() => setActiveTab('countries')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'countries'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Ciblage Géographique</span>
        </button>

        <button
          onClick={() => setActiveTab('country_keywords')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'country_keywords'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span className="flex items-center gap-1.5">
            <span>Mots-Clés Multi-Pays & Flux</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-pink-500/20 text-pink-300">
              Autonome ({keywordsList.length})
            </span>
          </span>
        </button>
      </div>

      {/* TAB 1: GENERATOR & QUEUE */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          {/* Automated Omni-Channel Status Banner */}
          <div className="bg-gradient-to-r from-[#171822] via-[#1A1A28] to-[#171822] border border-pink-500/30 rounded-xl p-5 relative overflow-hidden shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Diffusion 100% Automatique & Redirection Active
                  </span>
                  <span className="text-xs font-bold text-white">
                    Tous Produits ({products.length}) • Tous Canaux ({state.accounts.length}) • Toutes Langues
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  L'Agent #19 génère, programme et diffuse automatiquement le contenu adapté (Vidéos TikTok/Reels, Carrousels, Threads, Mots-Clés) avec lien de redirection direct, UTM et coupons de réduction pour <strong className="text-pink-300">l'ensemble des {products.length} produits du site</strong>. Aucune sélection manuelle n'est requise.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => {
                    setIsSyncingAll(true);
                    setTimeout(() => {
                      const res = globalSocialService.autoSyncAllProductsAcrossAllChannelsAndLanguages(true);
                      setIsSyncingAll(false);
                      showToast(`✨ ${res.totalGenerated} contenus & redirections générés et synchronisés pour tous les produits du site !`);
                    }, 400);
                  }}
                  disabled={isSyncingAll}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-lg shadow-pink-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAll ? 'Synchronisation Globale...' : '⚡ Forcer Synchronisation Tous Produits'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Setup Matrix (Manual override / Custom test) */}
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                Générateur Test & Personnalisation Manuelle (Optionnel)
              </h3>
              <span className="text-[11px] text-slate-400">
                Permet de tester un hook ou format spécifique à la demande
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Compte Émetteur</label>
                <select
                  value={selectedAccountId}
                  onChange={e => handleAccountSelectionChange(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                >
                  {state.accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.platform.toUpperCase()} • {acc.handle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Produit Cible sur le Site</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.pricing?.recommendedPrice ?? 47}€)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Pays Cible & Culture</label>
                <select
                  value={targetCountry}
                  onChange={e => {
                    const c = e.target.value as TargetCountryCode;
                    setTargetCountry(c);
                    if (c === 'FR' || c === 'CA') setTargetLanguage('fr');
                    else if (c === 'DE') setTargetLanguage('de');
                    else if (c === 'ES') setTargetLanguage('es');
                    else if (c === 'IT') setTargetLanguage('it');
                    else if (c === 'BR') setTargetLanguage('pt');
                    else if (c === 'JP') setTargetLanguage('ja');
                    else setTargetLanguage('en');
                  }}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                >
                  {Object.entries(countryLabels).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.flag} {meta.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Langue Rédactionnelle</label>
                <select
                  value={targetLanguage}
                  onChange={e => setTargetLanguage(e.target.value as any)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 uppercase font-mono"
                >
                  <option value="fr">Français (FR)</option>
                  <option value="en">English (US/UK/Global)</option>
                  <option value="de">Deutsch (DACH)</option>
                  <option value="es">Español (ES/LATAM)</option>
                  <option value="it">Italiano (IT)</option>
                  <option value="pt">Português (BR)</option>
                  <option value="ja">日本語 (JP)</option>
                </select>
              </div>
            </div>

            {/* Formats, Styles and Durations matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Format de Contenu IA</label>
                <select
                  value={selectedFormat}
                  onChange={e => setSelectedFormat(e.target.value as any)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                >
                  <option value="vertical_video">Vidéo Courte 9:16 (TikTok, Reels, Shorts)</option>
                  <option value="carousel_slides">Carrousel Multi-Slides (Instagram, LinkedIn)</option>
                  <option value="text_thread">Thread & Découpage (X / Twitter, Threads)</option>
                  <option value="story_infographic">Story Infographique & Sticker Link (9:16)</option>
                  <option value="article_newsletter">Article Longue Forme / Newsletter</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Style Créatif & Ton</label>
                <select
                  value={selectedStyle}
                  onChange={e => setSelectedStyle(e.target.value as any)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                >
                  <option value="direct_response">Direct Response & Urgence ROI</option>
                  <option value="aesthetic_minimal">Aesthetic & Minimaliste (Clean Dark UI)</option>
                  <option value="educational_breakdown">Tutoriel & Décomposition Étape par Étape</option>
                  <option value="provocative_debunk">Déconstruction de Mythe / Angle Contre-intuitif</option>
                  <option value="storytelling_behind_scenes">Storytelling & Coulisses de Création</option>
                  <option value="meme_humor_relatable">Mème & Vulgarisation Accessible</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Durée Cible / Longueur</label>
                <select
                  value={selectedDuration}
                  onChange={e => setSelectedDuration(e.target.value as any)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                >
                  <option value="15s">15 secondes (Ultra-punchy viral)</option>
                  <option value="30s">30 secondes (Équilibré rétention)</option>
                  <option value="60s">60 secondes (Démonstration approfondie)</option>
                  <option value="90s">90 secondes (Walkthrough complet)</option>
                  <option value="carousel_7slides">7 Slides (Carrousel haute conversion)</option>
                  <option value="thread_5tweets">5 Tweets (Thread découpé)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                La publication intègre automatiquement le tracking UTM, le coupon de réduction et le lien d'accès direct vers le produit.
              </span>
              <button
                onClick={handleGeneratePost}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-pink-900/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Générer Contenu & Redirection Manuel</span>
              </button>
            </div>
          </div>

          {/* Posts Feed & Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121318] border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Contenus, Scripts & Redirections Produits ({state.posts.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Générés et actualisés en continu 24/24 pour tous les produits
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterProduct}
                  onChange={e => setFilterProduct(e.target.value)}
                  className="bg-[#1A1A1E] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-pink-500 max-w-[180px]"
                >
                  <option value="all">Tous les Produits ({products.length})</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>

                <select
                  value={filterPlatform}
                  onChange={e => setFilterPlatform(e.target.value)}
                  className="bg-[#1A1A1E] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-pink-500"
                >
                  <option value="all">Toutes Plateformes</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube_shorts">YouTube Shorts</option>
                  <option value="x_twitter">X / Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                </select>

                <select
                  value={filterCountry}
                  onChange={e => setFilterCountry(e.target.value)}
                  className="bg-[#1A1A1E] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-pink-500"
                >
                  <option value="all">Tous Pays</option>
                  {Object.entries(countryLabels).map(([code, meta]) => (
                    <option key={code} value={code}>{meta.flag} {code}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {paginatedPosts.map(post => (
                <div key={post.id} className="bg-[#121318] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
                        {post.platform}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        {post.format?.replace('_', ' ') || 'Vidéo'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {countryLabels[post.targetCountry]?.flag} {post.targetCountry} ({post.language?.toUpperCase() || 'EN'})
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-xs">
                        {post.productTitle}
                      </span>
                      {post.discountCouponCode && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {post.discountCouponCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        post.status === 'published' || post.status === 'viral'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}>
                        {post.status === 'viral' ? '🔥 Viral' : post.status === 'published' ? 'Publié Direct' : 'Programmé'}
                      </span>

                      {post.status !== 'published' && post.status !== 'viral' && (
                        <button
                          onClick={() => handlePublishNow(post.id)}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Publier Direct (API)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hook & Concept */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-pink-300">Accroche & Titre Principal :</h4>
                      <span className="text-[10px] text-slate-400 font-mono">Style: {post.style || 'Direct Response'} • Durée: {post.duration || '30s'}</span>
                    </div>
                    <p className="text-sm font-semibold text-white bg-black/40 p-3 rounded-lg border border-slate-800">
                      "{post.hookHeadline}"
                    </p>
                  </div>

                  {/* Multi-Format Render (Video Plan / Slides / Thread) */}
                  {post.format === 'vertical_video' && post.videoScenePlan && post.videoScenePlan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-2">Découpage Vidéo par Scène & Voix Off :</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {post.videoScenePlan.map((scene, idx) => (
                          <div key={idx} className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-indigo-400 font-bold">
                              <span>Scène {idx + 1}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{scene.timestamp}</span>
                            </div>
                            <div className="text-slate-300">
                              <strong className="text-slate-400">Visuel :</strong> {scene.visualAction}
                            </div>
                            <div className="text-slate-200">
                              <strong className="text-slate-400">Audio :</strong> "{scene.spokenAudioText}"
                            </div>
                            <div className="text-amber-300 font-mono text-[10px] bg-black/30 px-1.5 py-0.5 rounded">
                              Overlay : {scene.onScreenOverlay}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {post.format === 'carousel_slides' && post.carouselSlides && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-2">Structure du Carrousel ({post.carouselSlides.length} Diapositives) :</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {post.carouselSlides.map((slide, idx) => (
                          <div key={idx} className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5 text-[11px]">
                            <div className="text-pink-400 font-bold text-[10px]">SLIDE #{slide.slideNumber}</div>
                            <div className="text-white font-bold text-xs">{slide.headline}</div>
                            <div className="text-slate-300">{slide.bodyText}</div>
                            <div className="text-slate-500 text-[10px] italic">Note : {slide.visualNote}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {post.format === 'text_thread' && post.textThreadPosts && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-2">Séquence Thread Découpée :</h4>
                      <div className="space-y-2">
                        {post.textThreadPosts.map((tweet, idx) => (
                          <div key={idx} className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-lg text-xs text-slate-200">
                            {tweet}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Caption & Hashtags */}
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 space-y-1.5">
                    <div className="text-xs font-bold text-slate-300">Description & Légende avec Direct Link :</div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{post.fullCaption}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.hashtags.map((tag, i) => (
                        <span key={i} className="text-[10px] text-pink-400 bg-pink-950/30 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Redirection Link & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-2 min-w-0 max-w-xl">
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-400 shrink-0">Lien Redirection Produit :</span>
                      <span className="text-emerald-400 font-mono text-[11px] truncate bg-black/40 px-2 py-0.5 rounded border border-emerald-500/20">
                        {post.redirectUrl}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyLink(post.redirectUrl)}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copier Lien</span>
                      </button>
                      <a
                        href={post.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Tester Redirection</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPostsPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
                <div className="text-slate-400">
                  Affichage de <span className="text-white font-semibold">{((postsPage - 1) * POSTS_PER_PAGE) + 1}</span> à <span className="text-white font-semibold">{Math.min(postsPage * POSTS_PER_PAGE, filteredPosts.length)}</span> sur <span className="text-white font-semibold">{filteredPosts.length}</span> contenus
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPostsPage(p => Math.max(1, p - 1))}
                    disabled={postsPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-[#141418] border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Précédent</span>
                  </button>
                  <div className="px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 font-bold">
                    Page {postsPage} / {totalPostsPages}
                  </div>
                  <button
                    onClick={() => setPostsPage(p => Math.min(totalPostsPages, p + 1))}
                    disabled={postsPage === totalPostsPages}
                    className="px-3 py-1.5 rounded-lg bg-[#141418] border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EDITABLE ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Comptes Sociaux Connectés & Paramètres de Redirection</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Modifiez les identifiants, adresses URL, webhooks et stratégies d'accroche par canal.
              </p>
            </div>
            <button
              onClick={() => setNewAccountOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-pink-900/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Compte Réglable</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.accounts.map(acc => (
              <div key={acc.id} className="bg-[#121318] border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 uppercase">
                      {acc.platform}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {acc.status === 'active' ? 'Actif (24/24)' : 'En Pause'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white truncate">{acc.accountName}</h4>
                  <div className="text-xs text-pink-400 font-mono">{acc.handle}</div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <div className="flex justify-between">
                      <span>Format Préféré :</span>
                      <span className="text-white font-medium capitalize">{acc.preferredFormat?.replace('_', ' ') || 'Vidéo 9:16'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Style Préféré :</span>
                      <span className="text-white font-medium capitalize">{acc.preferredStyle?.replace('_', ' ') || 'Direct Response'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Durée Préférée :</span>
                      <span className="text-white font-medium">{acc.preferredDuration || '30s'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pays ciblés :</span>
                      <span className="text-white font-medium">{acc.targetCountries.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Redirection :</span>
                      <span className="text-white font-medium capitalize">{acc.defaultRedirectType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remise promo :</span>
                      <span className="text-emerald-400 font-medium">-{acc.defaultDiscountPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fréquence :</span>
                      <span className="text-white font-medium">Toutes les {acc.postingFrequencyHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clics redirigés :</span>
                      <span className="text-indigo-300 font-mono font-medium">{acc.totalClicksGenerated}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setEditingAccount(acc)}
                    className="px-3 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Régler l'Adresse & Accès</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer le compte ${acc.accountName} ?`)) {
                        globalSocialService.deleteAccount(acc.id);
                        showToast('Compte supprimé.');
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT ACCESS ENDPOINTS */}
      {activeTab === 'direct_access' && (
        <div className="space-y-4">
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Accès Directs Réglables & Pipelines d'Auto-Publication
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Chaque compte dispose d'un endpoint de publication direct (API officielle TikTok, Meta Graph API, YouTube Data v3, X API v2 ou Webhooks Zapier/Make) permettant d'injecter immédiatement les contenus vidéo et carrousels générés.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.accounts.map(acc => (
                <div key={acc.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 uppercase">
                        {acc.platform}
                      </span>
                      <span className="text-xs font-bold text-white">{acc.accountName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {acc.directAccessEndpoint?.status || 'Online'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Nom de l'Endpoint :</span>
                      <span className="text-slate-200 font-mono text-[11px]">{acc.directAccessEndpoint?.name || 'Webhook Direct API'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">URL / Webhook de Publication :</span>
                      <div className="text-slate-300 font-mono text-[11px] bg-black/40 p-2 rounded border border-slate-800 truncate">
                        {acc.directAccessEndpoint?.urlOrToken || acc.customWebhookUrl || 'https://api.digitalfactory.io/webhooks/social'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Publications / Jour :</span>
                        <span className="text-white font-bold">{acc.directAccessEndpoint?.currentTodayPosts || 0} / {acc.directAccessEndpoint?.maxDailyPostsLimit || 10}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Délai Exécution :</span>
                        <span className="text-emerald-400 font-bold">{acc.directAccessEndpoint?.autoExecutionDelaySec || 0}s (Instant)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => setEditingAccount(acc)}
                      className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Modifier Endpoint & Clés API</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COUNTRIES & TARGETING */}
      {activeTab === 'countries' && (
        <div className="space-y-4">
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">Cartographie des Redirections & Rendement par Pays</h3>
            <p className="text-xs text-slate-400 mb-4">
              L'Agent 19 adapte automatiquement la psychologie de vente, la devise locale et les fuseaux de publication selon chaque pays ciblé.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(countryLabels).map(([code, meta]) => (
                <div key={code} className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-lg">{meta.flag}</span>
                      <span>{meta.name}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300">
                      {code}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Stratégie d'Accroche :</span>{' '}
                    {code === 'US' || code === 'GB' 
                      ? 'Direct Response & ROI Chiffré'
                      : code === 'FR' 
                      ? 'Preuve concrète & Simplicité'
                      : code === 'DE' 
                      ? 'Structure, Rigueur & Efficacité'
                      : code === 'JP'
                      ? 'Précision UI & Gain de temps'
                      : 'Transformation & Urgence'}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-semibold">Taux de Clic Moyen : 4.8%</span>
                    <span className="text-slate-400">Coupons Auto : Oui</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COUNTRY KEYWORDS & AUTONOMOUS FLOW OPTIMIZATION */}
      {activeTab === 'country_keywords' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Flow Control Banner */}
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-pink-400" />
                  <span>Matrice Autonome des Mots-Clés & Flux par Pays</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                    8 Marchés Mondiaux
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  L'agent de diffusion injecte automatiquement ces mots-clés à haute intention d'achat dans les scripts vidéos, légendes, hashtags et redirections produits pour chaque pays ciblé.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const msg = countryKeywordsEngine.executeAutonomousKeywordOptimization();
                    showToast(msg);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-md transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Optimiser les Flux Autonomes</span>
                </button>
              </div>
            </div>

            {/* Country Flow Velocity Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
              {countryKeywordsEngine.getCountryFlowSummaries().slice(0, 4).map(summary => (
                <div key={summary.countryCode} className="bg-[#181920] border border-slate-800 p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{summary.flag}</span>
                      <span>{summary.countryName.split(' ')[0]}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {summary.flowStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    ~{summary.totalEstimatedFlowVisits.toLocaleString()} visites/m
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Top: "{summary.topKeyword}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords Management Grid */}
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Filtrer par Marché :</span>
                <select
                  value={selectedKwCountry}
                  onChange={e => setSelectedKwCountry(e.target.value)}
                  className="bg-[#1A1A1E] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="all">🌐 Tous les pays ({keywordsList.length} mots-clés)</option>
                  <option value="FR">🇫🇷 France (FR)</option>
                  <option value="US">🇺🇸 United States (US)</option>
                  <option value="GB">🇬🇧 United Kingdom (GB)</option>
                  <option value="DE">🇩🇪 Deutschland (DE)</option>
                  <option value="ES">🇪🇸 España & LATAM (ES)</option>
                  <option value="JP">🇯🇵 Japan (JP)</option>
                  <option value="CA">🇨🇦 Canada (CA)</option>
                  <option value="AU">🇦🇺 Australia (AU)</option>
                </select>
              </div>

              <span className="text-xs text-slate-400">
                {keywordsList.filter(k => selectedKwCountry === 'all' || k.countryCode === selectedKwCountry).length} mots-clés actifs
              </span>
            </div>

            {/* Keyword Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {keywordsList
                .filter(k => selectedKwCountry === 'all' || k.countryCode === selectedKwCountry)
                .map(kw => (
                  <div
                    key={kw.id}
                    className="bg-[#181920] border border-slate-800 p-4 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{kw.flag}</span>
                          <span className="text-xs font-bold text-white">{kw.countryName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 uppercase">
                            {kw.language}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {kw.searchIntent === 'commercial_buy' ? 'Achat Immédiat' : 'Solution Ciblée'}
                          </span>
                        </div>
                        <div className="font-bold text-pink-300 text-xs font-mono">
                          "{kw.keyword}"
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          countryKeywordsEngine.deleteKeyword(kw.id);
                          showToast('Mot-clé supprimé de la matrice autonome.');
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 bg-[#121318] p-2.5 rounded-lg text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Volume / mois</div>
                        <div className="font-bold text-white font-mono mt-0.5">
                          {kw.monthlySearchVolume.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">CTR Estimé</div>
                        <div className="font-bold text-emerald-400 font-mono mt-0.5">
                          {kw.estimatedCtrPercent}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Tendance Live</div>
                        <div className="font-bold text-pink-400 font-mono mt-0.5">
                          {kw.trendingTrendScore}/100
                        </div>
                      </div>
                    </div>

                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-1">
                      {kw.recommendedHashtags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Quick Add Keyword Form */}
            <div className="p-4 bg-[#181920] border border-slate-800 rounded-xl space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-pink-400" />
                <span>Ajouter un Mot-Clé Ciblé à la Matrice</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold mb-1">Marché & Pays</label>
                  <select
                    value={newKwCountry}
                    onChange={e => setNewKwCountry(e.target.value as TargetCountryCode)}
                    className="w-full bg-[#121318] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="FR">🇫🇷 France (FR)</option>
                    <option value="US">🇺🇸 United States (US)</option>
                    <option value="GB">🇬🇧 United Kingdom (GB)</option>
                    <option value="DE">🇩🇪 Deutschland (DE)</option>
                    <option value="ES">🇪🇸 España & LATAM (ES)</option>
                    <option value="JP">🇯🇵 Japan (JP)</option>
                    <option value="CA">🇨🇦 Canada (CA)</option>
                    <option value="AU">🇦🇺 Australia (AU)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 text-[10px] font-bold mb-1">Mot-clé ou Requête Cible</label>
                  <input
                    type="text"
                    value={newKwText}
                    onChange={e => setNewKwText(e.target.value)}
                    placeholder="Ex: notion saas operating system template"
                    className="w-full bg-[#121318] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newKwText.trim()) return;
                      const flagMap: Record<TargetCountryCode, string> = {
                        FR: '🇫🇷', US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹', BR: '🇧🇷', JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺'
                      };
                      const nameMap: Record<TargetCountryCode, string> = {
                        FR: 'France', US: 'United States', GB: 'United Kingdom', DE: 'Germany', ES: 'Spain & LATAM', IT: 'Italy', BR: 'Brazil', JP: 'Japan', CA: 'Canada', AU: 'Australia'
                      };
                      const langMap: Record<TargetCountryCode, TargetLanguageCode> = {
                        FR: 'fr', US: 'en', GB: 'en', DE: 'de', ES: 'es', IT: 'it', BR: 'pt', JP: 'ja', CA: 'en', AU: 'en'
                      };

                      countryKeywordsEngine.addKeyword({
                        countryCode: newKwCountry,
                        language: langMap[newKwCountry] || 'en',
                        countryName: nameMap[newKwCountry] || 'Global',
                        flag: flagMap[newKwCountry] || '🌐',
                        keyword: newKwText.trim(),
                        searchIntent: newKwIntent,
                        monthlySearchVolume: newKwVolume,
                        competitionScore: 30,
                        estimatedCtrPercent: 7.5,
                        recommendedHashtags: [`#${newKwText.trim().replace(/\s+/g, '')}`, `#${newKwCountry}`, '#Automation'],
                        trendingTrendScore: 90,
                        productCategoryMatch: newKwCategory
                      });

                      setNewKwText('');
                      showToast(`Nouveau mot-clé ajouté pour ${newKwCountry} !`);
                    }}
                    className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13141C] border border-slate-700 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-pink-400" />
                Modifier le Compte : {editingAccount.accountName}
              </h3>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveAccountEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nom Public du Compte</label>
                <input
                  type="text"
                  value={editingAccount.accountName}
                  onChange={e => setEditingAccount({ ...editingAccount, accountName: e.target.value })}
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Identifiant / Handle (@)</label>
                  <input
                    type="text"
                    value={editingAccount.handle}
                    onChange={e => setEditingAccount({ ...editingAccount, handle: e.target.value })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">URL Profil Public</label>
                  <input
                    type="url"
                    value={editingAccount.profileUrl}
                    onChange={e => setEditingAccount({ ...editingAccount, profileUrl: e.target.value })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">URL Webhook / Endpoint Direct de Publication</label>
                <input
                  type="text"
                  value={editingAccount.customWebhookUrl || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, customWebhookUrl: e.target.value })}
                  placeholder="https://api.digitalfactory.io/webhooks/social/..."
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500 font-mono text-[11px]"
                />
              </div>

              {/* Format, Style & Duration preferences for this account */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Format par Défaut</label>
                  <select
                    value={editingAccount.preferredFormat || 'vertical_video'}
                    onChange={e => setEditingAccount({ ...editingAccount, preferredFormat: e.target.value as any })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="vertical_video">Vidéo 9:16</option>
                    <option value="carousel_slides">Carrousel</option>
                    <option value="text_thread">Thread X</option>
                    <option value="story_infographic">Story</option>
                    <option value="article_newsletter">Article</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Style par Défaut</label>
                  <select
                    value={editingAccount.preferredStyle || 'direct_response'}
                    onChange={e => setEditingAccount({ ...editingAccount, preferredStyle: e.target.value as any })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="direct_response">Direct Response</option>
                    <option value="aesthetic_minimal">Aesthetic</option>
                    <option value="educational_breakdown">Tutoriel</option>
                    <option value="provocative_debunk">Déconstruction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Durée par Défaut</label>
                  <select
                    value={editingAccount.preferredDuration || '30s'}
                    onChange={e => setEditingAccount({ ...editingAccount, preferredDuration: e.target.value as any })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="15s">15s</option>
                    <option value="30s">30s</option>
                    <option value="60s">60s</option>
                    <option value="carousel_7slides">7 Slides</option>
                    <option value="thread_5tweets">5 Tweets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Redirection par Défaut</label>
                  <select
                    value={editingAccount.defaultRedirectType}
                    onChange={e => setEditingAccount({ ...editingAccount, defaultRedirectType: e.target.value as any })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="direct_product">Lien Direct Produit</option>
                    <option value="promo_coupon">Lien avec Coupon Auto</option>
                    <option value="dm_keyword">Mot-Clé en DM</option>
                    <option value="bio_link">Lien dans la Bio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Remise Coupon (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={editingAccount.defaultDiscountPercent}
                    onChange={e => setEditingAccount({ ...editingAccount, defaultDiscountPercent: Number(e.target.value) })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingAccount.autoPublishEnabled}
                    onChange={e => setEditingAccount({ ...editingAccount, autoPublishEnabled: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-pink-500"
                  />
                  <span>Publication Autonome Active (24/24)</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg font-bold bg-pink-600 hover:bg-pink-500 text-white"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW ACCOUNT MODAL */}
      {newAccountOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13141C] border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-400" />
                Connecter un Nouveau Canal Réseau
              </h3>
              <button onClick={() => setNewAccountOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Plateforme</label>
                  <select
                    value={newAccForm.platform}
                    onChange={e => setNewAccForm({ ...newAccForm, platform: e.target.value as any })}
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram Reels</option>
                    <option value="youtube_shorts">YouTube Shorts</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="threads">Threads</option>
                    <option value="pinterest">Pinterest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Identifiant / Handle (@)</label>
                  <input
                    type="text"
                    value={newAccForm.handle}
                    onChange={e => setNewAccForm({ ...newAccForm, handle: e.target.value })}
                    placeholder="@votre_compte"
                    className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Nom du Canal</label>
                <input
                  type="text"
                  value={newAccForm.accountName}
                  onChange={e => setNewAccForm({ ...newAccForm, accountName: e.target.value })}
                  placeholder="Ex: TikTok France Growth (@votre_compte)"
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewAccountOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold bg-pink-600 hover:bg-pink-500 text-white"
                >
                  Ajouter le Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
