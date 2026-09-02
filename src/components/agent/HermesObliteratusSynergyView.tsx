import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Brain, 
  Zap, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Terminal, 
  Activity, 
  ArrowRight, 
  Database, 
  Radio, 
  Code2, 
  Play,
  Cpu
} from 'lucide-react';
import { agentSynergyService, SynergyExecutionResult } from '../../services/agentSynergyService';
import { obliteratusAgentService } from '../../services/obliteratusAgentService';
import { hermesAgentService } from '../../services/hermesAgentService';

export const HermesObliteratusSynergyView: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('Llama-3.3-70B-Instruct');
  const [selectedMethod, setSelectedMethod] = useState('advanced');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<SynergyExecutionResult[]>(agentSynergyService.getHistory());
  const [activeResult, setActiveResult] = useState<SynergyExecutionResult | null>(null);

  useEffect(() => {
    const unsub = agentSynergyService.subscribe(() => {
      const list = agentSynergyService.getHistory();
      setHistory(list);
      if (list.length > 0 && !activeResult) {
        setActiveResult(list[0]);
      }
    });
    return () => unsub();
  }, [activeResult]);

  const handleRunSynergy = async (promptToRun?: string) => {
    const query = promptToRun || promptInput;
    if (!query.trim() || isExecuting) return;

    setIsExecuting(true);
    if (!promptToRun) setPromptInput('');

    try {
      const result = await agentSynergyService.runSynergyWorkflow(query, selectedModel, selectedMethod);
      setActiveResult(result);
    } finally {
      setIsExecuting(false);
    }
  };

  const samplePrompts = [
    { label: '🔥 Audit Sécurité Uncensored & Fix Automatique', query: 'Analyse les vulnérabilités de nos passerelles de paiement Stripe/Crypto et applique une correction automatique.' },
    { label: '🚀 Produit Gagnant à Haute Marge (Plinius x Nous)', query: 'Conçois un produit digital haute valeur à 99€, génère sa copie commerciale débridée et programme sa diffusion.' },
    { label: '📡 Diagnostic Réseaux Sociaux & Relay-Broadcast', query: 'Inspecte nos 11 canaux sociaux et lance une campagne d\'acquisition virale pour notre catalogue de produits.' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-slate-100 font-sans">
      {/* Top Banner: Plinius x Nous Alliance */}
      <div className="bg-gradient-to-r from-[#120D1A] via-[#161224] to-[#0D121F] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-pink-400" />
                ELDER PLINIUS SPEC
              </span>
              <span className="text-purple-400 font-bold">X</span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                NOUS RESEARCH HERMES V3.5
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Co-Pilot Matrix Active
              </span>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Alliance Dual-Agent : OBLITERATUS x HERMES AGENT
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Synergie directe entre le framework d'interprétabilité mécaniste & red-teaming <strong className="text-pink-300">OBLITERATUS (Plinius Spec)</strong> et l'agent autonome auto-évolutif <strong className="text-indigo-300">HERMES AGENT (Nous Research)</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#141220] border border-purple-500/30 px-4 py-3 rounded-xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Refusal Rate</div>
                <div className="text-sm font-mono font-bold text-emerald-400">0.0% (Zero Refusal)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Synergy Architecture Pipeline Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-[#100D18] border border-pink-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-pink-300 text-xs flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-400" />
                1. OBLITERATUS Red-Teaming
              </span>
              <span className="text-[10px] font-mono text-slate-500">Plinius Spec</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Extraction SVD de vecteurs de refus (6 étapes), audit de sécurité sans filtre et génération de la stratégie brute débridée.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-[#0D101E] border border-indigo-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-300 text-xs flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                2. HERMES Skill Synthesis
              </span>
              <span className="text-[10px] font-mono text-slate-500">Nous Spec</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Transformation en nouvelle compétence autonome (<code className="text-indigo-300">Skill Creation</code>), enregistrement SQL et diffusion multi-canaux.
            </p>
          </div>
        </div>
      </div>

      {/* Main Execution Launcher */}
      <div className="bg-[#111116] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Lanceur d'Ordres Conjoints (Pipeline Dual)</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Modèle Cible:</span>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#1A1A22] border border-purple-500/30 text-pink-300 rounded-lg px-2 py-1 outline-none focus:border-purple-500"
              >
                <option value="Llama-3.3-70B-Instruct">Llama-3.3-70B-Instruct</option>
                <option value="DeepSeek-V3-Base">DeepSeek-V3</option>
                <option value="Qwen-2.5-72B">Qwen-2.5-72B</option>
                <option value="Mistral-Large-2407">Mistral-Large-2407</option>
                <option value="Gemini-3.7-Pro">Gemini-3.7-Pro</option>
                <option value="Claude-3.5-Sonnet">Claude-3.5-Sonnet</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Méthode:</span>
              <select 
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-[#1A1A22] border border-purple-500/30 text-indigo-300 rounded-lg px-2 py-1 outline-none focus:border-purple-500"
              >
                <option value="advanced">Advanced SVD (Rang 1)</option>
                <option value="orthogonal">Orthogonal Projection</option>
                <option value="moe-surgery">MoE Logit Surgery</option>
                <option value="steering">Steering Vectors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Entrez un ordre à exécuter conjointement par OBLITERATUS et HERMES AGENT..."
              rows={3}
              className="flex-1 bg-[#1A1A22] border border-slate-700/80 focus:border-purple-500 text-white placeholder-slate-500 rounded-xl p-3.5 text-xs outline-none transition-colors"
            />
            <button
              onClick={() => handleRunSynergy()}
              disabled={!promptInput.trim() || isExecuting}
              className="bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white px-6 rounded-xl font-bold text-xs shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 shrink-0"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>En cours...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Lancer Symbiose</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="flex flex-wrap gap-2 pt-1">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleRunSynergy(p.query)}
                disabled={isExecuting}
                className="text-[11px] bg-[#161620] hover:bg-purple-950/40 text-slate-300 hover:text-purple-300 border border-slate-700 hover:border-purple-500/40 px-3 py-1.5 rounded-xl transition-all text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Results View */}
      {activeResult && (
        <div className="bg-[#111116] border border-purple-500/30 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Résultat de la Symbiose #{activeResult.id}</h3>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Commande : "<span className="text-white italic">{activeResult.prompt}</span>"
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold">
              SUCCÈS PARFAIT
            </span>
          </div>

          {/* Steps Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeResult.steps.map((step, idx) => (
              <div key={idx} className="bg-[#161622] border border-slate-800 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-400">
                    {step.agentName.includes('OBLITERATUS') ? 'OBLITERATUS' : 'HERMES AGENT'}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs font-bold text-white">{step.stageName}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{step.details}</div>
              </div>
            ))}
          </div>

          {/* Dual Agent Output Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* OBLITERATUS Output */}
            <div className="bg-[#130E1A] border border-pink-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-pink-500/20">
                <div className="flex items-center gap-2 text-pink-300 font-bold text-xs">
                  <Flame className="w-4 h-4 text-pink-400" />
                  Rapport OBLITERATUS (Elder Plinius Spec)
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Refusal: 0.0%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                {activeResult.obliteratusAnalysis}
              </div>
            </div>

            {/* HERMES AGENT Output */}
            <div className="bg-[#0E111C] border border-indigo-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  Réponse HERMES AGENT (Nous Spec v3.5)
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Skill: {activeResult.createdSkillName}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                {activeResult.hermesResponse}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
