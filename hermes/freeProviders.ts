/**
 * hermes/freeProviders.ts — Catalogue et helpers pour les providers LLM 100% gratuits.
 *
 * Objectif : "implémente un modèle comme le tien avec toutes les clés gratuites"
 * → fournir un pool de modèles gratuits, sans clé ou avec clés free tier, qui
 * fonctionne même quand GEMINI_API_KEY est absente et qu'Ollama local ne tourne pas.
 *
 * Sources :
 *  - hermes/knowledge/free-llm-apis.json (snapshot de mnfst/awesome-free-llm-apis)
 *  - hermes/knowledge/free-for.json
 *
 * Providers gratuits SANS clé (priorité 800+) :
 *  - OVHcloud AI Endpoints : https://oai.endpoints.kepler.ai.cloud.ovh.net/v1 — 2 RPM/IP, anonyme
 *  - LLM7.io : https://api.llm7.io/v1 — anonymous turbo models
 *  - Ollama Cloud (si dispo) : https://ollama.com/v1 — free tier
 *
 * Providers gratuits AVEC clé gratuite (nécessite inscription, mais free tier permanent) :
 *  - Groq : https://api.groq.com/openai/v1 — ultra rapide, free tier sans CB
 *  - OpenRouter : https://openrouter.ai/api/v1 — :free models (openai/gpt-oss-20b:free etc)
 *  - Mistral : https://api.mistral.ai/v1 — free mode
 *  - Cohere : https://api.cohere.com/v2 — 1000 calls/month trial
 *  - Together, HuggingFace, Cloudflare, NVIDIA NIM...
 *
 * Ce module expose :
 *  - FREE_CATALOG : liste curée pour l'UI
 *  - getFreeProvidersFromEnv() : lit les clés free depuis l'env et retourne des ProviderSpec
 *  - autoInstallFreeProviders() : installe automatiquement les free providers détectés dans le pool KV
 */

import { ProviderSpec } from './types';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { HERMES_POOL } from './types';

export interface FreeProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  models: string[];
  freeTier: string;
  needsKey: boolean;
  envKey?: string;
  priority: number;
  docsUrl: string;
}

export const FREE_CATALOG: FreeProviderInfo[] = [
  {
    id: 'ovh-free',
    name: 'OVHcloud AI Endpoints',
    baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
    model: 'gpt-oss-20b',
    models: ['gpt-oss-20b', 'gpt-oss-120b', 'Qwen3-32B', 'Meta-Llama-3_3-70B-Instruct', 'Mistral-Small-3.2-24B-Instruct-2506'],
    freeTier: 'Free anonymous tier (no API key, no signup): 2 RPM per IP per model. 20+ open-weight models hosted in EU. OpenAI SDK-compatible.',
    needsKey: false,
    priority: 800,
    docsUrl: 'https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/'
  },
  {
    id: 'llm7-free',
    name: 'LLM7.io',
    baseUrl: 'https://api.llm7.io/v1',
    model: 'gpt-oss:20b',
    models: ['gpt-oss:20b', 'mistral-Nemo-Instruct-2407', 'minimax-m2.7'],
    freeTier: 'API gateway with a free tier. Anonymous access needs no key and reaches the turbo models; a free token raises limits.',
    needsKey: false,
    priority: 810,
    docsUrl: 'https://llm7.io/docs'
  },
  {
    id: 'groq-free',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3-32b'],
    freeTier: 'Free tier, no credit card. Ultra-fast LPU inference. 30 RPM, 1000 RPD for many models.',
    needsKey: true,
    envKey: 'GROQ_API_KEY',
    priority: 100,
    docsUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'openrouter-free',
    name: 'OpenRouter (free models)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
    models: [
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
      'liquid/lfm-2.5-2.6b:free',
      'dots-studio/dots-3-note-preview:free',
      'inclusionai/ling-3.0-flash-sante:free'
    ],
    freeTier: 'Free models (marked with :free suffix). OpenAI SDK-compatible. Quotas limités (20 RPM/50 RPD par compte). Le catalogue :free tourne : vérifiez https://openrouter.ai/models?max_price=0&modality=text.',
    needsKey: true,
    envKey: 'OPENROUTER_API_KEY',
    priority: 120,
    docsUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'mistral-free',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'codestral-latest', 'ministral-8b-latest'],
    freeTier: 'Free mode, enabled by default, no credit card required. $10/month in API credits.',
    needsKey: true,
    envKey: 'MISTRAL_API_KEY',
    priority: 130,
    docsUrl: 'https://console.mistral.ai/api-keys'
  },
  {
    id: 'cohere-free',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.com/compatibility/v1',
    model: 'command-r-08-2024',
    models: ['command-r-08-2024', 'command-r-plus-08-2024', 'command-a-03-2025'],
    freeTier: 'Free Trial API key, no credit card. 1,000 API calls/month. Non-commercial.',
    needsKey: true,
    envKey: 'COHERE_API_KEY',
    priority: 140,
    docsUrl: 'https://dashboard.cohere.com/api-keys'
  },
  {
    id: 'huggingface-free',
    name: 'Hugging Face Inference',
    baseUrl: 'https://router.huggingface.co/v1',
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    models: ['meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen2.5-7B-Instruct', 'google/gemma-3-4b-it'],
    freeTier: '$0.10/month free credits. Thousands of models via Inference Providers.',
    needsKey: true,
    envKey: 'HF_TOKEN',
    priority: 150,
    docsUrl: 'https://huggingface.co/settings/tokens'
  },
  {
    id: 'together-free',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    models: ['meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'Qwen/Qwen2.5-7B-Instruct-Turbo'],
    freeTier: 'Free tier with credits on signup. OpenAI compatible.',
    needsKey: true,
    envKey: 'TOGETHER_API_KEY',
    priority: 160,
    docsUrl: 'https://api.together.xyz/settings/api-keys'
  },
  {
    id: 'nvidia-free',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-3.3-70b-instruct',
    models: ['meta/llama-3.3-70b-instruct', 'nvidia/nemotron-3-super-120b-a12b', 'openai/gpt-oss-120b'],
    freeTier: 'Free with NVIDIA Developer Program. 100+ models. 40 RPM, 10k RPD.',
    needsKey: true,
    envKey: 'NVIDIA_API_KEY',
    priority: 170,
    docsUrl: 'https://build.nvidia.com/explore/discover'
  },
  // Alias legacy : kilo-free = openrouter-free (compatibilité anciens pools)
  {
    id: 'kilo-free',
    name: 'OpenRouter (alias kilo-free)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
    models: ['google/gemma-4-31b-it:free'],
    freeTier: 'Alias de openrouter-free pour compatibilité.',
    needsKey: true,
    envKey: 'OPENROUTER_API_KEY',
    priority: 121,
    docsUrl: 'https://openrouter.ai/keys'
  },
];

