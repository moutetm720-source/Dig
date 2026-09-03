import React, { useState, useEffect } from 'react';
import { 
  MonitorSmartphone, 
  Terminal, 
  Cpu, 
  Globe, 
  Code2, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Zap,
  Flame,
  Brain,
  Building2,
  ArrowRight,
  Database,
  Server,
  FolderOpen,
  Edit3,
  Save,
  Trash2,
  Plus
} from 'lucide-react';
import { store } from '../../services/store';

interface GeneratedApp {
  id: string;
  name: string;
  description: string;
  architecture: {
    frontend: string;
    backend: string;
    database: string;
  };
  publicApis: Array<{ name: string; description: string; category: string }>;
  features: string[];
}

export const AppBuilderView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  
  const [savedApps, setSavedApps] = useState<GeneratedApp[]>(() => {
    const saved = localStorage.getItem('b2b_agency_apps');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedApp, setEditedApp] = useState<GeneratedApp | null>(null);

  useEffect(() => {
    localStorage.setItem('b2b_agency_apps', JSON.stringify(savedApps));
  }, [savedApps]);

  const activeApp = savedApps.find(a => a.id === activeAppId) || null;

  const steps = [
    { name: 'Hermes Agent: Analyse', icon: Brain, color: 'text-indigo-400' },
    { name: 'Hermes: Idéation', icon: Flame, color: 'text-pink-400' },
    { name: 'Public-APIs: Intégration', icon: Globe, color: 'text-sky-400' },
    { name: 'Code: Compilation', icon: Code2, color: 'text-emerald-400' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setActiveAppId(null);
    setStep(0);

    for (let i = 0; i < steps.length; i++) {
      setStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      const res = await fetch('/api/agency/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const newApp = data.app;
      
      setSavedApps(prev => [newApp, ...prev]);
      setActiveAppId(newApp.id);
      
      store.addLog('success', 'agent', `[AGENCE B2B] Solution digitale "${newApp.name}" générée avec succès via Hermes Agent (moteur v4).`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
      setStep(steps.length);
    }
  };

  const startEdit = () => {
    if (activeApp) {
      setEditedApp(JSON.parse(JSON.stringify(activeApp))); // deep copy
      setIsEditing(true);
    }
  };

  const saveEdit = () => {
    if (editedApp) {
      setSavedApps(prev => prev.map(a => a.id === editedApp.id ? editedApp : a));
      setIsEditing(false);
      setEditedApp(null);
      store.addLog('success', 'agent', `[AGENCE B2B] Application "${editedApp.name}" mise à jour.`);
    }
  };

  const deleteApp = (id: string) => {
    setSavedApps(prev => prev.filter(a => a.id !== id));
    if (activeAppId === id) setActiveAppId(null);
  };

  const displayApp = isEditing ? editedApp : activeApp;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden font-sans text-slate-100">
      
      {/* SIDEBAR: Liste des apps */}
      <div className="w-80 border-r border-slate-800 bg-[#0B0D14] flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <FolderOpen className="w-5 h-5" />
            Mes Applications
          </div>
          <button 
            onClick={() => { setActiveAppId(null); setIsEditing(false); }}
            className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-colors"
            title="Nouveau Projet"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {savedApps.length === 0 ? (
            <div className="text-center text-xs text-slate-500 mt-10">
              Aucune application générée.<br/>Créez votre première app B2B.
            </div>
          ) : (
            savedApps.map(app => (
              <div 
                key={app.id}
                onClick={() => { setActiveAppId(app.id); setIsEditing(false); }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 relative group ${
                  activeAppId === app.id 
                    ? 'bg-[#151A26] border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
                    : 'bg-[#121217] border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm text-white truncate pr-6">{app.name}</div>
                <div className="text-xs text-slate-500 truncate">{app.architecture.frontend}</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteApp(app.id); }}
                  className="absolute right-2 top-2 p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* HEADER BANNER */}
        <div className="bg-gradient-to-r from-[#0D121A] via-[#121A2F] to-[#0A1628] border border-sky-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  AGENCE DIGITALE B2B
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  AI FACTORY
                </span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Générateur d'Applications d'Entreprise
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                Utilisez le <strong className="text-indigo-400">Hermes Agent</strong> (moteur multi-agents v4) et les <strong className="text-sky-400">Public-APIs</strong> pour générer des sites web et applications sur-mesure.
              </p>
            </div>
            
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center"><Brain className="w-6 h-6 text-indigo-400" /></div>
              <ArrowRight className="w-5 h-5 text-slate-600" />
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center"><Flame className="w-6 h-6 text-pink-400" /></div>
              <ArrowRight className="w-5 h-5 text-slate-600" />
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center"><Globe className="w-6 h-6 text-sky-400" /></div>
            </div>
          </div>
        </div>

        {/* CONDITION: GENERATOR OR VIEW/EDIT APP */}
        {!activeAppId && !isGenerating && (
          <div className="bg-[#111116] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-sky-400" />
              Nouveau Projet (Brief Client)
            </h2>
            <div className="flex flex-col gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Je veux un SaaS de gestion pour un réseau de cliniques vétérinaires avec un dashboard, prise de rdv, et météo en direct pour les propriétaires d'animaux..."
                rows={4}
                className="w-full bg-[#1A1A22] border border-slate-700 focus:border-sky-500 text-white placeholder-slate-500 rounded-xl p-4 text-sm outline-none transition-colors"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="self-end bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
              >
                <MonitorSmartphone className="w-5 h-5" />
                Créer l'Application
              </button>
            </div>
          </div>
        )}

        {/* PIPELINE PROGRESS */}
        {isGenerating && (
          <div className="bg-[#111116] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              Génération Multi-Agents en cours...
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {steps.map((s, idx) => {
                const isActive = step === idx;
                const isPast = step > idx;
                const Icon = s.icon;
                return (
                  <div key={idx} className={`relative p-4 rounded-xl border transition-all duration-500 ${isActive ? 'bg-[#1A1A24] border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]' : isPast ? 'bg-[#151A1E] border-emerald-500/30' : 'bg-[#121217] border-slate-800 opacity-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <Icon className={`w-6 h-6 ${isActive ? s.color + ' animate-pulse' : isPast ? 'text-emerald-400' : 'text-slate-600'}`} />
                      {isPast && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className={`text-xs font-bold ${isActive || isPast ? 'text-white' : 'text-slate-500'}`}>{s.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DISPLAY OR EDIT APP */}
        {displayApp && !isGenerating && (
          <div className="bg-gradient-to-br from-[#0D1612] to-[#0A121A] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="w-6 h-6 text-emerald-400" />
                  {isEditing ? (
                    <input 
                      value={editedApp?.name || ''} 
                      onChange={e => setEditedApp(prev => prev ? {...prev, name: e.target.value} : prev)}
                      className="bg-[#1A1A22] border border-slate-700 rounded p-1 text-xl font-black text-white outline-none focus:border-sky-500"
                    />
                  ) : (
                    <h2 className="text-xl font-black text-white">{displayApp.name}</h2>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">Instance déployable en 1-clic.</p>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <button onClick={saveEdit} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                    <Save className="w-4 h-4" /> Sauvegarder
                  </button>
                ) : (
                  <>
                    <button onClick={startEdit} className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/40 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                      <Edit3 className="w-4 h-4" /> Modifier
                    </button>
                    <button className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-4 py-2 rounded-lg text-sm font-bold transition-all">
                      Déployer Serveur
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#111116] border border-slate-800 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Description du Projet</h4>
                  {isEditing ? (
                    <textarea 
                      value={editedApp?.description || ''} 
                      onChange={e => setEditedApp(prev => prev ? {...prev, description: e.target.value} : prev)}
                      rows={3}
                      className="w-full bg-[#1A1A22] border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-sky-500"
                    />
                  ) : (
                    <p className="text-sm text-slate-300 leading-relaxed">{displayApp.description}</p>
                  )}
                </div>

                {/* Architecture */}
                <div className="bg-[#111116] border border-slate-800 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> Architecture Technique
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-[#1A1A22] p-3 rounded-lg border border-slate-700">
                      <MonitorSmartphone className="w-5 h-5 text-sky-400 mb-2" />
                      <div className="text-xs text-slate-400 mb-1">Frontend</div>
                      {isEditing ? (
                        <input value={editedApp?.architecture.frontend || ''} onChange={e => setEditedApp(prev => prev ? {...prev, architecture: {...prev.architecture, frontend: e.target.value}} : prev)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                      ) : <div className="font-bold text-slate-200 truncate">{displayApp.architecture.frontend}</div>}
                    </div>
                    <div className="bg-[#1A1A22] p-3 rounded-lg border border-slate-700">
                      <Server className="w-5 h-5 text-indigo-400 mb-2" />
                      <div className="text-xs text-slate-400 mb-1">Backend</div>
                      {isEditing ? (
                        <input value={editedApp?.architecture.backend || ''} onChange={e => setEditedApp(prev => prev ? {...prev, architecture: {...prev.architecture, backend: e.target.value}} : prev)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                      ) : <div className="font-bold text-slate-200 truncate">{displayApp.architecture.backend}</div>}
                    </div>
                    <div className="bg-[#1A1A22] p-3 rounded-lg border border-slate-700">
                      <Database className="w-5 h-5 text-emerald-400 mb-2" />
                      <div className="text-xs text-slate-400 mb-1">Database</div>
                      {isEditing ? (
                        <input value={editedApp?.architecture.database || ''} onChange={e => setEditedApp(prev => prev ? {...prev, architecture: {...prev.architecture, database: e.target.value}} : prev)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                      ) : <div className="font-bold text-slate-200 truncate">{displayApp.architecture.database}</div>}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="bg-[#111116] border border-slate-800 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" /> Fonctionnalités (OBLITERATUS)
                  </h4>
                  <ul className="space-y-2">
                    {displayApp.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {isEditing ? (
                          <input 
                            value={feat} 
                            onChange={e => {
                              const newFeats = [...(editedApp?.features || [])];
                              newFeats[idx] = e.target.value;
                              setEditedApp(prev => prev ? {...prev, features: newFeats} : prev);
                            }}
                            className="flex-1 bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" 
                          />
                        ) : (
                          <span>{feat}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Public APIs */}
              <div className="space-y-4">
                <div className="bg-gradient-to-b from-[#111116] to-[#0A0A0E] border border-sky-500/20 rounded-xl p-5 h-full">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" /> Intégrations Public-APIs
                  </h4>
                  <div className="space-y-3">
                    {displayApp.publicApis.map((api, idx) => (
                      <div key={idx} className="bg-[#1A1A22] border border-slate-700/80 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          {isEditing ? (
                            <input 
                              value={api.name} 
                              onChange={e => {
                                const newApis = [...(editedApp?.publicApis || [])];
                                newApis[idx] = { ...newApis[idx], name: e.target.value };
                                setEditedApp(prev => prev ? {...prev, publicApis: newApis} : prev);
                              }}
                              className="font-bold text-sky-300 text-xs bg-black border border-slate-700 rounded px-1 w-2/3" 
                            />
                          ) : (
                            <span className="font-bold text-sky-300 text-xs">{api.name}</span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">{api.category}</span>
                        </div>
                        {isEditing ? (
                          <textarea 
                            value={api.description} 
                            onChange={e => {
                              const newApis = [...(editedApp?.publicApis || [])];
                              newApis[idx] = { ...newApis[idx], description: e.target.value };
                              setEditedApp(prev => prev ? {...prev, publicApis: newApis} : prev);
                            }}
                            rows={2}
                            className="text-[11px] text-slate-400 leading-tight w-full bg-black border border-slate-700 rounded p-1 mt-1" 
                          />
                        ) : (
                          <div className="text-[11px] text-slate-400 leading-tight">{api.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
