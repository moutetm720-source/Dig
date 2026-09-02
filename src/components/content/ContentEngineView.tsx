import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Calendar, FileText, Share2, Mail, Video, CheckCircle2, Copy, Zap, Send } from 'lucide-react';
import { store } from '../../services/store';
import { generateMarketingContent } from '../../services/geminiService';
import { ContentItem, ContentType, ContentChannel, DigitalProduct } from '../../types';

export const ContentEngineView: React.FC = () => {
  const [contentItems, setContentItems] = useState<ContentItem[]>(store.getContentItems());
  const [products, setProducts] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newHook, setNewHook] = useState('');
  const [newType, setNewType] = useState<ContentType>('seo_article');
  const [newChannel, setNewChannel] = useState<ContentChannel>('blog');
  const [newProductId, setNewProductId] = useState<string>(products[0]?.id || '');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setContentItems(store.getContentItems());
      setProducts(store.getProducts());
    });
    return () => { unsub(); };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAiAutoGenerate = async () => {
    const prod = products.find(p => p.id === newProductId) || products[0];
    if (!prod) return;
    setIsAiGenerating(true);
    try {
      const generated = await generateMarketingContent(prod, newType, newChannel);
      if (generated.title) setNewTitle(generated.title);
      if (generated.body) setNewBody(generated.body);
      if (generated.hook) setNewHook(generated.hook);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handlePublishNow = (id: string) => {
    store.updateContentItem(id, {
      status: 'published',
      publishedDate: new Date().toISOString()
    });
    store.addLog('success', 'marketing', `Contenu marketing publié avec succès sur le canal.`);
    showToast('Contenu marketing publié avec succès !');
  };

  const handleCreateContent = () => {
    if (!newTitle.trim()) return;
    const prod = products.find(p => p.id === newProductId);

    store.addContentItem({
      productId: newProductId || (prod?.id || 'general'),
      productTitle: prod?.title || 'General System',
      type: newType,
      channel: newChannel,
      title: newTitle,
      hook: newHook || undefined,
      body: newBody || 'Complete strategic overview highlighting practical steps and implementation details...',
      cta: `Get access to ${prod?.title || 'the toolkit'}`,
      status: publishImmediately ? 'published' : 'scheduled',
      publishedDate: publishImmediately ? new Date().toISOString() : undefined,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      performance: { impressions: publishImmediately ? 120 : 0, clicks: 0, conversions: 0, attributedRevenue: 0 }
    });

    store.addLog('success', 'marketing', `Nouveau contenu ${publishImmediately ? 'publié' : 'programmé'} : "${newTitle.slice(0, 35)}..."`);
    showToast(publishImmediately ? 'Contenu créé et publié immédiatement !' : 'Contenu programmé avec succès !');
    setShowCreateModal(false);
    setNewTitle('');
    setNewBody('');
    setNewHook('');
  };

  const filteredItems = contentItems.filter(item => {
    if (selectedChannel !== 'all' && item.channel !== selectedChannel) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Content Marketing Factory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {contentItems.length} Assets Created
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multi-channel content generation: SEO articles, Twitter threads, LinkedIn carousels, TikTok scripts, and newsletters.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Draft New Content</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <select
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Channels</option>
            <option value="blog">SEO Blog</option>
            <option value="twitter">Twitter / X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok / Shorts</option>
            <option value="email">Email Newsletters</option>
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Content Types</option>
            <option value="seo_article">SEO Deep-Dive</option>
            <option value="short_post">Short Post / Hook</option>
            <option value="carousel">Slide Carousel</option>
            <option value="video_script">Video Script</option>
            <option value="newsletter">Newsletter</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-semibold">{filteredItems.length}</span> pieces
        </div>
      </div>

      {/* Content Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700 uppercase">
                    {item.channel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'published'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    {item.status === 'published' ? 'PUBLIÉ' : 'PROGRAMMÉ'}
                  </span>

                  {item.status !== 'published' && (
                    <button
                      onClick={() => handlePublishNow(item.id)}
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors shadow-sm"
                      title="Publier ce contenu immédiatement"
                    >
                      <Send className="w-2.5 h-2.5" />
                      <span>Publier Direct</span>
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-2 leading-snug">{item.title}</h3>
              {item.hook && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs text-indigo-300 mb-3 italic">
                  "{item.hook}"
                </div>
              )}
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">{item.body}</p>

              <div className="text-[11px] text-slate-500 bg-slate-950/40 p-2 rounded border border-slate-800/60 mb-4">
                <strong>Linked Product:</strong> {item.productTitle}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span>👁️ {(item.performance?.impressions ?? 0).toLocaleString()} views</span>
                <span>🛒 {item.performance?.conversions ?? 0} sales</span>
                <span className="text-emerald-400 font-bold">€{item.performance?.attributedRevenue ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.body);
                    showToast('Texte copié dans le presse-papier !');
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy Content"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Generate Marketing Content</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Product</label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Distribution Channel</label>
                <select
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value as ContentChannel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="blog">SEO Blog</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok / Shorts</option>
                  <option value="email">Email Newsletter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Content Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as ContentType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="seo_article">SEO Deep Dive</option>
                  <option value="short_post">Short Post / Hook</option>
                  <option value="carousel">Slide Carousel</option>
                  <option value="video_script">Video Script</option>
                  <option value="newsletter">Newsletter</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] text-slate-400">Need instant copy ideas?</span>
              <button
                onClick={handleAiAutoGenerate}
                disabled={isAiGenerating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiGenerating ? 'Synthesizing with Free AI...' : 'Auto-Generate with Free AI'}</span>
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Headline / Subject</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. 3 Rules to 10x Cold Email Reply Rates in 2026..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Body / Copy</label>
              <textarea
                rows={4}
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Write or generate the content body..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="publishImmediately"
                checked={publishImmediately}
                onChange={e => setPublishImmediately(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="publishImmediately" className="text-xs text-slate-300 cursor-pointer">
                <strong>Publier immédiatement</strong> (Visible et indexé tout de suite)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContent}
                disabled={!newTitle.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{publishImmediately ? 'Publier Immédiatement' : 'Enregistrer & Programmer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
