import React, { useState } from 'react';
import { FileCode, Save, Sparkles, CheckCircle2, RotateCcw, Copy, Play, Zap } from 'lucide-react';
import { store } from '../../services/store';
import { PromptTemplate } from '../../types';

export const PromptLibraryView: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>(store.getPromptLibrary());
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate>(prompts[0]);
  const [editedContent, setEditedContent] = useState<string>(selectedPrompt?.userPromptTemplate || selectedPrompt?.systemPrompt || '');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSelect = (p: PromptTemplate) => {
    setSelectedPrompt(p);
    setEditedContent(p.userPromptTemplate || p.systemPrompt);
    setSavedFeedback(false);
    setTestOutput(null);
  };

  const handleSave = () => {
    store.updatePrompt(selectedPrompt.id, editedContent);
    setPrompts(store.getPromptLibrary());
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleTestPrompt = async () => {
    setIsTesting(true);
    setTestOutput(null);
    await new Promise(res => setTimeout(res, 500));
    setTestOutput(`[AI Studio Agent Simulation Output]\n\nExecution Schema: Validated\nTokens Consumed: 0 (Deterministic fallback / local cache active)\nOutput: Synthesized high-conviction deliverables based on input prompt template.`);
    setIsTesting(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Prompt Engineering Library</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {prompts.length} Modular AI Architectures
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fine-tune and customize system instructions, variable tokens, and output schemas driving all autonomous agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestPrompt}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isTesting ? 'Simulating Output...' : 'Test Run Prompt'}</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
          >
            {savedFeedback ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Prompt Saved & Live!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Prompt Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompts list */}
        <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl space-y-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Modules & Prompts</div>
          <div className="space-y-1.5 max-h-[550px] overflow-y-auto custom-scrollbar">
            {prompts.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedPrompt?.id === p.id
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                    : 'bg-[#16161A] border-slate-800/80 text-slate-300 hover:bg-[#1A1A1E]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs truncate max-w-[180px]">{p.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">v{p.version}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 capitalize truncate">{p.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Editor */}
        {selectedPrompt && (
          <div className="lg:col-span-2 bg-[#111114] border border-slate-800 p-6 rounded-xl space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A1A1E] text-indigo-300 border border-slate-800 uppercase">
                  {selectedPrompt.category}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedPrompt.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Key: {selectedPrompt.key}</p>
              </div>

              <span className="text-xs text-slate-500 font-mono">
                Updated: {selectedPrompt.updatedAt ? new Date(selectedPrompt.updatedAt).toLocaleDateString() : 'Recent'}
              </span>
            </div>

            {/* Dynamic Variables */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supported Variables</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPrompt.variables.map(v => (
                  <span key={v} className="px-2 py-0.5 rounded bg-[#16161A] text-indigo-300 font-mono text-[11px] border border-slate-800">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Editor Textarea */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prompt Body Template</div>
              <textarea
                rows={12}
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed custom-scrollbar"
              />
            </div>

            {/* Test Run Output Preview */}
            {testOutput && (
              <div className="p-4 rounded-xl bg-[#16161A] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span>Simulation Result</span>
                  <span className="font-mono text-[10px]">STATUS: OK</span>
                </div>
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{testOutput}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
