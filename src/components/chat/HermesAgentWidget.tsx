import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  RefreshCw, 
  Sparkles, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Radio, 
  DollarSign, 
  Terminal, 
  CheckCircle2, 
  Trash2, 
  Zap, 
  Layers, 
  ArrowUpRight,
  Brain,
  Activity,
  Sliders
} from 'lucide-react';
import { hermesAgentService, HermesAgentState, HermesMessage } from '../../services/hermesAgentService';

interface HermesAgentWidgetProps {
  onNavigateToView?: (view: string) => void;
}

export const HermesAgentWidget: React.FC<HermesAgentWidgetProps> = ({ onNavigateToView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'autonomy' | 'tools'>('chat');
  const [state, setState] = useState<HermesAgentState>(hermesAgentService.getState());
  const [inputText, setInputText] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = hermesAgentService.subscribe(() => {
      const nextState = hermesAgentService.getState();
      setState(nextState);
      if (!isOpen && nextState.messages.length > (state.messages?.length || 0)) {
        setHasUnread(true);
      }
    });

    return () => unsub();
  }, [isOpen, state.messages?.length]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab, state.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    { label: '📊 Audit complet de la fabrique', prompt: 'Fais un audit complet de ma fabrique de produits digitaux, mes ventes et mes réseaux sociaux.' },
    { label: '🚀 Créer une App (B2B)', prompt: 'En tant qu\'agence B2B, génère une application et compile tous les agents.' },
    { label: '🧠 Quelles sont tes skills ?', prompt: 'Liste-moi tes skills et outils intégrés via le framework NousResearch (DevOps, Security, etc).' },
    { label: '💰 Analyse de rentabilité & Stripe/Crypto', prompt: 'Analyse mes passerelles de paiement Stripe et Crypto et donne-moi le récapitulatif de santé financière.' }
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end select-none font-sans">
      {/* Floating Toggle Badge when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-[#111115] hover:bg-[#16161C] border border-indigo-500/40 hover:border-indigo-500 text-white px-4 py-3 rounded-full shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all duration-300 hover:scale-105"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-inner">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#111115] rounded-full animate-ping" />
            )}
          </div>
          <div className="flex flex-col items-start pr-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wide text-white">Hermes Agent IA</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">v3.5</span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Assistant Général Autonome
            </span>
          </div>
        </button>
      )}

      {/* Main Dialogue Window */}
      {isOpen && (
        <div 
          className={`bg-[#0D0D10] border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded 
              ? 'w-[90vw] max-w-5xl h-[85vh] fixed bottom-5 right-5' 
              : 'w-[420px] sm:w-[480px] h-[640px]'
          }`}
        >
          {/* Header */}
          <div className="bg-[#121217] border-b border-slate-800 p-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg text-white">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Hermes Agent</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Open-Source v3.5
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Accès Système Total
                  </span>
                  <span>•</span>
                  <span>{state.memoryCount} Souvenirs IA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
                title={isExpanded ? 'Réduire' : 'Agrandir'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="bg-[#111115] border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-xs font-medium text-slate-400 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === 'chat' ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                Dialogue Direct
              </button>

              <button
                onClick={() => setActiveTab('autonomy')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === 'autonomy' ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Autonomie Server
              </button>

              <button
                onClick={() => setActiveTab('tools')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === 'tools' ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Outils IA (8)
              </button>
            </div>

            <button
              onClick={() => hermesAgentService.clearHistory()}
              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
              title="Effacer la discussion"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TAB 1: DIALOGUE DIRECT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0D]">
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {state.messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        {!isUser && <Sparkles className="w-3 h-3 text-indigo-400" />}
                        <span>{isUser ? 'Vous (Modérateur)' : 'Hermes Agent IA'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                        {msg.isAutonomous && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded text-[9px] border border-emerald-500/20">
                            Auto-Background
                          </span>
                        )}
                      </div>

                      <div 
                        className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser 
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                            : 'bg-[#14141A] border border-slate-800/80 text-slate-200 rounded-tl-none shadow-lg'
                        }`}
                      >
                        {/* Tool logs if any */}
                        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                          <div className="mb-2.5 pb-2 border-b border-slate-700/50 space-y-1">
                            {msg.toolsUsed.map((t, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-300 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-500/20">
                                <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="font-bold">{t.name}:</span>
                                <span className="truncate">{t.resultSummary || 'Exécuté avec succès'}</span>
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
                    <span>Hermes Agent inspecte le système et prépare sa réponse...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="p-2 bg-[#101014] border-t border-slate-800/80 overflow-x-auto custom-scrollbar flex items-center gap-2 shrink-0">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(qp.prompt);
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 text-[11px] bg-[#1A1A20] hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 px-2.5 py-1 rounded-full transition-all"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-[#121217] border-t border-slate-800 flex items-center gap-2 shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question ou donnez un ordre à Hermes Agent..."
                  className="flex-1 bg-[#1A1A22] border border-slate-700/80 focus:border-indigo-500 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || state.status === 'thinking'}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                  title="Envoyer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUTONOMIE & MEMOIRE */}
          {activeTab === 'autonomy' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#0A0A0D] text-slate-300 text-xs">
              <div className="bg-[#14141A] border border-slate-800 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-white text-sm">Boucle Autonome Arrière-Plan</div>
                      <div className="text-[11px] text-slate-400">Exécute des diagnostics et enregistre ses réflexions sur le serveur</div>
                    </div>
                  </div>
                  <button
                    onClick={() => hermesAgentService.toggleAutonomy()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      state.isAutonomousEnabled 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {state.isAutonomousEnabled ? '🟢 Actif 24/7' : '🔴 En Pause'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Fréquence du cycle</label>
                    <select
                      value={state.autonomousIntervalMinutes}
                      onChange={(e) => hermesAgentService.setAutoInterval(Number(e.target.value))}
                      className="w-full bg-[#1A1A22] border border-slate-700 text-white rounded-lg p-2 text-xs outline-none"
                    >
                      <option value={5}>Toutes les 5 minutes</option>
                      <option value={15}>Toutes les 15 minutes</option>
                      <option value={30}>Toutes les 30 minutes</option>
                      <option value={60}>Toutes les heures</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Dernier cycle exécuté</label>
                    <div className="bg-[#1A1A22] border border-slate-700/80 p-2 rounded-lg text-[11px] font-mono text-emerald-400 truncate">
                      {state.lastAutonomousRun ? new Date(state.lastAutonomousRun).toLocaleTimeString() : 'En attente'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => hermesAgentService.runAutonomousBackgroundTask()}
                  className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Déclencher un Cycle Autonome Immédiat
                </button>
              </div>

              {/* Privileges */}
              <div className="bg-[#14141A] border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Autorisations & Privilèges Accordés à Hermes
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 bg-[#1A1A22] rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-indigo-400" /> Base SQL & Key-Value Store</span>
                    <span className="text-emerald-400 font-mono font-bold">Autorisé ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#1A1A22] rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2"><Radio className="w-3.5 h-3.5 text-amber-400" /> 11 Canaux Sociaux & Webhooks</span>
                    <span className="text-emerald-400 font-mono font-bold">Autorisé ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#1A1A22] rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Stripe & Passerelle Crypto</span>
                    <span className="text-emerald-400 font-mono font-bold">Autorisé ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#1A1A22] rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-purple-400" /> Logs & Diagnostic Serveur</span>
                    <span className="text-emerald-400 font-mono font-bold">Autorisé ✓</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TOOLS */}
          {activeTab === 'tools' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0A0A0D] text-slate-300 text-xs">
              <div className="text-[11px] text-slate-400 mb-2">
                Hermes Agent dispose de 8 fonctions spécialisées enregistrées sur le serveur pour inspecter et piloter votre application :
              </div>

              {[
                { name: 'workspace_full_inspector', desc: 'Analyse intégrale des produits, ventes, commandes et intégrations', color: 'text-indigo-400' },
                { name: 'get_products_list', desc: 'Extrait et trie la liste des produits digitaux en boutique', color: 'text-emerald-400' },
                { name: 'get_social_channels_status', desc: 'Vérifie les connexions X, Telegram, Discord, LinkedIn, TikTok...', color: 'text-amber-400' },
                { name: 'trigger_social_broadcast', desc: 'Relaie automatiquement un produit avec offre et code promo', color: 'text-purple-400' },
                { name: 'generate_product_idea', desc: 'Propose un produit digital à forte marge prêt au déploiement', color: 'text-cyan-400' },
                { name: 'audit_system_health', desc: 'Vérifie la base SQL, l\'indexation et les passerelles Stripe/Crypto', color: 'text-rose-400' },
                { name: 'inspect_sql_keyvalue', desc: 'Interroge les clés de la base de données de stockage', color: 'text-blue-400' },
                { name: 'save_hermes_memory', desc: 'Enregistre les pensées et rapports de Hermes dans la mémoire serveur', color: 'text-teal-400' }
              ].map((tool, idx) => (
                <div key={idx} className="bg-[#14141A] border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className={`font-mono font-bold text-xs ${tool.color}`}>{tool.name}</div>
                    <div className="text-[11px] text-slate-400">{tool.desc}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono rounded shrink-0">
                    Prêt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
