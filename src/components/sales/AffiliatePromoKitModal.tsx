import React, { useState, useEffect } from 'react';
import { 
  X, 
  Video, 
  Mic, 
  FileText, 
  Image, 
  Send, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  Share2, 
  Radio, 
  CheckCircle2, 
  Flame, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Headphones, 
  Mail, 
  MessageSquare, 
  Layers,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { AffiliatePartner, AffiliatePromoKit, DigitalProduct } from '../../types';
import { store } from '../../services/store';
import { affiliatePromoKitService } from '../../services/affiliatePromoKitService';
import { downloadAffiliatePromoKitMarkdown } from '../../utils/fileDownloader';

interface AffiliatePromoKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliate: AffiliatePartner | null;
  initialProductId?: string;
}

export const AffiliatePromoKitModal: React.FC<AffiliatePromoKitModalProps> = ({
  isOpen,
  onClose,
  affiliate,
  initialProductId
}) => {
  const [products, setProducts] = useState<DigitalProduct[]>(store.getProducts());
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [currentKit, setCurrentKit] = useState<AffiliatePromoKit | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'audio' | 'text' | 'visuals'>('video');
  const [selectedTextPlatform, setSelectedTextPlatform] = useState<'twitter' | 'linkedin' | 'newsletter' | 'discord'>('twitter');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmissionSuccess, setTransmissionSuccess] = useState<string | null>(null);
  const [transmissionChannel, setTransmissionChannel] = useState<'email' | 'discord_webhook' | 'telegram_bot' | 'dashboard_direct'>('email');

  useEffect(() => {
    const prods = store.getProducts();
    setProducts(prods);
    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(initialProductId || prods[0].id);
    }
  }, [initialProductId]);

  useEffect(() => {
    if (!affiliate || !selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId) || products[0];
    if (!prod) return;

    // Check existing or generate new kit
    const existingKits = affiliatePromoKitService.getKitsForAffiliate(affiliate.id);
    let kit = existingKits.find(k => k.productId === prod.id);
    if (!kit) {
      kit = affiliatePromoKitService.generatePromoKit(affiliate, prod, 20);
    }
    setCurrentKit(kit);

    // Default text platform based on channel
    if (affiliate.channel === 'newsletter') setSelectedTextPlatform('newsletter');
    else if (affiliate.channel === 'linkedin') setSelectedTextPlatform('linkedin');
    else if (affiliate.channel === 'discord') setSelectedTextPlatform('discord');
    else setSelectedTextPlatform('twitter');

    if (affiliate.channel === 'tiktok' || affiliate.channel === 'youtube') {
      setActiveMediaTab('video');
    } else if (affiliate.channel === 'newsletter' || affiliate.channel === 'twitter' || affiliate.channel === 'linkedin') {
      setActiveMediaTab('text');
    }
  }, [affiliate, selectedProductId, products]);

  if (!isOpen || !affiliate || !currentKit) return null;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleTransmit = () => {
    if (!currentKit) return;
    setIsTransmitting(true);
    setTransmissionSuccess(null);

    setTimeout(() => {
      const res = affiliatePromoKitService.transmitPromoKitToAffiliate(currentKit.id, transmissionChannel);
      setIsTransmitting(false);
      setTransmissionSuccess(res.message);
      // Reload kit state
      const updatedKit = affiliatePromoKitService.getKitById(currentKit.id);
      if (updatedKit) setCurrentKit(updatedKit);
      setTimeout(() => setTransmissionSuccess(null), 5000);
    }, 500);
  };

  const handleDownloadMarkdown = () => {
    if (!currentKit) return;
    const md = affiliatePromoKitService.generateMarkdownExport(currentKit);
    downloadAffiliatePromoKitMarkdown(md, currentKit.affiliateHandle, currentKit.productTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#101015] border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-[#14141C] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Supports Promotionnels IA Sur-Mesure</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Code Partenaire : {affiliate.referralCode} (-20%)
              </span>
              <span className="text-xs text-slate-400 capitalize flex items-center gap-1">
                Canal : <strong className="text-white">{affiliate.channel}</strong> ({affiliate.handle})
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Kit de Vente & Supports Promotionnels :</span>
              <span className="text-indigo-400">{affiliate.name}</span>
            </h2>
          </div>

          {/* Product selector & Close */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 bg-[#1A1A24] px-3 py-1.5 rounded-xl border border-slate-700">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer max-w-[200px]"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1A1A24] text-white">
                    {p.title} (€{p.pricing?.recommendedPrice ?? 29})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Bar (Transmission & Export) */}
        <div className="px-6 py-3 bg-[#161620] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Canal de Transmission :</span>
            <select
              value={transmissionChannel}
              onChange={e => setTransmissionChannel(e.target.value as any)}
              className="bg-[#1C1C28] text-indigo-300 font-semibold px-2.5 py-1 rounded-lg border border-slate-700 outline-none text-xs"
            >
              <option value="email">📧 E-mail Direct ({affiliate.email})</option>
              <option value="discord_webhook">💬 Discord Webhook / Bot</option>
              <option value="telegram_bot">📱 Telegram Bot Broadcast</option>
              <option value="dashboard_direct">🌐 Espace Partenaire Sécurisé</option>
            </select>

            <button
              onClick={handleTransmit}
              disabled={isTransmitting}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTransmitting ? 'Envoi en cours...' : 'Transmettre à l\'Affilié'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(currentKit.affiliateTrackingUrl, 'tracking_url')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copiedSection === 'tracking_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'tracking_url' ? 'Lien Copié !' : 'Copier Lien Tracké'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Télécharger le pack complet au format Markdown"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Exporter Pack (.MD)</span>
            </button>
          </div>
        </div>

        {/* Transmission Notification Banner */}
        {transmissionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{transmissionSuccess}</span>
            </div>
            <span className="text-[11px] text-slate-400">Statut : Délivré</span>
          </div>
        )}

        {/* Media Format Selector Tabs */}
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-slate-800/80 bg-[#101015]">
          <button
            onClick={() => setActiveMediaTab('video')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeMediaTab === 'video'
                ? 'border-indigo-500 text-indigo-400 bg-[#161622]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#14141C]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>1. Support Vidéo & Storyboard (TikTok / Shorts / YouTube)</span>
          </button>

          <button
            onClick={() => setActiveMediaTab('audio')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeMediaTab === 'audio'
                ? 'border-indigo-500 text-indigo-400 bg-[#161622]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#14141C]'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>2. Support Audio & Podcast (Host-Read)</span>
          </button>

          <button
            onClick={() => setActiveMediaTab('text')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeMediaTab === 'text'
                ? 'border-indigo-500 text-indigo-400 bg-[#161622]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#14141C]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3. Support Texte & Copywriting (X / LinkedIn / Newsletter)</span>
          </button>

          <button
            onClick={() => setActiveMediaTab('visuals')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeMediaTab === 'visuals'
                ? 'border-indigo-500 text-indigo-400 bg-[#161622]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#14141C]'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>4. Directives Visuelles & Bannières</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* ========================================================================= */}
          {/* TAB 1: VIDEO SUPPORT & STORYBOARD */}
          {/* ========================================================================= */}
          {activeMediaTab === 'video' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Info */}
              <div className="p-4 rounded-xl bg-[#161622] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{currentKit.videoKit.formatTitle}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                      ⏱️ {currentKit.videoKit.durationSeconds}s Recommandées
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Scénario pensé pour capter l'attention dès les 3 premières secondes et guider le spectateur vers le lien tracké avec votre code promo.
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(currentKit.videoKit.fullSpokenScript, 'video_full_script')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedSection === 'video_full_script' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'video_full_script' ? 'Script Copié !' : 'Copier Script Parlé'}</span>
                </button>
              </div>

              {/* Hook Variations */}
              <div className="space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Accroches Virales & Chocs Visuels (0-3s) :</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentKit.videoKit.hookVariations.map((hook, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#14141C] border border-slate-800/80 space-y-2 flex flex-col justify-between">
                      <div className="text-slate-300 italic text-[11px]">« {hook} »</div>
                      <button
                        onClick={() => handleCopy(hook, `hook_${idx}`)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 self-end pt-1"
                      >
                        {copiedSection === `hook_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSection === `hook_${idx}` ? 'Copié' : 'Copier cette accroche'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Storyboard */}
              <div className="space-y-3">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Storyboard Séquencé & Direction Visuelle :</span>
                </div>

                <div className="space-y-3">
                  {currentKit.videoKit.storyboard.map((scene, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-indigo-300">
                            {scene.timeframe}
                          </span>
                          <span className="font-bold text-white text-xs">{scene.label}</span>
                        </div>
                        {scene.audioSoundCue && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            🎵 {scene.audioSoundCue}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Monitor className="w-3 h-3 text-cyan-400" />
                            <span>Direction Caméra & Visuel :</span>
                          </div>
                          <div className="text-slate-300 bg-[#181824] p-2.5 rounded-lg border border-slate-800/80">
                            {scene.visualCue}
                          </div>
                          <div className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                            Texte incrusté : <strong>{scene.onScreenText}</strong>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Mic className="w-3 h-3 text-emerald-400" />
                            <span>Script Vocal Parlé :</span>
                          </div>
                          <div className="text-white bg-[#181824] p-2.5 rounded-lg border border-slate-800/80 font-medium">
                            "{scene.spokenScript}"
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* YouTube Description & Pinned Comment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Texte de Description & Hashtags :</span>
                    <button
                      onClick={() => handleCopy(currentKit.videoKit.descriptionCopy, 'vid_desc')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedSection === 'vid_desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'vid_desc' ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap font-sans bg-[#181824] p-3 rounded-lg border border-slate-800/80 text-[11px] max-h-36 overflow-y-auto">
                    {currentKit.videoKit.descriptionCopy}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Commentaire Épinglé (High-CTR) :</span>
                    <button
                      onClick={() => handleCopy(currentKit.videoKit.pinnedCommentCopy, 'vid_pin')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedSection === 'vid_pin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'vid_pin' ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap font-sans bg-[#181824] p-3 rounded-lg border border-slate-800/80 text-[11px] max-h-36 overflow-y-auto">
                    {currentKit.videoKit.pinnedCommentCopy}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AUDIO & PODCAST SUPPORT */}
          {/* ========================================================================= */}
          {activeMediaTab === 'audio' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-xl bg-[#161622] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Script Audio Host-Read (Podcast & Émissions) - 60s</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      🎙️ Ton Naturel & Complice
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Rédigé pour une lecture spontanée en milieu d'épisode, évitant tout effet de publicité forcée ou de coupure artificielle.
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(currentKit.audioKit.scriptHostRead, 'audio_full_script')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedSection === 'audio_full_script' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'audio_full_script' ? 'Script Copié !' : 'Copier Script Audio'}</span>
                </button>
              </div>

              {/* Tone and Sound bed guidelines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#14141C] border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tonalité Conseillée de l'Hôte :</span>
                  <div className="text-slate-200 font-medium">{currentKit.audioKit.hostPersonaTone}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#14141C] border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Fond Musical & Ambiance :</span>
                  <div className="text-slate-200 font-mono text-[11px]">🎵 {currentKit.audioKit.soundBedRecommendation}</div>
                </div>
              </div>

              {/* Spoken Script Box */}
              <div className="p-5 rounded-xl bg-[#14141C] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-emerald-400" />
                    <span>Script Parlé Intégral (Téléprompteur Micro) :</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Durée estimée : ~55 à 65 secondes</span>
                </div>

                <div className="p-4 rounded-xl bg-[#181824] border border-slate-800/80 text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                  {currentKit.audioKit.scriptHostRead}
                </div>
              </div>

              {/* Pronunciation guide & Show notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>Guide de Prononciation du Code Promo :</span>
                  </div>
                  <div className="text-amber-300 font-mono text-[11px] bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    {currentKit.audioKit.couponPronunciationGuide}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Texte pour les Show Notes du Podcast :</span>
                    <button
                      onClick={() => handleCopy(currentKit.audioKit.showNotesBlurb, 'audio_show_notes')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedSection === 'audio_show_notes' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'audio_show_notes' ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <div className="text-slate-300 bg-[#181824] p-3 rounded-lg border border-slate-800/80 text-[11px]">
                    {currentKit.audioKit.showNotesBlurb}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TEXT & COPYWRITING SUPPORT */}
          {/* ========================================================================= */}
          {activeMediaTab === 'text' && (
            <div className="space-y-6 animate-fade-in">
              {/* Sub-platform Switcher */}
              <div className="flex flex-wrap items-center gap-2 p-2 bg-[#161622] rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs px-2">Format de Diffusion :</span>
                {[
                  { key: 'twitter', label: '🐦 X / Twitter Viral Thread', icon: '🐦' },
                  { key: 'newsletter', label: '📰 Newsletter & Email Blast VIP', icon: '📧' },
                  { key: 'linkedin', label: '💼 LinkedIn B2B & Case Study', icon: '💼' },
                  { key: 'discord', label: '💬 Discord / Telegram Drop', icon: '💬' }
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSelectedTextPlatform(p.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedTextPlatform === p.key
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Email Specific: Subject lines with open-rate predictions */}
              {selectedTextPlatform === 'newsletter' && currentKit.textKit.subjectLines && (
                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Objets d'Email Testés & Scoring d'Ouverture Prédictif :</span>
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {currentKit.textKit.subjectLines.map((sub, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#181824] border border-slate-800 flex flex-col justify-between gap-2">
                        <div className="text-white font-medium text-[11px]">{sub.subject}</div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            CTR Prévu : {sub.estimatedOpenRate}%
                          </span>
                          <button
                            onClick={() => handleCopy(sub.subject, `sub_${idx}`)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            {copiedSection === `sub_${idx}` ? 'Copié' : 'Copier'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Copy Body */}
              <div className="p-5 rounded-xl bg-[#14141C] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white text-sm">
                      {selectedTextPlatform === 'newsletter' ? 'Corps de la Newsletter Dédiée' : selectedTextPlatform === 'linkedin' ? 'Post B2B LinkedIn & Storytelling' : 'Thread Complet X / Twitter'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(currentKit.textKit.mainBodyCopy, 'text_main_body')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSection === 'text_main_body' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'text_main_body' ? 'Texte Copié !' : 'Copier le Texte Complet'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#181824] border border-slate-800/80 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-72 overflow-y-auto">
                  {currentKit.textKit.mainBodyCopy}
                </div>
              </div>

              {/* Value Points & Urgency (FOMO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-2">
                  <span className="font-bold text-white">Points Clés de Différenciation :</span>
                  <div className="space-y-1.5">
                    {currentKit.textKit.bulletPointsValue.map((bp, idx) => (
                      <div key={idx} className="text-slate-300 flex items-start gap-2 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{bp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Déclencheur d'Urgence Psychologique (FOMO) :</span>
                    </span>
                    <p className="text-amber-200 text-[11px] bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mt-2">
                      {currentKit.textKit.fomoUrgencyTrigger}
                    </p>
                  </div>

                  {currentKit.textKit.psUrgencyNote && (
                    <div className="text-slate-400 text-[11px] italic bg-[#181824] p-2.5 rounded-lg border border-slate-800/80">
                      <strong>Note P.S. :</strong> {currentKit.textKit.psUrgencyNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: VISUAL DIRECTIVES & PROMPTS */}
          {/* ========================================================================= */}
          {activeMediaTab === 'visuals' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-xl bg-[#161622] border border-slate-800 space-y-1">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white text-sm">Directives Visuelles & Prompts de Génération d'Images IA</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Ces prompts optimisés peuvent être copiés directement dans Midjourney, Flux ou DALL-E pour créer des vignettes, bannières et couvertures ultra attractives.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentKit.visualBannerPrompts.map((b, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#14141C] border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-white uppercase text-[10px] font-mono tracking-wider bg-slate-800 px-2 py-0.5 rounded">
                          {b.bannerType.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleCopy(b.promptText, `prompt_${idx}`)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                        >
                          {copiedSection === `prompt_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSection === `prompt_${idx}` ? 'Copié' : 'Copier Prompt'}</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Prompt IA Recommandé :</span>
                        <div className="p-3 rounded-lg bg-[#181824] border border-slate-800/80 text-slate-200 text-[11px] font-mono leading-relaxed">
                          "{b.promptText}"
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>Texte Titre suggéré : <em>« {b.headlineOverlay} »</em></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-[#14141C] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Garantie Satisfait ou Remboursé 7 Jours & Commissions 30% Payées en Crypto/Stripe.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Fermer
            </button>

            <button
              onClick={handleTransmit}
              disabled={isTransmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTransmitting ? 'Transmission...' : `Envoyer les Supports à ${affiliate.name}`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
