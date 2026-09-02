import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Zap, 
  Globe, 
  Link, 
  Clock, 
  HelpCircle,
  Hash,
  Video,
  FileText,
  Workflow
} from 'lucide-react';
import { 
  socialIntegrationsService, 
  SocialIntegrationItem, 
  SocialNetworkPlatform 
} from '../../services/socialIntegrationsService';
import { store } from '../../services/store';
import { DigitalProduct } from '../../types';

export const SocialNetworksHub: React.FC = () => {
  const [integrations, setIntegrations] = useState<SocialIntegrationItem[]>(
    socialIntegrationsService.getIntegrations()
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'social' | 'community' | 'video' | 'blog' | 'automation'>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Testing & Action states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [globalBroadcasting, setGlobalBroadcasting] = useState<boolean>(false);
  const [globalBroadcastFeedback, setGlobalBroadcastFeedback] = useState<string | null>(null);

  const products: DigitalProduct[] = store.getProducts();
  const [selectedProductForTest, setSelectedProductForTest] = useState<string>(
    products[0]?.id || ''
  );

  useEffect(() => {
    return socialIntegrationsService.subscribe(() => {
      setIntegrations(socialIntegrationsService.getIntegrations());
    });
  }, []);

  const handleFieldChange = (id: string, field: keyof SocialIntegrationItem, value: any) => {
    socialIntegrationsService.updateIntegration(id, { [field]: value });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleShowSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      await socialIntegrationsService.testConnection(id);
    } finally {
      setTestingId(null);
    }
  };

  const handlePublishTestPost = async (id: string) => {
    setPublishingId(id);
    try {
      const prod = products.find(p => p.id === selectedProductForTest) || products[0];
      await socialIntegrationsService.publishTestPost(id, prod);
    } finally {
      setPublishingId(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const ok = await socialIntegrationsService.saveAll();
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerGlobalBroadcast = async () => {
    setGlobalBroadcasting(true);
    setGlobalBroadcastFeedback(null);
    try {
      const prod = products.find(p => p.id === selectedProductForTest) || products[0];
      const res = await socialIntegrationsService.triggerAllActiveBroadcast(prod);
      setGlobalBroadcastFeedback(
        `✅ Diffusion réussie sur ${res.dispatchedCount} canaux connectés avec liens trackés et code réduction !`
      );
      setTimeout(() => setGlobalBroadcastFeedback(null), 6000);
    } finally {
      setGlobalBroadcasting(false);
    }
  };

  const filteredIntegrations = integrations.filter(item => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const configuredCount = integrations.filter(i => i.status === 'configured' || i.status === 'connected').length;
  const autoActiveCount = integrations.filter(i => i.autoPublishEnabled).length;

  const getPlatformIcon = (platform: SocialNetworkPlatform) => {
    switch (platform) {
      case 'twitter':
        return <span className="font-bold text-base">𝕏</span>;
      case 'linkedin':
        return <Share2 className="w-5 h-5 text-[#0A66C2]" />;
      case 'discord':
        return <MessageSquare className="w-5 h-5 text-[#5865F2]" />;
      case 'telegram':
        return <Send className="w-5 h-5 text-[#229ED9]" />;
      case 'tiktok':
      case 'youtube':
        return <Video className="w-5 h-5 text-rose-400" />;
      case 'instagram':
        return <Share2 className="w-5 h-5 text-pink-400" />;
      case 'reddit':
        return <Hash className="w-5 h-5 text-orange-400" />;
      case 'devto':
        return <FileText className="w-5 h-5 text-emerald-400" />;
      case 'webhook':
        return <Workflow className="w-5 h-5 text-indigo-400" />;
      default:
        return <Globe className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Card */}
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">Hub de Connexion des Réseaux Sociaux & Canaux Autonomes</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100% Réel & 0 Perte de Données
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connectez tous les comptes <strong className="text-indigo-300">Digital Product Factory</strong> pour une diffusion automatique de vos produits, vidéos, carrousels et alertes de vente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement SQL...' : 'Enregistrer Toutes les Intégrations'}</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerGlobalBroadcast}
              disabled={globalBroadcasting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${globalBroadcasting ? 'animate-spin' : ''}`} />
              <span>{globalBroadcasting ? 'Diffusion IA en cours...' : 'Diffuser sur Canaux Actifs'}</span>
            </button>
          </div>
        </div>

        {/* Global KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#16161A] p-3.5 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold">Comptes Référencés</div>
            <div className="text-xl font-bold text-white mt-1">{integrations.length} Plateformes</div>
            <div className="text-[10px] text-slate-500 mt-0.5">X, LinkedIn, Discord, Telegram...</div>
          </div>

          <div className="bg-[#16161A] p-3.5 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold">Canaux Connectés & Validés</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{connectedCount} / {integrations.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ping en direct réussi</div>
          </div>

          <div className="bg-[#16161A] p-3.5 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold">Auto-Pilote IA 24/7</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">{autoActiveCount} Canaux Actifs</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Génération & Diffusion continue</div>
          </div>

          <div className="bg-[#16161A] p-3.5 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold">Produit Cible pour Test</div>
            <select
              value={selectedProductForTest}
              onChange={e => setSelectedProductForTest(e.target.value)}
              className="w-full mt-1 bg-[#111114] border border-slate-700 text-white rounded-lg p-1 text-[11px] font-medium focus:outline-none focus:border-indigo-500 truncate"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback alerts */}
        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Toutes les configurations de vos réseaux sociaux sont enregistrées et synchronisées en base de données SQL (0 perte).</span>
          </div>
        )}

        {globalBroadcastFeedback && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{globalBroadcastFeedback}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Filtrer par catégorie :</span>
          {[
            { id: 'all', label: `Tous (${integrations.length})` },
            { id: 'social', label: 'Réseaux Sociaux (X, LinkedIn, Insta, Pinterest)' },
            { id: 'community', label: 'Communautés (Discord, Telegram, Reddit)' },
            { id: 'video', label: 'Vidéo (TikTok, YouTube Shorts)' },
            { id: 'blog', label: 'Articles (Dev.to, Medium)' },
            { id: 'automation', label: 'Webhooks & Make/Zapier' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#16161A] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Network Cards Grid */}
      <div className="space-y-4">
        {filteredIntegrations.map(item => {
          const isExpanded = !!expandedCards[item.id];
          const isSecretVisible = !!showSecrets[item.id];
          const isTesting = testingId === item.id;
          const isPublishing = publishingId === item.id;

          const getStatusBadge = () => {
            if (item.status === 'connected') {
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connecté & Testé
                </span>
              );
            }
            if (item.status === 'configured') {
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Clés Prêtes (À Tester)
                </span>
              );
            }
            if (item.status === 'error') {
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Erreur de Connexion
                </span>
              );
            }
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                En Attente de Clés
              </span>
            );
          };

          return (
            <div 
              key={item.id}
              className="bg-[#111114] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
            >
              {/* Card Top Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 text-white font-bold"
                    style={{ 
                      backgroundColor: `${item.badgeColor}15`, 
                      borderColor: `${item.badgeColor}40` 
                    }}
                  >
                    {getPlatformIcon(item.platform)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">{item.name}</h3>
                      {getStatusBadge()}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Handle : <strong className="text-slate-200">{item.handle}</strong></span>
                      {item.profileUrl && (
                        <a 
                          href={item.profileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-0.5 text-[10px]"
                        >
                          <span>Voir profil</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons for this Card */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  {/* Auto-pilot toggle */}
                  <label className="flex items-center gap-2 cursor-pointer bg-[#16161A] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                    <input
                      type="checkbox"
                      checked={item.autoPublishEnabled}
                      onChange={e => handleFieldChange(item.id, 'autoPublishEnabled', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-[11px] font-semibold text-slate-300">Auto-Diffusion IA</span>
                  </label>

                  {/* Test connection button */}
                  <button
                    type="button"
                    onClick={() => handleTestConnection(item.id)}
                    disabled={isTesting}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Test en cours...' : 'Tester Connexion'}</span>
                  </button>

                  {/* Publish test post */}
                  <button
                    type="button"
                    onClick={() => handlePublishTestPost(item.id)}
                    disabled={isPublishing}
                    className="px-3 py-1.5 rounded-xl bg-[#16161A] hover:bg-[#202028] text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Envoie un post de test formaté avec lien tracké et coupon"
                  >
                    <Send className={`w-3.5 h-3.5 text-emerald-400 ${isPublishing ? 'animate-pulse' : ''}`} />
                    <span>{isPublishing ? 'Envoi...' : 'Post Test'}</span>
                  </button>

                  {/* Portal Direct link */}
                  <a
                    href={item.devPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-[#16161A] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                    title="Accéder à la console Développeur pour obtenir vos clés"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Card Main Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Account Name & Handle */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Nom du Compte / Page Publique
                  </label>
                  <input
                    type="text"
                    value={item.accountName}
                    onChange={e => handleFieldChange(item.id, 'accountName', e.target.value)}
                    placeholder="Ex: Digital Product Factory"
                    className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 2. Handle / Chat ID / Channel */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Identifiant / Handle / Chat ID
                  </label>
                  <input
                    type="text"
                    value={item.platform === 'telegram' ? (item.chatIdOrChannel || '') : item.handle}
                    onChange={e => {
                      if (item.platform === 'telegram') {
                        handleFieldChange(item.id, 'chatIdOrChannel', e.target.value);
                      } else {
                        handleFieldChange(item.id, 'handle', e.target.value);
                      }
                    }}
                    placeholder={
                      item.platform === 'telegram' 
                        ? 'Ex: @DigitalProductFactory ou -100123456789' 
                        : item.platform === 'discord'
                        ? 'Ex: #product-releases'
                        : 'Ex: @ProductFactoryHQ'
                    }
                    className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 3. Credentials Primary Input (Webhook URL or Bot Token or API Key) */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold">
                      {item.authStrategy === 'webhook' 
                        ? 'URL du Webhook de Diffusion (Discord / Make / Zapier)' 
                        : item.authStrategy === 'bot_token'
                        ? 'Bot Token Secret (Telegram BotFather)'
                        : 'Clé API / Token d’Accès (Access Token / API Key)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggleShowSecret(item.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {isSecretVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{isSecretVisible ? 'Masquer' : 'Afficher'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={isSecretVisible ? 'text' : 'password'}
                      value={
                        item.authStrategy === 'webhook'
                          ? (item.webhookUrl || '')
                          : item.authStrategy === 'bot_token'
                          ? (item.botToken || item.apiKey || '')
                          : (item.apiKey || item.accessToken || item.webhookUrl || '')
                      }
                      onChange={e => {
                        const val = e.target.value.trim();
                        if (item.authStrategy === 'webhook') {
                          handleFieldChange(item.id, 'webhookUrl', val);
                        } else if (item.authStrategy === 'bot_token') {
                          handleFieldChange(item.id, 'botToken', val);
                        } else {
                          handleFieldChange(item.id, 'apiKey', val);
                          handleFieldChange(item.id, 'accessToken', val);
                        }
                      }}
                      placeholder={
                        item.platform === 'discord'
                          ? 'https://discord.com/api/webhooks/...'
                          : item.platform === 'telegram'
                          ? '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ (Token @BotFather)'
                          : item.platform === 'webhook'
                          ? 'https://hook.eu1.make.com/...'
                          : 'Collez votre Token / Clé API secrète...'
                      }
                      className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const val = item.webhookUrl || item.botToken || item.apiKey || item.accessToken || '';
                          handleCopy(val, item.id);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                        title="Copier la valeur"
                      >
                        {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === item.id ? 'Copié' : 'Copier'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional API Secret if X / Twitter / LinkedIn / Reddit */}
                {(item.platform === 'twitter' || item.platform === 'linkedin' || item.platform === 'reddit') && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-slate-300 font-semibold">
                      API Secret / Client Secret (Optionnel si Bearer Token fourni)
                    </label>
                    <input
                      type={isSecretVisible ? 'text' : 'password'}
                      value={item.apiSecret || ''}
                      onChange={e => handleFieldChange(item.id, 'apiSecret', e.target.value.trim())}
                      placeholder="API Secret Key..."
                      className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Status Message or Last Test Output */}
              {item.lastTestMessage && (
                <div 
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                    item.status === 'connected'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {item.status === 'connected' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{item.lastTestMessage}</span>
                  {item.lastTestedAt && (
                    <span className="text-[10px] text-slate-400 ml-auto font-mono">
                      {new Date(item.lastTestedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              {/* Collapsible Advanced Settings & Developer Guide */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleToggleExpand(item.id)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Paramètres d'Automatisation IA & Guide de Configuration Développeur</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 space-y-4 text-xs">
                    {/* Advanced Automation Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-slate-400 font-semibold text-[11px]">Format de Contenu Préféré</label>
                        <select
                          value={item.preferredFormat}
                          onChange={e => handleFieldChange(item.id, 'preferredFormat', e.target.value)}
                          className="w-full bg-[#16161A] border border-slate-800 text-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="text_thread">Thread Texte & Accroche (X)</option>
                          <option value="carousel_slides">Carrousel Slides (LinkedIn/Insta)</option>
                          <option value="vertical_video">Script Vidéo 9:16 (TikTok/Shorts)</option>
                          <option value="rich_embed">Rich Embed JSON (Discord/Telegram)</option>
                          <option value="markdown_article">Article Markdown Complet (Dev.to/Reddit)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-400 font-semibold text-[11px]">Fréquence de Diffusion IA</label>
                        <select
                          value={item.frequencyHours}
                          onChange={e => handleFieldChange(item.id, 'frequencyHours', Number(e.target.value))}
                          className="w-full bg-[#16161A] border border-slate-800 text-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value={1}>Toutes les 1 heure</option>
                          <option value={2}>Toutes les 2 heures</option>
                          <option value={4}>Toutes les 4 heures</option>
                          <option value={8}>Toutes les 8 heures</option>
                          <option value={24}>1 fois par jour (24h)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-400 font-semibold text-[11px]">Code Promo & Remise</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.discountCode || ''}
                            onChange={e => handleFieldChange(item.id, 'discountCode', e.target.value.toUpperCase())}
                            placeholder="Code Promo (ex: TWITTER20)"
                            className="w-2/3 bg-[#16161A] border border-slate-800 text-white rounded-xl px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <div className="w-1/3 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1.5 rounded-xl border border-emerald-500/20 text-center">
                            -{item.discountPercent || 20}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Developer Guide */}
                    <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-300 text-xs">
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Guide d'obtention des clés pour {item.name}</span>
                        </span>
                        <a
                          href={item.devPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <span>Ouvrir la Console Développeur</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <ul className="space-y-1 text-[11px] text-slate-400 pl-1 list-none">
                        {item.setupGuide.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-bold">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recent activity logs */}
                    {item.logs && item.logs.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          Dernières Activités du Canal :
                        </div>
                        <div className="bg-[#0D0D10] p-2.5 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-400 space-y-1 max-h-24 overflow-y-auto">
                          {item.logs.slice(0, 4).map((log, i) => (
                            <div key={i} className="truncate">{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
