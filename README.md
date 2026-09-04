# Digital Product Factory (Dig)

Application full-stack de création et de vente de **produits digitaux** (kits, templates, guides, packs de prompts) :
back-office React, moteur d'agent **Hermes v5** côté serveur, paiements Stripe + crypto (vérification on-chain),
tunnel de démo sans Stripe, et une sécurité durcie (voir [`AUDIT_SECURITE.md`](AUDIT_SECURITE.md)).

## Stack

- **Serveur** : Node.js + Express (TypeScript, `tsx`), PostgreSQL (drizzle-orm, key-value store), `server.ts`
- **Client** : React 18 + Vite + Tailwind (`src/`)
- **IA** : moteur d'agent Hermes (`hermes/`) — boucle tool-calling réelle, **pool multi-fournisseurs avec bascule automatique** (anti rate-limit), gestionnaire d'API & tokens pilotable par Hermes, **docteur de code** (`code_doctor`) qui détecte et corrige les erreurs d'intégration client ↔ API, **autonomie serveur** (cycles planifiés, actions sûres, journal) et skills **repos GitHub / liens / référentiels locaux**
- **Tests** : `scripts/verify-security.mjs` (43 tests), `scripts/verify-hermes.mjs` (77 tests, mode mock), `scripts/verify-diagnostics.mjs` (40 tests — docteur de code)

## Démarrage

```bash
npm install
# Base Postgres locale (dev) — voir scripts/start-test-pg.mjs
# Variables d'env : voir .env.example (MODERATOR_PASSCODE, SESSION_SECRET, GEMINI_API_KEY…)

npm run dev        # serveur + client (dev)
npm run build      # bundle production (dist/)
npm start          # production
```

### Lancement sur Render — guide pas à pas

> **Aucune credential Render n'est dans ce dépôt** (ni `.env`, ni historique git) :
> le mot de passe de la base, l'URL et les liens n'existent que dans **votre
> dashboard Render**, où vous les saisissez au moment du lancement. Le fichier
> `.env` est gitignoré et **jamais lu par Render** — tout se passe dans les
> variables d'environnement du service.

1. **Base PostgreSQL** — Render → *New* → *PostgreSQL* :
   - Région : **Frankfurt** (recommandé, proximité) ; plan *Free* (90 jours) ou *Starter*.
   - Notez : *Connection String* (contient le mot de passe) + *Host/Port/User/Database*.
     Vous n'aurez pas à les saisir manuellement si vous **liez** la base (étape 3).
2. **Service Web** — *New* → *Web Service* → branchez le dépôt GitHub
   `moutetm720-source/Dig`, branche `main` :
   - **Build Command** : `git submodule update --init --recursive && npm install && npm run build`
     (les submodules `references/*` = référentiels lus par la skill `reference_repos` ;
     si le poids (awesome-llm-apps ≈ 90 Mo) pose problème sur votre plan, omettez cette
     partie : la skill renverra un état « non initialisés » honnête)
   - **Start Command** : `npm start` (→ `tsx server.ts`, `tsx` est en `dependencies`)
   - **Region** : Frankfurt (idéalement la même que la base).
3. **Lier la base au service** — Web Service → *Settings* → *Advanced* →
   *Linked Services* → *Add linked service* → choisir la Postgres.
   → Render **injecte automatiquement `DATABASE_URL`** (mot de passe inclus,
   `?sslmode=require`) dans les variables du service. C'est LA variable de base.
4. **Variables d'environnement** (Web Service → *Environment*) — saisissez-les ici :
   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | (auto via le lien — **ne pas la recopier à la main**) |
   | `SESSION_SECRET` | **obligatoire** : `openssl rand -hex 32` (ou 64 hex aléatoires) |
   | `MODERATOR_PASSCODE` | **obligatoire** : votre code modérateur (jamais `2026`) |
   | `HERMES_PROVIDER` | `auto` (défaut) — Hermes bascule entre vos fournisseurs IA |
   | `GEMINI_API_KEY` | optionnel — clé Google AI Studio gratuite |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | optionnel — sans Stripe, posez `DEMO_CHECKOUT=1` |
5. **Déployer** — *Deploy branch* (première fois : *Create Web Service* lance le build).
   Vérifiez dans les logs : `Server listening on port` + `postgres connecté`.
   Le SSL est forcé automatiquement sur un hôte `*.render.com` (`db.ts`).

**Après chaque push** : le service se redéploie seul (branch auto-deploy). Pour
ajouter un fournisseur IA au pool Hermes au runtime, pas de redéploiement :
parlez à Hermes (« ajoute Groq au pool ») ou `POST /api/hermes/providers`.

<details>
<summary>Repli : variables de base individuelles (sans lien)</summary>

