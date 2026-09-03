import { CryptoAsset, CryptoCurrencyConfig, CryptoGatewaySettings } from '../types';
import { store } from './store';

export const DEFAULT_CRYPTO_SETTINGS: CryptoGatewaySettings = {
  enabled: true,
  enableStripeCrypto: true,
  autoConfirmSimulation: false, // OBSOLÈTE — la confirmation est désormais 100 % serveur (on-chain)
  merchantBtcAddress: 'bc1qwgqg48zulnaxjzdhm4gms04m8xw83zf3u0xhcs',
  merchantEthAddress: '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9',
  merchantSolAddress: '4EPMSkoQCWiLdqTEtWmg8Fo5Eu3yj4qm5NCf3QHksES9',
  merchantUsdtAddress: '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9',
  ratesAutoUpdate: true,
  lastUpdatedRates: new Date().toISOString()
};

// Taux de référence (repli si l'API de taux est injoignable).
// En fonctionnement normal, les taux viennent de /api/crypto/rates (serveur,
// source CoinGecko) — voir fetchLiveRates().
const DEFAULT_CRYPTO_CONFIGS: Record<CryptoAsset, CryptoCurrencyConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin Mainnet',
    logo: '₿',
    rateEur: 88500,
    decimals: 8,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantBtcAddress,
    stripeCryptoSupported: true,
    color: '#F7931A'
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum Mainnet',
    logo: 'Ξ',
    rateEur: 3120,
    decimals: 6,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
    stripeCryptoSupported: true,
    color: '#627EEA'
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    network: 'Solana Mainnet',
    logo: '◎',
    rateEur: 182.5,
    decimals: 4,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantSolAddress,
    stripeCryptoSupported: true,
    color: '#14F195'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'TRON (TRC-20) / EVM',
    logo: '₮',
    rateEur: 0.93,
    decimals: 2,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantUsdtAddress,
    stripeCryptoSupported: true,
    color: '#26A17B'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'EVM / Solana / Base',
    logo: '💲',
    rateEur: 0.93,
    decimals: 2,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
    stripeCryptoSupported: true,
    color: '#2775CA'
  }
};

// Facteur de conversion vers l'unité de base de la chaîne
// (BTC: satoshi, ETH: wei, SOL: lamport, USDT/USDC: 10^-6).
export const ASSET_BASE_UNIT: Record<string, { factor: string; name: string }> = {
  BTC: { factor: '100000000', name: 'sats' },
  ETH: { factor: '1000000000000000000', name: 'wei' },
  SOL: { factor: '1000000000', name: 'lamports' },
  USDT: { factor: '1000000', name: 'min. unit' },
  USDC: { factor: '1000000', name: 'min. unit' }
};

export interface OnChainVerification {
  verified: boolean;
  status: 'confirmed' | 'pending' | 'not_found' | 'insufficient' | 'manual_review' | 'error';
  message: string;
  confirmations?: number;
  receivedAmount?: number;
  serverOrder?: {
    id: string;
    orderNumber: string;
    items: Array<{ productId: string; title: string; unitPriceCents: number; quantity: number }>;
    totalCents: number;
    paymentMethod: string;
    downloadToken?: string;
    confirmedAt?: string;
  };
}

class CryptoPaymentService {
  private settings: CryptoGatewaySettings;
  private configs: Record<CryptoAsset, CryptoCurrencyConfig>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    let loadedSettings: Partial<CryptoGatewaySettings> = {};
    const savedSettings = localStorage.getItem('df_crypto_settings_v1');
    if (savedSettings) {
      try {
        loadedSettings = JSON.parse(savedSettings);
      } catch (e) {}
    }

