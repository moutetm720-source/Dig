import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Eye, 
  Trash2, 
  Plus, 
  Sliders, 
  DollarSign, 
  Layers,
  ArrowRight,
  ExternalLink,
  Zap,
  RefreshCw,
  Copy
} from 'lucide-react';
import { store } from '../../services/store';
import { DigitalProduct, ProductFormat, ProductStatus } from '../../types';
import { downloadProductPackage, downloadJsonPromptPack } from '../../utils/fileDownloader';

interface ProductFactoryViewProps {
  setCurrentView: (view: string) => void;
}

export const ProductFactoryView: React.FC<ProductFactoryViewProps> = ({ setCurrentView }) => {
  const [products, setProducts] = useState<DigitalProduct[]>(() => store.getProducts());
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [qualityModalProduct, setQualityModalProduct] = useState<DigitalProduct | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNiche, setNewNiche] = useState('AI Automation');
  const [newFormat, setNewFormat] = useState<ProductFormat>('template');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    return store.subscribe(() => {
      setProducts(store.getProducts());
    });
  }, []);

  const handleCreateProduct = async () => {
    if (!newTitle.trim()) return;
    setIsGenerating(true);
    try {
      const opp = store.addOpportunity({
        title: newTitle,
        niche: newNiche,
        category: newNiche,
        targetAudience: 'Professionals & Creators',
        problemStatement: 'Manual friction and lack of battle-tested standard workflows.',
        suggestedFormat: newFormat,
        demandScore: 92,
        competitionScore: 40,
        monetizationScore: 90,
        trendScore: 92,
        productionDifficulty: 25,
        estimatedMargin: 96,
        estimatedConversionPotential: 4.8,
        estimatedRevenuePotential: 5400,
        signals: [
          { source: 'google_trends', query: newTitle.toLowerCase(), volume: '18k/mo', growthRate: '+150%', intent: 'transactional' }
        ],
        status: 'selected'
      });

      await store.createProductFromOpportunity(opp.id, newFormat);
      setProducts(store.getProducts());
      setShowCreateModal(false);
      setNewTitle('');
    } catch (err) {
      console.error('Error creating product:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = (id: string, status: ProductStatus) => {
    store.updateProduct(id, { status });
    setProducts(store.getProducts());
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Delete this product from catalog?')) {
      store.deleteProduct(id);
      setProducts(store.getProducts());
      setSelectedProduct(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Product Factory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {products.length} Products Built
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end product synthesis: Market validation, deep content generation, AI Quality Gate, and packaging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate New Product</span>
          </button>
        </div>
      </div>

      {/* 10-Step Autonomous Pipeline Overview */}
      <div className="bg-[#111114] border border-slate-800 p-5 rounded-xl">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Production Pipeline</span>
          </span>
          <span className="text-slate-500 text-[11px] font-normal">Quality Gate: min. 80/100 threshold</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 text-center text-xs">
          {[
            { step: '1. Signal', label: 'Opportunity', icon: '📡' },
            { step: '2. Concept', label: 'Positioning', icon: '💡' },
            { step: '3. Market', label: 'Validation', icon: '📊' },
            { step: '4. Outline', label: 'Architecture', icon: '📋' },
            { step: '5. Content', label: 'AI Synthesis', icon: '✍️' },
            { step: '6. Gate', label: 'Quality Audit', icon: '🛡️' },
            { step: '7. Package', label: 'Packaging', icon: '🎁' },
            { step: '8. Pricing', label: 'Elasticity', icon: '🏷️' },
            { step: '9. Landing', label: 'Sales Copy', icon: '🚀' },
            { step: '10. Launch', label: 'Stripe & Ads', icon: '💳' }
          ].map((item, idx) => (
            <div key={idx} className="bg-[#16161A] p-2.5 rounded-lg border border-slate-800/80 flex flex-col items-center">
              <div className="text-base mb-1">{item.icon}</div>
              <div className="text-[10px] text-indigo-400 font-bold">{item.step}</div>
              <div className="text-slate-300 text-[11px] font-medium truncate w-full">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-[#111114] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-[#16161A] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Product Catalog</h2>
          <span className="text-[11px] text-slate-400">All products linked to Stripe & Secure Digital Vault</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#16161A] text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                <th className="py-3.5 px-4">Title & Category</th>
                <th className="py-3.5 px-4">Format</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Status & Publication</th>
                <th className="py-3.5 px-4">Quality Gate</th>
                <th className="py-3.5 px-4">Duplicate Risk</th>
                <th className="py-3.5 px-4">Sales / Rev</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map(prod => (
                <tr key={prod.id} className="hover:bg-[#16161A]/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200 text-xs max-w-xs truncate">{prod.title}</div>
                    <div className="text-[11px] text-slate-500">{prod.category} • {prod.targetAudience}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1A1A1E] text-slate-300 border border-slate-800 uppercase">
                      {prod.format?.replace('_', ' ') || 'TEMPLATE'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white">€{prod.pricing?.recommendedPrice ?? 29}</div>
                    {prod.pricing?.abTestActive && (
                      <div className="text-[10px] text-indigo-400 font-mono">A/B: €{prod.pricing?.testPrice}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {prod.status === 'published' ? (
                      <button
                        onClick={() => handleStatusChange(prod.id, 'draft')}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                        title="Produit actif sur la boutique. Cliquez pour passer en brouillon"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Publié Boutique</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(prod.id, 'published')}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Brouillon non visible. Cliquez pour publier immédiatement"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Publier Direct</span>
                      </button>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => setQualityModalProduct(prod)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 ${
                        (prod.quality?.overall ?? 85) >= 90
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : (prod.quality?.overall ?? 85) >= 80
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{prod.quality?.overall ?? 85}/100</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[11px] font-mono ${prod.duplicateSimilarityScore < 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {prod.duplicateSimilarityScore}% match
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200 font-semibold">{prod.salesCount ?? 0} sales</div>
                    <div className="text-emerald-400 font-bold">€{(prod.revenue ?? 0).toLocaleString()}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {prod.tier === 'winner' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        🟢 Winner
                      </span>
                    ) : prod.tier === 'potential' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        🟡 Potential
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        🔴 Underperformer
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedProduct(prod)}
                        className="p-1.5 rounded-lg bg-[#1A1A1E] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                        title="Inspect Content & Files"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 rounded-lg bg-[#1A1A1E] hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Gate Inspector Modal */}
      {qualityModalProduct && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">AI Quality Gate Scorecard</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">{qualityModalProduct.title}</p>
              </div>
              <button onClick={() => setQualityModalProduct(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Composite Score</div>
                <div className="text-3xl font-extrabold text-white">{qualityModalProduct.quality.overall}<span className="text-sm font-normal text-slate-500">/100</span></div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PASSED (Iteration #{qualityModalProduct.quality.iterationCount})
                </span>
              </div>
            </div>

            {/* Criteria breakdown */}
            <div className="space-y-3">
              {[
                { label: 'Real Utility & Actionability', score: qualityModalProduct.quality.utility },
                { label: 'Originality & Non-Fluff Factor', score: qualityModalProduct.quality.originality },
                { label: 'Depth & Completeness', score: qualityModalProduct.quality.depth },
                { label: 'Structural Coherence', score: qualityModalProduct.quality.coherence },
                { label: 'Readability & Formatting', score: qualityModalProduct.quality.readability },
                { label: 'Perceived Commercial Value', score: qualityModalProduct.quality.perceivedValue },
                { label: 'Marketing Copy Readiness', score: qualityModalProduct.quality.marketingQuality }
              ].map(c => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{c.label}</span>
                    <span className="text-slate-200 font-bold">{c.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback items */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-bold text-slate-300 mb-1">Audit Observations:</div>
              {qualityModalProduct.quality.feedback.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setQualityModalProduct(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Content Inspector Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                  {(selectedProduct.format || 'template').replace('_', ' ')}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedProduct.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedProduct.subtitle}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {/* Structure & Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Executive Summary</div>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedProduct.content?.summary || selectedProduct.problemSolved || selectedProduct.subtitle}</p>
              
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-2">Structure & Modules</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(selectedProduct.content?.structure || []).map((item, idx) => (
                  <div key={idx} className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Downloadable Files in Vault */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Digital Assets in Vault</div>
              <div className="space-y-2">
                {(selectedProduct.content?.downloadableFiles || []).map(file => (
                  <div key={file.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{file.filename}</div>
                      <div className="text-slate-500 text-[11px]">{file.size} • {file.contentSnippet}</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                      {(file.fileType || 'zip').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Benefits */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Benefits & FAQ</div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {(selectedProduct.packaging?.keyBenefits || []).map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-emerald-400">✦</span> {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {selectedProduct.status === 'published' ? (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedProduct.id, 'draft');
                      setSelectedProduct({ ...selectedProduct, status: 'draft' });
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Publié Boutique (Cliquer pour Dépublier)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedProduct.id, 'published');
                      setSelectedProduct({ ...selectedProduct, status: 'published' });
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-emerald-500/30 text-amber-300 hover:text-emerald-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚡ Publier au Catalogue Direct</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadProductPackage(selectedProduct)}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <span>Download Master Package (.md)</span>
                </button>
                <button
                  onClick={() => downloadJsonPromptPack(selectedProduct)}
                  className="px-3 py-2 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Download Prompts (.json)</span>
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Product Generator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Generate Product via AI Factory</h3>
                <p className="text-xs text-slate-400">Synthesize complete vendable asset package.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 100+ High-Converting SaaS Cold Outreach Templates..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Niche</label>
                <input
                  type="text"
                  value={newNiche}
                  onChange={e => setNewNiche(e.target.value)}
                  placeholder="e.g. B2B Sales, Solopreneur, UI Design..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Asset Format</label>
                <select
                  value={newFormat}
                  onChange={e => setNewFormat(e.target.value as ProductFormat)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="template">Notion / Software Template</option>
                  <option value="prompt_pack">AI Prompt Vault (Claude / GPT)</option>
                  <option value="checklist">Actionable Launch Checklist</option>
                  <option value="guide">Step-by-Step Tactical Guide</option>
                  <option value="pro_kit">Pro Agency & Freelance Kit</option>
                  <option value="preset">Preset / UI Kit System</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={isGenerating || !newTitle.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating & Auditing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Launch AI Generation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
