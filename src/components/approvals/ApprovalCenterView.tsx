import React, { useState } from 'react';
import { CheckSquare, CheckCircle2, XCircle, AlertTriangle, Sparkles, Shield, Clock, ArrowRight } from 'lucide-react';
import { store } from '../../services/store';
import { ApprovalItem } from '../../types';

export const ApprovalCenterView: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(store.getApprovals());
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = async (id: string) => {
    await store.executeApproval(id);
    setApprovals(store.getApprovals());
  };

  const handleReject = (id: string) => {
    store.rejectApproval(id, 'Rejected by operator in Approval Center.');
    setApprovals(store.getApprovals());
  };

  const handleApproveAllSafe = () => {
    store.approveAllSafeActions();
    setApprovals(store.getApprovals());
  };

  const filtered = approvals.filter(a => a.status === activeTab);
  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Approval & Human-in-the-Loop Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {pendingCount} Pending Review
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review and sanction autonomous agent proposals before they take effect in production.
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleApproveAllSafe}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve All Safe Low-Risk Actions</span>
          </button>
        )}
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === 'pending'
              ? 'bg-[#1A1A1E] text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Pending Review ({approvals.filter(a => a.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === 'approved'
              ? 'bg-[#1A1A1E] text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Approved History ({approvals.filter(a => a.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === 'rejected'
              ? 'bg-[#1A1A1E] text-rose-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Rejected ({approvals.filter(a => a.status === 'rejected').length})
        </button>
      </div>

      {/* Approvals List */}
      {filtered.length === 0 ? (
        <div className="bg-[#111114] border border-slate-800 p-12 rounded-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1A1A1E] flex items-center justify-center mx-auto text-slate-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No {activeTab} actions in queue</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Autonomous agent will automatically submit actions here when requiring validation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(appr => (
            <div
              key={appr.id}
              className="bg-[#111114] border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A1A1E] text-indigo-300 border border-slate-800 uppercase">
                    {appr.type.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    appr.riskLevel === 'low'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : appr.riskLevel === 'medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    Risk: {appr.riskLevel.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    AI Score: <strong className="text-slate-200">{appr.aiScore}/100</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{appr.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{appr.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <span>Impact: <strong className="text-emerald-400">{appr.estimatedPotential}</strong></span>
                  <span>Cost: <strong className="text-slate-300">{appr.financialImpact}</strong></span>
                </div>
              </div>

              {appr.status === 'pending' ? (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleReject(appr.id)}
                    className="px-3.5 py-2 rounded-lg bg-[#1A1A1E] hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(appr.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Execute</span>
                  </button>
                </div>
              ) : (
                <div className="text-right shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    appr.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {appr.status.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
