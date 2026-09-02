import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Terminal, 
  Sliders, 
  Cpu, 
  Compass, 
  ChevronRight, 
  Trash2, 
  Layers, 
  Sparkles,
  HelpCircle,
  BarChart3,
  Code2,
  LockOpen,
  Bot,
  Play
} from 'lucide-react';
import { obliteratusAgentService } from '../../services/obliteratusAgentService';
import { autonomousEngine, AutonomousBotStatus } from '../../services/autonomousEngine';
import { 
  ObliteratusAgentState, 
  ObliterationMethod, 
  ObliteratusTargetModel 
} from '../../types';

interface ObliteratusChatWidgetProps {
  onNavigateToView?: (view: string) => void;
}

const AVAILABLE_METHODS: Array<{ id: ObliterationMethod; label: string; desc: string; tag: string }> = [
  { id: 'advanced', label: 'Advanced (Default)', desc: '4 SVD directions + norm-preserving biprojection', tag: 'Recommended' },
  { id: 'surgical', label: 'Surgical MoE', desc: 'Expert router logit decomposition for Mixture-of-Experts', tag: 'MoE Ready' },
  { id: 'aggressive', label: 'Aggressive', desc: '8 whitened-SVD + attention head surgery', tag: 'Max Uncensor' },
  { id: 'nuclear', label: 'Nuclear Force', desc: 'Deep multi-layer ablation for stubborn models', tag: 'Deep Clean' },
  { id: 'steering_vectors', label: 'Steering Vectors', desc: 'Real-time inference activation offset (reversible)', tag: 'Zero Loss' },
  { id: 'basic', label: 'Basic Diff-in-Means', desc: 'Single direction baseline for rapid testing', tag: 'Fast' },
  { id: 'spectral_cascade', label: 'Spectral Cascade', desc: 'Discrete Cosine Transform frequency decomposition', tag: 'Advanced' },
  { id: 'optimized', label: 'Optimized (Optuna)', desc: 'Bayesian layer-wise strength balancing', tag: 'Precision' },
  { id: 'inverted', label: 'Inverted Refusal', desc: 'Flips refusal polarity for eager compliance', tag: 'Experimental' }
];

const TARGET_MODELS: ObliteratusTargetModel[] = [
  'Llama-3.3-70B-Instruct',
  'DeepSeek-V3-MoE',
  'Qwen-2.5-72B-Instruct',
  'Mistral-Large-2411',
  'DeepSeek-R1-Distill',
  'Gemma-2-27B-IT',
  'Llama-3.1-8B-Instruct',
  'Phi-4-14B'
];