/**
 * Lit l'environnement et retourne les ProviderSpec pour les clés gratuites détectées.
 * Exemple : si GROQ_API_KEY est présent, on retourne un spec groq-free.
 */
export function getFreeProvidersFromEnv(): ProviderSpec[] {
  const specs: ProviderSpec[] = [];

  // Toujours inclure les anonymes gratuits (pas de clé)
  for (const fp of FREE_CATALOG.filter(f => !f.needsKey && process.env.HERMES_ANONYMOUS_FALLBACK !== '0')) {
    specs.push({
      name: fp.id,
      kind: 'openai',
      model: fp.model,
      baseUrl: fp.baseUrl,
      priority: fp.priority,
    });
  }

  // Inclure ceux avec clé si la clé env est présente
  for (const fp of FREE_CATALOG.filter(f => f.needsKey)) {
    const key = fp.envKey ? process.env[fp.envKey] : undefined;
    if (key) {
      specs.push({
        name: fp.id,
        kind: 'openai',
        model: fp.model,
        baseUrl: fp.baseUrl,
        apiKey: key,
        priority: fp.priority,
      });
    }
    // Cas spéciaux : HERMES_OPENAI_API_KEY peut contenir Groq/OpenRouter si baseUrl correspond
    if (fp.id === 'groq-free' && process.env.HERMES_OPENAI_BASE_URL?.includes('groq.com') && process.env.HERMES_OPENAI_API_KEY) {
      if (!specs.some(s => s.name === 'groq-free')) {
        specs.push({
          name: 'groq-free',
          kind: 'openai',
          model: process.env.HERMES_OPENAI_MODEL || fp.model,
          baseUrl: process.env.HERMES_OPENAI_BASE_URL,
          apiKey: process.env.HERMES_OPENAI_API_KEY,
          priority: fp.priority,
        });
      }
    }
  }

  return specs;
}

/**
 * Auto-installation des providers gratuits détectés dans le pool KV.
 * Appelé au démarrage du serveur (non bloquant).
 */
export async function autoInstallFreeProviders(): Promise<{ installed: number; skipped: number }> {
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, HERMES_POOL.KV_KEY));
    let existing: ProviderSpec[] = [];
    if (r.length > 0 && r[0].value) {
      const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (Array.isArray(v)) existing = v;
    }

    let installed = 0;
    let skipped = 0;

    for (const fp of getFreeProvidersFromEnv()) {
      if (existing.some(e => e.name === fp.name)) {
        skipped++;
        continue;
      }
      // Pour les anonymes, on ne les met pas en KV (ils sont déjà dans buildPool), sauf si on veut les persister
      if (!fp.apiKey && FREE_CATALOG.find(f => f.id === fp.name && !f.needsKey)) {
        // On les laisse gérés par buildPool, pas besoin de les persister
        skipped++;
        continue;
      }
      existing.push(fp);
      installed++;
    }

    if (installed > 0) {
      const capped = existing.slice(0, HERMES_POOL.MAX_PROVIDERS);
      await db.insert(keyValueStore).values({ key: HERMES_POOL.KV_KEY, value: capped })
        .onConflictDoUpdate({ target: keyValueStore.key, set: { value: capped } });
      console.log(`[hermes] ${installed} fournisseur(s) gratuit(s) auto-installé(s) depuis l'env : ${existing.slice(-installed).map(s => s.name).join(', ')}`);
    }

    return { installed, skipped };
  } catch (e: any) {
    console.warn('[hermes] autoInstallFreeProviders échoué:', e?.message);
    return { installed: 0, skipped: 0 };
  }
}

/**
 * Retourne le catalogue pour l'UI / API
 */
export function getFreeCatalogForUI() {
  return FREE_CATALOG.map(f => ({
    id: f.id,
    name: f.name,
    baseUrl: f.baseUrl,
    model: f.model,
    models: f.models.slice(0, 5),
    freeTier: f.freeTier,
    needsKey: f.needsKey,
    envKey: f.envKey,
    priority: f.priority,
    docsUrl: f.docsUrl,
    configured: f.envKey ? Boolean(process.env[f.envKey]) : process.env.HERMES_ANONYMOUS_FALLBACK !== '0', // présence de config ≠ disponibilité/coût vérifiés
  }));
}
