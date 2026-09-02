import { CompanyBillingInfo, FrenchInvoice, InvoiceItem, Order } from '../types';
import { store } from './store';

const DEFAULT_COMPANY_BILLING: CompanyBillingInfo = {
  companyName: 'Nexus Digital Labs',
  legalForm: 'Micro-Entreprise (Services Numériques)',
  sirenSiret: '921 458 712 00018',
  rcsCity: 'Dispensé d’immatriculation au RCS en application de l’article L 123-1-1 du Code de commerce',
  vatNumber: 'FR 48 921458712',
  vatExempt: true, // Auto-entrepreneur franchise de TVA par défaut
  vatRatePercent: 0, // Article 293 B du CGI
  address: '10 Rue de la Paix',
  postalCode: '75002',
  city: 'Paris',
  country: 'France',
  email: 'contact@nexusdigitallabs.com',
  phone: '+33 1 89 71 00 00',
  invoicePrefix: 'FACT-2026-',
  nextInvoiceNumber: 1001,
  paymentTerms: 'Paiement comptant à la commande par carte bancaire via Stripe.',
  penaltyClause: 'Escompte pour paiement anticipé : néant. Pénalités de retard en cas de non-paiement : 3 fois le taux d’intérêt légal + Indemnité forfaitaire de compensation des frais de recouvrement : 40 € (art. D. 441-5 du Code de commerce).'
};

