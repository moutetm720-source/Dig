/**
 * hermes/freeProviders.ts — Catalogue des fournisseurs LLM à offre gratuite.
 *
 * Source unique pour :
 *  - le pool (hermes/providers.ts → buildPool) : endpoints anonymes (needsKey:false)
 *    ajoutés en repli, et fournisseurs à clé gratuite dérivés de l'environnement
 *    (envKey présent) — l'environnement fait foi, rien n'est recopié en base ;
 *  - l'UI / l'API (GET /api/hermes/free-catalog, skill free_catalog) ;
 *  - l'installation explicite au runtime (POST /api/hermes/free-install/:id,
 *    skill free_install) via catalogSpec().
 *
 * Chaque entrée porte une CASCADE de modèles (`models`) : le premier est le
 * modèle principal, les suivants sont essayés automatiquement, dans l'ordre,
 * au sein d'un même appel (voir OpenAICompatProvider). Tous doivent supporter
 * le function calling (paramètre `tools`).
 *
 * ⚠️ Catalogue ≠ autorisation : seuls les fournisseurs validés par
 * providerCostPolicy (hermes/providerPolicy.ts) sont appelés en mode sans API
 * payante. Les limites gratuites changent : vérifier sur le site du fournisseur.
 * Références : hermes/knowledge/free-llm-apis.json (snapshot mnfst/awesome-free-llm-apis).
 */
import { ProviderSpec, OPENROUTER_FREE_CASCADE, HERMES_POOL } from './types';

export interface FreeProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  /** Modèle principal (tête de cascade). */
  model: string;
  /** Cascade complète, modèle principal inclus, dans l'ordre d'essai. */
  models: string[];
  freeTier: string;
  needsKey: boolean;
  envKey?: string;
  priority: number;
  docsUrl: string;
}

export const FREE_CATALOG: FreeProviderInfo[] = [
  {
    id: 'openrouter-free',
    name: 'OpenRouter (modèles :free)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: OPENROUTER_FREE_CASCADE[0],
    models: [...OPENROUTER_FREE_CASCADE],
    freeTier: 'Modèles suffixés :free (0 $/token), 20 RPM et 50 requêtes/jour par compte sans crédit (1 000/jour dès 10 $ de crédit achetés une fois). Cascade automatique gemma-4-31b → gpt-oss-120b → qwen3-next → openrouter/free (routeur). Le catalogue :free tourne : https://openrouter.ai/models?max_price=0&supported_parameters=tools. Si 404 « data policy » : activer la publication des modèles gratuits dans https://openrouter.ai/settings/privacy.',
    needsKey: true,
    envKey: 'OPENROUTER_API_KEY',
    priority: 120,
    docsUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'groq-free',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3-32b'],
    freeTier: 'Free tier sans carte bancaire. Inférence LPU très rapide. ~30 RPM, 1 000 RPD selon le modèle. Facturation inconnue pour la politique de coût : bloqué en mode strict.',
    needsKey: true,
    envKey: 'GROQ_API_KEY',
    priority: 100,
    docsUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'mistral-free',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    models: ['mistral-small-latest', 'ministral-8b-latest', 'mistral-medium-latest'],
    freeTier: 'Free mode activé par défaut, sans carte bancaire. Facturation inconnue pour la politique de coût : bloqué en mode strict.',
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
    freeTier: 'Clé d’essai gratuite sans carte : 1 000 appels/mois, usage non commercial. Bloqué en mode strict.',
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
    models: ['meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen2.5-7B-Instruct'],
    freeTier: 'Crédits gratuits mensuels limités via Inference Providers. Bloqué en mode strict.',
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
    freeTier: 'Crédits offerts à l’inscription. Compatible OpenAI. Bloqué en mode strict.',
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
    models: ['meta/llama-3.3-70b-instruct', 'openai/gpt-oss-120b', 'nvidia/nemotron-3-super-120b-a12b'],
    freeTier: 'Gratuit avec le NVIDIA Developer Program (~40 RPM). Bloqué en mode strict.',
    needsKey: true,
    envKey: 'NVIDIA_API_KEY',
    priority: 170,
    docsUrl: 'https://build.nvidia.com/explore/discover'
  },
  // ---- Anonymes (sans clé) : repli de basse priorité, si HERMES_ANONYMOUS_FALLBACK≠0 ----
  {
    id: 'ovh-free',
    name: 'OVHcloud AI Endpoints',
    baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
    model: 'gpt-oss-20b',
    models: ['gpt-oss-20b', 'gpt-oss-120b', 'Qwen3-32B', 'Meta-Llama-3_3-70B-Instruct', 'Mistral-Small-3.2-24B-Instruct-2506'],
    freeTier: 'Accès anonyme sans clé ni inscription : 2 RPM par IP ET PAR MODÈLE (la cascade multiplie donc le quota). Modèles open-weight hébergés en UE. Disponibilité non garantie.',
    needsKey: false,
    priority: 800,
    docsUrl: 'https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/'
  },
  {
    id: 'llm7-free',
    name: 'LLM7.io',
    baseUrl: 'https://api.llm7.io/v1',
    model: 'gpt-oss:20b',
    models: ['gpt-oss:20b', 'mistral-Nemo-Instruct-2407'],
    freeTier: 'Passerelle avec accès anonyme (≈10 RPM, 60 req/h) sans clé. Disponibilité non garantie.',
    needsKey: false,
    priority: 810,
    docsUrl: 'https://llm7.io/docs'
  }
];

/** Entrées du catalogue par identifiant. */
export function findFreeProvider(id: string): FreeProviderInfo | undefined {
  const n = String(id || '').trim().toLowerCase();
  return FREE_CATALOG.find(f => f.id === n);
}

/**
 * Construit la spec de pool d'une entrée du catalogue.
 * - `model` : surcharge du modèle principal (la cascade du catalogue reste en repli) ;
 * - `apiKey` : clé fournie (runtime) — jamais héritée d'un autre endpoint.
 */
export function catalogSpec(info: FreeProviderInfo, opts: { model?: string; apiKey?: string; models?: string[] } = {}): ProviderSpec {
  const cascade = (opts.models && opts.models.length ? opts.models : info.models).map(m => String(m || '').trim()).filter(Boolean);
  const head = String(opts.model || '').trim() || cascade[0] || info.model;
  const fallbackModels = [...new Set(cascade)].filter(m => m !== head).slice(0, HERMES_POOL.MAX_MODEL_CASCADE - 1);
  return {
    name: info.id,
    kind: 'openai',
    model: head,
    ...(fallbackModels.length ? { fallbackModels } : {}),
    baseUrl: info.baseUrl,
    ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
    priority: info.priority
  };
}

/** Catalogue pour l'UI / l'API (aucune clé, seulement « configurée ou non »). */
export function getFreeCatalogForUI() {
  return FREE_CATALOG.map(f => ({
    id: f.id,
    name: f.name,
    baseUrl: f.baseUrl,
    model: f.model,
    models: f.models,
    freeTier: f.freeTier,
    needsKey: f.needsKey,
    envKey: f.envKey,
    priority: f.priority,
    docsUrl: f.docsUrl,
    // présence de config ≠ disponibilité/coût vérifiés
    configured: f.envKey ? Boolean(process.env[f.envKey]) : process.env.HERMES_ANONYMOUS_FALLBACK !== '0'
  }));
}
