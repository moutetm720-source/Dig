import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  Download, 
  ArrowRight, 
  ArrowLeft,
  Eye, 
  X, 
  Lock, 
  CreditCard, 
  FileText, 
  Layers, 
  Globe, 
  ChevronDown,
  Printer,
  Scale,
  Cookie,
  Zap,
  Coins,
  Sliders,
  Package,
  Plus,
  Flame,
  Boxes,
  FileCode,
  Mail,
  RefreshCw,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { store } from '../../services/store';
import { currencyAgent } from '../../services/currencyAgent';
import { billingService } from '../../services/billingService';
import { cryptoPaymentService } from '../../services/cryptoPaymentService';
import { storefrontAgentService } from '../../services/storefrontAgentService';
import { similarityGroupingAgent } from '../../services/similarityGroupingAgent';
import { trafficEngine } from '../../services/trafficEngine';
import { salesExplosionAgents } from '../../services/salesExplosionAgents';
import { 
  DigitalProduct, 
  ProductBundle, 
  Order, 
  LegalDocumentType, 
  FrenchInvoice,
  StorefrontAgentState,
  StorefrontCluster
} from '../../types';
import { 
  downloadProductPackage, 
  downloadJsonPromptPack, 
  downloadOrderReceiptTxt 
} from '../../utils/fileDownloader';
import { 
  SupportedLanguage, 
  SUPPORTED_LANGUAGES, 
  STOREFRONT_UI_I18N, 
  getLocalizedProduct 
} from '../../services/localizationService';
import { LegalModal } from '../legal/LegalModal';
import { CookieConsentBanner } from '../legal/CookieConsentBanner';
import { CryptoCheckoutModal } from '../crypto/CryptoCheckoutModal';
import { CustomerPortalModal } from './CustomerPortalModal';
import { StorefrontAiAssistant } from '../chat/StorefrontAiAssistant';

const LiveVisitorsBadge: React.FC = React.memo(() => {
  const [count, setCount] = useState(() => trafficEngine.getState().activeLiveVisitorsCount);
  useEffect(() => {
    return trafficEngine.subscribe(() => {
      const nextCount = trafficEngine.getState().activeLiveVisitorsCount;
      setCount(prev => prev !== nextCount ? nextCount : prev);
    });
  }, []);
  return <span>{count} en ligne</span>;
});

interface StorefrontViewProps {
  onClose?: () => void;
  isModerator?: boolean;
  onOpenModeratorLogin?: () => void;
  onSwitchToBackOffice?: () => void;
  onLockModerator?: () => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({ 
  onClose,
  isModerator = false,
  onOpenModeratorLogin,
  onSwitchToBackOffice,
  onLockModerator
}) => {
  const [products, setProducts] = useState<DigitalProduct[]>(() => store.getProducts().filter(p => p.status === 'published').slice(0, 90));
  const [bundles, setBundles] = useState<ProductBundle[]>(() => store.getBundles().filter(b => b.status === 'active'));
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [cart, setCart] = useState<Array<{ product: DigitalProduct; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<FrenchInvoice | null>(null);
  // Commande PENDING créée côté serveur (mode démo) — la livraison n'est
  // accordée que par /api/checkout/demo-complete (token serveur).
  const [pendingServerOrderId, setPendingServerOrderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClusterId, setSelectedClusterId] = useState<string>('all');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [customerPortalInitialOrder, setCustomerPortalInitialOrder] = useState<Order | null>(null);
  const [isProductLinkCopied, setIsProductLinkCopied] = useState(false);

  // Legal modal state
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalDocumentType>('mentions_legales');

  // Currency & Geo-IP Agent Reactive State
  const [geoInfo, setGeoInfo] = useState(currencyAgent.getGeoInfo());
  const [activeCurrency, setActiveCurrency] = useState(currencyAgent.getActiveCurrency());
  const [cryptoSettings, setCryptoSettings] = useState(cryptoPaymentService.getSettings());
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // Storefront Agent State
  const [agentState, setAgentState] = useState<StorefrontAgentState>(storefrontAgentService.getState());
  const [identicalGroups, setIdenticalGroups] = useState(similarityGroupingAgent.getGroups());

  // Customer Language Selection (French, English, Spanish, German)
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('fr');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const onboardingState = store.getOnboardingState();
  const storeBrandName = onboardingState.storeName || 'Nexus Digital Labs';
  const supportedCurrencies = currencyAgent.getAllSupportedCurrencies();

  useEffect(() => {
    // Record real storefront visit
    trafficEngine.recordRealUserInteraction('storefront_visit');

    // Deep link detection (?product=prod-123 or ?p=prod-123)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const targetProductId = searchParams.get('product') || searchParams.get('p');
      if (targetProductId) {
        const found = store.getProducts().find(p => p.id === targetProductId);
        if (found) {
          setSelectedProduct(found);
          trafficEngine.recordRealUserInteraction('product_view', { productId: found.id, productTitle: found.title });
        }
      }
    } catch (e) {}

    const unsubCurrency = currencyAgent.subscribe(() => {
      setGeoInfo(currencyAgent.getGeoInfo());
      setActiveCurrency(currencyAgent.getActiveCurrency());
    });

    const unsubStore = store.subscribe(() => {
      setProducts(store.getProducts().filter(p => p.status === 'published').slice(0, 90));
      setBundles(store.getBundles().filter(b => b.status === 'active'));
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });

    const unsubAgent = storefrontAgentService.subscribe(() => {
      setAgentState(storefrontAgentService.getState());
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });

    const unsubSim = similarityGroupingAgent.subscribe(() => {
      setIdenticalGroups(similarityGroupingAgent.getGroups());
    });

    const unsubCrypto = cryptoPaymentService.subscribe(() => {
      setCryptoSettings(cryptoPaymentService.getSettings());
    });

    return () => {
      unsubCurrency();
      unsubStore();
      unsubAgent();
      unsubSim();
      unsubCrypto();
    };
  }, []);

  // Dynamic SEO & OpenGraph / Twitter Cards & Schema.org JSON-LD
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (selectedProduct) {
      const price = selectedProduct.pricing?.recommendedPrice || 29;
      const title = `${selectedProduct.title} (${price}€) • ${storeBrandName}`;
      const desc = selectedProduct.subtitle || selectedProduct.problemSolved || selectedProduct.content?.summary || `Achetez ${selectedProduct.title} - Accès immédiat & mises à jour incluses.`;
      const url = `${window.location.origin}/?product=${selectedProduct.id}`;

      document.title = title;

      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', desc);

      // Update OG Tags
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', desc);
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', url);

      // Dynamic Schema.org Product JSON-LD Injection
      let scriptTag = document.getElementById('dynamic-product-jsonld');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'dynamic-product-jsonld';
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }

      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": selectedProduct.title,
        "description": desc,
        "image": selectedProduct.packaging?.coverUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "category": selectedProduct.category,
        "brand": {
          "@type": "Brand",
          "name": storeBrandName
        },
        "offers": {
          "@type": "Offer",
          "url": url,
          "priceCurrency": "EUR",
          "price": price,
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": storeBrandName
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": selectedProduct.rating || 4.9,
          "reviewCount": selectedProduct.reviewsCount || 48
        }
      };

