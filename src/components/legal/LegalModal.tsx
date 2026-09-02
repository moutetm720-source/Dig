import React, { useState } from 'react';
import { X, ShieldCheck, Scale, FileText, Lock, Cookie, RefreshCw, Printer } from 'lucide-react';
import { getLegalDocuments, LegalDocument } from '../../services/legalPolicies';
import { LegalDocumentType } from '../../types';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalDocumentType;
}

export const LegalModal: React.FC<LegalModalProps> = ({ 
  isOpen, 
  onClose, 
  initialTab = 'mentions_legales' 
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocumentType>(initialTab);
  const docs = getLegalDocuments();

  if (!isOpen) return null;

  const currentDoc: LegalDocument = docs[activeTab] || docs.mentions_legales;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Centre Juridique & Conformité Réglementaire</h2>
              <p className="text-[11px] text-slate-400">Mentions Légales, CGV, RGPD & Droits des Consommateurs (France / UE)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title="Imprimer ce document légal"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-950 border-b border-slate-800 overflow-x-auto custom-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('mentions_legales')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'mentions_legales'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Mentions Légales</span>
          </button>

          <button
            onClick={() => setActiveTab('cgv')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'cgv'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>CGV Produits Numériques</span>
          </button>

          <button
            onClick={() => setActiveTab('confidentialite')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'confidentialite'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Politique RGPD</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'cookies'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookies</span>
          </button>

          <button
            onClick={() => setActiveTab('retractation')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'retractation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Garantie 30 Jours</span>
          </button>
        </div>

        {/* Document Content View */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-200 text-xs md:text-sm leading-relaxed custom-scrollbar">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">{currentDoc.title}</h3>
              <div className="text-[11px] text-slate-400 mt-0.5">Dernière mise à jour légale : {currentDoc.lastUpdated}</div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conforme France / UE / LCEN</span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-4">
            {currentDoc.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('### ')) {
                return (
                  <h4 key={idx} className="text-base font-bold text-indigo-300 pt-3 border-t border-slate-800/60 first:border-none first:pt-0">
                    {paragraph.replace('### ', '')}
                  </h4>
                );
              }
              if (paragraph.startsWith('---')) {
                return <hr key={idx} className="border-slate-800 my-4" />;
              }
              if (paragraph.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="p-3 bg-indigo-950/40 border-l-4 border-indigo-500 rounded-r-xl text-xs text-indigo-200 italic my-2">
                    {paragraph.replace('> ', '')}
                  </blockquote>
                );
              }
              if (paragraph.startsWith('* ') || paragraph.startsWith('1. ') || paragraph.startsWith('• ')) {
                const items = paragraph.split('\n');
                return (
                  <ul key={idx} className="space-y-1.5 pl-4 list-disc text-slate-300">
                    {items.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/^[\*\•\d\.]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-slate-300" dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Protection légale active & garantie de conformité.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
