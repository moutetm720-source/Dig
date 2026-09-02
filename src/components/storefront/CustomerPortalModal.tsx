import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  ShoppingBag, 
  Download, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  ExternalLink, 
  HelpCircle, 
  AlertCircle,
  Copy,
  Check,
  Package,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Send
} from 'lucide-react';
import { store } from '../../services/store';
import { Order, OrderItem, DigitalProduct } from '../../types';
import { currencyAgent } from '../../services/currencyAgent';
import { billingService } from '../../services/billingService';
import { 
  downloadDigitalZipBundle, 
  downloadJsonPromptPack, 
  downloadMarkdownChecklist, 
  downloadOrderReceiptTxt 
} from '../../utils/fileDownloader';

interface CustomerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const CustomerPortalModal: React.FC<CustomerPortalModalProps> = ({
  isOpen,
  onClose,
  initialEmail = ''
}) => {
  const [searchEmail, setSearchEmail] = useState(initialEmail);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [refundSuccessId, setRefundSuccessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'library' | 'support'>('orders');

  // Support ticket form state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const allOrders = store.getOrders();
    // Default to initialEmail if provided, or last created order email, or first available customer email
    let targetEmail = searchEmail.trim().toLowerCase();

    if (!targetEmail) {
      if (allOrders.length > 0) {
        targetEmail = allOrders[0].customer.email.toLowerCase();
        setSearchEmail(targetEmail);
      }
    }

    if (targetEmail) {
      filterOrdersByEmail(targetEmail);
    } else {
      setCustomerOrders(allOrders);
      if (allOrders.length > 0) {
        setSelectedOrder(allOrders[0]);
      }
    }
  }, [isOpen, initialEmail]);

  const filterOrdersByEmail = (emailStr: string) => {
    const allOrders = store.getOrders();
    const query = emailStr.trim().toLowerCase();
    
    if (!query) {
      setCustomerOrders(allOrders);
      if (allOrders.length > 0) setSelectedOrder(allOrders[0]);
      return;
    }

    const matched = allOrders.filter(o => 
      o.customer.email.toLowerCase().includes(query) ||
      o.orderNumber.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query)
    );

    setCustomerOrders(matched);
    if (matched.length > 0) {
      setSelectedOrder(matched[0]);
    } else {
      setSelectedOrder(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    filterOrdersByEmail(searchEmail);
  };

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleDownloadInvoice = (order: Order) => {
    // Generate or fetch existing French legal invoice
    const existingInvoices = billingService.getInvoices();
    let invoice = existingInvoices.find(inv => inv.orderId === order.id);
    if (!invoice) {
      invoice = billingService.generateInvoiceForOrder(order);
    }

    if (invoice) {
      billingService.printOrDownloadInvoice(invoice);
    } else {
      const receiptText = `FACTURE & JUSTIFICATIF D'ACHAT DIGITAL
========================================
Numéro de Commande : ${order.orderNumber}
Date : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}
Client : ${order.customer.name} (${order.customer.email})
Montant Total : ${order.totalAmount} ${order.currency || 'EUR'}
Mode de Règlement : ${order.paymentMethod || 'Carte Bancaire / Stripe'}
Statut : ${order.paymentStatus === 'paid' ? 'Payé et Validé' : 'En attente'}

Articles :
${order.items.map(it => `- ${it.productTitle} (${it.format}) : €${it.price}`).join('\n')}

Mentions Légales : Conforme Article L 123-1-1 et Art. 293 B du CGI.
Livraison numérique immédiate.`;
      downloadOrderReceiptTxt(order.orderNumber, receiptText);
    }
  };

  const handleDownloadAllZip = (order: Order) => {
    const products = store.getProducts();
    const firstItem = order.items[0];
    const fullProduct = products.find(p => p.id === firstItem?.productId) || products[0];
    if (fullProduct) {
      downloadDigitalZipBundle(fullProduct, order.orderNumber);
    }
  };

  const handleDownloadJson = (order: Order, item: OrderItem) => {
    const products = store.getProducts();
    const prod = products.find(p => p.id === item.productId) || products[0];
    if (prod) {
      downloadJsonPromptPack(prod);
    }
  };

  const handleDownloadMarkdown = (order: Order, item: OrderItem) => {
    const products = store.getProducts();
    const prod = products.find(p => p.id === item.productId) || products[0];
    if (prod) {
      downloadMarkdownChecklist(prod);
    }
  };

  const handleRequestRefund = (orderId: string) => {
    store.refundOrder(orderId);
    setRefundSuccessId(orderId);
    const updatedOrders = store.getOrders();
    setCustomerOrders(updatedOrders.filter(o => o.customer.email.toLowerCase().includes(searchEmail.trim().toLowerCase())));
    const updatedSel = updatedOrders.find(o => o.id === orderId);
    if (updatedSel) setSelectedOrder(updatedSel);
    setTimeout(() => setRefundSuccessId(null), 4000);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    store.addLog(
      'info',
      'delivery',
      `[Support Client] Demande reçue de ${searchEmail || 'client'} : "${supportSubject || 'Demande de livrable'}" - Traitement autonome 24/7 engagé.`
    );

    setSupportSubmitted(true);
    setTimeout(() => {
      setSupportSubject('');
      setSupportMessage('');
      setSupportSubmitted(false);
    }, 4000);
  };

  // Get distinct products across customer orders for Digital Library view
  const allPurchasedProductIds = Array.from(
    new Set(customerOrders.flatMap(o => o.items.map(it => it.productId)))
  );
  const libraryProducts = store.getProducts().filter(p => allPurchasedProductIds.includes(p.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Espace Client & Suivi des Achats</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Accès Immédiat 2026
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Consultez vos commandes, téléchargez vos fichiers numériques et accédez à vos factures officielles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Navigation Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick Email Lookup Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Votre e-mail ou N° de commande..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            {searchEmail && (
              <button 
                type="button" 
                onClick={() => { setSearchEmail(''); filterOrdersByEmail(''); }}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'orders' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Commandes ({customerOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'library' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ma Bibliothèque ({libraryProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'support' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Assistance & FAQ</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {customerOrders.length === 0 && activeTab !== 'support' ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Aucun achat trouvé pour cette recherche</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Vérifiez l'adresse e-mail saisie ou effectuez votre première commande sur notre boutique pour débloquer vos accès instantanés.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
              >
                <span>Découvrir le Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : activeTab === 'orders' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order List Column */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Historique de vos commandes
                </div>
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {customerOrders.map(order => {
                    const isSelected = selectedOrder?.id === order.id;
                    const isRefunded = order.paymentStatus === 'refunded';

                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold text-white">
                            {order.orderNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRefunded
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isRefunded ? 'Remboursé' : 'Payé & Validé'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="font-bold text-white font-mono">
                            {currencyAgent.formatPrice(order.totalAmount)}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-300 truncate">
                          {order.items.map(it => it.productTitle).join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details Column */}
              {selectedOrder ? (
                <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Commande {selectedOrder.orderNumber}
                      </div>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        Détail des Livrables & Facturation
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                        title="Télécharger la facture officielle conforme avec TVA"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Facture PDF/TXT</span>
                      </button>
                      <button
                        onClick={() => handleDownloadAllZip(selectedOrder)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tout Télécharger (.ZIP)</span>
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Guarantee Banner */}
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-emerald-300">
                          Garantie Satisfait ou Remboursé 7 Jours Active
                        </div>
                        <p className="text-[11px] text-emerald-200/80 mt-0.5">
                          Conformément à nos engagements, vous disposez d'une garantie totale de 7 jours sur vos fichiers numériques.
                        </p>
                      </div>
                    </div>
                    {selectedOrder.paymentStatus === 'paid' && (
                      <button
                        onClick={() => handleRequestRefund(selectedOrder.id)}
                        className="px-2.5 py-1 bg-emerald-900/60 hover:bg-rose-900/60 text-emerald-200 hover:text-rose-200 text-[10px] font-bold rounded-lg border border-emerald-500/30 hover:border-rose-500/30 shrink-0 transition-colors"
                      >
                        Demander un remboursement 1-clic
                      </button>
                    )}
                  </div>

                  {refundSuccessId === selectedOrder.id && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Votre demande a été traitée avec succès. Le remboursement a été émis sur votre mode de paiement.</span>
                    </div>
                  )}

                  {/* Purchased Items List with Individual Downloads */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Fichiers & Livrables Inclus dans votre Achat
                    </div>

                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => {
                        const licenseKey = `LIC-2026-${selectedOrder.orderNumber.replace(/[^0-9]/g, '')}-${item.productId.slice(-4).toUpperCase()}`;

                        return (
                          <div
                            key={idx}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 uppercase">
                                    {item.format.replace('_', ' ')}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Accès Permanent
                                  </span>
                                </div>
                                <h4 className="font-bold text-white text-sm mt-1">
                                  {item.productTitle}
                                </h4>
                              </div>
                              <span className="text-sm font-bold text-white font-mono shrink-0">
                                {currencyAgent.formatPrice(item.price)}
                              </span>
                            </div>

                            {/* Commercial License Key Box */}
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 text-slate-400 min-w-0">
                                <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="text-[11px] text-slate-400 shrink-0">Clé de Licence :</span>
                                <span className="font-mono text-[11px] text-slate-200 truncate">{licenseKey}</span>
                              </div>
                              <button
                                onClick={() => handleCopyKey(licenseKey, item.productId)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1 shrink-0 transition-colors"
                              >
                                {copiedKeyId === item.productId ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copié</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copier</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Download Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                onClick={() => handleDownloadJson(selectedOrder, item)}
                                className="px-3 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>Pack Prompts (.JSON)</span>
                              </button>
                              <button
                                onClick={() => handleDownloadMarkdown(selectedOrder, item)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>Guides & Checklists (.MD)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : activeTab === 'library' ? (
            /* Digital Library Tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Votre Bibliothèque Numérique</h3>
                  <p className="text-xs text-slate-400">Tous vos produits numériques débloqués accessibles en un clic.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {libraryProducts.map(prod => (
                  <div
                    key={prod.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-500/20 uppercase">
                          {prod.format.replace('_', ' ')}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1.5 leading-snug">
                          {prod.title}
                        </h4>
                      </div>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        Actif
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {prod.subtitle}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => downloadDigitalZipBundle(prod)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger le Pack (.ZIP)</span>
                      </button>
                      <button
                        onClick={() => downloadJsonPromptPack(prod)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                        title="Télécharger prompts JSON"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Support & Help Tab */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">Centre d'Assistance Client 24/7</h3>
                <p className="text-xs text-slate-400">
                  Une question sur vos livrables ou besoin d'un format spécifique ? Notre équipe et nos agents autonomes vous répondent en direct.
                </p>
              </div>

              {supportSubmitted ? (
                <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-2 animate-fade-in">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Message transmis avec succès</h4>
                  <p className="text-xs text-emerald-200/90">
                    Votre demande d'assistance a été enregistrée. Une confirmation a été transmise à votre adresse e-mail.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Votre Adresse E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Objet de votre demande
                    </label>
                    <input
                      type="text"
                      required
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="Ex: Question sur le déploiement du template Notion..."
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Détail de votre message
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Décrivez votre besoin..."
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer la demande au Support 24/7</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Paiements & Livraisons Sécurisés par Stripe & Blockchain</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