    const clean = (v?: string) => (v || '').trim();
    this.settings = {
      ...DEFAULT_CRYPTO_SETTINGS,
      ...loadedSettings,
      merchantBtcAddress: clean(loadedSettings.merchantBtcAddress) || DEFAULT_CRYPTO_SETTINGS.merchantBtcAddress,
      merchantEthAddress: clean(loadedSettings.merchantEthAddress) || DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
      merchantSolAddress: clean(loadedSettings.merchantSolAddress) || DEFAULT_CRYPTO_SETTINGS.merchantSolAddress,
      merchantUsdtAddress: clean(loadedSettings.merchantUsdtAddress) || DEFAULT_CRYPTO_SETTINGS.merchantUsdtAddress
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('df_crypto_settings_v1', JSON.stringify(this.settings));
      localStorage.setItem('df_crypto_btc', this.settings.merchantBtcAddress);
      localStorage.setItem('df_crypto_eth', this.settings.merchantEthAddress);
      localStorage.setItem('df_crypto_sol', this.settings.merchantSolAddress);
      localStorage.setItem('df_crypto_usdt', this.settings.merchantUsdtAddress);
    }

    this.configs = { ...DEFAULT_CRYPTO_CONFIGS };
    this.syncAddresses();

    // Taux réels (serveur / CoinGecko) au démarrage, puis toutes les 5 min.
    if (typeof window !== 'undefined' && this.settings.ratesAutoUpdate) {
      this.fetchLiveRates().catch(() => {});
      setInterval(() => {
        if (document.visibilityState === 'visible') this.fetchLiveRates().catch(() => {});
      }, 5 * 60 * 1000);
    }
  }

  private syncAddresses() {
    this.configs.BTC.receivingAddress = this.settings.merchantBtcAddress;
    this.configs.ETH.receivingAddress = this.settings.merchantEthAddress;
    this.configs.SOL.receivingAddress = this.settings.merchantSolAddress;
    this.configs.USDT.receivingAddress = this.settings.merchantUsdtAddress;
    this.configs.USDC.receivingAddress = this.settings.merchantEthAddress;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach(fn => { try { fn(); } catch (e) {} });
  }

  public getSettings(): CryptoGatewaySettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<CryptoGatewaySettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('df_crypto_settings_v1', JSON.stringify(this.settings));
    if (this.settings.merchantBtcAddress) localStorage.setItem('df_crypto_btc', this.settings.merchantBtcAddress);
    if (this.settings.merchantEthAddress) localStorage.setItem('df_crypto_eth', this.settings.merchantEthAddress);
    if (this.settings.merchantSolAddress) localStorage.setItem('df_crypto_sol', this.settings.merchantSolAddress);
    if (this.settings.merchantUsdtAddress) localStorage.setItem('df_crypto_usdt', this.settings.merchantUsdtAddress);
    this.syncAddresses();
    this.notify();
    store.addLog('success', 'stripe', 'Adresses & paramètres de la passerelle Crypto enregistrés et synchronisés.');
  }

  public restoreModelAddresses(): CryptoGatewaySettings {
    this.settings = {
      ...this.settings,
      merchantBtcAddress: DEFAULT_CRYPTO_SETTINGS.merchantBtcAddress,
      merchantEthAddress: DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
      merchantSolAddress: DEFAULT_CRYPTO_SETTINGS.merchantSolAddress,
      merchantUsdtAddress: DEFAULT_CRYPTO_SETTINGS.merchantUsdtAddress,
      enabled: true
    };
    localStorage.setItem('df_crypto_settings_v1', JSON.stringify(this.settings));
    this.syncAddresses();
    this.notify();
    store.addLog('success', 'stripe', 'Adresses modèles Crypto (BTC, ETH, SOL, USDT) rétablies et enregistrées.');
    return this.settings;
  }

  public getSupportedAssets(): CryptoCurrencyConfig[] {
    return Object.values(this.configs);
  }

  public getAssetConfig(symbol: CryptoAsset): CryptoCurrencyConfig {
    return this.configs[symbol] || this.configs.BTC;
  }

  // Taux EUR en direct (serveur → CoinGecko, repli sur valeurs de référence).
  public async fetchLiveRates(): Promise<Record<string, number>> {
    try {
      const res = await fetch('/api/crypto/rates', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rates: Record<string, number> = data?.rates || {};
        (['BTC', 'ETH', 'SOL', 'USDT', 'USDC'] as CryptoAsset[]).forEach(sym => {
          const r = Number(rates[sym]);
          if (Number.isFinite(r) && r > 0) this.configs[sym].rateEur = r;
        });
        this.settings.lastUpdatedRates = new Date().toISOString();
        this.notify();
        return rates;
      }
    } catch (e) {
      // source injoignable : on garde les taux de référence (jamais de taux inventé)
    }
    return {
      BTC: this.configs.BTC.rateEur,
      ETH: this.configs.ETH.rateEur,
      SOL: this.configs.SOL.rateEur,
      USDT: this.configs.USDT.rateEur,
      USDC: this.configs.USDC.rateEur
    };
  }

  public convertEurToCrypto(eurAmount: number, asset: CryptoAsset): number {
    const config = this.getAssetConfig(asset);
    if (!config || config.rateEur <= 0) return 0;
    const raw = eurAmount / config.rateEur;
    return Number(raw.toFixed(config.decimals));
  }

  // Montant attendu en unité de base de la chaîne (entier, exact).
  public expectedBaseUnits(eurAmount: number, asset: CryptoAsset): string {
    const config = this.getAssetConfig(asset);
    if (!config || config.rateEur <= 0) return '0';
    const base = ASSET_BASE_UNIT[asset] || ASSET_BASE_UNIT.ETH;
    // eur / rate = montants d'actifs (décimales) × facteur = unités de base
    const amount = (BigInt(Math.round(eurAmount * 100)) * BigInt(base.factor)) / BigInt(Math.round(config.rateEur * 100));
    return amount.toString();
  }

  public generateQrPayload(asset: CryptoAsset, address: string, amount: number): string {
    switch (asset) {
      case 'BTC':
        return `bitcoin:${address}?amount=${amount}&label=NexusDigitalStore`;
      case 'ETH':
      case 'USDC':
        return `ethereum:${address}?value=${amount}`;
      case 'SOL':
        return `solana:${address}?amount=${amount}`;
      case 'USDT':
        return `tron:${address}?contract=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&amount=${amount}`;
      default:
        return address;
    }
  }

  /**
   * SÉCURITÉ — VÉRIFICATION ON-CHAIN RÉELLE CÔTÉ SERVEUR.
   * Le serveur interroge la source on-chain publique (mempool.space / Etherscan)
   * et ne confirme la commande QUE si : transaction validée + adresse marchande
   * du serveur + montant suffisant. Le client n'a AUCUNE capacité à confirmer
   * un paiement lui-même.
   */
  public async verifyOnChainPayment(params: {
    asset: CryptoAsset;
    txHash: string;
    expectedAmount: string; // en unités de base (sats / wei / ...)
    serverOrderId: string
  }): Promise<OnChainVerification> {
    try {
      const res = await fetch('/api/crypto/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: params.asset,
          txHash: params.txHash,
          expectedAmount: params.expectedAmount,
          serverOrderId: params.serverOrderId
        })
      });
      const data = await res.json();
      if (res.ok) {
        return {
          verified: Boolean(data.verified),
          status: data.status || 'error',
          message: data.message || 'Vérification sans résultat.',
          confirmations: data.confirmations,
          receivedAmount: data.receivedAmount,
          serverOrder: data.serverOrder
        };
      }
      return { verified: false, status: 'error', message: data?.error || 'Erreur de vérification.' };
    } catch (e) {
      return { verified: false, status: 'error', message: 'Serveur injoignable — aucune confirmation ne peut être émise.' };
    }
  }
}

export const cryptoPaymentService = new CryptoPaymentService();
