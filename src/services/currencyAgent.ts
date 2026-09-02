import { CurrencyCode, SupportedCurrency, GeoLocationInfo, GeoCurrencyAgentConfig } from '../types';
import { store } from './store';
import { tokenManager } from './tokenManager';

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, SupportedCurrency> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    rateFromEur: 1.00,
    stripeSupported: true,
    pppMultiplier: 1.0
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    rateFromEur: 1.08,
    stripeSupported: true,
    pppMultiplier: 1.0
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    rateFromEur: 0.85,
    stripeSupported: true,
    pppMultiplier: 1.0
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    flag: '🇨🇦',
    rateFromEur: 1.48,
    stripeSupported: true,
    pppMultiplier: 1.0
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    flag: '🇦🇺',
    rateFromEur: 1.66,
    stripeSupported: true,
    pppMultiplier: 1.0
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    flag: '🇨🇭',
    rateFromEur: 0.96,
    stripeSupported: true,
    pppMultiplier: 1.05
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    flag: '🇯🇵',
    rateFromEur: 168.50,
    stripeSupported: true,
    pppMultiplier: 0.95
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    flag: '🇧🇷',
    rateFromEur: 5.90,
    stripeSupported: true,
    pppMultiplier: 0.80
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    rateFromEur: 90.20,
    stripeSupported: true,
    pppMultiplier: 0.70
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    flag: '🇸🇬',
    rateFromEur: 1.45,
    stripeSupported: true,
    pppMultiplier: 1.0
  }
};

const DEFAULT_GEO: GeoLocationInfo = {
  ip: '127.0.0.1 (Local/Auto)',
  countryCode: 'FR',
  countryName: 'France',
  city: 'Paris',
  currencyCode: 'EUR',
  flag: '🇫🇷',
  detectedVia: 'browser_locale',
  detectedAt: new Date().toISOString()
};

class CurrencyAgentService {
  private currentGeo: GeoLocationInfo;
  private listeners: Set<() => void> = new Set();
  private isDetecting: boolean = false;

  constructor() {
    const savedGeo = localStorage.getItem('df_current_geo_v1');
    if (savedGeo) {
      try {
        this.currentGeo = JSON.parse(savedGeo);
      } catch (e) {
        this.currentGeo = this.detectFromBrowserHeuristic();
      }
    } else {
      this.currentGeo = this.detectFromBrowserHeuristic();
    }

    // Trigger auto Geo-IP detection in background
    setTimeout(() => {
      this.autoDetectLocation();
    }, 200);
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

  private saveGeo() {
    localStorage.setItem('df_current_geo_v1', JSON.stringify(this.currentGeo));
    this.notify();
  }

  public getGeoInfo(): GeoLocationInfo {
    return this.currentGeo;
  }

  public getActiveCurrency(): SupportedCurrency {
    return SUPPORTED_CURRENCIES[this.currentGeo.currencyCode] || SUPPORTED_CURRENCIES.EUR;
  }

  public setManualCurrency(currencyCode: CurrencyCode) {
    const curr = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.EUR;
    this.currentGeo = {
      ...this.currentGeo,
      currencyCode: curr.code,
      flag: curr.flag,
      detectedVia: 'manual_override',
      detectedAt: new Date().toISOString()
    };
    this.saveGeo();
    store.addLog('info', 'stripe', `Agent de Change Autonome: Devise modifiée manuellement pour ${curr.code} (${curr.symbol})`);
  }

  public async autoDetectLocation(): Promise<GeoLocationInfo> {
    if (this.isDetecting) return this.currentGeo;
    this.isDetecting = true;

    try {
      // 1. Try Free Geo-IP lookup with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const countryCode = (data.country_code || 'FR').toUpperCase();
        const currencyCode = this.mapCountryToCurrency(countryCode);
        const currObj = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.EUR;

        this.currentGeo = {
          ip: data.ip || 'Detected IP',
          countryCode,
          countryName: data.country_name || 'Detected Country',
          city: data.city || '',
          currencyCode,
          flag: currObj.flag,
          detectedVia: 'geo_ip',
          detectedAt: new Date().toISOString()
        };

        this.saveGeo();
        store.addLog('success', 'stripe', `Agent de Change IP Autonome: Détection géo-localisée [${data.country_name || countryCode}] -> Devise active ${currObj.code} (${currObj.symbol})`);
        this.isDetecting = false;
        return this.currentGeo;
      }
    } catch (e) {
      // Network lookup failed or blocked, fallback to browser heuristic
    }

    this.currentGeo = this.detectFromBrowserHeuristic();
    this.saveGeo();
    this.isDetecting = false;
    return this.currentGeo;
  }

