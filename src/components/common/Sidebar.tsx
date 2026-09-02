import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Package,
  Layers,
  DollarSign,
  FileText,
  Search,
  Share2,
  Mail,
  Megaphone,
  Bot,
  CheckSquare,
  BarChart3,
  Lightbulb,
  Receipt,
  Users,
  Terminal,
  Cpu,
  Settings,
  Sparkles,
  FileCode,
  Code2,
  Radio,
  Flame,
  TrendingUp,
  Award,
  Video,
  Globe,
  ShoppingBag,
  Brain
} from 'lucide-react';
import { store } from '../../services/store';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenStorefront?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onOpenStorefront }) => {
  const pendingApprovals = store.getApprovals().filter(a => a.status === 'pending').length;
  const winnerProducts = store.getProducts().filter(p => p.tier === 'winner').length;
  const openRecommendations = store.getRecommendations().filter(r => r.status === 'pending').length;

  const navSections = [
    {
      title: 'BOUTIQUE & PILOTAGE',
      items: [
        { id: 'storefront', label: 'Boutique Publique (Live)', icon: ShoppingBag, badge: 'Client ⚡' },
        { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
        { id: 'traffic_radar', label: 'Radar Trafic & Indexation (#22)', icon: Radio, badge: 'Live 24/24' },
        { id: 'global_social', label: 'Réseaux Tout Pays (#19)', icon: Globe, badge: 'Viral 0€' },
        { id: 'site_engineer', label: 'Architecte Site & Code (#20)', icon: Code2, badge: 'Auto-Dev' },
        { id: 'real_world_telemetry', label: 'Données du Réel (#21)', icon: Radio, badge: '24/24' },
        { id: 'profitability', label: 'Rentabilité & Marges', icon: TrendingUp, badge: '98% Net' },
        { id: 'social_selling', label: 'Vente Rapide Réseaux', icon: Flame, badge: 'Viral' },
        { id: 'sales_explosion', label: 'Explosion des Ventes', icon: Sparkles, badge: 'Affiliation' },
        { id: 'seo', label: 'Suite SEO Leader', icon: Award, badge: 'Google #1' }
      ]
    },
    {
      title: 'USINE DE PRODUITS',
      items: [
        { id: 'github', label: 'GitHub Harvester AI', icon: Code2, badge: 'Code' },
        { id: 'opportunities', label: 'Opportunités & Niches', icon: Compass, badge: store.getOpportunities().filter(o => o.status === 'discovered').length },
        { id: 'products', label: 'Usine de Produits', icon: Package, badge: `${winnerProducts} Winners` },
        { id: 'bundles', label: 'Packs & Bundles', icon: Layers },
        { id: 'pricing', label: 'Gestion des prix et attractivité de la modération', icon: DollarSign, badge: 'Modération' }
      ]
    },
    {
      title: 'DISTRIBUTION & TRAFIC',
      items: [
        { id: 'channels', label: 'Canaux Autonomes', icon: Radio, badge: 'Auto' },
        { id: 'landing_pages', label: 'Landing Pages', icon: FileText },
        { id: 'content', label: 'Usine de Contenu', icon: Sparkles },
        { id: 'social', label: 'Réseaux Sociaux & Calendrier', icon: Share2 },
        { id: 'email', label: 'Séquences Emails', icon: Mail },
        { id: 'ads', label: 'Agent IA Ads (Palier 100k)', icon: Megaphone, badge: '100k€ Max' }
      ]
    },
    {
      title: 'AGENCE B2B (Création Apps)',
      items: [
        { id: 'app_builder', label: 'Usine IA : Générateur Apps', icon: Globe, badge: 'Nouveau' }
      ]
    },
    {
      title: 'BOTS EN CONTINU (23 BOTS)',
      items: [
        { id: 'agents_synergy', label: 'Alliance OBLITERATUS x HERMES', icon: Flame, pulse: true, badge: 'Synergie Dual' },
        { id: 'hermes_agent', label: 'Hermes Agent IA (Open-Source)', icon: Brain, pulse: true, badge: 'v3.5 Auto' },
        { id: 'agent', label: 'Bots en Continu (23 Bots)', icon: Bot, pulse: true, badge: '23 Bots' },
        { id: 'cross_ai', label: 'Méta-Optimiseur Cross-IA', icon: Sparkles, badge: 'Cross-IA 0€' },
        { id: 'tokens', label: 'Moteur Zéro-Token', icon: Cpu, badge: '100% Free' },
        { id: 'approvals', label: 'Centre d\'Approbation', icon: CheckSquare, count: pendingApprovals, countColor: 'bg-amber-500/20 text-amber-300' },
        { id: 'recommendations', label: 'Recommandations IA', icon: Lightbulb, count: openRecommendations, countColor: 'bg-indigo-500/20 text-indigo-300' },
        { id: 'analytics', label: 'Analytique & Attribution', icon: BarChart3 }
      ]
    },
    {
      title: 'SYSTÈME & COMMERCE',
      items: [
        { id: 'orders', label: 'Commandes & Ventes', icon: Receipt, count: store.getOrders().length },
        { id: 'billing', label: 'Facturation Conforme FR', icon: FileText, badge: 'CGI / TVA' },
        { id: 'customers', label: 'Clients & CRM', icon: Users },
        { id: 'prompts', label: 'Bibliothèque de Prompts', icon: FileCode },
        { id: 'logs', label: 'Journaux Système & Jobs', icon: Terminal },
        { id: 'integrations', label: 'Intégrations & Crypto', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0F0F12] border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] text-slate-300 shrink-0 select-none">
      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {navSections.map(section => (
          <div key={section.title}>
            <div className="px-3 mb-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'storefront') {
                        if (onOpenStorefront) onOpenStorefront();
                        else setCurrentView('storefront');
                      } else {
                        setCurrentView(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-500'
                        : 'text-slate-400 hover:text-white hover:bg-[#16161A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.pulse && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
                      )}
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1A1A1E] text-slate-300 border border-slate-800">
                          {item.badge}
                        </span>
                      )}
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.countColor || 'bg-[#1A1A1E] text-slate-300'}`}>
                          {item.count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Autonomous Agent Footer Status */}
      <div className="mt-auto p-3 border-t border-slate-800 bg-[#0F0F12]">
        <div className="bg-[#1A1A1E] p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-white">21 Bots en Continu</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">100% Organique (0€)</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Auto-Pilot actif • Garde-fou 100k€ actif
          </div>
        </div>
      </div>
    </aside>
  );
};

