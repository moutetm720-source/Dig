import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, Bot, Check, CircleDot, RefreshCw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { hermesAgentService } from '../../services/hermesAgentService';
import { HermesConversation } from '../chat/HermesConversation';
import { HermesAutonomyPanel, HermesBudgetPanel, HermesSkillsPanel } from '../chat/HermesControlPanels';

export const HermesAgentView: React.FC = () => {
  const state = useSyncExternalStore(hermesAgentService.subscribe, hermesAgentService.getState);
  const [tab, setTab] = useState<'team' | 'skills' | 'budget' | 'autonomy'>('team');
  useEffect(() => { void hermesAgentService.loadServerStatus(); void hermesAgentService.loadAutonomy(); }, []);
  const st = state.serverStatus;
  const busy = state.status === 'thinking' || state.status === 'executing';
  const runningSteps = state.messages.find(m => m.id === state.activeRun?.messageId)?.steps || [];
  return <div className="mx-auto max-w-[1480px] space-y-6 p-4 font-sans text-slate-200 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500"><span>Votre fabrique</span><span className="text-slate-700">/</span><span className="text-indigo-300">Espace agent</span></div>
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10"><Sparkles size={22} className="text-indigo-300" /></div><div><h1 className="text-2xl font-semibold tracking-tight text-slate-100">Hermes</h1><p className="mt-0.5 text-xs text-slate-500">Un objectif. Des actions vérifiables. Vous gardez le contrôle.</p></div></div>
      </div>
      <div className="flex items-center gap-3"><span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] text-emerald-300"><ShieldCheck size={12} /> IA sans API payante</span><button title="Actualiser l’état serveur" aria-label="Actualiser l’état serveur" onClick={() => void hermesAgentService.loadServerStatus()} className="rounded-lg border border-slate-800 p-2 text-slate-500 hover:text-slate-100"><RefreshCw size={14} /></button></div>
    </header>

    {state.statusError && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">État serveur indisponible : {state.statusError}</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: 'Équipe disponible', value: st ? `${st.agentsCount} agents` : 'Chargement…', detail: 'Spécialistes coordonnés selon la tâche' },
        { label: 'Outils serveur', value: st ? `${st.skillsCount} compétences` : 'Chargement…', detail: 'Registre réel, extensible' },
        { label: 'Fournisseur prioritaire', value: st?.provider || 'Non vérifié', detail: 'Configuration · disponibilité testée à l’appel' },
        { label: 'Mémoire', value: st ? `${st.memoriesCount} entrées` : 'Chargement…', detail: 'Discussion conservée dans ce navigateur' }
      ].map(item => <div key={item.label} className="min-w-0 rounded-xl border border-slate-800/80 bg-[#111219] p-4"><p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">{item.label}</p><p className="truncate text-sm font-medium text-slate-200" title={item.value}>{item.value}</p><p className="mt-1.5 text-[10px] leading-4 text-slate-600">{item.detail}</p></div>)}
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section aria-label="Console interactive Hermes" className="h-[min(800px,85vh)] min-h-[580px] min-w-0 overflow-hidden rounded-2xl border border-slate-800 shadow-xl shadow-black/10"><HermesConversation /></section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111219] p-4">
          <div className="mb-5 grid grid-cols-4 gap-1 rounded-lg bg-[#0c0d12] p-1">
            {([{ id: 'team', label: 'Équipe' }, { id: 'skills', label: 'Outils' }, { id: 'budget', label: 'Coûts' }, { id: 'autonomy', label: 'Autonomie' }] as const).map(t => <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`rounded-md py-2 text-[10px] transition ${tab === t.id ? 'bg-[#222431] text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t.label}</button>)}
          </div>
          {tab === 'team' && <div className="space-y-3">
            <div className="flex items-center gap-2"><Users size={15} className="text-indigo-400" /><h2 className="text-xs font-semibold text-slate-200">Une équipe, pas une simulation</h2></div>
            <p className="text-[11px] leading-5 text-slate-500">L’orchestrateur choisit les spécialistes utiles. Un agent n’est affiché « en cours » que lorsqu’une étape est réellement engagée.</p>
            <div className="custom-scrollbar max-h-[440px] space-y-1.5 overflow-y-auto">{(st?.agents || []).map(a => {
              const running = runningSteps.some(s => s.agentId === a.id && s.status === 'running');
              const used = runningSteps.some(s => s.agentId === a.id && s.status === 'ok');
              const selected = state.agentId === a.id;
              return <button key={a.id} disabled={busy} onClick={() => hermesAgentService.setAgent(a.id)} title={a.description} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-default ${selected ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-800/70 hover:border-slate-600'}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#1c1e28] text-base">{a.emoji || <Bot size={15} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-slate-300">{a.name}</span><span className={`mt-1 block text-[10px] ${running ? 'text-indigo-300' : used ? 'text-emerald-400' : 'text-slate-600'}`}>{running ? 'Outil en cours' : used ? 'Résultat reçu' : selected ? 'Sélectionné' : 'Disponible pour délégation'}</span></span>{running ? <CircleDot size={13} className="animate-pulse text-indigo-400" /> : used ? <Check size={13} className="text-emerald-400" /> : selected ? <ArrowUpRight size={13} className="text-indigo-400" /> : null}
              </button>;
            })}</div>
          </div>}
          {tab === 'skills' && <HermesSkillsPanel />}
          {tab === 'budget' && <HermesBudgetPanel />}
          {tab === 'autonomy' && <HermesAutonomyPanel />}
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#101118] p-4">
          <h3 className="flex items-center gap-2 text-xs font-medium text-slate-300"><ShieldCheck size={15} className="text-emerald-400" /> Même sans fournisseur IA</h3>
          <p className="text-[11px] leading-5 text-slate-500">Consultez vos données directement, sans appel à un modèle ni clé API.</p>
          <div className="flex gap-2"><button disabled={busy} onClick={() => void hermesAgentService.inspect()} className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-[11px] text-slate-300 hover:border-indigo-400 disabled:opacity-40">Audit sans IA</button><button disabled={busy} onClick={() => void hermesAgentService.inspect('metrics_summary')} className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-[11px] text-slate-300 hover:border-indigo-400 disabled:opacity-40">Mes chiffres réels</button></div>
        </div>
      </aside>
    </div>
  </div>;
};
