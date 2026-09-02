import React, { useState } from 'react';
import { Layers, Plus, Sparkles, CheckCircle2, Trash2, ArrowRight, Zap, DollarSign } from 'lucide-react';
import { store } from '../../services/store';
import { ProductBundle, DigitalProduct } from '../../types';

export const BundlesView: React.FC = () => {
  const [bundles, setBundles] = useState<ProductBundle[]>(store.getBundles());
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAiBundling, setIsAiBundling] = useState(false);
  
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundleSubtitle, setBundleSubtitle] = useState('');
  const [bundleDesc, setBundleDesc] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(30);

  const calculateOriginalTotal = () => {
    return products
      .filter(p => selectedProductIds.includes(p.id))
      .reduce((sum, p) => sum + (p.pricing?.recommendedPrice ?? 47), 0);
  };

  const calculateBundlePrice = () => {
    const original = calculateOriginalTotal();
    return Math.round(original * (1 - discountPercent / 100));
  };

  const handleToggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter(i => i !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleAiAutoBundle = async () => {
    if (products.length < 2) return;
    setIsAiBundling(true);
    await new Promise(res => setTimeout(res, 600));

    const topProducts = products.slice(0, 3);
    const pIds = topProducts.map(p => p.id);
    const orig = topProducts.reduce((s, p) => s + (p.pricing?.recommendedPrice ?? 47), 0);
    const disc = 35;
    const bPrice = Math.round(orig * 0.65);

    store.addBundle({
      title: 'Ultimate AI Growth & Scale Power Suite',
      subtitle: 'Complete end-to-end operational playbook, prompt archives & automated workflows.',
      description: 'Get our top 3 highest-rated digital products in one master bundle at our deepest discount of the season.',
      productIds: pIds,
      bundlePrice: bPrice,
      originalPrice: orig,
      discountPercent: disc,
      badge: `⚡ VIP Super-Bundle (Save ${disc}%)`,
      coverUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80',
      status: 'active'
    });

    setBundles(store.getBundles());
    setIsAiBundling(false);
  };

  const handleCreateBundle = () => {
    if (!bundleTitle || selectedProductIds.length < 2) return;
    const originalPrice = calculateOriginalTotal();
    const bundlePrice = calculateBundlePrice();

    store.addBundle({
      title: bundleTitle,
      subtitle: bundleSubtitle || 'The complete all-in-one power bundle.',
      description: bundleDesc || 'Supercharge your results by combining multiple specialized toolkits at our steepest discount.',
      productIds: selectedProductIds,
      bundlePrice,
      originalPrice,
      discountPercent,
      badge: `Special Bundle ⚡ Save ${discountPercent}%`,
      coverUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80',
      status: 'active'
    });

    setBundles(store.getBundles());
    setShowCreateModal(false);
    setBundleTitle('');
    setSelectedProductIds([]);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Bundles & Cross-Sell Maximizer</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {bundles.length} Active Bundles
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Boost Average Order Value (AOV) by dynamically pairing related templates, playbooks, and prompt vaults.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAiAutoBundle}
            disabled={isAiBundling}
            className="px-3.5 py-2 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isAiBundling ? 'Synthesizing Synergies...' : 'AI Auto-Bundle Suggester'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Bundle</span>
          </button>
        </div>
      </div>

      {/* Bundles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bundles.map(bundle => (
          <div
            key={bundle.id}
            className="bg-[#111114] border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#1A1A1E] text-amber-300 border border-slate-800">
                  {bundle.badge}
                </span>
                <span className="text-xs text-emerald-400 font-bold font-mono">
                  {bundle.salesCount} sold (€{bundle.revenue.toLocaleString()})
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{bundle.title}</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{bundle.subtitle}</p>

              {/* Included products */}
              <div className="space-y-2 mb-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Included Products ({bundle.productIds.length})</div>
                {bundle.productIds.map(pid => {
                  const prod = products.find(p => p.id === pid);
                  return (
                    <div
                      key={pid}
                      className="bg-[#16161A] p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between font-mono"
                    >
                      <span className="truncate max-w-[240px] font-sans">{prod?.title || pid}</span>
                      <span className="text-slate-500 line-through text-[11px]">€{prod?.pricing?.recommendedPrice ?? 47}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 line-through mr-2 font-mono">€{bundle.originalPrice}</span>
                <span className="text-2xl font-black text-white font-mono">€{bundle.bundlePrice}</span>
                <span className="ml-2 text-xs text-emerald-400 font-bold">(-{bundle.discountPercent}%)</span>
              </div>

              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                Active in Store
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Bundle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create New Power Bundle</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Bundle Title</label>
              <input
                type="text"
                value={bundleTitle}
                onChange={e => setBundleTitle(e.target.value)}
                placeholder="e.g. The Full Cold Email Mastery Stack"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Select Products to Include (Min 2)</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-[#16161A] rounded-xl border border-slate-800">
                {products.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1A1E] cursor-pointer text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => handleToggleProduct(p.id)}
                        className="rounded border-slate-700 accent-indigo-600"
                      />
                      <span className="truncate max-w-[250px]">{p.title}</span>
                    </div>
                    <span className="font-mono text-emerald-400">€{p.pricing?.recommendedPrice ?? 47}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Bundle Discount (%)</label>
              <input
                type="number"
                min={10}
                max={70}
                value={discountPercent}
                onChange={e => setDiscountPercent(Number(e.target.value))}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            {selectedProductIds.length >= 2 && (
              <div className="bg-[#16161A] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Original Sum: </span>
                  <span className="line-through text-slate-500 font-mono">€{calculateOriginalTotal()}</span>
                </div>
                <div>
                  <span className="text-slate-400">Bundle Price: </span>
                  <span className="text-emerald-400 font-bold text-base font-mono">€{calculateBundlePrice()}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1A1A1E] text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBundle}
                disabled={!bundleTitle.trim() || selectedProductIds.length < 2}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
              >
                Create Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