class BillingService {
  private billingInfo: CompanyBillingInfo;
  private invoices: FrenchInvoice[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    const savedConfig = localStorage.getItem('df_company_billing_v1');
    if (savedConfig) {
      try {
        this.billingInfo = { ...DEFAULT_COMPANY_BILLING, ...JSON.parse(savedConfig) };
      } catch (e) {
        this.billingInfo = DEFAULT_COMPANY_BILLING;
      }
    } else {
      this.billingInfo = DEFAULT_COMPANY_BILLING;
    }

    const savedInvoices = localStorage.getItem('df_french_invoices_v1');
    if (savedInvoices) {
      try {
        this.invoices = JSON.parse(savedInvoices);
      } catch (e) {
        this.invoices = [];
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public getBillingInfo(): CompanyBillingInfo {
    return this.billingInfo;
  }

  public updateBillingInfo(info: Partial<CompanyBillingInfo>) {
    this.billingInfo = { ...this.billingInfo, ...info };
    localStorage.setItem('df_company_billing_v1', JSON.stringify(this.billingInfo));
    this.notify();
    store.addLog('info', 'stripe', 'Paramètres de facturation française mis à jour.');
  }

  public getInvoices(): FrenchInvoice[] {
    return this.invoices;
  }

  public getInvoiceByOrderId(orderId: string): FrenchInvoice | undefined {
    return this.invoices.find(inv => inv.orderId === orderId);
  }

  public generateInvoiceForOrder(order: Order, customBuyerAddress?: string): FrenchInvoice {
    const existing = this.getInvoiceByOrderId(order.id);
    if (existing) return existing;

    const invoiceNum = `${this.billingInfo.invoicePrefix}${String(this.billingInfo.nextInvoiceNumber).padStart(4, '0')}`;
    this.billingInfo.nextInvoiceNumber += 1;
    this.updateBillingInfo({ nextInvoiceNumber: this.billingInfo.nextInvoiceNumber });

    const vatRate = this.billingInfo.vatExempt ? 0 : this.billingInfo.vatRatePercent;

    const items: InvoiceItem[] = order.items.map(item => {
      const priceTtc = item.price;
      const unitHt = vatRate > 0 ? priceTtc / (1 + vatRate / 100) : priceTtc;
      const totalHt = Math.round(unitHt * 100) / 100;
      const vatAmt = Math.round((priceTtc - totalHt) * 100) / 100;

      return {
        title: item.productTitle,
        description: `Licence d'utilisation numérique & téléchargement immédiat (${item.format})`,
        quantity: 1,
        unitPriceHt: totalHt,
        vatRate: vatRate,
        totalHt: totalHt,
        vatAmount: vatAmt,
        totalTtc: priceTtc
      };
    });

    const subtotalHt = items.reduce((s, i) => s + i.totalHt, 0);
    const totalTtc = order.totalAmount;
    const totalVat = Math.round((totalTtc - subtotalHt) * 100) / 100;

    let legalNotice = '';
    if (this.billingInfo.vatExempt) {
      legalNotice = 'TVA non applicable, art. 293 B du Code Général des Impôts (CGI).';
    } else {
      legalNotice = `TVA collectée au taux légal en vigueur (${vatRate}%).`;
    }

    const invoice: FrenchInvoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: invoiceNum,
      orderId: order.id,
      issueDate: new Date().toISOString(),
      paymentDate: new Date().toISOString(),
      seller: { ...this.billingInfo },
      buyer: {
        name: order.customer.name,
        email: order.customer.email,
        address: customBuyerAddress || 'Adresse client en ligne',
        country: order.customer.country || 'France'
      },
      items,
      subtotalHt: Math.round(subtotalHt * 100) / 100,
      totalVat: totalVat,
      totalTtc: totalTtc,
      currency: order.currency || 'EUR',
      paymentMethod: 'Carte Bancaire (Stripe Sécurisé)',
      paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
      legalNotice,
      pdfGenerated: true
    };

    this.invoices.unshift(invoice);
    localStorage.setItem('df_french_invoices_v1', JSON.stringify(this.invoices));
    this.notify();
    store.addLog('success', 'stripe', `Facture française conforme émise : ${invoice.invoiceNumber} (€${invoice.totalTtc})`);

    return invoice;
  }

  public printOrDownloadInvoice(invoice: FrenchInvoice) {
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      alert('Veuillez autoriser les fenêtres contextuelles (pop-ups) pour imprimer la facture.');
      return;
    }

    const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency === 'GBP' ? '£' : '€';

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Facture ${invoice.invoiceNumber} - ${invoice.seller.companyName}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            line-height: 1.5;
            margin: 0;
            padding: 30px;
            background: #ffffff;
            font-size: 13px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 800;
            color: #4f46e5;
            margin: 0 0 5px 0;
          }
          .invoice-tag {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            text-align: right;
            margin: 0 0 5px 0;
          }
          .grid-parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
          }
          .party-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
          }
          .party-card h3 {
            margin: 0 0 10px 0;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4f46e5;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background: #f3f4f6;
            text-align: left;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #d1d5db;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 12px;
          }
          .totals-table {
            width: 320px;
            margin-left: auto;
            margin-bottom: 30px;
          }
          .totals-table td {
            padding: 8px 12px;
          }
          .totals-table .grand-total {
            font-size: 16px;
            font-weight: 800;
            color: #4f46e5;
            border-top: 2px solid #e5e7eb;
            border-bottom: 2px solid #4f46e5;
          }
          .legal-box {
            background: #f8fafc;
            border-left: 4px solid #4f46e5;
            padding: 12px 16px;
            font-size: 11px;
            color: #4b5563;
            margin-top: 40px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">${invoice.seller.companyName}</h1>
            <div>${invoice.seller.legalForm}</div>
            <div>${invoice.seller.address}, ${invoice.seller.postalCode} ${invoice.seller.city}</div>
            <div>Email : ${invoice.seller.email} | Tél : ${invoice.seller.phone}</div>
          </div>
          <div>
            <h2 class="invoice-tag">FACTURE N° ${invoice.invoiceNumber}</h2>
            <div class="meta-row"><strong>Date d'émission :</strong> <span>${new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</span></div>
            <div class="meta-row"><strong>Date du règlement :</strong> <span>${new Date(invoice.paymentDate).toLocaleDateString('fr-FR')}</span></div>
            <div class="meta-row"><strong>Réf. Commande :</strong> <span>${invoice.orderId}</span></div>
            <div class="meta-row"><strong>Statut :</strong> <span style="color: #059669; font-weight: bold;">ACQUITTÉE (Payée)</span></div>
          </div>
        </div>

        <div class="grid-parties">
          <div class="party-card">
            <h3>ÉMETTEUR (Vendeur)</h3>
            <div><strong>${invoice.seller.companyName}</strong></div>
            <div>SIRET : ${invoice.seller.sirenSiret}</div>
            <div>${invoice.seller.rcsCity}</div>
            <div>N° TVA : ${invoice.seller.vatNumber}</div>
          </div>

          <div class="party-card">
            <h3>CLIENT (Acheteur)</h3>
            <div><strong>${invoice.buyer.name}</strong></div>
            <div>Email : ${invoice.buyer.email}</div>
            <div>${invoice.buyer.address || 'Téléchargement de contenu numérique en ligne'}</div>
            <div>Pays : ${invoice.buyer.country}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Désignation des Produits Digitaux</th>
              <th style="text-align: center;">Quantité</th>
              <th style="text-align: right;">Prix Unitaire HT</th>
              <th style="text-align: right;">Taux TVA</th>
              <th style="text-align: right;">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>
                  <strong>${item.title}</strong>
                  <div style="font-size: 11px; color: #6b7280;">${item.description || 'Licence d\'accès numérique immédiat'}</div>
                </td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${item.unitPriceHt.toFixed(2)} ${currencySymbol}</td>
                <td style="text-align: right;">${item.vatRate}%</td>
                <td style="text-align: right;"><strong>${item.totalTtc.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td><strong>Total Hors Taxes (HT) :</strong></td>
            <td style="text-align: right;">${invoice.subtotalHt.toFixed(2)} ${currencySymbol}</td>
          </tr>
          <tr>
            <td><strong>TVA (${invoice.seller.vatExempt ? '0%' : invoice.seller.vatRatePercent + '%'}) :</strong></td>
            <td style="text-align: right;">${invoice.totalVat.toFixed(2)} ${currencySymbol}</td>
          </tr>
          <tr class="grand-total">
            <td><strong>TOTAL NET TTC :</strong></td>
            <td style="text-align: right;"><strong>${invoice.totalTtc.toFixed(2)} ${currencySymbol}</strong></td>
          </tr>
        </table>

        <div class="legal-box">
          <div style="font-weight: bold; margin-bottom: 4px;">Mentions Légales, Fiscales & Rétractation Obligatoires :</div>
          <div>• <strong>Régime fiscal :</strong> ${invoice.legalNotice}</div>
          <div>• <strong>Mode de règlement :</strong> ${invoice.paymentMethod} (Règlement comptant reçu).</div>
          <div>• <strong>Pénalités de retard :</strong> ${invoice.seller.penaltyClause}</div>
          <div>• <strong>Délai de rétractation légal :</strong> Conformément à l'article L. 221-28 13° du Code de la consommation, le droit légal de rétractation de 14 jours ne s'applique pas aux contenus numériques sans support matériel dont l'accès/téléchargement immédiat a commencé avec l'accord préalable exprès et renonciation du consommateur.</div>
          <div>• <strong>Garantie Commerciale Satisfait ou Remboursé (7 Jours) :</strong> Notre boutique vous fait bénéficier d'une garantie commerciale intégrale satisfait ou remboursé de 7 jours calendaires à compter de la date d'achat sur simple demande à ${invoice.seller.email}.</div>
        </div>

        <div class="footer">
          Facture générée électroniquement conformément aux articles L. 441-9 du Code de commerce et 242 nonies A de l'annexe II du CGI.<br>
          ${invoice.seller.companyName} - SIRET ${invoice.seller.sirenSiret} - ${invoice.seller.address}, ${invoice.seller.postalCode} ${invoice.seller.city}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export const billingService = new BillingService();
