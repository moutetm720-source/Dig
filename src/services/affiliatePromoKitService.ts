import { 
  AffiliatePartner, 
  AffiliatePromoKit, 
  AffiliateChannelType,
  VideoPromoKit, 
  AudioPromoKit, 
  TextCopyPromoKit,
  DigitalProduct 
} from '../types';
import { store } from './store';
import { safeSetItem, safeGetItem } from '../utils/safeStorage';
import { serverState, onSyncReady } from './syncState';

const STORAGE_PROMO_KITS_KEY = 'df_affiliate_promo_kits_v1';
const STORAGE_TRANSMISSION_LOG_KEY = 'df_affiliate_promo_transmissions_v1';

export interface PromoTransmissionLog {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  channel: AffiliateChannelType;
  productId: string;
  productTitle: string;
  transmittedAt: string;
  status: 'delivered' | 'opened' | 'copied';
  deliveryChannel: 'email' | 'discord_webhook' | 'telegram_bot' | 'dashboard_direct';
  notes: string;
}

class AffiliatePromoKitService {
  private kits: AffiliatePromoKit[] = [];
  private transmissionLogs: PromoTransmissionLog[] = [];
  private listeners: Set<() => void> = new Set();

  private getAffiliatesFn: () => AffiliatePartner[] = () => [];
  private saveAffiliatesFn: () => void = () => {};

  constructor() {
    this.loadState();
  }

  public reloadFromServer() {
    this.loadState();
    this.notify();
  }

  public setAffiliatesHandlers(getFn: () => AffiliatePartner[], saveFn: () => void) {
    this.getAffiliatesFn = getFn;
    this.saveAffiliatesFn = saveFn;
  }

  private loadState() {
    const serverKits = serverState[STORAGE_PROMO_KITS_KEY];
    if (Array.isArray(serverKits) && serverKits.length > 0) {
      this.kits = serverKits;
    } else {
      const rawKits = safeGetItem<AffiliatePromoKit[]>(STORAGE_PROMO_KITS_KEY, []);
      this.kits = Array.isArray(rawKits) ? rawKits : [];
    }

    const serverLogs = serverState[STORAGE_TRANSMISSION_LOG_KEY];
    if (Array.isArray(serverLogs) && serverLogs.length > 0) {
      this.transmissionLogs = serverLogs;
    } else {
      const rawLogs = safeGetItem<PromoTransmissionLog[]>(STORAGE_TRANSMISSION_LOG_KEY, []);
      this.transmissionLogs = Array.isArray(rawLogs) ? rawLogs.slice(0, 100) : [];
    }

    // Auto-generate initial kits if empty
    if (!Array.isArray(this.kits) || this.kits.length === 0) {
      this.kits = [];
      this.generateInitialKits();
    }
  }

