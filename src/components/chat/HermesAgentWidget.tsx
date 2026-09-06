import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, Maximize2, MessageSquare, Minimize2, Sparkles, X } from 'lucide-react';
import { hermesAgentService } from '../../services/hermesAgentService';
import { HermesConversation } from './HermesConversation';
import { HermesAutonomyPanel, HermesBudgetPanel, HermesSkillsPanel } from './HermesControlPanels';

export const HermesAgentWidget: React.FC<{ onNavigateToView?: (view: string) => void }> = ({ onNavigateToView }) => {
  const state = useSyncExternalStore(hermesAgentService.subscribe, hermesAgentService.getState);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'chat' | 'tools' | 'budget' | 'autonomy'>('chat');
  const [unread, setUnread] = useState(false);
  const previousCount = useRef(state.messages.length);
  useEffect(() => {
    if (!open && state.messages.length > previousCount.current) setUnread(true);
    previousCount.current = state.messages.length;
  }, [state.messages.length, open]);
  useEffect(() => {
    if (open) { setUnread(false); void hermesAgentService.loadServerStatus(); void hermesAgentService.loadAutonomy(); }
  }, [open]);
  return <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end font-sans sm:bottom-5 sm:right-5">
    {!open ? <button onClick={() => setOpen(true)} aria-label="Ouvrir Hermes" className="group flex items-center gap-3 rounded-full border border-indigo-400/25 bg-[#14151d] px-4 py-3 text-left shadow-xl shadow-black/30 transition hover:border-indigo-400/60">
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-indigo-500/15 text-indigo-300"><Sparkles size={18} />{unread && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-emerald-400" />}</span>
      <span><span className="block text-xs font-semibold text-slate-200">Travailler avec Hermes</span><span className="mt-0.5 block text-[10px] text-slate-500">{state.activeRun ? 'Exécution en cours…' : 'Vos agents, sous votre contrôle'}</span></span>
    </button> : <section aria-label="Fenêtre Hermes" className={`flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0d0e13] shadow-2xl shadow-black/60 ${expanded ? 'h-[85dvh] w-[calc(100vw-24px)] sm:w-[min(1000px,90vw)]' : 'h-[730px] w-[calc(100vw-24px)] sm:w-[480px]'}`}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#14151d] p-3.5">
        <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-300"><Sparkles size={16} /></span><div><h2 className="text-sm font-semibold text-slate-100">Hermes</h2><p className="mt-0.5 text-[10px] text-slate-500">Outils en direct · accord avant action sensible</p></div></div>
        <div className="flex items-center gap-1 text-slate-500">
          {onNavigateToView && <button title="Ouvrir l’espace agent" aria-label="Ouvrir l’espace agent" onClick={() => { onNavigateToView('hermes_agent'); setOpen(false); }} className="rounded-lg p-1.5 hover:bg-slate-800 hover:text-white"><ArrowUpRight size={15} /></button>}
          <button title={expanded ? 'Réduire' : 'Agrandir'} aria-label={expanded ? 'Réduire Hermes' : 'Agrandir Hermes'} onClick={() => setExpanded(!expanded)} className="rounded-lg p-1.5 hover:bg-slate-800 hover:text-white">{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          <button title="Fermer" aria-label="Fermer Hermes" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-800 hover:text-white"><X size={16} /></button>
        </div>
      </header>
      <nav className="flex items-center gap-1 border-b border-slate-800 bg-[#101117] px-3 py-2" aria-label="Onglets Hermes">
        {([{ id: 'chat', label: 'Discussion' }, { id: 'tools', label: `Outils${state.serverStatus ? ` · ${state.serverStatus.skillsCount}` : ''}` }, { id: 'budget', label: 'Coûts' }, { id: 'autonomy', label: 'Autonomie' }] as const).map(t => <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] ${tab === t.id ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-200'}`}>{t.id === 'chat' && <MessageSquare size={11} />}{t.label}</button>)}
      </nav>
      {tab === 'chat' ? <div className="min-h-0 flex-1"><HermesConversation compact={!expanded} /></div> : <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">{tab === 'tools' ? <HermesSkillsPanel /> : tab === 'budget' ? <HermesBudgetPanel /> : <HermesAutonomyPanel />}</div>}
    </section>}
  </div>;
};
