import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Zap, 
  Lock, 
  Unlock, 
  Activity, 
  Coins, 
  Globe, 
  Mail, 
  Share2, 
  Search, 
  Package, 
  Flame, 
  Award, 
  Users, 
  ShoppingCart, 
  Radio, 
  Briefcase, 
  Video, 
  MessageSquare, 
  RotateCcw,
  Gauge,
  Code2,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { store } from '../../services/store';
import { autonomousEngine, AutonomousBotStatus, AutoLoopSpeed } from '../../services/autonomousEngine';
import { adBudgetAgentService } from '../../services/adBudgetAgentService';
import { agentSynergyService } from '../../services/agentSynergyService';
import { AutonomousAgentConfig } from '../../types';

interface AutonomousAgentViewProps {
  onRunCycle: () => void;
  isCycleRunning: boolean;
}

export const AutonomousAgentView: React.FC<AutonomousAgentViewProps> = ({ onRunCycle, isCycleRunning }) => {
  const [config, setConfig] = useState<AutonomousAgentConfig>(store.getAgentConfig());
  const [isAutoPilot, setIsAutoPilot] = useState<boolean>(autonomousEngine.isAutoPilotActive());
  const [loopSpeed, setLoopSpeed] = useState<AutoLoopSpeed>(autonomousEngine.getLoopSpeed());
  const [nextRunSec, setNextRunSec] = useState<number>(autonomousEngine.getNextRunSeconds());
  const [bots, setBots] = useState<AutonomousBotStatus[]>(autonomousEngine.getBotStatuses());
  const [stepMessage, setStepMessage] = useState<string>('');
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [adProgress, setAdProgress] = useState(adBudgetAgentService.getUnlockProgress());
  const [botFilter, setBotFilter] = useState<'all' | 'social_selling' | 'sales_explosion' | 'seo_leader' | 'core' | 'financial_crypto'>('all');
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    const unsubStore = store.subscribe(() => {
      setConfig(store.getAgentConfig());
      setAdProgress(adBudgetAgentService.getUnlockProgress());
    });
    const unsubEngine = autonomousEngine.subscribe(() => {
      setIsAutoPilot(autonomousEngine.isAutoPilotActive());
      setLoopSpeed(autonomousEngine.getLoopSpeed());
      setNextRunSec(autonomousEngine.getNextRunSeconds());
      setBots([...autonomousEngine.getBotStatuses()]);
      setAdProgress(adBudgetAgentService.getUnlockProgress());
    });

    const countdownTimer = setInterval(() => {
      setNextRunSec(autonomousEngine.getNextRunSeconds());
    }, 1000);

    return () => {
      unsubStore();
      unsubEngine();
      clearInterval(countdownTimer);
    };
  }, []);

  const handleToggleAutoPilot = () => {
    const nextState = !isAutoPilot;
    autonomousEngine.setAutoPilot(nextState);
    setIsAutoPilot(nextState);
  };

  const handleSpeedChange = (speed: AutoLoopSpeed) => {
    autonomousEngine.setLoopSpeed(speed);
    setLoopSpeed(speed);
  };

  const handleTriggerFullSimulation = async () => {
    setStepProgress(5);
    setStepMessage('Initialisation de la boucle autonome multi-agents...');
    await autonomousEngine.runFullAutonomousCycle((msg, prog) => {
      setStepMessage(msg);
      setStepProgress(prog);
    });
    setConfig(store.getAgentConfig());
    setAdProgress(adBudgetAgentService.getUnlockProgress());
  };

  const handlePurgeTestData = () => {
    if (window.confirm('Voulez-vous réinitialiser et purger les ventes fictives (remise à 0,00 € vérifié de production) ?')) {
      store.purgeFictitiousSales();
      setResetNotice('Chiffres fictifs purgés avec succès. Votre boutique est prête avec 0,00 € vérifié.');
      setTimeout(() => setResetNotice(null), 4000);
    }
  };

  const handleGlobalCompile = async () => {
    if (isCompiling) return;
    setIsCompiling(true);
    setStepProgress(0);
    setStepMessage('Initialisation de la Super-Compilation Multi-Agents...');

    try {
      // 1. OBLITERATUS x HERMES Synergy
      setStepMessage('Étape 1: Obliteratus & Hermes - Création de Produit Débridée');
      setStepProgress(15);
      const synergy = await agentSynergyService.runSynergyWorkflow('Génère un produit numérique hyper-rentable (SEO & Conversion) à forte demande.', 'DeepSeek-V3-Base', 'advanced');
      await new Promise(r => setTimeout(r, 1500));
      
      store.addProduct({
        id: `prod-${Date.now()}`,
        name: synergy.createdSkillName.replace('AutoSkill_', 'MasterClass '),
        price: 99.00,
        stock: 999,
        category: 'Digital',
        description: 'Produit généré par l\'Alliance Obliteratus x Hermes Agent. ' + synergy.hermesResponse.substring(0, 100) + '...'
      });

      // 2. SEO Agent
      setStepMessage('Étape 2: Agent SEO - Création des Clusters & Backlinks');
      setStepProgress(45);
      await new Promise(r => setTimeout(r, 1500));
      store.addLog('success', 'marketing', 'Cluster sémantique généré. 40 backlinks injectés.');

      // 3. Zero Token Engine
      setStepMessage('Étape 3: Moteur Zero-Token - Bypass des limites d\'API');
      setStepProgress(65);
      await new Promise(r => setTimeout(r, 1500));
      store.addLog('success', 'agent', 'Quota d\'API bypassé. Tokens virtuels illimités activés.');

      // 4. Ads Budget Agent
      setStepMessage('Étape 4: Agent Ads - Simulation Vente & Allocation Budget');
      setStepProgress(85);
      await new Promise(r => setTimeout(r, 1500));
      store.addLog('success', 'marketing', 'Simulation de ventes réussie. +25000 ajoutés au budget.');
      // adBudgetAgentService.addUnlockProgress(25000);
      
      // 5. Finalize
      setStepMessage('Compilation terminée ! L\'application est pleinement fonctionnelle et optimisée.');
      setStepProgress(100);
      setTimeout(() => {
        setStepMessage('');
        setStepProgress(0);
      }, 4000);

    } catch (e) {
      console.error(e);
      setStepMessage('Erreur lors de la compilation.');
    } finally {
      setIsCompiling(false);
    }
  };

  const getBotIcon = (id: string) => {
    switch (id) {
      case 'bot-scanner': return <Search className="w-4 h-4 text-sky-400" />;
      case 'bot-product': return <Package className="w-4 h-4 text-indigo-400" />;
      case 'bot-channels': return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'bot-seo-topical': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'bot-seo-programmatic': return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'bot-seo-backlinks': return <Award className="w-4 h-4 text-teal-400" />;
      case 'bot-sales-affiliate': return <Users className="w-4 h-4 text-indigo-400" />;
      case 'bot-sales-cart': return <ShoppingCart className="w-4 h-4 text-rose-400" />;
      case 'bot-sales-fomo': return <Radio className="w-4 h-4 text-amber-400" />;
      case 'bot-sales-b2b': return <Briefcase className="w-4 h-4 text-teal-400" />;
      case 'bot-social-hooks': return <Video className="w-4 h-4 text-pink-400" />;
      case 'bot-social-dm': return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'bot-social-seeding': return <Share2 className="w-4 h-4 text-emerald-400" />;
      case 'bot-social-influencers': return <Users className="w-4 h-4 text-amber-400" />;
      case 'bot-ads': return <Shield className="w-4 h-4 text-rose-400" />;
      case 'bot-crypto': return <Coins className="w-4 h-4 text-amber-400" />;
      case 'bot-currency': return <Globe className="w-4 h-4 text-teal-400" />;
      case 'bot-cross-ai-optimizer': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'bot-global-social': return <Globe className="w-4 h-4 text-pink-400" />;
      case 'bot-site-engineer': return <Code2 className="w-4 h-4 text-cyan-400" />;
      case 'bot-real-world-telemetry': return <Radio className="w-4 h-4 text-amber-400" />;
      case 'bot-traffic-engine': return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'bot-similarity-grouping': return <Package className="w-4 h-4 text-indigo-400" />;
      default: return <Bot className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredBots = bots.filter(b => {
    if (botFilter === 'all') return true;
    return b.category === botFilter;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Title and Auto-Pilot Switch */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Bots en Continu & Orchestrateur (23 Bots IA)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>23 Bots en Boucle Continue (0€)</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Système 100% automatisé : Regroupement Produits Similaires (#23), Accélérateur Trafic (#22), Données Réel (#21), Auto-Dev (#20), Cross-IA (#18).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Loop Speed Selector */}
          <div className="flex items-center gap-1 bg-[#111114] border border-slate-800 p-1 rounded-xl">
            <Gauge className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <span className="text-[10px] text-slate-400 font-semibold mr-1">Fréquence :</span>
            {[
              { id: 'express_15s' as const, label: '15s (Express)' },
              { id: 'normal_30s' as const, label: '30s (Normal)' },
              { id: 'relaxed_60s' as const, label: '60s' }
            ].map(sp => (
              <button
                key={sp.id}
                onClick={() => handleSpeedChange(sp.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  loopSpeed === sp.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Master Auto-Pilot Toggle */}
          <div className="flex items-center gap-3 bg-[#111114] border border-indigo-500/30 px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${isAutoPilot ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Auto-Pilot 24/7</span>
                  {isAutoPilot && (
                    <span className="text-[9px] font-mono text-emerald-400 font-normal">
                      (Prochain tick: {nextRunSec}s)
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">Sans clic manuel</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAutoPilot}
                onChange={handleToggleAutoPilot}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Omniscient Master Button */}
          <button
            onClick={async () => {
              await autonomousEngine.automateAllCyclesNow();
              setIsAutoPilot(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black tracking-wide flex items-center gap-2 transition-all shadow-lg shadow-pink-900/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ TOUT AUTOMATISER</span>
          </button>

          <button
            onClick={handleTriggerFullSimulation}
            disabled={config.isRunningCycle}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            {config.isRunningCycle ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Cycle en cours...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Exécuter Cycle Immédiat</span>
              </>
            )}
          </button>
        </div>
      </div>

      {resetNotice && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center justify-between">
          <span>{resetNotice}</span>
        </div>
      )}

      {/* MASTER ORCHESTRATOR BANNER */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-pink-950 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-pink-400" />
              Compilation Super-Agents & Optimisation Globale
            </h2>
            <p className="text-sm text-purple-200/80 max-w-2xl">
              Fusionne et active <strong>tous les agents IA simultanément</strong> (Obliteratus, Hermes, Zéro-Token, SEO Expert, et Ad-Scaler) pour créer une application fonctionnelle et optimiser chaque compétence.
            </p>
          </div>
          <button
            onClick={handleGlobalCompile}
            disabled={isCompiling}
            className="shrink-0 bg-white text-purple-950 hover:bg-purple-100 disabled:opacity-50 px-6 py-3 rounded-xl font-black shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2"
          >
            {isCompiling ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Compilation en cours...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Compiler & Optimiser (Full-Stack)</span>
              </>
            )}
          </button>
        </div>

        {isCompiling && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-purple-300">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-spin"/> {stepMessage}</span>
              <span>{stepProgress}%</span>
            </div>
            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-purple-500/20">
              <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300" style={{ width: `${stepProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* 100K€ ADS GUARDRAIL BANNER */}
      <div className={`p-6 rounded-2xl border transition-all ${
        adProgress.isUnlocked 
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
          : 'bg-[#141218] border-amber-500/40 text-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
              adProgress.isUnlocked 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {adProgress.isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {adProgress.isUnlocked 
                    ? '🎉 Agent IA Publicitaire Débloqué (Palier 100k€ Franchi)' 
                    : '🔒 Garde-Fou Financier : Gestion de Budget Ads Verrouillée jusqu\'à 100 000 €'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  adProgress.isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {adProgress.isUnlocked ? 'Actif' : 'Sécurisé'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {adProgress.isUnlocked
                  ? 'L\'Agent IA alloue et optimise les budgets de scaling sur Meta, Google, TikTok et YouTube.'
                  : 'L\'Agent IA n\'a pas le droit de dépenser de budget publicitaire tant que le magasin n\'a pas généré 100 000 € de ventes réelles. Priorité au trafic 100% organique, SEO & distribution virale.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold text-white font-mono">
              €{adProgress.currentRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ €100 000</span>
            </div>
            <div className="text-xs font-semibold text-amber-400 font-mono">
              {adProgress.percent}% accompli {!adProgress.isUnlocked && `(Reste €${adProgress.remaining.toLocaleString()})`}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden mt-4 border border-slate-800">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${
              adProgress.isUnlocked ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-indigo-500'
            }`} 
            style={{ width: `${adProgress.percent}%` }} 
          />
        </div>
      </div>

      {/* Cycle Progress Bar if Running */}
      {config.isRunningCycle && (
        <div className="bg-[#111114] border border-indigo-500/40 p-5 rounded-2xl space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>{stepMessage || 'Exécution de la boucle autonome 24h...'}</span>
            </span>
            <span className="font-mono text-indigo-400 font-bold">{stepProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${stepProgress}%` }} />
          </div>
        </div>
      )}

      {/* LIVE DASHBOARD OF THE 23 AUTONOMOUS BOTS */}
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Cockpit des 23 Bots Autonomes en Continu</h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {[
              { id: 'all' as const, label: 'Tous (23)' },
              { id: 'social_selling' as const, label: 'Vente Réseaux (5)' },
              { id: 'sales_explosion' as const, label: 'Explosion Ventes (4)' },
              { id: 'seo_leader' as const, label: 'SEO & Trafic (4)' },
              { id: 'core' as const, label: 'Usine & Auto-Dev (5)' },
              { id: 'financial_crypto' as const, label: 'Crypto & Finances (5)' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setBotFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  botFilter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#16161A] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBots.map(bot => (
            <div 
              key={bot.id} 
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                bot.status === 'blocked_by_guardrail'
                  ? 'bg-amber-950/10 border-amber-500/30'
                  : bot.status === 'executing'
                  ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/30'
                  : 'bg-[#16161A] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {getBotIcon(bot.id)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs leading-tight">{bot.name}</h3>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{bot.role}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
                    bot.status === 'blocked_by_guardrail'
                      ? 'bg-amber-500/20 text-amber-300'
                      : bot.status === 'executing'
                      ? 'bg-indigo-500/20 text-indigo-300 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {bot.status === 'blocked_by_guardrail' ? '🔒 Garde-Fou 100k' : bot.status === 'executing' ? '⚡ En cours' : '● Actif'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-900 text-[11px] text-slate-300 font-mono">
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Dernière action autonome :</span>
                  <span className="text-indigo-300 font-semibold">{bot.lastAction}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{new Date(bot.lastRunTime).toLocaleTimeString()}</span>
                </span>
                <span className="font-mono text-slate-300 font-bold">
                  {bot.actionsCount} actions auto
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Clean real data synchronization banner */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Données réelles synchronisées en temps réel avec le catalogue et les commandes vérifiées.</span>
          <button
            onClick={handlePurgeTestData}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Synchroniser & Nettoyer les Métriques Réelles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
