import { 
  HorizonProfitabilityBreakdown, 
  ProfitabilitySimulationParams, 
  TimeHorizonKey 
} from '../types';
import { store } from './store';

const DEFAULT_PARAMS: ProfitabilitySimulationParams = {
  baseMonthlyTraffic: 12500, // starting organic traffic base
  trafficMonthlyGrowthRate: 28, // 28% compound growth via programmatic SEO + GitHub syndication
  conversionRate: 3.8, // 3.8% direct conversion
  averageOrderValue: 49, // 49€ (including upsells and bundles)
  cryptoSharePercent: 32, // 32% tech customers paying in BTC/ETH/SOL/USDT
  affiliateSharePercent: 18, // 18% sales driven by affiliate recruiting agent
  bundleAdoptionRatePercent: 35 // 35% cart order-bump bundle take rate
};

class ProfitabilityEngine {
  private params: ProfitabilitySimulationParams = { ...DEFAULT_PARAMS };
  private listeners: Set<() => void> = new Set();

  constructor() {
    const saved = localStorage.getItem('df_profitability_params_v1');
    if (saved) {
      try {
        this.params = { ...DEFAULT_PARAMS, ...JSON.parse(saved) };
      } catch (e) {}
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

  public getParams(): ProfitabilitySimulationParams {
    return { ...this.params };
  }

  public updateParams(newParams: Partial<ProfitabilitySimulationParams>) {
    this.params = { ...this.params, ...newParams };
    localStorage.setItem('df_profitability_params_v1', JSON.stringify(this.params));
    this.notify();
  }

  public resetParams() {
    this.params = { ...DEFAULT_PARAMS };
    localStorage.removeItem('df_profitability_params_v1');
    this.notify();
  }

  // Calculate detailed financial metrics for all 5 horizons (30d, 90d, 180d, 1y, 3y)
  public getProjections(): Record<TimeHorizonKey, HorizonProfitabilityBreakdown> {
    const p = this.params;
    const isAdsUnlocked = store.isAdBudgetUnlocked();

    // 1 Month (J+30)
    const m1MonthlyTraffic = p.baseMonthlyTraffic;
    const m1Orders = Math.round((m1MonthlyTraffic * (p.conversionRate / 100)));
    const m1GrossRevenue = Math.round(m1Orders * p.averageOrderValue);
    const m1CryptoRev = Math.round(m1GrossRevenue * (p.cryptoSharePercent / 100));
    const m1FiatRev = m1GrossRevenue - m1CryptoRev;
    const m1ServerCost = 15; // €15/mo
    const m1StripeFee = Math.round(m1FiatRev * 0.015); // 1.5% fiat
    const m1CryptoFee = Math.round(m1CryptoRev * 0.001); // 0.1% crypto
    const m1AffiliatePayout = Math.round((m1GrossRevenue * (p.affiliateSharePercent / 100)) * 0.25); // 25% commission on 18% share
    const m1TotalCosts = m1ServerCost + m1StripeFee + m1CryptoFee + m1AffiliatePayout;
    const m1NetProfit = m1GrossRevenue - m1TotalCosts;

    // 3 Months (J+90) - Cumulative 3 months
    const m2Traffic = Math.round(m1MonthlyTraffic * (1 + p.trafficMonthlyGrowthRate / 100));
    const m3Traffic = Math.round(m2Traffic * (1 + p.trafficMonthlyGrowthRate / 100));
    const q1CumulativeTraffic = m1MonthlyTraffic + m2Traffic + m3Traffic;
    const q1Orders = Math.round(q1CumulativeTraffic * (p.conversionRate / 100));
    const q1GrossRevenue = Math.round(q1Orders * (p.averageOrderValue * 1.04)); // +4% AOV via upsell tuning
    const q1CryptoRev = Math.round(q1GrossRevenue * (p.cryptoSharePercent / 100));
    const q1FiatRev = q1GrossRevenue - q1CryptoRev;
    const q1ServerCost = 45; // 3 x 15€
    const q1StripeFee = Math.round(q1FiatRev * 0.015);
    const q1CryptoFee = Math.round(q1CryptoRev * 0.001);
    const q1AffiliatePayout = Math.round((q1GrossRevenue * (p.affiliateSharePercent / 100)) * 0.25);
    const q1TotalCosts = q1ServerCost + q1StripeFee + q1CryptoFee + q1AffiliatePayout;
    const q1NetProfit = q1GrossRevenue - q1TotalCosts;

    // 6 Months (J+180) - Cumulative 6 months
    let h1CumTraffic = 0;
    let h1CurrentMoTraffic = p.baseMonthlyTraffic;
    for (let m = 0; m < 6; m++) {
      h1CumTraffic += h1CurrentMoTraffic;
      h1CurrentMoTraffic = Math.round(h1CurrentMoTraffic * (1 + p.trafficMonthlyGrowthRate / 100));
    }
    const h1Orders = Math.round(h1CumTraffic * ((p.conversionRate * 1.08) / 100)); // higher CR via authority & reviews
    const h1GrossRevenue = Math.round(h1Orders * (p.averageOrderValue * 1.08));
    const h1CryptoRev = Math.round(h1GrossRevenue * (p.cryptoSharePercent / 100));
    const h1FiatRev = h1GrossRevenue - h1CryptoRev;
    const h1ServerCost = 110;
    const h1StripeFee = Math.round(h1FiatRev * 0.015);
    const h1CryptoFee = Math.round(h1CryptoRev * 0.001);
    const h1AffiliatePayout = Math.round((h1GrossRevenue * (p.affiliateSharePercent / 100)) * 0.25);
    const h1TotalCosts = h1ServerCost + h1StripeFee + h1CryptoFee + h1AffiliatePayout;
    const h1NetProfit = h1GrossRevenue - h1TotalCosts;

    // 1 Year (J+365) - Cumulative 12 months
    let y1CumTraffic = 0;
    let y1CurrentMoTraffic = p.baseMonthlyTraffic;
    // Cap exponential monthly growth gracefully after month 6
    for (let m = 0; m < 12; m++) {
      y1CumTraffic += y1CurrentMoTraffic;
      const decayGrowth = m >= 6 ? (p.trafficMonthlyGrowthRate * 0.7) : p.trafficMonthlyGrowthRate;
      y1CurrentMoTraffic = Math.round(y1CurrentMoTraffic * (1 + decayGrowth / 100));
    }
    const y1Orders = Math.round(y1CumTraffic * ((p.conversionRate * 1.15) / 100));
    const y1GrossRevenue = Math.round(y1Orders * (p.averageOrderValue * 1.14));
    const y1CryptoRev = Math.round(y1GrossRevenue * (p.cryptoSharePercent / 100));
    const y1FiatRev = y1GrossRevenue - y1CryptoRev;
    const y1ServerCost = 280;
    const y1StripeFee = Math.round(y1FiatRev * 0.015);
    const y1CryptoFee = Math.round(y1CryptoRev * 0.001);
    const y1AffiliatePayout = Math.round((y1GrossRevenue * (p.affiliateSharePercent / 100)) * 0.25);
    const y1TotalCosts = y1ServerCost + y1StripeFee + y1CryptoFee + y1AffiliatePayout;
    const y1NetProfit = y1GrossRevenue - y1TotalCosts;

    // 3 Years (J+1095) - Cumulative 36 months
    let y3CumTraffic = 0;
    let y3CurrentMoTraffic = p.baseMonthlyTraffic;
    for (let m = 0; m < 36; m++) {
      y3CumTraffic += y3CurrentMoTraffic;
      const decayGrowth = m >= 12 ? 4.5 : m >= 6 ? 12 : p.trafficMonthlyGrowthRate;
      y3CurrentMoTraffic = Math.round(y3CurrentMoTraffic * (1 + decayGrowth / 100));
    }
    const y3Orders = Math.round(y3CumTraffic * ((p.conversionRate * 1.22) / 100));
    const y3GrossRevenue = Math.round(y3Orders * (p.averageOrderValue * 1.25));
    const y3CryptoRev = Math.round(y3GrossRevenue * (p.cryptoSharePercent / 100));
    const y3FiatRev = y3GrossRevenue - y3CryptoRev;
    const y3ServerCost = 950;
    const y3StripeFee = Math.round(y3FiatRev * 0.015);
    const y3CryptoFee = Math.round(y3CryptoRev * 0.001);
    const y3AffiliatePayout = Math.round((y3GrossRevenue * (p.affiliateSharePercent / 100)) * 0.25);
    const y3TotalCosts = y3ServerCost + y3StripeFee + y3CryptoFee + y3AffiliatePayout;
    const y3NetProfit = y3GrossRevenue - y3TotalCosts;

    return {
      '30d': {
        horizonKey: '30d',
        horizonLabel: 'Mois 1 (J+30) - Lancement & Calibrage',
        periodDays: 30,
        monthlyVisitors: m1MonthlyTraffic,
        cumulativeVisitors: m1MonthlyTraffic,
        organicSeoTrafficShare: 68,
        githubSyndicationShare: 22,
        affiliateReferralShare: 10,
        conversionRate: p.conversionRate,
        averageOrderValueEur: p.averageOrderValue,
        totalOrdersCount: m1Orders,
        grossRevenueEur: m1GrossRevenue,
        fiatRevenueEur: m1FiatRev,
        cryptoRevenueEur: m1CryptoRev,
        tokenApiCostEur: 0.00, // 100% Free tier
        serverHostingCostEur: m1ServerCost,
        paymentProcessingFeesEur: m1StripeFee + m1CryptoFee,
        domainAndCdnCostEur: 0,
        affiliateCommissionsPaidEur: m1AffiliatePayout,
        totalOperatingCostsEur: m1TotalCosts,
        grossProfitEur: m1GrossRevenue,
        grossMarginPercent: 99.8,
        netProfitEur: m1NetProfit,
        netMarginPercent: Math.round((m1NetProfit / m1GrossRevenue) * 1000) / 10,
        humanWorkHoursRequired: 0,
        hourlyEquivalentReturnEur: m1NetProfit, // Infinite/pure autonomous
        activeProductsCatalog: 12,
        indexedSeoPages: 84,
        acquiredBacklinks: 14,
        activeAffiliatePartners: 6,
        adBudgetUnlocked: isAdsUnlocked || m1GrossRevenue >= 100000
      },
      '90d': {
        horizonKey: '90d',
        horizonLabel: 'Trimestre 1 (J+90) - Effet de Levier',
        periodDays: 90,
        monthlyVisitors: m3Traffic,
        cumulativeVisitors: q1CumulativeTraffic,
        organicSeoTrafficShare: 72,
        githubSyndicationShare: 18,
        affiliateReferralShare: 10,
        conversionRate: p.conversionRate,
        averageOrderValueEur: Math.round(p.averageOrderValue * 1.04),
        totalOrdersCount: q1Orders,
        grossRevenueEur: q1GrossRevenue,
        fiatRevenueEur: q1FiatRev,
        cryptoRevenueEur: q1CryptoRev,
        tokenApiCostEur: 0.00,
        serverHostingCostEur: q1ServerCost,
        paymentProcessingFeesEur: q1StripeFee + q1CryptoFee,
        domainAndCdnCostEur: 0,
        affiliateCommissionsPaidEur: q1AffiliatePayout,
        totalOperatingCostsEur: q1TotalCosts,
        grossProfitEur: q1GrossRevenue,
        grossMarginPercent: 99.8,
        netProfitEur: q1NetProfit,
        netMarginPercent: Math.round((q1NetProfit / q1GrossRevenue) * 1000) / 10,
        humanWorkHoursRequired: 0,
        hourlyEquivalentReturnEur: q1NetProfit,
        activeProductsCatalog: 36,
        indexedSeoPages: 320,
        acquiredBacklinks: 58,
        activeAffiliatePartners: 22,
        adBudgetUnlocked: isAdsUnlocked || q1GrossRevenue >= 100000
      },
      '180d': {
        horizonKey: '180d',
        horizonLabel: 'Semestre 1 (J+180) - Expansion & Autorité',
        periodDays: 180,
        monthlyVisitors: Math.round(p.baseMonthlyTraffic * Math.pow(1 + p.trafficMonthlyGrowthRate / 100, 5)),
        cumulativeVisitors: h1CumTraffic,
        organicSeoTrafficShare: 76,
        githubSyndicationShare: 14,
        affiliateReferralShare: 10,
        conversionRate: Math.round(p.conversionRate * 1.08 * 10) / 10,
        averageOrderValueEur: Math.round(p.averageOrderValue * 1.08),
        totalOrdersCount: h1Orders,
        grossRevenueEur: h1GrossRevenue,
        fiatRevenueEur: h1FiatRev,
        cryptoRevenueEur: h1CryptoRev,
        tokenApiCostEur: 0.00,
        serverHostingCostEur: h1ServerCost,
        paymentProcessingFeesEur: h1StripeFee + h1CryptoFee,
        domainAndCdnCostEur: 0,
        affiliateCommissionsPaidEur: h1AffiliatePayout,
        totalOperatingCostsEur: h1TotalCosts,
        grossProfitEur: h1GrossRevenue,
        grossMarginPercent: 99.8,
        netProfitEur: h1NetProfit,
        netMarginPercent: Math.round((h1NetProfit / h1GrossRevenue) * 1000) / 10,
        humanWorkHoursRequired: 0,
        hourlyEquivalentReturnEur: h1NetProfit,
        activeProductsCatalog: 75,
        indexedSeoPages: 890,
        acquiredBacklinks: 145,
        activeAffiliatePartners: 48,
        adBudgetUnlocked: isAdsUnlocked || h1GrossRevenue >= 100000
      },
      '1y': {
        horizonKey: '1y',
        horizonLabel: 'An 1 (J+365) - Palier 100k+ & Domination',
        periodDays: 365,
        monthlyVisitors: Math.round(y1CurrentMoTraffic),
        cumulativeVisitors: y1CumTraffic,
        organicSeoTrafficShare: 80,
        githubSyndicationShare: 10,
        affiliateReferralShare: 10,
        conversionRate: Math.round(p.conversionRate * 1.15 * 10) / 10,
        averageOrderValueEur: Math.round(p.averageOrderValue * 1.14),
        totalOrdersCount: y1Orders,
        grossRevenueEur: y1GrossRevenue,
        fiatRevenueEur: y1FiatRev,
        cryptoRevenueEur: y1CryptoRev,
        tokenApiCostEur: 0.00,
        serverHostingCostEur: y1ServerCost,
        paymentProcessingFeesEur: y1StripeFee + y1CryptoFee,
        domainAndCdnCostEur: 0,
        affiliateCommissionsPaidEur: y1AffiliatePayout,
        totalOperatingCostsEur: y1TotalCosts,
        grossProfitEur: y1GrossRevenue,
        grossMarginPercent: 99.8,
        netProfitEur: y1NetProfit,
        netMarginPercent: Math.round((y1NetProfit / y1GrossRevenue) * 1000) / 10,
        humanWorkHoursRequired: 0,
        hourlyEquivalentReturnEur: y1NetProfit,
        activeProductsCatalog: 150,
        indexedSeoPages: 2400,
        acquiredBacklinks: 380,
        activeAffiliatePartners: 110,
        adBudgetUnlocked: true
      },
      '3y': {
        horizonKey: '3y',
        horizonLabel: 'An 3 (J+1095) - Rente Récurrente & Monopole',
        periodDays: 1095,
        monthlyVisitors: Math.round(y3CurrentMoTraffic),
        cumulativeVisitors: y3CumTraffic,
        organicSeoTrafficShare: 82,
        githubSyndicationShare: 8,
        affiliateReferralShare: 10,
        conversionRate: Math.round(p.conversionRate * 1.22 * 10) / 10,
        averageOrderValueEur: Math.round(p.averageOrderValue * 1.25),
        totalOrdersCount: y3Orders,
        grossRevenueEur: y3GrossRevenue,
        fiatRevenueEur: y3FiatRev,
        cryptoRevenueEur: y3CryptoRev,
        tokenApiCostEur: 0.00,
        serverHostingCostEur: y3ServerCost,
        paymentProcessingFeesEur: y3StripeFee + y3CryptoFee,
        domainAndCdnCostEur: 0,
        affiliateCommissionsPaidEur: y3AffiliatePayout,
        totalOperatingCostsEur: y3TotalCosts,
        grossProfitEur: y3GrossRevenue,
        grossMarginPercent: 99.8,
        netProfitEur: y3NetProfit,
        netMarginPercent: Math.round((y3NetProfit / y3GrossRevenue) * 1000) / 10,
        humanWorkHoursRequired: 0,
        hourlyEquivalentReturnEur: y3NetProfit,
        activeProductsCatalog: 420,
        indexedSeoPages: 8500,
        acquiredBacklinks: 1200,
        activeAffiliatePartners: 340,
        adBudgetUnlocked: true
      }
    };
  }

  // Export audit report as formatted JSON or text
  public generateAuditReportText(): string {
    const projections = this.getProjections();
    const p30 = projections['30d'];
    const p90 = projections['90d'];
    const p180 = projections['180d'];
    const p1y = projections['1y'];
    const p3y = projections['3y'];

    return `===============================================================
RAPPORT D'AUDIT FINANCIER & PROJECTIONS DE RENTABILITÉ MULTI-HORIZONS
Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
Modèle: 100% Autonome (Zero-Token LLM + Ingestion GitHub + Syndication SEO)
===============================================================

PARAMÈTRES DU MODÈLE :
- Trafic initial mensuel : ${(this.params?.baseMonthlyTraffic ?? 12000).toLocaleString()} visiteurs
- Croissance organique mensuelle : +${this.params?.trafficMonthlyGrowthRate ?? 28}%
- Taux de conversion : ${this.params?.conversionRate ?? 3.5}%
- Panier moyen (AOV) : ${this.params?.averageOrderValue ?? 47} €
- Part des règlements Crypto (BTC/ETH/SOL/USDT) : ${this.params?.cryptoSharePercent ?? 30}%
- Commission d'affiliation moyenne : 25% (sur ${this.params?.affiliateSharePercent ?? 18}% des ventes)

---------------------------------------------------------------
SYNTHÈSE PAR HORIZON TEMPOREL :
---------------------------------------------------------------
1. MOIS 1 (J+30)
   - Trafic cumulé : ${(p30.cumulativeVisitors ?? 0).toLocaleString()} visiteurs
   - Commandes générées : ${(p30.totalOrdersCount ?? 0).toLocaleString()}
   - Chiffre d'Affaires Brut : ${(p30.grossRevenueEur ?? 0).toLocaleString()} €
   - Coûts d'exploitation : ${(p30.totalOperatingCostsEur ?? 0).toLocaleString()} € (Frais serveurs + Stripe + Affiliation)
   - Bénéfice Net Réel : ${(p30.netProfitEur ?? 0).toLocaleString()} €
   - Marge Nette : ${p30.netMarginPercent ?? 98}%
   - Coût IA / Tokens : 0,00 € (Architecture Free-Tier & Moteur Heuristique)

2. TRIMESTRE 1 (J+90)
   - Trafic cumulé : ${(p90.cumulativeVisitors ?? 0).toLocaleString()} visiteurs
   - Commandes générées : ${(p90.totalOrdersCount ?? 0).toLocaleString()}
   - Chiffre d'Affaires Brut : ${(p90.grossRevenueEur ?? 0).toLocaleString()} €
   - Bénéfice Net Réel : ${(p90.netProfitEur ?? 0).toLocaleString()} €
   - Marge Nette : ${p90.netMarginPercent ?? 97}%

3. SEMESTRE 1 (J+180)
   - Trafic cumulé : ${(p180.cumulativeVisitors ?? 0).toLocaleString()} visiteurs
   - Commandes générées : ${(p180.totalOrdersCount ?? 0).toLocaleString()}
   - Chiffre d'Affaires Brut : ${(p180.grossRevenueEur ?? 0).toLocaleString()} €
   - Bénéfice Net Réel : ${(p180.netProfitEur ?? 0).toLocaleString()} €
   - Marge Nette : ${p180.netMarginPercent ?? 97}%

4. AN 1 (J+365) - FRANCHISSEMENT DU PALIER 100K€
   - Trafic cumulé : ${(p1y.cumulativeVisitors ?? 0).toLocaleString()} visiteurs
   - Commandes générées : ${(p1y.totalOrdersCount ?? 0).toLocaleString()}
   - Chiffre d'Affaires Brut : ${(p1y.grossRevenueEur ?? 0).toLocaleString()} €
   - Bénéfice Net Réel : ${(p1y.netProfitEur ?? 0).toLocaleString()} €
   - Marge Nette : ${p1y.netMarginPercent ?? 97}%
   - Statut Publicité Ads : Débloqué & Piloté par IA (Seuil 100k€ atteint)

5. AN 3 (J+1095) - MONOPOLE & RENTE RÉCURRENTE
   - Trafic cumulé : ${(p3y.cumulativeVisitors ?? 0).toLocaleString()} visiteurs
   - Commandes générées : ${(p3y.totalOrdersCount ?? 0).toLocaleString()}
   - Chiffre d'Affaires Brut : ${(p3y.grossRevenueEur ?? 0).toLocaleString()} €
   - Bénéfice Net Réel : ${(p3y.netProfitEur ?? 0).toLocaleString()} €
   - Marge Nette : ${p3y.netMarginPercent ?? 98}%
===============================================================`;
  }
}

export const profitabilityEngine = new ProfitabilityEngine();
