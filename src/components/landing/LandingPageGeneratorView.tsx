import React, { useState } from 'react';
import { FileText, Sparkles, Split, CheckCircle2, Copy, Eye, Sliders } from 'lucide-react';
import { store } from '../../services/store';
import { DigitalProduct } from '../../types';

export const LandingPageGeneratorView: React.FC = () => {
  const [products] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct>(products[0]);
  const [activeVariant, setActiveVariant] = useState<'A' | 'B'>('A');

  // Variant A: Direct Transformation & ROI
  const variantA = {
    headline: `Eliminate 15+ Hours of Manual Friction in ${selectedProduct?.category}`,
    subheadline: `The complete ${selectedProduct?.format?.replace('_', ' ')} engineered to ${selectedProduct?.promisedOutcome?.toLowerCase()}`,
    cta: `Get Instant Access to ${selectedProduct?.title} (€${selectedProduct?.pricing?.recommendedPrice})`,
    urgencyText: `Instant Download • Lifetime Updates • 30-Day Money-Back Guarantee`
  };

  // Variant B: Contrarian & Negative Framing
  const variantB = {
    headline: `Why 90% of ${selectedProduct?.targetAudience} Fail (And How to Fix It)`,
    subheadline: `Stop burning weeks on trial and error. Deploy the proven blueprint inside ${selectedProduct?.title} in under 10 minutes.`,
    cta: `Unlock the Full System for Just €${selectedProduct?.pricing?.recommendedPrice}`,
    urgencyText: `Verified by 1,200+ customers • Zero Fluff Guarantee`
  };

  const currentCopy = activeVariant === 'A' ? variantA : variantB;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Landing Page & Conversion Generator</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Direct-Response Multi-Variant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated copywriting engine generating high-converting hero sections, proof stacks, objection handlers, and A/B split variants.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveVariant('A')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeVariant === 'A'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Variant A (ROI & Direct)
          </button>
          <button
            onClick={() => setActiveVariant('B')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeVariant === 'B'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Variant B (Contrarian Truth)
          </button>
        </div>
      </div>

      {/* Product Selection */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {products.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProduct(p)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
              selectedProduct?.id === p.id
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Live Landing Page Mockup Preview */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Browser Topbar Frame */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            <span className="ml-3 font-mono text-[11px] text-slate-400">https://digitalfactory.io/products/{selectedProduct?.id}</span>
          </div>
          <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-mono">
            Active Split Variant {activeVariant}
          </span>
        </div>

        {/* Hero Section */}
        <div className="p-8 md:p-14 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{selectedProduct?.packaging?.badge || 'Top Rated'}</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {currentCopy.headline}
          </h2>

          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {currentCopy.subheadline}
          </p>

          <div className="pt-4 flex flex-col items-center gap-3">
            <button className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm md:text-base shadow-lg shadow-indigo-600/30 transition-transform active:scale-95">
              {currentCopy.cta}
            </button>
            <div className="text-xs text-slate-500 font-medium">
              {currentCopy.urgencyText}
            </div>
          </div>
        </div>

        {/* Benefits & Proof Section */}
        <div className="bg-slate-900/60 p-8 md:p-12 border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">What is included inside this complete package</h3>
              <p className="text-xs text-slate-400 mt-1">Everything you need to execute immediately with zero fluff</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProduct?.packaging?.keyBenefits.map((benefit, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Guarantee Box */}
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-2">
              <div className="text-sm font-bold text-indigo-300">🛡️ 100% Risk-Free 30-Day Money-Back Guarantee</div>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                {selectedProduct?.packaging?.guarantee || 'If you are not completely blown away by the quality and immediate time saved, email us for a 100% instant refund.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