  private saveState() {
    if (!Array.isArray(this.kits)) {
      this.kits = [];
    }
    if (!Array.isArray(this.transmissionLogs)) {
      this.transmissionLogs = [];
    }
    safeSetItem(STORAGE_PROMO_KITS_KEY, this.kits);
    safeSetItem(STORAGE_TRANSMISSION_LOG_KEY, this.transmissionLogs);
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {}
    });
  }

  public getAllKits(): AffiliatePromoKit[] {
    return Array.isArray(this.kits) ? [...this.kits] : [];
  }

  public getKitsForAffiliate(affiliateId: string): AffiliatePromoKit[] {
    return Array.isArray(this.kits) ? this.kits.filter(k => k && k.affiliateId === affiliateId) : [];
  }

  public getKitById(kitId: string): AffiliatePromoKit | undefined {
    return Array.isArray(this.kits) ? this.kits.find(k => k && k.id === kitId) : undefined;
  }

  public getTransmissionLogs(): PromoTransmissionLog[] {
    return Array.isArray(this.transmissionLogs) ? [...this.transmissionLogs] : [];
  }

  // =========================================================================
  // 🎬 HIGH-CONVERSION PROMOTIONAL ASSETS GENERATOR BY PLATFORM
  // =========================================================================

  public generatePromoKit(affiliate: AffiliatePartner, product: DigitalProduct, customDiscount: number = 20, skipSaves: boolean = false): AffiliatePromoKit {
    const channel = affiliate.channel;
    const refCode = affiliate.referralCode;
    const price = product.pricing?.recommendedPrice || 49;
    const trackingUrl = `https://boutique-digitale.fr/p/${product.id}?ref=${refCode}&discount=${customDiscount}`;

    // 1. VIDEO KIT (YouTube Long-form / Shorts / TikTok / Reels)
    const videoKit = this.buildVideoKit(channel, affiliate, product, refCode, customDiscount, trackingUrl);

    // 2. AUDIO KIT (Podcast Host-read / Audio Ad / Sponsor spot)
    const audioKit = this.buildAudioKit(channel, affiliate, product, refCode, customDiscount, trackingUrl);

    // 3. TEXT & COPYWRITING KIT (Twitter Thread, LinkedIn B2B, Newsletter Blast, Discord/Telegram)
    const textKit = this.buildTextKit(channel, affiliate, product, refCode, customDiscount, trackingUrl);

    // 4. VISUAL BANNER & COVER PROMPTS
    const visualBannerPrompts = [
      {
        bannerType: 'youtube_thumbnail' as const,
        promptText: `Hyper-clean modern SaaS thumbnail, high contrast bold typography reading "3 MOIS EN 10 MIN", sleek dark glassmorphism interface floating in 3D, neon cyan and emerald subtle highlights, professional studio lighting, 8k resolution`,
        headlineOverlay: `Arrêtez de tout recoder de zéro en 2026 !`
      },
      {
        bannerType: 'tiktok_cover' as const,
        promptText: `Vertical 9:16 high visual retention screen mockup of a verified production boilerplate, clean terminal with zero errors and immediate Stripe checkout, vibrant futuristic tech aesthetic`,
        headlineOverlay: `Ce pack a sauvé mon lancement SaaS ⚡`
      },
      {
        bannerType: 'x_card_banner' as const,
        promptText: `Minimalist sleek dark mode developer architecture diagram, arrows showing full automated flow from Stripe to Customer Portal with zero maintenance, ultra legible tech vector graphic`,
        headlineOverlay: `Architecture Complète Prête à l'Emploi`
      },
      {
        bannerType: 'instagram_story' as const,
        promptText: `Story sticker style visual showing 5-star verified customer ratings, gold badge "Commercial License 2026", dark slate clean luxury feel`,
        headlineOverlay: `Accès Immédiat -${customDiscount}% avec le code ${refCode}`
      }
    ];

    const kit: AffiliatePromoKit = {
      id: `kit-${affiliate.id}-${product.id}-${Date.now()}`,
      affiliateId: affiliate.id,
      affiliateName: affiliate.name,
      affiliateHandle: affiliate.handle,
      affiliateChannel: affiliate.channel,
      referralCode: refCode,
      discountPercent: customDiscount,
      affiliateTrackingUrl: trackingUrl,
      productId: product.id,
      productTitle: product.title,
      productSubtitle: product.subtitle,
      productPrice: price,
      productFormat: product.format,
      productCategory: product.category,
      generatedAt: new Date().toISOString(),
      transmissionStatus: 'ready',
      transmissionChannel: affiliate.channel === 'discord' ? 'discord_webhook' : affiliate.channel === 'telegram' ? 'telegram_bot' : 'email',
      videoKit,
      audioKit,
      textKit,
      visualBannerPrompts
    };

    // Remove older duplicate if exists for this pair
    if (!Array.isArray(this.kits)) {
      this.kits = [];
    }
    this.kits = this.kits.filter(k => k && !(k.affiliateId === affiliate.id && k.productId === product.id));
    this.kits.unshift(kit);
    if (!skipSaves) this.saveState();

    return kit;
  }

  private buildVideoKit(
    channel: AffiliateChannelType, 
    affiliate: AffiliatePartner, 
    product: DigitalProduct, 
    code: string, 
    discount: number,
    url: string
  ): VideoPromoKit {
    const isShortForm = channel === 'tiktok' || channel === 'instagram';

    if (isShortForm) {
      return {
        platform: 'tiktok',
        durationSeconds: 35,
        formatTitle: `Script Vidéo Court Viral (TikTok / Reels / Shorts 9:16) - 35s`,
        hookVariations: [
          `« Si vous perdez encore 3 semaines à configurer Auth + Stripe pour vos projets, regardez ceci... »`,
          `« L'outil secret que les solopreneurs à 10k€/mois n'avouent jamais utiliser en public. »`,
          `« Voici comment j'ai déployé un produit numérique complet en moins de 25 minutes chrono. »`
        ],
        storyboard: [
          {
            timeframe: '0:00 - 0:03',
            label: '1. Le Crochet Stop-Scroll (0-3s)',
            visualCue: 'Plan serré facecam énergique, index pointé vers l\'écran avec transition cut rapide.',
            spokenScript: `Arrêtez de passer des nuits blanches à tout recoder de zéro. Regardez ce que je viens de trouver.`,
            onScreenText: '🛑 STOP AUX NUITS BLANCHES DE DEV',
            audioSoundCue: 'Effet sonore "Whoosh" rapide + Beat Lo-Fi / Phonk rythmé'
          },
          {
            timeframe: '0:03 - 0:12',
            label: '2. Exposition de la Frustration & Douleur',
            visualCue: 'Capture d\'écran d\'un fichier de config infini et de 40 onglets ouverts avec des erreurs.',
            spokenScript: `Le problème quand on veut lancer un produit ou un SaaS, c'est qu'on passe 80% du temps sur l'authentification, les paiements et le design au lieu de vendre.`,
            onScreenText: '❌ 80% du temps perdu sur des détails inutiles',
            audioSoundCue: 'Bruit de clavier accéléré'
          },
          {
            timeframe: '0:12 - 0:25',
            label: '3. Révélation de la Solution & Démo Express',
            visualCue: 'B-Roll fluide : Défilement du pack "${product.title}" prêt à l\'emploi avec code propre, architecture complète et licence commerciale.',
            spokenScript: `Avec "${product.title}", tout est déjà prêt : l'architecture, les modules testés, les automatisations et les livrables. Vous clonez, vous personnalisez et vous encaissez.`,
            onScreenText: `✨ ${product.title.toUpperCase()} (Clé en main)`,
            audioSoundCue: 'Ding sonore satisfaisant'
          },
          {
            timeframe: '0:25 - 0:35',
            label: '4. Appel à l\'Action & Réduction Exclusif',
            visualCue: 'Doigt qui pointe vers le lien en bio / description avec affichage du code promo en gros.',
            spokenScript: `Le lien direct est dans ma bio. Utilisez mon code ${code} pour économiser -${discount}% immédiatement avant la fin de l'offre !`,
            onScreenText: `🎁 CODE: ${code} (-${discount}%) 👉 LIEN EN BIO`,
            audioSoundCue: 'Son de caisse enregistreuse "Cha-ching"'
          }
        ],
        fullSpokenScript: `Arrêtez de passer des nuits blanches à tout recoder de zéro. Regardez ce que je viens de trouver. Le problème quand on veut lancer un projet, c'est qu'on passe 80% du temps sur la configuration au lieu de vendre. Avec "${product.title}", tout est déjà prêt : l'architecture, les modules testés et les livrables. Vous clonez, vous personnalisez et vous encaissez. Le lien direct est dans ma bio avec mon code ${code} pour -${discount}% immédiat !`,
        descriptionCopy: `🚀 Téléchargez ${product.title} avec -${discount}% de remise immédiate ! Code promo exclusif communauté : ${code} 👉 Lien direct dans la bio.\n\n#DevTech #SaaS #Productivite #CodingLife #Solopreneur`,
        pinnedCommentCopy: `📌 Le lien avec les -${discount}% de remise et le code ${code} est dispo ici : ${url} (Livraison numérique instantanée + Garantie 7 jours)`,
        ctaButtonText: `Débloquer mon Pack (-${discount}%)`,
        thumbnailConcepts: [
          'Visage choqué à côté d\'un écran affichant "0 Erreur, Prêt en 15min"',
          'Avant / Après : 140h de code vs 15min de template clé en main',
          'Badge or "Licence Commerciale Illimitée" en surbrillance'
        ]
      };
    }

    // Default: Long-form YouTube / Tech Review
    return {
      platform: 'youtube',
      durationSeconds: 180,
      formatTitle: `Script Vidéo YouTube / Tech Deep Dive (Format Paysage 16:9) - 3 à 5 min`,
      hookVariations: [
        `« Dans cette vidéo, j'analyse en détail "${product.title}" : vaut-il vraiment son prix ou est-ce du vent ? »`,
        `« Comment j'ai automatisé l'intégralité de mon workflow de lancement grâce à cette stack prête à l'emploi. »`,
        `« 3 fonctionnalités cachées dans ce pack qui vont vous faire économiser au moins 2 000 € de développement. »`
      ],
      storyboard: [
        {
          timeframe: '0:00 - 0:30',
          label: '1. Introduction & Contexte du Projet',
          visualCue: 'Facecam 4k propre, ambiance studio dev, logo du produit affiché en coin d\'écran.',
          spokenScript: `Salut à tous ! Aujourd'hui, on teste un produit qui a beaucoup fait parler chez les développeurs et solopreneurs : "${product.title}". On va regarder le code, les livrables et voir concrètement ce que ça apporte.`,
          onScreenText: `TEST COMPLET : ${product.title}`,
          audioSoundCue: 'Intro musicale rythmée signature de la chaîne'
        },
        {
          timeframe: '0:30 - 1:30',
          label: '2. Déballage des Fichiers & Qualité Technique',
          visualCue: 'Partage d\'écran VS Code / Fichiers : inspection de la structure des dossiers, typage TypeScript strict, documentation.',
          spokenScript: `Ce qui saute aux yeux dès l'ouverture de l'archive, c'est la propreté. Ce n'est pas un template bâclé : tout est typé, modulaire, sécurisé et prêt pour la production immédiate.`,
          onScreenText: '📁 Architecture Production Ready & Typage Strict',
          audioSoundCue: 'Clavier mécanique en arrière-plan discret'
        },
        {
          timeframe: '1:30 - 2:30',
          label: '3. Cas d\'Usage Réel & Gain de Temps',
          visualCue: 'Simulation de déploiement en direct : calcul du ROI (100h de gagnées équivalent à plus de 4 000 € de TJM freelance).',
          spokenScript: `Si vous facturez vos clients ou que vous lancez votre propre business, le calcul est vite fait : ce pack coûte €${product.pricing?.recommendedPrice || 49}, mais il vous évite au minimum 80 heures de dev rébarbatif.`,
          onScreenText: `💰 ROI Éprouvé : 80h de dev économisées`,
          audioSoundCue: 'Effet graphique montant'
        },
        {
          timeframe: '2:30 - 3:00',
          label: '4. Verdict & Offre Partenaire Exclusive',
          visualCue: 'Affichage de la page de commande avec le code partenaire actif et le badge de garantie 7 jours.',
          spokenScript: `Pour ma communauté, j'ai négocié une réduction exceptionnelle de -${discount}% avec le code ${code}. Le lien avec la réduction appliquée est en haut de la description et en premier commentaire épinglé !`,
          onScreenText: `🎁 CODE SPÉCIAL : ${code} (-${discount}%)`,
          audioSoundCue: 'Outro musicale chaleureuse'
        }
      ],
      fullSpokenScript: `Salut à tous ! Aujourd'hui, on teste en direct "${product.title}". On va regarder le code, les livrables et voir concrètement ce que ça apporte. Ce qui saute aux yeux dès l'ouverture de l'archive, c'est la propreté. Ce n'est pas un template bâclé : tout est typé, modulaire, sécurisé et prêt pour la production immédiate. Si vous facturez vos clients ou que vous lancez votre propre business, le calcul est vite fait : ce pack coûte €${product.pricing?.recommendedPrice || 49}, mais il vous évite au minimum 80 heures de dev rébarbatif. Pour ma communauté, j'ai négocié une réduction exceptionnelle de -${discount}% avec le code ${code}. Le lien avec la réduction appliquée est en haut de la description et en premier commentaire épinglé !`,
      youtubeChapters: [
        { time: '0:00', title: 'Introduction & Présentation du Pack' },
        { time: '0:45', title: 'Inspection du Code & Des Livrables' },
        { time: '1:45', title: 'Déploiement en Direct & Démo' },
        { time: '2:30', title: 'Calcul du ROI & Réduction Exclusif -20%' }
      ],
      descriptionCopy: `🔥 Obtenez "${product.title}" avec -${discount}% de réduction immédiate :\n👉 ${url}\n🔑 Code promo à appliquer : ${code}\n\n✅ Licence commerciale perpétuelle incluse\n✅ Téléchargement immédiat des fichiers + Facture conforme\n✅ Garantie Satisfait ou Remboursé 7 Jours\n\n#Software #Nextjs #Productivity #SaaS #Coding`,
      pinnedCommentCopy: `👇 Lien direct avec les -${discount}% de réduction automatique : ${url} (N'oubliez pas d'utiliser le code ${code} lors de la validation !)`,
      ctaButtonText: `Profiter de l'Offre Partenaire (-${discount}%)`,
      thumbnailConcepts: [
        'Vignette 1 : Capture d\'écran VS Code avec texte géant "CE PACK CHANGE TOUT"',
        'Vignette 2 : Comparatif "Coder 1 mois VS Déployer en 10 min"',
        'Vignette 3 : Mockup 3D du bundle avec étiquette "Indispensable 2026"'
      ]
    };
  }

  private buildAudioKit(
    channel: AffiliateChannelType, 
    affiliate: AffiliatePartner, 
    product: DigitalProduct, 
    code: string, 
    discount: number,
    url: string
  ): AudioPromoKit {
    return {
      platform: 'podcast',
      formatDuration: '60s_host_read',
      hostPersonaTone: 'Naturel, fluide, spontané, complice et expert (pas de ton publicitaire robotique)',
      hookAudio: `« Avant de poursuivre notre épisode, un mot rapide sur l'outil qui m'a personnellement fait gagner des dizaines d'heures ce mois-ci... »`,
      scriptHostRead: `Un mot rapide sur le partenaire de cet épisode : "${product.title}".\n\nSi vous développez des projets tech, des SaaS ou des business en ligne, vous savez à quel point on peut vite s'enliser dans les détails techniques et les configurations interminables.\n\nCe pack regroupe l'ensemble des modules, automatisations et architectures de référence, testés en conditions réelles et prêts pour la production. C'est du solide, documenté de A à Z avec une vraie licence commerciale.\n\nPour les auditeurs du podcast, vous bénéficiez de -${discount}% de réduction immédiate sur l'ensemble de votre commande en utilisant le code ${code} sur boutique-digitale.fr, ou simplement en cliquant sur le lien dans les notes de l'épisode.\n\nCode : ${code} pour -${discount}%. Merci à eux de soutenir l'émission, et maintenant, place à la suite de notre discussion !`,
      couponPronunciationGuide: `Prononcer distinctement : « ${code.split('').join(' - ')} » en précisant que le code s'écrit en majuscules sans espace.`,
      showNotesBlurb: `🎙️ Sponsor de l'épisode : "${product.title}". Économisez -${discount}% sur votre pack complet avec le code promo « ${code} » via ce lien direct : ${url}`,
      soundBedRecommendation: 'Fond sonore jazzy lo-fi subtil ou nappe synthwave douce à 85 BPM'
    };
  }

  private buildTextKit(
    channel: AffiliateChannelType, 
    affiliate: AffiliatePartner, 
    product: DigitalProduct, 
    code: string, 
    discount: number,
    url: string
  ): TextCopyPromoKit {
    if (channel === 'newsletter') {
      return {
        platform: 'newsletter',
        headlineHooks: [
          `Comment lancer un produit numérique complet ce week-end (sans y laisser sa santé)`,
          `L'architecture prête à l'emploi que j'utilise pour mes propres déploiements`,
          `Ressource exclusive : -${discount}% sur le pack de référence "${product.title}"`
        ],
        subjectLines: [
          { subject: `⚡ La ressource qui m'a fait économiser 80h de dev (accès privé)`, estimatedOpenRate: 48.6 },
          { subject: `[Exclusif] Ton pass VIP -${discount}% sur ${product.title}`, estimatedOpenRate: 52.4 },
          { subject: `Arrête de tout recoder : le pack complet clé en main`, estimatedOpenRate: 44.1 }
        ],
        mainBodyCopy: `Hello à tous,\n\nCette semaine, beaucoup d'entre vous m'ont demandé comment accélérer le time-to-market de leurs projets sans rogner sur la qualité du code.\n\nLa vérité ? Les meilleurs créateurs et développeurs ne réinventent jamais la roue. Ils partent d'une base robuste, testée et optimisée.\n\nC'est exactement ce que propose **${product.title}** :\n\n• **Architecture Pro & Typée** : Zéro compromis sur la sécurité et les bonnes pratiques.\n• **Gain de temps massif** : Économisez entre 60 et 100 heures de travail fastidieux.\n• **Licence Commerciale Illimitée** : Utilisez-le pour vos propres projets et ceux de vos clients.\n• **Garantie 7 Jours** : 100% Satisfait ou remboursé en un clic.\n\nJ'ai pu négocier pour les abonnés de la newsletter une réduction exclusive de **-${discount}%** avec le code **${code}**.\n\n👉 [Débloquer votre pack avec -${discount}%](${url})\n\nProfitez-en tant que l'offre est active !`,
        bulletPointsValue: [
          `Architecture complète prête pour la production immédiate`,
          `Guides pas à pas et checklists d'exécution incluses`,
          `Facture avec TVA déductible et livraison instantanée`,
          `Accès aux futures mises à jour sans surcoût`
        ],
        fomoUrgencyTrigger: `Offre partenaire exclusive limitée aux 50 premiers utilisateurs avec le code ${code}.`,
        callToActionWithTracking: `👉 Accéder à l'offre privée (-${discount}%) : ${url}`,
        psUrgencyNote: `P.S. : Si vous avez le moindre doute, le pack inclut une garantie satisfait ou remboursé de 7 jours sans justification demandée. Vous ne prenez absolument aucun risque.`
      };
    }

    if (channel === 'linkedin') {
      return {
        platform: 'linkedin',
        headlineHooks: [
          `La plupart des développeurs perdent 3 mois sur des briques qui existent déjà.`,
          `Voici comment nous avons divisé par 4 le coût de lancement de nos applications en 2026.`,
          `Retour d'expérience sans filtre sur le déploiement d'une stack prête pour la production.`
        ],
        mainBodyCopy: `90% des projets numériques échouent non pas à cause de l'idée, mais à cause du temps perdu sur des détails d'infrastructure au lieu de confronter le produit au marché.\n\nEn 2026, recoder son authentification, sa passerelle de paiement et ses formulaires de zéro est une erreur stratégique majeure.\n\nC'est pour cette raison que je recommande **${product.title}** :\n\n🔹 Architecture robuste et testée pour la charge\n🔹 Intégration fluide et documentation limpide\n🔹 Économie estimée : 80 heures d'ingénierie par projet\n\nPour mon réseau, un code exclusif de -${discount}% est disponible : **${code}**.\n\nLien direct vers la documentation et l'accès : ${url}\n\nEt vous, quelle est votre règle d'or pour maximiser votre vélocité de lancement ? Partageons nos retours en commentaires.`,
        bulletPointsValue: [
          `Réduction drastique du time-to-market`,
          `Code source propre conforme aux standards d'entreprise`,
          `Licence commerciale incluse pour agences et freelances`
        ],
        fomoUrgencyTrigger: `Code ${code} actif pour la semaine de lancement.`,
        callToActionWithTracking: `Consulter l'architecture complète : ${url}`
      };
    }

    // Default: Twitter / X Thread or Viral Post
    return {
      platform: 'twitter',
      headlineHooks: [
        `🧵 1/7 Arrêtez de passer 4 semaines à configurer votre stack. Voici la boîte à outils ultime qui change la donne :`,
        `Si vous lancez un business digital en 2026, gardez ce tweet sous la main (vous me remercierez plus tard) 👇`,
        `Comment diviser votre temps de dev par 5 sans sacrifier la qualité ? Déroulez le thread ⚡`
      ],
      mainBodyCopy: `🧵 1/5 Arrêtez de coder vos infrastructures de zéro. Les meilleurs solopreneurs utilisent des fondations prêtes pour la production.\n\n2/5 J'ai testé **${product.title}** :\n- Code propre et typé\n- Automatismes configurés\n- Tout est documenté pas à pas\n\n3/5 Le calcul est simple : au lieu de perdre 80h de dev (soit ~3000€ de TJM), vous déployez en 30 minutes.\n\n4/5 Les créateurs m'ont fourni un code exclusif de -${discount}% pour ma commu : utilisez **${code}** !\n\n5/5 👉 Accès immédiat aux fichiers : ${url}\n\n(RT le premier tweet pour soutenir la veille !)`,
      bulletPointsValue: [
        `Déploiement en 15 minutes chrono`,
        `Licence commerciale perpétuelle`,
        `Code source complet sans abonnement récurrent`
      ],
      fomoUrgencyTrigger: `Code ${code} valable sur les prochains accès.`,
      callToActionWithTracking: `👉 Profiter des -${discount}% immédiats : ${url}`
    };
  }

  // =========================================================================
  // 🚀 TRANSMISSION AUTONOME & HISTORIQUE DES ENVOIS
  // =========================================================================

  public transmitPromoKitToAffiliate(
    kitId: string, 
    channel: 'email' | 'discord_webhook' | 'telegram_bot' | 'dashboard_direct' = 'email',
    skipSaves: boolean = false
  ): { success: boolean; message: string; log: PromoTransmissionLog } {
    const kit = this.kits.find(k => k.id === kitId);
    if (!kit) {
      throw new Error(`Kit promotionnel introuvable (#${kitId})`);
    }

    const now = new Date().toISOString();
    kit.lastTransmittedAt = now;
    kit.transmissionStatus = 'transmitted';
    kit.transmissionChannel = channel;

    const affiliate = this.getAffiliatesFn().find(a => a.id === kit.affiliateId);
    if (affiliate) {
      affiliate.lastPromoKitTransmittedAt = now;
      affiliate.promoKitsCount = (affiliate.promoKitsCount || 0) + 1;
      if (!skipSaves) this.saveAffiliatesFn();
    }

    const log: PromoTransmissionLog = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      affiliateId: kit.affiliateId,
      affiliateName: kit.affiliateName,
      affiliateEmail: affiliate?.email || `${kit.affiliateHandle}@partner.io`,
      channel: kit.affiliateChannel,
      productId: kit.productId,
      productTitle: kit.productTitle,
      transmittedAt: now,
      status: 'delivered',
      deliveryChannel: channel,
      notes: `Supports (Vidéo ${kit.videoKit.durationSeconds}s, Audio 60s, Copywriting ${kit.textKit.platform}) transmis avec code ${kit.referralCode} (-${kit.discountPercent}%).`
    };

    this.transmissionLogs.unshift(log);
    if (this.transmissionLogs.length > 100) this.transmissionLogs.pop();

    if (!skipSaves) {
      this.saveState();
      store.addLog(
        'success',
        'marketing',
        `📦 Agent d'Affiliation : Kit promotionnel multi-formats (Vidéo, Audio, Texte) transmis à ${kit.affiliateName} (${kit.affiliateChannel.toUpperCase()}) pour le produit "${kit.productTitle}".`
      );
    }

    return {
      success: true,
      message: `Kit promotionnel transmis avec succès à ${kit.affiliateName} via ${channel.replace('_', ' ')} !`,
      log
    };
  }

  // Transmit all kits for all active viable affiliates
  public transmitAllPacksToViableAffiliates(): { totalTransmitted: number; results: PromoTransmissionLog[] } {
    const affiliates = this.getAffiliatesFn().filter(a => a.viabilityStatus === 'viable');
    const products = store.getProducts();
    const results: PromoTransmissionLog[] = [];

    affiliates.forEach(aff => {
      // Pick top 2 products for each affiliate
      const topProducts = products.slice(0, 2);
      topProducts.forEach(prod => {
        let kit = Array.isArray(this.kits) ? this.kits.find(k => k && k.affiliateId === aff.id && k.productId === prod.id) : undefined;
        if (!kit) {
          kit = this.generatePromoKit(aff, prod, 20, true); // skipSaves
        }
        const deliveryChan = aff.channel === 'discord' ? 'discord_webhook' : aff.channel === 'telegram' ? 'telegram_bot' : 'email';
        const res = this.transmitPromoKitToAffiliate(kit.id, deliveryChan, true); // skipSaves
        results.push(res.log);
      });
    });

    // Bulk save and notify once at the end
    this.saveState();
    this.saveAffiliatesFn(); // Triggers SalesExplosion update
    
    store.addLog(
      'success',
      'marketing',
      `⚡ Campagne Promotionnelle d'Affiliation : ${results.length} kits de supports multi-formats (Vidéo/Audio/Texte) distribués aux partenaires actifs.`
    );

    return {
      totalTransmitted: results.length,
      results
    };
  }

  private generateInitialKits() {
    const affiliates = this.getAffiliatesFn();
    const products = store.getProducts();

    if (affiliates.length > 0 && products.length > 0) {
      affiliates.slice(0, 3).forEach(aff => {
        products.slice(0, 2).forEach(prod => {
          this.generatePromoKit(aff, prod, 20);
        });
      });
    }
  }

  // Export full markdown bundle
  public generateMarkdownExport(kit: AffiliatePromoKit): string {
    return `# 📦 KIT PROMOTIONNEL DÉDIÉ AUX AFFILIÉS : ${kit.productTitle.toUpperCase()}
Partenaire : ${kit.affiliateName} (${kit.affiliateHandle})
Canal d'acquisition : ${kit.affiliateChannel.toUpperCase()}
Code Promo Exclusif : ${kit.referralCode} (-${kit.discountPercent}%)
Lien de Tracking : ${kit.affiliateTrackingUrl}
Commission Affilié : 30% à 35% par vente validée

---

## 🎬 1. SUPPORT VIDÉO & STORYBOARD (${kit.videoKit.formatTitle})
Durée recommandée : ${kit.videoKit.durationSeconds} secondes

### Variantes d'Accroches Virales (0-3s) :
${kit.videoKit.hookVariations.map((h, i) => `${i + 1}. ${h}`).join('\n')}

### Découpage du Storyboard Scène par Scène :
${kit.videoKit.storyboard.map(s => `#### [${s.timeframe}] ${s.label}
- 👁️ Direction Visuelle : ${s.visualCue}
- 🎙️ Voix / Script : "${s.spokenScript}"
- 📱 Texte à l'écran : ${s.onScreenText}
- 🎵 Effet Sonore : ${s.audioSoundCue || 'N/A'}
`).join('\n')}

### Script Parlé Intégral (Téléprompteur) :
> "${kit.videoKit.fullSpokenScript}"

### Texte de Description & Lien :
\`\`\`
${kit.videoKit.descriptionCopy}
\`\`\`

### Commentaire Épinglé :
\`\`\`
${kit.videoKit.pinnedCommentCopy}
\`\`\`

---

## 🎙️ 2. SUPPORT AUDIO & PODCAST HOST-READ
Format : ${kit.audioKit.formatDuration.replace('_', ' ')}
Tonalité recommandée : ${kit.audioKit.hostPersonaTone}

### Accroche Audio Spontanée :
> ${kit.audioKit.hookAudio}

### Script Intégral Host-Read :
\`\`\`
${kit.audioKit.scriptHostRead}
\`\`\`

### Guide de Prononciation du Code Promo :
${kit.audioKit.couponPronunciationGuide}

### Texte pour les Notes d'Épisode (Show Notes) :
${kit.audioKit.showNotesBlurb}

---

## ✍️ 3. SUPPORT TEXTE & COPYWRITING (${kit.textKit.platform.toUpperCase()})

### Accroches / Titres Percutants :
${kit.textKit.headlineHooks.map((h, i) => `• Variante ${i + 1} : ${h}`).join('\n')}

### Corps du Texte / Thread / Newsletter :
\`\`\`markdown
${kit.textKit.mainBodyCopy}
\`\`\`

### Points de Valeur Clés :
${kit.textKit.bulletPointsValue.map(b => `- ✅ ${b}`).join('\n')}

### Déclencheur d'Urgence (FOMO) :
${kit.textKit.fomoUrgencyTrigger}

### Appel à l'Action :
${kit.textKit.callToActionWithTracking}

---

## 🎨 4. DIRECTIVES VISUELLES & COUVERTURES
${kit.visualBannerPrompts.map(b => `### Format : ${b.bannerType.toUpperCase()}
- 💡 Prompt de Génération Visuelle : "${b.promptText}"
- 🏷️ Texte Titre en Incrustation : "${b.headlineOverlay}"
`).join('\n')}

---
Support d'Affiliation 24/7 & Paiements Automatisés en Crypto (USDC/SOL/BTC) ou Stripe.
Garantie 7 Jours Satisfait ou Remboursé pour tous vos acheteurs.
`;
  }

  public runAutonomousAffiliateTick(products: any[], affiliates: any[]) {
    if (!Array.isArray(this.kits)) {
      this.kits = [];
    }
    if (!Array.isArray(products) || products.length === 0 || !Array.isArray(affiliates) || affiliates.length === 0) return;

    const existingKeys = new Set(this.kits.map(k => `${k.affiliateId}:${k.productId}`));

    // Only inspect top 15 active affiliates to prevent heavy CPU looping across 1500+ items
    const sampleAffiliates = affiliates.slice(0, 15);
    let generated = 0;

    for (const product of products.slice(0, 5)) {
      for (const affiliate of sampleAffiliates) {
        if (!affiliate || affiliate.status !== 'active') continue;
        const key = `${affiliate.id}:${product.id}`;
        if (!existingKeys.has(key) && generated < 1) {
          this.generatePromoKit(affiliate, product, affiliate.commissionRate || 20, true);
          existingKeys.add(key);
          generated++;
          break;
        }
      }
      if (generated >= 1) break;
    }

    if (generated > 0) {
      this.saveState();
      this.notify();
    }
  }
}

export const affiliatePromoKitService = new AffiliatePromoKitService();

onSyncReady(() => {
  affiliatePromoKitService.reloadFromServer();
});