  private detectFromBrowserHeuristic(): GeoLocationInfo {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const languages = navigator.languages || [navigator.language || 'fr-FR'];
      const lang = languages[0] || 'fr-FR';

      let countryCode = 'FR';
      let countryName = 'France';
      let currencyCode: CurrencyCode = 'EUR';
      let flag = '🇫🇷';

      if (timeZone.includes('New_York') || timeZone.includes('Chicago') || timeZone.includes('Los_Angeles') || timeZone.includes('Denver') || lang.includes('en-US')) {
        countryCode = 'US';
        countryName = 'United States';
        currencyCode = 'USD';
        flag = '🇺🇸';
      } else if (timeZone.includes('London') || lang.includes('en-GB')) {
        countryCode = 'GB';
        countryName = 'United Kingdom';
        currencyCode = 'GBP';
        flag = '🇬🇧';
      } else if (timeZone.includes('Toronto') || timeZone.includes('Vancouver') || timeZone.includes('Montreal') || lang.includes('en-CA') || lang.includes('fr-CA')) {
        countryCode = 'CA';
        countryName = 'Canada';
        currencyCode = 'CAD';
        flag = '🇨🇦';
      } else if (timeZone.includes('Sydney') || timeZone.includes('Melbourne') || lang.includes('en-AU')) {
        countryCode = 'AU';
        countryName = 'Australia';
        currencyCode = 'AUD';
        flag = '🇦🇺';
      } else if (timeZone.includes('Zurich') || lang.includes('de-CH') || lang.includes('fr-CH')) {
        countryCode = 'CH';
        countryName = 'Switzerland';
        currencyCode = 'CHF';
        flag = '🇨🇭';
      } else if (timeZone.includes('Tokyo') || lang.includes('ja')) {
        countryCode = 'JP';
        countryName = 'Japan';
        currencyCode = 'JPY';
        flag = '🇯🇵';
      } else if (timeZone.includes('Sao_Paulo') || lang.includes('pt-BR')) {
        countryCode = 'BR';
        countryName = 'Brazil';
        currencyCode = 'BRL';
        flag = '🇧🇷';
      } else if (timeZone.includes('Kolkata') || lang.includes('hi')) {
        countryCode = 'IN';
        countryName = 'India';
        currencyCode = 'INR';
        flag = '🇮🇳';
      } else if (timeZone.includes('Singapore')) {
        countryCode = 'SG';
        countryName = 'Singapore';
        currencyCode = 'SGD';
        flag = '🇸🇬';
      }

      return {
        ip: 'Browser Localized (IP Proxy)',
        countryCode,
        countryName,
        city: timeZone.split('/')[1] || 'Metropolis',
        currencyCode,
        flag,
        detectedVia: 'timezone_heuristic',
        detectedAt: new Date().toISOString()
      };
    } catch (e) {
      return DEFAULT_GEO;
    }
  }

  private mapCountryToCurrency(countryCode: string): CurrencyCode {
    const code = countryCode.toUpperCase();
    if (['US', 'PR', 'VI', 'GU'].includes(code)) return 'USD';
    if (['GB'].includes(code)) return 'GBP';
    if (['CA'].includes(code)) return 'CAD';
    if (['AU', 'NZ'].includes(code)) return 'AUD';
    if (['CH', 'LI'].includes(code)) return 'CHF';
    if (['JP'].includes(code)) return 'JPY';
    if (['BR'].includes(code)) return 'BRL';
    if (['IN'].includes(code)) return 'INR';
    if (['SG'].includes(code)) return 'SGD';
    // Eurozone countries
    if (['FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'LU', 'CY', 'MT', 'SK', 'SI', 'EE', 'LV', 'LT'].includes(code)) {
      return 'EUR';
    }
    return 'EUR';
  }

  public convertEurToCurrency(eurAmount: number, targetCurrencyCode?: CurrencyCode): number {
    const targetCode = targetCurrencyCode || this.currentGeo.currencyCode;
    const curr = SUPPORTED_CURRENCIES[targetCode] || SUPPORTED_CURRENCIES.EUR;
    
    // Convert base EUR to Target
    let converted = eurAmount * curr.rateFromEur;

    // Apply Purchasing Power Parity (PPP) if applicable
    if (curr.pppMultiplier && curr.pppMultiplier < 1.0) {
      converted = converted * curr.pppMultiplier;
    }

    if (targetCode === 'JPY') {
      return Math.round(converted / 100) * 100; // Japanese Yen round to nearest 100
    }

    if (eurAmount % 1 !== 0) {
      return Number(converted.toFixed(2));
    }

    return Math.round(converted);
  }

  public formatPrice(eurAmount: number, targetCurrencyCode?: CurrencyCode): string {
    const safeEur = typeof eurAmount === 'number' && !isNaN(eurAmount) ? eurAmount : 0;
    const targetCode = targetCurrencyCode || this.currentGeo?.currencyCode || 'EUR';
    const curr = SUPPORTED_CURRENCIES[targetCode] || SUPPORTED_CURRENCIES.EUR;
    const amount = this.convertEurToCurrency(safeEur, targetCode);
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

    const formattedNum = (safeAmount % 1 !== 0) ? safeAmount.toFixed(2) : safeAmount.toLocaleString();

    if (curr.code === 'EUR') return `${formattedNum} €`;
    if (curr.code === 'USD') return `$${formattedNum}`;
    if (curr.code === 'GBP') return `£${formattedNum}`;
    if (curr.code === 'JPY') return `¥${Math.round(safeAmount).toLocaleString()}`;
    return `${curr.symbol} ${formattedNum}`;
  }

  public getAllSupportedCurrencies(): SupportedCurrency[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }
}

export const currencyAgent = new CurrencyAgentService();
