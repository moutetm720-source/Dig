import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Copy, 
  Zap, 
  UserCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { store } from '../../services/store';
import { generateMarketingContent } from '../../services/geminiService';
import { EmailSequence, EmailStep, DigitalProduct } from '../../types';

export const EmailEngineView: React.FC = () => {
  const [sequences, setSequences] = useState<EmailSequence[]>(store.getEmailSequences());
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedSeq, setSelectedSeq] = useState<EmailSequence>(sequences[0]);
  const [selectedStep, setSelectedStep] = useState<EmailStep>(selectedSeq?.steps[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [testSentFeedback, setTestSentFeedback] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [newSeqName, setNewSeqName] = useState('');
  const [newSeqType, setNewSeqType] = useState<'welcome_lead' | 'post_purchase' | 'abandoned_cart' | 'launch'>('welcome_lead');
  const [newSeqProductId, setNewSeqProductId] = useState<string>(products[0]?.id || '');
  const [newSubject, setNewSubject] = useState('');
  const [newEmailBody, setNewEmailBody] = useState('');

  const handleAiGenerateSequence = async () => {
    const prod = products.find(p => p.id === newSeqProductId) || products[0];
    if (!prod) return;
    setIsAiGenerating(true);
    try {
      const generated = await generateMarketingContent(prod, 'newsletter', 'email');
      if (generated.title) setNewSubject(generated.title);
      if (generated.body) setNewEmailBody(generated.body);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleCreateSequence = () => {
    if (!newSeqName.trim() && !newSubject.trim()) return;
    const prod = products.find(p => p.id === newSeqProductId);

    const newSeq: EmailSequence = {
      id: `seq_${Date.now()}`,
      name: newSeqName || `${prod?.title || 'Product'} ${newSeqType.replace('_', ' ').toUpperCase()} Series`,
      type: newSeqType === 'welcome_lead' ? 'lead_magnet' : newSeqType === 'post_purchase' ? 'post_purchase' : 'cart_abandonment',
      productId: newSeqProductId,
      productTitle: prod?.title,
      status: 'active',
      steps: [
        {
          stepNumber: 1,
          triggerDelay: 'Immediate (0 min)',
          subject: newSubject || `[Access Granted] Your ${prod?.title || 'Toolkit'} download is inside`,
          previewText: 'Click here to access your instant download vault...',
          body: newEmailBody || `Hey there,\n\nHere is your direct access link to get started immediately:\nhttps://digitalfactory.io/vault\n\nLet us know if you have any questions!\n\nBest,\nDigital Product Factory Team`,
          openRate: 64.2,
          clickRate: 31.8
        },
        {
          stepNumber: 2,
          triggerDelay: '1 day after',
          subject: `How to get 3x faster results with ${prod?.title || 'your system'}`,
          previewText: '3 quick actionable pro-tips for immediate implementation...',
          body: `Hi again,\n\nHere are 3 quick pro-tips to implement right away...\n\nCheers!`,
          openRate: 52.1,
          clickRate: 22.4
        }
      ],
      activeSubscribers: 1,
      totalSent: 1,
      totalConversions: 0,
      attributedRevenue: 0
    };

    setSequences(prev => [newSeq, ...prev]);
    setSelectedSeq(newSeq);
    setSelectedStep(newSeq.steps[0]);
    setShowCreateModal(false);
    setNewSeqName('');
    setNewSubject('');
    setNewEmailBody('');
  };

  const handleTestSend = () => {
    setTestSentFeedback(true);
    setTimeout(() => setTestSentFeedback(false), 2500);
  };

  const handleCopyBody = () => {
    if (selectedStep) {
      navigator.clipboard.writeText(`Subject: ${selectedStep.subject}\n\n${selectedStep.body}`);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Email Marketing & Automated Sequences</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Lifecycle Conversion Funnels
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated lead magnet delivery, post-purchase onboarding, abandoned cart recovery, and product launch broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Email Sequence</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sequence Selector List */}
        <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl space-y-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Sequences ({sequences.length})</div>
          <div className="space-y-2">
            {sequences.map(seq => (
              <button
                key={seq.id}
                onClick={() => {
                  setSelectedSeq(seq);
                  setSelectedStep(seq.steps[0]);
                }}
                className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                  selectedSeq?.id === seq.id
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                    : 'bg-[#16161A] border-slate-800/80 text-slate-300 hover:bg-[#1A1A1E]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs truncate max-w-[180px]">{seq.name}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
                  <span>{seq.steps.length} Steps</span>
                  <span className="text-emerald-400 font-bold">€{seq.attributedRevenue.toLocaleString()} rev</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sequence Steps Timeline & Preview */}
        {selectedSeq && (
          <div className="lg:col-span-2 bg-[#111114] border border-slate-800 p-6 rounded-xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">{selectedSeq.name}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>Subscribers: <strong className="text-slate-200">{selectedSeq.activeSubscribers}</strong></span>
                  <span>Sent: <strong className="text-slate-200">{selectedSeq.totalSent}</strong></span>
                  <span>Sales: <strong className="text-emerald-400">{selectedSeq.totalConversions}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestSend}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{testSentFeedback ? 'Test Email Sent!' : 'Send Test Copy'}</span>
                </button>
                <button
                  onClick={handleCopyBody}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Steps Timeline Horizontal Pills */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sequence Automation Flow</div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {selectedSeq.steps.map(st => (
                  <button
                    key={st.stepNumber}
                    onClick={() => setSelectedStep(st)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
                      selectedStep?.stepNumber === st.stepNumber
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-[#16161A] text-slate-400 border-slate-800 hover:bg-[#1A1A1E]'
                    }`}
                  >
                    Step {st.stepNumber} • {st.triggerDelay}
                  </button>
                ))}
              </div>
            </div>

            {/* Step Detail Card */}
            {selectedStep && (
              <div className="bg-[#16161A] p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
                  <span className="text-slate-400 font-medium">Trigger Schedule: <strong className="text-indigo-400 font-mono">{selectedStep.triggerDelay}</strong></span>
                  <div className="flex items-center gap-4 font-mono">
                    <span>Open Rate: <strong className="text-emerald-400">{selectedStep.openRate}%</strong></span>
                    <span>CTR: <strong className="text-indigo-400">{selectedStep.clickRate}%</strong></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Subject Line:</div>
                  <div className="text-sm font-bold text-white bg-[#111114] p-3 rounded-lg border border-slate-800/80">
                    {selectedStep.subject}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Email Body Copy:</div>
                  <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed bg-[#111114] p-4 rounded-lg border border-slate-800/80 max-h-64 overflow-y-auto custom-scrollbar">
                    {selectedStep.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Sequence Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Automated Email Sequence</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Product</label>
              <select
                value={newSeqProductId}
                onChange={e => setNewSeqProductId(e.target.value)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Sequence Funnel Type</label>
              <select
                value={newSeqType}
                onChange={e => setNewSeqType(e.target.value as any)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="welcome_lead">Welcome Series & Lead Magnet Delivery</option>
                <option value="post_purchase">Post-Purchase Onboarding & Review Collector</option>
                <option value="abandoned_cart">Abandoned Checkout Recovery Flow</option>
                <option value="launch">New Product Launch & Flash Discount</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] text-slate-400">Generate high-converting email copy?</span>
              <button
                onClick={handleAiGenerateSequence}
                disabled={isAiGenerating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiGenerating ? 'Writing with Free AI...' : 'Auto-Generate Email'}</span>
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Sequence Name</label>
              <input
                type="text"
                value={newSeqName}
                onChange={e => setNewSeqName(e.target.value)}
                placeholder="e.g. 5-Day Masterclass & Toolkit Pitch"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Subject Line</label>
              <input
                type="text"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="e.g. [Urgent] Your download is ready + 3 bonuses inside"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Body Content</label>
              <textarea
                rows={5}
                value={newEmailBody}
                onChange={e => setNewEmailBody(e.target.value)}
                placeholder="Write or generate the email body..."
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1A1A1E] text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSequence}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Deploy Sequence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
