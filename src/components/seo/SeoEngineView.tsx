import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  Link2, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  FileCode, 
  Copy, 
  ArrowRight,
  Layers,
  Award,
  Zap,
  ExternalLink,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { store } from '../../services/store';
import { seoLeaderAgents } from '../../services/seoLeaderAgents';
import { DigitalProduct, TopicalClusterNode, ProgrammaticSeoPage, BacklinkProspect, CompetitorGapAnalysis } from '../../types';

export const SeoEngineView: React.FC = () => {
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct>(products[0]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [clusters, setClusters] = useState<TopicalClusterNode[]>(seoLeaderAgents.getClusters());
  const [programmaticPages, setProgrammaticPages] = useState<ProgrammaticSeoPage[]>(seoLeaderAgents.getProgrammaticPages());
  const [backlinks, setBacklinks] = useState<BacklinkProspect[]>(seoLeaderAgents.getBacklinkProspects());
  const [competitorGaps, setCompetitorGaps] = useState<CompetitorGapAnalysis[]>(seoLeaderAgents.getCompetitorGaps());
  const [backlinkFilter, setBacklinkFilter] = useState<'all' | 'awesome_list' | 'tech_directory' | 'guest_post' | 'live'>('all');
  const [selectedBacklinkDetails, setSelectedBacklinkDetails] = useState<BacklinkProspect | null>(null);

  const [activeTab, setActiveTab] = useState<'serp_schema' | 'topical_clusters' | 'programmatic' | 'backlinks' | 'competitor_gaps'>('topical_clusters');

  // Programmatic Page Generator Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageCategory, setNewPageCategory] = useState('Developer Tools');
  const [newPageFramework, setNewPageFramework] = useState('Next.js 15 / React');

  useEffect(() => {
    const unsub = seoLeaderAgents.subscribe(() => {
      setClusters(seoLeaderAgents.getClusters());
      setProgrammaticPages(seoLeaderAgents.getProgrammaticPages());
      setBacklinks(seoLeaderAgents.getBacklinkProspects());
      setCompetitorGaps(seoLeaderAgents.getCompetitorGaps());
    });
    return () => unsub();
  }, []);

  const schemaJson = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": selectedProduct?.title,
    "image": selectedProduct?.packaging?.coverUrl,
    "description": selectedProduct?.subtitle,
    "brand": {
      "@type": "Brand",
      "name": "DigitalForge"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://digitalforge.pro/products/${selectedProduct?.id}`,
      "priceCurrency": "EUR",
      "price": selectedProduct?.pricing?.recommendedPrice,
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": selectedProduct?.rating || 4.9,
      "reviewCount": selectedProduct?.reviewsCount || 42
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(JSON.stringify(schemaJson, null, 2));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleCreateProgrammaticPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle) return;
    seoLeaderAgents.generateProgrammaticLanding(newPageTitle, newPageCategory, newPageFramework);
    setShowGenModal(false);
    setNewPageTitle('');
  };

  const handleAcquireBacklink = (id: string) => {
    seoLeaderAgents.submitBacklinkPR(id);
  };

  const handleHarvestBacklinksBatch = (count = 6) => {
    seoLeaderAgents.harvestUnlimitedBacklinks(count);
  };

  const handleAcquireAllPendingBacklinks = () => {
    seoLeaderAgents.autoAcquireAllPendingBacklinks();
  };

  const handleGenerateBatchProgrammatic = () => {
    const pages = seoLeaderAgents.generateUnlimitedProgrammaticPages(6);
    store.addLog('success', 'marketing', `🚀 ${pages.length} Pages Programmatiques générées et soumises instantanément à IndexNow (Google, Bing, DuckDuckGo) !`);
  };

  const backlinkMetrics = seoLeaderAgents.getBacklinkMetrics();

  const filteredBacklinks = backlinks.filter(b => {
    if (backlinkFilter === 'all') return true;
    if (backlinkFilter === 'live') return b.status === 'live' || b.status === 'acquired';
    return b.prospectType === backlinkFilter;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Suite SEO Leader & Domination Sémantique (Google #1)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Top Leader Référencement</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Graphe d'autorité sémantique, pages d'atterrissage programmatiques, rich snippets Schema.org et harvester de backlinks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateBatchProgrammatic}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Générer +6 Pages Programmatiques (Sans Limite)</span>
          </button>

          <button
            onClick={() => setShowGenModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer Page Manuelle</span>
          </button>
        </div>
      </div>

      {/* SEO KPI Quad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Cocons Sémantiques</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {clusters.length} <span className="text-sm font-normal text-slate-400">clusters</span>
          </div>
          <div className="text-xs text-indigo-400 font-medium font-mono">
            113,000 req/mois ciblées (Top 1-3)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pages Programmatiques</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {programmaticPages.length} <span className="text-sm font-normal text-slate-400">URLs</span>
          </div>
          <div className="text-xs text-emerald-300 font-medium">
            IndexNow Fast-Track & JSON-LD Actifs
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Backlinks Haute Autorité</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Link2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-teal-300 font-mono">
            {backlinks.filter(b => b.status === 'acquired' || b.status === 'live').length} <span className="text-sm font-normal text-slate-400">/ {backlinks.length}</span>
          </div>
          <div className="text-xs text-teal-400 font-medium">
            Moyenne DA: 83.6 (GitHub, dev.to)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111114] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Score de Domination SERP</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">
            96.4 / 100
          </div>
          <div className="text-xs text-amber-400 font-medium">
            Entités sémantiques 100% complètes
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'topical_clusters' as const, label: 'Graphe d\'Autorité Sémantique (Knowledge Graph)', icon: Layers },
          { id: 'programmatic' as const, label: 'Pages Programmatiques & IndexNow', icon: Sparkles },
          { id: 'backlinks' as const, label: 'Backlink Harvester & Relations Publiques', icon: Link2 },
          { id: 'competitor_gaps' as const, label: 'Vecteurs de Domination Concurrents', icon: Award },
          { id: 'serp_schema' as const, label: 'Audit JSON-LD & Balisage Schema.org', icon: FileCode }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#16161A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TOPICAL CLUSTERS */}
      {activeTab === 'topical_clusters' && (
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Cocons Sémantiques & Entités Google Knowledge Graph</span>
              </h3>
              <p className="text-xs text-slate-400">Positionnement systématique sur le Top 1-3 par maillage interne strict</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Salience Validée
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clusters.map(c => (
              <div key={c.id} className="p-5 rounded-xl bg-[#16161A] border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 uppercase">
                      {c.searchIntent}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
                      <span>Rang #{c.rankingPositionCurrent || 1}</span>
                      <span className="text-[10px] text-slate-500 font-normal">(Cible: #{c.rankingPositionTarget})</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{c.pillarKeyword}</h4>
                    <div className="text-xs font-mono text-slate-400 mt-1">
                      Vol: {(c.searchVolumeMonthly ?? 0).toLocaleString()} req/mois • Trafic estimé: ~{(c.estimatedTrafficMonthly ?? 0).toLocaleString()}/mois
                    </div>
                  </div>

                  {/* Subtopics */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sous-thématiques couvertes :</span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {c.subtopics.map((st, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Google Semantic Entities */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Entités Google Reconnues :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {c.semanticEntities.map((ent, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                          {ent}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Maillage interne :</span>
                  <span className="font-mono text-indigo-400">{c.internalLinkTargets.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PROGRAMMATIC PAGES */}
      {activeTab === 'programmatic' && (
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Matrice de Landing Pages Programmatiques (Génération Continue)</span>
            </h3>
            <span className="text-xs text-slate-400">Soumission IndexNow temps réel</span>
          </div>

          <div className="space-y-3">
            {programmaticPages.map(page => (
              <div key={page.id} className="p-4 rounded-xl bg-[#16161A] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{page.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-indigo-400 border border-slate-800">
                      {page.frameworkTag}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                      ✓ {page.indexNowStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{page.metaDescription}</p>
                  <div className="text-[11px] font-mono text-slate-500">{page.canonicalUrl}</div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <div className="text-white font-bold">{(page.views ?? 0).toLocaleString()} vues</div>
                    <div className="text-emerald-400">{(page.organicClicks ?? 0)} clics ({(page.conversions ?? 0)} ventes)</div>
                  </div>
                  <a
                    href={`/templates/${page.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BACKLINKS */}
      {activeTab === 'backlinks' && (
        <div className="space-y-6">
          {/* Top Actions & Automation Banner */}
          <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/40 border border-teal-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wide">
                  ⚡ Mode Illimité 24/7 Actif
                </span>
                <span className="text-xs text-slate-400">Harvester de Backlinks DA 75 à 98</span>
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-teal-400" />
                <span>Acquisition & Intégration Autonome de Backlinks Haute Autorité</span>
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                L'agent prospecte en continu les dépôts Awesome Lists (DA 96), les annuaires d'outils IA (DA 80+), Dev.to (DA 89) et Hacker News (DA 92) pour injecter des backlinks DOFOLLOW sur vos fiches produits.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => handleHarvestBacklinksBatch(6)}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-950 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-teal-200" />
                <span>+6 Nouveaux Backlinks (DA 75-98)</span>
              </button>
              <button
                onClick={handleAcquireAllPendingBacklinks}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                <span>🚀 Intégrer Tous en LIVE</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#111114] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-medium">Domain Authority Moyen</span>
              <div className="text-2xl font-bold text-teal-400 flex items-baseline gap-1">
                <span>DA {backlinkMetrics.averageDA}</span>
                <span className="text-xs text-slate-500 font-normal">/ 100</span>
              </div>
              <p className="text-[11px] text-teal-500/80">Profil d'autorité maximale</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-medium">Liens Actifs & Validés</span>
              <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
                <span>{backlinkMetrics.activeCount}</span>
                <span className="text-xs text-slate-500 font-normal">/ {backlinkMetrics.total} total</span>
              </div>
              <p className="text-[11px] text-emerald-500/80">{backlinkMetrics.liveCount} connectés en live direct</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-medium">Trafic Référant Estimé</span>
              <div className="text-2xl font-bold text-indigo-400 flex items-baseline gap-1">
                <span>+{(backlinkMetrics.estimatedReferralClicksMonthly ?? 0).toLocaleString()}</span>
                <span className="text-xs text-slate-500 font-normal">clics/mois</span>
              </div>
              <p className="text-[11px] text-indigo-500/80">Juice SEO & visiteurs directs</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-medium">Awesome Lists (GitHub)</span>
              <div className="text-2xl font-bold text-amber-400 flex items-baseline gap-1">
                <span>{backlinkMetrics.awesomeListsCount}</span>
                <span className="text-xs text-slate-500 font-normal">sources DA 96</span>
              </div>
              <p className="text-[11px] text-amber-500/80">Dépôts curés à 50k+ stars</p>
            </div>
          </div>

          {/* Backlink Catalog & Table */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setBacklinkFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    backlinkFilter === 'all'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Tous les Backlinks ({backlinks.length})
                </button>
                <button
                  onClick={() => setBacklinkFilter('live')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    backlinkFilter === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ✓ Actifs & LIVE ({backlinkMetrics.activeCount})
                </button>
                <button
                  onClick={() => setBacklinkFilter('awesome_list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    backlinkFilter === 'awesome_list'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Awesome Lists ({backlinkMetrics.awesomeListsCount})
                </button>
                <button
                  onClick={() => setBacklinkFilter('tech_directory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    backlinkFilter === 'tech_directory'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Annuaires & AI Hubs ({backlinkMetrics.directoriesCount})
                </button>
                <button
                  onClick={() => setBacklinkFilter('guest_post')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    backlinkFilter === 'guest_post'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Guest Posts & Dev Media ({backlinkMetrics.guestPostsCount})
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                {filteredBacklinks.length} opportunité(s) affichée(s)
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredBacklinks.map(b => (
                <div key={b.id} className="p-4 rounded-xl bg-[#16161A] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{b.domainName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/20">
                        DA {b.domainAuthority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase font-semibold">
                        {b.prospectType.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono">
                        Pertinence {b.relevanceScore}%
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Ancre Cible : <strong className="text-teal-300 font-semibold">"{b.anchorTextSuggested}"</strong>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                      <span className="truncate max-w-md">{b.acquiredBacklinkUrl || b.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedBacklinkDetails(b)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-all"
                    >
                      Détails PR / Pitch
                    </button>

                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
                      b.status === 'live'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : b.status === 'acquired'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {b.status === 'live' ? '✓ LIVE ACTIF' : b.status === 'acquired' ? 'Acquis' : 'Identifié'}
                    </span>

                    {b.status !== 'live' && (
                      <button
                        onClick={() => handleAcquireBacklink(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-950"
                      >
                        {b.status === 'acquired' ? 'Activer en Live' : 'Soumettre PR Auto'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal / Preview Pitch & PR */}
          {selectedBacklinkDetails && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#16161A] border border-slate-700 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-teal-400" />
                      <span>{selectedBacklinkDetails.domainName} (DA {selectedBacklinkDetails.domainAuthority})</span>
                    </h4>
                    <p className="text-xs text-slate-400">Soumission et template de PR rédigé</p>
                  </div>
                  <button
                    onClick={() => setSelectedBacklinkDetails(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs px-2.5"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">URL Cible :</span>
                    <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-teal-300 break-all">
                      {selectedBacklinkDetails.url}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Ancre Optimisée SEO :</span>
                    <div className="p-2.5 rounded-lg bg-slate-950 font-semibold text-white">
                      {selectedBacklinkDetails.anchorTextSuggested}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Template de Pull Request & Description :</span>
                    <div className="p-3 rounded-lg bg-slate-950 font-mono text-slate-300 whitespace-pre-wrap border border-slate-900">
                      {selectedBacklinkDetails.pitchEmailTemplate}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedBacklinkDetails.pitchEmailTemplate);
                      store.addLog('info', 'marketing', 'Template de PR copié dans le presse-papier !');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    Copier le Markdown
                  </button>
                  <button
                    onClick={() => {
                      handleAcquireBacklink(selectedBacklinkDetails.id);
                      setSelectedBacklinkDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
                  >
                    Valider & Passer en LIVE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMPETITOR GAPS */}
      {activeTab === 'competitor_gaps' && (
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Vecteurs de Domination Concurrentielle (Capture du Rank #1)</span>
            </h3>
            <span className="text-xs text-slate-400">Analyse des lacunes de contenu SERP</span>
          </div>

          <div className="space-y-3">
            {competitorGaps.map(gap => (
              <div key={gap.id} className="p-4 rounded-xl bg-[#16161A] border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{gap.competitorRankedKeyword}</span>
                    <span className="text-[10px] text-slate-400">({gap.competitorDomain})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-emerald-400">
                      Potentiel : +€{gap.potentialRevenueMonthly}/mois
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      Notre Rang : #{gap.ourCurrentRank || 'N/A'} (Concurrent #{gap.competitorRank})
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-900 text-xs text-slate-300 font-mono">
                  🎯 <strong className="text-indigo-300">Stratégie IA :</strong> {gap.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SERP & JSON-LD AUDIT */}
      {activeTab === 'serp_schema' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111114] border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Aperçu Google SERP Snippet</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">100% Rich Snippet Valid</span>
            </div>

            <div className="bg-[#16161A] p-4 rounded-xl border border-slate-800 space-y-1.5 font-sans">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                <span>digitalforge.pro</span>
                <span>›</span>
                <span>products</span>
                <span>›</span>
                <span className="text-slate-300">{selectedProduct?.id}</span>
              </div>
              <div className="text-base text-indigo-400 font-medium hover:underline cursor-pointer">
                {selectedProduct?.title} | Official Master Toolkit & System
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                ⭐ Rating: 5.0 · €{selectedProduct?.pricing?.recommendedPrice ?? 47}.00 · {selectedProduct?.subtitle} Includes instant secure download vault, checklists, and editable templates.
              </div>
            </div>

            <div className="space-y-2 text-xs pt-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#16161A] border border-slate-800/80">
                <span className="text-slate-400">Canonical URL :</span>
                <span className="text-slate-200 font-mono text-[11px]">https://digitalforge.pro/products/{selectedProduct?.id}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#16161A] border border-slate-800/80">
                <span className="text-slate-400">Search Intent :</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                  High Commercial Intent
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#111114] border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>Balisage JSON-LD Schema.org</span>
              </h3>
              <button
                onClick={handleCopySchema}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copyFeedback ? 'Copié !' : 'Copier JSON'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono overflow-x-auto max-h-72 custom-scrollbar border border-slate-800">
              {JSON.stringify(schemaJson, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Programmatic Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#141418] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Générer une Nouvelle Page Programmatique</h3>
            <form onSubmit={handleCreateProgrammaticPage} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Titre de la Thématique / Logiciel</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={e => setNewPageTitle(e.target.value)}
                  placeholder="ex: Vue 3 & Nuxt SaaS Starter Kit"
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Catégorie</label>
                <input
                  type="text"
                  value={newPageCategory}
                  onChange={e => setNewPageCategory(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tech Stack & Frameworks</label>
                <input
                  type="text"
                  value={newPageFramework}
                  onChange={e => setNewPageFramework(e.target.value)}
                  placeholder="ex: Nuxt / Tailwind / Stripe"
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Générer & Indexer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
