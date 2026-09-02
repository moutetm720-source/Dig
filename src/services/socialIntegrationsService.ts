import { DigitalProduct } from '../types';
import { store } from './store';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export type SocialNetworkPlatform = 
  | 'twitter'
  | 'linkedin'
  | 'discord'
  | 'telegram'
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'reddit'
  | 'pinterest'
  | 'devto'
  | 'webhook';

export interface SocialIntegrationItem {
  id: string;
  platform: SocialNetworkPlatform;
  name: string;
  category: 'social' | 'community' | 'video' | 'blog' | 'automation';
  badgeColor: string;
  accountName: string;
  handle: string;
  profileUrl: string;
  authStrategy: 'api_keys' | 'webhook' | 'oauth_token' | 'bot_token';
  // Credentials & Endpoints
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  botToken?: string;
  chatIdOrChannel?: string;
  webhookUrl?: string;
  // Automation settings
  autoPublishEnabled: boolean;
  frequencyHours: number;
  preferredFormat: 'vertical_video' | 'carousel_slides' | 'text_thread' | 'rich_embed' | 'markdown_article';
  redirectStrategy: 'direct_product' | 'bio_link' | 'promo_coupon' | 'storefront';
  discountCode?: string;
  discountPercent?: number;
  // Status & Telemetry
  status: 'connected' | 'configured' | 'standby' | 'error';
  lastTestedAt?: string;
  lastTestMessage?: string;
  lastPublishedAt?: string;
  totalDispatches: number;
  logs: string[];
  devPortalUrl: string;
  setupGuide: string[];
}

