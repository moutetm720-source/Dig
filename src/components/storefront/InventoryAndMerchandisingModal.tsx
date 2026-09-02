import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  Package, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  FileText, 
  Flame, 
  TrendingUp, 
  Tag, 
  Zap, 
  X, 
  FolderPlus,
  Eye,
  Boxes,
  Split
} from 'lucide-react';
import { storefrontAgentService } from '../../services/storefrontAgentService';
import { similarityGroupingAgent } from '../../services/similarityGroupingAgent';
import { 
  StorefrontAgentState, 
  StorefrontCluster, 
  StorefrontVisualConfig, 
  DigitalInventoryHealthRecord,
  StorefrontClusteringMode,
  StorefrontHeroTheme,
  IdenticalProductGroup
} from '../../types';
import { store } from '../../services/store';

interface InventoryAndMerchandisingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryAndMerchandisingModal: React.FC<InventoryAndMerchandisingModalProps> = ({
  isOpen,
  onClose
}) => {
  const [agentState, setAgentState] = useState<StorefrontAgentState>(storefrontAgentService.getState());
  const [identicalGroups, setIdenticalGroups] = useState<IdenticalProductGroup[]>(similarityGroupingAgent.getGroups());
  const [activeTab, setActiveTab] = useState<'similarity' | 'clusters' | 'visual' | 'inventory'>('similarity');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = storefrontAgentService.subscribe(() => {
      setAgentState(storefrontAgentService.getState());
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });
    const unsubSim = similarityGroupingAgent.subscribe(() => {
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });
    return () => {
      unsub();
      unsubSim();
    };
  }, []);

  if (!isOpen) return null;

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setFeedbackMessage(null);
    setTimeout(() => {
      storefrontAgentService.autoOptimizeStorefront();
      setIsOptimizing(false);
      setFeedbackMessage('✅ Optimisation terminée : Regroupement similaire et inventaire synchronisés avec succès.');
    }, 500);
  };

  const handleClusteringModeChange = (mode: StorefrontClusteringMode) => {
    storefrontAgentService.setClusteringMode(mode);
    setFeedbackMessage(`Mode d'affichage basculé sur : ${mode}`);
  };

  const handleHeroThemeChange = (theme: StorefrontHeroTheme) => {
    storefrontAgentService.updateVisualConfig({ heroTheme: theme });
  };

  const handleCreateBundleFromCluster = (cluster: StorefrontCluster) => {
    const products = store.getProducts().filter(p => cluster.productIds.includes(p.id));
    if (products.length < 2) return;

    const originalPrice = products.reduce((sum, p) => sum + (p.pricing?.recommendedPrice ?? 47), 0);
    const bundlePrice = Math.round(originalPrice * (1 - cluster.suggestedBundleDiscount / 100));

    store.addBundle({
      title: `Pack Affinité : ${cluster.name.replace(/^[^\w\s]+/, '').trim()}`,
      subtitle: cluster.description,
      description: `Pack complet regroupant les solutions de la thématique ${cluster.name} avec une remise exceptionnelle de ${cluster.suggestedBundleDiscount}%.`,
      productIds: cluster.productIds,
      originalPrice,
      bundlePrice,
      discountPercent: cluster.suggestedBundleDiscount,
      badge: `Pack ${cluster.badge}`,
      coverUrl: '',
      status: 'active'
    });

    setFeedbackMessage(`🎉 Nouveau Pack créé et publié dans la boutique à ${bundlePrice}€ (-${cluster.suggestedBundleDiscount}%).`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#121216] border border-slate-800 w-full max-w-4xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Agent de Merchandising Visuel & Gestion d'Inventaire</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Actif 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Regroupement intelligent des produits similaires, contrôle visuel du catalogue et audit des stocks numériques.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimisation...' : 'Réaligner le Catalogue IA'}</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="bg-indigo-950/70 border border-indigo-500/30 px-4 py-2.5 rounded-xl text-xs text-indigo-200 flex items-center justify-between animate-fade-in">
            <span>{feedbackMessage}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-indigo-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'similarity' as const, label: 'Regroupement Produits Similaires & Quantités', count: identicalGroups.length, icon: Boxes },
            { id: 'clusters' as const, label: 'Pôles Thématiques (Clusters)', count: agentState.clusters.length, icon: Layers },
            { id: 'visual' as const, label: 'Design Visuel & Hero', count: 4, icon: Sliders },
            { id: 'inventory' as const, label: 'Santé de l\'Inventaire & Fichiers', count: agentState.inventoryHealth.length, icon: Package }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">

          {/* TAB 0: AUTONOMOUS SIMILARITY & QUANTITY GROUPING */}
          {activeTab === 'similarity' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Moteur Autonome de Déduplication & Regroupement</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      100% Automatisé
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    L'agent scanne le catalogue en continu, fusionne les produits quasi-identiques en une fiche maîtresse et calcule automatiquement les stocks/quantités disponibles.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const updated = similarityGroupingAgent.executeAutonomousGrouping(true);
                      setIdenticalGroups(updated);
                      setFeedbackMessage(`⚡ Scan terminé : ${updated.filter(g => !g.isSingle).length} groupes fusionnés avec quantités consolidées.`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-scanner & Regrouper Tout</span>
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
                          ? 'bg-slate-950/90 border-indigo-500/30 ring-1 ring-indigo-500/10'
                          : 'bg-slate-950 border-slate-800/80'
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
                              {hasMulti ? `✨ ${group.variants.length} Produits Fusionnés` : 'Fiche Unique'}
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
                              {group.totalUniqueFilesCount} fichiers au total
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
                                    <span className="text-indigo-300">{variant.similarityToPrimary}% similarité</span>
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

          {/* TAB 1: CLUSTERS OF SIMILAR PRODUCTS */}
          {activeTab === 'clusters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  L'agent analyse les titres, audiences et formats pour regrouper les produits complémentaires et maximiser le panier moyen.
                </span>
                <button
                  onClick={() => storefrontAgentService.groupSimilarProducts()}
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Recalculer les affinités</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentState.clusters.map(cluster => (
                  <div key={cluster.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-white text-sm">
                          <span>{cluster.icon}</span>
                          <span>{cluster.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {cluster.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {cluster.description}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-slate-900">
                        <div className="text-[11px] font-semibold text-slate-300">
                          Produits associés ({cluster.productIds.length}) :
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cluster.productIds.map(pid => {
                            const p = store.getProducts().find(prod => prod.id === pid);
                            return (
                              <span key={pid} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1">
                                <span>⚡</span>
                                <span className="truncate max-w-[150px]">{p?.title || pid}</span>
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
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
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

          {/* TAB 2: VISUAL DESIGN & MERCHANDISING */}
          {activeTab === 'visual' && (
            <div className="space-y-6">
              {/* Clustering Mode Selector */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider">
                  Mode d'Affichage du Catalogue sur la Boutique
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'smart_clusters' as const, title: '🤖 Clusters Intelligents', desc: 'Regroupements thématiques par affinité IA et cross-selling' },
                    { id: 'category_tabs' as const, title: '📑 Onglets par Catégorie', desc: 'Filtrage classique (Dev, IA, Notion, Marketing)' },
                    { id: 'conversion_rank' as const, title: '🔥 Classement par Ventes', desc: 'Produits ordonnés par conversion et satisfaction maximale' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => handleClusteringModeChange(mode.id)}
                      className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                        agentState.visualConfig.clusteringMode === mode.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
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
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider">
                  Atmosphère Visuelle du Hero
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'cyber_quantum' as const, label: 'Cyber Quantum', color: 'from-indigo-950 to-slate-950' },
                    { id: 'midnight_executive' as const, label: 'Midnight Executive', color: 'from-slate-900 to-black' },
                    { id: 'aurora_indigo' as const, label: 'Aurora Indigo', color: 'from-violet-950 to-slate-950' },
                    { id: 'minimal_slate' as const, label: 'Minimal Slate', color: 'from-slate-900 to-slate-950' }
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleHeroThemeChange(theme.id)}
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

              {/* Notice & Ticker Settings */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider">
                  Bandeau d'Annonce Dynamique
                </div>
                <input
                  type="text"
                  value={agentState.visualConfig.dynamicNoticeText}
                  onChange={e => storefrontAgentService.updateVisualConfig({ dynamicNoticeText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DIGITAL INVENTORY HEALTH */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Vérification en temps réel des versions, fichiers téléchargeables et de la conformité des livrables digitaux.
                </span>
                <button
                  onClick={() => storefrontAgentService.auditDigitalInventory()}
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auditer l'inventaire</span>
                </button>
              </div>

              <div className="space-y-3">
                {agentState.inventoryHealth.map(item => (
                  <div key={item.productId} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{item.productTitle}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                          {item.version}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.digitalStockStatus === 'high_demand' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.digitalStockStatus === 'high_demand' ? '🔥 Forte Demande' : '✅ En Stock & Synchronisé'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.filesCount} fichiers inclus ({item.fileTypes.join(', ').toUpperCase()}) • {item.downloadCount} téléchargements validés
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-400">{item.healthScore} / 100</div>
                        <div className="text-[10px] text-slate-500">Score de Santé IA</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Dernière optimisation : {new Date(agentState.lastOptimizationTimestamp).toLocaleTimeString()}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
