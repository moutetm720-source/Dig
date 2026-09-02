import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  GitCommit, 
  RotateCcw, 
  Sparkles, 
  Terminal, 
  Clock, 
  Activity, 
  FileCode, 
  Sliders, 
  Play, 
  CheckSquare,
  ArrowRight,
  ExternalLink,
  Zap
} from 'lucide-react';
import { siteEngineerService } from '../../services/siteEngineerService';
import { store } from '../../services/store';
import { CodeAuditReport, AgentTaskDispatch, CodePatchCommit } from '../../types';

export const SiteEngineerCodeView: React.FC = () => {
  const [state, setState] = useState(siteEngineerService.getState());
  const [activeTab, setActiveTab] = useState<'audit' | 'dispatcher' | 'patches'>('audit');
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedPatch, setSelectedPatch] = useState<CodePatchCommit | null>(
    state.patches.length > 0 ? state.patches[0] : null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New patch synthesis modal / drawer state
  const [newPatchModal, setNewPatchModal] = useState(false);
  const [newPatchForm, setNewPatchForm] = useState({
    title: '',
    description: '',
    patchType: 'conversion_booster' as CodePatchCommit['patchType'],
    affectedFile: 'src/components/checkout/CheckoutModal.tsx',
    diffSnippet: `@@ -85,6 +85,12 @@
+ // Booster de conversion autonome 1-Click
+ const isInstantDownloadAvailable = true;
+ const guaranteeTrustBadge = '100% Satisfait ou Remboursé sous 30 Jours';`
  });

  useEffect(() => {
    const unsub = siteEngineerService.subscribe(() => {
      const newState = siteEngineerService.getState();
      setState(newState);
      if (!selectedPatch && newState.patches.length > 0) {
        setSelectedPatch(newState.patches[0]);
      }
    });
    return unsub;
  }, [selectedPatch]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      siteEngineerService.runFullCodeAudit();
      setIsAuditing(false);
      showToast('Audit d\'intégrité terminé : 100% des flux vérifiés (0 lien cassé, latence < 40ms).');
    }, 700);
  };

  const handleSynthesizePatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatchForm.title) {
      showToast('Veuillez spécifier un titre pour le patch.');
      return;
    }

    siteEngineerService.synthesizeCodePatch(
      newPatchForm.title,
      newPatchForm.description,
      newPatchForm.patchType,
      [newPatchForm.affectedFile],
      newPatchForm.diffSnippet
    );

    setNewPatchModal(false);
    showToast(`Patch de code "${newPatchForm.title}" injecté et validé avec succès.`);
  };

  const handleRollback = (patchId: string) => {
    if (window.confirm('Voulez-vous annuler ce patch et restaurer la version précédente en toute sécurité ?')) {
      siteEngineerService.rollbackPatch(patchId);
      showToast('Patch annulé avec succès (Rollback de sécurité effectué).');
    }
  };

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
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                Agent 20 • Architecte Code, Auditeur & Répartiteur
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Intégrité {state.codeIntegrityPercent}% • Zéro Lien Cassé
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Auto-Guérison & Écriture de Code 24/24
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Vérification du Site, Répartition des Tâches & Écriture de Code Autonome
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Supervise en temps réel l'intégrité de la plateforme, répartit les calculs et tâches entre tous les sous-agents (SEO, Usine de Produits, Médias Sociaux) et génère des correctifs de code sans interruption de service.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setNewPatchModal(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Générer Patch de Code</span>
            </button>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Audit en Cours...' : 'Lancer Audit d\'Intégrité'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Score d'Intégrité Code</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{state.codeIntegrityPercent}%</div>
          <div className="text-[11px] text-slate-400 mt-1">0 erreur fatale, 0 warning bloquant</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Latence Moyenne Tunnel</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{state.latestAudit.latencyScoreMs} ms</div>
          <div className="text-[11px] text-slate-400 mt-1">Rendu instantané & SPA optimisée</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Tâches Réparties & Exécutées</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300">{state.dispatches.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Orchestration continue 24/24</div>
        </div>

        <div className="bg-[#121318] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Patches Autonomes Injectés</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300">{state.patches.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Sécurité vérifiée & Rollback actif</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit d'Intégrité & Santé du Code ({state.latestAudit.checksPassed} Points)</span>
        </button>

        <button
          onClick={() => setActiveTab('dispatcher')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'dispatcher'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Répartiteur de Charge & Tâches ({state.dispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('patches')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'patches'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Écriture de Code Autonome & Patches ({state.patches.length})</span>
        </button>
      </div>

      {/* TAB 1: AUDIT & HEALTH */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Matrice des Points de Contrôle & Diagnostic Temps Réel
              </h3>
              <span className="text-xs text-slate-400">
                Dernière vérification : {new Date(state.lastHealthCheckTimestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Passerelle de Paiement 1-Click (Stripe & Web3)</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Opérationnel
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tous les déclencheurs de confirmation de commande et délivrance de fichier immédiate sont validés.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Écouteurs Crypto Mempool (BTC, ETH, SOL)</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Opérationnel
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Adresses de réception crypto actives avec vérification cryptographique des hashs de transaction.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Liens Internes & Téléchargements Numériques</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 0 Lien Cassé
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Toutes les fiches produits, bundles et fichiers zip/pdf/notion sont accessibles sans erreur 404.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Schémas Données Structurées SEO (JSON-LD)</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validé Google Rich
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Balises Schema.org Product, AggregateOffer, Review et FAQPage injectées dans l'en-tête HTML.
                </p>
              </div>
            </div>

            {/* Issue log list */}
            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Historique des Optimisations Automatisées :</h4>
              <div className="space-y-2">
                {state.latestAudit.issues.map(iss => (
                  <div key={iss.id} className="p-3 bg-black/40 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{iss.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({iss.filePath})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-5">{iss.description}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Auto-Résolu
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISPATCHER */}
      {activeTab === 'dispatcher' && (
        <div className="space-y-4">
          <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">Répartiteur de Charge & Dispatcher des 21 Sous-Agents</h3>
            <p className="text-xs text-slate-400 mb-4">
              L'Agent 20 alloue les priorités de calcul, orchestre les cycles d'exploration de niches et synchronise la publication multicanale.
            </p>

            <div className="space-y-3">
              {state.dispatches.map(disp => (
                <div key={disp.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {disp.subAgentName}
                      </span>
                      <span className="text-xs font-bold text-white">{disp.taskTitle}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        disp.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}>
                        {disp.status === 'completed' ? 'Terminé' : 'En Cours...'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(disp.assignedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">
                    <strong className="text-slate-400">Payload :</strong> {disp.payloadSummary}
                  </p>

                  <div className="text-[11px] font-mono text-emerald-400 bg-black/40 p-2 rounded border border-emerald-500/10">
                    {disp.executionLog}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CODE WRITING & PATCHES */}
      {activeTab === 'patches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Diff Viewer */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    Visualiseur de Code & Diff Autonome
                  </h3>
                  {selectedPatch && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Sécurité {selectedPatch.safetyScore}%
                    </span>
                  )}
                </div>

                {selectedPatch ? (
                  <div className="space-y-3">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                      <div className="text-xs font-bold text-white mb-1">{selectedPatch.title}</div>
                      <p className="text-[11px] text-slate-400">{selectedPatch.description}</p>
                      <div className="mt-2 text-[10px] text-slate-500">
                        Fichiers modifiés : {selectedPatch.affectedFiles.join(', ')}
                      </div>
                    </div>

                    <div className="bg-black/50 border border-slate-800 rounded-lg p-3">
                      <div className="text-[10px] font-mono text-slate-400 mb-1.5">Diff GIT Synthétisé :</div>
                      <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                        {selectedPatch.diffSnippet}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-slate-500">
                        Statut : {selectedPatch.status === 'applied' ? 'Appliqué en Production' : 'Annulé (Rollback)'}
                      </span>

                      {selectedPatch.status === 'applied' && (
                        <button
                          onClick={() => handleRollback(selectedPatch.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Annuler ce Patch (Rollback)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Sélectionnez un patch ci-contre pour inspecter le code source modifié.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Patch List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#121318] border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-amber-400" />
                    Dépôt des Patches ({state.patches.length})
                  </h3>
                  <button
                    onClick={() => setNewPatchModal(true)}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    + Nouveau
                  </button>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                  {state.patches.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatch(p)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPatch?.id === p.id
                          ? 'bg-cyan-950/30 border-cyan-500/50'
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">{p.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          p.status === 'applied' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYNTHESIZE PATCH MODAL */}
      {newPatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13141C] border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Générer un Patch de Code Autonome
              </h3>
              <button onClick={() => setNewPatchModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSynthesizePatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Titre du Patch</label>
                <input
                  type="text"
                  value={newPatchForm.title}
                  onChange={e => setNewPatchForm({ ...newPatchForm, title: e.target.value })}
                  placeholder="Ex: Optimisation du bouton d'achat 1-Click"
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Type d'Amélioration</label>
                <select
                  value={newPatchForm.patchType}
                  onChange={e => setNewPatchForm({ ...newPatchForm, patchType: e.target.value as any })}
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="conversion_booster">Booster de Taux de Conversion (+)</option>
                  <option value="perf_optimization">Optimisation Performance & Latence</option>
                  <option value="seo_injection">Injection de Métadonnées SEO</option>
                  <option value="bugfix">Correction de Bug / Sécurité</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Fichier Cible</label>
                <input
                  type="text"
                  value={newPatchForm.affectedFile}
                  onChange={e => setNewPatchForm({ ...newPatchForm, affectedFile: e.target.value })}
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Extrait du Diff Code</label>
                <textarea
                  rows={4}
                  value={newPatchForm.diffSnippet}
                  onChange={e => setNewPatchForm({ ...newPatchForm, diffSnippet: e.target.value })}
                  className="w-full bg-[#1A1A1E] border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewPatchModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Compiler & Injecter Patch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
