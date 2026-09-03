import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Send,
  Activity,
  ShieldCheck,
  Database,
  Radio,
  Terminal,
  Zap,
  Trash2,
  CheckCircle2,
  Bot,
  Cpu,
  Layers,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import {
  hermesAgentService,
  HermesMessage,
  HermesAgent
} from '../../services/hermesAgentService';

export const HermesAgentView: React.FC = () => {
  const [state, setState] = useState(hermesAgentService.getState());
  const [inputText, setInputText] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = hermesAgentService.subscribe(() => setState(hermesAgentService.getState()));
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const st = state.serverStatus;
  const providerLabel = st?.provider || '—';
  const providerOk = st ? st.status === 'active' : false;

  const handleSend = async () => {
    if (!inputText.trim() || state.status === 'thinking') return;
    const msg = inputText;
    setInputText('');
    await hermesAgentService.sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const quickPrompts = [
    '📊 Fais un audit global de la fabrique',
    '💰 Analyse mes prix et propose des ajustements',
    '🚀 Crée une bannière et un pack de contenu pour mon meilleur produit',
    '📡 Vérifie mes canaux sociaux et prépare une diffusion'
  ];

  const renderSteps = (msg: HermesMessage) => {
    if (!msg.steps || msg.steps.length === 0) return null;
    return (
      <div className="mb-2.5 pb-2 border-b border-slate-700/50 space-y-1">
        {msg.steps.map((t, idx) => {
          const color =
            t.status === 'ok' ? 'text-emerald-300 border-emerald-500/20 bg-emerald-950/30'
            : t.status === 'denied' ? 'text-rose-300 border-rose-500/20 bg-rose-950/30'
            : 'text-amber-300 border-amber-500/20 bg-amber-950/30';
          return (
            <div key={idx} className={`flex items-start gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border ${color}`}>
              <Terminal className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{t.tool}</span>
                <span className="text-slate-500"> [{t.status}]</span>
                {t.summary ? <div className="text-slate-400 break-all">{t.summary.slice(0, 140)}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderConfirmation = (msg: HermesMessage) => {
    const pc = msg.pendingConfirmation;
    if (!pc || pc.confirmed || pc.refused) return null;
    return (
      <div className="mt-2.5 p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
          <AlertTriangle className="w-4 h-4" />
          Action sensible — confirmation requise
        </div>
        <div className="text-[11px] text-slate-300 font-mono break-all">{pc.summary}</div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setConfirming(pc.actionId);
              await hermesAgentService.confirmAction(pc.actionId);
              setConfirming(null);
            }}
            disabled={confirming === pc.actionId}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {confirming === pc.actionId ? 'Exécution…' : 'Confirmer l\'action'}
          </button>
          <button
            onClick={() => hermesAgentService.refuseAction(pc.actionId)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-600/30 text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Refuser
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#111118] via-[#161622] to-[#0F0F14] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">Hermes Agent</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Moteur réel v4
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${providerOk ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                  <span className={`w-2 h-2 rounded-full ${providerOk ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {providerOk ? providerLabel : `IA : ${providerLabel}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Boucle d'agent avec tool-calling exécutée sur le serveur : 29 compétences réelles (boutique, pricing,
                SEO, canaux, audit, maintenance), 8 agents spécialisés, journal d'audit et confirmation des actions sensibles.
              </p>
              {st && st.status === 'inactive' && (
                <p className="text-[11px] text-amber-300/90 mt-1.5">
                  ⚠️ {st.providerReason} — les actions outillées fonctionnent quand même, mais l'interprétation libre nécessite un fournisseur IA (Gemini, Ollama local…).
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void hermesAgentService.runAutonomousNow()}
              disabled={state.status !== 'idle'}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Cycle autonome
            </button>
            <button
              onClick={() => hermesAgentService.clearHistory()}
              className="bg-[#1A1A22] hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all"
              title="Réinitialiser l'historique"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* État réel du moteur (GET /api/hermes/status) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Moteur</div>
              <div className="text-sm font-bold text-white">Hermes v4 (serveur)</div>
            </div>
          </div>
          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Radio className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fournisseur IA</div>
              <div className="text-sm font-bold text-white">{providerLabel}</div>
            </div>
          </div>
          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Layers className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Skills / Agents</div>
              <div className="text-sm font-bold text-white">{st ? `${st.skillsCount} / ${st.agentsCount}` : '…'}</div>
            </div>
          </div>
          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Database className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mémoire serveur</div>
              <div className="text-sm font-bold text-white">{st ? `${st.memoriesCount} entrées` : '…'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Dialogue */}
        <div className="lg:col-span-2 bg-[#111114] border border-slate-800 rounded-2xl flex flex-col h-[620px] overflow-hidden shadow-xl">
          {/* Header + agent selector */}
          <div className="p-4 bg-[#14141A] border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-5 h-5 text-indigo-400 shrink-0" />
              <h2 className="text-sm font-bold text-white truncate">Console Hermes — {st?.agents.find(a => a.id === state.agentId)?.name || 'Orchestrateur'}</h2>
            </div>
            <select
              value={state.agentId}
              onChange={(e) => hermesAgentService.setAgent(e.target.value)}
              className="bg-[#1A1A22] border border-slate-700 text-white rounded-xl p-2 text-xs outline-none max-w-[220px]"
              title="Agent spécialisé"
            >
              {(st?.agents || [{ id: 'orchestrator', name: 'Hermes (orchestrateur)' } as HermesAgent]).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0A0A0D]">
            {state.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSystem = msg.sender === 'system';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <span>{isUser ? 'Modérateur' : isSystem ? 'Système' : 'Hermes'}</span>
                    {msg.agent && !isUser && !isSystem && <span className="text-indigo-400">• {msg.agent}</span>}
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                        : isSystem
                          ? 'bg-[#1A1A22] border border-slate-700/60 text-slate-300 rounded-tl-none'
                          : 'bg-[#14141A] border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {renderSteps(msg)}

                    <div className="whitespace-pre-wrap font-sans space-y-1">{msg.content}</div>

                    {renderConfirmation(msg)}
                  </div>
                </div>
              );
            })}

            {state.status === 'thinking' && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-2xl w-fit animate-pulse">
                <Activity className="w-4 h-4 animate-pulse text-indigo-400" />
                <span>Hermes planifie et exécute (outils serveur)…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt pills */}
          <div className="p-2 bg-[#121217] border-t border-slate-800/80 overflow-x-auto flex items-center gap-2 custom-scrollbar shrink-0">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(qp);
                  (document.getElementById('hermes-chat-input') as HTMLInputElement | null)?.focus();
                }}
                className="shrink-0 text-[11px] bg-[#1A1A22] hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 px-3 py-1 rounded-full transition-all"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[#14141A] border-t border-slate-800 flex items-center gap-2 shrink-0">
            <input
              id="hermes-chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex : « passe le prix de mon guide à 39 € », « fais un audit », « publie ma bannière sur Telegram »…"
              className="flex-1 bg-[#1A1A22] border border-slate-700/80 focus:border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!inputText.trim() || state.status === 'thinking'}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold shrink-0"
            >
              <span>Envoyer</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col: Autonomy + Skills réels */}
        <div className="space-y-6">
          {/* Autonomy Controls */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Cycle autonome</h3>
              </div>
              <button
                onClick={() => hermesAgentService.toggleAutonomy()}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  state.isAutonomousEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {state.isAutonomousEnabled ? '🟢 Actif' : '🔴 Désactivé'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fréquence (audit de sécurité périodique)</label>
                <select
                  value={state.autonomousIntervalMinutes}
                  onChange={(e) => hermesAgentService.setAutoInterval(Number(e.target.value))}
                  className="w-full bg-[#1A1A22] border border-slate-700 text-white rounded-xl p-2.5 outline-none"
                >
                  <option value={15}>Toutes les 15 minutes</option>
                  <option value={30}>Toutes les 30 minutes</option>
                  <option value={60}>Toutes les heures</option>
                </select>
              </div>
              <div className="bg-[#1A1A22] p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400">Dernier cycle :</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {state.lastAutonomousRun ? new Date(state.lastAutonomousRun).toLocaleString() : 'Jamais'}
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Désactivé par défaut. Sans fournisseur IA configuré, le cycle ne produit pas d'insight (le serveur le signale honnêtement).
              </p>
            </div>
          </div>

          {/* Skills réels (registre serveur) */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Compétences réelles ({st?.skillsCount ?? '…'})</h3>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {(st?.skills || []).map(s => (
                <div key={s.name} className="flex items-start gap-2 p-2 bg-[#1A1A22] rounded-xl border border-slate-800">
                  <Terminal className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.dangerous ? 'text-rose-400' : 'text-indigo-400'}`} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-bold text-slate-200">
                      {s.name}
                      {s.confirmation && <span className="ml-1.5 text-[9px] text-amber-400">⚠ confirmée</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{s.description}</div>
                  </div>
                </div>
              ))}
              {!st && <div className="text-[11px] text-slate-500">Chargement du registre serveur…</div>}
            </div>
            <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
              Toutes les compétences s'exécutent côté serveur, avec journal d'audit. Les actions destructives (suppression,
              re-pricing en masse, écriture libre) exigent une confirmation explicite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
