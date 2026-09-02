import { DigitalProduct, ProductBundle, Order, FrenchInvoice, SupportedLanguage } from '../types';
import { getLocalizedProduct } from '../services/localizationService';

export function downloadProductPackage(rawProduct: DigitalProduct, lang: SupportedLanguage = 'fr') {
  const product = getLocalizedProduct(rawProduct, lang);

  const langHeaders = {
    fr: {
      licenseHeader: 'FICHE OFFICIELLE DE LICENCE NUMÉRIQUE',
      category: 'Catégorie',
      format: 'Format de livraison',
      level: 'Niveau',
      price: 'Prix Recommandé',
      status: 'Statut',
      statusVal: 'Licence Commerciale & Personnelle Activée',
      sec1: '1. SYNTHÈSE EXÉCUTIVE & PROBLÈME RÉSOLU',
      problemSolved: 'Problème résolu',
      promisedOutcome: 'Résultat promis',
      sec2: '2. STRUCTURE & MODULES DU PRODUIT',
      sec3: '3. CHECKLIST D\'ACTION & PROCÉDURES OPÉRATIONNELLES (SOPs)',
      sec4: '4. BIBLIOTHÈQUE DE PROMPTS HAUTE PERFORMANCE',
      sec5: '5. TEMPLATES, SCRIPTS & SCHÉMAS STRUCTURÉS',
      sec6: '6. BÉNÉFICES CLÉS & FICHIERS INCLUS',
      sec7: '7. FOIRE AUX QUESTIONS & ASSISTANCE',
      guarantee: 'Garantie',
      support: 'Support client: support@boutique-digitale.fr'
    },
    en: {
      licenseHeader: 'OFFICIAL DIGITAL PRODUCT & LICENSE CERTIFICATE',
      category: 'Category',
      format: 'Delivery Format',
      level: 'Skill Level',
      price: 'Recommended Value',
      status: 'Status',
      statusVal: 'Commercial & Multi-Project License Activated',
      sec1: '1. EXECUTIVE SUMMARY & SOLVED CHALLENGE',
      problemSolved: 'Problem Solved',
      promisedOutcome: 'Promised Outcome & ROI',
      sec2: '2. MODULE ARCHITECTURE & CURRICULUM',
      sec3: '3. ACTION CHECKLIST & STANDARD OPERATING PROCEDURES (SOPs)',
      sec4: '4. PRODUCTION-GRADE DIRECTIVES & PROMPT LIBRARY',
      sec5: '5. WORKFLOW TEMPLATES & READY-TO-DEPLOY SCHEMAS',
      sec6: '6. KEY DELIVERABLES & INCLUDED ASSETS',
      sec7: '7. FREQUENTLY ASKED QUESTIONS & SUPPORT',
      guarantee: 'Guarantee',
      support: 'Customer Support: support@boutique-digitale.fr'
    },
    es: {
      licenseHeader: 'CERTIFICADO OFICIAL DE LICENCIA DIGITAL',
      category: 'Categoría',
      format: 'Formato de entrega',
      level: 'Nivel',
      price: 'Precio recomendado',
      status: 'Estado',
      statusVal: 'Licencia Comercial y Personal Activada',
      sec1: '1. SÍNTESIS EJECUTIVA Y PROBLEMA RESUELTO',
      problemSolved: 'Problema resuelto',
      promisedOutcome: 'Resultado prometido',
      sec2: '2. ESTRUCTURA Y MÓDULOS DEL PRODUCTO',
      sec3: '3. CHECKLIST DE ACCIÓN Y PROCEDIMIENTOS OPERATIVOS (SOPs)',
      sec4: '4. BIBLIOTECA DE PROMPTS DE ALTO RENDIMIENTO',
      sec5: '5. PLANTILLAS Y ESQUEMAS ESTRUCTURADOS',
      sec6: '6. BENEFICIOS CLAVE Y ARCHIVOS INCLUIDOS',
      sec7: '7. PREGUNTAS FRECUENTES Y SOPORTE',
      guarantee: 'Garantía',
      support: 'Soporte al cliente: support@boutique-digitale.fr'
    },
    de: {
      licenseHeader: 'OFFIZIELLES DIGITAL-LIZENZZERTIFIKAT',
      category: 'Kategorie',
      format: 'Lieferformat',
      level: 'Niveau',
      price: 'Empfohlener Preis',
      status: 'Status',
      statusVal: 'Kommerzielle & Persönliche Lizenz Aktiviert',
      sec1: '1. EXECUTIVE SUMMARY & GELÖSTE HERAUSFORDERUNG',
      problemSolved: 'Gelöstes Problem',
      promisedOutcome: 'Versprochenes Ergebnis & ROI',
      sec2: '2. MODULSTRUKTUR & ABLAUFPLAN',
      sec3: '3. HANDLUNGSCHECKLISTE & OPERATIVE STANDARDABLÄUFE (SOPs)',
      sec4: '4. PRODUKTIONSREIFE PROMPT-BIBLIOTHEK',
      sec5: '5. ARBEITSVORLAGEN & EINSATZBEREITE SCHEMATA',
      sec6: '6. KERNVORTEILE & ENTHALTENE ELEMENTE',
      sec7: '7. HÄUFIG GESTELLTE FRAGEN & KUNDENDIENST',
      guarantee: 'Garantie',
      support: 'Kundenservice: support@boutique-digitale.fr'
    }
  }[lang] || {
    licenseHeader: 'FICHE OFFICIELLE DE LICENCE NUMÉRIQUE',
    category: 'Catégorie',
    format: 'Format de livraison',
    level: 'Niveau',
    price: 'Prix Recommandé',
    status: 'Statut',
    statusVal: 'Licence Commerciale & Personnelle Activée',
    sec1: '1. SYNTHÈSE EXÉCUTIVE & PROBLÈME RÉSOLU',
    problemSolved: 'Problème résolu',
    promisedOutcome: 'Résultat promis',
    sec2: '2. STRUCTURE & MODULES DU PRODUIT',
    sec3: '3. CHECKLIST D\'ACTION & PROCÉDURES OPÉRATIONNELLES (SOPs)',
    sec4: '4. BIBLIOTHÈQUE DE PROMPTS HAUTE PERFORMANCE',
    sec5: '5. TEMPLATES, SCRIPTS & SCHÉMAS STRUCTURÉS',
    sec6: '6. BÉNÉFICES CLÉS & FICHIERS INCLUS',
    sec7: '7. FOIRE AUX QUESTIONS & ASSISTANCE',
    guarantee: 'Garantie',
    support: 'Support client: support@boutique-digitale.fr'
  };

  const content = `# ${product.title}
${product.subtitle}

==================================================
${langHeaders.licenseHeader}
==================================================
${langHeaders.category}: ${product.category}
${langHeaders.format}: ${product.format}
${langHeaders.level}: ${product.level || 'All Levels'}
${langHeaders.price}: €${product.pricing?.recommendedPrice ?? 47}
${langHeaders.status}: ${langHeaders.statusVal}
Language: ${lang.toUpperCase()}

==================================================
${langHeaders.sec1}
==================================================
${langHeaders.problemSolved}: ${product.problemSolved}
${langHeaders.promisedOutcome}: ${product.promisedOutcome}

${product.content?.summary || ''}

==================================================
${langHeaders.sec2}
==================================================
${(product.content?.structure || []).map((s, idx) => `Module ${idx + 1}: ${s}`).join('\n')}

==================================================
${langHeaders.sec3}
==================================================
${(product.content?.checklistItems || []).map(c => `[ ] (${c.priority}) ${c.step}\n    Detail: ${c.detail}`).join('\n\n')}

==================================================
${langHeaders.sec4}
==================================================
${(product.content?.prompts || []).map(p => `### [${p.category}] ${p.title}\nVariables: ${p.variables?.join(', ') || 'None'}\nUse Case: ${p.useCase}\n\nDIRECTIVE:\n${p.prompt}`).join('\n\n--------------------------------------------------\n\n')}

==================================================
${langHeaders.sec5}
==================================================
${(product.content?.templates || []).map(t => `### ${t.name}\nDescription: ${t.description}\nFields: ${t.fields?.join(', ') || 'Standard'}\nInstructions: ${t.instructions}`).join('\n\n')}

==================================================
${langHeaders.sec6}
==================================================
Benefits:
${(product.packaging?.keyBenefits || []).map(b => `* ${b}`).join('\n')}

Included items:
${(product.packaging?.includedItems || []).map(i => `- ${i}`).join('\n')}

Files attached:
${(product.content?.downloadableFiles || []).map(f => `• ${f.filename} (${f.fileType.toUpperCase()} - ${f.size || 'Instant'})`).join('\n') || '- Master Implementation Guide & Schemas'}

==================================================
${langHeaders.sec7}
==================================================
${(product.packaging?.faqs || []).map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

${langHeaders.guarantee}: ${product.packaging?.guarantee || '7-Day 100% Money-Back Guarantee'}
${langHeaders.support}
`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${product.title.replace(/[^a-zA-Z0-9À-ÿ]/g, '-')}-${lang.toUpperCase()}-Kit.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadBundlePackage(bundle: ProductBundle, includedProducts: DigitalProduct[]) {
  const content = `# BUNDLE OFFICIEL : ${bundle.title}
${bundle.description}

==================================================
FICHE DU PACK COMPLET (${bundle.productIds?.length || 0} PRODUITS INCLUS)
==================================================
Prix du Pack: €${bundle.bundlePrice} (Valeur unitaire: €${bundle.originalPrice})
Économie réalisée: €${(bundle.originalPrice - bundle.bundlePrice).toFixed(2)} (${bundle.discountPercent}% de réduction)
Date d'activation: ${new Date().toLocaleDateString('fr-FR')}

==================================================
PRODUITS DIGITAUX INCLUS DANS LE PACK
==================================================
${includedProducts.map((p, idx) => `
--------------------------------------------------
PRODUIT #${idx + 1} : ${p.title}
--------------------------------------------------
Format: ${p.format} | Niveau: ${p.level}
Problème résolu: ${p.problemSolved}
Résultat: ${p.promisedOutcome}

Modules (${p.content?.structure?.length || 0}):
${(p.content?.structure || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

Prompts inclus (${p.content?.prompts?.length || 0}):
${(p.content?.prompts || []).map(pr => `  - [${pr.category}] ${pr.title}`).join('\n')}

Templates (${p.content?.templates?.length || 0}):
${(p.content?.templates || []).map(t => `  - ${t.name}: ${t.description}`).join('\n')}
`).join('\n\n')}

==================================================
GARANTIE & SUPPORT CLIENT
==================================================
Garantie 7 jours satisfait ou remboursé.
Licence commerciale multi-projets incluse.
`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${bundle.title.replace(/[^a-zA-Z0-9À-ÿ]/g, '-')}-Pack-Master.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJsonPromptPack(rawProduct: DigitalProduct, lang: SupportedLanguage = 'fr') {
  const product = getLocalizedProduct(rawProduct, lang);

  const jsonContent = JSON.stringify({
    title: product.title,
    version: '2026.1.0',
    language: lang.toUpperCase(),
    category: product.category,
    format: product.format,
    level: product.level,
    priceEur: product.pricing?.recommendedPrice ?? 47,
    license: 'Commercial and Multi-Project Extended License',
    generatedAt: new Date().toISOString(),
    prompts: product.content?.prompts || [],
    checklists: product.content?.checklistItems || [],
    templates: product.content?.templates || [],
    downloadableFiles: product.content?.downloadableFiles || []
  }, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${product.title.replace(/[^a-zA-Z0-9À-ÿ]/g, '-')}-${lang.toUpperCase()}-prompts-templates.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMarkdownChecklist(rawProduct: DigitalProduct, lang: SupportedLanguage = 'fr') {
  const product = getLocalizedProduct(rawProduct, lang);
  const checklist = product.content?.checklistItems || [];

  const content = `# GUIDE D'EXÉCUTION & CHECKLIST OPÉRATIONNELLE
Produit : ${product.title}
Catégorie : ${product.category}
Licence : Commerciale et Personnelle Immédiate 2026

## CHECKLIST DES ACTIONS IMMÉDIATES :
${checklist.map((item, idx) => typeof item === 'string' ? `- [ ] ${idx + 1}. ${item}` : `- [ ] ${idx + 1}. ${item.step}: ${item.detail}`).join('\n')}

## BIBLIOTHÈQUE DE PROMPTS CLÉS :
${(product.content?.prompts || []).map(p => `### ${p.title} (${p.category})
${p.prompt || ''}
`).join('\n')}

---
Support client & Garantie 7 jours : contact@boutique-digitale.fr
`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Checklist-${product.title.replace(/[^a-zA-Z0-9À-ÿ]/g, '-')}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadDigitalZipBundle(rawProduct: DigitalProduct, orderNumber?: string) {
  downloadProductPackage(rawProduct, 'fr');
}

export function downloadOrderReceiptTxt(orderOrNumber: Order | string, productsOrText?: DigitalProduct[] | string, invoice?: FrenchInvoice) {
  let content = '';
  let filename = 'Recu-Commande.txt';

  if (typeof orderOrNumber === 'string') {
    filename = `Recu-Commande-${orderOrNumber}.txt`;
    content = typeof productsOrText === 'string' ? productsOrText : 'Reçu de commande officielle.';
  } else {
    const order = orderOrNumber;
    filename = `Recu-Commande-${order.orderNumber}.txt`;
    content = `=======================================================
REÇU OFFICIEL DE COMMANDE & ACCÈS DE RÉCEPTION DIGITALE
=======================================================
Numéro de Commande : #${order.orderNumber}
ID Transaction     : ${order.id}
Date & Heure       : ${order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')}
Client             : ${order.customer?.name || 'Client'} (${order.customer?.email || 'N/A'})
Moyen de Paiement  : ${order.paymentMethod || 'Stripe'}
Statut Paiement    : ${(order.paymentStatus || 'COMPLETED').toUpperCase()} (Acquitté)
Montant Total TTC  : €${(order.totalAmount || 0).toFixed(2)}

-------------------------------------------------------
VOS ACCÈS SÉCURISÉS AUX FICHIERS NUMÉRIQUES
-------------------------------------------------------
Clé d'Accès Token  : ${order.downloadToken || 'N/A'}
Lien d'Accès Direct: https://boutique-digitale.fr/#/access?token=${order.downloadToken || ''}
Téléchargements    : ${order.downloadCount ?? 0} / ${order.maxDownloads ?? 10} autorisés
Expiration Lien    : ${order.downloadExpiresAt ? new Date(order.downloadExpiresAt).toLocaleDateString('fr-FR') : 'Permanent'} (Accès & Téléchargement permanent)

-------------------------------------------------------
ARTICLES & PRODUITS COMMANDÉS
-------------------------------------------------------
${order.items.map((item, idx) => `
${idx + 1}. ${item.productTitle}
   Prix unitaire : €${item.price.toFixed(2)}
   Format        : ${item.format}
   Licence       : Activée à vie pour ${order.customer.email}
`).join('\n')}

-------------------------------------------------------
FACTURATION & MENTIONS LÉGALES
-------------------------------------------------------
${invoice ? `Numéro de Facture : ${invoice.invoiceNumber}\nTotal HT : €${invoice.subtotalHt.toFixed(2)}\nTVA : €${invoice.totalVat.toFixed(2)} (${invoice.legalNotice})` : 'Facture conforme émise et archivée.'}

-------------------------------------------------------
ASSISTANCE TECHNIQUE & SERVICE CLIENT
-------------------------------------------------------
Une question ? Besoin d'aide pour exploiter vos prompts ou templates ?
Contactez notre équipe 24/7 : support@boutique-digitale.fr
Garantie 100% Satisfait ou Remboursé sous 7 jours.
=======================================================
`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAffiliatePromoKitMarkdown(markdownContent: string, affiliateHandle: string, productTitle: string) {
  const cleanTitle = productTitle.replace(/[^a-zA-Z0-9À-ÿ]/g, '-');
  const filename = `Kit-Promo-Affilie-${affiliateHandle.replace('@', '')}-${cleanTitle}.md`;

  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
