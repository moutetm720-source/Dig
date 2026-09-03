import React, { useState, useEffect } from 'react';
import {
  Bot,
  Users,
  Send,
  Terminal,
  Cpu,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { hermesAgentService, AgentStep } from '../../services/hermesAgentService';
import { agentSynergyService, SynergyExecutionResult } from '../../services/agentSynergyService';

export const MultiAgentCenterView: React.FC = () => {
  const [status, setStatus] = useState(hermesAgentService.getState().serverStatus);
  const [query, setQuery] = useState('');
  const [agentId, setAgentId] = useState('orchestrator');
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<SynergyExecutionResult | null>(null);
  const [history, setHistory] = useState<SynergyExecutionResult[]>(agentSynergyService.getHistory());

  useEffect(() => {
    void hermesAgentService.loadServerStatus().then(setStatus);
    const unsub = agentSynergyService.subscribe(() => setHistory(agentSynergyService.getHistory()));
    return () => unsub();
  }, []);

  const agents = status?.agents || [];

  const run = async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setCurrent(null);
    try {
      const result = await agentSynergyService.runSynergyWorkflow(query.trim(), agentId);
      setCurrent(result);
    } finally {
      setRunning(false);
    }
  };

  const renderSteps = (steps: AgentStep[]) => {
    if (!steps || steps.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-start gap-1.5 text-[10px] font-mono px-2 py-1 rounded border ${
            s.status === 'ok' ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300' : 'border-amber-500/20 bg-amber-950/20 text-amber-300'
          }`}>
            <Terminal className="w-3 h-3 mt-0.5 shrink-0" />
            <span><b>{s.tool}</b> [{s.status}]{s.summary ? ` — ${s.summary.slice(0, 100)}` : ''}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#111118] via-[#161622] to-[#0F0F14] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">Centre Multi-Agents</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Hermes v4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              8 agents spécialisés qui partagent les 29 compétences réelles du moteur serveur. Chaque exécution passe par
              la boucle d'agent (plan → outils → observation) et est journalisée.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400 bg-[#0A0A0E]/80 border border-slate-800 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <b className="text-slate-300">Note historique :</b> l'ancienne « Alliance OBLITERATUS × HERMES » était une
            simulation locale (aucune opération réelle, chiffres inventés). Le module OBLITERATUS a été retiré du serveur
            le 3 septembre 2026. Seule la synergie réelle via le moteur Hermes subsiste.
          </p>
        </div>
      </div>

      {/* État moteur */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Moteur</div>
            <div className="text-sm font-bold text-white">{status ? 'Hermes v4 (serveur)' : '…'}</div>
          </div>
        </div>
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Bot className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fournisseur IA</div>
            <div className="text-sm font-bold text-white">{status?.provider || '—'}</div>
          </div>
        </div>
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Agents</div>
            <div className="text-sm font-bold text-white">{status?.agentsCount ?? '…'}</div>
          </div>
        </div>
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Terminal className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Skills partagés</div>
            <div className="text-sm font-bold text-white">{status?.skillsCount ?? '…'}</div>
          </div>
        </div>
      </div>

      {/* Grille des agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(agents.length ? agents : [{ id: 'orchestrator', name: 'Hermes (orchestrateur)', description: 'Chargement…', skills: [], maxSteps: 6 }]).map(a => (
          <div key={a.id} className="bg-[#111114] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">{a.name}</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed min-h-[42px]">{a.description}</p>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              <span>{a.skills.length} skills</span>
              <span>≤{a.maxSteps} pas</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exécution */}
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-400" />
            Lancer une synergie réelle
          </h2>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="Ex : « Analyse mes ventes et propose une action de pricing », « Fais un audit de sécurité »…"
            className="w-full bg-[#1A1A22] border border-slate-700/80 focus:border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none resize-none"
          />

          <div className="flex items-center gap-3">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="flex-1 bg-[#1A1A22] border border-slate-700 text-white rounded-xl p-2.5 text-xs outline-none"
            >
              {(agents.length ? agents : [{ id: 'orchestrator', name: 'Orchestrateur' }]).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button
              onClick={() => void run()}
              disabled={!query.trim() || running}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              {running ? 'Exécution…' : 'Exécuter'}
            </button>
          </div>

          {current && (
            <div className="bg-[#0A0A0E] border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold">
                {current.success
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <XCircle className="w-4 h-4 text-rose-400" />}
                <span className={current.success ? 'text-emerald-300' : 'text-rose-300'}>
                  {current.success ? `Réponse de ${current.agentName}` : 'Échec (rien n\'a été inventé)'}
                </span>
                {current.provider && <span className="text-slate-500 font-normal">• {current.provider}</span>}
              </div>
              {current.response && (
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{current.response}</div>
              )}
              {current.error && <div className="text-xs text-rose-300">{current.error}</div>}
              {renderSteps(current.steps)}
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Exécutions de la session
          </h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {history.length === 0 && (
              <div className="text-[11px] text-slate-500">Aucune exécution pour l'instant.</div>
            )}
            {history.map(h => (
              <div key={h.id} className="bg-[#0A0A0E] border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-indigo-300">{h.agentName}</span>
                  <span className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">{h.query}</div>
                <div className={`text-[10px] font-mono ${h.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {h.success ? `ok — ${h.steps.length} outil(s) exécuté(s)` : 'erreur'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
