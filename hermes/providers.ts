/**
 * hermes/providers.ts — Couche multi-fournisseurs LLM (zéro dépendance ajoutée).
 *
 * Fournisseurs :
 *  - gemini   : @google/genai (dépendance existante) — gratuit (Gemini API tier)
 *  - openai   : n'importe quel endpoint compatible OpenAI /chat/completions :
 *               Ollama local (gratuit, modèles open-source : llama3.1, qwen2.5,
 *               mistral...), Groq, OpenRouter, Together, llama.cpp...
 *  - mock     : fournisseur déterministe pour les tests E2E (HERMES_PROVIDER=mock)
 *
 * Sélecteurs (env ou KV df_hermes_config, modifiable par le modérateur) :
 *  - auto : gemini si GEMINI_API_KEY, sinon openai si HERMES_OPENAI_BASE_URL, sinon aucun
 */
import { GoogleGenAI } from '@google/genai';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { AgentEvent, LLMChatOptions, LLMChatResult, LLMProvider, HermesConfig, DEFAULT_HERMES_CONFIG, HERMES_LIMITS } from './types';

// ---------- Config (env + KV) ----------

let configCache: { at: number; cfg: HermesConfig } | null = null;

export async function getHermesConfig(): Promise<HermesConfig> {
  if (configCache && Date.now() - configCache.at < 15 * 1000) return configCache.cfg;
  let cfg: HermesConfig = { ...DEFAULT_HERMES_CONFIG };
  try {
    const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_hermes_config'));
    if (r.length > 0 && r[0].value) {
      const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
      if (v && typeof v === 'object') {
        if (['auto', 'gemini', 'openai', 'mock'].includes(v.provider)) cfg.provider = v.provider;
        if (typeof v.geminiModel === 'string' && v.geminiModel) cfg.geminiModel = v.geminiModel.slice(0, 80);
        if (typeof v.openaiBaseUrl === 'string') cfg.openaiBaseUrl = v.openaiBaseUrl.slice(0, 300);
        if (typeof v.openaiModel === 'string' && v.openaiModel) cfg.openaiModel = v.openaiModel.slice(0, 120);
      }
    }
  } catch (e) {}
  configCache = { at: Date.now(), cfg };
  return cfg;
}

export async function saveHermesConfig(patch: Partial<HermesConfig>): Promise<HermesConfig> {
  const current = await getHermesConfig();
  const next: HermesConfig = { ...current, ...patch };
  if (!['auto', 'gemini', 'openai', 'mock'].includes(next.provider)) next.provider = 'auto';
  next.geminiModel = String(next.geminiModel || '').slice(0, 80) || DEFAULT_HERMES_CONFIG.geminiModel;
  next.openaiBaseUrl = String(next.openaiBaseUrl || '').slice(0, 300);
  next.openaiModel = String(next.openaiModel || '').slice(0, 120) || DEFAULT_HERMES_CONFIG.openaiModel;
  await db.insert(keyValueStore).values({ key: 'df_hermes_config', value: next })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: next } });
  configCache = null;
  return next;
}

// ---------- Gemini ----------

let geminiClient: GoogleGenAI | null = null;

class GeminiProvider implements LLMProvider {
  id = 'gemini' as const;
  model: string;
  label: string;
  constructor(model: string) {
    this.model = model;
    this.label = `Gemini (${model})`;
  }