const DEFAULT_INTEGRATIONS: SocialIntegrationItem[] = [
  {
    id: 'net_twitter',
    platform: 'twitter',
    name: 'X (Twitter)',
    category: 'social',
    badgeColor: '#1DA1F2',
    accountName: 'Digital Product Factory (@ProductFactoryHQ)',
    handle: '@ProductFactoryHQ',
    profileUrl: 'https://x.com/ProductFactoryHQ',
    authStrategy: 'api_keys',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 4,
    preferredFormat: 'text_thread',
    redirectStrategy: 'direct_product',
    discountCode: 'TWITTER20',
    discountPercent: 20,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Générateur de threads viraux prêt pour X / Twitter',
      'Format concis (<280 car.), accroche de rupture et lien UTM configurés'
    ],
    devPortalUrl: 'https://developer.twitter.com/en/portal/dashboard',
    setupGuide: [
      '1. Connectez-vous sur developer.twitter.com et créez une App dans votre projet.',
      '2. Dans "Keys and Tokens", générez vos API Key, API Secret et Bearer Token.',
      '3. Collez vos clés ci-dessous pour autoriser la diffusion automatique de threads.'
    ]
  },
  {
    id: 'net_linkedin',
    platform: 'linkedin',
    name: 'LinkedIn Pro & Entreprise',
    category: 'social',
    badgeColor: '#0A66C2',
    accountName: 'Digital Product Factory Company Page',
    handle: 'digital-product-factory',
    profileUrl: 'https://linkedin.com/company/digital-product-factory',
    authStrategy: 'oauth_token',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 8,
    preferredFormat: 'carousel_slides',
    redirectStrategy: 'direct_product',
    discountCode: 'LINKEDIN25',
    discountPercent: 25,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Pipeline de carrousels PDF & posts d’autorité LinkedIn configuré',
      'Accroche orientée ROI et productivité B2B activée'
    ],
    devPortalUrl: 'https://www.linkedin.com/developers/apps',
    setupGuide: [
      '1. Rendez-vous sur linkedin.com/developers et créez votre application liée à votre Page Entreprise.',
      '2. Activez le produit "Share on LinkedIn" et générez votre Access Token dans l’onglet Auth.',
      '3. Renseignez votre token ou webhook Zapier/Make pour publier des posts à haute autorité.'
    ]
  },
  {
    id: 'net_discord',
    platform: 'discord',
    name: 'Discord Hub Communautaire',
    category: 'community',
    badgeColor: '#5865F2',
    accountName: 'Digital Product Factory Discord Server',
    handle: '#product-releases',
    profileUrl: 'https://discord.gg',
    authStrategy: 'webhook',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 2,
    preferredFormat: 'rich_embed',
    redirectStrategy: 'direct_product',
    discountCode: 'DISCORDVIP',
    discountPercent: 20,
    status: 'standby',
    totalDispatches: 0,
    logs: [
      'Format JSON Rich Embed prêt pour Discord',
      'Affichage instantané du prix, bénéfices et bouton de téléchargement'
    ],
    devPortalUrl: 'https://discord.com/developers/docs/resources/webhook',
    setupGuide: [
      '1. Dans votre serveur Discord, faites un clic droit sur votre salon (#annonces ou #releases) > Paramètres du salon.',
      '2. Allez dans Intégrations > Webhooks > Créer un webhook.',
      '3. Cliquez sur "Copier l\'URL du webhook" et collez-la ci-dessous, puis cliquez sur "Tester la Connexion".'
    ]
  },
  {
    id: 'net_telegram',
    platform: 'telegram',
    name: 'Telegram Canal VIP & Broadcast',
    category: 'community',
    badgeColor: '#229ED9',
    accountName: 'Digital Product Factory VIP Channel',
    handle: '@DigitalProductFactory',
    profileUrl: 'https://t.me/DigitalProductFactory',
    authStrategy: 'bot_token',
    botToken: '',
    chatIdOrChannel: '',
    autoPublishEnabled: true,
    frequencyHours: 3,
    preferredFormat: 'rich_embed',
    redirectStrategy: 'direct_product',
    discountCode: 'TELEGRAM30',
    discountPercent: 30,
    status: 'standby',
    totalDispatches: 0,
    logs: [
      'Passerelle Telegram Bot API instantanée (<10ms)',
      'Formatage Markdown et boutons de redirection configurés'
    ],
    devPortalUrl: 'https://t.me/BotFather',
    setupGuide: [
      '1. Ouvrez Telegram et lancez une discussion avec @BotFather.',
      '2. Envoyez la commande /newbot, choisissez un nom et copiez le Bot Token (ex: 123456:ABC-DEF...).',
      '3. Créez un canal ou groupe public/privé, ajoutez votre Bot comme Administrateur, puis renseignez le @nom_du_canal ou l’ID.'
    ]
  },
  {
    id: 'net_tiktok',
    platform: 'tiktok',
    name: 'TikTok Video Creator',
    category: 'video',
    badgeColor: '#FE2C55',
    accountName: 'Digital Product Factory (@digitalproductfactory)',
    handle: '@digitalproductfactory',
    profileUrl: 'https://tiktok.com/@digitalproductfactory',
    authStrategy: 'oauth_token',
    accessToken: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 4,
    preferredFormat: 'vertical_video',
    redirectStrategy: 'bio_link',
    discountCode: 'TIKTOK15',
    discountPercent: 15,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Générateur de scripts vidéos 9:16 verticaux optimisé rétention 0-3s',
      'Prompts IA B-Roll et sous-titres dynamiques prêts'
    ],
    devPortalUrl: 'https://developers.tiktok.com',
    setupGuide: [
      '1. Créez votre compte créateur / entreprise sur TikTok.',
      '2. Activez l\'accès Content Posting API sur developers.tiktok.com ou utilisez un Webhook d\'automatisation (Make/Zapier).',
      '3. Renseignez l\'URL de publication ou le token pour recevoir automatiquement les scripts et assets vidéos prêts à poster.'
    ]
  },
  {
    id: 'net_instagram',
    platform: 'instagram',
    name: 'Instagram Reels & Carousels',
    category: 'social',
    badgeColor: '#E1306C',
    accountName: 'Digital Product Factory Official',
    handle: '@digitalproductfactory',
    profileUrl: 'https://instagram.com/digitalproductfactory',
    authStrategy: 'oauth_token',
    accessToken: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 6,
    preferredFormat: 'carousel_slides',
    redirectStrategy: 'bio_link',
    discountCode: 'INSTA20',
    discountPercent: 20,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Moteur de carrousels esthétiques (1:1 & 4:5) et légendes avec mot-clé DM configuré'
    ],
    devPortalUrl: 'https://developers.facebook.com/docs/instagram-api',
    setupGuide: [
      '1. Associez votre compte Instagram Pro à une Page Facebook dans Meta Business Suite.',
      '2. Dans Meta for Developers, configurez l\'Instagram Graph API avec la permission "instagram_content_publish".',
      '3. Renseignez votre User Access Token ou votre Webhook d\'ingestion pour une publication automatique.'
    ]
  },
  {
    id: 'net_youtube',
    platform: 'youtube',
    name: 'YouTube & Shorts Channel',
    category: 'video',
    badgeColor: '#FF0000',
    accountName: 'Digital Product Factory Channel',
    handle: '@DigitalProductFactory',
    profileUrl: 'https://youtube.com/@DigitalProductFactory',
    authStrategy: 'api_keys',
    apiKey: '',
    accessToken: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 8,
    preferredFormat: 'vertical_video',
    redirectStrategy: 'direct_product',
    discountCode: 'YOUTUBE20',
    discountPercent: 20,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Scripts Shorts & descriptions avec liens cliquables trackés configurés'
    ],
    devPortalUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    setupGuide: [
      '1. Ouvrez Google Cloud Console et activez l\'API YouTube Data v3.',
      '2. Créez des identifiants OAuth 2.0 ou une clé API.',
      '3. Renseignez votre token ou webhook pour synchroniser la publication de Shorts et descriptions optimisées SEO.'
    ]
  },
  {
    id: 'net_reddit',
    platform: 'reddit',
    name: 'Reddit Communautés & Subreddit',
    category: 'community',
    badgeColor: '#FF4500',
    accountName: 'u/DigitalProductFactory',
    handle: 'r/DigitalProductFactory',
    profileUrl: 'https://reddit.com/r/DigitalProductFactory',
    authStrategy: 'api_keys',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 12,
    preferredFormat: 'markdown_article',
    redirectStrategy: 'direct_product',
    discountCode: 'REDDIT20',
    discountPercent: 20,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Format posts textuels à forte valeur ajoutée (anti-spam) prêt'
    ],
    devPortalUrl: 'https://www.reddit.com/prefs/apps',
    setupGuide: [
      '1. Rendez-vous sur reddit.com/prefs/apps et cliquez sur "are you a developer? create an app...".',
      '2. Sélectionnez le type "script", notez votre Client ID (sous le nom) et votre Secret.',
      '3. Renseignez vos identifiants ou votre Webhook pour diffuser des analyses et guides complets.'
    ]
  },
  {
    id: 'net_pinterest',
    platform: 'pinterest',
    name: 'Pinterest Tableaux & Épingles',
    category: 'social',
    badgeColor: '#E60023',
    accountName: 'Digital Product Factory Pins',
    handle: '@digitalproductfactory',
    profileUrl: 'https://pinterest.com/digitalproductfactory',
    authStrategy: 'oauth_token',
    accessToken: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 6,
    preferredFormat: 'rich_embed',
    redirectStrategy: 'direct_product',
    discountCode: 'PINS20',
    discountPercent: 20,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Créateur d’épingles riches avec liens profonds vers chaque produit'
    ],
    devPortalUrl: 'https://developers.pinterest.com',
    setupGuide: [
      '1. Créez un compte Business sur Pinterest.',
      '2. Sur developers.pinterest.com, générez un Access Token avec la permission "pins:write".',
      '3. Renseignez votre token ou webhook pour générer des épingles visuelles continues.'
    ]
  },
  {
    id: 'net_devto',
    platform: 'devto',
    name: 'Dev.to, Hashnode & Medium',
    category: 'blog',
    badgeColor: '#0A0A0A',
    accountName: 'Digital Product Factory Engineering Blog',
    handle: '@digitalproductfactory',
    profileUrl: 'https://dev.to/digitalproductfactory',
    authStrategy: 'api_keys',
    apiKey: '',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 24,
    preferredFormat: 'markdown_article',
    redirectStrategy: 'direct_product',
    discountCode: 'DEVTO25',
    discountPercent: 25,
    status: 'configured',
    totalDispatches: 0,
    logs: [
      'Moteur de rédaction d’articles techniques et documentations logicielles'
    ],
    devPortalUrl: 'https://dev.to/settings/extensions',
    setupGuide: [
      '1. Connectez-vous sur Dev.to > Settings > Extensions.',
      '2. Dans la section "DEV Community API Keys", générez une nouvelle clé API.',
      '3. Collez la clé API ci-dessous pour publier automatiquement vos articles de fond et documentations.'
    ]
  },
  {
    id: 'net_webhook_universal',
    platform: 'webhook',
    name: 'Make.com / Zapier / n8n Universel',
    category: 'automation',
    badgeColor: '#6366F1',
    accountName: 'Make / Zapier Automation Webhook',
    handle: 'Universal Automation Pipeline',
    profileUrl: 'https://make.com',
    authStrategy: 'webhook',
    webhookUrl: '',
    autoPublishEnabled: true,
    frequencyHours: 1,
    preferredFormat: 'rich_embed',
    redirectStrategy: 'direct_product',
    discountCode: 'AUTO20',
    discountPercent: 20,
    status: 'standby',
    totalDispatches: 0,
    logs: [
      'Déclencheur d’événements en temps réel (Nouveaux Produits, Ventes, Campagnes)'
    ],
    devPortalUrl: 'https://make.com',
    setupGuide: [
      '1. Dans Make.com, Zapier ou n8n, créez un nouveau scénario avec un déclencheur "Custom Webhook".',
      '2. Copiez l\'URL fournie (ex: https://hook.eu1.make.com/...) et collez-la ci-dessous.',
      '3. Cliquez sur "Tester la Connexion" pour envoyer un payload d\'échantillon structuré.'
    ]
  }
];

