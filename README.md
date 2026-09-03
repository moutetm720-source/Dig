# Digital Product Factory (Dig)

Application full-stack de création et de vente de **produits digitaux** (kits, templates, guides, packs de prompts) :
back-office React, moteur d'agent **Hermes v5** côté serveur, paiements Stripe + crypto (vérification on-chain),
tunnel de démo sans Stripe, et une sécurité durcie (voir [`AUDIT_SECURITE.md`](AUDIT_SECURITE.md)).

## Stack

- **Serveur** : Node.js + Express (TypeScript, `tsx`), PostgreSQL (drizzle-orm, key-value store), `server.ts`
- **Client** : React 18 + Vite + Tailwind (`src/`)
- **IA** : moteur d'agent Hermes (`hermes/`) — boucle tool-calling réelle, **pool multi-fournisseurs avec bascule automatique** (anti rate-limit), gestionnaire d'API & tokens pilotable par Hermes
- **Tests** : `scripts/verify-security.mjs` (43 tests), `scripts/verify-hermes.mjs` (54 tests, mode mock)

## Démarrage

```bash
npm install
# Base Postgres locale (dev) — voir scripts/start-test-pg.mjs
# Variables d'env : voir .env.example (MODERATOR_PASSCODE, SESSION_SECRET, GEMINI_API_KEY…)

npm run dev        # serveur + client (dev)
npm run build      # bundle production (dist/)
npm start          # production
```

### Brancher PostgreSQL (Render)

`src/db/db.ts` accepte deux formats (les variables d'env du runtime priment sur `.env` —
`dotenv` ne surcharge pas une variable déjà définie) :

- **`DATABASE_URL`** (recommandé) : `postgresql://user:pass@host:5432/db?sslmode=require`.
  C'est ce que Render injecte automatiquement quand la base Postgres est **liée** au service.
  ⚠️ **Render exige le SSL** → assurez-vous que l'URL contient `?sslmode=require`
  (ou définissez `DB_SSL=require`).
- **Variables individuelles** : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
  `DB_SSL` (repli `SQL_*`).

Le SSL est activé automatiquement pour un hôte `*.render.com` ou en production ; en dev
local sans SSL, posez `DB_SSL=disable`. Le driver se tait sur les notices de démarrage
Render (`onnotice`).

