import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Printer, 
  CheckCircle2, 
  Search, 
  X, 
  ShieldCheck, 
  Key, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Package, 
  Mail, 
  Clock, 
  Eye, 
  FileCode, 
  Layers
} from 'lucide-react';
import { store } from '../../services/store';
import { billingService } from '../../services/billingService';
import { currencyAgent } from '../../services/currencyAgent';
import { 
  Order, 
  DigitalProduct, 
  FrenchInvoice 
} from '../../types';
import { 
  downloadProductPackage, 
  downloadJsonPromptPack, 
  downloadOrderReceiptTxt 
} from '../../utils/fileDownloader';

interface CustomerAccessPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrder?: Order | null;
  initialEmail?: string;
}

export const CustomerAccessPortalModal: React.FC<CustomerAccessPortalModalProps> = ({
  isOpen,
  onClose,
  initialOrder,
  initialEmail = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialEmail || initialOrder?.customer.email || '');
  const [activeOrder, setActiveOrder] = useState<Order | null>(initialOrder || null);
  const [selectedProductPreview, setSelectedProductPreview] = useState<DigitalProduct | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const allOrders = store.getOrders();
  const allProducts = store.getProducts();

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Search by email, orderNumber, or downloadToken
    const match = allOrders.find(
      o => o.customer.email.toLowerCase() === query || 
           o.orderNumber.toLowerCase() === query ||
           o.downloadToken.toLowerCase() === query ||
           o.id.toLowerCase() === query
    );

    if (match) {
      setActiveOrder(match);
      setFeedback(null);
    } else {
      // Find orders with partial email
      const partialMatch = allOrders.find(o => o.customer.email.toLowerCase().includes(query));
      if (partialMatch) {
        setActiveOrder(partialMatch);
        setFeedback(null);
      } else {
        setFeedback(`Aucune commande trouvée pour "${searchQuery}". Vérifiez l'adresse e-mail ou le numéro de commande.`);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResendEmail = (order: Order) => {
    setEmailSentNotice(`✨ Un nouvel e-mail de réception avec vos liens et licences a été réexpédié à ${order.customer.email}.`);
    store.addLog('info', 'delivery', `E-mail d'accès et reçu de commande #${order.orderNumber} renvoyé à ${order.customer.email}.`);
    setTimeout(() => setEmailSentNotice(null), 4000);
  };

  const handleDownloadKit = (order: Order, prod: DigitalProduct) => {
    downloadProductPackage(prod);
    store.recordDownload(order.downloadToken, prod.title);
    setFeedback(`✅ Téléchargement de "${prod.title}" lancé avec succès.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDownloadJson = (order: Order, prod: DigitalProduct) => {
    downloadJsonPromptPack(prod);
    store.recordDownload(order.downloadToken, `${prod.title}-json`);
    setFeedback(`✅ Pack Prompts JSON pour "${prod.title}" téléchargé.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDownloadReceipt = (order: Order) => {
    downloadOrderReceiptTxt(order, allProducts);
    setFeedback(`✅ Reçu officiel de commande #${order.orderNumber} téléchargé.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDownloadInvoice = (order: Order) => {
    const invoice = billingService.generateInvoiceForOrder(order, '15 Avenue des Champs-Élysées, 75008 Paris');
    billingService.printOrDownloadInvoice(invoice);
    setFeedback(`✅ Facture officielle émise pour la commande #${order.orderNumber}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Espace Réception & Mes Téléchargements</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Accès Immédiat 24/7
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Retrouvez vos achats, téléchargez vos kits numériques, licences et factures conformes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar / Order Lookup */}
        <form onSubmit={handleSearch} className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Entrez votre e-mail (ex: client@gmail.com) ou n° de commande (ex: DPF-2026-1042)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Accéder à mes Achats
          </button>
        </form>

        {/* Notices */}
        {feedback && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 animate-fade-in shrink-0">
            {feedback}
          </div>
        )}

        {emailSentNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{emailSentNotice}</span>
          </div>
        )}

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
          {activeOrder ? (
            <div className="space-y-6">
              {/* Order Overview Header Card */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">Commande #{activeOrder.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {activeOrder.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Client : <strong className="text-slate-200">{activeOrder.customer.name}</strong> ({activeOrder.customer.email}) • {new Date(activeOrder.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-emerald-400 font-mono">
                      {currencyAgent.formatPrice(activeOrder.totalAmount)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {activeOrder.paymentMethod}
                    </div>
                  </div>
                </div>

                {/* Digital Token & License Security Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-400 text-[11px]">Clé de Licence Token :</span>
                    <code className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                      {activeOrder.downloadToken}
                    </code>
                    <button
                      onClick={() => handleCopy(activeOrder.downloadToken, 'token')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Copier la clé"
                    >
                      {copiedKey === 'token' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResendEmail(activeOrder)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Mail className="w-3 h-3 text-indigo-400" />
                      <span>Renvoyer par E-mail</span>
                    </button>

                    <button
                      onClick={() => handleDownloadInvoice(activeOrder)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Facture PDF</span>
                    </button>

                    <button
                      onClick={() => handleDownloadReceipt(activeOrder)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3 h-3 text-slate-400" />
                      <span>Reçu .TXT</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Purchased Products Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Vos Fichiers & Kits Disponibles ({activeOrder.items.length})</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Limite : {activeOrder.downloadCount} / {activeOrder.maxDownloads} téléchargements
                  </span>
                </div>

                <div className="space-y-3">
                  {activeOrder.items.map((item, idx) => {
                    // Try exact match or base product for bumps
                    const rawId = item.productId.replace(/^bump-/, '');
                    const prod = allProducts.find(p => p.id === rawId || p.id === item.productId) || allProducts[0];

                    return (
                      <div
                        key={idx}
                        className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                                {prod.format.replace('_', ' ')}
                              </span>
                              <h4 className="font-bold text-white text-sm truncate">{item.productTitle}</h4>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1">{prod.subtitle}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-mono font-bold text-emerald-400">
                              {currencyAgent.formatPrice(item.price)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                          <div className="text-[11px] text-slate-500">
                            📦 {prod.content?.downloadableFiles?.length || 3} fichiers inclus • Licence perpétuelle
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedProductPreview(selectedProductPreview?.id === prod.id ? null : prod)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{selectedProductPreview?.id === prod.id ? 'Masquer Aperçu' : 'Consulter en Ligne'}</span>
                            </button>

                            <button
                              onClick={() => handleDownloadJson(activeOrder, prod)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              title="Télécharger les prompts au format JSON pour l'import dans vos outils"
                            >
                              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Prompts .JSON</span>
                            </button>

                            <button
                              onClick={() => handleDownloadKit(activeOrder, prod)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger le Kit (.MD)</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive In-Modal Live Preview */}
                        {selectedProductPreview?.id === prod.id && (
                          <div className="mt-3 p-4 bg-slate-900 rounded-xl border border-indigo-500/20 space-y-4 animate-fade-in text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Contenu Prêt à l'Emploi ({prod.content?.prompts?.length || 0} Prompts, {prod.content?.templates?.length || 0} Templates)</span>
                              </span>
                              <span className="text-[10px] text-slate-500">Cliquez pour copier directement</span>
                            </div>

                            {/* Prompts Peek */}
                            {prod.content?.prompts && prod.content.prompts.length > 0 && (
                              <div className="space-y-2">
                                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Prompts Clés :</div>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                  {prod.content.prompts.map((p, pIdx) => (
                                    <div key={pIdx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-indigo-300 text-[11px]">{p.title}</span>
                                        <button
                                          onClick={() => handleCopy(p.prompt, `prompt-${pIdx}`)}
                                          className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                                        >
                                          {copiedKey === `prompt-${pIdx}` ? 'Copié !' : 'Copier'}
                                        </button>
                                      </div>
                                      <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap line-clamp-3">
                                        {p.prompt}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Checklist SOP Peek */}
                            {prod.content?.checklistItems && prod.content.checklistItems.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Checklist Opérationnelle :</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {prod.content.checklistItems.slice(0, 4).map((c, cIdx) => (
                                    <div key={cIdx} className="bg-slate-950 p-2 rounded border border-slate-800/60 text-[11px] text-slate-300 flex items-start gap-1.5">
                                      <span className="text-emerald-400 font-bold">✓</span>
                                      <span className="truncate">{c.step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Generic File/Module Summary Fallback */}
                            {(!prod.content?.prompts?.length && !prod.content?.checklistItems?.length) && (
                              <div className="space-y-3">
                                {prod.content?.downloadableFiles && prod.content.downloadableFiles.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Fichiers Inclus :</div>
                                    {prod.content.downloadableFiles.map((f, fIdx) => (
                                      <div key={fIdx} className="bg-slate-950 p-2.5 rounded border border-slate-800/60 flex flex-col gap-1 text-[11px]">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-slate-200">{f.filename}</span>
                                          <span className="text-slate-500 font-mono text-[10px]">{f.size}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 italic">"{f.contentSnippet}"</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State / Search Guide */
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">Recherchez vos Commandes</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Entrez votre adresse e-mail ou votre numéro de commande ci-dessus pour accéder à tout moment à vos fichiers, factures et clés de licence sans limite de temps.
                </p>
              </div>

              {/* Quick sample orders list */}
              {allOrders.length > 0 && (
                <div className="pt-4 max-w-md mx-auto text-left space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Dernières commandes enregistrées :
                  </div>
                  <div className="space-y-1.5">
                    {allOrders.slice(0, 3).map(o => (
                      <button
                        key={o.id}
                        onClick={() => {
                          setSearchQuery(o.customer.email);
                          setActiveOrder(o);
                        }}
                        className="w-full bg-slate-950 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-800 text-left text-xs flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-white">#{o.orderNumber}</span>
                          <span className="text-slate-400 ml-2">({o.customer.email})</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">
                          {currencyAgent.formatPrice(o.totalAmount)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Téléchargements sécurisés & cryptés • Garantie 7 jours Satisfait ou Remboursé</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Fermer l'Espace
          </button>
        </div>
      </div>
    </div>
  );
};
