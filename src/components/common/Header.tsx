import React from 'react';
import { 
  Bot, 
  Play, 
  Sparkles, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { store } from '../../services/store';
import { tokenManager } from '../../services/tokenManager';
import { AutonomousMode } from '../../types';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isStorefrontOpen: boolean;
  setIsStorefrontOpen: (open: boolean) => void;
  onRunCycle: () => void;
  isCycleRunning: boolean;
  onLockModerator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  isStorefrontOpen,
  setIsStorefrontOpen,
  onRunCycle,
  isCycleRunning,
  onLockModerator
}) => {
  const agentConfig = store.getAgentConfig();
  const tokenConfig = tokenManager.getConfig();
  const pendingApprovalsCount = store.getApprovals().filter(a => a.status === 'pending').length;

  const handleModeChange = (mode: AutonomousMode) => {
    store.updateAgentConfig({ mode });
  };

  const remainingTokensK = Math.max(0, Math.round((tokenConfig.dailyTokenQuota - tokenConfig.currentTokensUsedToday) / 1000));

  return (
    <header className="h-16 bg-[#0F0F12] border-b border-slate-800 px-6 flex items-center justify-between text-[#E2E8F0] shrink-0 z-30">
      {/* Zone 1: Brand Title (Single text element strictly complying with top bar contract) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg text-white font-bold text-base shadow-sm">
          D
        </div>
        <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
          DigitalFactory
        </span>
      </div>

      {/* Zone 2: Navigation / Key Shortcuts (Single-line controls) */}
      <nav className="hidden lg:flex items-center gap-1.5">
        <button
          onClick={() => { setIsStorefrontOpen(false); setCurrentView('dashboard'); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            !isStorefrontOpen && currentView === 'dashboard'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Dashboard
        </button>

        <button
          onClick={() => { setIsStorefrontOpen(false); setCurrentView('opportunities'); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            !isStorefrontOpen && currentView === 'opportunities'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Opportunities
        </button>

        <button
          onClick={() => { setIsStorefrontOpen(false); setCurrentView('products'); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            !isStorefrontOpen && currentView === 'products'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Product Factory
        </button>

        <button
          onClick={() => { setIsStorefrontOpen(false); setCurrentView('tokens'); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            !isStorefrontOpen && currentView === 'tokens'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>{remainingTokensK}k Free Tokens</span>
        </button>

        <button
          onClick={() => { setIsStorefrontOpen(false); setCurrentView('approvals'); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            !isStorefrontOpen && currentView === 'approvals'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Approvals
          {pendingApprovalsCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setIsStorefrontOpen(false); setCurrentView('agent'); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            !isStorefrontOpen && currentView === 'agent'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          AI Agent
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions & Autonomous Controls */}
      <div className="flex items-center gap-3">
        {/* Mode Selector Pill */}
        <div className="flex items-center bg-[#1A1A1E] p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => handleModeChange('assisted')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
              agentConfig.mode === 'assisted'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assisté
          </button>
          <button
            onClick={() => handleModeChange('autonomous')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 whitespace-nowrap ${
              agentConfig.mode === 'autonomous'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>Auto-Pilot (9 Bots)</span>
          </button>
        </div>

        {/* Run Cycle Button */}
        <button
          onClick={onRunCycle}
          disabled={isCycleRunning}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
        >
          {isCycleRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Cycle</span>
            </>
          )}
        </button>

        {/* Storefront Link Button */}
        <button
          onClick={() => setIsStorefrontOpen(!isStorefrontOpen)}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border whitespace-nowrap ${
            isStorefrontOpen
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-[#1A1A1E] text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
          <span>{isStorefrontOpen ? 'Back to Admin' : 'View Store'}</span>
        </button>

        {onLockModerator && (
          <button
            onClick={onLockModerator}
            title="Verrouiller la session modérateur (Retour vue client)"
            className="p-2 rounded-lg bg-[#1A1A1E] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
