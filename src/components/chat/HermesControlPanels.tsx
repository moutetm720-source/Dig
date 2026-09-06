import React, { useState, useSyncExternalStore } from 'react';
import { Activity, LockKeyhole, Search, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { hermesAgentService } from '../../services/hermesAgentService';
import { HermesMarkdown } from './HermesMarkdown';

export function HermesSkillsPanel() {
  const state = useSyncExternalStore(hermesAgentService.subscribe, hermesAgentService.getState);
  const [search, setSearch] = useState('');
  const skills = (state.serverStatus?.skills || []).filter(s => `${s.name} ${s.description}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-3">
    <label className="flex items-center gap-2 rounded-lg border border-slate-700/70 bg-[#0e1016] px-3 py-2"><Search size={13} className="text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher une compétence" placeholder="Rechercher une compétence…" className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none" /></label>
    <p className="text-[10px] text-slate-500">{skills.length} compétences issues du registre serveur</p>
    <div className="custom-scrollbar max-h-[430px] space-y-2 overflow-y-auto">
      {skills.map(s => <details key={s.name} className="rounded-lg border border-slate-800 bg-[#13151d] px-3 py-2.5">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px]"><Terminal size={12} className="shrink-0 text-indigo-400" /><span className="min-w-0 flex-1 break-all font-mono text-slate-300">{s.name}</span>{s.confirmation && <LockKeyhole size={12} className="shrink-0 text-amber-400" aria-label="Confirmation requise" />}</summary>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">{s.description}</p>
        {s.confirmation && <p className="mt-2 text-[10px] text-amber-300">Accord explicite requis avant exécution.</p>}
      </details>)}
      {!skills.length && <p className="py-4 text-xs text-slate-500">{state.serverStatus ? 'Aucune compétence ne correspond.' : 'Registre en cours de chargement…'}</p>}
    </div>
  </div>;
}

export function HermesBudgetPanel() {
  const state = useSyncExternalStore(hermesAgentService.subscribe, hermesAgentService.getState);
  return <div className="space-y-4 text-xs">
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-300"><ShieldCheck size={16} /> Sans API payante</h3>
      <p className="leading-6 text-slate-400">Le chat exclut les fournisseurs payants ou à facturation inconnue. Il ne bascule pas vers eux si un quota gratuit est épuisé.</p>
    </div>
    <div className="space-y-2">
      {(state.serverStatus?.providerPool || []).map(p => <div key={p.name} className="rounded-lg border border-slate-800 p-3">
        <div className="mb-1 flex items-center justify-between gap-2"><span className="font-medium text-slate-300">{p.name}</span><span className={`text-[10px] ${p.costPolicy.eligible ? 'text-emerald-400' : 'text-amber-400'}`}>{p.costPolicy.eligible ? 'Autorisé' : 'Bloqué'}</span></div>
        <p className="break-all text-[10px] text-slate-500">{p.model}</p><p className="mt-1 text-[10px] leading-5 text-slate-500">{p.costPolicy.label}</p>
      </div>)}
    </div>
    <p className="text-[11px] leading-6 text-slate-500">Les offres gratuites ont des quotas et peuvent être indisponibles. L’hébergement, les ressources d’un modèle local et les frais d’encaissement éventuels sont distincts. Aucun revenu n’est garanti.</p>
    <details className="rounded-lg border border-slate-800 p-3 text-slate-400"><summary className="cursor-pointer">Utiliser un modèle local sans clé cloud</summary><p className="mt-2 text-[11px] leading-6">Sur votre serveur, lancez <code className="text-indigo-300">node scripts/setup-local-llm.mjs</code>, puis configurez l’endpoint et le modèle indiqués. Prévoir la RAM et le stockage nécessaires. Ne collez pas de clé secrète dans la discussion.</p></details>
  </div>;
}

export function HermesAutonomyPanel() {
  const state = useSyncExternalStore(hermesAgentService.subscribe, hermesAgentService.getState);
  const busy = state.status === 'thinking' || state.status === 'executing';
  return <div className="space-y-4 text-xs">
    <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-slate-200"><Activity size={16} className="text-emerald-400" /> Autonomie serveur</h3><button onClick={() => hermesAgentService.toggleAutonomy()} className={`rounded-full border px-3 py-1.5 text-[10px] ${state.isAutonomousEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>{state.isAutonomousEnabled ? 'Active · mettre en pause' : 'En pause · activer'}</button></div>
    <p className="text-[11px] leading-6 text-slate-500">Cycles planifiés sur le serveur : lecture, veille et brouillons. Pas de publication, de dépense ni de suppression automatique. Le chat et ses boutons Arrêter ne modifient pas ce planificateur.</p>
    <label className="block space-y-2"><span className="text-[10px] text-slate-500">Fréquence des cycles</span><select aria-label="Fréquence des cycles autonomes" value={state.autonomousIntervalMinutes} onChange={e => hermesAgentService.setAutoInterval(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-[#171922] p-2 text-slate-300">{[15, 30, 60].map(n => <option key={n} value={n}>Toutes les {n} minutes</option>)}</select></label>
    <div className="rounded-lg border border-slate-800 p-3 text-[11px] text-slate-400"><p>{state.autonomy?.running ? 'Cycle en cours sur le serveur' : state.lastAutonomousRun ? `Dernier cycle : ${new Date(state.lastAutonomousRun).toLocaleString()}` : 'Aucun cycle enregistré'}</p><p className="mt-1 text-[10px] text-slate-600">{state.autonomy?.runs || 0} cycles enregistrés</p></div>
    <button disabled={busy || state.autonomy?.running} onClick={() => void hermesAgentService.runAutonomousNow()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-40"><Zap size={14} /> Lancer un cycle maintenant</button>
    {!!state.autonomy?.recent.length && <div className="space-y-2"><p className="text-[10px] uppercase tracking-wide text-slate-500">Journal réel</p>{state.autonomy.recent.slice(0, 3).map((r, i) => <details key={r.at} open={i === 0 || undefined} className="rounded-lg border border-slate-800 p-3"><summary className="cursor-pointer text-[10px] text-slate-400">{new Date(r.at).toLocaleString()} · {r.actions.length} actions</summary><div className="mt-3 text-[11px] leading-6"><HermesMarkdown>{r.report}</HermesMarkdown></div></details>)}</div>}
  </div>;
}
