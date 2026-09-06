import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowUp, CircleHelp, Download, Loader2, Plus, ShieldCheck, Square, Sparkles } from 'lucide-react';
import { hermesAgentService } from '../../services/hermesAgentService';
import { downloadText, HermesMessageCard } from './HermesMessageCard';

const prompts = [
  { label: 'Préparer des ventes à budget zéro', text: 'Je vise 10 000 € de ventes, avec 0 € de budget initial. Examine mes actifs réels, propose un plan réaliste sans publicité payante et coordonne les agents utiles. Ne garantis aucun revenu. Demande-moi les précisions indispensables et mon accord avant toute publication.' },
  { label: 'Auditer ma boutique', text: 'Audite ma boutique et mes paiements en lecture seule. Donne les résultats vérifiés, les trois blocages prioritaires et les prochaines étapes.' },
  { label: 'Préparer du contenu organique', text: 'Examine mes produits publiés et mes canaux. Propose une offre et prépare des brouillons pour les canaux pertinents, sans dépense et sans publication automatique.' },
  { label: 'Diagnostiquer un problème de code', text: 'Lance un diagnostic des intégrations et du code. Explique les erreurs réellement détectées et propose un correctif à valider avant toute modification.' }
];

export function HermesConversation({ compact = false }: { compact?: boolean }) {
  const state = useSyncExternalStore(hermesAgentService.subscribe, hermesAgentService.getState);
  const [text, setText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const busy = state.status === 'thinking' || state.status === 'executing';
  const active = state.activeRun;
  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [state.messages, active?.label]);
  useEffect(() => {
    if (!active?.startedAt) return;
    const update = () => setElapsed(Math.floor((Date.now() - active.startedAt) / 1000));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [active?.startedAt]);
  useEffect(() => {
    if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(input.current.scrollHeight, 140)}px`; }
  }, [text]);
  const send = () => {
    if (!text.trim() || busy) return;
    follow.current = true;
    const prompt = text; setText(''); void hermesAgentService.sendMessage(prompt);
  };
  const agents = state.serverStatus?.agents || [];
  return <div className="flex h-full min-h-0 flex-col bg-[#0d0e13] text-slate-300">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#111219] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
        <select aria-label="Agent spécialisé" disabled={busy} value={state.agentId} onChange={e => hermesAgentService.setAgent(e.target.value)} className="max-w-[240px] rounded-lg bg-[#191b26] px-2 py-1.5 text-xs font-medium text-slate-200 outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-60">
          {agents.length ? agents.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>) : <option value="orchestrator">Hermes · Orchestrateur</option>}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button title="Exporter la discussion" aria-label="Exporter la discussion" className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200" onClick={() => downloadText('conversation-hermes.md', state.messages.map(m => `## ${m.sender === 'user' ? 'Vous' : 'Hermes'} · ${m.timestamp}\n\n${m.content}${m.steps?.length ? '\n\n### Étapes serveur\n' + m.steps.map(s => `- ${s.tool} [${s.status}] : ${s.summary}`).join('\n') : ''}`).join('\n\n---\n\n'))}><Download size={14} /></button>
        <button disabled={busy} title="Nouvelle discussion" aria-label="Nouvelle discussion" className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30" onClick={() => setResetting(!resetting)}><Plus size={16} /></button>
      </div>
    </div>
    {resetting && <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs">Effacer les échanges de ce navigateur ? Le journal serveur reste conservé.<button className="text-rose-300" onClick={() => { hermesAgentService.clearHistory(); setResetting(false); }}>Effacer</button><button onClick={() => setResetting(false)}>Annuler</button></div>}
    <div ref={scroll} onScroll={() => { const s = scroll.current; if (s) follow.current = s.scrollHeight - s.scrollTop - s.clientHeight < 90; }} className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto ${compact ? 'space-y-6 p-4' : 'space-y-8 p-5 sm:p-7'}`} role="log" aria-label="Discussion avec Hermes" aria-relevant="additions">
      {state.messages.map(m => <HermesMessageCard key={m.id} message={m} busy={busy} decidingAction={state.decidingAction} />)}
      {state.messages.length === 1 && <div className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {prompts.slice(0, compact ? 2 : 4).map(p => <button key={p.label} className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-[#14151d] px-4 py-3 text-left text-xs text-slate-400 transition hover:border-indigo-500/40 hover:text-slate-100" onClick={() => { setText(p.text); input.current?.focus(); }}><Sparkles size={14} className="shrink-0 text-indigo-400/70 group-hover:text-indigo-300" />{p.label}</button>)}
      </div>}
    </div>
    {active && <div role="status" className="flex items-center gap-2 border-t border-indigo-500/15 bg-indigo-500/5 px-4 py-2.5 text-[11px] text-indigo-300">
      <Loader2 size={13} className="shrink-0 animate-spin" /><span className="min-w-0 flex-1 break-words">{active.label}</span><span className="shrink-0 font-mono text-indigo-400/70">{elapsed}s</span>
    </div>}
    {!active && state.status === 'executing' && <div role="status" className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-300"><Loader2 size={13} className="animate-spin" /> En attente du résultat serveur…</div>}
    <form onSubmit={e => { e.preventDefault(); send(); }} className="shrink-0 border-t border-slate-800/70 bg-[#101117] p-3 sm:p-4">
      <div className="rounded-xl border border-slate-700/70 bg-[#181922] p-2 transition focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/5">
        <textarea ref={input} aria-label="Votre message à Hermes" rows={2} maxLength={4000} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} placeholder="Décrivez votre objectif, posez une question…" className="block max-h-36 min-h-12 w-full resize-none bg-transparent px-2 py-1.5 text-[13px] leading-6 text-slate-100 outline-none placeholder:text-slate-500" />
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400/80"><ShieldCheck size={12} /> Sans API payante</span>
          <div className="flex items-center gap-3">
            {text.length > 3500 && <span className="text-[10px] text-slate-500">{text.length}/4000</span>}
            {active ? <button type="button" onClick={() => void hermesAgentService.stopCurrentRun()} disabled={active.stopping} aria-label="Arrêter l’exécution" className="flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"><Square size={12} />{active.stopping ? 'Arrêt…' : 'Arrêter'}</button>
              : <button type="submit" disabled={busy || !text.trim()} aria-label="Envoyer à Hermes" className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500"><span>Envoyer</span><ArrowUp size={15} /></button>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-600"><span className="flex items-center gap-1"><CircleHelp size={10} /> Vérifiez les résultats avant de publier.</span><span className={compact ? 'hidden sm:inline' : ''}>Entrée pour envoyer · Maj+Entrée pour une ligne</span></div>
    </form>
  </div>;
}