      scriptTag.textContent = JSON.stringify(productSchema);
    } else {
      document.title = `${storeBrandName} • Boutique Officielle de Produits Digitaux & Kits IA`;
      const scriptTag = document.getElementById('dynamic-product-jsonld');
      if (scriptTag) scriptTag.remove();
    }
  }, [selectedProduct, storeBrandName]);

  const categories = useMemo(() => ['all', ...new Set(products.map(p => p.category))], [products]);
  const clusters = agentState.clusters;

  // Filter groups & products by selected cluster or category
  const filteredGroups = useMemo(() => {
    return identicalGroups.filter(g => {
      if (agentState.visualConfig.clusteringMode === 'smart_clusters') {
        if (selectedClusterId !== 'all') {
          const cluster = clusters.find(c => c.id === selectedClusterId);
          if (cluster && !g.allProductIds.some(pid => cluster.productIds.includes(pid))) return false;
        }
      } else {
        if (selectedCategory !== 'all' && g.primaryProduct.category !== selectedCategory) return false;
      }
      return true;
    });
  }, [identicalGroups, agentState.visualConfig.clusteringMode, selectedClusterId, clusters, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (agentState.visualConfig.clusteringMode === 'smart_clusters') {
        if (selectedClusterId !== 'all') {
          const cluster = clusters.find(c => c.id === selectedClusterId);
          if (cluster && !cluster.productIds.includes(p.id)) return false;
        }
      } else {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      }
      return true;
    });
  }, [products, agentState.visualConfig.clusteringMode, selectedClusterId, clusters, selectedCategory]);

  const addToCart = (product: DigitalProduct) => {
    trafficEngine.recordRealUserInteraction('add_to_cart', { productId: product.id, productTitle: product.title });
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id);
      if (exists) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const instantBuy = (product: DigitalProduct) => {
    trafficEngine.recordRealUserInteraction('add_to_cart', { productId: product.id, productTitle: product.title });
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id);
      if (exists) return prev;
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id));
  };

  const cartSubtotalEur = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.product.pricing?.recommendedPrice ?? 47) * item.quantity), 0);
  }, [cart]);

  const cartTotalEur = useMemo(() => {
    return Math.max(0, Math.round(cartSubtotalEur * (1 - promoDiscount / 100)));
  }, [cartSubtotalEur, promoDiscount]);

  // Verify Stripe Checkout Success returning from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && params.get('session_id')) {
      const sessionId = params.get('session_id')!;
      const pendingStr = localStorage.getItem('pending_checkout_cart');
      const pending = pendingStr ? JSON.parse(pendingStr) : null;
      
      localStorage.removeItem('pending_checkout_cart');
      window.history.replaceState({}, document.title, window.location.pathname);

      const verifySession = async (attempts = 0) => {
        setIsProcessingPayment(true);
        try {
          const res = await fetch(`/api/checkout/verify-session/${sessionId}`);
          if (!res.ok) {
            // 429/5xx transitoire : on réessaie avant de conclure (le paiement
            // peut être en cours de confirmation côté Stripe).
            if (attempts < 4) {
              setTimeout(() => verifySession(attempts + 1), 2500);
              return;
            }
            throw new Error(`HTTP ${res.status} — /api/checkout/verify-session`);
          }
          const verification = await res.json();

          if (verification.paid) {
            const custEmail = verification.customerEmail || (pending && pending.customerEmail) || '';
            const custName = verification.customerName || (pending && pending.customerName) || (custEmail ? custEmail.split('@')[0] : 'Client Stripe');
            const custAddr = verification.customerAddress || (pending && pending.customerAddress) || '';
            const finalTotal = verification.amountTotal || (pending && pending.cartTotalEur) || 47;

            // SÉCURITÉ : la livraison n'est accordée QUE si le serveur a confirmé
            // la commande (commande + token de téléchargement fournis par le serveur).
            if (verification.serverOrder) {
              const order = await store.completeOrderFromServer(verification.serverOrder, {
                customerName: custName,
                customerEmail: custEmail,
                customerAddress: custAddr
              });
              const invoice = billingService.generateInvoiceForOrder(order, custAddr);
              setGeneratedInvoice(invoice);
              setCompletedOrder(order);
              setCart([]);
              setIsCheckoutOpen(false);
              setIsCartOpen(false);
              store.addLog('success', 'stripe', `Confirmation Stripe : Paiement de ${finalTotal}€ validé — commande ${order.orderNumber} livrée par le serveur (Session: ${sessionId}, Client: ${custEmail || custName}).`);
            } else {
              // Paiement Stripe confirmé mais commande serveur introuvable :
              // pas de livraison automatique (fail-closed) — le support régularise.
              store.addLog(
                'error',
                'stripe',
                `Paiement Stripe confirmé mais commande serveur introuvable (Session: ${sessionId}). Livraison bloquée en attente de vérification. Contactez le support.`
              );
              alert('Votre paiement a bien été reçu. La livraison est en cours de vérification par notre équipe — vous recevrez vos accès très rapidement par e-mail.');
            }
          } else if (attempts < 4) {
            setTimeout(() => verifySession(attempts + 1), 2500);
            return;
          } else {
            // SÉCURITÉ : plus de confirmation "au cas où". Sans validation Stripe
            // définitive (paid === true), le produit n'est PAS délivré.
            store.addLog(
              'error',
              'stripe',
              `Paiement non confirmé (Session: ${sessionId}). La commande n'a pas été livrée. Si le paiement a bien été effectué, contactez le support.`
            );
          }
        } catch(e) {
          console.error("Erreur vérification Stripe", e);
        }
        setIsProcessingPayment(false);
      };
      verifySession();
    }
  }, []);

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'LAUNCH20' || code === 'VIP20') {
      setPromoDiscount(20);
      setAppliedPromoCode(code);
    } else if (code === 'FACTORY50') {
      setPromoDiscount(50);
      setAppliedPromoCode(code);
    } else if (code.length >= 4) {
      // Codes affiliés : vérifiés contre les affiliés enregistrés (la remise
      // effective est toujours recalculée côté serveur à la facturation).
      const affiliate = salesExplosionAgents.getAffiliates().find(
        a => a.referralCode?.trim().toUpperCase() === code
      );
      if (affiliate) {
        setPromoDiscount(Math.max(0, Math.min(50, affiliate.commissionRate || 30)));
        setAppliedPromoCode(code);
      } else {
        setPromoDiscount(0);
        setAppliedPromoCode('');
        alert('Code promo invalide. Essayez "LAUNCH20" pour 20% de remise.');
      }
    } else {
      setPromoDiscount(0);
      setAppliedPromoCode('');
      alert('Code promo invalide. Essayez "LAUNCH20" pour 20% de remise.');
    }
  };

  const handleDirectStripeCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessingPayment(true);
    
    try {
      const items = cart.map(i => ({
        productId: i.product.id,
        productTitle: i.product.title,
        price: i.product.pricing?.recommendedPrice || 47,
        quantity: i.quantity
      }));

      // SÉCURITÉ : la clé Stripe secrète n'est JAMAIS envoyée par le client —
      // le serveur utilise sa propre clé (env / base) et les prix du catalogue.
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          promoCode: appliedPromoCode || undefined,
          originUrl: window.location.origin + window.location.pathname,
          customerEmail: customerEmail.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.mode === 'stripe' && data.url) {
        localStorage.setItem('pending_checkout_cart', JSON.stringify({
          items, cartTotalEur, promoDiscount, customerName, customerEmail, customerAddress
        }));
        window.location.href = data.url;
        return;
      }

      // SÉCURITÉ : mode démo — la commande PENDING a été créée CÔTÉ SERVEUR.
      // La livraison n'aura lieu que via /api/checkout/demo-complete (token serveur).
      if (data.mode === 'demo' && data.serverOrderId) {
        setPendingServerOrderId(data.serverOrderId);
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
        return;
      }

      // Paiement indisponible (aucune passerelle configurée, pas de mode démo) :
      // pas de modal, pas de livraison — message explicite.
      setIsCartOpen(false);
      alert(data.message || 'Paiement indisponible : aucune passerelle de paiement configurée. Contactez le support.');
    } catch (e) {
      console.error("Checkout dispatch error:", e);
      setIsCartOpen(false);
      alert('Erreur lors de la création de la commande. Réessayez.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Mode démo : la livraison est accordée UNIQUEMENT par le serveur
  // (commande PENDING créée à l'ouverture du modal + token de téléchargement
  // généré côté serveur). Le navigateur ne s'auto-accorde plus d'accès.
  const handleDemoCheckout = async () => {
    if (!customerEmail.trim() || !customerName.trim() || cart.length === 0) return;
    if (!pendingServerOrderId) {
      alert('Commande serveur introuvable. Fermez ce modal et relancez le paiement.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const res = await fetch('/api/checkout/demo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverOrderId: pendingServerOrderId })
      });
      const data = await res.json();
      if (res.ok && data?.serverOrder) {
        const order = await store.completeOrderFromServer(data.serverOrder, {
          customerName,
          customerEmail,
          customerAddress
        });
        const invoice = billingService.generateInvoiceForOrder(order, customerAddress);
        setGeneratedInvoice(invoice);
        setCompletedOrder(order);
        setCart([]);
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        setPendingServerOrderId(null);
        store.addLog('success', 'stripe', `Simulation de paiement (Mode Démo) validée : commande ${order.orderNumber} livrée par le serveur.`);
      } else {
        alert(data?.error || "La commande démo n'a pas pu être finalisée côté serveur.");
      }
    } catch (e) {
      console.error(e);
      alert("La commande démo n'a pas pu être finalisée (serveur injoignable).");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Crypto : la commande est confirmée CÔTÉ SERVEUR (vérification on-chain).
  // serverOrder = { id, orderNumber, items, totalCents, paymentMethod, downloadToken }
  const handleCryptoPaymentSuccess = async (serverOrder: any) => {
    setIsCryptoModalOpen(false);

    const order = await store.completeOrderFromServer(serverOrder, {
      customerName,
      customerEmail,
      customerAddress
    });

    const invoice = billingService.generateInvoiceForOrder(order, customerAddress);
    setGeneratedInvoice(invoice);
    setCompletedOrder(order);
    setCart([]);
    setIsCartOpen(false);
    store.addLog('success', 'stripe', `Paiement crypto ${serverOrder?.paymentMethod || ''} confirmé on-chain — commande ${order.orderNumber} livrée par le serveur.`);
  };

  const openLegal = (tab: LegalDocumentType) => {
    setLegalTab(tab);
    setIsLegalModalOpen(true);
  };

  const activeCluster = clusters.find(c => c.id === selectedClusterId);

  // Hero theme class computation
  const heroGradientClass = agentState.visualConfig.heroTheme === 'midnight_executive'
    ? 'bg-radial from-slate-900 via-slate-950 to-black'
    : agentState.visualConfig.heroTheme === 'aurora_indigo'
    ? 'bg-radial from-violet-950/60 via-slate-900 to-slate-950'
    : agentState.visualConfig.heroTheme === 'minimal_slate'
    ? 'bg-slate-900'
    : 'bg-radial from-indigo-950/50 via-slate-900 to-slate-950';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 🤖 AI Agent Dynamic Merchandising & Currency Announcement Bar */}
      <div className="bg-indigo-950/90 border-b border-indigo-500/20 px-6 py-2 text-[11px] text-indigo-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            {agentState.visualConfig.dynamicNoticeText}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Customer Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-white font-semibold border border-indigo-500/30 transition-colors"
              title="Choisir la langue des produits & livrables"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-300" />
              <span>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.flag}</span>
              <span className="uppercase font-mono text-[11px]">{selectedLang}</span>
              <ChevronDown className="w-3 h-3 text-indigo-300" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 text-xs animate-fade-in">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Langue des Produits
                </div>
                <div className="space-y-0.5 py-1">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLang(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                        lang.code === selectedLang
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeLabel}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] uppercase">{lang.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Currency Switcher in Sub-bar */}
          <div className="relative">
            <button
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-white font-semibold border border-indigo-500/30 transition-colors"
            >
              <span>{activeCurrency.flag}</span>
              <span>{activeCurrency.code} ({activeCurrency.symbol})</span>
              <ChevronDown className="w-3 h-3 text-indigo-300" />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 text-xs animate-fade-in">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Devises Stripe Supportées
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5 py-1">
                  {supportedCurrencies.map(c => (
                    <button
                      key={c.code}
                      onClick={() => {
                        currencyAgent.setManualCurrency(c.code);
                        setIsCurrencyDropdownOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                        c.code === activeCurrency.code
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.code}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Store Top Bar (Strict 3-zone contract) */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Zone 1: Store Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            ⚡
          </div>
          <span className="font-bold text-base tracking-tight text-white">{storeBrandName}</span>
        </div>

        {/* Zone 2: Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-300">
          <button onClick={() => { setSelectedProduct(null); setSelectedClusterId('all'); }} className="hover:text-indigo-400 transition-colors">
            Catalogue Complet
          </button>
          <a href="#clusters" className="hover:text-indigo-400 transition-colors">
            Catégories & Collections
          </a>
          <a href="#bundles" className="hover:text-indigo-400 transition-colors">
            Packs & Bundles
          </a>
          <button
            onClick={() => {
              setCustomerPortalInitialOrder(null);
              setIsCustomerPortalOpen(true);
            }}
            className="hover:text-emerald-400 text-slate-300 flex items-center gap-1.5 transition-colors bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-lg border border-slate-700/60"
            title="Espace Client : Suivi des commandes, factures et téléchargements immédiats"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Espace Client</span>
          </button>
        </nav>

        {/* Zone 3: Cart Action & Moderator Access */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <LiveVisitorsBadge />
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all relative"
          >
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <span>Panier</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center -ml-0.5">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>

          {isModerator ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onSwitchToBackOffice) onSwitchToBackOffice();
                  else if (onClose) onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Back-Office Modérateur</span>
              </button>
              {onLockModerator && (
                <button
                  onClick={onLockModerator}
                  title="Verrouiller la session modérateur"
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenModeratorLogin}
              title="Accès Espace Modérateur (Alt+M)"
              className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-800/80 transition-colors text-xs flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] text-slate-400">Modérateur</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 space-y-12">
        {/* View 1: Digital Vault Order Completed Success View + French Invoice */}
        {completedOrder ? (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 animate-fade-in shadow-2xl">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Paiement Confirmé & Accès Immédiat !</h2>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Votre commande <span className="font-mono text-indigo-400 font-bold">{completedOrder.orderNumber || completedOrder.id}</span> a été validée avec succès via {completedOrder.paymentMethod}. Vos licences numériques et fichiers sont prêts ci-dessous.
              </p>
            </div>

            {/* Invoicing & Receipt Banner */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Facture Conforme : {generatedInvoice?.invoiceNumber || `FAC-${completedOrder.id}`}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Document officiel acquitté (conforme TVA & Code de Commerce)
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {generatedInvoice && (
                    <button
                      onClick={() => billingService.printOrDownloadInvoice(generatedInvoice)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Facture PDF</span>
                    </button>
                  )}
                  <button
                    onClick={() => downloadOrderReceiptTxt(completedOrder, products, generatedInvoice || undefined)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reçu .TXT</span>
                  </button>
                </div>
              </div>

              {/* License Token Ribbon */}
              <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">🔑 Clé Licence :</span>
                  <code className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                    {completedOrder.downloadToken}
                  </code>
                </div>
                <button
                  onClick={() => {
                    setCustomerPortalInitialOrder(completedOrder);
                    setIsCustomerPortalOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Ouvrir l'Espace Téléchargements & Prompts en Ligne</span>
                </button>
              </div>
            </div>

            {/* Purchased Items List with Individual Downloads */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Vos Kits Numériques Inclus ({completedOrder.items.length})</span>
                <span className="text-[11px] font-normal text-emerald-400">Accès Téléchargement Activé</span>
              </div>

              {completedOrder.items.map((item, idx) => {
                const rawId = item.productId.replace(/^bump-/, '');
                const prod = products.find(p => p.id === rawId || p.id === item.productId) || products[0];

                return (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{item.productTitle}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">{currencyAgent.formatPrice(item.price)}</span>
                        <span>•</span>
                        <span>{prod.format.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{prod.content?.downloadableFiles?.length || 3} fichiers</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {prod && (
                        <>
                          <button
                            onClick={() => {
                              downloadJsonPromptPack(prod);
                              store.recordDownload(completedOrder.downloadToken, `${prod.title}-json`);
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                            title="Télécharger prompts & templates au format JSON"
                          >
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span>JSON</span>
                          </button>

                          <button
                            onClick={() => {
                              downloadProductPackage(prod);
                              store.recordDownload(completedOrder.downloadToken, prod.title);
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Télécharger le Kit (.MD)</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setCustomerPortalInitialOrder(completedOrder);
                  setIsCustomerPortalOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Consulter Tout en Ligne (Espace Réception)</span>
              </button>

              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Retourner à la Boutique
              </button>
            </div>
          </div>
        ) : selectedProduct ? (
          /* View 2: Product Detail Page with Cross-Selling Recommendations */
          (() => {
            const localizedSel = getLocalizedProduct(selectedProduct, selectedLang);
            const uiLabels = STOREFRONT_UI_I18N[selectedLang];

            return (
          <div className="space-y-8 animate-fade-in">
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{selectedLang === 'en' ? 'Back to Catalog' : selectedLang === 'es' ? 'Volver al Catálogo' : selectedLang === 'de' ? 'Zurück zum Katalog' : 'Retour au Catalogue'}</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Product Visual Mockup Frame */}
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 flex flex-col items-center justify-center min-h-[380px] shadow-xl relative overflow-hidden">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                        {(selectedProduct.format || 'template').replace('_', ' ')}
                      </span>
                      {storefrontAgentService.getDynamicBadgeForProduct(selectedProduct.id) && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {storefrontAgentService.getDynamicBadgeForProduct(selectedProduct.id)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-3">{localizedSel.title}</h2>
                    <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">{localizedSel.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="font-bold text-slate-200">5.0 / 5.0</span>
                    <span className="text-slate-500">({selectedProduct.reviewsCount} avis vérifiés)</span>
                  </div>
                </div>

                {/* What's Inside Peek */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <span>{uiLabels.includedDeliverables}</span>
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">📦 Version 2026 LTS</span>
                  </div>
                  <div className="space-y-2">
                    {selectedProduct.content?.downloadableFiles?.map(file => (
                      <div key={file.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <div>
                            <span className="font-semibold text-slate-200">{file.filename}</span>
                            <div className="text-slate-500 text-[10px]">{file.size} • {file.contentSnippet}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono uppercase">
                          {file.fileType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Purchase Card & Bullet points */}
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-xl">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500 line-through mr-2">
                        {currencyAgent.formatPrice(selectedProduct.pricing?.maxPrice || ((selectedProduct.pricing?.recommendedPrice ?? 47) + 40))}
                      </span>
                      <span className="text-4xl font-extrabold text-white">
                        {currencyAgent.formatPrice(selectedProduct.pricing?.recommendedPrice ?? 47)}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {uiLabels.instantDelivery} ({activeCurrency.code})
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {localizedSel.problemSolved || localizedSel.subtitle}
                  </p>

                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <div className="text-xs font-bold text-slate-200">
                      {selectedLang === 'en' ? 'Key Benefits & Deliverables :' : selectedLang === 'es' ? 'Beneficios Clave y Entregables :' : selectedLang === 'de' ? 'Kernvorteile & Ergebnisse :' : 'Avantages Clés & Résultats :'}
                    </div>
                    {localizedSel.packaging?.keyBenefits?.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => instantBuy(selectedProduct)}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 text-emerald-200" />
                        <span>⚡ Acheter Immédiatement</span>
                      </button>
                      <button
                        onClick={() => addToCart(selectedProduct)}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{uiLabels.addToCartBtn}</span>
                      </button>
                    </div>

                    {/* Delivery Process Visualization */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 pb-1">
                      <div className="flex flex-col items-center gap-1 text-center w-1/3">
                        <Lock className="w-4 h-4 text-slate-500" />
                        <span>1. Paiement<br/>Sécurisé</span>
                      </div>
                      <div className="h-px bg-slate-800 w-8"></div>
                      <div className="flex flex-col items-center gap-1 text-center w-1/3">
                        <Mail className="w-4 h-4 text-indigo-400" />
                        <span className="text-slate-300">2. Réception<br/>Immédiate</span>
                      </div>
                      <div className="h-px bg-slate-800 w-8"></div>
                      <div className="flex flex-col items-center gap-1 text-center w-1/3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">3. Accès<br/>à Vie</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          <span>Stripe & Crypto</span>
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/?product=${selectedProduct.id}&utm_source=share`;
                          navigator.clipboard.writeText(url);
                          setIsProductLinkCopied(true);
                          setTimeout(() => setIsProductLinkCopied(false), 2500);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {isProductLinkCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Lien copié !</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3 text-indigo-400" />
                            <span>Partager ce produit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Témoignages / Social Proof Reassurances */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Ce que disent nos clients</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Basé sur +250 achats</span>
                  </div>
                  
                  {/* Verified Reviews Summary */}
                  <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Synthèse des Avis Clients Vérifiés</div>
                      <p className="text-sm text-indigo-200/80 leading-relaxed">
                        Retours consolidés de nos clients vérifiés : la grande majorité souligne un **gain de temps massif** (de plusieurs semaines) grâce à la propreté du code et aux architectures prêtes à l'emploi. Le support technique rapide et l'intégration Stripe sans couture sont également très appréciés.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-bold">JD</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-200">Julien D.</div>
                          <div className="text-[9px] text-slate-500">Développeur Freelance</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        "Exactement ce dont j'avais besoin pour lancer mon MVP. Le code est super propre et documenté. J'ai gagné au moins 3 semaines de dev."
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold">MR</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-200">Marie R.</div>
                          <div className="text-[9px] text-slate-500">Fondatrice SaaS</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        "L'intégration Stripe et l'architecture sont parfaites. Le prix est largement rentabilisé au vu du temps gagné. Je recommande à 100%."
                      </p>
                    </div>
                  </div>
                </div>

                {/* 📦 Formats & Déclinaisons Disponibles */}
                {(() => {
                  const currentGroup = similarityGroupingAgent.getGroupForProduct(selectedProduct.id);
                  if (!currentGroup || currentGroup.variants.length <= 1) return null;

                  return (
                    <div className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-5 h-5 text-indigo-400" />
                          <h4 className="font-bold text-white text-sm">
                            Déclinaisons & Formats Disponibles ({currentGroup.totalAvailableQuantity} Packs)
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          ⚡ {currentGroup.totalAvailableQuantity} formats disponibles
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        Choisissez votre édition ou optez pour le kit complet regroupé ci-dessous.
                      </p>

                      <div className="space-y-2">
                        {currentGroup.variants.map((v, idx) => {
                          const isCurrent = v.id === selectedProduct.id;
                          const targetProd = products.find(p => p.id === v.id);
                          return (
                            <div
                              key={v.id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                                isCurrent
                                  ? 'bg-indigo-950/50 border-indigo-500/50 ring-1 ring-indigo-500/20'
                                  : 'bg-slate-950 border-slate-800'
                              }`}
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-indigo-400 font-bold text-[11px]">Option #{idx + 1}</span>
                                  <span className="font-bold text-white truncate">{v.title}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-semibold">
                                      Fiche actuelle
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span>{v.format.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span>{v.filesCount} fichiers ({v.fileTypes.join(', ')})</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-bold text-white text-sm">
                                  {currencyAgent.formatPrice(v.recommendedPrice)}
                                </span>
                                {!isCurrent && targetProd && (
                                  <button
                                    onClick={() => setSelectedProduct(targetProd)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                                  >
                                    Voir
                                  </button>
                                )}
                                {targetProd && (
                                  <button
                                    onClick={() => addToCart(targetProd)}
                                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                                  >
                                    Ajouter
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                        <span className="text-xs text-slate-400">
                          Accéder à l'ensemble du lot :
                        </span>
                        <button
                          onClick={() => {
                            currentGroup.allProductIds.forEach(pid => {
                              const p = products.find(prod => prod.id === pid);
                              if (p) addToCart(p);
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Ajouter le Pack Complet ({currentGroup.totalAvailableQuantity} Éditions)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 🔄 Cross-Sell Similar Products Recommended */}
                {(() => {
                  const similarProducts = storefrontAgentService.getCrossSellsForProduct(selectedProduct.id);
                  if (similarProducts.length === 0) return null;
                  return (
                    <div className="bg-slate-900 border border-indigo-500/20 p-6 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>Complétez Votre Commande (Fréquemment Achetés Ensemble)</span>
                        </div>
                        <span className="text-[10px] text-indigo-300 font-mono">Pack Recommandé</span>
                      </div>

                      <div className="space-y-2">
                        {similarProducts.map(simProd => (
                          <div key={simProd.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                            <div className="space-y-0.5 max-w-[220px]">
                              <div className="font-bold text-white truncate">{simProd.title}</div>
                              <div className="text-emerald-400 font-mono font-bold text-[11px]">
                                + {currencyAgent.formatPrice(simProd.pricing?.recommendedPrice ?? 47)}
                              </div>
                            </div>
                            <button
                              onClick={() => addToCart(simProd)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* FAQ Box */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Questions Fréquentes</div>
                  <div className="space-y-2.5 text-xs">
                    {selectedProduct?.packaging?.faqs && selectedProduct.packaging.faqs.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                        <div className="font-bold text-white">{item.q}</div>
                        <div className="text-slate-400 leading-relaxed">{item.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
            );
          })()
        ) : (
          /* View 3: Storefront Catalog Home */
          <div className="space-y-12 animate-fade-in">
            {/* Store Hero with Dynamic Theme */}
            <div className={`${heroGradientClass} border border-slate-800 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{agentState.visualConfig.heroBadge}</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
                {agentState.visualConfig.heroHeadline}
              </h1>

              <p className="text-xs md:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {agentState.visualConfig.heroSubheadline}
              </p>

              {/* Conversion Anchors & Value Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-slate-200 shadow-sm">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold">Téléchargement Immédiat 24/7</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-slate-200 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Garantie 7 Jours Satisfait ou Remboursé</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-slate-200 shadow-sm">
                  <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold">Paiement Sécurisé CB & Crypto</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-slate-200 shadow-sm">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="font-semibold">4.9/5 (+250 avis vérifiés)</span>
                </div>
              </div>
            </div>

            {/* Smart Product Clusters / Categories Tabs Bar */}
            <div id="clusters" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white">
                    {agentState.visualConfig.clusteringMode === 'smart_clusters' ? 'Catégories & Collections Thématiques' : 'Catégories du Catalogue'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {filteredProducts.length} produits disponibles
                </span>
              </div>

              {agentState.visualConfig.clusteringMode === 'smart_clusters' ? (
                /* Smart Clusters Tabs */
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  <button
                    onClick={() => setSelectedClusterId('all')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                      selectedClusterId === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    🌐 Tous les Produits
                  </button>

                  {clusters.map(cluster => (
                    <button
                      key={cluster.id}
                      onClick={() => setSelectedClusterId(cluster.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-2 ${
                        selectedClusterId === cluster.id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{cluster.icon}</span>
                      <span>{cluster.name}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                        {cluster.productIds.length}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                /* Category Tabs */
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap capitalize ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'Tous les Formats' : cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Cluster Details Banner */}
              {activeCluster && (
                <div className="bg-slate-900/80 border border-indigo-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{activeCluster.icon}</span>
                      <h3 className="font-bold text-white text-base">{activeCluster.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {activeCluster.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl">{activeCluster.description}</p>
                  </div>

                  <button
                    onClick={() => {
                      // Add all products in this cluster to cart with discount
                      const clusterProds = products.filter(p => activeCluster.productIds.includes(p.id));
                      clusterProds.forEach(p => addToCart(p));
                      setPromoDiscount(activeCluster.suggestedBundleDiscount);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Commander le Pack Thématique (-{activeCluster.suggestedBundleDiscount}%)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Aucun produit dans cette vue</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Tous les produits du catalogue sont disponibles sans filtre.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedClusterId('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Afficher Tout le Catalogue ({products.length} produits)
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(prod => {
                const locProd = getLocalizedProduct(prod, selectedLang);
                const recPrice = prod.pricing?.recommendedPrice ?? 47;
                const dynamicBadge = prod.pricing?.attractiveBadge || storefrontAgentService.getDynamicBadgeForProduct(prod.id);
                const hasAnchor = Boolean(prod.pricing?.compareAtPrice && prod.pricing.compareAtPrice > recPrice);
                const comparePrice = prod.pricing?.compareAtPrice || prod.pricing?.maxPrice || (recPrice + 30);
                const savings = hasAnchor 
                  ? (prod.pricing?.savingsAmount || (comparePrice - recPrice))
                  : null;

                return (
                  <div
                    key={prod.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between transition-all group shadow-lg relative overflow-hidden"
                  >
                    {prod.pricing?.isFlashSale && (
                      <div className="bg-rose-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-4 -mx-6 -mt-6 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-300" />
                          <span>{selectedLang === 'en' ? 'Flash Deal' : selectedLang === 'es' ? 'Oferta Flash' : selectedLang === 'de' ? 'Blitzangebot' : 'Vente Flash'}</span>
                        </span>
                        <span className="font-mono">Fin imminente</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700 uppercase">
                            {prod.format.replace('_', ' ')}
                          </span>
                          {dynamicBadge && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {dynamicBadge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-amber-400 text-xs gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="font-bold">{prod.rating}</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-white text-base leading-snug mb-1 group-hover:text-indigo-400 transition-colors">
                        {locProd.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {locProd.subtitle}
                      </p>

                      <div className="space-y-1.5 mb-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        {locProd.packaging?.keyBenefits?.slice(0, 2)?.map((b, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{b}</span>
                          </div>
                        ))}
                      </div>

                      {/* 📦 Indicateur de Quantité Disponible & Regroupement Produits Similaires */}
                      {(() => {
                        const group = similarityGroupingAgent.getGroupForProduct(prod.id);
                        const qty = group ? group.totalAvailableQuantity : 1;
                        const hasMulti = Boolean(group && group.variants.length > 1);

                        return (
                          <div className="mb-4 space-y-1.5">
                            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/90 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[11px] font-medium">
                                  Quantité disponible : <strong className="text-emerald-400 font-bold">{qty} édition{qty > 1 ? 's' : ''}</strong>
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                ⚡ Stock Immédiat
                              </span>
                            </div>

                            {hasMulti && group && (
                              <div className="px-1 flex items-center justify-between text-[10px] text-indigo-300">
                                <span className="flex items-center gap-1">
                                  <Boxes className="w-3 h-3 text-indigo-400" />
                                  <span>{group.variants.length} formats & éditions inclus</span>
                                </span>
                                <span className="text-emerald-400 font-medium">
                                  Pack complet
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          {hasAnchor && (
                            <span className="text-[11px] text-slate-500 line-through font-mono">
                              {currencyAgent.formatPrice(comparePrice)}
                            </span>
                          )}
                          <span className="text-xl font-black text-white font-mono">
                            {currencyAgent.formatPrice(prod.pricing?.recommendedPrice ?? 47)}
                          </span>
                          {hasAnchor && prod.pricing?.discountPercent && (
                            <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/20">
                              -{prod.pricing.discountPercent}%
                            </span>
                          )}
                        </div>
                        {hasAnchor && savings && savings > 0 && (
                          <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                            Économisez {currencyAgent.formatPrice(savings)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            trafficEngine.recordRealUserInteraction('product_view', { productId: prod.id, productTitle: prod.title });
                            setSelectedProduct(prod);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                        >
                          {selectedLang === 'en' ? 'View' : selectedLang === 'es' ? 'Ver' : selectedLang === 'de' ? 'Vorschau' : 'Consulter'}
                        </button>
                        <button
                          onClick={() => addToCart(prod)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
                        >
                          {selectedLang === 'en' ? 'Add' : selectedLang === 'es' ? 'Añadir' : selectedLang === 'de' ? 'Kaufen' : 'Acheter'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* Bundles Section */}
            {bundles.length > 0 && (
              <div id="bundles" className="space-y-6 pt-6">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold text-white">Packs & Bundles Économiques d'Affinité</h2>
                  <p className="text-xs text-slate-400">Économisez jusqu'à 40% en combinant plusieurs systèmes digitaux complémentaires</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bundles.map(b => (
                    <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {b.badge}
                          </span>
                          <span className="text-xs text-emerald-400 font-bold">-{b.discountPercent}%</span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{b.title}</h3>
                        <p className="text-xs text-slate-400 mb-4">{b.subtitle}</p>

                        <div className="space-y-1.5 mb-4">
                          {b.productIds.map(pid => {
                            const p = products.find(prod => prod.id === pid);
                            return (
                              <div key={pid} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                                <span className="truncate">{p?.title || pid}</span>
                                <span className="text-slate-500 line-through">
                                  {p ? currencyAgent.formatPrice(p.pricing?.recommendedPrice ?? 47) : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 line-through mr-2">
                            {currencyAgent.formatPrice(b.originalPrice)}
                          </span>
                          <span className="text-2xl font-extrabold text-white">
                            {currencyAgent.formatPrice(b.bundlePrice)}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            b.productIds.forEach(pid => {
                              const p = products.find(prod => prod.id === pid);
                              if (p) addToCart(p);
                            });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
                        >
                          Ajouter le Pack au Panier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About the Creator & Pre-Sales Support */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Creator Info */}
              <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5">
                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center font-bold text-white text-lg">
                      {storeBrandName.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">L'Équipe {storeBrandName}</h3>
                    <p className="text-xs text-indigo-400 font-medium">Experts en Ingénierie Digitale</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nous concevons des architectures logicielles, des kits UI et des templates de productivité validés en production. Notre mission : vous faire gagner des semaines de développement grâce à des fondations solides et prêtes à l'emploi.
                </p>
              </div>

              {/* Pre-sales Support */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <span>Une question avant d'acheter ?</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compatibilité, intégrations, ou besoin d'un conseil spécifique ? Notre équipe technique vous répond sous 24h.
                </p>
                <div className="pt-2">
                  <a 
                    href="mailto:support@digitalfactory.io"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
                  >
                    <span>Contacter le Support</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Guarantee Section */}
            <div id="guarantee" className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Garantie 100% Satisfait ou Remboursé pendant 7 Jours</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Si nos templates, modèles de prompts et ressources numériques ne vous apportent pas entière satisfaction et des gains de productivité immédiats, un simple email vous permet d'obtenir un remboursement sans discussion sous 7 jours.
              </p>
            </div>

            {/* Public Store Footer with Mandatory French & Global Legal Links */}
            <footer className="pt-8 pb-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-400 font-bold">
                    ⚡
                  </div>
                  <span className="text-slate-300 font-semibold">© {new Date().getFullYear()} {storeBrandName}.</span>
                  <span className="text-slate-500">Tous droits réservés.</span>
                </div>

                {/* Legal Policy Links */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                  <button
                    onClick={() => openLegal('mentions_legales')}
                    className="hover:text-indigo-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Mentions Légales
                  </button>
                  <button
                    onClick={() => openLegal('cgv')}
                    className="hover:text-indigo-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Conditions Générales de Vente (CGV)
                  </button>
                  <button
                    onClick={() => openLegal('confidentialite')}
                    className="hover:text-indigo-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Politique de Confidentialité (RGPD)
                  </button>
                  <button
                    onClick={() => openLegal('cookies')}
                    className="hover:text-indigo-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Cookies
                  </button>
                  <button
                    onClick={() => openLegal('retractation')}
                    className="hover:text-indigo-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Garantie & Rétractation
                  </button>
                  <button
                    onClick={() => {
                      setCustomerPortalInitialOrder(null);
                      setIsCustomerPortalOpen(true);
                    }}
                    className="text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Package className="w-3 h-3" />
                    <span>Accès Téléchargements (Mes Achats)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <button
                    onClick={() => {
                      try {
                        const keysToKeep = [
                          'df_stripe_sk',
                          'df_stripe_pk',
                          'df_stripe_whsec',
                          'df_stripe_mode',
                          'df_stripe_currency',
                          'df_crypto_settings_v1',
                          'df_crypto_btc',
                          'df_crypto_eth',
                          'df_crypto_sol',
                          'df_crypto_usdt',
                          'df_moderator_passcode'
                        ];
                        const preserved: Record<string, string | null> = {};
                        keysToKeep.forEach(k => { preserved[k] = localStorage.getItem(k); });
                        localStorage.clear();
                        keysToKeep.forEach(k => { if (preserved[k]) localStorage.setItem(k, preserved[k]!); });
                        window.location.reload();
                      } catch (e) {
                        window.location.reload();
                      }
                    }}
                    title="Forcer la mise à jour et vider le cache local"
                    className="hover:text-amber-400 transition-colors flex items-center gap-1 text-slate-500"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Vider Cache & Recharger</span>
                  </button>

                  <button
                    onClick={onOpenModeratorLogin}
                    className="hover:text-slate-300 transition-colors flex items-center gap-1 text-slate-500 hover:text-indigo-400"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Espace Modérateur</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 text-center border-t border-slate-900 pt-3">
                Facturation conforme aux articles L. 441-9 du Code de commerce et 242 nonies A du CGI. Passerelle de paiement sécurisée Stripe & Crypto Autonome (BTC, ETH, SOL, USDT, USDC). Compatible tous navigateurs, mobiles & tablettes.
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* 📱 Mobile Floating Bottom Bar for Instant Access on Touchscreens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 z-40 flex items-center justify-around text-xs shadow-2xl safe-area-pb">
        <button
          onClick={() => {
            setSelectedProduct(null);
            setSelectedClusterId('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white py-1 px-2 transition-colors min-w-[56px]"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-medium">Boutique</span>
        </button>

        <button
          onClick={() => {
            setCustomerPortalInitialOrder(null);
            setIsCustomerPortalOpen(true);
          }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 py-1 px-2 transition-colors min-w-[56px]"
        >
          <Package className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-medium">Mes Achats</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 text-white bg-indigo-600/20 border border-indigo-500/40 rounded-xl py-1 px-3.5 transition-colors relative"
        >
          <ShoppingBag className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-bold">Panier</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (isModerator) {
              if (onSwitchToBackOffice) onSwitchToBackOffice();
              else if (onClose) onClose();
            } else {
              onOpenModeratorLogin?.();
            }
          }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-400 py-1 px-2 transition-colors min-w-[56px]"
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-medium">{isModerator ? 'Cockpit' : 'Admin'}</span>
        </button>
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setIsCartOpen(false)} />

          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Votre Panier ({cart.length})</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Votre panier est actuellement vide.
                </div>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar">
                  {cart.map(item => (
                    <div key={item.product.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white truncate max-w-[200px]">{item.product.title}</div>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          {currencyAgent.formatPrice(item.product?.pricing?.recommendedPrice ?? 47)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product?.id || '')}
                        className="text-slate-500 hover:text-rose-400 text-xs"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                {/* 1-Click Order Bump Upsell */}
                {(() => {
                  const bumpProd = products.find(p => p.pricing?.orderBumpActive && !cart.some(c => c.product?.id === `bump-${p.id}`));
                  if (!bumpProd) return null;

                  const bumpPrice = bumpProd.pricing?.orderBumpPrice || 9.90;
                  const bumpTitle = bumpProd.pricing?.orderBumpTitle || 'Pack 100 Prompts & Checklists Bonus VIP';

                  return (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">🎁</span>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{bumpTitle}</div>
                          <div className="text-[10px] text-indigo-300 font-medium">Offre spéciale panier : +{currencyAgent.formatPrice(bumpPrice)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const bumpItem: DigitalProduct = {
                            ...bumpProd,
                            id: `bump-${bumpProd.id}`,
                            title: bumpTitle,
                            pricing: {
                              ...(bumpProd.pricing || {}),
                              recommendedPrice: bumpPrice
                            } as any
                          };
                          addToCart(bumpItem);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 shadow-sm transition-all active:scale-95"
                      >
                        + Ajouter
                      </button>
                    </div>
                  );
                })()}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    placeholder="Code Promo (ex: LAUNCH20)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-slate-500"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Appliquer
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Sous-total :</span>
                    <span className="text-slate-200">{currencyAgent.formatPrice(cartSubtotalEur)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Remise ({promoDiscount}%) :</span>
                      <span>-{currencyAgent.formatPrice(Math.round(cartSubtotalEur * (promoDiscount / 100)))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                    <span>Total à Régler ({activeCurrency.code}) :</span>
                    <span className="text-emerald-400">{currencyAgent.formatPrice(cartTotalEur)}</span>
                  </div>
                </div>

                {/* Stripe Primary Payment Action */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      if (!isProcessingPayment) handleDirectStripeCheckout();
                    }}
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isProcessingPayment ? 'Redirection sécurisée Stripe...' : `Commander via Stripe (${currencyAgent.formatPrice(cartTotalEur)})`}</span>
                  </button>

                  {cryptoSettings.enabled && (
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCryptoModalOpen(true);
                      }}
                      className="w-full py-3 rounded-xl bg-[#181820] hover:bg-[#22222E] text-amber-300 hover:text-white border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Payer en Crypto (BTC, ETH, SOL, USDT)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulated Stripe Checkout Modal with French Compliance & Billing Info */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Mode Démo (Stripe non configuré)</h3>
                  <div className="text-[10px] text-slate-400">Simulation de paiement & facturation</div>
                </div>
              </div>
              <button onClick={() => {
                setIsCheckoutOpen(false);
                if (customerEmail && cart.length > 0) {
                  salesExplosionAgents.captureAbandonedCart({
                    customerName,
                    email: customerEmail,
                    productId: cart[0].product.id,
                    productTitle: cart[0].product.title,
                    cartValue: cartTotalEur,
                    aiHesitationReason: 'price_point'
                  });
                }
              }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nom & Prénom / Raison Sociale</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Adresse E-mail (pour livraison & facture PDF)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Adresse Postale (Facturation Légale)</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="Adresse, Code Postal, Ville"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] text-slate-400">Paiement par Carte Bancaire Sécurisée</div>
                <div className="font-mono text-xs text-indigo-300 flex items-center justify-between">
                  <span>•••• •••• •••• 4242</span>
                  <span>12/28 • CVC 888</span>
                </div>
              </div>

              {/* Legal Checkbox for Digital Content Waiver & 7-Day Guarantee (Article L221-28 13° Code Consommation) */}
              <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>
                  J'accepte les <button type="button" onClick={() => openLegal('cgv')} className="text-indigo-400 underline">CGV</button>. Conformément à l'article L.221-28 13° du Code de la Consommation, je renonce au délai de rétractation pour le téléchargement immédiat et je bénéficie de la <strong className="text-emerald-400 font-semibold">garantie satisfait ou remboursé de 7 jours</strong>.
                </span>
              </label>

              <div className="flex items-center justify-between font-bold text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-300">Montant Total :</span>
                <span className="text-emerald-400 text-lg">{currencyAgent.formatPrice(cartTotalEur)}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleDemoCheckout}
                disabled={isProcessingPayment || !agreeTerms}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Validation & Génération Facture...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Valider le paiement Démo ({currencyAgent.formatPrice(cartTotalEur)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setIsCryptoModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Préférer un paiement en Crypto (BTC, ETH, SOL, USDT)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Crypto Checkout Modal (Top 4 + Stripe Crypto) */}
      <CryptoCheckoutModal
        isOpen={isCryptoModalOpen}
        onClose={() => {
          setIsCryptoModalOpen(false);
          if (customerEmail && cart.length > 0) {
            salesExplosionAgents.captureAbandonedCart({
              customerName,
              email: customerEmail,
              productId: cart[0].product.id,
              productTitle: cart[0].product.title,
              cartValue: cartTotalEur,
              aiHesitationReason: 'price_point'
            });
          }
        }}
        items={cart.map(i => ({
          productId: i.product.id,
          productTitle: i.product.title,
          price: i.product.pricing?.recommendedPrice ?? 47,
          quantity: i.quantity
        }))}
        customerName={customerName}
        customerEmail={customerEmail}
        customerAddress={customerAddress}
        onPaymentSuccess={handleCryptoPaymentSuccess}
      />

      {/* Global Regulatory Legal Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalTab}
      />

      {/* Cookie Consent RGPD Banner */}
      <CookieConsentBanner
        onOpenLegal={openLegal}
      />

      {/* Customer Reception, Purchases Tracking & Downloads Access Portal */}
      <CustomerPortalModal
        isOpen={isCustomerPortalOpen}
        onClose={() => {
          setIsCustomerPortalOpen(false);
          setCustomerPortalInitialOrder(null);
        }}
        initialEmail={customerEmail}
      />

      {/* AI Assistant for 5 Points (Conseil, FAQ, Service Client) */}
      <StorefrontAiAssistant currentProduct={selectedProduct} />
    </div>
  );
};
