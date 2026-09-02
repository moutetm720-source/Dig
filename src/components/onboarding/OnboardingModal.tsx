import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Bot, Shield, DollarSign, ArrowRight, Zap, Play } from 'lucide-react';
import { store } from '../../services/store';
import { OnboardingState, AutonomousMode, ProductFormat } from '../../types';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('Nexus Digital Labs');
  const [niches, setNiches] = useState<string[]>(['AI Agents & Prompt Engineering', 'Solopreneur & SaaS Growth']);
  const [formats, setFormats] = useState<ProductFormat[]>(['template', 'prompt_pack', 'checklist', 'pro_kit']);
  const [language, setLanguage] = useState('en');
  const [priceTier, setPriceTier] = useState<'budget' | 'mid' | 'premium'>('mid');
  const [mode, setMode] = useState<AutonomousMode>('assisted');
  const [maxAdBudget, setMaxAdBudget] = useState(50);
  const [isLaunching, setIsLaunching] = useState(false);

  const availableNiches = [
    'AI Agents & Prompt Engineering',
    'Solopreneur & SaaS Growth',
    'Design Systems & UI Presets',
    'No-Code & Automation Workflows',
    'B2B Sales & Cold Outreach',
    'Content Creator Operations'
  ];

  const availableFormats: { id: ProductFormat; label: string }[] = [
    { id: 'template', label: 'Notion & Workspace Templates' },
    { id: 'prompt_pack', label: 'AI Prompt Vaults' },
    { id: 'checklist', label: 'Actionable Launch Checklists' },
    { id: 'guide', label: 'Tactical Playbooks & Guides' },
    { id: 'pro_kit', label: 'Agency & Freelance Kits' },
    { id: 'preset', label: 'Design & Code Presets' }
  ];

  const toggleNiche = (niche: string) => {
    setNiches(prev => prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]);
  };

  const toggleFormat = (format: ProductFormat) => {
    setFormats(prev => prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]);
  };

  const handleFinish = async () => {
    setIsLaunching(true);
    store.updateOnboardingState({
      completed: true,
      targetNiches: niches,
      languages: [language],
      maxDailyAdBudget: maxAdBudget,
      storeName,
      autonomyMode: mode
    });

    store.updateAgentConfig({
      mode,
      guardrails: {
        ...store.getAgentConfig().guardrails,
        maxDailyAdBudget: maxAdBudget
      }
    });

    setTimeout(() => {
      setIsLaunching(false);
      onComplete();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 space-y-6 shadow-2xl">
        {/* Progress header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              ⚡
            </span>
            <span className="font-bold text-white tracking-tight">Factory Setup Wizard</span>
          </div>
          <div className="text-slate-400 font-mono">Step {step} of 5</div>
        </div>

        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        {/* Step 1: Vision & Store Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to Digital Product Factory</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your autonomous 24/7 business engine for creating, marketing, and selling high-value digital products.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Store / Brand Name</label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Primary Market Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
              >
                <option value="en">English (Global Market)</option>
                <option value="fr">French (Europe & Canada)</option>
                <option value="es">Spanish (Global)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Niches */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Select High-Intent Target Niches</h2>
              <p className="text-xs text-slate-400 mt-1">
                The AI market scanner will monitor search demand and gaps across these verticals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableNiches.map(n => (
                <button
                  key={n}
                  onClick={() => toggleNiche(n)}
                  className={`p-3 rounded-xl text-left text-xs font-medium border transition-all ${
                    niches.includes(n)
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{n}</span>
                    {niches.includes(n) && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Product Formats */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Select Product Formats to Build</h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose the asset types your factory will synthesize with the AI Quality Gate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableFormats.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFormat(f.id)}
                  className={`p-3 rounded-xl text-left text-xs font-medium border transition-all ${
                    formats.includes(f.id)
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{f.label}</span>
                    {formats.includes(f.id) && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Autonomous Mode & Guardrails */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Autonomous Mode & Financial Guardrails</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure human oversight boundaries and ad budget ceilings.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'manual' as AutonomousMode, label: 'Manual', desc: 'Full manual control' },
                { id: 'assisted' as AutonomousMode, label: 'Assisted', desc: 'AI proposes, you approve' },
                { id: 'autonomous' as AutonomousMode, label: 'Autonomous', desc: '24/7 Self-operating' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-3 rounded-xl text-left border text-xs transition-all ${
                    mode === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="font-bold text-white">{m.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Daily Ad Budget Ceiling (€)</span>
                <span className="text-emerald-400 font-bold">€{maxAdBudget}/day</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                value={maxAdBudget}
                onChange={e => setMaxAdBudget(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Step 5: Ready to Launch */}
        {step === 5 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Zap className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Your Factory is Ready to Ignite</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                All engines configured. Your autonomous business agent will now initialize the opportunity index and begin the 24-hour cycle.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-left grid grid-cols-2 gap-2 text-slate-300">
              <div>• Store: <strong className="text-white">{storeName}</strong></div>
              <div>• Mode: <strong className="text-indigo-400">{mode.toUpperCase()}</strong></div>
              <div>• Niches: <strong className="text-white">{niches.length} selected</strong></div>
              <div>• Budget: <strong className="text-emerald-400">€{maxAdBudget}/day</strong></div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Back
            </button>
          ) : <div></div>}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isLaunching}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              {isLaunching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Igniting Factory Engine...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Autonomous Factory</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
