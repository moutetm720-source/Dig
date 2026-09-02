import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { LegalDocumentType } from '../../types';

interface CookieConsentBannerProps {
  onOpenLegal: (tab: LegalDocumentType) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenLegal }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('df_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('df_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('df_cookie_consent', 'essential_only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-2xl z-50 text-xs text-slate-300 space-y-3 animate-slide-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Cookie className="w-4 h-4 text-indigo-400" />
          <span>Respect de votre Vie Privée (RGPD)</span>
        </div>
        <button 
          onClick={handleDecline}
          className="text-slate-500 hover:text-slate-300 p-1"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Ce site utilise uniquement des cookies techniques essentiels pour la sauvegarde de votre panier, la détection géo-localisée de votre devise et la sécurisation des paiements Stripe. Aucun traceur publicitaire intrusif n'est utilisé.{' '}
        <button 
          onClick={() => onOpenLegal('cookies')} 
          className="text-indigo-400 hover:underline font-medium"
        >
          En savoir plus
        </button>
      </p>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleAccept}
          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm"
        >
          Accepter
        </button>
        <button
          onClick={handleDecline}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
        >
          Essentiels uniquement
        </button>
      </div>
    </div>
  );
};