  async chat(opts: LLMChatOptions): Promise<LLMChatResult> {
    if (!geminiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY absente.');
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }

    // Conversion du log plat en contents Gemini (texte + functionCall/functionResponse)
    const contents: any[] = [];
    for (const ev of opts.events) {
      if (ev.type === 'text') {
        contents.push({ role: ev.role === 'model' ? 'model' : 'user', parts: [{ text: ev.text }] });
      } else if (ev.type === 'tool_call') {
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name: ev.name, args: ev.args || {} } }]
        });
      } else if (ev.type === 'tool_result') {
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: ev.name, response: { result: truncateForLLM(ev.result) } } }]
        });
      }
    }

    const res = await withTimeout(geminiClient.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: opts.system,
        tools: [{ functionDeclarations: opts.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters as any
        })) }],
        temperature: 0.3
      }
    }), HERMES_LIMITS.LLM_TIMEOUT_MS);

    const candidate = (res as any)?.candidates?.[0];
    const parts: any[] = candidate?.content?.parts || [];
    const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];
    let text = '';
    for (const p of parts) {
      if (p.functionCall) {
        toolCalls.push({ name: String(p.functionCall.name), args: p.functionCall.args || {} });
      } else if (typeof p.text === 'string') {
        text += p.text;
      }
    }
    return {
      text: text || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: (res as any)?.usageMetadata
        ? { inputTokens: (res as any).usageMetadata.promptTokenCount, outputTokens: (res as any).usageMetadata.candidatesTokenCount }
        : undefined
    };
  }
}

// ---------- Compatible OpenAI (Ollama local, Groq, OpenRouter, llama.cpp...) ----------

class OpenAICompatProvider implements LLMProvider {
  id = 'openai' as const;
  model: string;
  baseUrl: string;
  label: string;
  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
    this.label = `OpenAI-compatible ${this.baseUrl} (${model})`;
  }

  async chat(opts: LLMChatOptions): Promise<LLMChatResult> {
    // Conversion du log plat en messages OpenAI
    const messages: any[] = [{ role: 'system', content: opts.system }];
    for (const ev of opts.events) {
      if (ev.type === 'text') {
        messages.push({ role: ev.role === 'model' ? 'assistant' : 'user', content: ev.text });
      } else if (ev.type === 'tool_call') {
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{ id: `call_${messages.length}`, type: 'function', function: { name: ev.name, arguments: JSON.stringify(ev.args || {}) } }]
        });
      } else if (ev.type === 'tool_result') {
        messages.push({ role: 'tool', tool_call_id: `call_${Math.max(0, messages.length - 1)}`, content: JSON.stringify(truncateForLLM(ev.result)) });
      }
    }

    const body: any = {
      model: this.model,
      messages,
      temperature: 0.3
    };
    if (opts.tools.length > 0) {
      body.tools = opts.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters }
      }));
    }

    const key = process.env.HERMES_OPENAI_API_KEY || '';
    const res = await withTimeout(fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {})
      },
      body: JSON.stringify(body)
    }), HERMES_LIMITS.LLM_TIMEOUT_MS);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Fournisseur OpenAI-compatible : HTTP ${res.status} ${errText.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const msg = data?.choices?.[0]?.message;
    const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];
    if (Array.isArray(msg?.tool_calls)) {
      for (const tc of msg.tool_calls) {
        let args: Record<string, any> = {};
        try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { args = {}; }
        toolCalls.push({ name: String(tc.function?.name || ''), args });
      }
    }
    return {
      text: typeof msg?.content === 'string' && msg.content ? msg.content : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }
}

// ---------- Mock (tests E2E déterministes) ----------

/**
 * Fournisseur mock : simule un LLM à function calling de façon déterministe
 * afin de tester la BOUCLE AGENT COMPLÈTE (plan → outil → observation →
 * réponse) sans réseau ni clé API. Ne doit JAMAIS être utilisé en production.
 */
class MockProvider implements LLMProvider {
  id = 'mock' as const;
  model = 'mock-deterministe-v1';
  label = 'Mock (tests — pas d\u2019IA réelle)';

