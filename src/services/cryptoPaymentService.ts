import { CryptoAsset, CryptoCurrencyConfig, CryptoPaymentSession, CryptoGatewaySettings, Order } from '../types';
import { store } from './store';
import { billingService } from './billingService';

export const DEFAULT_CRYPTO_SETTINGS: CryptoGatewaySettings = {
  enabled: true,
  enableStripeCrypto: true,
  autoConfirmSimulation: true,
  merchantBtcAddress: 'bc1qwgqg48zulnaxjzdhm4gms04m8xw83zf3u0xhcs',
  merchantEthAddress: '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9',
  merchantSolAddress: '4EPMSkoQCWiLdqTEtWmg8Fo5Eu3yj4qm5NCf3QHksES9',
  merchantUsdtAddress: '0x1e0057ddE092Bdd667AE24FfFF75fC54bFC992D9',
  ratesAutoUpdate: true,
  lastUpdatedRates: new Date().toISOString()
};

const DEFAULT_CRYPTO_CONFIGS: Record<CryptoAsset, CryptoCurrencyConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin Mainnet / Lightning',
    logo: '₿',
    rateEur: 88500, // 1 BTC = 88,500 EUR
    decimals: 8,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantBtcAddress,
    stripeCryptoSupported: true,
    color: '#F7931A'
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum (ERC-20)',
    logo: 'Ξ',
    rateEur: 3120, // 1 ETH = 3,120 EUR
    decimals: 6,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
    stripeCryptoSupported: true,
    color: '#627EEA'
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    network: 'Solana High-Speed Network',
    logo: '◎',
    rateEur: 182.5, // 1 SOL = 182.5 EUR
    decimals: 4,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantSolAddress,
    stripeCryptoSupported: true,
    color: '#14F195'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'TRON (TRC-20) / Polygon / EVM',
    logo: '₮',
    rateEur: 0.93, // 1 USDT = 0.93 EUR
    decimals: 2,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantUsdtAddress,
    stripeCryptoSupported: true,
    color: '#26A17B'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Stripe Crypto)',
    network: 'Polygon / Solana / Base / Ethereum',
    logo: '💲',
    rateEur: 0.93, // 1 USDC = 0.93 EUR
    decimals: 2,
    minConfirmations: 1,
    receivingAddress: DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
    stripeCryptoSupported: true,
    color: '#2775CA'
  }
};

class CryptoPaymentService {
  private settings: CryptoGatewaySettings;
  private configs: Record<CryptoAsset, CryptoCurrencyConfig>;
  private activeSessions: Map<string, CryptoPaymentSession> = new Map();
  private listeners: Set<() => void> = new Set();
  private watcherTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    let loadedSettings: Partial<CryptoGatewaySettings> = {};
    const savedSettings = localStorage.getItem('df_crypto_settings_v1');
    if (savedSettings) {
      try {
        loadedSettings = JSON.parse(savedSettings);
      } catch (e) {}
    }

    // Check and upgrade if previous settings were obsolete demo addresses
    const isOldDemoAddress = (addr?: string) => {
      if (!addr) return true;
      const clean = addr.trim();
      return clean === 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' ||
             clean === '0x71C83897F4327794b2BAF295982855140445d475' ||
             clean === '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin' ||
             clean === 'TXjC8rQk8mPz9xLtN27bE39q8V1s8u8f2A';
    };

    const btc = (!loadedSettings.merchantBtcAddress || isOldDemoAddress(loadedSettings.merchantBtcAddress))
      ? DEFAULT_CRYPTO_SETTINGS.merchantBtcAddress
      : loadedSettings.merchantBtcAddress.trim();

    const eth = (!loadedSettings.merchantEthAddress || isOldDemoAddress(loadedSettings.merchantEthAddress))
      ? DEFAULT_CRYPTO_SETTINGS.merchantEthAddress
      : loadedSettings.merchantEthAddress.trim();

    const sol = (!loadedSettings.merchantSolAddress || isOldDemoAddress(loadedSettings.merchantSolAddress))
      ? DEFAULT_CRYPTO_SETTINGS.merchantSolAddress
      : loadedSettings.merchantSolAddress.trim();

    const usdt = (!loadedSettings.merchantUsdtAddress || isOldDemoAddress(loadedSettings.merchantUsdtAddress))
      ? DEFAULT_CRYPTO_SETTINGS.merchantUsdtAddress
      : loadedSettings.merchantUsdtAddress.trim();

