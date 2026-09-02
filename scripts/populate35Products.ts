import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { DigitalProduct } from '../src/types';

export const products35: DigitalProduct[] = [
  // ========================================================
  // 🤖 1. INTELLIGENCE ARTIFICIELLE & PROMPTS (6 PRODUITS)
  // ========================================================
  {
    id: 'prod-2',
    opportunityId: 'opp-2',
    title: '500+ High-Converting AI Copywriting & Sales Prompts Pack',
    subtitle: 'Prompts multi-shot de niveau expert pour Claude 3.7 & GPT-4o : pages de vente, séquences emails et hooks vidéo viraux.',
    category: 'Intelligence Artificielle & Prompts',
    format: 'prompt_pack',
    targetAudience: 'Copywriters, Marketeurs, E-commerçants, Solopreneurs',
    problemSolved: 'Élimine les réponses IA génériques et molles grâce à des architectures de prompts calibrées avec contraintes négatives et psychologie de conversion.',
    promisedOutcome: 'Rédigez des copies de vente à fort taux de conversion en 10 minutes au lieu de 6 heures.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 37,
      minPrice: 29,
      maxPrice: 59,
      promoPrice: 27,
      bundlePrice: 22,
      compareAtPrice: 67,
      currency: 'EUR',
      discountPercent: 45,
      attractiveBadge: '⭐ Meilleure Vente IA',
      isFlashSale: false
    },
    status: 'published',
    tier: 'winner',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96, utility: 96 },
    content: {
      summary: '520 prompts direct-response classés par intention d\'achat avec variables dynamiques prêtes à l\'emploi.',
      structure: [
        'Architecture de Landing Page & Scripts VSL (85 Prompts)',
        'Séquences de Prospection B2B & Cold Email (70 Prompts)',
        'Publicités Meta Ads, Google & TikTok (110 Prompts)',
        'Growth & Posts d\'Autorité LinkedIn / X (95 Prompts)',
        'Relances de Paniers Abandonnés & Upsells (60 Prompts)',
        'Traitement des Objections & Garanties (100 Prompts)'
      ],
      downloadableFiles: [
        {
          id: 'f-2-1',
          filename: '500-AI-Copywriting-Prompts-Vault.pdf',
          fileType: 'pdf',
          size: '6.5 MB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/500-ai-copy-vault.pdf',
          contentSnippet: 'Guide interactif de 120 pages avec prompts copy-paste et règles de contextualisation.',
          downloadCount: 420
        },
        {
          id: 'f-2-2',
          filename: 'Prompts-Database-Airtable-Notion.csv',
          fileType: 'csv',
          size: '850 KB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/prompts-database.csv',
          contentSnippet: 'Export structuré CSV prêt pour intégration dans Notion ou Airtable.',
          downloadCount: 380
        }
      ]
    },
    packaging: {
      badge: 'Top Vente IA ⭐ 4.96/5',
      keyBenefits: [
        '520+ Prompts direct-response testés en production',
        'Zéro blabla : contraintes négatives anti-clichés intégrées',
        'Variables [CIBLE], [DOULEUR], [BÉNÉFICE] prêtes à copier-coller',
        'Compatible Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 et DeepSeek'
      ],
      faqs: [
        { q: 'Quels modèles d\'IA fonctionnent avec ce pack ?', a: 'Tous les modèles majeurs actuels (Claude 3.7, GPT-4o, Gemini 2.5, DeepSeek R1).' },
        { q: 'Ai-je le droit d\'utiliser ces textes pour mes clients ?', a: 'Oui, une licence commerciale illimitée est incluse.' }
      ]
    },
    rating: 4.96,
    reviewsCount: 88,
    salesCount: 420,
    conversionRate: 4.8
  },
  {
    id: 'prod-4',
    opportunityId: 'opp-4',
    title: 'AI Automation Agency (AAA) Workflow Blueprint & Client Kits',
    subtitle: 'Le système complet pour lancer et opérer une agence d\'automatisation IA : SOPs, contrats clients, 10 flux n8n/Make et grille tarifaire.',
    category: 'Intelligence Artificielle & Prompts',
    format: 'pro_kit',
    targetAudience: 'Consultants IA, Freelances, Développeurs No-Code / Make',
    problemSolved: 'Fournit tout l\'arsenal légal, technique et commercial pour signer des contrats d\'automatisation B2B à 3 000€+.',
    promisedOutcome: 'Signez et délivrez votre première mission client d\'automatisation IA en moins de 14 jours.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 77,
      minPrice: 59,
      maxPrice: 120,
      promoPrice: 57,
      bundlePrice: 47,
      compareAtPrice: 147,
      currency: 'EUR',
      discountPercent: 48,
      attractiveBadge: '🏆 Kit Agence Pro',
      isFlashSale: true
    },
    status: 'published',
    tier: 'winner',
    quality: { overall: 98, codeQuality: 97, documentation: 99, commercialViability: 98, utility: 98 },
    content: {
      summary: 'Pack complet agence : 10 blueprints Make/n8n commentés, modèle de proposition commerciale, contrat de prestation et grille tarifaire.',
      structure: [
        'Kit Commercial & Propositions de Valeur B2B',
        'Contrat Cadre Juridique & Accord de Confidentialité RGPD',
        '10 Blueprints JSON n8n / Make Prêts à Importer',
        'SOPs d\'Onboarding & Recueil des Besoins Clients'
      ],
      downloadableFiles: [
        {
          id: 'f-4-1',
          filename: 'AAA-Agency-Master-Blueprint.zip',
          fileType: 'zip',
          size: '34.2 MB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/aaa-agency-master.zip',
          contentSnippet: 'Fichiers JSON de workflows, templates Figma de proposition et modèles de contrats.',
          downloadCount: 290
        }
      ]
    },
    packaging: {
      badge: 'Indispensable Agence ⭐ 4.95/5',
      keyBenefits: [
        '10 Flux n8n et Make.com testés et validés en conditions réelles',
        'Modèles de contrats et de devis rédigés par juristes tech',
        'Calculateur de tarification forfaitaire vs récurrence mensuelle'
      ],
      faqs: [
        { q: 'Faut-il savoir coder ?', a: 'Non, les flux sont fournis au format JSON prêt à importer dans n8n ou Make.' }
      ]
    },
    rating: 4.95,
    reviewsCount: 64,
    salesCount: 290,
    conversionRate: 4.5
  },
  {
    id: 'prod-ai-1',
    title: '1,000+ Production-Ready Prompt Engineering Vault for LLMs',
    subtitle: 'Coffre-fort ultime de prompts système pour Claude 3.7, GPT-4o & Gemini : extraction JSON, RAG, agents et raisonnement complexe.',
    category: 'Intelligence Artificielle & Prompts',
    format: 'prompt_pack',
    targetAudience: 'Développeurs IA, Product Managers, Builders LLM',
    problemSolved: 'Élimine les hallucinations et les formats invalides dans les intégrations d\'API de modèles de langage.',
    promisedOutcome: 'Garantit des sorties JSON valides à 99.8% et réduit la consommation de tokens de 35%.',
    level: 'Advanced',
    pricing: {
      recommendedPrice: 47,
      compareAtPrice: 89,
      discountPercent: 47,
      currency: 'EUR',
      attractiveBadge: '⚡ Optimisé Tokens'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 98, documentation: 96, commercialViability: 97 },
    content: {
      summary: '1000 prompts architecturés avec meta-instructions, few-shot examples et schémas TypeScript stricts.',
      structure: [
        'Prompts d\'Extraction & Transformation JSON Structuré',
        'Prompts de Synthèse RAG & Context Windows Élargies',
        'Prompts de Raisonnement & Chain-of-Thought Étape par Étape',
        'Optimisation de Tokens & Réduction de Latence'
      ],
      downloadableFiles: [
        { id: 'f-ai1', filename: 'Production-Prompt-Engineering-Vault.zip', size: '18.4 MB', fileType: 'zip', contentSnippet: 'Fichiers JSON, schémas Zod et guide PDF complet.' }
      ]
    },
    packaging: {
      keyBenefits: ['Schémas Zod et JSON validés', 'Testé sur 1M+ tokens', 'Compatible OpenAI, Anthropic, Google'],
      faqs: [{ q: 'Les schémas sont-ils fournis en TypeScript ?', a: 'Oui, schémas Zod et interfaces TS inclus.' }]
    },
    rating: 4.93,
    reviewsCount: 42,
    salesCount: 185,
    conversionRate: 4.1
  },
  {
    id: 'prod-ai-2',
    title: 'Autonomous AI Agent Architecture & CrewAI Master Blueprints',
    subtitle: 'Templates de systèmes multi-agents prêts à l\'emploi : recherche autonome, veille concurrentielle et support client automatisé.',
    category: 'Intelligence Artificielle & Prompts',
    format: 'pro_kit',
    targetAudience: 'Ingénieurs IA, Développeurs Python, Founders',
    problemSolved: 'Permet d\'orchestrer plusieurs agents autonomes coopératifs sans repartir de zéro.',
    promisedOutcome: 'Déployez un système multi-agents en production en moins de 3 heures.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 57,
      compareAtPrice: 97,
      discountPercent: 41,
      currency: 'EUR',
      attractiveBadge: '🤖 CrewAI & LangGraph'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 97, documentation: 95, commercialViability: 96 },
    content: {
      summary: 'Code source Python et configurations YAML pour déployer des équipes d\'agents autonomes avec mémoire et outils API.',
      structure: ['Agent Veille Marché', 'Agent Création Contenu', 'Agent Data Analyst', 'Agent Support Email'],
      downloadableFiles: [
        { id: 'f-ai2', filename: 'CrewAI-MultiAgent-Blueprints.zip', size: '28.1 MB', fileType: 'zip', contentSnippet: 'Code Python complet avec environnement poetry et tests unitaires.' }
      ]
    },
    packaging: {
      keyBenefits: ['Architectures modulaires CrewAI & LangGraph', 'Gestion d\'erreurs et retry automatique', 'Dockerfiles inclus'],
      faqs: [{ q: 'Faut-il des clés d\'API ?', a: 'Oui, supporte les clés OpenAI, Anthropic, Gemini ou modèles locaux Ollama.' }]
    },
    rating: 4.91,
    reviewsCount: 38,
    salesCount: 140,
    conversionRate: 3.9
  },
  {
    id: 'prod-ai-3',
    title: 'Midjourney v6 & DALL-E 3 Commercial Photorealism Promptbook',
    subtitle: '450 prompts d\'images photoréalistes pour le e-commerce, mockups produits, portraits et landing pages SaaS.',
    category: 'Intelligence Artificielle & Prompts',
    format: 'prompt_pack',
    targetAudience: 'Designers, Agences Créatives, Créateurs de Contenu',
    problemSolved: 'Permet d\'obtenir des visuels professionnels sans artefact et avec un éclairage de studio parfait.',
    promisedOutcome: 'Générez des assets visuels premium en quelques secondes pour vos sites et publicités.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 29,
      compareAtPrice: 59,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🎨 450+ Renders HD'
    },
    status: 'published',
    quality: { overall: 95, codeQuality: 94, documentation: 97, commercialViability: 95 },
    content: {
      summary: 'Collection complète de paramètres de rendu, éclairages cinéma, textures de matériaux et styles photographiques.',
      structure: ['Photographie de Produit & Packshots', 'Scènes 3D Abstraites & Glassmorphism', 'Portraits Professionnels & Avatars', 'Bannières Web & Illustrations UI'],
      downloadableFiles: [
        { id: 'f-ai3', filename: 'Midjourney-v6-Promptbook-Master.pdf', size: '45.0 MB', fileType: 'pdf', contentSnippet: 'Guide PDF richement illustré avec aperçus avant/après et prompts exacts.' }
      ]
    },
    packaging: {
      keyBenefits: ['Paramètres --v 6.0 et --sref prêts', 'Styles cinéma et éclairages studio', 'Index visuel interactif'],
      faqs: [{ q: 'Puis-je vendre les images générées ?', a: 'Oui, tous les visuels peuvent être utilisés commercialement.' }]
    },
    rating: 4.88,
    reviewsCount: 51,
    salesCount: 230,
    conversionRate: 4.4
  },
  {
    id: 'prod-ai-4',
    title: 'AI Coding Copilot Prompts & Cursor / Claude Code Systems',
    subtitle: 'Configurations système et prompts spécialisés pour Cursor IDE, GitHub Copilot et Claude Code pour coder 3x plus vite.',
    category: 'Intelligence Artificielle & Prompts',
    format: 'prompt_pack',
    targetAudience: 'Développeurs Web, Ingénieurs Full-Stack, Solopreneurs Tech',
    problemSolved: 'Transforme votre IDE en véritable binôme senior avec des règles `.cursorrules` affinées par stack.',
    promisedOutcome: 'Accélérez votre vitesse de développement par 3 tout en maintenant une couverture de tests irréprochable.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 34,
      compareAtPrice: 65,
      discountPercent: 48,
      currency: 'EUR',
      attractiveBadge: '⚡ Cursor Rules 2026'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 99, documentation: 96, commercialViability: 96 },
    content: {
      summary: 'Pack de 40+ fichiers .cursorrules optimisés pour React, Next.js, Python, Tailwind, PostgreSQL et architectures microservices.',
      structure: ['Fichiers .cursorrules par Framework', 'Prompts de Refactorisation & Clean Architecture', 'Générateurs Automatiques de Tests Unitaires', 'Débogage et Audit de Sécurité'],
      downloadableFiles: [
        { id: 'f-ai4', filename: 'Cursor-Rules-Developer-Pack.zip', size: '5.2 MB', fileType: 'zip', contentSnippet: 'Collection de fichiers .cursorrules et snippets IDE prêts à glisser-déposer.' }
      ]
    },
    packaging: {
      keyBenefits: ['40+ règles .cursorrules prêtes', 'Zéro hallucination de syntaxe', 'Mises à jour gratuites à vie'],
      faqs: [{ q: 'Comment installer les règles ?', a: 'Placez simplement le fichier .cursorrules à la racine de votre projet.' }]
    },
    rating: 4.97,
    reviewsCount: 76,
    salesCount: 310,
    conversionRate: 5.1
  },

  // ========================================================
  // ⚡ 2. BOILERPLATES & DÉVELOPPEMENT SAAS (6 PRODUITS)
  // ========================================================
  {
    id: 'prod-dev-1',
    title: 'Next.js 15 & React 19 Micro-SaaS Production Boilerplate',
    subtitle: 'Le starter ultime avec App Router, TypeScript, authentification sécurisée, abonnements Stripe, base de données PostgreSQL et Tailwind CSS.',
    category: 'Boilerplates & Développement SaaS',
    format: 'boilerplate',
    targetAudience: 'Développeurs Indie, Créateurs de SaaS, Agences Web',
    problemSolved: 'Évite de perdre 50 heures à reconfigurer l\'authentification, les webhooks Stripe et les migrations de base de données.',
    promisedOutcome: 'Lancez votre Micro-SaaS prêt à encaisser des paiements en moins de 48 heures.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 87,
      compareAtPrice: 179,
      discountPercent: 51,
      currency: 'EUR',
      attractiveBadge: '⚡ Next.js 15 + Stripe',
      isFlashSale: true
    },
    status: 'published',
    quality: { overall: 99, codeQuality: 99, documentation: 98, commercialViability: 99 },
    content: {
      summary: 'Code source complet Next.js 15 avec Drizzle ORM, Stripe Customer Portal, Auth0/NextAuth, et emails transactionnels Resend.',
      structure: ['Authentification & Gestion des Profils', 'Paiements Stripe & Webhooks Sécurisés', 'Schémas Drizzle ORM & Migrations PostgreSQL', 'Dashboard Client avec Dark Mode'],
      downloadableFiles: [
        { id: 'f-dev1', filename: 'Nextjs15-Production-Starter.zip', size: '14.8 MB', fileType: 'zip', contentSnippet: 'Dépôt git complet avec documentation et déploiement Vercel en 1 clic.' }
      ]
    },
    packaging: {
      keyBenefits: ['Prêt pour la production', 'Stripe Billing & Webhooks intégrés', 'Design moderne Tailwind UI'],
      faqs: [{ q: 'Puis-je créer plusieurs projets ?', a: 'Oui, licence illimitée pour projets personnels et commerciaux.' }]
    },
    rating: 4.98,
    reviewsCount: 112,
    salesCount: 480,
    conversionRate: 5.4
  },
  {
    id: 'prod-dev-2',
    title: 'Multi-Tenant B2B SaaS Enterprise Starter Kit',
    subtitle: 'Architecture multi-tenant isolée avec sous-domaines dynamiques, invitations d\'équipes, gestion des rôles (RBAC) et facturation entreprise.',
    category: 'Boilerplates & Développement SaaS',
    format: 'boilerplate',
    targetAudience: 'Startups B2B, Développeurs Full-Stack, CTOs',
    problemSolved: 'Fournit une architecture robuste pour gérer des comptes entreprises avec plusieurs utilisateurs par organisation.',
    promisedOutcome: 'Déployez un SaaS B2B scalable supportant des milliers d\'équipes sans refonte technique.',
    level: 'Advanced',
    pricing: {
      recommendedPrice: 127,
      compareAtPrice: 249,
      discountPercent: 49,
      currency: 'EUR',
      attractiveBadge: '🏢 Multi-Tenant B2B'
    },
    status: 'published',
    quality: { overall: 98, codeQuality: 99, documentation: 97, commercialViability: 98 },
    content: {
      summary: 'Starter complet avec isolation des données par tenant, rôles Owner/Admin/Member, et audit logs.',
      structure: ['Routage par Sous-Domaine', 'Système RBAC Complet', 'Facturation d\'Équipe par Sièges (Seats)', 'Audit Logs & Sécurité'],
      downloadableFiles: [
        { id: 'f-dev2', filename: 'MultiTenant-B2B-SaaS-Kit.zip', size: '22.4 MB', fileType: 'zip', contentSnippet: 'Code TypeScript complet avec tests et scripts de seed.' }
      ]
    },
    packaging: {
      keyBenefits: ['Sous-domaines automatiques (acme.app.com)', 'Gestion des sièges Stripe', 'Logs d\'audit de sécurité'],
      faqs: [{ q: 'La base de données est-elle partagée ou séparée ?', a: 'Multi-tenancy logique avec clé tenant_id et Row-Level Security (RLS).' }]
    },
    rating: 4.94,
    reviewsCount: 45,
    salesCount: 160,
    conversionRate: 3.8
  },
  {
    id: 'prod-dev-3',
    title: 'Chrome Extension & Manifest V3 Commercial Boilerplate',
    subtitle: 'Starter React + TypeScript + Plasmo pour concevoir et monétiser des extensions Chrome avec Stripe et authentification OAuth.',
    category: 'Boilerplates & Développement SaaS',
    format: 'boilerplate',
    targetAudience: 'Développeurs d\'Extensions, Indie Hackers, Growth Hackers',
    problemSolved: 'Résout la complexité de Manifest V3, des scripts d\'injection (Content Scripts) et des paiements in-extension.',
    promisedOutcome: 'Publiez une extension Chrome payante sur le Chrome Web Store en 3 jours.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 49,
      compareAtPrice: 99,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🧩 Chrome Manifest V3'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 98, documentation: 96, commercialViability: 97 },
    content: {
      summary: 'Template Plasmo avec popup React, panneau latéral (SidePanel), communication de fond (Service Worker) et licence Stripe.',
      structure: ['Configuration Manifest V3 Complète', 'Popup & SidePanel React 19', 'Système de Clé de Licence Stripe', 'Injection de Scripts sur Pages Web'],
      downloadableFiles: [
        { id: 'f-dev3', filename: 'Chrome-Extension-Plasmo-Starter.zip', size: '8.6 MB', fileType: 'zip', contentSnippet: 'Dépôt TypeScript avec documentation étape par étape.' }
      ]
    },
    packaging: {
      keyBenefits: ['Compatible Manifest V3 100%', 'Système de licence prêt', 'Hot Reload en développement'],
      faqs: [{ q: 'Fonctionne-t-il sur Brave et Edge ?', a: 'Oui, compatible avec tous les navigateurs Chromium.' }]
    },
    rating: 4.92,
    reviewsCount: 39,
    salesCount: 195,
    conversionRate: 4.3
  },
  {
    id: 'prod-dev-4',
    title: 'Flutter & React Native Cross-Platform Mobile SaaS Template',
    subtitle: 'Application mobile iOS & Android prête au déploiement avec RevenueCat pour abonnements in-app, Supabase et push notifications.',
    category: 'Boilerplates & Développement SaaS',
    format: 'boilerplate',
    targetAudience: 'Développeurs Mobile, Solopreneurs, Agences',
    problemSolved: 'Supprime les semaines passées à configurer Apple Pay, Google Play Billing et les notifications push.',
    promisedOutcome: 'Soumettez votre application mobile payante sur l\'App Store et Google Play sans tracas.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 97,
      compareAtPrice: 199,
      discountPercent: 51,
      currency: 'EUR',
      attractiveBadge: '📱 iOS & Android Ready'
    },
    status: 'published',
    quality: { overall: 98, codeQuality: 98, documentation: 97, commercialViability: 98 },
    content: {
      summary: 'Codebase mobile double (Flutter + React Native Expo) avec paywall dynamique, onboarding fluide et authentification sociale.',
      structure: ['Paywalls & Abonnements RevenueCat', 'Authentification Apple & Google Sign-In', 'Push Notifications OneSignal', 'Composants UI Natifs Élégants'],
      downloadableFiles: [
        { id: 'f-dev4', filename: 'Mobile-SaaS-Dual-Starter.zip', size: '38.0 MB', fileType: 'zip', contentSnippet: 'Projets complets Flutter et React Native Expo.' }
      ]
    },
    packaging: {
      keyBenefits: ['Abonnements In-App configurés', 'Paywall A/B testing prêt', 'Conforme aux directives Apple'],
      faqs: [{ q: 'Les deux versions sont-elles incluses ?', a: 'Oui, vous recevez les versions Flutter et React Native Expo.' }]
    },
    rating: 4.96,
    reviewsCount: 58,
    salesCount: 220,
    conversionRate: 4.2
  },
  {
    id: 'prod-dev-5',
    title: 'FastAPI & Python Microservices Architecture Starter for AI Wrappers',
    subtitle: 'Backend Python haute performance avec FastAPI, Celery, Redis, streaming de réponses LLM (SSE) et gestion de files d\'attente.',
    category: 'Boilerplates & Développement SaaS',
    format: 'boilerplate',
    targetAudience: 'Développeurs Python, Ingénieurs Backend, Créateurs de SaaS IA',
    problemSolved: 'Permet de gérer des flux de requêtes IA lourdes et des tâches asynchrones sans saturer votre serveur.',
    promisedOutcome: 'Déployez une API d\'IA robuste capable de supporter des pics de charge avec streaming instantané.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 59,
      compareAtPrice: 119,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '⚡ FastAPI & Celery'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 98, documentation: 96, commercialViability: 97 },
    content: {
      summary: 'Template FastAPI avec authentification JWT, limitation de débit (Rate Limiting), workers Celery et endpoints de streaming LLM.',
      structure: ['Streaming Server-Sent Events (SSE)', 'Tâches en Arrière-Plan avec Celery & Redis', 'Documentation Swagger / OpenAPI Auto-Générée', 'Docker Compose Prêt pour Déploiement Cloud'],
      downloadableFiles: [
        { id: 'f-dev5', filename: 'FastAPI-AI-Microservice-Starter.zip', size: '11.2 MB', fileType: 'zip', contentSnippet: 'Code Python structuré avec typing strict et tests pytest.' }
      ]
    },
    packaging: {
      keyBenefits: ['Streaming SSE ultra-rapide', 'Rate limiting par clé d\'API', 'Prêt pour Docker et Kubernetes'],
      faqs: [{ q: 'Quelle version de Python est requise ?', a: 'Python 3.11 ou supérieur.' }]
    },
    rating: 4.93,
    reviewsCount: 34,
    salesCount: 175,
    conversionRate: 4.0
  },
  {
    id: 'prod-dev-6',
    title: 'Solana & Web3 DApp Commercial Boilerplate (Wagmi + Stripe Crypto)',
    subtitle: 'Starter DApp full-stack avec connexion de wallets (Phantom, Metamask), paiements crypto directs, smart contracts et checkout hybride.',
    category: 'Boilerplates & Développement SaaS',
    format: 'boilerplate',
    targetAudience: 'Développeurs Web3, Créateurs de Protocoles, Builders Crypto',
    problemSolved: 'Simplifie l\'intégration de paiements crypto sécurisés et l\'interaction avec les blockchains Solana et EVM.',
    promisedOutcome: 'Acceptez les paiements en SOL, USDC et ETH sur votre application sans intermédiaire bancaire.',
    level: 'Advanced',
    pricing: {
      recommendedPrice: 69,
      compareAtPrice: 139,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🌐 Web3 & Crypto Ready'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 97, documentation: 95, commercialViability: 96 },
    content: {
      summary: 'Starter Next.js avec adaptateurs Solana Wallet, Wagmi, viem, vérification de transactions on-chain et webhooks de confirmation.',
      structure: ['Connexion Multi-Wallets Fluide', 'Vérification On-Chain Sécurisée', 'Support USDC, SOL, ETH et USDT', 'Dashboard d\'Encaissement Temps Réel'],
      downloadableFiles: [
        { id: 'f-dev6', filename: 'Web3-Crypto-Checkout-Starter.zip', size: '16.5 MB', fileType: 'zip', contentSnippet: 'Code Next.js avec smart contracts audités et hooks React personnalisés.' }
      ]
    },
    packaging: {
      keyBenefits: ['Zéro commission intermédiaire', 'Support Solana et Ethereum', 'Sécurité anti-double dépense'],
      faqs: [{ q: 'Faut-il payer des frais de réseau pour tester ?', a: 'Non, configuré avec Solana Devnet et Sepolia Testnet pour des tests gratuits.' }]
    },
    rating: 4.90,
    reviewsCount: 29,
    salesCount: 130,
    conversionRate: 3.7
  },

  // ========================================================
  // 💼 3. PRODUCTIVITÉ & SYSTÈMES NOTION (6 PRODUITS)
  // ========================================================
  {
    id: 'prod-1',
    opportunityId: 'opp-1',
    title: 'Notion SaaS Operating System & Financial Engine',
    subtitle: 'Le centre de commande complet pour piloter votre MRR, CRM, sprints agiles, churn et roadmap produit dans un espace unifié.',
    category: 'Productivité & Systèmes Notion',
    format: 'template',
    targetAudience: 'Fondateurs SaaS, Indie Hackers, Équipes Tech',
    problemSolved: 'Élimine l\'éparpillement des outils en regroupant modélisation financière, pipeline commercial, tâches de sprint et suivi du churn.',
    promisedOutcome: 'Gagnez 10 heures par semaine et suivez votre trésorerie et votre MRR en temps réel.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 47,
      minPrice: 39,
      maxPrice: 67,
      promoPrice: 37,
      bundlePrice: 29,
      compareAtPrice: 87,
      currency: 'EUR',
      discountPercent: 46,
      attractiveBadge: '⭐ Bestseller Notion',
      isFlashSale: false
    },
    status: 'published',
    tier: 'winner',
    quality: { overall: 95, codeQuality: 96, documentation: 97, commercialViability: 95, utility: 95 },
    content: {
      summary: 'Espace Notion tout-en-un avec 12 bases de données interconnectées et 40+ vues de tableaux de bord interactifs.',
      structure: [
        'Cockpit Exécutif & Suivi MRR / ARR en Direct',
        'CRM Commercial & Pipeline de Ventes B2B',
        'Gestionnaire de Sprints & Roadmap Produit (Kanban)',
        'Analytique de Rétention & Calculateur de Churn',
        'Générateur de Rapports Investisseurs',
        'Base de Connaissances & SOPs d\'Équipe'
      ],
      downloadableFiles: [
        {
          id: 'f-1-1',
          filename: 'Notion-SaaS-OS-v2.4-Instant-Access.pdf',
          fileType: 'notion_template',
          size: '4.2 MB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/notion-saas-os-v2.4.pdf',
          contentSnippet: 'Lien officiel de duplication Notion en 1 clic avec tutoriel vidéo et formules financières.',
          downloadCount: 520
        },
        {
          id: 'f-1-2',
          filename: 'SaaS-Financial-Model-Guide.pdf',
          fileType: 'pdf',
          size: '1.8 MB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/saas-financial-guide.pdf',
          contentSnippet: 'Guide de 30 pages expliquant les ratios CAC, LTV, Magic Number et Runway.',
          downloadCount: 490
        }
      ]
    },
    packaging: {
      badge: 'Bestseller ⭐ 4.95/5',
      keyBenefits: [
        '12 bases de données interconnectées',
        'Calculs de MRR, ARR et Runway sans erreur Excel',
        'Compatible avec le plan Notion 100% gratuit',
        'Mises à jour gratuites à vie'
      ],
      faqs: [
        { q: 'Ai-je besoin d\'un abonnement Notion payant ?', a: 'Non, fonctionne parfaitement avec le compte Notion gratuit.' }
      ]
    },
    rating: 4.95,
    reviewsCount: 95,
    salesCount: 520,
    conversionRate: 5.2
  },
  {
    id: 'prod-notion-1',
    title: 'Solopreneur Ultimate Operating System 2026 (All-in-One Notion)',
    subtitle: 'L\'espace complet pour gérer toute votre entreprise solo : objectifs annuels, pipeline clients, finances, création de contenu et habitudes.',
    category: 'Productivité & Systèmes Notion',
    format: 'template',
    targetAudience: 'Solopreneurs, Freelances, Créateurs de Contenu',
    problemSolved: 'Remplace 6 abonnements d\'outils différents par un système Notion centralisé et intuitif.',
    promisedOutcome: 'Clarifiez vos priorités quotidiennes et doublez votre débit d\'exécution sans surcharge mentale.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 39,
      compareAtPrice: 79,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '💼 Espace Solopreneur #1'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96 },
    content: {
      summary: 'Système complet basé sur les frameworks OKR, GTD et PARA pour structurer vos journées et vos revenus.',
      structure: ['Objectifs & OKR Trimestriels', 'Pipeline Commercial & Facturation', 'Calendrier Éditorial Multi-Plateformes', 'Gestion Financière & Suivi des Dépenses'],
      downloadableFiles: [
        { id: 'f-not1', filename: 'Solopreneur-OS-2026-Access.pdf', size: '3.9 MB', fileType: 'pdf', contentSnippet: 'Lien de duplication immédiate et guide de démarrage en 5 minutes.' }
      ]
    },
    packaging: {
      keyBenefits: ['Structure fluide et design épuré', 'Suivi du chiffre d\'affaires mensuel', 'Tableau de bord quotidien focalisé'],
      faqs: [{ q: 'Est-il facile à personnaliser ?', a: 'Oui, tout est modifiable en quelques clics.' }]
    },
    rating: 4.94,
    reviewsCount: 68,
    salesCount: 380,
    conversionRate: 4.9
  },
  {
    id: 'prod-notion-2',
    title: 'Freelance Client Portal & Project Delivery System',
    subtitle: 'Portail client professionnel partageable sur Notion pour vos devis, validations de livrables, briefs et suivi de projet.',
    category: 'Productivité & Systèmes Notion',
    format: 'template',
    targetAudience: 'Freelances, Designers, Développeurs Indépendants, Consultants',
    problemSolved: 'Évite les allers-retours chaotiques par email et impressionne vos clients avec un espace de livraison dédié.',
    promisedOutcome: 'Réduisez le temps de gestion de projet de 40% et obtenez des validations plus rapides.',
    level: 'Beginner',
    pricing: {
      recommendedPrice: 29,
      compareAtPrice: 59,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🤝 Portail Client Pro'
    },
    status: 'published',
    quality: { overall: 95, codeQuality: 94, documentation: 97, commercialViability: 95 },
    content: {
      summary: 'Template de portail client prêt à dupliquer pour chaque nouvelle mission avec gestion des jalons et validations en 1 clic.',
      structure: ['Brief & Cadrage Initial du Projet', 'Planning & Jalons de Livraison', 'Espace de Partage de Fichiers & Maquettes', 'Factures & Historique des Paiements'],
      downloadableFiles: [
        { id: 'f-not2', filename: 'Freelance-Client-Portal-Notion.pdf', size: '2.8 MB', fileType: 'pdf', contentSnippet: 'Lien de duplication avec template d\'accueil client pré-rempli.' }
      ]
    },
    packaging: {
      keyBenefits: ['Lien de partage sécurisé pour les clients', 'Expérience client haut de gamme', 'Historique des validations clair'],
      faqs: [{ q: 'Le client doit-il avoir un compte Notion payant ?', a: 'Non, le client peut consulter et commenter gratuitement.' }]
    },
    rating: 4.89,
    reviewsCount: 47,
    salesCount: 260,
    conversionRate: 4.5
  },
  {
    id: 'prod-notion-3',
    title: 'Second Brain & PARA Method Personal Knowledge Management',
    subtitle: 'Système d\'organisation de connaissances basé sur la méthode PARA (Projets, Domaines, Ressources, Archives) pour ne plus jamais rien perdre.',
    category: 'Productivité & Systèmes Notion',
    format: 'template',
    targetAudience: 'Professionnels, Étudiants, Chercheurs, Créateurs',
    problemSolved: 'Met fin au chaos des notes éparpillées et des onglets de recherche oubliés.',
    promisedOutcome: 'Stockez, organisez et retrouvez n\'importe quelle idée ou information en moins de 3 secondes.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 27,
      compareAtPrice: 49,
      discountPercent: 45,
      currency: 'EUR',
      attractiveBadge: '🧠 Second Cerveau'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96 },
    content: {
      summary: 'Structure PARA complète avec boîte de capture rapide, indexation de livres, synthèses d\'articles et liens relationnels.',
      structure: ['Boîte de Réception & Capture Rapide', 'Dossiers PARA Interconnectés', 'Bibliothèque de Lectures & Résumés', 'Archives Intelligentes'],
      downloadableFiles: [
        { id: 'f-not3', filename: 'Second-Brain-PARA-Notion.pdf', size: '3.1 MB', fileType: 'pdf', contentSnippet: 'Guide d\'implémentation pas à pas et lien de duplication.' }
      ]
    },
    packaging: {
      keyBenefits: ['Méthode PARA éprouvée', 'Capture mobile instantanée', 'Design minimaliste anti-distraction'],
      faqs: [{ q: 'Combien de temps pour le prendre en main ?', a: 'Moins de 15 minutes grâce au guide de démarrage illustré.' }]
    },
    rating: 4.92,
    reviewsCount: 53,
    salesCount: 310,
    conversionRate: 4.7
  },
  {
    id: 'prod-notion-4',
    title: 'Real Estate & Property Management Command Center',
    subtitle: 'Dashboard Notion complet pour investisseurs immobiliers : suivi des loyers, rentabilité nette, baux, charges et travaux.',
    category: 'Productivité & Systèmes Notion',
    format: 'template',
    targetAudience: 'Investisseurs Immobiliers, Bailleurs, Gestionnaires de Biens',
    problemSolved: 'Automatise le suivi des échéances de loyers, le calcul des rendements réels et l\'archivage des baux.',
    promisedOutcome: 'Pilotez votre patrimoine immobilier et optimisez votre fiscalité sans tableau Excel complexe.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 42,
      compareAtPrice: 85,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🏠 Immobilier & Cashflow'
    },
    status: 'published',
    quality: { overall: 95, codeQuality: 94, documentation: 97, commercialViability: 95 },
    content: {
      summary: 'Dashboard pour suivre biens, locataires, quittances de loyer, dépenses déductibles et alertes de renouvellement.',
      structure: ['Fiches Détaillées par Bien & Rentabilité', 'Gestion des Locataires & Contrats de Bail', 'Suivi des Loyers & Impayés', 'Calculateur de Déductions Fiscales'],
      downloadableFiles: [
        { id: 'f-not4', filename: 'Real-Estate-Command-Center-Notion.pdf', size: '3.5 MB', fileType: 'pdf', contentSnippet: 'Template complet avec formules de calcul de cash-flow automatique.' }
      ]
    },
    packaging: {
      keyBenefits: ['Calcul automatique du rendement net', 'Alertes sur les baux', 'Prêt pour la déclaration fiscale'],
      faqs: [{ q: 'Gère-t-il la colocation et la location courte durée ?', a: 'Oui, des vues dédiées sont incluses.' }]
    },
    rating: 4.91,
    reviewsCount: 36,
    salesCount: 190,
    conversionRate: 4.1
  },
  {
    id: 'prod-notion-5',
    title: 'Fitness, Nutrition & Biohacking Protocol Notion Dashboard',
    subtitle: 'Système complet de suivi d\'entraînement (musculation, cardio), planification des macros nutritionnelles et optimisation du sommeil.',
    category: 'Productivité & Systèmes Notion',
    format: 'template',
    targetAudience: 'Athlètes, Passionnés de Fitness, Professionnels Soucieux de leur Santé',
    problemSolved: 'Centralise le suivi des charges d\'entraînement, des calories et des biomarqueurs en un seul endroit.',
    promisedOutcome: 'Mesurez vos progrès physiques avec précision et atteignez vos objectifs de forme plus vite.',
    level: 'Beginner',
    pricing: {
      recommendedPrice: 24,
      compareAtPrice: 49,
      discountPercent: 51,
      currency: 'EUR',
      attractiveBadge: '⚡ Santé & Performance'
    },
    status: 'published',
    quality: { overall: 94, codeQuality: 93, documentation: 96, commercialViability: 94 },
    content: {
      summary: 'Espace Notion avec programmes d\'entraînement pré-remplis (Push Pull Legs, Full Body), base de données d\'aliments et tracker de compléments.',
      structure: ['Journal d\'Entraînement & Progression des Charges', 'Calculateur de Macros & Base d\'Aliments', 'Tracker de Sommeil & Récupération', 'Planificateur de Suppléments & Hydratation'],
      downloadableFiles: [
        { id: 'f-not5', filename: 'Fitness-Biohacking-Notion-Pack.pdf', size: '2.5 MB', fileType: 'pdf', contentSnippet: 'Lien de duplication avec programmes sportifs et recettes intégrées.' }
      ]
    },
    packaging: {
      keyBenefits: ['Formules de calcul automatique des macros', 'Suivi de la surcharge progressive', 'Application mobile Notion fluide'],
      faqs: [{ q: 'Puis-je l\'utiliser depuis mon smartphone à la salle de sport ?', a: 'Oui, les vues mobiles sont spécialement adaptées pour une saisie rapide.' }]
    },
    rating: 4.87,
    reviewsCount: 41,
    salesCount: 215,
    conversionRate: 4.3
  },

  // ========================================================
  // 📈 4. MARKETING DIGITAL, SEO & VENTES B2B (6 PRODUITS)
  // ========================================================
  {
    id: 'prod-3',
    opportunityId: 'opp-3',
    title: 'Micro-SaaS Zero-to-One Growth Playbook & Launch Checklists',
    subtitle: 'La feuille de route étape par étape pour obtenir vos 100 premiers clients payants sans budget publicitaire ni audience préalable.',
    category: 'Marketing Digital, SEO & Ventes B2B',
    format: 'checklist',
    targetAudience: 'Développeurs Indépendants, Fondateurs Techniques, Créateurs',
    problemSolved: 'Élimine le doute et les erreurs de lancement grâce à un calendrier d\'actions précis pour ProductHunt, Reddit, HackerNews et la prospection directe.',
    promisedOutcome: 'Lancez avec succès, atteignez votre premier MRR récurrent et évitez de coder des fonctionnalités inutiles.',
    level: 'Beginner',
    pricing: {
      recommendedPrice: 29,
      minPrice: 19,
      maxPrice: 49,
      promoPrice: 24,
      bundlePrice: 19,
      compareAtPrice: 59,
      currency: 'EUR',
      discountPercent: 51,
      attractiveBadge: '🚀 Launch Playbook',
      isFlashSale: false
    },
    status: 'published',
    tier: 'winner',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96, utility: 96 },
    content: {
      summary: 'Playbook interactif avec 140 points de contrôle, modèles de messages de distribution communautaire et calendrier de pré-lancement sur 30 jours.',
      structure: [
        'Stratégie de Pré-Lancement & Collecte d\'Emails (J-30 à J-1)',
        'Jour J : Exécution du Top 1 Product Hunt & HackerNews',
        'Distribution Organique Reddit & Communautés Développeurs',
        'Canaux d\'Acquisition B2B Automatisés',
        'Stratégies d\'Onboarding & Réduction du Churn Initial'
      ],
      downloadableFiles: [
        {
          id: 'f-3-1',
          filename: 'Micro-SaaS-Launch-Playbook.pdf',
          fileType: 'pdf',
          size: '5.2 MB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/micro-saas-playbook.pdf',
          contentSnippet: 'Guide d\'exécution opérationnel de 85 pages avec études de cas réelles.',
          downloadCount: 380
        }
      ]
    },
    packaging: {
      badge: 'Guide Recommandé ⭐ 4.92/5',
      keyBenefits: [
        'Calendrier d\'action jour par jour',
        'Modèles de posts ProductHunt et Reddit qui ne se font pas bannir',
        'Répertoire de 50+ annuaires SaaS où soumettre votre produit'
      ],
      faqs: [
        { q: 'Est-ce adapté si je n\'ai pas d\'abonnés sur les réseaux ?', a: 'Oui, le playbook est spécialement conçu pour démarrer de zéro.' }
      ]
    },
    rating: 4.92,
    reviewsCount: 72,
    salesCount: 380,
    conversionRate: 4.6
  },
  {
    id: 'prod-mkt-1',
    title: 'B2B Cold Email Playbook & 200+ High-Open Outreach Sequences',
    subtitle: 'Séquences de prospection B2B testées générant plus de 35% de taux de réponse, avec guide de délivrabilité (SPF, DKIM, DMARC, Warmup).',
    category: 'Marketing Digital, SEO & Ventes B2B',
    format: 'pro_kit',
    targetAudience: 'Fondateurs B2B, Commerciaux (SDR/AE), Agences de Prospection',
    problemSolved: 'Met fin aux emails qui finissent en spam ou restent sans réponse.',
    promisedOutcome: 'Générez 15 à 30 rendez-vous qualifiés par mois auprès de décideurs B2B.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 47,
      compareAtPrice: 97,
      discountPercent: 51,
      currency: 'EUR',
      attractiveBadge: '✉️ 35%+ Taux de Réponse'
    },
    status: 'published',
    quality: { overall: 98, codeQuality: 97, documentation: 99, commercialViability: 98 },
    content: {
      summary: 'Guide technique de délivrabilité, 200 templates de séquences en 4 étapes et scripts de relance à forte valeur ajoutée.',
      structure: ['Configuration de Boîtes Secondaires & Warmup', 'Templates par Secteur (Tech, RH, Finance, E-com)', 'Frameworks d\'Accroches Personnalisées', 'Gestion des Réponses Positives & Closing'],
      downloadableFiles: [
        { id: 'f-mkt1', filename: 'Cold-Email-B2B-Master-Pack.zip', size: '9.4 MB', fileType: 'zip', contentSnippet: 'PDF interactif, modèles texte et tableurs de suivi de campagnes.' }
      ]
    },
    packaging: {
      keyBenefits: ['200 séquences rédigées par des experts', 'Configuration DNS anti-spam étape par étape', 'Exemples réels de campagnes à succès'],
      faqs: [{ q: 'Faut-il des outils payants de cold email ?', a: 'Des options gratuites et payantes (Instantly, Smartlead) sont recommandées.' }]
    },
    rating: 4.96,
    reviewsCount: 84,
    salesCount: 410,
    conversionRate: 5.0
  },
  {
    id: 'prod-mkt-2',
    title: 'Programmatic SEO Blueprint & 100k Monthly Visitors Playbook',
    subtitle: 'La méthode exacte pour générer des milliers de pages indexées sur Google et capter un trafic qualifié massif sans rédiger à la main.',
    category: 'Marketing Digital, SEO & Ventes B2B',
    format: 'pro_kit',
    targetAudience: 'Fondateurs SaaS, Spécialistes SEO, Éditeurs de Sites',
    problemSolved: 'Permet de cibler la longue traîne de mots-clés transactionnels de façon automatisée.',
    promisedOutcome: 'Passez de 0 à 100 000 visiteurs mensuels organiques grâce au SEO programmatique.',
    level: 'Advanced',
    pricing: {
      recommendedPrice: 67,
      compareAtPrice: 147,
      discountPercent: 54,
      currency: 'EUR',
      attractiveBadge: '🚀 100k Visiteurs / Mois'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 98, documentation: 97, commercialViability: 97 },
    content: {
      summary: 'Architecture de bases de données de contenu, templates de pages Next.js SEO-friendly et scripts d\'automatisation d\'indexation Google.',
      structure: ['Recherche de Datasets & Mots-Clés Longue Traîne', 'Architecture de Données & Templates Dynamiques', 'Indexation Rapide avec IndexNow & Google API', 'Monétisation du Trafic & Conversion'],
      downloadableFiles: [
        { id: 'f-mkt2', filename: 'Programmatic-SEO-Master-Kit.zip', size: '24.0 MB', fileType: 'zip', contentSnippet: 'Code de génération de pages, datasets d\'exemple et guide PDF complet.' }
      ]
    },
    packaging: {
      keyBenefits: ['Templates Next.js prêts pour le SEO', 'Scripts d\'indexation Google automatique', 'Études de cas réelles décomposées'],
      faqs: [{ q: 'Google pénalise-t-il le SEO programmatique ?', a: 'Non, si les pages apportent une réelle valeur ajoutée et des données uniques.' }]
    },
    rating: 4.93,
    reviewsCount: 62,
    salesCount: 275,
    conversionRate: 4.4
  },
  {
    id: 'prod-mkt-3',
    title: 'High-Ticket Sales Closing Scripts & Objection-Handling Playbook',
    subtitle: 'Scripts de vente complets pour closer des contrats de consulting, coaching et prestations B2B entre 2 000€ et 10 000€ par téléphone/visio.',
    category: 'Marketing Digital, SEO & Ventes B2B',
    format: 'playbook',
    targetAudience: 'Closer, Consultants B2B, Agences, Fondateurs',
    problemSolved: 'Empêche de perdre des prospects chauds au moment de l\'annonce du prix et élimine les hésitations.',
    promisedOutcome: 'Augmentez votre taux de closing d\'au moins 30% dès votre prochain appel commercial.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 49,
      compareAtPrice: 99,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '💼 Closing High-Ticket'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96 },
    content: {
      summary: 'Trame d\'appel de découverte en 5 étapes, 25 réponses aux objections tarifaires (« c\'est trop cher », « je dois réfléchir ») et frameworks d\'engagement.',
      structure: ['Diagnostic & Révélation du Coût de l\'Inaction', 'Présentation de l\'Offre Irrésistible', 'Désamorçage des 25 Objections Majeures', 'Closing & Sécurisation de l\'Acompte'],
      downloadableFiles: [
        { id: 'f-mkt3', filename: 'High-Ticket-Sales-Closing-Guide.pdf', size: '6.8 MB', fileType: 'pdf', contentSnippet: 'Script d\'appel imprimable avec schémas de bifurcation de conversation.' }
      ]
    },
    packaging: {
      keyBenefits: ['25 fiches d\'objections prêtes à l\'emploi', 'Trame de questionnement psychologique', 'Enregistrements audio d\'appels analysés'],
      faqs: [{ q: 'Est-ce adapté aux ventes en visio ?', a: 'Oui, parfait pour les rendez-vous Google Meet ou Zoom.' }]
    },
    rating: 4.95,
    reviewsCount: 71,
    salesCount: 340,
    conversionRate: 4.8
  },
  {
    id: 'prod-mkt-4',
    title: 'Video Sales Letter (VSL) Masterclass & Script Frameworks',
    subtitle: 'Structure de script VSL en 12 blocs psychologiques ayant généré plusieurs millions d\'euros de ventes pour infoproduits et logiciels.',
    category: 'Marketing Digital, SEO & Ventes B2B',
    format: 'playbook',
    targetAudience: 'Copywriters, Créateurs de Formations, Marketeurs',
    problemSolved: 'Structure votre vidéo de vente pour retenir l\'attention du début à la fin et maximiser le passage à l\'action.',
    promisedOutcome: 'Rédigez un script de VSL percutant en moins de 4 heures prêt pour le tournage.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 39,
      compareAtPrice: 79,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🎬 VSL Haute Conversion'
    },
    status: 'published',
    quality: { overall: 95, codeQuality: 94, documentation: 97, commercialViability: 95 },
    content: {
      summary: 'Formule complète en 12 étapes : accroche émotionnelle, mécanisme unique de solution, démonstration, offre et garantie béton.',
      structure: ['L\'Accroche des 10 Premières Secondes', 'La Démonstration du Mécanisme Unique', 'La Construction de l\'Offre Irrésistible', 'L\'Urgence & L\'Appel à l\'Action Final'],
      downloadableFiles: [
        { id: 'f-mkt4', filename: 'VSL-Scriptwriting-Masterclass.pdf', size: '8.1 MB', fileType: 'pdf', contentSnippet: 'Templates de diapositives de présentation et trame de script texte.' }
      ]
    },
    packaging: {
      keyBenefits: ['12 blocs psychologiques détaillés', 'Templates de slides Figma/PowerPoint inclus', 'Analyses de 5 VSLs à 7 chiffres'],
      faqs: [{ q: 'Faut-il montrer son visage dans la vidéo ?', a: 'Non, les scripts s\'adaptent parfaitement aux formats diapositives avec voix off.' }]
    },
    rating: 4.90,
    reviewsCount: 48,
    salesCount: 250,
    conversionRate: 4.3
  },
  {
    id: 'prod-mkt-5',
    title: 'Paid Ads Playbook (Meta, TikTok, Google) & High-ROAS Frameworks',
    subtitle: 'Stratégies d\'achat média pour rentabiliser vos campagnes publicitaires avec un ROAS cible supérieur à 4.0x.',
    category: 'Marketing Digital, SEO & Ventes B2B',
    format: 'playbook',
    targetAudience: 'Media Buyers, E-commerçants, Agences de Publicité',
    problemSolved: 'Arrête de gaspiller du budget publicitaire sur des audiences froides sans créatives adaptées.',
    promisedOutcome: 'Structurez vos campagnes de tests et de scaling publicitaire avec une rentabilité prévisible.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 44,
      compareAtPrice: 89,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '📊 ROAS 4.0x+'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96 },
    content: {
      summary: 'Framework de tests créatifs rapides (Broad Targeting), structure de campagnes Meta Ads Advantage+ et hooks TikTok performants.',
      structure: ['Matrice de Tests Créatifs Rapides', 'Campagnes Advantage+ & Audiences Larges', 'Tracking Pixel & Conversions API (CAPI)', 'Règles d\'Automatisation & Scaling'],
      downloadableFiles: [
        { id: 'f-mkt5', filename: 'Paid-Ads-ROAS-Playbook.pdf', size: '7.4 MB', fileType: 'pdf', contentSnippet: 'Guide complet avec grilles de métriques à surveiller (CTR, CPC, CPA, ROAS).' }
      ]
    },
    packaging: {
      keyBenefits: ['Stratégies Meta, TikTok et Google Ads', 'Calculateur de rentabilité publicitaire', 'Directives de conformité pour éviter les blocages'],
      faqs: [{ q: 'Quel budget minimum est conseillé pour démarrer ?', a: 'Le playbook propose des protocoles adaptés dès 15€/jour de budget de test.' }]
    },
    rating: 4.92,
    reviewsCount: 55,
    salesCount: 290,
    conversionRate: 4.5
  },

  // ========================================================
  // 🎨 5. DESIGN SYSTEMS & KITS UI/UX (4 PRODUITS)
  // ========================================================
  {
    id: 'prod-5',
    opportunityId: 'opp-5',
    title: 'Ultimate Figma Design System & UI Kit for Modern Web Apps',
    subtitle: 'Système de design complet avec 850+ composants auto-layout, variantes sombres/claires, tokens de design et 40 écrans SaaS.',
    category: 'Design Systems & Kits UI/UX',
    format: 'template',
    targetAudience: 'Product Designers, Développeurs Frontend, Fondateurs',
    problemSolved: 'Fini de concevoir des interfaces bancales ou de passer des semaines à créer des composants de zéro.',
    promisedOutcome: 'Créez des maquettes d\'applications web professionnelles et cohérentes en quelques heures.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 59,
      minPrice: 47,
      maxPrice: 89,
      promoPrice: 47,
      bundlePrice: 39,
      compareAtPrice: 119,
      currency: 'EUR',
      discountPercent: 50,
      attractiveBadge: '🎨 850+ Composants Figma',
      isFlashSale: false
    },
    status: 'published',
    tier: 'winner',
    quality: { overall: 98, codeQuality: 98, documentation: 99, commercialViability: 98, utility: 98 },
    content: {
      summary: 'Fichier Figma complet avec variables Figma 2026, typographie hiérarchisée, tokens de couleurs et bibliothèque de composants.',
      structure: [
        'Tokens Globaux : Couleurs, Typographie, Espacements & Ombres',
        '850+ Composants d\'Interface avec Variantes & Auto-Layout 5.0',
        '40 Écrans SaaS Complets : Dashboards, Authentification, Facturation',
        'Directives d\'Accessibilité WCAG AA Intégrées'
      ],
      downloadableFiles: [
        {
          id: 'f-5-1',
          filename: 'Ultimate-Figma-Design-System-v3.fig',
          fileType: 'figma_file',
          size: '64.5 MB',
          downloadUrl: 'https://cdn.digitalfactory.io/vault/ultimate-figma-ds.fig',
          contentSnippet: 'Fichier source Figma complet avec variables, composants auto-layout et guide de personnalisation.',
          downloadCount: 460
        }
      ]
    },
    packaging: {
      badge: 'Figma Bestseller ⭐ 4.97/5',
      keyBenefits: [
        '850+ composants prêts pour la production',
        'Variables Figma natives pour Dark Mode en 1 clic',
        'Correspondance 1:1 avec les classes Tailwind CSS'
      ],
      faqs: [
        { q: 'Faut-il Figma Pro ?', a: 'Non, fonctionne parfaitement sur un compte Figma gratuit.' }
      ]
    },
    rating: 4.97,
    reviewsCount: 89,
    salesCount: 460,
    conversionRate: 5.1
  },
  {
    id: 'prod-ui-1',
    title: 'Tailwind CSS & React Component Vault (150+ Premium UI Blocks)',
    subtitle: '150+ blocs d\'interface React & Tailwind prêts à copier-coller : sections hero, grilles tarifaires, témoignages, modales et dashboards.',
    category: 'Design Systems & Kits UI/UX',
    format: 'template',
    targetAudience: 'Développeurs React, Créateurs de Landing Pages, Solopreneurs',
    problemSolved: 'Permet de monter des pages web élégantes et réactives sans designer dédié.',
    promisedOutcome: 'Assemblez des landing pages et des interfaces SaaS modernes en quelques minutes.',
    level: 'Beginner',
    pricing: {
      recommendedPrice: 49,
      compareAtPrice: 99,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '⚡ 150+ Blocs React'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 98, documentation: 96, commercialViability: 97 },
    content: {
      summary: 'Code JSX/TSX propre et accessible avec animations fluides (Tailwind CSS v4 + Motion) sans dépendances superflues.',
      structure: ['Sections Hero & Accroches Visuelles', 'Tableaux de Tarifs & Comparatifs d\'Offres', 'Composants de Formulaires & Modales', 'Navigation Responsive & Footers'],
      downloadableFiles: [
        { id: 'f-ui1', filename: 'Tailwind-React-Component-Vault.zip', size: '12.4 MB', fileType: 'zip', contentSnippet: 'Fichiers TSX prêts à glisser dans votre projet React / Next.js.' }
      ]
    },
    packaging: {
      keyBenefits: ['100% Tailwind CSS natif', 'Animations Motion incluses', 'Entièrement responsive mobile & desktop'],
      faqs: [{ q: 'Est-il compatible avec Tailwind v4 ?', a: 'Oui, optimisé pour Tailwind CSS v4 et rétrocompatible v3.' }]
    },
    rating: 4.94,
    reviewsCount: 65,
    salesCount: 310,
    conversionRate: 4.8
  },
  {
    id: 'prod-ui-2',
    title: 'Mobile App UI/UX Figma Design Kit (80+ Screens iOS & Android)',
    subtitle: 'Kit complet de design pour applications mobiles : flux d\'onboarding, paywalls, profils, messagerie et paramètres.',
    category: 'Design Systems & Kits UI/UX',
    format: 'template',
    targetAudience: 'Designers Mobile, Fondateurs d\'Applications, Développeurs Flutter/React Native',
    problemSolved: 'Fournit une base visuelle conforme aux standards Apple Human Interface et Material You.',
    promisedOutcome: 'Concevez une application mobile complète en respectant les bonnes pratiques UX natives.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 52,
      compareAtPrice: 109,
      discountPercent: 52,
      currency: 'EUR',
      attractiveBadge: '📱 80+ Écrans Mobiles'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96 },
    content: {
      summary: '80+ maquettes mobiles complètes organisées par parcours utilisateur avec composants réutilisables.',
      structure: ['Flux d\'Onboarding & Présentation de Valeur', 'Écrans de Paywall & Abonnements', 'Flux d\'Authentification & Profils', 'Dashboards Mobiles & Flux d\'Actions'],
      downloadableFiles: [
        { id: 'f-ui2', filename: 'Mobile-App-UIUX-Figma-Kit.fig', size: '42.0 MB', fileType: 'figma_file', contentSnippet: 'Fichier Figma complet avec prototypes interactifs reliés.' }
      ]
    },
    packaging: {
      keyBenefits: ['Normes iOS et Android respectées', 'Prototypes Figma cliquables inclus', 'Composants Auto-Layout natifs'],
      faqs: [{ q: 'Les icônes sont-elles incluses ?', a: 'Oui, une bibliothèque de 200+ icônes vectorielles est incluse.' }]
    },
    rating: 4.91,
    reviewsCount: 44,
    salesCount: 220,
    conversionRate: 4.4
  },
  {
    id: 'prod-ui-3',
    title: '3D Tech Illustrations & Minimalist Abstract Vector Icon Mega Pack',
    subtitle: 'Collection premium de 350+ illustrations 3D haute résolution (PNG transparent + GLTF) et 1 200 icônes vectorielles pour interfaces SaaS.',
    category: 'Design Systems & Kits UI/UX',
    format: 'template',
    targetAudience: 'Designers, Marketeurs, Développeurs Web',
    problemSolved: 'Donne une identité visuelle moderne et haut de gamme à votre site web sans recourir à des banques d\'images génériques.',
    promisedOutcome: 'Sublimez vos landing pages avec des assets 3D uniques et légers.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 37,
      compareAtPrice: 75,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '✨ 350+ Assets 3D HD'
    },
    status: 'published',
    quality: { overall: 95, codeQuality: 94, documentation: 97, commercialViability: 95 },
    content: {
      summary: 'Pack d\'illustrations 3D thématiques tech (serveurs, sécurité, graphiques, intelligence artificielle, badges) et icônes SVG épurées.',
      structure: ['Objets 3D Tech & Serveurs (PNG 4K)', 'Concepts IA, Données & Sécurité', '1 200 Icônes Vectorielles SVG / Figma', 'Fichiers GLTF Optimisés pour Three.js'],
      downloadableFiles: [
        { id: 'f-ui3', filename: '3D-Tech-Illustrations-Icons-Pack.zip', size: '85.0 MB', fileType: 'zip', contentSnippet: 'Fichiers PNG transparents 4K, SVG et modèles GLTF légers.' }
      ]
    },
    packaging: {
      keyBenefits: ['Résolution 4K ultra-nette', 'Fond transparent prêt à poser', 'Licence commerciale sans attribution'],
      faqs: [{ q: 'Puis-je changer les couleurs des objets 3D ?', a: 'Des versions avec différentes teintes d\'accentuation sont incluses.' }]
    },
    rating: 4.89,
    reviewsCount: 52,
    salesCount: 280,
    conversionRate: 4.6
  },

  // ========================================================
  // ⚙️ 6. AUTOMATISATIONS & SCRIPTS N8N (4 PRODUITS)
  // ========================================================
  {
    id: 'prod-auto-1',
    title: '50+ Ready-to-Import n8n Production Automation Blueprints',
    subtitle: 'Collection de 50 workflows n8n testés en production : synchronisation CRM, veille IA, alertes Telegram, facturation et génération de leads.',
    category: 'Automatisations & Scripts n8n',
    format: 'pro_kit',
    targetAudience: 'Opérateurs No-Code, Agences d\'Automatisation, Développeurs',
    problemSolved: 'Évite de réinventer la roue et de passer des heures à déboguer des scénarios d\'automatisation complexes.',
    promisedOutcome: 'Importez des flux d\'automatisation prêts à l\'emploi dans votre instance n8n en 2 clics.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 57,
      compareAtPrice: 119,
      discountPercent: 52,
      currency: 'EUR',
      attractiveBadge: '⚙️ 50 Flux n8n Prêts'
    },
    status: 'published',
    quality: { overall: 98, codeQuality: 99, documentation: 97, commercialViability: 98 },
    content: {
      summary: 'Fichiers JSON commentés avec gestion des erreurs (Error Trigger), webhooks sécurisés et intégrations OpenAI/Stripe/Airtable/PostgreSQL.',
      structure: ['Enrichissement Automatique de Leads B2B', 'Rapports Financiers Quotidiens Telegram/Slack', 'Publication Automatique de Contenus', 'Gestion des Factures & Relances Clients'],
      downloadableFiles: [
        { id: 'f-aut1', filename: '50-n8n-Production-Blueprints.zip', size: '15.2 MB', fileType: 'zip', contentSnippet: 'Fichiers JSON à importer directement dans n8n avec guide de paramétrage.' }
      ]
    },
    packaging: {
      keyBenefits: ['Import 1-clic dans n8n', 'Gestion des erreurs intégrée', 'Guide de configuration des clés d\'API'],
      faqs: [{ q: 'Fonctionne-t-il sur n8n Cloud et auto-hébergé ?', a: 'Oui, 100% compatible avec n8n Cloud et Docker self-hosted.' }]
    },
    rating: 4.96,
    reviewsCount: 78,
    salesCount: 390,
    conversionRate: 5.0
  },
  {
    id: 'prod-auto-2',
    title: 'Make.com & Zapier Enterprise Multi-Step Automation Vault',
    subtitle: '35 scénarios avancés Make.com et Zapier pour connecter vos outils (Stripe, HubSpot, Notion, Google Sheets) sans coder.',
    category: 'Automatisations & Scripts n8n',
    format: 'pro_kit',
    targetAudience: 'Solopreneurs, Responsables Opérations, Équipes Marketing',
    problemSolved: 'Automatise les tâches répétitives manuelles et synchronise les données entre toutes vos applications.',
    promisedOutcome: 'Économisez 15 heures de saisie manuelle par semaine pour votre entreprise.',
    level: 'Beginner',
    pricing: {
      recommendedPrice: 47,
      compareAtPrice: 97,
      discountPercent: 51,
      currency: 'EUR',
      attractiveBadge: '🔄 Make.com & Zapier'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 96, documentation: 98, commercialViability: 97 },
    content: {
      summary: 'Plans de flux blueprint Make avec routeurs conditionnels, itérateurs et gestionnaires d\'erreurs.',
      structure: ['Création Automatique de Contrats & Envoi DocuSign', 'Synchronisation Stripe vers Notion & Comptabilité', 'Tri & Réponse Automatique aux Emails avec IA', 'Onboarding Client Multi-Outils'],
      downloadableFiles: [
        { id: 'f-aut2', filename: 'Make-Zapier-Enterprise-Vault.zip', size: '8.9 MB', fileType: 'zip', contentSnippet: 'Fichiers blueprints Make.com et modèles de Zaps partagés.' }
      ]
    },
    packaging: {
      keyBenefits: ['35 blueprints prêts à importer', 'Optimisé pour réduire la consommation d\'opérations', 'Tutoriels vidéo d\'installation inclus'],
      faqs: [{ q: 'Faut-il un compte Make payant ?', a: 'La majorité des scénarios fonctionnent sur le plan gratuit Make.com.' }]
    },
    rating: 4.92,
    reviewsCount: 56,
    salesCount: 270,
    conversionRate: 4.5
  },
  {
    id: 'prod-auto-3',
    title: 'Python Web Scraping & Data Extraction Toolkit (Playwright, Proxies)',
    subtitle: 'Scripts Python prêts à tourner pour extraire des données web (annuaires, réseaux, e-commerce) avec contournement Cloudflare et proxies.',
    category: 'Automatisations & Scripts n8n',
    format: 'pro_kit',
    targetAudience: 'Développeurs Python, Growth Hackers, Analysts Data',
    problemSolved: 'Résout les blocages de scraping, les captchas et les modifications dynamiques de sites JavaScript.',
    promisedOutcome: 'Extrayez des milliers de leads ou données produits propres au format JSON/CSV en quelques minutes.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 52,
      compareAtPrice: 105,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🐍 Python & Playwright'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 99, documentation: 96, commercialViability: 97 },
    content: {
      summary: 'Scripts modulaires avec Playwright asynchrone, rotation de User-Agents, gestion de proxies et export CSV/PostgreSQL.',
      structure: ['Scraper E-commerce & Suivi de Prix', 'Scraper d\'Annuaires Professionnels & Emails', 'Contournement Anti-Bot & Captchas', 'Pipeline de Nettoyage & Dédoublonnage de Données'],
      downloadableFiles: [
        { id: 'f-aut3', filename: 'Python-Scraping-Toolkit.zip', size: '14.0 MB', fileType: 'zip', contentSnippet: 'Code source Python avec virtualenv et documentation.' }
      ]
    },
    packaging: {
      keyBenefits: ['Rotation de proxies automatique', 'Support des sites avec rendu JavaScript', 'Export direct vers Excel et SQL'],
      faqs: [{ q: 'Le code est-il commenté ?', a: 'Oui, chaque étape est documentée avec des exemples d\'utilisation.' }]
    },
    rating: 4.94,
    reviewsCount: 49,
    salesCount: 230,
    conversionRate: 4.4
  },
  {
    id: 'prod-auto-4',
    title: 'Automated Social Media Repurposing & Auto-Publishing Bot Kit',
    subtitle: 'Système automatisé pour découper, formater et programmer la publication de contenus sur Twitter/X, LinkedIn, Threads et Bluesky.',
    category: 'Automatisations & Scripts n8n',
    format: 'pro_kit',
    targetAudience: 'Créateurs de Contenu, Agences Social Media, Solopreneurs',
    problemSolved: 'Automatise la réutilisation d\'un contenu long (article, vidéo) en 10 posts adaptés pour chaque réseau.',
    promisedOutcome: 'Multipliez votre présence sur les réseaux par 4 sans y passer plus de 30 minutes par semaine.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 42,
      compareAtPrice: 85,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🤖 Bot Auto-Publish'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 97, documentation: 96, commercialViability: 96 },
    content: {
      summary: 'Flux automatisé combinant Claude 3.7 pour la réécriture de format et les APIs des réseaux sociaux pour la publication planifiée.',
      structure: ['Transformation Article vers Thread X / LinkedIn', 'Génération de Visuels Automatiques avec Puppeteer', 'File d\'Attente & Calendrier de Diffusion', 'Suivi des Statistiques & Engagement'],
      downloadableFiles: [
        { id: 'f-aut4', filename: 'Social-Repurposing-Bot-Kit.zip', size: '10.5 MB', fileType: 'zip', contentSnippet: 'Code Node.js et flux n8n prêts à être déployés.' }
      ]
    },
    packaging: {
      keyBenefits: ['Multi-diffusion X, LinkedIn, Bluesky', 'Adaptation automatique du ton par réseau', 'Planification horaire intelligente'],
      faqs: [{ q: 'Respecte-t-il les limites de taux d\'API ?', a: 'Oui, une temporisation automatique est incluse pour éviter toute suspension.' }]
    },
    rating: 4.90,
    reviewsCount: 37,
    salesCount: 195,
    conversionRate: 4.2
  },

  // ========================================================
  // 📱 7. CRÉATION DE CONTENU & RÉSEAUX SOCIAUX (3 PRODUITS)
  // ========================================================
  {
    id: 'prod-1787480183812',
    title: 'Content Creator Evergreen Video Hooks & 365-Day Viral Script Vault',
    subtitle: '365 accroches et structures de scripts vidéo courtes (TikTok, Reels, Shorts) pour capter l\'attention dès les 3 premières secondes.',
    category: 'Création de Contenu & Réseaux Sociaux',
    format: 'prompt_pack',
    targetAudience: 'Créateurs de Contenu, Vidéastes, Influenceurs, E-commerçants',
    problemSolved: 'Met fin au blocage de la page blanche et élimine le zapping des spectateurs sur les vidéos courtes.',
    promisedOutcome: 'Captez l\'attention instantanément et multipliez vos vues organiques par 3 sur TikTok et Instagram.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 35,
      compareAtPrice: 69,
      discountPercent: 49,
      currency: 'EUR',
      attractiveBadge: '🔥 365 Hooks Viraux'
    },
    status: 'published',
    quality: { overall: 97, codeQuality: 96, documentation: 98, commercialViability: 97 },
    content: {
      summary: '365 formules de hooks vidéo classées par niche (Business, Tech, Lifestyle, Développement Personnel) avec analyse de rétention.',
      structure: ['Les 50 Accroches Psychologiques Irrésistibles', 'Structures de Scripts en 30 et 60 Secondes', 'Techniques de Storytelling en Boucle (Looping)', 'Guide d\'Éclairage et Micro-Setup pour Smartphone'],
      downloadableFiles: [
        { id: 'f-soc1', filename: '365-Viral-Video-Hooks-Master-Vault.pdf', size: '8.2 MB', fileType: 'pdf', contentSnippet: 'Guide PDF interactif avec 365 scripts complets.' }
      ]
    },
    packaging: {
      keyBenefits: ['365 accroches prêtes à tourner', 'Formules testées à 1M+ de vues', 'Compatible TikTok, Shorts et Reels'],
      faqs: [{ q: 'Faut-il du matériel professionnel ?', a: 'Non, les scripts sont calibrés pour un tournage simple au smartphone.' }]
    },
    rating: 4.95,
    reviewsCount: 82,
    salesCount: 430,
    conversionRate: 5.2
  },
  {
    id: 'prod-soc-1',
    title: 'LinkedIn Authority & Personal Branding Growth Machine',
    subtitle: 'Le système complet pour devenir une référence sur LinkedIn : 120 templates de posts viraux, stratégie de carrousels et routine de prospection.',
    category: 'Création de Contenu & Réseaux Sociaux',
    format: 'pro_kit',
    targetAudience: 'Fondateurs, Consultants, Dirigeants, Experts Indépendants',
    problemSolved: 'Permet de publier régulièrement des posts à forte valeur ajoutée sans passer 2 heures par jour à rédiger.',
    promisedOutcome: 'Générez des opportunités d\'affaires et des dizaines de milliers d\'impressions chaque semaine.',
    level: 'All Levels',
    pricing: {
      recommendedPrice: 39,
      compareAtPrice: 79,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '💼 Autorité LinkedIn'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 98, commercialViability: 96 },
    content: {
      summary: '120 formats de posts décortiqués (storytelling, études de cas, carrousels, retours d\'expérience) et templates Figma de carrousels.',
      structure: ['Optimisation du Profil LinkedIn pour la Conversion', '120 Formats de Posts à Fort Engagement', 'Templates Figma de Carrousels PDF', 'Stratégie de Commentaire & Réseautage B2B'],
      downloadableFiles: [
        { id: 'f-soc2', filename: 'LinkedIn-Growth-Machine-Pack.zip', size: '18.5 MB', fileType: 'zip', contentSnippet: 'Guide PDF, templates de carrousels Figma et tableur de planification.' }
      ]
    },
    packaging: {
      keyBenefits: ['120 templates de posts prêts', 'Carrousels Figma inclus', 'Méthode d\'engagement algorithmique 2026'],
      faqs: [{ q: 'Est-ce adapté à mon secteur d\'activité ?', a: 'Oui, les structures sont universelles et s\'adaptent à toutes les expertises.' }]
    },
    rating: 4.93,
    reviewsCount: 63,
    salesCount: 320,
    conversionRate: 4.7
  },
  {
    id: 'prod-soc-2',
    title: 'YouTube Automation Blueprint & High-CTR Thumbnail Photoshop Kit',
    subtitle: 'Méthode de création de chaînes YouTube automatisées : recherche de niches rentables, scripts IA et 50 templates de miniatures à fort CTR.',
    category: 'Création de Contenu & Réseaux Sociaux',
    format: 'pro_kit',
    targetAudience: 'Créateurs YouTube, Éditeurs de Contenu, Agences Médias',
    problemSolved: 'Maximise le taux de clic (CTR) et la rétention sur YouTube sans passer des jours sur chaque vidéo.',
    promisedOutcome: 'Lancez une chaîne YouTube monétisée avec des miniatures professionnelles et des scripts captivants.',
    level: 'Intermediate',
    pricing: {
      recommendedPrice: 49,
      compareAtPrice: 99,
      discountPercent: 50,
      currency: 'EUR',
      attractiveBadge: '🎬 YouTube Pro & Miniatures'
    },
    status: 'published',
    quality: { overall: 96, codeQuality: 95, documentation: 97, commercialViability: 96 },
    content: {
      summary: 'Playbook complet de production vidéo automatisée et 50 templates Photoshop/Figma de miniatures testées à plus de 12% de CTR.',
      structure: ['Recherche de Sujets & Mots-Clés YouTube SEO', 'Trame de Script Vidéo à Haute Rétention', '50 Templates de Miniatures Photoshop / Figma', 'Optimisation Titres & Balises Vidéo'],
      downloadableFiles: [
        { id: 'f-soc3', filename: 'YouTube-Automation-Thumbnail-Kit.zip', size: '74.0 MB', fileType: 'zip', contentSnippet: 'Fichiers PSD/Figma, polices incluses et guide PDF de 70 pages.' }
      ]
    },
    packaging: {
      keyBenefits: ['50 templates de miniatures haute résolution', 'Taux de clic supérieur à 10%', 'Méthode de script à forte rétention'],
      faqs: [{ q: 'Puis-je modifier les miniatures sur Figma ?', a: 'Oui, les fichiers sont fournis aux formats PSD (Photoshop) et Figma.' }]
    },
    rating: 4.91,
    reviewsCount: 49,
    salesCount: 240,
    conversionRate: 4.3
  }
];

async function sync() {
  console.log(`Total 35 products prepared: ${products35.length}`);
  const catDistribution: Record<string, number> = {};
  products35.forEach(p => {
    catDistribution[p.category] = (catDistribution[p.category] || 0) + 1;
  });
  console.log('Category distribution:', JSON.stringify(catDistribution, null, 2));

  // Save to Database
  await db.insert(keyValueStore)
    .values({ key: 'dpf_app_v2_products', value: products35 })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: products35 } });

  console.log('Successfully synced 35 products into dpf_app_v2_products in DB!');
}

sync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
