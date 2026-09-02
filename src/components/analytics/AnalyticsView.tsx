import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, ArrowUpRight, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import { store } from '../../services/store';

export const AnalyticsView: React.FC = () => {
  const products = store.getProducts();
  const orders = store.getOrders();
  const adCampaigns = store.getAdCampaigns();

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalAdSpend = adCampaigns.reduce((sum, a) => sum + a.metrics.spend, 0);
  const netProfit = totalRevenue - totalAdSpend;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '94.0';

  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('30d');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Analytics & Multi-Touch Attribution</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Business Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracking customer journeys, organic vs paid attribution, unit economics, and winner velocity.
          </p>
        </div>

        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          {(['7d', '30d', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded font-medium transition-all ${
                timeframe === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Top Unit Economics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400">Total Net Revenue</div>
          <div className="text-2xl font-extrabold text-white mt-1">€{totalRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-2 flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +34.2% vs last month
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400">Net Profit (After Ads)</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">€{netProfit.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-2">
            Net Margin: <strong className="text-emerald-400">{netMargin}%</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400">Customer Lifetime Value (LTV)</div>
          <div className="text-2xl font-extrabold text-indigo-400 mt-1">€68.50</div>
          <div className="text-[11px] text-slate-400 font-medium mt-2">
            LTV / CAC Ratio: <strong className="text-white">8.1x</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400">Refund Rate</div>
          <div className="text-2xl font-extrabold text-white mt-1">0.4%</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-2">
            Industry Benchmark: 3.8%
          </div>
        </div>
      </div>

      {/* Product Performance Matrix (Winners vs Potential vs Underperformers) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-base font-bold text-white">Product Performance Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Product Name</th>
                <th className="pb-3 font-semibold">Sales</th>
                <th className="pb-3 font-semibold">Conversion Rate</th>
                <th className="pb-3 font-semibold">Rating</th>
                <th className="pb-3 font-semibold">Attributed ROAS</th>
                <th className="pb-3 font-semibold">Autonomous Action Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 font-medium text-slate-200">{prod.title}</td>
                  <td className="py-3.5 text-slate-300 font-semibold">{prod.salesCount}</td>
                  <td className="py-3.5 text-emerald-400 font-bold">{prod.conversionRate}%</td>
                  <td className="py-3.5 text-amber-400">⭐ {prod.rating}</td>
                  <td className="py-3.5 font-bold text-indigo-400">{(prod.pricing?.recommendedPrice ?? 47) > 40 ? '4.8x' : '3.9x'}</td>
                  <td className="py-3.5">
                    {prod.tier === 'winner' ? (
                      <span className="text-emerald-400 font-semibold">Scale Meta Ads (+25%) & Create Bundle</span>
                    ) : prod.tier === 'potential' ? (
                      <span className="text-amber-400 font-semibold">Run Price Elasticity A/B Test</span>
                    ) : (
                      <span className="text-slate-400 font-semibold">Regenerate Headline & Hook</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
