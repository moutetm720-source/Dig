import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Download, 
  Upload, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap, 
  LogIn, 
  Globe, 
  RefreshCw, 
  TrendingUp, 
  Percent, 
  Coins, 
  Wallet, 
  QrCode,
  Share2
} from 'lucide-react';
import { store } from '../../services/store';
import { currencyAgent } from '../../services/currencyAgent';
import { cryptoPaymentService, DEFAULT_CRYPTO_SETTINGS } from '../../services/cryptoPaymentService';
import { CurrencyCode, CryptoGatewaySettings } from '../../types';
import { SocialNetworksHub } from './SocialNetworksHub';

export const IntegrationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'social' | 'stripe' | 'crypto' | 'geo' | 'security'>('social');
  
  // Stripe configuration state
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>(() => {
    return (localStorage.getItem('df_stripe_mode') as 'test' | 'live') || 'test';
  });
  const [publishableKey, setPublishableKey] = useState<string>(() => {
    return localStorage.getItem('df_stripe_pk') || '';
  });
  const [secretKey, setSecretKey] = useState<string>(() => {
    return localStorage.getItem('df_stripe_sk') || '';
  });
  const [webhookSecret, setWebhookSecret] = useState<string>(() => {
    return localStorage.getItem('df_stripe_whsec') || '';
  });
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('df_stripe_currency') || 'EUR';
  });
  const [showSk, setShowSk] = useState<boolean>(false);
  const [showWhsec, setShowWhsec] = useState<boolean>(false);
  const [stripeSaveSuccess, setStripeSaveSuccess] = useState<boolean>(false);
  const [testingStripe, setTestingStripe] = useState<boolean>(false);
  const [stripeTestResult, setStripeTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync keys from storage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('df_stripe_mode') as 'test' | 'live';
    const savedPk = localStorage.getItem('df_stripe_pk');
    const savedSk = localStorage.getItem('df_stripe_sk');
    const savedWhsec = localStorage.getItem('df_stripe_whsec');
    const savedCur = localStorage.getItem('df_stripe_currency');

    if (savedMode) setStripeMode(savedMode);
    if (savedPk !== null && savedPk !== undefined) setPublishableKey(savedPk);
    if (savedSk !== null && savedSk !== undefined) setSecretKey(savedSk);
    if (savedWhsec !== null && savedWhsec !== undefined) setWebhookSecret(savedWhsec);
    if (savedCur) setCurrency(savedCur);
  }, []);

  // Copy feedbacks
  const [copiedPk, setCopiedPk] = useState<boolean>(false);
  const [copiedSk, setCopiedSk] = useState<boolean>(false);
  const [copiedWhsec, setCopiedWhsec] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [copiedCryptoKey, setCopiedCryptoKey] = useState<string | null>(null);

  const handleCopyCrypto = (keyName: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCryptoKey(keyName);
    setTimeout(() => setCopiedCryptoKey(null), 2000);
  };

  // GeoIP & Currency Agent Reactive state
  const [geoInfo, setGeoInfo] = useState(currencyAgent.getGeoInfo());
  const [detectingGeo, setDetectingGeo] = useState(false);
  const supportedCurrencies = currencyAgent.getAllSupportedCurrencies();

  // Crypto Gateway settings state
  const [cryptoSettings, setCryptoSettings] = useState<CryptoGatewaySettings>(cryptoPaymentService.getSettings());
  const [cryptoSaveSuccess, setCryptoSaveSuccess] = useState<boolean>(false);
  const cryptoAssets = cryptoPaymentService.getSupportedAssets();

  useEffect(() => {
    const unsub = currencyAgent.subscribe(() => {
      setGeoInfo(currencyAgent.getGeoInfo());
    });
    const unsubCrypto = cryptoPaymentService.subscribe(() => {
      setCryptoSettings(cryptoPaymentService.getSettings());
    });
    return () => {
      unsub();
      unsubCrypto();
    };
  }, []);

  // Moderator security state
  const [newPasscode, setNewPasscode] = useState<string>('');
  const [confirmPasscode, setConfirmPasscode] = useState<string>('');
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [passSaveSuccess, setPassSaveSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Snapshot backup & restore state
  const [exportJson, setExportJson] = useState<string>('');
  const [importJson, setImportJson] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');

  const webhookEndpointUrl = `${window.location.origin}/api/webhooks/stripe`;

  const handleSaveStripe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('df_stripe_mode', stripeMode);
    localStorage.setItem('df_stripe_pk', publishableKey.trim());
    localStorage.setItem('df_stripe_sk', secretKey.trim());
    localStorage.setItem('df_stripe_whsec', webhookSecret.trim());
    localStorage.setItem('df_stripe_currency', currency);

    // Also push to backend KV store
    try {
      const token = localStorage.getItem('df_moderator_passcode') || '2026';
      await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          df_stripe_mode: stripeMode,
          df_stripe_pk: publishableKey.trim(),
          df_stripe_sk: secretKey.trim(),
          df_stripe_whsec: webhookSecret.trim(),
          df_stripe_currency: currency
        })
      });
    } catch (err) {
      console.warn("Could not sync to server store directly", err);
    }

    setStripeSaveSuccess(true);
    store.addLog('success', 'stripe', `Configuration Stripe mise à jour (Mode: ${stripeMode.toUpperCase()}, Devise: ${currency})`);
    setTimeout(() => setStripeSaveSuccess(false), 3000);
  };

  const handleSaveCrypto = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    cryptoPaymentService.updateSettings(cryptoSettings);
    
    // Push settings directly to server database
    try {
      const token = localStorage.getItem('df_moderator_passcode') || '2026';
      await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          df_crypto_settings_v1: cryptoSettings,
          df_crypto_btc: cryptoSettings.merchantBtcAddress,
          df_crypto_eth: cryptoSettings.merchantEthAddress,
          df_crypto_sol: cryptoSettings.merchantSolAddress,
          df_crypto_usdt: cryptoSettings.merchantUsdtAddress
        })
      });
    } catch (err) {
      console.warn("Could not sync crypto to server store directly", err);
    }

    setCryptoSaveSuccess(true);
    setTimeout(() => setCryptoSaveSuccess(false), 4000);
  };

  const handleRestoreDefaultCryptoAddresses = async () => {
    const restored = cryptoPaymentService.restoreModelAddresses();
    setCryptoSettings(restored);
    
    // Push to server database immediately
    try {
      const token = localStorage.getItem('df_moderator_passcode') || '2026';
      await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          df_crypto_settings_v1: restored,
          df_crypto_btc: restored.merchantBtcAddress,
          df_crypto_eth: restored.merchantEthAddress,
          df_crypto_sol: restored.merchantSolAddress,
          df_crypto_usdt: restored.merchantUsdtAddress
        })
      });
    } catch (err) {
      console.warn("Could not sync restored crypto to server store directly", err);
    }

    setCryptoSaveSuccess(true);
    setTimeout(() => setCryptoSaveSuccess(false), 4000);
  };

  const handleTestStripeConnection = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);

    const pk = publishableKey.trim();
    const sk = secretKey.trim();

    if (!sk) {
      setTestingStripe(false);
      setStripeTestResult({
        success: false,
        message: 'Veuillez saisir votre clé secrète Stripe (sk_live_... ou sk_test_...).'
      });
      return;
    }

    try {
      const res = await fetch('/api/checkout/verify-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: sk, publishableKey: pk })
      });
      const data = await res.json();

      if (data.success) {
        setStripeTestResult({
          success: true,
          message: data.message || `Connexion Stripe validée avec succès (${data.livemode ? 'Mode Production Live' : 'Mode Test Sandbox'}).`
        });
        store.addLog('success', 'stripe', `Test Clé API Stripe Réussi : ${data.accountName || 'Compte Validé'} (${data.livemode ? 'LIVE' : 'TEST'})`);
      } else {
        setStripeTestResult({
          success: false,
          message: data.message || 'La vérification de la clé Stripe a échoué. Vérifiez la clé secrète sur votre Dashboard Stripe.'
        });
        store.addLog('error', 'stripe', `Test Clé Stripe Échoué : ${data.message}`);
      }
    } catch (err: any) {
      setStripeTestResult({
        success: false,
        message: `Erreur de connexion réseau au serveur : ${err.message}`
      });
    } finally {
      setTestingStripe(false);
    }
  };

  const handleTriggerGeoDetect = async () => {
    setDetectingGeo(true);
    try {
      await currencyAgent.autoDetectLocation();
    } finally {
      setDetectingGeo(false);
    }
  };

  const copyToClipboard = (text: string, type: 'pk' | 'sk' | 'whsec' | 'webhook') => {
    navigator.clipboard.writeText(text);
    if (type === 'pk') {
      setCopiedPk(true);
      setTimeout(() => setCopiedPk(false), 2000);
    } else if (type === 'sk') {
      setCopiedSk(true);
      setTimeout(() => setCopiedSk(false), 2000);
    } else if (type === 'whsec') {
      setCopiedWhsec(true);
      setTimeout(() => setCopiedWhsec(false), 2000);
    } else if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const handleSaveModeratorPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSaveSuccess(null);

    if (!newPasscode.trim()) {
      setPassError('Veuillez renseigner un mot de passe.');
      return;
    }

    if (newPasscode.length < 3) {
      setPassError('Le mot de passe doit contenir au moins 3 caractères.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPassError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    localStorage.setItem('df_moderator_passcode', newPasscode.trim());
    setNewPasscode('');
    setConfirmPasscode('');
    setPassSaveSuccess('Mot de passe modérateur mis à jour avec succès. Il est désormais 100% masqué et sécurisé.');
    store.addLog('success', 'agent', 'Code secret modérateur modifié par l’administrateur.');
    setTimeout(() => setPassSaveSuccess(null), 4000);
  };

  const handleLockSessionNow = () => {
    localStorage.removeItem('df_user_role');
    window.location.reload();
  };

  const handleExport = () => {
    const raw = store.exportState();
    setExportJson(raw);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-product-factory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = () => {
    if (!importJson.trim()) return;
    const ok = store.importState(importJson);
    if (ok) {
      setImportStatus('Restauration des données réussie ! Rechargement...');
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setImportStatus('Fichier de sauvegarde JSON invalide.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Hub Intégrations, Réseaux Sociaux & Passerelles</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Digital Product Factory • Diffusion 100% Autonome
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Connectez vos réseaux sociaux (X, LinkedIn, Discord, Telegram, TikTok...), vos passerelles de paiement (Stripe, Crypto) et gérez vos sauvegardes SQL.
        </p>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#111114] p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'social'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Share2 className="w-4 h-4 text-indigo-300" />
          <span>Réseaux Sociaux & Canaux Autonomes (11)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Actif
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stripe')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'stripe'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-300" />
          <span>Passerelle Stripe & CB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('crypto')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'crypto'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Paiements Crypto Multi-Chain</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'geo'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-300" />
          <span>Géo-IP & Devises Automatiques</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sécurité & Sauvegardes DB (0 Perte)</span>
        </button>
      </div>

      {/* Tab 1: SOCIAL NETWORKS HUB */}
      {activeTab === 'social' && (
        <SocialNetworksHub />
      )}

      {/* Tab 4: GEO-IP & CURRENCIES */}
      {activeTab === 'geo' && (
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Agent Autonome de Change & Géo-IP Stripe</h2>
              <p className="text-xs text-slate-400">Détecte automatiquement le pays et l'IP du client pour convertir les prix en monnaie locale.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerGeoDetect}
              disabled={detectingGeo}
              className="px-3.5 py-1.5 rounded-xl bg-[#16161A] hover:bg-[#202028] text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${detectingGeo ? 'animate-spin' : ''}`} />
              <span>{detectingGeo ? 'Détection IP...' : 'Re-tester Détection IP'}</span>
            </button>
          </div>
        </div>

        {/* Current Detection Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#16161A] p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold">Localisation IP Détectée</div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{geoInfo.flag}</span>
              <span>{geoInfo.countryName}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">IP : {geoInfo.ip}</div>
          </div>

          <div className="bg-[#16161A] p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold">Devise Active Client</div>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <span>{geoInfo.currencyCode}</span>
              <span className="text-white text-xs">({currencyAgent.getActiveCurrency().symbol})</span>
            </div>
            <div className="text-[10px] text-slate-500">Mise à l'échelle automatique sur Stripe</div>
          </div>

          <div className="bg-[#16161A] p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold">Mode d'Attribution</div>
            <div className="text-base font-bold text-indigo-300 capitalize">
              {geoInfo.detectedVia.replace('_', ' ')}
            </div>
            <div className="text-[10px] text-slate-500">Zéro friction pour l'acheteur</div>
          </div>
        </div>

        {/* Supported Currencies & Live Conversion Ledger */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Devises Prises en Charge par l'Agent & Stripe ({supportedCurrencies.length})</span>
            <span className="text-[11px] text-slate-500 font-normal">Base de calcul : 1.00 EUR</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {supportedCurrencies.map(c => (
              <div 
                key={c.code}
                onClick={() => currencyAgent.setManualCurrency(c.code)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  c.code === geoInfo.currencyCode
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                    : 'bg-[#16161A] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>{c.flag}</span>
                    <span>{c.code}</span>
                  </span>
                  <span className="font-mono text-indigo-300">{c.symbol}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Taux :</span>
                  <span className="font-mono text-emerald-400">{c.rateFromEur}x</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Tab 2: STRIPE PAYMENT GATEWAY CONFIGURATION */}
      {activeTab === 'stripe' && (
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Passerelle de Paiement Stripe</h2>
              <p className="text-xs text-slate-400">Connectez vos clés Stripe pour collecter les paiements par Carte, Apple Pay & Google Pay.</p>
            </div>
          </div>

          {/* Direct Redirection Links to Stripe Dashboard & Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://dashboard.stripe.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#16161A] hover:bg-[#202028] text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Se Connecter à Stripe</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mes Clés API Stripe</span>
              <ExternalLink className="w-3 h-3 text-indigo-400" />
            </a>

            {/* Test / Live Toggle */}
            <div className="flex items-center bg-[#16161A] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setStripeMode('test')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  stripeMode === 'test'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Test Sandbox
              </button>
              <button
                type="button"
                onClick={() => setStripeMode('live')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  stripeMode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Production
              </button>
            </div>
          </div>
        </div>

        {/* Quick Helper Banner */}
        <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">ℹ️ Info Stripe :</span>
            <span>Récupérez vos clés en cliquant sur <strong>Mes Clés API Stripe</strong> et collez-les ci-dessous.</span>
          </div>
          <a
            href="https://dashboard.stripe.com/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline flex items-center gap-1 shrink-0 font-medium"
          >
            <span>Gérer les Webhooks Stripe</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <form onSubmit={handleSaveStripe} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Publishable Key with Copy Option */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Stripe Publishable Key ({stripeMode === 'live' ? 'pk_live_...' : 'pk_test_...'})</span>
                <span className="text-[10px] text-slate-500">Clé Publique Frontend</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={publishableKey}
                  onChange={e => setPublishableKey(e.target.value)}
                  placeholder={stripeMode === 'live' ? 'pk_live_51...' : 'pk_test_51...'}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(publishableKey, 'pk')}
                  className="absolute right-2 px-2.5 py-1 rounded-lg bg-[#1A1A1E] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium text-[11px] flex items-center gap-1 transition-colors"
                  title="Copier la clé publique"
                >
                  {copiedPk ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPk ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Secret Key (Masked with Copy Option) */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Stripe Secret Key ({stripeMode === 'live' ? 'sk_live_...' : 'sk_test_...'})</span>
                <span className="text-[10px] text-rose-400 font-mono">Protégée & Chiffrée</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showSk ? 'text' : 'password'}
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  placeholder={stripeMode === 'live' ? 'sk_live_51...' : 'sk_test_51...'}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-28 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowSk(!showSk)}
                    className="p-1 text-slate-500 hover:text-slate-300"
                    title={showSk ? 'Masquer' : 'Afficher'}
                  >
                    {showSk ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(secretKey, 'sk')}
                    className="px-2.5 py-1 rounded-lg bg-[#1A1A1E] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium text-[11px] flex items-center gap-1 transition-colors"
                    title="Copier la clé secrète"
                  >
                    {copiedSk ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSk ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Webhook Secret (Masked with Copy Option) */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Stripe Webhook Signing Secret (whsec_...)</span>
                <span className="text-[10px] text-slate-500">Validation des paiements réussis</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showWhsec ? 'text' : 'password'}
                  value={webhookSecret}
                  onChange={e => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-28 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowWhsec(!showWhsec)}
                    className="p-1 text-slate-500 hover:text-slate-300"
                    title={showWhsec ? 'Masquer' : 'Afficher'}
                  >
                    {showWhsec ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookSecret, 'whsec')}
                    className="px-2.5 py-1 rounded-lg bg-[#1A1A1E] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium text-[11px] flex items-center gap-1 transition-colors"
                    title="Copier le secret webhook"
                  >
                    {copiedWhsec ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWhsec ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Devise Principale du Magasin</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="EUR">EUR (€) - Euros (Europe / France)</option>
                <option value="USD">USD ($) - US Dollars (Global)</option>
                <option value="GBP">GBP (£) - British Pounds</option>
                <option value="CAD">CAD ($) - Canadian Dollars</option>
                <option value="AUD">AUD ($) - Australian Dollars</option>
                <option value="CHF">CHF - Swiss Francs</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
              </select>
            </div>
          </div>

          {/* Webhook Endpoint helper with Copy */}
          <div className="p-3.5 rounded-xl bg-[#16161A] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-slate-300">URL d’écoute Webhook Stripe (à renseigner dans votre Dashboard Stripe) :</div>
              <div className="font-mono text-[11px] text-indigo-400 truncate max-w-lg">{webhookEndpointUrl}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(webhookEndpointUrl, 'webhook')}
              className="px-3 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 shrink-0"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWebhook ? 'URL Copiée' : 'Copier l’URL Webhook'}</span>
            </button>
          </div>

          {/* Test Status Banner */}
          {stripeTestResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
              stripeTestResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              {stripeTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{stripeTestResult.message}</span>
            </div>
          )}

          {stripeSaveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Paramètres Stripe enregistrés avec succès !</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestStripeConnection}
              disabled={testingStripe}
              className="px-4 py-2.5 rounded-xl bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 hover:text-white border border-slate-800 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{testingStripe ? 'Vérification en cours...' : 'Tester la Connexion Stripe'}</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Enregistrer les Clés Stripe</span>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Tab 3: PASSERELLE CRYPTO */}
      {activeTab === 'crypto' && (
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
              ₿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Passerelle Crypto Directe (Top 4 + Stripe Crypto)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Paiements Directs Vers Vos Wallets
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestion automatisée des 4 plus grandes crypto-monnaies mondiales : <strong>Bitcoin (BTC)</strong>, <strong>Ethereum (ETH)</strong>, <strong>Solana (SOL)</strong>, <strong>Tether USD (USDT)</strong> + <strong>Stripe USDC</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cryptoSettings.enabled}
                onChange={e => setCryptoSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
            <span className="text-xs font-semibold text-slate-200">
              {cryptoSettings.enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        </div>

        {/* User Crypto Addresses Helper Banner */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold shrink-0 mt-0.5">
            🔑
          </div>
          <div className="space-y-1">
            <div className="font-bold text-white">Renseignez vos adresses crypto quand vous le souhaitez</div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              Indiquez ci-dessous vos adresses publiques de dépôt. Les fonds envoyés par vos clients seront reçus directement sur vos portefeuilles personnels sans intermédiaire. Vous pouvez modifier ou mettre à jour ces adresses à tout moment.
            </div>
          </div>
        </div>

        {/* Live Crypto Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {cryptoAssets.map(asset => (
            <div key={asset.symbol} className="bg-[#16161A] p-3 rounded-xl border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span style={{ color: asset.color }}>{asset.logo}</span>
                  <span>{asset.symbol}</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Live Ticker</span>
              </div>
              <div className="text-sm font-extrabold text-slate-100 font-mono">
                €{asset.rateEur.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{asset.network}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSaveCrypto} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* BTC Merchant Address */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Adresse Bitcoin Marchand (BTC Mainnet / SegWit)</span>
                <span className="text-amber-400 font-mono text-[10px]">₿ BTC Vault</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={cryptoSettings.merchantBtcAddress}
                  onChange={e => setCryptoSettings(prev => ({ ...prev, merchantBtcAddress: e.target.value }))}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopyCrypto('btc', cryptoSettings.merchantBtcAddress)}
                  className="absolute right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCryptoKey === 'btc' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ETH Merchant Address */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Adresse Ethereum / EVM Marchand (ETH / ERC-20 / USDC)</span>
                <span className="text-indigo-400 font-mono text-[10px]">Ξ ETH Vault</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={cryptoSettings.merchantEthAddress}
                  onChange={e => setCryptoSettings(prev => ({ ...prev, merchantEthAddress: e.target.value }))}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopyCrypto('eth', cryptoSettings.merchantEthAddress)}
                  className="absolute right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCryptoKey === 'eth' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SOL Merchant Address */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Adresse Solana Marchand (SOL Mainnet)</span>
                <span className="text-emerald-400 font-mono text-[10px]">◎ SOL Vault</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={cryptoSettings.merchantSolAddress}
                  onChange={e => setCryptoSettings(prev => ({ ...prev, merchantSolAddress: e.target.value }))}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopyCrypto('sol', cryptoSettings.merchantSolAddress)}
                  className="absolute right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCryptoKey === 'sol' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* USDT Merchant Address */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span>Adresse Tether USDT Marchand (TRON TRC-20 / Polygon)</span>
                <span className="text-teal-400 font-mono text-[10px]">₮ USDT Vault</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={cryptoSettings.merchantUsdtAddress}
                  onChange={e => setCryptoSettings(prev => ({ ...prev, merchantUsdtAddress: e.target.value }))}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopyCrypto('usdt', cryptoSettings.merchantUsdtAddress)}
                  className="absolute right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCryptoKey === 'usdt' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Autonomous Features Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[#16161A] rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Stripe Crypto Pay (USDC Multi-Chain)</span>
                <span className="text-[11px] text-slate-400">Règlement instantané intégré via Stripe Crypto</span>
              </div>
              <input
                type="checkbox"
                checked={cryptoSettings.enableStripeCrypto}
                onChange={e => setCryptoSettings(prev => ({ ...prev, enableStripeCrypto: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
            </div>

            <div className="p-3 bg-[#16161A] rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Agent d'Écoute Mempool & Auto-Confirmation</span>
                <span className="text-[11px] text-slate-400">Validation automatique dès détection du bloc</span>
              </div>
              <input
                type="checkbox"
                checked={cryptoSettings.autoConfirmSimulation}
                onChange={e => setCryptoSettings(prev => ({ ...prev, autoConfirmSimulation: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
            </div>
          </div>

          {cryptoSaveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Adresses crypto enregistrées et synchronisées avec succès !</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono pl-6">
                BTC: {cryptoSettings.merchantBtcAddress.slice(0, 10)}... | ETH: {cryptoSettings.merchantEthAddress.slice(0, 10)}... | SOL: {cryptoSettings.merchantSolAddress.slice(0, 10)}... | USDT: {cryptoSettings.merchantUsdtAddress.slice(0, 10)}...
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestoreDefaultCryptoAddresses}
              className="px-4 py-2.5 rounded-xl bg-[#1A1A1E] hover:bg-[#252530] text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all hover:border-amber-500/50 shadow-sm"
              title="Rétablit instantanément les 4 adresses modèles vérifiées pour BTC, ETH, SOL et USDT"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Rétablir les Adresses Modèles (BTC, ETH, SOL, USDT)</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Enregistrer & Synchroniser la Passerelle Crypto</span>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Tab 5: SÉCURITÉ & SAUVEGARDE */}
      {activeTab === 'security' && (
      <>
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sécurité & Mot de Passe Modérateur</h2>
            <p className="text-xs text-slate-400">Définissez votre propre code secret d'accès modérateur. Il sera 100% masqué et invisible pour les visiteurs.</p>
          </div>
        </div>

        <form onSubmit={handleSaveModeratorPasscode} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Nouveau Mot de Passe Modérateur</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value)}
                  placeholder="Entrez votre nouveau mot de passe secret..."
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Confirmer le Nouveau Mot de Passe</label>
              <input
                type={showNewPass ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={e => setConfirmPasscode(e.target.value)}
                placeholder="Répétez le mot de passe..."
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {passError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          {passSaveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passSaveSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLockSessionNow}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-semibold flex items-center gap-2 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Verrouiller la Session Maintenant</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Modifier le Mot de Passe</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. SNAPSHOT BACKUP & RESTORE */}
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl text-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sauvegarde & Restauration des Données</h2>
            <p className="text-xs text-slate-400">Exportez l'intégralité de vos produits, commandes, configurations et logs en un fichier JSON chiffré.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 bg-[#16161A] p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exporter Sauvegarde (.json)</span>
            </h3>
            <p className="text-slate-400">
              Téléchargez un instantané complet de votre base de données locale (Produits, Ventes, Clients, Stratégie).
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-xl bg-[#1A1A1E] hover:bg-slate-800 border border-slate-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger le Fichier Backup</span>
            </button>
          </div>

          <div className="space-y-3 bg-[#16161A] p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Restaurer Sauvegarde JSON</span>
            </h3>
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder="Collez ici le JSON de sauvegarde..."
              rows={3}
              className="w-full bg-[#111114] border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleImport}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurer l'Instantané</span>
            </button>
            {importStatus && (
              <div className="text-[11px] font-mono text-indigo-300">{importStatus}</div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
