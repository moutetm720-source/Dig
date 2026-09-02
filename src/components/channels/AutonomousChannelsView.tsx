import React, { useState } from 'react';
import { 
  Radio, 
  Plus, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  Globe, 
  MessageSquare, 
  Share2, 
  TrendingUp, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Zap,
  Activity
} from 'lucide-react';
import { channelOrchestrator } from '../../services/channelOrchestrator';
import { store } from '../../services/store';
import { AutonomousChannel, ChannelPlatform, ChannelBroadcastEvent, DigitalProduct } from '../../types';

interface AutonomousChannelsViewProps {
  setCurrentView: (view: string) => void;
}

export const AutonomousChannelsView: React.FC<AutonomousChannelsViewProps> = ({ setCurrentView }) => {
  const [channels, setChannels] = useState<AutonomousChannel[]>(channelOrchestrator.getChannels());
  const [history, setHistory] = useState<ChannelBroadcastEvent[]>(channelOrchestrator.getBroadcastHistory());
  const [metrics, setMetrics] = useState(channelOrchestrator.getMetrics());
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct>(products[0]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState<ChannelPlatform>('telegram');
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    return channelOrchestrator.subscribe(() => {
      setChannels(channelOrchestrator.getChannels());
      setHistory(channelOrchestrator.getBroadcastHistory());
      setMetrics(channelOrchestrator.getMetrics());
    });
  }, []);

  const handleToggleStatus = (id: string) => {
    channelOrchestrator.toggleChannelStatus(id);
  };

  const handleToggleAutoPost = (id: string) => {
    channelOrchestrator.toggleAutoPost(id);
  };

  const handleOptimizeOrchestra = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      const res = channelOrchestrator.optimizeOrchestra();
      setBroadcastFeedback(res.message);
      setIsOptimizing(false);
      setTimeout(() => setBroadcastFeedback(null), 5000);
    }, 450);
  };

  const handleBroadcast = async () => {
    if (!selectedProduct) return;
    setIsBroadcasting(true);
    try {
      const dispatched = await channelOrchestrator.broadcastProduct(selectedProduct);
      setBroadcastFeedback(`Diffusé avec succès à ${dispatched.length} canaux actifs avec payloads adaptés !`);
      setTimeout(() => setBroadcastFeedback(null), 4000);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleProvisionChannel = async () => {
    setIsCreating(true);
    try {
      await channelOrchestrator.createAutonomousChannel(newPlatform, newChannelName || undefined);
      setShowProvisionModal(false);
      setNewChannelName('');
    } finally {
      setIsCreating(false);
    }
  };

  const totalAudience = channels.reduce((sum, c) => sum + c.subscriberCount, 0);
  const totalDispatches = channels.reduce((sum, c) => sum + c.totalDispatches, 0);
  const activeChannelsCount = channels.filter(c => c.status === 'active').length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Distribution Multi-Canaux Orchestra</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ⚡ Orchestra Hyper-Optimisé (12ms)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Moteur de syndication et d'orchestration multi-plateforme autonome (GitHub Discussions, Dev.to, Telegram VIP, Discord Webhooks, Substack, Bluesky) avec formatage adaptatif et latence ultra-faible.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOptimizeOrchestra}
            disabled={isOptimizing}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isOptimizing ? 'Optimisation en cours...' : '⚡ Optimiser Orchestra'}</span>
          </button>

          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provisionner Canal</span>
          </button>
        </div>
      </div>

      {/* Network Stats Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Canaux & Pipes Actifs</div>
          <div className="text-2xl font-extrabold text-white font-mono">{activeChannelsCount} / {channels.length}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <Activity className="w-3 h-3" />
            <span>Santé 100% (Latence: {metrics.averageLatencyMs}ms)</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audience Totale Touchée</div>
          <div className="text-2xl font-extrabold text-indigo-400 font-mono">{totalAudience.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400">Abonnés & Développeurs ciblés</div>
        </div>

        <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diffusions Multi-Réseaux</div>
          <div className="text-2xl font-extrabold text-white font-mono">{totalDispatches}</div>
          <div className="text-[11px] text-slate-400">Syndications 100% autonomes</div>
        </div>

        <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CA Attribué Orchestra</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">€{metrics.totalRevenueGeneratedEur.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 font-mono">{metrics.totalConversions} conversions directes</div>
        </div>
      </div>

      {/* Broadcast Trigger Box */}
      <div className="bg-[#111114] border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              <span>Multi-Channel Autonomous Dispatcher</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly push a product release across all self-created distribution channels with tailored platform formatting.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedProduct?.id}
              onChange={e => setSelectedProduct(products.find(p => p.id === e.target.value) || products[0])}
              className="bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white max-w-xs focus:outline-none focus:border-indigo-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <button
              onClick={handleBroadcast}
              disabled={isBroadcasting || !selectedProduct}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast to Network'}</span>
            </button>
          </div>
        </div>

        {broadcastFeedback && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{broadcastFeedback}</span>
          </div>
        )}
      </div>

      {/* Self-Provisioned Channels List */}
      <div className="space-y-3">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Self-Provisioned Distribution Channels ({channels.length})</div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map(channel => (
            <div
              key={channel.id}
              className="bg-[#111114] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#16161A] border border-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xs">
                      {channel.platform === 'github_discussions' ? 'GH' : channel.platform === 'dev_to' ? 'DEV' : channel.platform === 'telegram' ? 'TG' : channel.platform === 'discord_webhook' ? 'DC' : 'RSS'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{channel.name}</h4>
                      <div className="text-[10px] text-slate-500 font-mono">{channel.handleOrIdentifier}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(channel.id)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                      channel.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-[#1A1A1E] text-slate-500 border border-slate-800'
                    }`}
                  >
                    {channel.status}
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center font-mono">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Followers</div>
                    <div className="text-xs font-bold text-slate-200">{channel.subscriberCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Dispatches</div>
                    <div className="text-xs font-bold text-slate-200">{channel.totalDispatches}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Eng. Rate</div>
                    <div className="text-xs font-bold text-emerald-400">{channel.engagementRate}%</div>
                  </div>
                </div>

                {/* Recent Event Log */}
                <div className="p-2.5 rounded-lg bg-[#16161A] border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Latest Autonomous Log</div>
                  <div className="truncate text-slate-300 font-mono text-[10px]">{channel.logs[0] || 'Idle & listening'}</div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
                  <input
                    type="checkbox"
                    checked={channel.autoPostEnabled}
                    onChange={() => handleToggleAutoPost(channel.id)}
                    className="rounded border-slate-700 accent-indigo-600"
                  />
                  <span className="text-[11px]">Auto-Publish</span>
                </label>

                <span className="text-[10px] text-slate-500 font-mono">
                  {channel.authStrategy.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast History Ledger */}
      {history.length > 0 && (
        <div className="bg-[#111114] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Channel Broadcast Ledger</h3>
            <span className="text-[10px] text-slate-500 font-mono">{history.length} dispatches logged</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {history.slice(0, 10).map(evt => (
              <div
                key={evt.id}
                className="bg-[#16161A] p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <div className="font-bold text-white">{evt.payloadTitle}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Channel: {evt.channelName} • {new Date(evt.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="text-slate-400">👁️ {evt.analytics.views}</span>
                  <span className="text-slate-400">🔗 {evt.analytics.clicks}</span>
                  <span className="text-emerald-400 font-bold">🛒 {evt.analytics.conversions} sales</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provision Channel Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Autonomous Channel Provisioner</h3>
              <button onClick={() => setShowProvisionModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Platform Architecture</label>
              <select
                value={newPlatform}
                onChange={e => setNewPlatform(e.target.value as ChannelPlatform)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="telegram">Telegram Broadcast Channel & Bot</option>
                <option value="discord_webhook">Discord Community Webhook</option>
                <option value="dev_to">Dev.to Developer Publication</option>
                <option value="hashnode">Hashnode Engineering Blog Feed</option>
                <option value="github_discussions">GitHub Discussions & Announcements</option>
                <option value="substack_newsletter">Substack / Beehiiv Newsletter RSS</option>
                <option value="bluesky">Bluesky AT Protocol Federated Feed</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Channel Display Name (Optional)</label>
              <input
                type="text"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder="e.g. AI Automation & Production Blueprints"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#16161A] border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">Autonomous Setup Workflow:</div>
              <p>The AI will provision the endpoint, perform handshake authorization, generate initial category feeds, and register the channel into the master auto-broadcast pipeline.</p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowProvisionModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1A1A1E] text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleProvisionChannel}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCreating ? 'Provisioning Channel...' : 'Initialize Channel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
