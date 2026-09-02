import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitFork, 
  Star, 
  Search, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Code2, 
  Download, 
  ExternalLink, 
  Layers, 
  Zap, 
  ShieldCheck, 
  RefreshCw,
  PackageCheck
} from 'lucide-react';
import { githubHarvester } from '../../services/githubHarvester';
import { store } from '../../services/store';
import { GithubRepository, DigitalProduct } from '../../types';

interface GithubEngineViewProps {
  setCurrentView: (view: string) => void;
}

export const GithubEngineView: React.FC<GithubEngineViewProps> = ({ setCurrentView }) => {
  const [repositories, setRepositories] = useState<GithubRepository[]>(() => githubHarvester.getRepositories());
  const [searchQuery, setSearchQuery] = useState('ai agent');
  const [isSearching, setIsSearching] = useState(false);
  const [isProductizingId, setIsProductizingId] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepository | null>(null);
  const [recentProduct, setRecentProduct] = useState<DigitalProduct | null>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setRepositories([...githubHarvester.getRepositories()]);
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await githubHarvester.searchAndFetchGithub(searchQuery);
      setRepositories([...results]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProductize = async (repo: GithubRepository) => {
    setIsProductizingId(repo.id);
    try {
      const prod = await githubHarvester.productizeRepository(repo.id);
      if (prod) {
        setRecentProduct(prod);
        setRepositories([...githubHarvester.getRepositories()]);
      }
    } finally {
      setIsProductizingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">GitHub Code Harvester & Productizer AI</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Open-Source Ingestion Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous AI agent that scans trending GitHub repositories, parses code architecture, and transforms open-source frameworks into commercial digital playbooks & toolkits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('products')}
            className="px-4 py-2 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Product Factory</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner when a repo is productized */}
      {recentProduct && (
        <div className="bg-[#111114] border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Repository Successfully Productized!</div>
              <div className="text-[11px] text-slate-400">
                Created: <span className="text-slate-200 font-semibold">{recentProduct.title}</span> (€{recentProduct.pricing?.recommendedPrice ?? 47})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('storefront')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Preview in Store
            </button>
            <button
              onClick={() => setRecentProduct(null)}
              className="px-3 py-1.5 rounded-lg bg-[#1A1A1E] text-slate-400 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Search & Ingestion Bar */}
      <div className="bg-[#111114] border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search GitHub repositories (e.g. 'ai agent', 'rag system', 'fastapi template', 'llm prompt')..."
            className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
          <span>{isSearching ? 'Scanning GitHub...' : 'Ingest & Scan Repositories'}</span>
        </button>
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map(repo => (
          <div
            key={repo.id}
            className="bg-[#111114] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all group"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px]">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{repo.owner}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mt-0.5">
                    {repo.name}
                  </h3>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  repo.status === 'productized'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#1A1A1E] text-slate-400 border border-slate-800'
                }`}>
                  {repo.status === 'productized' ? '✓ PRODUCTIZED' : 'SCANNED'}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {repo.description}
              </p>

              {/* Tech Stack & Topics */}
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20 font-bold">
                  {repo.language}
                </span>
                {repo.topics.slice(0, 3).map(topic => (
                  <span key={topic} className="px-2 py-0.5 rounded bg-[#16161A] text-slate-400 text-[10px] font-mono border border-slate-800">
                    #{topic}
                  </span>
                ))}
              </div>

              {/* Monetization Angle Box */}
              <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>Monetization Blueprint</span>
                  <span className="text-emerald-400 font-mono">Viability: {repo.commercialViabilityScore}/100</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {repo.monetizationAngle}
                </p>
              </div>
            </div>

            {/* Metrics & Action Button */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {(repo.stars ?? 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5" />
                    {(repo.forks ?? 0).toLocaleString()}
                  </span>
                </div>

                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <button
                onClick={() => handleProductize(repo)}
                disabled={isProductizingId === repo.id || repo.status === 'productized'}
                className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  repo.status === 'productized'
                    ? 'bg-[#16161A] text-emerald-400 border border-emerald-500/30 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isProductizingId === repo.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Product Package...</span>
                  </>
                ) : repo.status === 'productized' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active in Digital Store</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Productize into SaaS Kit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
