import { DigitalProduct } from '../types';

export interface StorefrontChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

class StorefrontAiAssistantService {
  private messages: StorefrontChatMessage[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.messages = [
      {
        id: 'welcome',
        sender: 'ai',
        text: '👋 Bonjour ! Je suis votre assistant virtuel Nexus. Je suis là pour vous conseiller sur nos architectures logicielles, répondre à vos questions techniques ou vous guider vers le meilleur produit pour votre besoin.',
        timestamp: new Date().toISOString()
      }
    ];
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getMessages() {
    return this.messages;
  }

  async sendMessage(text: string, currentProduct?: DigitalProduct | null) {
    // Add user message
    this.messages.push({
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    });
    this.notify();

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 800));

    let responseText = '';
    const q = text.toLowerCase();

    // 1. CONSEIL (Advice)
    if (q.includes('conseil') || q.includes('recommand') || q.includes('choisir') || q.includes('lequel')) {
      responseText = "💡 **Conseil d'Expert :** Si vous cherchez à lancer rapidement un projet SaaS, je vous recommande le **Nexus SaaS Boilerplate**. Il inclut déjà Stripe, l'authentification et une base de données configurée. Si vous cherchez plutôt à acquérir du trafic, penchez-vous sur nos **Packs de Prompts SEO**.";
    } 
    // 2. FAQ & CLARTÉ (FAQ & Delivery)
    else if (q.includes('comment') && (q.includes('recevoir') || q.includes('marche') || q.includes('livraison'))) {
      responseText = "📦 **Livraison et Accès :**\n1. Vous validez le paiement sécurisé via Stripe ou Crypto.\n2. Vous recevez instantanément un email contenant votre facture et un lien de téléchargement sécurisé.\n3. Vous conservez un accès à vie aux fichiers et à toutes les futures mises à jour.";
    } 
    // 3. SERVICE CLIENT (Support)
    else if (q.includes('rembours') || q.includes('garantie') || q.includes('problème')) {
      responseText = "🛡️ **Service Client & Garantie :** Tous nos produits bénéficient d'une garantie \"Satisfait ou Remboursé\" de 7 jours. Si un produit ne correspond pas à vos attentes, contactez simplement support@nexus.io et nous vous rembourserons intégralement sous 24h, sans poser de questions.";
    }
    // Contextual Product queries
    else if (currentProduct && (q.includes('ce produit') || q.includes('produit'))) {
      responseText = `🤖 À propos de **${currentProduct.title}** :\nCe produit est de niveau ${currentProduct.level}. Il est conçu pour résoudre ce problème précis : "${currentProduct.problemSolved}".\n\nN'hésitez pas à cliquer sur "Voir la Démo Live" pour explorer l'architecture complète !`;
    }
    // Fallback
    else {
      responseText = "Je suis une IA spécialisée dans le catalogue Nexus. Pouvez-vous préciser votre besoin en matière de développement, de design ou de productivité technique ?";
    }

    this.messages.push({
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: responseText,
      timestamp: new Date().toISOString()
    });
    this.notify();
  }
}

export const storefrontAiAssistantService = new StorefrontAiAssistantService();
