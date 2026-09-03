import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';
import { cryptoPaymentService, OnChainVerification } from '../../services/cryptoPaymentService';
import { CryptoAsset } from '../../types';

interface CryptoCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ productId: string; productTitle: string; price: number; quantity: number }>;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  onPaymentSuccess: (serverOrder: any) => void;
}

interface ServerCryptoSession {
  serverOrderId: string;
  totalCents: number;
  merchantAddress: string;
  rateEur: number;
}

// Seules les chaînes vérifiables automatiquement CÔTÉ SERVEUR (BTC/ETH)
// + SOL/USDT (revue manuelle par un modérateur).
const SUPPORTED: CryptoAsset[] = ['BTC', 'ETH', 'SOL', 'USDT'];

export const CryptoCheckoutModal: React.FC<CryptoCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  customerName,
  customerEmail,
  onPaymentSuccess
}) => {
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('BTC');
  const [serverSession, setServerSession] = useState<ServerCryptoSession | null>(null);
  const [amountCrypto, setAmountCrypto] = useState<number>(0);
  const [expectedBase, setExpectedBase] = useState<string>('0');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [txHashInput, setTxHashInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<OnChainVerification | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCount = useRef(0);

  const assets = cryptoPaymentService.getSupportedAssets().filter(a => SUPPORTED.includes(a.symbol));

  // ---- Création de la commande crypto PENDING CÔTÉ SERVEUR ----
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setServerSession(null);
    setQrDataUrl('');
    setResult(null);
    setTxHashInput('');
    setSessionError(null);
    pollCount.current = 0;
    if (pollRef.current) clearTimeout(pollRef.current);

    const load = async () => {
      try {
        const res = await fetch('/api/checkout/crypto-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            asset: selectedAsset,
            customerEmail: customerEmail.trim() || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Impossible de créer la commande crypto.');
        if (cancelled) return;

        const rateEur = Number(data?.rates?.[selectedAsset]) || cryptoPaymentService.getAssetConfig(selectedAsset).rateEur;
        const totalEur = (data.totalCents || 0) / 100;
        const amount = Number((totalEur / rateEur).toFixed(cryptoPaymentService.getAssetConfig(selectedAsset).decimals));

        setServerSession({
          serverOrderId: data.serverOrderId,
          totalCents: data.totalCents,
          merchantAddress: data.merchantAddress,
          rateEur
        });
        setAmountCrypto(amount);
        setExpectedBase(cryptoPaymentService.expectedBaseUnits(totalEur, selectedAsset));

        // Vrai QR code (payload URI de paiement)
        const cfg = cryptoPaymentService.getAssetConfig(selectedAsset);
        const payload = cryptoPaymentService.generateQrPayload(selectedAsset, data.merchantAddress, amount);
        try {
          const url = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
          if (!cancelled) setQrDataUrl(url);
        } catch (e) {
          // QR indisponible : l'adresse reste copiable
        }
        void cfg;
      } catch (e: any) {
        if (!cancelled) setSessionError(e?.message || 'Erreur de session crypto.');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, selectedAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Compte à rebours (fenêtre de paiement) ----
  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(15 * 60);
    const interval = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // ---- Vérification ON-CHAIN (serveur) + re-polling si en mempool ----
  const runVerification = useCallback(async (txHash: string, isPoll = false) => {
    if (!serverSession) return;
    setVerifying(true);
    try {
      const res = await cryptoPaymentService.verifyOnChainPayment({
        asset: selectedAsset,
        txHash,
        expectedAmount: expectedBase,
        serverOrderId: serverSession.serverOrderId
      });
      setResult(res);

      if (res.verified && res.serverOrder) {
        // Paiement confirmé ON-CHAIN par le serveur → livraison (token serveur)
        setTimeout(() => onPaymentSuccess(res.serverOrder!), 800);
        return;
      }
      // Transaction en mempool → on re-vérifie (max 8 polls, toutes les 20 s)
      if (res.status === 'pending' && pollCount.current < 8) {
        pollCount.current += 1;
        pollRef.current = setTimeout(() => runVerification(txHash, true), 20 * 1000);
      }
      void isPoll;
    } finally {
      setVerifying(false);
    }
  }, [serverSession, selectedAsset, expectedBase, onPaymentSuccess]);

  const handleVerify = () => {
    const hash = txHashInput.trim();
    if (!hash) return;
    if (pollRef.current) clearTimeout(pollRef.current);
    pollCount.current = 0;
    runVerification(hash);
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

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const statusBanner = () => {
    if (verifying) {
      return (
        <div className="p-4 rounded-2xl border bg-indigo-950/40 border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          <div>
            <div className="font-bold text-white text-xs">Vérification on-chain en cours…</div>
            <div className="text-[11px] opacity-80 mt-0.5">Le serveur interroge la source publique du réseau ({selectedAsset}).</div>
          </div>
        </div>
      );
    }
    if (!result) {
      return (
        <div className="p-4 rounded-2xl border bg-slate-800/40 border-slate-700/50 text-slate-400 text-xs flex items-center gap-3">
          <Clock className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold text-white text-xs">En attente de votre transaction</div>
            <div className="text-[11px] opacity-80 mt-0.5">Envoyez exactement le montant ci-dessus, puis collez le hash de transaction.</div>
          </div>
        </div>
      );
    }
    if (result.status === 'confirmed') {
      return (
        <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold text-white text-xs">Paiement confirmé on-chain par le serveur</div>
            <div className="text-[11px] opacity-80 mt-0.5">{result.message} — livraison en cours…</div>
          </div>
        </div>
      );
    }
    if (result.status === 'manual_review') {
      return (
        <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white text-xs">Revue manuelle requise ({selectedAsset})</div>
            <div className="text-[11px] opacity-80 mt-0.5">{result.message}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-white text-xs">
            {result.status === 'pending' ? 'Transaction en mempool — re-vérification automatique…' : 'Paiement non confirmé'}
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">{result.message}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-hidden relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">₿</div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Passerelle Crypto</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Vérification On-Chain Serveur
                </span>
              </h2>
              <p className="text-xs text-slate-400">La confirmation et la livraison sont effectuées exclusivement par le serveur.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* 1. Asset selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Choisissez votre crypto-monnaie :</span>
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Fenêtre : {formatTimer(timeLeft)}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {assets.map(asset => {
              const isSelected = selectedAsset === asset.symbol;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    isSelected ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
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

        {sessionError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{sessionError}</span>
          </div>
        )}

        {!serverSession && !sessionError ? (
          <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Création de la commande crypto côté serveur…
          </div>
        ) : serverSession && (
          <>
            {/* 2. QR + montant + adresse */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
              <div className="p-2 bg-white rounded-2xl shrink-0 shadow-lg flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR de paiement ${selectedAsset}`} className="w-36 h-36" />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center border-2 border-dashed border-slate-400/50 rounded-xl text-[10px] text-slate-500">QR indisponible</div>
                )}
              </div>

              <div className="flex-1 space-y-3.5 w-full text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium flex items-center justify-between">
                    <span>Montant exact à envoyer :</span>
                    <span className="text-slate-500 font-mono text-[11px]">≈ €{(serverSession.totalCents / 100).toFixed(2)}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono font-bold text-sm">
                      {amountCrypto} {selectedAsset}
                    </div>
                    <button
                      onClick={() => copyToClipboard(String(amountCrypto), 'amount')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAmount ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Adresse de dépôt ({assets.find(a => a.symbol === selectedAsset)?.network}) :</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-300 font-mono text-[11px] truncate">
                      {serverSession.merchantAddress}
                    </div>
                    <button
                      onClick={() => copyToClipboard(serverSession.merchantAddress, 'address')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAddress ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Transaction hash + vérification serveur */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Hash de transaction (après envoi du paiement)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={txHashInput}
                  onChange={e => setTxHashInput(e.target.value)}
                  placeholder={selectedAsset === 'ETH' ? '0x…' : '… (txid)'}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-[11px] placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || !txHashInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Vérifier</span>
                </button>
              </div>
            </div>

            {/* 4. Statut de la vérification (serveur) */}
            {statusBanner()}
          </>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aucune confirmation sans vérification on-chain validée par le serveur.</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>Annuler et revenir aux cartes bancaires</span>
          </button>
        </div>
      </div>
    </div>
  );
};
