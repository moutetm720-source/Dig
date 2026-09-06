import React, { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ChevronRight, Copy, Download, Loader2, MessageCircleQuestion, RotateCcw, ShieldCheck, Terminal, X } from 'lucide-react';
import { hermesAgentService, type HermesMessage } from '../../services/hermesAgentService';
import type { AgentStep } from '../../types/hermes';
import { HermesMarkdown } from './HermesMarkdown';

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const statuses: Record<AgentStep['status'], string> = {
  running: 'En cours', ok: 'Résultat reçu', error: 'Échec', denied: 'Bloqué', confirmation_required: 'À confirmer', cancelled: 'Interrompu'
};
const outcomes = {
  completed: 'Réponse reçue', needs_input: 'À vous de choisir', needs_confirmation: 'Votre accord requis',
  partial: 'Partiellement abouti', blocked: 'Bloqué', cancelled: 'Arrêté', error: 'Non abouti'
};
function ToolStep({ step }: { step: AgentStep }) {
  const ok = step.status === 'ok';
  const running = step.status === 'running';
  let summary = step.summary;
  try { summary = JSON.stringify(JSON.parse(summary), null, 2); } catch { /* texte lisible tel quel */ }
  return <details className={`group rounded-lg border ${running ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-800 bg-[#101119]'} ${step.parentId ? 'ml-3 border-l-indigo-500/30' : ''}`}>
    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[11px]">
      {running ? <Loader2 size={13} className="shrink-0 animate-spin text-indigo-300" /> : ok ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" /> : <AlertCircle size={13} className="shrink-0 text-amber-400" />}
      <span className="min-w-0 flex-1"><span className="font-mono text-slate-200">{step.tool}</span>{step.agentId && <span className="ml-2 text-slate-500">{step.agentId}</span>}</span>
      <span className={`shrink-0 text-[10px] ${ok ? 'text-emerald-400' : running ? 'text-indigo-300' : 'text-amber-400'}`}>{statuses[step.status]}</span>
      {step.durationMs !== undefined && <span className="hidden text-[10px] text-slate-500 sm:inline">{(step.durationMs / 1000).toFixed(1)} s</span>}
      <ChevronRight size={12} className="shrink-0 text-slate-500 transition-transform group-open:rotate-90" />
    </summary>
    <div className="space-y-2 border-t border-slate-800 px-3 py-2 text-[11px]">
      {step.args && Object.keys(step.args).length > 0 && <div><p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Paramètres</p><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-slate-400">{JSON.stringify(step.args, null, 2)}</pre></div>}
      <p className="text-[10px] uppercase tracking-wide text-slate-500">Résultat serveur</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-slate-300">{summary}</pre>
    </div>
  </details>;
}

export function HermesMessageCard({ message: m, busy, decidingAction }: { message: HermesMessage; busy: boolean; decidingAction?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [answer, setAnswer] = useState('');
  const user = m.sender === 'user';
  const q = m.question;
  const pcs = m.pendingConfirmations || (m.pendingConfirmation ? [m.pendingConfirmation] : []);
  const hasResults = m.steps?.some(s => s.tool !== 'ask_user');
  return <article className={`min-w-0 ${user ? 'ml-8 sm:ml-16' : ''}`} aria-label={user ? 'Votre message' : 'Réponse Hermes'}>
    <div className={`mb-2 flex items-center gap-2 text-[10px] ${user ? 'justify-end' : ''}`}>
      {!user && <span className="grid h-5 w-5 place-items-center rounded-md bg-indigo-500/15 text-[10px] font-bold text-indigo-300">H</span>}
      <span className="font-semibold text-slate-300">{user ? 'Vous' : m.sender === 'system' ? 'Journal' : 'Hermes'}</span>
      {!user && m.agent && <span className="text-slate-500">{m.agent}</span>}
      <span className="text-slate-600">· {m.timestamp}</span>
      {m.outcome && !m.streaming && <span className={`ml-auto rounded-full px-2 py-0.5 ${['error', 'blocked', 'partial'].includes(m.outcome) ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800/80 text-slate-400'}`}>{pcs.length > 0 && pcs.every(p => p.confirmed || p.refused) ? 'Décision enregistrée' : outcomes[m.outcome]}</span>}
    </div>
    <div className={`min-w-0 rounded-2xl ${user ? 'rounded-tr-sm border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-slate-100' : 'space-y-3 text-slate-300'}`}>
      {m.updates && m.updates.length > 0 && <details open={m.streaming || undefined} className="rounded-xl border border-slate-800 px-3 py-2">
        <summary className="cursor-pointer text-[11px] text-slate-400">Points d’étape ({m.updates.length})</summary>
        <div className="mt-2 space-y-3 text-xs">{m.updates.map((u, i) => <div key={i}><p className="mb-1 text-[10px] text-indigo-400">{u.agentId}</p><HermesMarkdown>{u.text}</HermesMarkdown></div>)}</div>
      </details>}
      {!!m.steps?.length && <div className="space-y-1.5" aria-label="Étapes réellement exécutées">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500"><Terminal size={12} /> Exécution serveur · {m.steps.length} étapes</p>
        {m.steps.map((step, i) => <ToolStep key={step.id || i} step={step} />)}
      </div>}
      {m.content && <div className="text-[13px] leading-7">{user ? <div className="whitespace-pre-wrap break-words">{m.content}</div> : <HermesMarkdown>{m.content}</HermesMarkdown>}</div>}
      {m.streaming && !m.content && !m.steps?.length && !m.updates?.length && <p className="flex items-center gap-2 py-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> En attente du moteur serveur…</p>}
      {q && <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-indigo-200"><MessageCircleQuestion size={16} /> {q.answer ? 'Votre choix' : 'Précisez la prochaine étape'}</p>
        {m.content !== q.question && <p className="text-xs leading-6">{q.question}</p>}
        {q.answer ? <p className="text-xs text-emerald-300">{q.answer}</p> : <>
          <div className="grid gap-2 sm:grid-cols-2">{q.options.map(option => <button key={option} disabled={busy || m.streaming} onClick={() => void hermesAgentService.answerQuestion(m.id, option)} className="rounded-lg border border-slate-700 bg-[#151721] px-3 py-2.5 text-left text-xs text-slate-200 transition hover:border-indigo-400 hover:bg-indigo-500/10 disabled:opacity-50">{option}</button>)}</div>
          {q.allowCustom && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void hermesAgentService.answerQuestion(m.id, answer); }}>
            <input value={answer} maxLength={200} onChange={e => setAnswer(e.target.value)} placeholder="Ou une autre réponse…" aria-label="Votre réponse personnalisée" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:border-indigo-400" />
            <button type="submit" disabled={busy || !answer.trim()} className="rounded-lg bg-indigo-600 px-3 text-xs text-white disabled:opacity-50">Répondre</button>
          </form>}
        </>}
      </div>}
      {pcs.map(pc => {
        const expired = pc.expiresAt ? new Date(pc.expiresAt).getTime() <= Date.now() : false;
        const decided = pc.confirmed || pc.refused;
        return <div key={pc.actionId} className={`space-y-2.5 rounded-xl border p-4 ${decided ? 'border-slate-800 bg-slate-900/30' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-200"><ShieldCheck size={16} /> {pc.confirmed ? 'Action exécutée' : pc.refused ? 'Action refusée' : expired ? 'Confirmation expirée' : 'Action sensible · votre accord uniquement'}</p>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-slate-300">{pc.summary}</pre>
          {!decided && !expired && <>
            <p className="text-[10px] text-slate-500">Aucune exécution avant votre accord.{pc.expiresAt && ` Valable jusqu’à ${new Date(pc.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy || m.streaming} onClick={() => void hermesAgentService.confirmAction(pc.actionId)} className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50">{decidingAction === pc.actionId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirmer cette action</button>
              <button disabled={busy || m.streaming} onClick={() => void hermesAgentService.refuseAction(pc.actionId)} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[11px] text-slate-300 hover:border-rose-400 disabled:opacity-50"><X size={13} /> Refuser</button>
            </div>
          </>}
          {expired && !decided && <p className="text-[11px] text-slate-400">Demandez un nouveau plan pour obtenir une nouvelle confirmation.</p>}
          {pc.error && <p role="alert" className="text-[11px] text-rose-300">{pc.error}</p>}
        </div>;
      })}
    </div>
    {!m.streaming && !user && m.content && m.id !== 'welcome' && <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
      <button className="flex items-center gap-1.5 hover:text-slate-200" onClick={async () => { try { await navigator.clipboard.writeText(m.content); setCopied(true); } catch { setCopyError(true); } }} aria-label="Copier la réponse">{copied ? <Check size={12} /> : <Copy size={12} />}{copyError ? 'Copie indisponible' : copied ? 'Copié' : 'Copier'}</button>
      <button className="flex items-center gap-1.5 hover:text-slate-200" onClick={() => downloadText(`hermes-${m.id.slice(0, 8)}.md`, m.content)}><Download size={12} /> Télécharger</button>
      {m.outcome && ['partial', 'error', 'blocked', 'cancelled'].includes(m.outcome) && <button disabled={busy} className="flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 disabled:opacity-50" onClick={() => void hermesAgentService.continueMessage(m.id)}><RotateCcw size={12} />{hasResults ? 'Poursuivre sans répéter' : 'Réessayer'}</button>}
      {m.provider && <span className="ml-auto max-w-full truncate" title={`${m.provider} · ${m.model || ''}`}>{m.provider}{m.model && m.model !== '-' ? ` · ${m.model}` : ''}</span>}
    </div>}
  </article>;
}