> Pour déployer sur Render : créez le service Web, **liez** votre base Postgres
> (Render ajoute alors `DATABASE_URL` dans l'env du service), et définissez
> `SESSION_SECRET` + `MODERATOR_PASSCODE` (+ `HERMES_PROVIDER`/`GEMINI_API_KEY` pour l'IA).

### Configurer l'IA de Hermes (`.env`)

| Variable | Rôle |
|---|---|
| `HERMES_PROVIDER` | `auto` (défaut) \| `gemini` \| `openai` \| `mock` — voir sémantique pool ci-dessous |
| `GEMINI_API_KEY` | Clé Google AI Studio (gratuit) — source **env uniquement**, jamais en base |
| `HERMES_GEMINI_MODEL` | Modèle Gemini (défaut `gemini-2.5-flash`) |
| `HERMES_OPENAI_BASE_URL` / `_MODEL` / `_API_KEY` | Endpoint compatible OpenAI : **Ollama local** (`http://127.0.0.1:11434/v1`), Groq, OpenRouter… |

Sans fournisseur réel : le serveur reste **honnête** (en mode `auto` sans rien de configuré,
état `provider: aucun` + raison + métriques réelles) — les skills exécutent toujours les
actions réelles, l'interprétation libre est simplement indisponible.

### Gestionnaire d'API & tokens — pool multi-fournisseurs (« ne jamais être bloqué »)

Hermes ne dépend plus d'un seul fournisseur. Un **pool** mélange, par priorité :

1. les fournisseurs de l'environnement (`GEMINI_API_KEY`, `HERMES_OPENAI_BASE_URL`),
2. les fournisseurs **ajoutés au runtime** (base clé-valeur protégée `df_hermes_provider_pool`),
3. le mock déterministe en dernier recours (réponse toujours honnête).

À chaque appel LLM, un fournisseur qui rate-limite (429) ou échoue (5xx/timeout) passe en
**cooldown** (30 s sur rate-limit — ou `Retry-After` — ; 15 s sur erreur) et le **suivant est
essayé automatiquement**. Échec annoncé seulement si TOUS les fournisseurs ont échoué.

Sémantique de `HERMES_PROVIDER` : `mock` = mock + pool géré · `auto` = env + pool géré ·
`gemini`/`openai` = verrou exclusif sur ce type.

**Hermes gère le pool lui-même** (4 skills : `providers_list`, `providers_add`,
`providers_remove`, `providers_test` — agent Ops + orchestrateur) : « ajoute Groq au pool »,
« liste les fournisseurs », « supprime le fournisseur X » — sans redéploiement.
Équivalent REST (auth) : `GET/POST /api/hermes/providers`, `DELETE /api/hermes/providers/:name`,
`POST /api/hermes/providers/:name/test`.

Sécurité des tokens : clés stockées **uniquement** dans la clé KV protégée (exclue de
`/api/store` en lecture **et** écriture, même authentifiée), **masquées partout** (API, UI,
audit, logs — seul le format `•••• (N car.)` est exposé), `baseUrl` validée anti-SSRF
(https public ; **exception explicite** : http loopback pour un endpoint local déclaré
`local: true`, ex. Ollama — AUDIT.md P3.2). Le pool privilégie les endpoints **gratuits /
open-source** (la skill `free_llm_lookup` fournit la liste + baseUrl).

## Moteur HERMES v5 (`hermes/`)

| Module | Rôle |
|---|---|
| `types.ts` | Types + limites (budgets 6 pas / 10 outils, timeouts, tailles) |
| `providers.ts` | Gemini (`@google/genai`), compatible OpenAI (fetch natif), mock (tests) — **pool multi-fournisseurs + bascule automatique (cooldowns 429/erreur) + gestionnaire de tokens** |
| `tools.ts` | **38 skills réelles** : catalogue, pricing, contenu/SEO, canaux, ventes agrégées (sans PII), système, **internet** et **gestion du pool de fournisseurs IA** |
| `agents.ts` | **9 agents** : orchestrateur + 8 spécialistes (dont l'**Agent Internet** `web_explorer`) |
| `engine.ts` | Boucle plan → outil → observation, confirmation des actions sensibles (actionId), journal d'audit, mémoire |
| `index.ts` | Router `/api/hermes` : `status`, `agents`, `skills`, `chat`, `confirm`, `autonomous-loop`, `config`, `activity`, **`providers` (GET/POST/DELETE/:name/test)** |
| `knowledge/free-for.json` | Base de connaissances **~106 services à tiers gratuit** (snapshot curé de [free-for.dev](https://free-for.dev)) |
| `knowledge/free-llm-apis.json` | Base des **API LLM gratuites** : ~16 providers / 118 modèles (snapshot de [mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis)) |

### Agent Internet (`web_explorer`)

Interagit avec internet via 4 skills, toutes gardées (https uniquement, anti-SSRF
`ssrfGuard.ts`, timeouts, tailles plafonnées, aucune credential dans les URL) :

- `web_search` — recherche DuckDuckGo (sans clé API)
- `web_fetch` — lecture d'une page (HTML → texte lisible, ~4 000 car.)
- `web_link_check` — santé de 1 à 10 liens (codes HTTP)
- `free_tier_lookup` — base gratuite free-for.dev (hébergement, BDD, IA, e-mail, paiement, monitoring…)
- `free_llm_lookup` — base des API LLM gratuites (provider, limite gratuite, **baseUrl** souvent compatible OpenAI → branchable directement via `HERMES_OPENAI_BASE_URL`)

Le LLM (Gemini/OpenAI-compat) pilote l'agent ; en mode mock, un jeu de règles déterministe
permet de tester la boucle complète sans réseau ni clé. **Honnêteté** : si le réseau du serveur
est bloqué, l'échec est signalé — aucun résultat n'est inventé.

### Ajouter un skill

Pousser l'objet dans `buildSkillRegistry()` (`hermes/tools.ts`) — il devient immédiatement
disponible (registre UI, agents, journal d'audit). Les écritures passent par des listes blanches
de clés KV ; les secrets sont exclus de tout chemin de skill.

## Références (submodules git)

Deux dépôts de référence sont annexés dans `references/` (clones en sous-module, détachés) :

| Repository | Ce que c'est | Pourquoi ici |
|---|---|---|
| [elder-plinius/OBLITERATUS](https://github.com/elder-plinius/OBLITERATUS) | Projet open-source de **abliteration** : chirurgie fine-tuning de modèles LLM **locaux** (excision du vecteur de refus par SVD, PyTorch/GPU, Gradio, HF Spaces). | Référence technique et historique. ⚠️ **Non intégré au runtime de l'app** : c'est un outil de recherche Python/GPU qui modifie des checkpoints locaux — sans objet sur des LLM d'API (Gemini, etc.). Le « module OBLITERATUS » de l'ancienne UI était une **simulation factice** (chiffres inventés, prompts de type jailbreak) et a été retiré le 2026-09-03 (`/api/obliteratus/ablate` → 410 Gone). |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | Recensement de **100+ apps/agents LLM** open-source (RAG, agents, skills, MCP, voix). | Inspiration et catalogue de patterns — les skills « internet » de Hermes suivent le schéma classique *search → fetch → extract → synthétiser avec sources* (cf. `starter_ai_agents/web_scraping_ai_agent`, `openai_research_agent`, `ai-deep-research-agent`). |
| [mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis) | Liste maintenu d'**API LLM gratuites** (data.json : ~16 providers, limites, modèles, baseUrl). | **Intégré à Hermes** : son `data.json` alimente la base `hermes/knowledge/free-llm-apis.json` consultée par la skill `free_llm_lookup` (agent Internet) pour recommander un backend IA à coût zéro. |

> Les références sont en **lecture seule** : exclues du `tsc`/`vite build` du projet, jamais
> importées par le serveur ou le client. Pour les mettre à jour :
> `git submodule update --remote references/OBLITERATUS references/awesome-llm-apps`
> (puis commit). Pour un clone neuf incluant les références : `git clone --recurse-submodules`.

## Sécurité

Voir [`AUDIT_SECURITE.md`](AUDIT_SECURITE.md) : failles corrigées (C1–C5, H1–H7, P2-x, P3),
risques résiduels documentés, commandes de déploiement et suites de test.

## Tests de régression

```bash
# 1. Postgres de test (5432) + seed (catalogue, commandes PII, webhook)
node scripts/start-test-pg.mjs

# 2. Serveur en mode mock (fournisseur IA déterministe)
PORT=3211 DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=*** DB_NAME=applet \
  DEMO_CHECKOUT=1 MODERATOR_PASSCODE=*** HERMES_PROVIDER=mock \
  node_modules/.bin/tsx server.ts

# 3. Suites
node scripts/verify-security.mjs --base http://127.0.0.1:3211 --passcode <code> --whsec <secret>
node scripts/verify-hermes.mjs    --base http://127.0.0.1:3211 --passcode <code>
```

⚠️ Les rate-limiters IA (6 req/min/IP) sont en mémoire : les deux suites ne doivent pas
consommer la même fenêtre — la suite Hermes gère elle-même les pauses sur 429.