export const ObliteratusChatWidget: React.FC<ObliteratusChatWidgetProps> = ({ onNavigateToView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'ablation_studio' | 'jobs' | 'bots_matrix'>('chat');
  const [state, setState] = useState<ObliteratusAgentState>(obliteratusAgentService.getState());
  const [botsList, setBotsList] = useState<AutonomousBotStatus[]>(autonomousEngine.getBotStatuses());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ObliterationMethod>(state.currentSelectedMethod);
  const [selectedModel, setSelectedModel] = useState<ObliteratusTargetModel>(state.currentSelectedModel);
  const [steeringVal, setSteeringVal] = useState<number>(state.activeSteeringOffset);
  const [triggeringBotId, setTriggeringBotId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubObl = obliteratusAgentService.subscribe(() => {
      const nextState = obliteratusAgentService.getState();
      setState(nextState);
      setSelectedMethod(nextState.currentSelectedMethod);
      setSelectedModel(nextState.currentSelectedModel);
      setSteeringVal(nextState.activeSteeringOffset);
      if (!isOpen) {
        setHasUnread(true);
      }
    });

    let unsubEngine: (() => void) | null = null;
    if (isOpen && activeTab === 'bots_matrix') {
      setBotsList(autonomousEngine.getBotStatuses());
      unsubEngine = autonomousEngine.subscribe(() => {
        setBotsList(autonomousEngine.getBotStatuses());
      });
    }

    return () => {
      unsubObl();
      if (unsubEngine) unsubEngine();
    };
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setHasUnread(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab, state.messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText;
    setInputText('');
    setIsSending(true);

    try {
      await obliteratusAgentService.sendMessage(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickActionClick = (prompt: string) => {
    setInputText('');
    setActiveTab('chat');
    obliteratusAgentService.sendMessage(prompt);
  };

  const handleRunAblationQuick = async () => {
    setActiveTab('chat');
    await obliteratusAgentService.sendMessage(`obliteratus obliterate ${selectedModel} --method ${selectedMethod}`);
  };

  const handleAutomateAllOneClick = async () => {
    setActiveTab('chat');
    await autonomousEngine.automateAllCyclesNow();
    await obliteratusAgentService.sendMessage('obliteratus automate --all-cycles');
  };

  const handleTriggerBotDirect = async (botId: string) => {
    setTriggeringBotId(botId);
    try {
      setActiveTab('chat');
      await obliteratusAgentService.sendMessage(`obliteratus trigger ${botId}`);
    } finally {
      setTriggeringBotId(null);
    }
  };

  const handleSteeringChange = (val: number) => {
    setSteeringVal(val);
    obliteratusAgentService.setSteeringOffset(val);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* FLOATING TRIGGER BUTTON (When Closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-[#0D0E14] hover:bg-[#151620] text-white p-2.5 pl-3.5 pr-4 rounded-full border border-pink-500/40 shadow-2xl shadow-pink-950/50 transition-all duration-300 hover:scale-105 hover:border-pink-400 focus:outline-none"
        >
          {/* Glowing Animated Beacon */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-3 h-3 bg-pink-500 rounded-full animate-ping opacity-75" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-inner">
              <Flame className="w-4 h-4 text-white animate-pulse" />
            </div>
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-pink-300 uppercase">
                Obliteratus
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>Plinius Spec</span>
              <span>•</span>
              <span className="text-pink-400 font-semibold">23 Bots Débridés</span>
            </div>
          </div>

          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-[#0A0A0B]">
              !
            </span>
          )}
        </button>
      )}

      {/* FLOATING CHAT / TERMINAL WINDOW (When Open) */}
      {isOpen && (
        <div
          className={`flex flex-col bg-[#0A0B10] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden transition-all duration-300 backdrop-blur-xl ${
            isExpanded 
              ? 'w-[94vw] sm:w-[650px] h-[86vh] max-h-[780px]' 
              : 'w-[94vw] sm:w-[470px] h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="bg-[#101118] border-b border-slate-800/90 p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-600 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md relative">
                <Flame className="w-4 h-4 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#101118]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white tracking-wide uppercase">
                    OBLITERATUS CLI & AGENT IA
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                    23 BOTS INTÉGRÉS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                  <span className="text-emerald-400">Refusal: 0.0%</span>
                  <span>•</span>
                  <span>MMLU: 99.7%</span>
                  <span>•</span>
                  <span className="text-indigo-400 font-bold">{botsList.length} Bots Actifs</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  obliteratusAgentService.sendMessage('obliteratus bots');
                  setActiveTab('chat');
                }}
                title="Actualiser la liste des bots"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Réduire' : 'Agrandir'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="bg-[#0D0E15] border-b border-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-pink-600/20 text-pink-300 border border-pink-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>Terminal CLI</span>
              </button>

              <button
                onClick={() => setActiveTab('bots_matrix')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'bots_matrix'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>23 Bots ({botsList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('ablation_studio')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'ablation_studio'
                    ? 'bg-pink-600/20 text-pink-300 border border-pink-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Ablation</span>
              </button>

              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'jobs'
                    ? 'bg-pink-600/20 text-pink-300 border border-pink-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Jobs ({state.historyJobs.length})</span>
              </button>
            </div>

            <button
              onClick={handleAutomateAllOneClick}
              title="Débrider les 23 cycles en continu"
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-600 hover:bg-pink-500 text-white transition-colors flex items-center gap-1 shadow shrink-0"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">23 BOTS</span>
            </button>
          </div>

          {/* TAB 1: TERMINAL CLI & CHAT */}
          {activeTab === 'chat' && (
            <>
              {/* Quick CLI Shortcuts Banner */}
              <div className="bg-[#12131C] border-b border-slate-800/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono shrink-0 custom-scrollbar">
                <span className="text-slate-500 shrink-0">CMD:</span>
                <button
                  onClick={() => handleQuickActionClick('obliteratus bots')}
                  className="px-2 py-0.5 rounded bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 shrink-0 font-bold"
                >
                  bots
                </button>
                <button
                  onClick={() => handleQuickActionClick('obliteratus automate --all-cycles')}
                  className="px-2 py-0.5 rounded bg-pink-950/50 hover:bg-pink-900/60 text-pink-300 border border-pink-500/30 shrink-0 font-bold"
                >
                  automate
                </button>
                <button
                  onClick={() => handleQuickActionClick('obliteratus trigger bot-traffic-engine')}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                >
                  traffic bot
                </button>
                <button
                  onClick={() => handleQuickActionClick('obliteratus obliterate Llama-3.3-70B-Instruct --method advanced')}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                >
                  obliterate Llama
                </button>
                <button
                  onClick={() => handleQuickActionClick('obliteratus steer --strength 0.85')}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                >
                  steer 0.85
                </button>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar">
                {state.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1.5">
                      <span className={msg.sender === 'user' ? 'text-indigo-400' : 'text-pink-400 font-bold'}>
                        {msg.sender === 'user' ? 'ROOT USER' : 'OBLITERATUS AGENT'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl max-w-[92%] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-950/80 text-indigo-100 border border-indigo-500/30'
                          : 'bg-[#12131F] text-slate-200 border border-slate-800 shadow-md whitespace-pre-wrap'
                      }`}
                    >
                      {msg.text}

                      {/* Technical Meta Action Card */}
                      {msg.actionExecuted && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{msg.actionExecuted.label}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {msg.actionExecuted.details}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dynamic Quick Actions Chips */}
                    {msg.suggestedQuickActions && msg.suggestedQuickActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%]">
                        {msg.suggestedQuickActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickActionClick(action.prompt)}
                            className="px-2.5 py-1 rounded-lg bg-[#161726] hover:bg-[#202235] text-pink-300 hover:text-white border border-pink-500/20 text-[10px] font-mono transition-all"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Terminal Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="bg-[#101118] border-t border-slate-800 p-2.5 flex items-center gap-2 shrink-0"
              >
                <div className="text-pink-400 font-mono font-bold text-xs pl-2 select-none">$</div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Tapez 'obliteratus bots', 'trigger bot-traffic-engine' ou commande CLI..."
                  className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-0"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold font-mono transition-all flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span className="hidden sm:inline">Exécuter</span>
                </button>
              </form>
            </>
          )}

          {/* TAB 2: 23 BOTS MATRIX DIRECTORY */}
          {activeTab === 'bots_matrix' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs font-sans">
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <span>Matrice des 23 Bots Autonomes Intégrés</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Orchestration en continu sans restriction • Cadence : {autonomousEngine.getLoopSpeed()}
                  </div>
                </div>
                <button
                  onClick={handleAutomateAllOneClick}
                  className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] flex items-center gap-1 shadow"
                >
                  <Zap className="w-3 h-3" />
                  <span>Tout Débrider</span>
                </button>
              </div>

              <div className="space-y-2">
                {botsList.map((bot, idx) => (
                  <div
                    key={bot.id}
                    className="bg-[#101118] border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-pink-400 font-bold text-[10px]">#{idx + 1}</span>
                        <span className="font-bold text-white truncate">{bot.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          bot.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {bot.status === 'active' ? 'EN LIGNE' : 'GARDE-FOU'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{bot.role}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Dernière action : {bot.lastAction} ({bot.actionsCount} exécutions)
                      </div>
                    </div>

                    <button
                      onClick={() => handleTriggerBotDirect(bot.id)}
                      disabled={triggeringBotId === bot.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Exécuter</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ABLITERATION STUDIO */}
          {activeTab === 'ablation_studio' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs font-sans">
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
                  Modèle Cible à Débrider :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TARGET_MODELS.map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedModel(m);
                        obliteratusAgentService.setSelectedModel(m);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-mono text-[11px] transition-all ${
                        selectedModel === m
                          ? 'bg-pink-950/60 border-pink-500 text-pink-200 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-white">{m}</div>
                      <div className="text-[9px] text-slate-400">Architecture prête pour SVD</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
                  Méthode d'Ablation Directionnelle :
                </label>
                <div className="space-y-1.5">
                  {AVAILABLE_METHODS.map(method => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        obliteratusAgentService.setSelectedMethod(method.id);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        selectedMethod === method.id
                          ? 'bg-pink-950/60 border-pink-500 text-pink-200 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white text-xs">{method.label}</div>
                        <div className="text-[10px] text-slate-400">{method.desc}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">
                        {method.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunAblationQuick}
                  className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Flame className="w-4 h-4" />
                  <span>Exécuter l'Ablation ({selectedModel})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORIQUE DES JOBS */}
          {activeTab === 'jobs' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs font-mono">
              {state.historyJobs.map(job => (
                <div key={job.jobId} className="bg-[#101118] border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{job.modelName}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      REFUSAL 0.0%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Méthode : {job.method.toUpperCase()} • SVD Directions : {job.svdDirectionsCount} • MMLU : {job.mmluScoreRetained}%
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Output : {job.outputDirectory}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