class SocialIntegrationsService {
  private integrations: SocialIntegrationItem[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadState();
    this.syncFromServer();
  }

  private loadState() {
    const saved = safeGetItem<SocialIntegrationItem[]>('df_social_integrations_v1', DEFAULT_INTEGRATIONS);
    // Merge saved with default templates to ensure newly added platforms exist
    const merged = DEFAULT_INTEGRATIONS.map(def => {
      const found = saved.find(s => s.id === def.id || s.platform === def.platform);
      return found ? { ...def, ...found } : def;
    });
    this.integrations = merged;
  }

  private async syncFromServer() {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('df_moderator_passcode') || '2026' : '2026';
      const res = await fetch('/api/store/get?key=df_social_integrations_v1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.value) && data.value.length > 0) {
          const serverList: SocialIntegrationItem[] = data.value;
          this.integrations = DEFAULT_INTEGRATIONS.map(def => {
            const found = serverList.find(s => s.id === def.id || s.platform === def.platform);
            return found ? { ...def, ...found } : def;
          });
          safeSetItem('df_social_integrations_v1', this.integrations);
          this.notify();
        }
      }
    } catch (e) {
      // Offline fallback is safe
    }
  }

  public getIntegrations(): SocialIntegrationItem[] {
    return [...this.integrations];
  }

  public getIntegration(id: string): SocialIntegrationItem | undefined {
    return this.integrations.find(i => i.id === id);
  }

  public updateIntegration(id: string, updates: Partial<SocialIntegrationItem>): void {
    this.integrations = this.integrations.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        // If credentials filled, mark as configured/connected
        if (updated.webhookUrl || updated.botToken || updated.apiKey || updated.accessToken) {
          if (updated.status === 'standby') {
            updated.status = 'configured';
          }
        }
        return updated;
      }
      return item;
    });
    this.save();
    this.notify();
  }

  public async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const item = this.integrations.find(i => i.id === id);
    if (!item) return { success: false, message: 'Intégration introuvable.' };

    try {
      const res = await fetch('/api/social/verify-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: item.platform,
          webhookUrl: item.webhookUrl,
          botToken: item.botToken,
          chatIdOrChannel: item.chatIdOrChannel,
          apiKey: item.apiKey,
          apiSecret: item.apiSecret,
          accessToken: item.accessToken
        })
      });

      const data = await res.json();
      const now = new Date().toISOString();

      this.updateIntegration(id, {
        status: data.success ? 'connected' : 'error',
        lastTestedAt: now,
        lastTestMessage: data.message || (data.success ? 'Connexion validée en direct !' : 'Échec de connexion.'),
        logs: [
          `[${new Date().toLocaleTimeString()}] Test: ${data.message || (data.success ? 'Succès' : 'Échec')}`,
          ...item.logs.slice(0, 8)
        ]
      });

      if (data.success) {
        store.addLog('success', 'agent', `Connexion ${item.name} validée en temps réel avec succès !`);
      } else {
        store.addLog('error', 'agent', `Erreur test ${item.name} : ${data.message}`);
      }

      return { success: data.success, message: data.message };
    } catch (err: any) {
      const errMsg = `Erreur réseau : ${err.message}`;
      this.updateIntegration(id, {
        status: 'error',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: errMsg
      });
      return { success: false, message: errMsg };
    }
  }

  public async publishTestPost(id: string, product?: DigitalProduct): Promise<{ success: boolean; message: string }> {
    const item = this.integrations.find(i => i.id === id);
    if (!item) return { success: false, message: 'Intégration introuvable.' };

    const targetProduct = product || store.getProducts()[0] || {
      id: 'prod-nexus-1',
      title: 'Digital Enterprise Hub & Automation Blueprint',
      pricing: { recommendedPrice: 39 }
    };

    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://digitalproductfactory.com';
    const couponParam = item.discountCode ? `&coupon=${item.discountCode}` : '';
    const productUrl = `${originUrl}/?product=${targetProduct.id}&utm_source=${item.platform}&utm_medium=social_hub${couponParam}`;

    const postText = `Découvrez "${targetProduct.title}" — Solution digitale complète prête à l'emploi. Accès instantané et mises à jour incluses. ${item.discountCode ? `Utilisez le code ${item.discountCode} pour -${item.discountPercent || 20}%.` : ''}`;

    try {
      const res = await fetch('/api/social/publish-test-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: item.platform,
          webhookUrl: item.webhookUrl,
          botToken: item.botToken,
          chatIdOrChannel: item.chatIdOrChannel,
          postTitle: `🚀 Nouveau Produit : ${targetProduct.title}`,
          postText,
          productUrl,
          price: targetProduct.pricing?.recommendedPrice || 29
        })
      });

      const data = await res.json();
      const now = new Date().toISOString();

      if (data.success) {
        this.updateIntegration(id, {
          lastPublishedAt: now,
          totalDispatches: (item.totalDispatches || 0) + 1,
          status: 'connected',
          logs: [
            `[${new Date().toLocaleTimeString()}] Post publié : "${targetProduct.title}"`,
            ...item.logs.slice(0, 8)
          ]
        });
        store.addLog('success', 'marketing', `Post diffusé avec succès sur ${item.name} !`);
      }

      return { success: data.success, message: data.message || 'Diffusion terminée.' };
    } catch (err: any) {
      return { success: false, message: `Erreur diffusion : ${err.message}` };
    }
  }

  public async triggerAllActiveBroadcast(product?: DigitalProduct): Promise<{ dispatchedCount: number; results: Array<{ name: string; success: boolean }> }> {
    const activeIntegrations = this.integrations.filter(i => 
      i.autoPublishEnabled && (i.webhookUrl || i.botToken || i.apiKey || i.accessToken)
    );

    const targetProduct = product || store.getProducts()[0];
    if (!targetProduct) return { dispatchedCount: 0, results: [] };

    const results: Array<{ name: string; success: boolean }> = [];

    for (const item of activeIntegrations) {
      const res = await this.publishTestPost(item.id, targetProduct);
      results.push({ name: item.name, success: res.success });
    }

    store.addLog('info', 'marketing', `Diffusion autonome exécutée sur ${results.filter(r => r.success).length} canaux actifs.`);
    return {
      dispatchedCount: results.filter(r => r.success).length,
      results
    };
  }

  public async saveAll(): Promise<boolean> {
    this.save();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('df_moderator_passcode') || '2026' : '2026';
      await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          df_social_integrations_v1: this.integrations
        })
      });
      store.addLog('success', 'agent', 'Configurations des réseaux sociaux enregistrées et synchronisées dans la base de données SQL.');
      return true;
    } catch (err) {
      console.warn('Could not sync social integrations to server:', err);
      return false;
    }
  }

  private save() {
    safeSetItem('df_social_integrations_v1', this.integrations);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const socialIntegrationsService = new SocialIntegrationsService();
