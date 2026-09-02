import React, { useState } from 'react';
import { Terminal, Search, Filter, RefreshCw, AlertTriangle, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { store } from '../../services/store';
import { SystemLog, SystemJob } from '../../types';

export const SystemLogsView: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>(store.getLogs());
  const [jobs, setJobs] = useState<SystemJob[]>(store.getJobs());
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleClearLogs = () => {
    store.clearLogs();
    setLogs(store.getLogs());
  };

  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return log.message.toLowerCase().includes(q) || log.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">System Logs & Worker Job Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Event Bus
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit trail of autonomous cycles, background workers, AI API calls, and Stripe webhooks.
          </p>
        </div>

        <button
          onClick={handleClearLogs}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
        >
          Clear Stream
        </button>
      </div>

      {/* Background Job Queue Status */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Background Worker Queue</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-1 max-w-xs">
                <div className="font-semibold text-slate-200 truncate">{job.type.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="text-[11px] text-slate-500 font-mono">Job ID: {job.id}</div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  job.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : job.status === 'processing'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {job.status.toUpperCase()}
                </span>
                <div className="text-[10px] text-slate-500 mt-1">{job.progressPercent ?? 100}% complete</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Log Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500"
            />
          </div>

          <span className="text-xs text-slate-500">{filteredLogs.length} events logged</span>
        </div>

        {/* Console Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
          {filteredLogs.map(log => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 text-[11px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                log.level === 'error'
                  ? 'bg-rose-950 text-rose-300'
                  : log.level === 'warn'
                  ? 'bg-amber-950 text-amber-300'
                  : log.level === 'success'
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-indigo-950 text-indigo-300'
              }`}>
                {log.level}
              </span>
              <span className="text-slate-400 text-[11px] shrink-0">[{log.category}]</span>
              <span className="text-slate-200 break-words">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