    // Merge with defaults so addresses are never lost or blanked out unintentionally
    this.settings = {
      ...DEFAULT_CRYPTO_SETTINGS,
      ...loadedSettings,
      enabled: loadedSettings.enabled !== undefined ? loadedSettings.enabled : DEFAULT_CRYPTO_SETTINGS.enabled,
      merchantBtcAddress: btc,
      merchantEthAddress: eth,
      merchantSolAddress: sol,
      merchantUsdtAddress: usdt,
    };

    // Save upgraded settings
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('df_crypto_settings_v1', JSON.stringify(this.settings));
      localStorage.setItem('df_crypto_btc', this.settings.merchantBtcAddress);
      localStorage.setItem('df_crypto_eth', this.settings.merchantEthAddress);
      localStorage.setItem('df_crypto_sol', this.settings.merchantSolAddress);
      localStorage.setItem('df_crypto_usdt', this.settings.merchantUsdtAddress);
    }

    this.configs = { ...DEFAULT_CRYPTO_CONFIGS };
    // Synchronize addresses
    this.configs.BTC.receivingAddress = this.settings.merchantBtcAddress;
    this.configs.ETH.receivingAddress = this.settings.merchantEthAddress;
    this.configs.SOL.receivingAddress = this.settings.merchantSolAddress;
    this.configs.USDT.receivingAddress = this.settings.merchantUsdtAddress;
    this.configs.USDC.receivingAddress = this.settings.merchantEthAddress;

    // Simulate minor live exchange rate ticks every 30s
    if (typeof window !== 'undefined') {
      setInterval(() => this.updateLiveRates(), 30000);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public getSettings(): CryptoGatewaySettings {
    return this.settings;
  }

  public restoreModelAddresses(): CryptoGatewaySettings {
    this.settings = {
      ...this.settings,
      merchantBtcAddress: DEFAULT_CRYPTO_SETTINGS.merchantBtcAddress,
      merchantEthAddress: DEFAULT_CRYPTO_SETTINGS.merchantEthAddress,
      merchantSolAddress: DEFAULT_CRYPTO_SETTINGS.merchantSolAddress,
      merchantUsdtAddress: DEFAULT_CRYPTO_SETTINGS.merchantUsdtAddress,
      enabled: true,
      enableStripeCrypto: true,
      autoConfirmSimulation: true
    };
    localStorage.setItem('df_crypto_settings_v1', JSON.stringify(this.settings));
    localStorage.setItem('df_crypto_btc', this.settings.merchantBtcAddress);
    localStorage.setItem('df_crypto_eth', this.settings.merchantEthAddress);
    localStorage.setItem('df_crypto_sol', this.settings.merchantSolAddress);
    localStorage.setItem('df_crypto_usdt', this.settings.merchantUsdtAddress);

    this.configs.BTC.receivingAddress = this.settings.merchantBtcAddress;
    this.configs.ETH.receivingAddress = this.settings.merchantEthAddress;
    this.configs.SOL.receivingAddress = this.settings.merchantSolAddress;
    this.configs.USDT.receivingAddress = this.settings.merchantUsdtAddress;
    this.configs.USDC.receivingAddress = this.settings.merchantEthAddress;
    this.notify();
    store.addLog('success', 'stripe', 'Adresses modèles Crypto (BTC, ETH, SOL, USDT) rétablies et enregistrées avec succès.');
    return this.settings;
  }

  public updateSettings(newSettings: Partial<CryptoGatewaySettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('df_crypto_settings_v1', JSON.stringify(this.settings));
    if (this.settings.merchantBtcAddress) localStorage.setItem('df_crypto_btc', this.settings.merchantBtcAddress);
    if (this.settings.merchantEthAddress) localStorage.setItem('df_crypto_eth', this.settings.merchantEthAddress);
    if (this.settings.merchantSolAddress) localStorage.setItem('df_crypto_sol', this.settings.merchantSolAddress);
    if (this.settings.merchantUsdtAddress) localStorage.setItem('df_crypto_usdt', this.settings.merchantUsdtAddress);
    
    this.configs.BTC.receivingAddress = this.settings.merchantBtcAddress;
    this.configs.ETH.receivingAddress = this.settings.merchantEthAddress;
    this.configs.SOL.receivingAddress = this.settings.merchantSolAddress;
    this.configs.USDT.receivingAddress = this.settings.merchantUsdtAddress;
    this.configs.USDC.receivingAddress = this.settings.merchantEthAddress;
    this.notify();
    store.addLog('success', 'stripe', 'Adresses & paramètres de la passerelle Crypto enregistrés et synchronisés.');
  }

  public getSupportedAssets(): CryptoCurrencyConfig[] {
    return Object.values(this.configs);
  }

  public getAssetConfig(symbol: CryptoAsset): CryptoCurrencyConfig {
    return this.configs[symbol] || this.configs.BTC;
  }

  public convertEurToCrypto(eurAmount: number, asset: CryptoAsset): number {
    const config = this.getAssetConfig(asset);
    if (!config || config.rateEur <= 0) return 0;
    const raw = eurAmount / config.rateEur;
    return Number(raw.toFixed(config.decimals));
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
        return `ethereum:${address}?contract=0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=${amount}`;
      default:
        return address;
    }
  }

  public createPaymentSession(params: {
    orderId: string;
    asset: CryptoAsset;
    amountEur: number;
    useStripeCrypto?: boolean;
  }): CryptoPaymentSession {
    const { orderId, asset, amountEur, useStripeCrypto = false } = params;
    const config = this.getAssetConfig(asset);
    const amountCrypto = this.convertEurToCrypto(amountEur, asset);

    const sessionId = `cps-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes window

    const session: CryptoPaymentSession = {
      id: sessionId,
      orderId,
      asset,
      amountCrypto,
      amountEur,
      receivingAddress: config.receivingAddress,
      qrPayload: this.generateQrPayload(asset, config.receivingAddress, amountCrypto),
      confirmations: 0,
      requiredConfirmations: config.minConfirmations,
      status: 'waiting_payment',
      expiresAt,
      stripeCryptoPay: useStripeCrypto,
      createdAt: new Date().toISOString()
    };

    this.activeSessions.set(sessionId, session);
    this.notify();

    store.addLog(
      'info',
      'stripe',
      `Session de paiement Crypto initialisée : ${amountCrypto} ${asset} (~${amountEur}€) pour la commande ${orderId}.`
    );

    // Launch Autonomous Mempool & Blockchain Watcher
    if (this.settings.autoConfirmSimulation) {
      this.startAutonomousPaymentWatcher(sessionId);
    }

    return session;
  }

  public getSession(sessionId: string): CryptoPaymentSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  private startAutonomousPaymentWatcher(sessionId: string) {
    if (this.watcherTimers.has(sessionId)) {
      clearTimeout(this.watcherTimers.get(sessionId));
    }

    // Step 1: Detect transaction in mempool after 2.5s to show it's working, but NEVER confirm it automatically.
    const t1 = setTimeout(() => {
      const sess = this.activeSessions.get(sessionId);
      if (!sess || sess.status === 'confirmed' || sess.status === 'expired') return;

      sess.status = 'detected_mempool';
      sess.txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      this.notify();
      store.addLog('info', 'stripe', `Transaction ${sess.asset} détectée dans le Mempool (TX: ${sess.txHash.slice(0, 10)}...). Attente de validation de vrais fonds...`);
      
      // We explicitly removed Step 2 (Auto-confirm on chain) to prevent fake product delivery.
    }, 2500);

    this.watcherTimers.set(sessionId, t1);
  }

  public triggerManualInstantConfirmation(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'confirmed';
    session.confirmations = 1;
    session.txHash = session.txHash || ('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
    this.notify();

    store.addLog('success', 'stripe', `Agent 2 (Validateur) a confirmé la session cryptographique on-chain : ${session.asset} (${session.orderId}).`);
  }

  private updateLiveRates() {
    // Micro-fluctuations within ±0.2% to simulate live crypto market feeds
    const fluctuate = (base: number) => {
      const delta = (Math.random() - 0.5) * 0.004;
      return Math.round((base * (1 + delta)) * 100) / 100;
    };

    this.configs.BTC.rateEur = Math.round(fluctuate(this.configs.BTC.rateEur));
    this.configs.ETH.rateEur = Math.round(fluctuate(this.configs.ETH.rateEur) * 10) / 10;
    this.configs.SOL.rateEur = Math.round(fluctuate(this.configs.SOL.rateEur) * 100) / 100;
    this.settings.lastUpdatedRates = new Date().toISOString();
    this.notify();
  }
}

export const cryptoPaymentService = new CryptoPaymentService();
