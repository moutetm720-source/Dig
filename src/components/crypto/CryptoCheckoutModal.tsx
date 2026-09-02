import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  Sparkles, 
  AlertCircle, 
  Zap, 
  ExternalLink,
  Lock,
  RefreshCw
} from 'lucide-react';
import { cryptoPaymentService } from '../../services/cryptoPaymentService';
import { CryptoAsset, CryptoCurrencyConfig, CryptoPaymentSession } from '../../types';

interface CryptoCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountEur: number;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  onPaymentSuccess: (session: CryptoPaymentSession) => void;
}

export const CryptoCheckoutModal: React.FC<CryptoCheckoutModalProps> = ({
  isOpen,
  onClose,
  amountEur,
  customerName,
  customerEmail,
  customerAddress,
  onPaymentSuccess
}) => {
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('BTC');
  const [useStripeCrypto, setUseStripeCrypto] = useState<boolean>(false);
  const [session, setSession] = useState<CryptoPaymentSession | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);

  const assets = cryptoPaymentService.getSupportedAssets();
  const currentAssetConfig = cryptoPaymentService.getAssetConfig(selectedAsset);

  // Initialize or re-create session when asset changes
  useEffect(() => {
    if (!isOpen) return;

    const newSession = cryptoPaymentService.createPaymentSession({
      orderId: `ord-cryp-${Date.now().toString().slice(-6)}`,
      asset: selectedAsset,
      amountEur,
      useStripeCrypto
    });
    setSession(newSession);
    setTimeLeft(15 * 60);

    const unsub = cryptoPaymentService.subscribe(() => {
      const updated = cryptoPaymentService.getSession(newSession.id);
      if (updated) {
        setSession({ ...updated });
        if (updated.status === 'confirmed') {
          setTimeout(() => {
            onPaymentSuccess(updated);
          }, 1200);
        }
      }
    });

    return () => unsub();
  }, [isOpen, selectedAsset, amountEur, useStripeCrypto]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timeLeft]);

  if (!isOpen || !session) return null;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, type: 'address' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
              ₿
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Passerelle Crypto Autonome & Stripe</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Détection Automatique
                </span>
              </h2>
              <p className="text-xs text-slate-400">Paiement direct sécurisé on-chain sans intermédiaire ou via Stripe Crypto.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Crypto Asset Selection Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Sélectionnez votre Crypto-Monnaie (Top 4 Mondial + USDC) :</span>
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Expire dans {formatTimer(timeLeft)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {assets.map(asset => {
              const isSelected = selectedAsset === asset.symbol;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg font-bold" style={{ color: asset.color }}>{asset.logo}</span>
                  <span className="font-bold">{asset.symbol}</span>
                  <span className="text-[10px] text-slate-500">€{asset.rateEur.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Stripe Crypto Toggle */}
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Stripe Pay with Crypto</span>
              <span className="text-[11px] text-slate-400 block">Règlement instantané via Stripe Crypto (USDC / Polygon / Solana)</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useStripeCrypto}
              onChange={e => setUseStripeCrypto(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* 3. Dynamic QR Code & Payment Instructions */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
          {/* Simulated High-Res Dynamic QR */}
          <div className="p-3 bg-white rounded-2xl shrink-0 shadow-lg flex flex-col items-center justify-center">
            <div className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-400/50 rounded-xl p-1 bg-white">
              <QrCode className="w-24 h-24 text-slate-900" />
              <span className="text-[8px] font-mono text-slate-800 font-bold uppercase">{selectedAsset} PAY</span>
            </div>
          </div>

          {/* Copyable Payment Credentials */}
          <div className="flex-1 space-y-3.5 w-full text-xs">
            {/* Amount to send */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center justify-between">
                <span>Montant exact à envoyer :</span>
                <span className="text-slate-500 font-mono text-[11px]">≈ €{amountEur.toFixed(2)} EUR</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono font-bold text-sm">
                  {session.amountCrypto} {session.asset}
                </div>
                <button
                  onClick={() => copyToClipboard(String(session.amountCrypto), 'amount')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAmount ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Receiving Address */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center justify-between">
                <span>Adresse de dépôt ({currentAssetConfig.network}) :</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] truncate">
                  {session.receivingAddress}
                </div>
                <button
                  onClick={() => copyToClipboard(session.receivingAddress, 'address')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAddress ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Autonomous Blockchain Watchers State Banners */}
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border text-xs transition-all ${
            session.status !== 'waiting_payment'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
          }`}>
            <div className="flex items-center gap-3">
              {session.status !== 'waiting_payment' ? (
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <div>
                <div className="font-bold text-white text-xs">
                  {session.status !== 'waiting_payment'
                    ? 'Agent 1 (Scout) : Transaction détectée (Mempool)'
                    : 'Agent 1 (Scout) : En écoute du Mempool...'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Tâche : Scanner le réseau de nœuds pour détecter la transaction initiale.
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border text-xs transition-all ${
            session.status === 'confirmed'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
          }`}>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                {session.status === 'confirmed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-white text-xs">
                    {session.status === 'confirmed'
                      ? 'Agent 2 (Validateur) : Paiement 100% Confirmé !'
                      : 'Agent 2 (Validateur) : En attente du Scout...'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Tâche : Vérifier la cryptographie du bloc et autoriser la livraison.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chiffrement TLS 1.3 • Facturation automatique conforme émise dès validation</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Annuler et revenir aux cartes bancaires
          </button>
        </div>
      </div>
    </div>
  );
};
