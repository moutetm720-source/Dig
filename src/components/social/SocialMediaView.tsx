import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Calendar, 
  Plus, 
  Sparkles, 
  Twitter, 
  Linkedin, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Send,
  Eye,
  MessageSquare,
  Repeat,
  Heart,
  Zap
} from 'lucide-react';
import { store } from '../../services/store';
import { generateMarketingContent } from '../../services/geminiService';
import { ContentItem, ContentChannel, DigitalProduct } from '../../types';

export const SocialMediaView: React.FC = () => {
  const [contentItems, setContentItems] = useState<ContentItem[]>(
    store.getContentItems().filter(i => ['twitter', 'linkedin', 'tiktok', 'instagram'].includes(i.channel))
  );
  const [products, setProducts] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [publishImmediately, setPublishImmediately] = useState(true);

  const [newProductId, setNewProductId] = useState<string>(products[0]?.id || '');
  const [newChannel, setNewChannel] = useState<ContentChannel>('twitter');
  const [newTitle, setNewTitle] = useState('');
  const [newHook, setNewHook] = useState('');
  const [newBody, setNewBody] = useState('');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setContentItems(
        store.getContentItems().filter(i => ['twitter', 'linkedin', 'tiktok', 'instagram'].includes(i.channel))
      );
      setProducts(store.getProducts());
    });
    return () => { unsub(); };
  }, []);

  const handleAiAutoGenerate = async () => {
    const prod = products.find(p => p.id === newProductId) || products[0];
    if (!prod) return;
    setIsAiGenerating(true);
    try {
      const generated = await generateMarketingContent(prod, 'short_post', newChannel);
      if (generated.title) setNewTitle(generated.title);
      if (generated.hook) setNewHook(generated.hook);
      if (generated.body) setNewBody(generated.body);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handlePublishNow = (id: string) => {
    store.updateContentItem(id, {
      status: 'published',
      publishedDate: new Date().toISOString()
    });
    store.addLog('success', 'marketing', `Post social média publié avec succès.`);
  };

  const handleCreatePost = () => {
    if (!newTitle.trim() && !newBody.trim()) return;
    const prod = products.find(p => p.id === newProductId);

    store.addContentItem({
      productId: newProductId || (prod?.id || 'general'),
      productTitle: prod?.title || 'Digital Product',
      type: 'short_post',
      channel: newChannel,
      title: newTitle || `${newChannel.toUpperCase()} Viral Post`,
      hook: newHook || undefined,
      body: newBody || 'Practical step-by-step breakdown...',
      cta: `Link in bio to get ${prod?.title || 'the toolkit'}`,
      status: publishImmediately ? 'published' : 'scheduled',
      publishedDate: publishImmediately ? new Date().toISOString() : undefined,
      scheduledDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      performance: { impressions: publishImmediately ? 350 : 0, clicks: publishImmediately ? 14 : 0, conversions: 0, attributedRevenue: 0 }
    });

    store.addLog('success', 'marketing', `Nouveau post social média ${publishImmediately ? 'publié' : 'programmé'} sur ${newChannel.toUpperCase()}`);
    setShowCreateModal(false);
    setNewTitle('');
    setNewHook('');
    setNewBody('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const filteredItems = contentItems.filter(item => {
    if (selectedChannel !== 'all' && item.channel !== selectedChannel) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Social Media Engine & Calendar</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Multi-Angle Viral Growth
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated organic thread generation, LinkedIn authority posts, short-form video hooks, and scheduled publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Social Post / Thread</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-[#111114] border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'twitter', label: 'Twitter / X' },
            { id: 'linkedin', label: 'LinkedIn' },
            { id: 'tiktok', label: 'TikTok / Reels' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedChannel(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedChannel === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A1A1E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredItems.length} active social posts
        </div>
      </div>

      {/* Social Posts Grid with Realistic Mockup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="bg-[#111114] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="space-y-3">
              {/* Channel Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1A1A1E] border border-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xs">
                    {item.channel === 'twitter' ? '𝕏' : item.channel === 'linkedin' ? 'in' : '▶'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white capitalize">{item.channel}</div>
                    <div className="text-[10px] text-slate-500">{new Date(item.scheduledDate).toLocaleDateString()}</div>
                  </div>
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
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                      title="Publier ce post sur le réseau immédiatement"
                    >
                      <Send className="w-2.5 h-2.5" />
                      <span>Publier Direct</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Hook */}
              {item.hook && (
                <div className="p-3 rounded-lg bg-[#16161A] border border-slate-800 text-xs text-indigo-300 font-medium leading-relaxed">
                  "{item.hook}"
                </div>
              )}

              {/* Body */}
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar font-sans">
                {item.body}
              </p>

              {/* Product link pill */}
              <div className="p-2 rounded-lg bg-[#16161A] border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="truncate">🎯 {item.productTitle}</span>
                <span className="text-indigo-400 font-medium">Link in CTA</span>
              </div>
            </div>

            {/* Performance Stats & Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {item.performance.impressions.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5" />
                  {item.performance.clicks}
                </span>
                <span className="text-emerald-400 font-bold">
                  €{item.performance.attributedRevenue}
                </span>
              </div>

              <button
                onClick={() => handleCopy(`${item.hook ? item.hook + '\n\n' : ''}${item.body}\n\n${item.cta}`, item.id)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-[#222228] text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy ready-to-publish text"
              >
                {copySuccess === item.id ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111114] border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Generate Social Media Post / Thread</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Digital Product</label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Channel Format</label>
              <select
                value={newChannel}
                onChange={e => setNewChannel(e.target.value as ContentChannel)}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="twitter">Twitter / X (Multi-Tweet Thread)</option>
                <option value="linkedin">LinkedIn (Long-form Authority Post)</option>
                <option value="tiktok">TikTok / Reels (Viral Script & Hook)</option>
                <option value="instagram">Instagram (Carousel Slide Content)</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] text-slate-400">Generate high-converting copy?</span>
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
              <label className="block text-slate-300 font-medium mb-1">Post Title / Topic</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. 5 steps to automate cold outreach in 2026..."
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Opening Hook (Line 1)</label>
              <input
                type="text"
                value={newHook}
                onChange={e => setNewHook(e.target.value)}
                placeholder="e.g. Most founders waste 10 hours/week on manual tasks. Here is the fix:"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Body / Thread Content</label>
              <textarea
                rows={5}
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Thread tweets or bullet points..."
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-sans"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="socialPublishImmediately"
                checked={publishImmediately}
                onChange={e => setPublishImmediately(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="socialPublishImmediately" className="text-xs text-slate-300 cursor-pointer">
                <strong>Publier immédiatement</strong> sur le compte
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1A1A1E] text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newBody.trim() && !newTitle.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{publishImmediately ? 'Publier Immédiatement' : 'Programmer le Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