`db.ts` accepte aussi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
`DB_SSL` (repli `SQL_*`) — ex. `postgresql://user:pass@host:5432/db?sslmode=require`
dans `DATABASE_URL`, ou les champs séparés. Format générique, aucune valeur
Render n'est fournie ici.
</details>

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
| `tools.ts` | **47 skills réelles** : catalogue, pricing, contenu/SEO, canaux, ventes agrégées (sans PII), système, **internet**, **gestion du pool de fournisseurs IA**, **repos GitHub** (`repos_list`/`repos_get`/`repos_harvest` — veille live + harvest de la plateforme), **référentiels locaux** (`reference_repos`), **liens** (`platform_links` + contrôle de santé), **vue globale** (`platform_overview`) |
| `agents.ts` | **10 agents** : orchestrateur + 9 spécialistes (dont l'**Agent Internet** `web_explorer`) |
| `engine.ts` | Boucle plan → outil → observation, confirmation des actions sensibles (actionId), journal d'audit, mémoire, **contexte plateforme enrichi** (repos, liens, auto-pilot, autonomie) |
| `autonomy.ts` | **Autonomie serveur** : cycle planifié (observation → plan → actions SÛRES → rapport), journal en base, planificateur (intervalle 5-240 min), repli déterministe sans LLM (zéro simulation) |
| `index.ts` | Router `/api/hermes` : `status`, `agents`, `skills`, `chat`, `confirm`, `autonomous-loop`, **`autonomy` (GET/POST), `autonomy/run`, `autonomy/log`**, `config`, `activity`, **`providers` (GET/POST/DELETE/:name/test)** |
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

### Repos GitHub, liens & référentiels — Hermes « voit » la plateforme

Les actifs créés dans l'UI sont désormais **visibles et actionnables** par Hermes :

- **Repos GitHub** (`repos_list`, `repos_get`, `repos_harvest`) — le harvest de l'écran
  « Moteur GitHub » (`df_github_repositories`, synchro client→serveur) est lisible par
  Hermes (repos notés 0-100 avec angle de monétisation + type de produit suggéré), et
  `repos_harvest` fait une **veille GitHub live côté serveur** (API publique sans clé,
  60 req/h, cache 30 min/requête) qui ajoute les repos au harvest : l'usine à produits
  peut être alimentée en continu par le cycle autonome.
- **Référentiels locaux** (`reference_repos`) — lit les submodules `references/*`
  (OBLITERATUS, awesome-free-llm-apis, awesome-llm-apps) : état + README, liste des
  fichiers, lecture de fichiers texte (< 200 Ko, anti-traversée de chemin) et recherche
  textuelle. Submodules vides → état « non initialisés » honnête (cf. Build Command Render).
- **Liens de la plateforme** (`platform_links`) — inventaire : liens d'accès produits
  (`PUBLIC_URL/?product=`), `sitemap.xml`, `feed.xml`, `llms.txt`, destinations des canaux
  **masquées**, liens tracking des kits affiliés ; `check=true` teste la santé des liens
  principaux (HEAD, 404/redirections).
- **Vue globale** (`platform_overview`) — boutique, canaux, repos, liens, auto-pilot
  client, autonomie : le point de départ de toute demande transversale.

### Autonomie serveur (« autonomie sûre »)

Hermes tourne **sur le serveur** (même si le navigateur est fermé) : un planificateur
lance un cycle tous les N minutes (défaut 30, bornes 5-240) :

1. **Observation** — skills réelles (`platform_overview`, `metrics_summary`, `audit_system`,
   `repos_list`, `platform_links` + contrôle de santé périodique) ;
2. **Plan → actions** — avec un LLM du pool : l'orchestrateur décide et exécute **≤2
   actions sûres** (veille, création de **brouillons** produit/contenu/bundle/opportunité,
   contrôles) ; sans LLM : cycle **déterministe sur données réelles** (zéro simulation) ;
3. **Rapport** — journal en base (`df_hermes_autonomy_log`, 20 derniers) + entrée d'audit
   + affichage dans le widget (onglet *Autonomie Server* : on/off, fréquence, dernier
   cycle, journal, « Déclencher un cycle maintenant »).

**Périmètre sûr** : jamais de re-pricing, publication, suppression, diffusion canaux,
`kv_set` ou modification de code en autonomie — ces actions exigent le flux de
confirmation utilisateur dans le chat. Config : `GET/POST /api/hermes/autonomy`,
`POST /api/hermes/autonomy/run`, `GET /api/hermes/autonomy/log` (auth).

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
node scripts/verify-diagnostics.mjs --base http://127.0.0.1:3211 --passcode <code>
```

⚠️ Les rate-limiters (IA 6/min, webhooks 10/min, crypto 10/5 min, auth 10/10 min) sont
en mémoire : **les deux suites gèrent elles-mêmes les pauses sur 429** (attente de la fin
de fenêtre + un essai), donc elles restent rejouables à la suite. Pour un enchaînement
rapide, redémarrez le serveur entre les deux suites (les compteurs sont remis à zéro).

## 🩺 Docteur de code — « Stripe ne marche pas »

Une classe de bug récurrente : un écran appelle l'API **sans les bons droits** (endpoint
`requireAuth` appelé sans `Authorization` → 401) ou **écrit une clé protégée** via
`/api/store` (→ 403), et comme la réponse n'était pas vérifiée, l'UI affichait un succès.
Le docteur de code (`hermes/diagnostics.ts`) rend ça détectable et corrigeable à chaud :

| Skill / endpoint | Rôle |
|---|---|
| `code_scan` · `GET /api/diagnostics/scan` | Analyse les `fetch('/api/…')` du client : 401 garanti, 403 garanti, réponse jamais vérifiée, endpoint hors contrat |
| `stripe_doctor` · `GET /api/diagnostics/stripe` | État réel de la config Stripe : source/format de clé (une clé `pk_…` est refusée), cohérence mode live/test, webhook, devise, mode démo, prix, **et joignabilité de `api.stripe.com` depuis le serveur** (egress/DNS) — **jamais de secret en clair** |
| `code_fix` · `POST /api/diagnostics/fix` | Applique le correctif (en-tête `Authorization` + import, garde `res.ok`), **confirmation obligatoire**, fichier original sauvegardé dans `.dig-doctor/` |

Dans le chat Hermes : *« Les fonctions Stripe ne fonctionnent pas, diagnostique »* →
l'agent `code_doctor` enchaîne `stripe_doctor` / `code_scan`, puis propose `code_fix`.
Le contrat (`API_CONTRACT`) est comparé aux routes réelles de `server.ts` par
`verify-diagnostics.mjs` : il ne peut pas dériver silencieusement.

> Un correctif de code n'est actif qu'après `npm run build` (ou redéploiement).
