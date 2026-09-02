import { LegalDocumentType } from '../types';
import { billingService } from './billingService';

export interface LegalDocument {
  id: LegalDocumentType;
  title: string;
  shortLabel: string;
  lastUpdated: string;
  content: string;
}

export const getLegalDocuments = (): Record<LegalDocumentType, LegalDocument> => {
  const company = billingService.getBillingInfo();
  const currentYear = new Date().getFullYear();

  return {
    mentions_legales: {
      id: 'mentions_legales',
      title: 'Mentions Légales & Informations Réglementaires',
      shortLabel: 'Mentions Légales',
      lastUpdated: '1er Janvier ' + currentYear,
      content: `
### 1. Informations sur l'Éditeur du Site
Conformément aux dispositions de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), il est précisé aux utilisateurs du site l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi :

* **Dénomination Sociale / Nom commercial :** ${company.companyName}
* **Statut Juridique :** ${company.legalForm}
* **Numéro SIREN / SIRET :** ${company.sirenSiret}
* **Registre du Commerce et des Sociétés :** ${company.rcsCity}
* **Numéro de TVA intracommunautaire :** ${company.vatNumber} (${company.vatExempt ? 'Franchise en base de TVA - Art. 293 B du CGI' : 'Assujetti TVA'})
* **Siège Social :** ${company.address}, ${company.postalCode} ${company.city}, ${company.country}
* **Courrier Électronique :** ${company.email}
* **Directeur de la Publication :** La Direction Légale de ${company.companyName}

---

### 2. Hébergement de la Plateforme
Le site et sa base de données sont hébergés sur une infrastructure cloud hautement sécurisée :
* **Hébergeur :** Google Cloud Platform (Google LLC) & Firebase Hosting
* **Adresse de l'hébergeur :** 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA / Google Cloud EMEA (Irlande & Francfort)
* **Sécurité & Chiffrement :** Protocole TLS 1.3 / SSL 256 bits, certification ISO 27001 / SOC 2.

---

### 3. Propriété Intellectuelle
L’ensemble des éléments figurant sur ce site (textes, frameworks, modèles de prompts, guides, systèmes Notion, interfaces visuelles, codes sources, logos, icônes) sont la propriété exclusive de **${company.companyName}** ou font l'objet d'une autorisation d'utilisation régulière.

Toute reproduction, représentation, modification, publication, adaptation totale ou partielle des éléments du site, quel que soit le moyen ou le procédé utilisé, est strictement interdite sans autorisation écrite préalable. L'achat d'un produit numérique confère une **licence d'utilisation personnelle et professionnelle non-exclusive et non-transférable**, sans droit de revente ou de redistribution publique du code source brut.
      `
    },

    cgv: {
      id: 'cgv',
      title: 'Conditions Générales de Vente (CGV) - Produits Numériques',
      shortLabel: 'Conditions Générales de Vente',
      lastUpdated: '1er Janvier ' + currentYear,
      content: `
### Préambule
Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des ventes de produits et contenus numériques dématérialisés (templates, kits d'automatisation, packs de prompts IA, checklists, playbooks, cours numériques) conclues sur le site internet **${company.companyName}**.

---

### Article 1 – Objet et Champ d'Application
Les CGV régissent les relations contractuelles entre **${company.companyName}** (ci-après le « Vendeur ») et toute personne physique ou morale procédant à l'achat d'un produit numérique (ci-après le « Client »). Le fait de passer commande implique l'adhésion entière et sans réserve du Client aux présentes CGV.

---

### Article 2 – Prix, Multi-Devises et Paiement
* **Tarifs :** Les prix sont indiqués en Euros (€) ou dans la devise locale du Client (USD, GBP, CAD, AUD, CHF, JPY, etc.) selon la détection automatique ou le choix de l'utilisateur.
* **TVA et Taxes :** ${company.vatExempt ? 'Conformément à l’article 293 B du CGI, la TVA est non applicable (franchise en base).' : `Les prix sont affichés toutes taxes comprises (TTC) incluant la TVA au taux légal de ${company.vatRatePercent}%.`}
* **Passerelle de Paiement Sécurisée :** Le règlement s'effectue en ligne par carte bancaire via la passerelle certifiée **Stripe** (Visa, Mastercard, American Express, Apple Pay, Google Pay). Aucune donnée bancaire n'est stockée sur nos serveurs.

---

### Article 3 – Livraison Immédiate Dématérialisée
Dès la validation du paiement par Stripe, la commande est confirmée instantanément. Le Client accède immédiatement :
1. À l'écran de téléchargement direct de ses fichiers (packages .json, .zip, .md, .pdf).
2. À un lien d'accès sécurisé tokenisé généré pour sa commande.
3. À une **facture conforme émise automatiquement**.

---

### Article 4 – Droit de Rétractation et Renonciation Exprès
Conformément aux dispositions de l'**article L. 221-28 13° du Code de la consommation français** et des directives européennes relatives aux droits des consommateurs :
> *Le droit de rétractation de 14 jours ne peut être exercé pour les contrats de fourniture d'un contenu numérique sans support matériel dont l'exécution a commencé avec l'accord préalable exprès du consommateur et son renoncement exprès à son droit de rétractation.*

En confirmant sa commande et en accédant immédiatement aux téléchargements des produits digitaux, le Client accepte expressément l'exécution immédiate du contrat et renonce à son droit de rétractation légal.

---

### Article 5 – Garantie Commerciale « 7 Jours Satisfait ou Remboursé »
Nonobstant l'article 4, ${company.companyName} offre volontairement une **garantie de satisfaction de 7 jours**. Si le produit numérique acheté ne correspond pas à vos attentes techniques ou opérationnelles, vous pouvez solliciter un remboursement intégral par simple demande écrite adressée à **${company.email}**.

---

### Article 6 – Garantie Légale de Conformité des Contenus Numériques
Conformément aux articles L. 224-25-12 et suivants du Code de la consommation, le Vendeur répond des défauts de conformité du contenu numérique existant lors de la délivrance et qui apparaissent dans un délai de 2 ans. En cas de non-conformité avérée, le Client a droit à la mise en conformité du produit ou à un remboursement.

---

### Article 7 – Règlement des Litiges & Médiation
En cas de litige, le Client s'engage à contacter en priorité le service client à l'adresse **${company.email}**. Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, le Client peut recourir gratuitement au service de médiation de la consommation ou utiliser la plateforme européenne de règlement en ligne des litiges (RLL) : https://ec.europa.eu/consumers/odr.
      `
    },

    confidentialite: {
      id: 'confidentialite',
      title: 'Politique de Confidentialité & Protection des Données (RGPD)',
      shortLabel: 'Politique de Confidentialité',
      lastUpdated: '1er Janvier ' + currentYear,
      content: `
### Engagement de Confidentialité
**${company.companyName}** s'engage fermement à respecter la vie privée de ses utilisateurs et la conformité stricte avec le **Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679)** ainsi que la Loi Informatique et Libertés.

---

### 1. Responsable du Traitement
Le responsable du traitement des données personnelles est :
* **${company.companyName}** (${company.legalForm})
* **Adresse :** ${company.address}, ${company.postalCode} ${company.city}, France
* **Délégué / Contact Données :** ${company.email}

---

### 2. Données Collectées et Finalités
Nous appliquons le principe de **minimisation des données** (Privacy by Design) :
* **Données de Commande :** Nom, Prénom, Adresse e-mail (nécessaires pour l'exécution du contrat, la livraison des licences numériques et l'émission de la facture légale conforme).
* **Données de Facturation & IP :** Pays de facturation et adresse IP (obligations fiscales et conformité de l'agent multi-devises Stripe).
* **Données Bancaires :** Nous ne collectons NI ne stockons JAMAIS votre numéro de carte bancaire. Les transactions sont traitées directement par **Stripe Payments Europe, Ltd.** (certifié PCI-DSS Niveau 1).

---

### 3. Durée de Conservation
* Données liées aux commandes et factures : **10 ans** (obligation légale comptable - Art. L123-22 du Code de commerce).
* Données relatives aux demandes de contact : **3 ans** à compter du dernier contact.

---

### 4. Absence Totale de Revente de Données
Nous ne vendons, ne louons et ne cédons **jamais** vos données personnelles à des courtiers en données ou régies publicitaires tierces.

---

### 5. Vos Droits (Art. 15 à 22 du RGPD)
Vous disposez des droits suivants sur vos données :
* Droit d’accès et d’obtention d’une copie de vos données.
* Droit de rectification des informations inexactes.
* Droit à l'effacement (« droit à l'oubli »).
* Droit à la limitation du traitement et à la portabilité des données.

Pour exercer ces droits, adressez votre demande à **${company.email}**. Vous disposez également du droit d’introduire une réclamation auprès de la **CNIL** (Commission Nationale de l'Informatique et des Libertés - www.cnil.fr).
      `
    },

    cookies: {
      id: 'cookies',
      title: 'Politique de Gestion des Cookies & Traceurs',
      shortLabel: 'Gestion des Cookies',
      lastUpdated: '1er Janvier ' + currentYear,
      content: `
### Utilisation des Cookies sur le Site
Notre site web utilise exclusivement des traceurs et cookies techniques nécessaires à son bon fonctionnement :

* **Cookies de session & panier d'achat :** Maintien des articles sélectionnés dans votre panier et sécurisation du tunnel de commande.
* **Cookie de préférence monétaire & géo-localisation :** Mémorisation de votre devise préférée (EUR, USD, GBP, etc.) pour éviter de recalculer les taux à chaque rechargement.
* **Sécurité & Prévention de la fraude Stripe :** Tokens de vérification antifraude émis par Stripe lors de la saisie de paiement.

---

### Absence de Cookies Publicitaires Tiers Intrusifs
Nous n'utilisons aucun traceur publicitaire invasif, pixel de ciblage comportemental ou revente de profil.

Vous pouvez à tout moment configurer votre navigateur pour refuser ou supprimer les cookies. Notez toutefois que la désactivation complète des cookies de session peut altérer l'accès au panier d'achat.
      `
    },

    retractation: {
      id: 'retractation',
      title: 'Politique de Remboursement & Garantie 7 Jours',
      shortLabel: 'Garantie & Remboursement',
      lastUpdated: '1er Janvier ' + currentYear,
      content: `
### Garantie Commerciale Inconditionnelle de 7 Jours
Bien que les produits numériques bénéficient légalement d'une dispense de rétractation une fois téléchargés (art. L221-28 du Code de la consommation), nous croyons fermement en l'excellence et la valeur de nos systèmes numériques.

C'est pourquoi nous vous offrons une **Garantie 100% Satisfait ou Remboursé pendant 7 jours** à compter de la date d'achat.

---

### Modalités de Demande de Remboursement
Pour obtenir un remboursement intégral :
1. Envoyez un simple e-mail à **${company.email}** en indiquant votre référence de commande ou l'adresse e-mail utilisée lors du paiement.
2. Aucune justification complexe n'est requise.
3. Notre équipe procédera au remboursement sous 24 à 48 heures ouvrées directement sur la carte bancaire utilisée lors du paiement Stripe.
      `
    }
  };
};