  async chat(opts: LLMChatOptions): Promise<LLMChatResult> {
    const lastUser = [...opts.events].reverse().find(e => e.type === 'text' && e.role === 'user') as any;
    const lastToolResult = [...opts.events].reverse().find(e => e.type === 'tool_result') as any;
    const prompt = String(lastUser?.text || '').toLowerCase();

    // 1) Si un outil vient de renvoyer needsConfirmation → demander la confirmation
    if (lastToolResult && typeof lastToolResult.result === 'object' && lastToolResult.result?.needsConfirmation) {
      return { text: `⚠️ **Action sensible détectée** : ${lastToolResult.result.summary}\n\nJe ne l'exécute que si vous le confirmez explicitement (bouton « Confirmer l'action »).` };
    }

    // 2) Une observation vient d'arriver → synthèse finale (on ne relance pas d'outil)
    if (lastToolResult && (lastToolResult.result === null || typeof lastToolResult.result !== 'object' || !lastToolResult.result.needsConfirmation)) {
      const summary = JSON.stringify(lastToolResult.result).slice(0, 200);
      return { text: `✅ **Action effectuée** (${lastToolResult.name})\n\nSynthèse du résultat : \`${summary}\`\n\nJe peux enchaîner d'autres actions — que souhaitez-vous faire ensuite ?` };
    }

    // 3) Changement de prix explicite : "met/passe le prix de <id> à <n>€"
    const priceMatch = prompt.match(/(?:prix|price)[^\n]*?((?:prod-|bump-)[a-z0-9-]+)[^\n]*?(\d+(?:[.,]\d{1,2})?)\s*€/i)
      || prompt.match(/((?:prod-|bump-)[a-z0-9-]+)[^\n]*?(\d+(?:[.,]\d{1,2})?)\s*€/i);
    if (priceMatch) {
      const id = priceMatch[1];
      const price = Number(priceMatch[2].replace(',', '.'));
      return { toolCalls: [{ name: 'catalog_set_price', args: { id, price, confirm: true } }] };
    }

    // 3) Suppression : "supprime le produit <id>"
    const delMatch = prompt.match(/supprim[ea]?[^\n]*?((?:prod-|bump-)[a-z0-9-]+)/i) || prompt.match(/((?:prod-|bump-)[a-z0-9-]+)[^\n]*?supprim/i);
    if (delMatch) {
      return { toolCalls: [{ name: 'catalog_delete', args: { id: delMatch[1] } }] }; // sans confirm → confirmation requise
    }

    // 4) Création de produit explicite : "crée un produit X à Y€"
    // Titre de préférence entre guillemets « ... », sinon segment 4-60 car. avant le prix
    const quotedTitle = (prompt.match(/«([^«»\n]{4,60})»/) || [])[1];
    const priceOnly = (prompt.match(/(\d+(?:[.,]\d{1,2})?)\s*€/) || [])[1];
    const unquoted = prompt.match(/cr[ée]e[^«»\n]*?«?([A-Za-zÀ-ÿ'\- ]{4,60}?)[,;\s]»?[ ]*à [ ]?(\d+(?:[.,]\d{1,2})?)\s*€/i);
    const createMatch = quotedTitle
      ? { 1: quotedTitle, 2: priceOnly }
      : (unquoted ? { 1: unquoted[1].trim(), 2: unquoted[2] } : null);
    if (createMatch) {
      const title = createMatch[1].trim();
      const price = Number(createMatch[2].replace(',', '.'));
      return { toolCalls: [{ name: 'catalog_create', args: { title, price, category: 'IA & Productivité', format: 'prompt_pack' } }] };
    }

    // 5) Audit → outil audit_system
    if (prompt.includes('audit') || prompt.includes('statut') || prompt.includes('diagnostic')) {
      return { toolCalls: [{ name: 'audit_system', args: {} }] };
    }

    // 6) Métriques
    if (prompt.includes('vente') || prompt.includes('ca ') || prompt.includes('revenu') || prompt.includes('métrique') || prompt.includes('métrique')) {
      return { toolCalls: [{ name: 'metrics_summary', args: {} }] };
    }

    // 7) Base gratuite (free-for.dev) : "quels outils gratuits pour héberger…"
    if (prompt.includes('free-for') || (/(gratuit|sans coût|sans cout|0 ?€|zero cost)/.test(prompt) && /(outil|service|hébergement|heberg|base|api|infrastructure)/.test(prompt))) {
      const catMatch = prompt.match(/\b(ia|llm|hebergement|hébergement|base|email|e-mail|paiement|monitoring|analytics|cdn|stockage|recherche|authentification|communication|api_divers|dev_ci)\b/);
      const args: Record<string, any> = { query: String(lastUser?.text || '').slice(0, 200) };
      if (catMatch) args.category = catMatch[1].toLowerCase();
      return { toolCalls: [{ name: 'free_tier_lookup', args }] };
    }

    // 8) Contrôle de liens : "vérifie les liens…"
    if (/(vérifie|verifie|check)[^\n]*(lien|url)/.test(prompt) || prompt.includes('liens cassés') || prompt.includes('liens casses')) {
      const urls = [...String(lastUser?.text || '').matchAll(/https?:\/\/[^\s"'»\]]+/gi)].map(m => m[0]).slice(0, 10);
      if (urls.length > 0) return { toolCalls: [{ name: 'web_link_check', args: { urls } }] };
    }

    // 9) Lecture de page : "lis/analyse cette page https://…"
    const urlInPrompt = [...String(lastUser?.text || '').matchAll(/https?:\/\/[^\s"'»\]]+/gi)].map(m => m[0])[0];
    if (urlInPrompt && /(lis|lit|page|contenu|analyse cette|résume cette|resume cette)/.test(prompt)) {
      return { toolCalls: [{ name: 'web_fetch', args: { url: urlInPrompt } }] };
    }

    // 10) Recherche web : "cherche/recherche sur internet…"
    if (/(cherch[ée]e|recherche|sur internet|sur le web|veille|tendances web)/.test(prompt)) {
      return { toolCalls: [{ name: 'web_search', args: { query: String(lastUser?.text || '').slice(0, 200), count: 5 } }] };
    }

    // 7) Défaut : texte honnête
    return { text: `🤖 **Hermes (mode mock — tests)**\n\nMessage reçu : « ${String(lastUser?.text || '').slice(0, 120)} ».\n\nCe fournisseur est le **mock déterministe de test** : il exécutera les actions explicites (prix, création, suppression, audit) via les outils réels du serveur, mais ne fait aucune génération de langage. Configurez un fournisseur réel (Gemini, Ollama local, Groq...) pour l'interprétation libre.` };
  }
}

// ---------- Sélection ----------

export async function getActiveProvider(): Promise<{ provider: LLMProvider | null; reason: string }> {
  const cfg = await getHermesConfig();
  const envForce = (process.env.HERMES_PROVIDER || '').toLowerCase();
  const choice = envForce || cfg.provider;

  try {
    if (choice === 'mock') {
      return { provider: new MockProvider(), reason: 'mock' };
    }
    if (choice === 'gemini') {
      if (!process.env.GEMINI_API_KEY) return { provider: null, reason: 'gemini configuré mais GEMINI_API_KEY absente' };
      return { provider: new GeminiProvider(cfg.geminiModel), reason: 'gemini' };
    }
    if (choice === 'openai') {
      if (!cfg.openaiBaseUrl) return { provider: null, reason: 'openai configuré mais HERMES_OPENAI_BASE_URL absente' };
      return { provider: new OpenAICompatProvider(cfg.openaiBaseUrl, cfg.openaiModel), reason: 'openai-compatible' };
    }
    // auto
    if (process.env.GEMINI_API_KEY) {
      return { provider: new GeminiProvider(cfg.geminiModel), reason: 'auto→gemini' };
    }
    if (cfg.openaiBaseUrl) {
      return { provider: new OpenAICompatProvider(cfg.openaiBaseUrl, cfg.openaiModel), reason: 'auto→openai-compatible' };
    }
    return { provider: null, reason: 'aucun fournisseur disponible (configurez GEMINI_API_KEY ou un endpoint OpenAI-compatible type Ollama)' };
  } catch (e: any) {
    return { provider: null, reason: `erreur de sélection fournisseur : ${e?.message}` };
  }
}

// ---------- Utilitaires ----------

export function truncateForLLM(value: any): any {
  let s: string;
  try { s = typeof value === 'string' ? value : JSON.stringify(value); } catch { s = String(value); }
  if (s.length > HERMES_LIMITS.TOOL_RESULT_CHARS) {
    return s.slice(0, HERMES_LIMITS.TOOL_RESULT_CHARS) + `… [tronqué à ${HERMES_LIMITS.TOOL_RESULT_CHARS} caractères]`;
  }
  return value;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Délai LLM dépassé (${ms / 1000} s).`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
