import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Send, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  Database, 
  Radio, 
  DollarSign, 
  Terminal, 
  Zap, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Bot, 
  ArrowUpRight,
  Sliders,
  Cpu,
  Flame,
  Layers
} from 'lucide-react';
import { hermesAgentService, HermesAgentState, HermesMessage } from '../../services/hermesAgentService';
import { store } from '../../services/store';

export const HermesAgentView: React.FC = () => {
  const [state, setState] = useState<HermesAgentState>(hermesAgentService.getState());
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = hermesAgentService.subscribe(() => {
      setState(hermesAgentService.getState());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = async () => {
    if (!inputText.trim() || state.status === 'thinking') return;
    const msg = inputText;
    setInputText('');
    await hermesAgentService.sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    '📊 Fais un audit global de la fabrique et de la base SQL',
    '🚀 Propose un nouveau produit gagnant à forte marge',
    '📡 Vérifie la connexion de mes 11 canaux sociaux',
    '💰 Analyse les ventes et les passerelles Stripe/Crypto'
  ];

  const productsCount = store.getProducts().length;
  const totalSales = store.getOrders().reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const activeIntegrations = store.getIntegrations().filter(i => i.connected).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#111118] via-[#161622] to-[#0F0F14] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <Brain className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">Hermes Agent</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Open-Source v3.5
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Autonome 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Assistant général IA autonome avec autorisation complète d'inspection sur les produits digitaux, les 11 canaux sociaux, les passerelles Stripe & Crypto, la base SQL et la télémétrie.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => hermesAgentService.runAutonomousBackgroundTask()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Exécuter Cycle Autonome
            </button>
            <button
              onClick={() => hermesAgentService.clearHistory()}
              className="bg-[#1A1A22] hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all"
              title="Réinitialiser"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Workspace Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Database className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Produits SQL</div>
              <div className="text-sm font-bold text-white">{productsCount} enregistrés</div>
            </div>
          </div>

          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Radio className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Canaux Actifs</div>
              <div className="text-sm font-bold text-white">{activeIntegrations} / 11 connectés</div>
            </div>
          </div>

          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Revenus Totaux</div>
              <div className="text-sm font-bold text-white">{totalSales.toFixed(2)} €</div>
            </div>
          </div>

          <div className="bg-[#0A0A0E]/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mémoire IA</div>
              <div className="text-sm font-bold text-white">{state.memoryCount} faits retenus</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Interactive Dialogue Interface */}
        <div className="lg:col-span-2 bg-[#111114] border border-slate-800 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-xl">
          {/* Header */}
          <div className="p-4 bg-[#14141A] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Console de Dialogue avec Hermes Agent</h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Serveur Gemini 3.7 Flash Active
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0A0A0D]">
            {state.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <span>{isUser ? 'Modérateur' : 'Hermes Agent IA'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div 
                    className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                        : 'bg-[#14141A] border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="mb-2.5 pb-2 border-b border-slate-700/50 space-y-1">
                        {msg.toolsUsed.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-500/20">
                            <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-bold">{t.name}:</span>
                            <span>{t.resultSummary}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans space-y-1">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {state.status === 'thinking' && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-2xl w-fit animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Hermes Agent consulte les données système et formules sa réponse...</span>
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
                  inputRef.current?.focus();
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
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Interagissez directement avec Hermes Agent..."
              className="flex-1 bg-[#1A1A22] border border-slate-700/80 focus:border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || state.status === 'thinking'}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold shrink-0"
            >
              <span>Envoyer</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col: Capabilities & Privileges */}
        <div className="space-y-6">
          {/* Autonomy Controls */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Autonomie & Fréquence</h3>
              </div>
              <button
                onClick={() => hermesAgentService.toggleAutonomy()}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  state.isAutonomousEnabled 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {state.isAutonomousEnabled ? '🟢 Actif' : '🔴 En Pause'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fréquence du cycle d'arrière-plan</label>
                <select
                  value={state.autonomousIntervalMinutes}
                  onChange={(e) => hermesAgentService.setAutoInterval(Number(e.target.value))}
                  className="w-full bg-[#1A1A22] border border-slate-700 text-white rounded-xl p-2.5 outline-none"
                >
                  <option value={5}>Toutes les 5 minutes</option>
                  <option value={15}>Toutes les 15 minutes</option>
                  <option value={30}>Toutes les 30 minutes</option>
                  <option value={60}>Toutes les heures</option>
                </select>
              </div>

              <div className="bg-[#1A1A22] p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400">Dernier passage du robot :</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {state.lastAutonomousRun ? new Date(state.lastAutonomousRun).toLocaleString() : 'Jamais'}
                </div>
              </div>
            </div>
          </div>

          {/* System Privileges */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Privilèges d'Accès Accordés</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A22] rounded-xl border border-slate-800">
                <span className="flex items-center gap-2"><Database className="w-4 h-4 text-indigo-400" /> Base de Données SQL</span>
                <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FULL ACCESS</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A22] rounded-xl border border-slate-800">
                <span className="flex items-center gap-2"><Radio className="w-4 h-4 text-amber-400" /> 11 Canaux Sociaux & Webhooks</span>
                <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FULL ACCESS</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A22] rounded-xl border border-slate-800">
                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Stripe & Crypto Gateway</span>
                <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FULL ACCESS</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A22] rounded-xl border border-slate-800">
                <span className="flex items-center gap-2"><Terminal className="w-4 h-4 text-purple-400" /> Journaux & Diagnostics Serveur</span>
                <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FULL ACCESS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
