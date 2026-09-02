import React, { useState } from 'react';
import { Users, Search, DollarSign, Mail, Tag, ArrowUpRight } from 'lucide-react';
import { store } from '../../services/store';
import { Customer } from '../../types';

export const CustomersView: React.FC = () => {
  const [customers] = useState<Customer[]>(store.getCustomers());
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Customer CRM & Lifetime Value</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {customers.length} Profiles
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audience segments, repeat purchase rates, purchase history, and automated RFM tagging.
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Total Orders</th>
                <th className="py-3.5 px-4 font-semibold">Lifetime Value (LTV)</th>
                <th className="py-3.5 px-4 font-semibold">Last Purchase</th>
                <th className="py-3.5 px-4 font-semibold">Segment Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(cust => (
                <tr key={cust.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{cust.name}</div>
                    <div className="text-[11px] text-slate-400">{cust.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-200">{cust.ordersCount ?? 1} order(s)</td>
                  <td className="py-3.5 px-4 font-extrabold text-emerald-400">€{cust.totalSpent.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-slate-400">{cust.lastPurchaseDate ? new Date(cust.lastPurchaseDate).toLocaleDateString() : 'Recent'}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {cust.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-indigo-300 border border-slate-700">
                          {tag}
                        </span>
                      ))}
                    </div>
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
