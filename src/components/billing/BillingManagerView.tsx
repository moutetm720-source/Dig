import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Percent, 
  Calendar, 
  User, 
  Plus, 
  Search, 
  Save, 
  ExternalLink,
  Table,
  Check,
  AlertCircle
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import { store } from '../../services/store';
import { CompanyBillingInfo, FrenchInvoice } from '../../types';

export const BillingManagerView: React.FC = () => {
  const [billingInfo, setBillingInfo] = useState<CompanyBillingInfo>(billingService.getBillingInfo());
  const [invoices, setInvoices] = useState<FrenchInvoice[]>(billingService.getInvoices());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<FrenchInvoice | null>(null);

  // New manual invoice form modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualItemTitle, setManualItemTitle] = useState('Licence Suite Automatisation IA 2026');
  const [manualAmount, setManualAmount] = useState(49);

  useEffect(() => {
    const unsub = billingService.subscribe(() => {
      setBillingInfo(billingService.getBillingInfo());
      setInvoices(billingService.getInvoices());
    });
    return () => unsub();
  }, []);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    billingService.updateBillingInfo(billingInfo);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCreateManualInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim() || !manualClientEmail.trim() || manualAmount <= 0) return;

    const mockOrder = {
      id: `ord-man-${Date.now().toString().slice(-6)}`,
      orderNumber: `ORD-${Date.now().toString().slice(-5)}`,
      customer: {
        name: manualClientName.trim(),
        email: manualClientEmail.trim(),
        country: 'France'
      },
      items: [{
        productId: 'man-prod-1',
        productTitle: manualItemTitle.trim(),
        format: 'Kit Numérique',
        price: manualAmount
      }],
      totalAmount: manualAmount,
      currency: 'EUR',
      paymentStatus: 'paid' as const,
      paymentMethod: 'Carte Bancaire (Stripe)',
      stripeSessionId: 'cs_test_manual_' + Date.now(),
      downloadToken: 'tok_man_' + Math.random().toString(36).substring(2),
      downloadExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      downloadCount: 0,
      maxDownloads: 5,
      createdAt: new Date().toISOString()
    };

    const newInv = billingService.generateInvoiceForOrder(mockOrder);
    setIsManualModalOpen(false);
    setManualClientName('');
    setManualClientEmail('');
    setSelectedInvoice(newInv);
  };

  const handleExportJournalCsv = () => {
    if (invoices.length === 0) {
      alert('Aucune facture dans le registre.');
      return;
    }

    const headers = ['Numero_Facture', 'Date_Emission', 'Nom_Client', 'Email_Client', 'Pays', 'Total_HT', 'Total_TVA', 'Total_TTC', 'Devise', 'Statut_Paiement', 'Régime_TVA'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.issueDate.slice(0, 10),
      `"${inv.buyer.name.replace(/"/g, '""')}"`,
      inv.buyer.email,
      inv.buyer.country,
      inv.subtotalHt.toFixed(2),
      inv.totalVat.toFixed(2),
      inv.totalTtc.toFixed(2),
      inv.currency,
      inv.paymentStatus,
      inv.seller.vatExempt ? 'Exonéré Art. 293 B CGI' : 'TVA 20%'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal-des-ventes-factures-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.buyer.name.toLowerCase().includes(term) ||
      inv.buyer.email.toLowerCase().includes(term) ||
      inv.orderId.toLowerCase().includes(term)
    );
  });

  const totalSalesTtc = invoices.reduce((s, i) => s + i.totalTtc, 0);
  const totalVatCollected = invoices.reduce((s, i) => s + i.totalVat, 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Système de Facturation Française Conforme</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Gratuit • Conforme CGI & Factur-X
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Génération automatique et instantanée de factures conformes aux articles L. 441-9 du Code de commerce et 242 nonies A du CGI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJournalCsv}
            className="px-3.5 py-2 rounded-xl bg-[#16161A] hover:bg-[#202028] text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Journal des Ventes (CSV)</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Émettre Facture Manuelle</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold">Factures Émises</div>
          <div className="text-2xl font-extrabold text-white">{invoices.length}</div>
          <div className="text-[10px] text-slate-500">Numérotation séquentielle sans rupture</div>
        </div>

        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold">Chiffre d'Affaires Facturé</div>
          <div className="text-2xl font-extrabold text-emerald-400">€{totalSalesTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-slate-500">Total TTC encaissé</div>
        </div>

        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold">TVA Collectée</div>
          <div className="text-2xl font-extrabold text-indigo-400">€{totalVatCollected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-slate-500">{billingInfo.vatExempt ? 'Exonéré (Art. 293 B CGI)' : 'Déclaration CA3'}</div>
        </div>

        <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold">Régime Fiscal Actif</div>
          <div className="text-base font-bold text-white truncate">{billingInfo.legalForm}</div>
          <div className="text-[10px] text-emerald-400 font-medium">SIRET: {billingInfo.sirenSiret}</div>
        </div>
      </div>

      {/* 1. ÉMETTEUR & INFORMATIONS LÉGALES DE L'ENTREPRISE */}
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Identité de l'Émetteur & Mentions Fiscales Obligatoires</h2>
            <p className="text-xs text-slate-400">Ces informations figureront obligatoirement sur chaque facture PDF émise aux clients.</p>
          </div>
        </div>

        <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Nom de l'Entreprise / Marque</label>
              <input
                type="text"
                value={billingInfo.companyName}
                onChange={e => setBillingInfo({ ...billingInfo, companyName: e.target.value })}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Forme Juridique</label>
              <select
                value={billingInfo.legalForm}
                onChange={e => setBillingInfo({ ...billingInfo, legalForm: e.target.value })}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Micro-Entreprise (Services Numériques)">Micro-Entreprise (Auto-entrepreneur)</option>
                <option value="Entreprise Individuelle (EI)">Entreprise Individuelle (EI)</option>
                <option value="SASU (Société par Actions Simplifiée Unipersonnelle)">SASU</option>
                <option value="EURL (Entreprise Unipersonnelle à Responsabilité Limitée)">EURL</option>
                <option value="SAS">SAS</option>
                <option value="SARL">SARL</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Numéro SIREN / SIRET</label>
              <input
                type="text"
                value={billingInfo.sirenSiret}
                onChange={e => setBillingInfo({ ...billingInfo, sirenSiret: e.target.value })}
                placeholder="921 458 712 00018"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Mention RCS / Greffe</label>
              <input
                type="text"
                value={billingInfo.rcsCity}
                onChange={e => setBillingInfo({ ...billingInfo, rcsCity: e.target.value })}
                placeholder="RCS Paris ou Mention de dispense"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Adresse du Siège</label>
              <input
                type="text"
                value={billingInfo.address}
                onChange={e => setBillingInfo({ ...billingInfo, address: e.target.value })}
                placeholder="10 Rue de la Paix"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Code Postal & Ville</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={billingInfo.postalCode}
                  onChange={e => setBillingInfo({ ...billingInfo, postalCode: e.target.value })}
                  placeholder="75002"
                  className="w-24 bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
                <input
                  type="text"
                  value={billingInfo.city}
                  onChange={e => setBillingInfo({ ...billingInfo, city: e.target.value })}
                  placeholder="Paris"
                  className="flex-1 bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Email de Contact Facturation</label>
              <input
                type="email"
                value={billingInfo.email}
                onChange={e => setBillingInfo({ ...billingInfo, email: e.target.value })}
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Régime de TVA</label>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billingInfo.vatExempt}
                    onChange={e => setBillingInfo({ ...billingInfo, vatExempt: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Franchise en base (Art. 293 B du CGI)</span>
                </label>
              </div>
            </div>

            {!billingInfo.vatExempt && (
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Taux TVA Standard (%)</label>
                <input
                  type="number"
                  value={billingInfo.vatRatePercent}
                  onChange={e => setBillingInfo({ ...billingInfo, vatRatePercent: Number(e.target.value) })}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Préfixe Numérotation Facture</label>
              <input
                type="text"
                value={billingInfo.invoicePrefix}
                onChange={e => setBillingInfo({ ...billingInfo, invoicePrefix: e.target.value })}
                placeholder="FACT-2026-"
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Paramètres de facturation enregistrés !</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer Coordonnées Facturation</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. REGISTRE & HISTORIQUE DES FACTURES CONFORMES */}
      <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Registre Officiel des Factures Émises</h2>
              <p className="text-xs text-slate-400">Consultez, imprimez ou téléchargez les factures PDF conformes pour chaque commande.</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher facture, client..."
              className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2">
            <div>Aucune facture dans le registre pour le moment.</div>
            <p className="text-[11px] text-slate-600">
              Chaque achat sur la boutique génère automatiquement une facture conforme. Vous pouvez aussi en créer une manuellement via le bouton ci-dessus.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">N° Facture</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Produits</th>
                  <th className="pb-3 text-right">Total HT</th>
                  <th className="pb-3 text-right">Total TTC</th>
                  <th className="pb-3 text-center">Statut</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-[#16161A] transition-colors">
                    <td className="py-3.5 pl-2 font-mono font-bold text-indigo-300">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {new Date(inv.issueDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3.5">
                      <div className="font-semibold text-white">{inv.buyer.name}</div>
                      <div className="text-[10px] text-slate-500">{inv.buyer.email}</div>
                    </td>
                    <td className="py-3.5 text-slate-300 max-w-[200px] truncate">
                      {inv.items.map(i => i.title).join(', ')}
                    </td>
                    <td className="py-3.5 text-right font-mono text-slate-400">
                      €{inv.subtotalHt.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                      €{inv.totalTtc.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Acquittée
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => billingService.printOrDownloadInvoice(inv)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer / PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Invoice Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Émettre une Facture Conforme Manuelle</h3>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Nom & Prénom Client / Société</label>
                <input
                  type="text"
                  required
                  value={manualClientName}
                  onChange={e => setManualClientName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Email Client</label>
                <input
                  type="email"
                  required
                  value={manualClientEmail}
                  onChange={e => setManualClientEmail(e.target.value)}
                  placeholder="jean.dupont@entreprise.fr"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Désignation du Produit Numérique</label>
                <input
                  type="text"
                  required
                  value={manualItemTitle}
                  onChange={e => setManualItemTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Montant Total TTC (€)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualAmount}
                  onChange={e => setManualAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Générer la Facture Conforme & Imprimer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
