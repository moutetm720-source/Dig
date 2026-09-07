# Digital Product Factory (Dig)

Application full-stack de création et de vente de **produits digitaux** (kits, templates, guides, packs de prompts) :
back-office React, moteur d'agent **Hermes v5** côté serveur, paiements Stripe + crypto (vérification on-chain),
**100 % réel** (aucune IA simulée, aucun paiement fictif, aucune donnée inventée),
et une sécurité durcie (voir [`AUDIT_SECURITE.md`](AUDIT_SECURITE.md)).

## Stack

- **Serveur** : Node.js + Express (TypeScript, `tsx`), PostgreSQL (drizzle-orm, key-value store), `server.ts`
- **Client** : React 18 + Vite + Tailwind (`src/`)
- **IA** : moteur d'agent Hermes (`hermes/`) — boucle tool-calling réelle, **pool multi-fournisseurs avec bascule automatique** (anti rate-limit), gestionnaire d'API & tokens pilotable par Hermes, **docteur de code** (`code_doctor`) qui détecte et corrige les erreurs d'intégration client ↔ API, **autonomie serveur** (cycles planifiés, actions sûres, journal) et skills **repos GitHub / liens / référentiels locaux**
- **Tests** : `scripts/verify-security.mjs` (43 tests), `scripts/verify-hermes.mjs` (82 tests — fournisseur IA **réel** requis, les tests d'interprétation sont ignorés si aucun n'est configuré), `scripts/verify-diagnostics.mjs` (40 tests — docteur de code), `scripts/verify-providers.mjs` (8 tests — transport fournisseurs : repli de modèle Gemini, erreurs réseau, clés du pool), `scripts/verify-capabilities.mjs` (9 tests — capacités « agent évolutif » : implantation de code, clone GitHub live, mémoire, skills custom webhook)

## Mode « 100 % réel »

Trois règles, sans exception ni repli silencieux :

1. **IA réelle uniquement** — le fournisseur `mock` (ancien mode TEST) a été **supprimé du
   moteur**. Hermes utilise Gemini, un endpoint compatible OpenAI (Ollama, Groq,
   OpenRouter…) ou n'importe quel fournisseur **réel** du pool, avec bascule automatique
   (429/erreur → cooldown → suivant). `HERMES_PROVIDER=mock` (env ou base) est refusé avec
   un avertissement et `auto` s'applique ; `POST /api/hermes/config {provider:"mock"}` → 400 ;
   un fournisseur `kind: "mock"` ne peut plus être ajouté au pool. Sans aucun fournisseur
   réel, Hermes l'annonce et exécute ses skills sur **données réelles** — il ne simule aucun
   langage.
2. **Paiement réel uniquement** — `DEMO_CHECKOUT` et `/api/checkout/demo-complete`
   (livraison sans encaissement) ont été **supprimés** (410 Gone). Une commande n'est
   livrée que sur paiement vérifié (webhook Stripe signé ou contrôle on-chain). Sans clé
   Stripe : checkout indisponible, aucune commande créée.
3. **Données réelles uniquement** — plus aucun chiffre inventé : ventes, conversions, vues,
   clics, abonnés, tendances de marché, volumes de mots-clés, backlinks « live »… ne sont
   plus générés aléatoirement (`DIG_REAL_DATA_ONLY=1` par défaut). Les compteurs restent à
   0 (« non mesuré ») jusqu'au branchement d'une vraie source (API plateforme, Search
   Console, Stripe, marché). Les données de démo historiques ont été purgées des seeds et
   l'ancien mode démo est détectable par la skill `data_reality_audit` (purge :
   `data_purge_demo`, confirmation requise).

Au démarrage, le serveur affiche un bandeau : IA réelle / passerelle de paiement / politique
de données.

## Hermes : espace agent interactif

La console **Hermes Agent IA** et sa fenêtre flottante partagent désormais le même chat :

- **Suivi en direct (SSE)** : connexion au fournisseur, points d'étape, outil en cours,
  résultat, durée et spécialiste responsable. Les détails sont dépliables. Il s'agit
  d'événements réellement reçus, pas d'une animation simulée ni de raisonnement privé.
  La réponse LLM arrive par message, **pas token par token**.
- **Dialogue à choix** : la skill `ask_user` affiche 2–4 réponses et une saisie libre
  facultative. L'exécution s'arrête jusqu'à votre réponse.
- **Consentement serveur** : prix, publication, suppression, diffusion, configuration
  et installation sensibles passent par les boutons de confirmation. Un `confirm:true`
  produit par le modèle est ignoré. Une autorisation est liée à la session, valable
  10 minutes et consommable une seule fois. Le refus la révoque vraiment côté serveur.
- **Sous-agents** : étapes et confirmations remontent dans la conversation principale ;
  périmètre et budgets partagés, délégation récursive interdite.
- **Arrêt et reprise** : Arrêter empêche de nouvelles étapes, mais ne revient pas sur une
  écriture déjà engagée. En cas de résultat incertain, vérifiez le journal avant de
  poursuivre. Une déconnexion n'est jamais affichée comme un succès.
- **Markdown sûr**, tableaux, blocs de code copiables, téléchargement d'une réponse ou
  de la discussion. Les 60 derniers messages sont conservés **dans ce navigateur**
  (`hermes:conversation:v1`, hors synchronisation du store public). Un rechargement
  ne rejoue jamais automatiquement une action. Les anciens messages v4 ne sont pas migrés.
- **Registres réels** : les agents et compétences viennent du serveur, plus de compteur
  « 47 » figé ni de sélecteur d'agent ignoré.
- **Audit sans IA / Mes chiffres réels** : diagnostics déterministes accessibles même
  sans fournisseur disponible. Les montants Hermes proviennent des commandes du registre
  de paiement protégé, avec confirmation Stripe **live** ou crypto, pas des compteurs UI.
  Ils sont bruts, bornés à l'historique conservé, sans conversion entre devises ni
  déduction des frais/remboursements ; ce n'est pas un solde bancaire.

### Gratuité : une politique, pas une promesse illimitée

`HERMES_FREE_ONLY=1` est le défaut. Le chat et l'autonomie utilisent uniquement :

1. un endpoint **local explicitement déclaré** (modèle réellement local requis) ;
2. les modèles OpenRouter `:free` / `openrouter/free` ;
3. les endpoints anonymes connus sans clé, si leur repli est activé.

Les fournisseurs à facturation inconnue sont **exclus avant l'appel**, y compris si
leur nom contient « free ». Une clé Gemini/Groq/autre peut appartenir à un compte
facturable : elle ne suffit donc pas à autoriser un appel en mode strict. Il n'y a
**aucun repli payant** en cas de quota épuisé. Les tests de connexion suivent aussi
cette politique. L'onglet **Coûts** montre les fournisseurs autorisés et bloqués.

`HERMES_ANONYMOUS_FALLBACK=0` désactive l'ajout automatique des services anonymes ;
utilisez `HERMES_PROVIDER=openai` avec un endpoint local pour rester sur votre serveur.
Un fournisseur distant reçoit le contexte envoyé : n'y collez pas de secrets.
Un administrateur peut déverrouiller les appels non gratuits avec
`HERMES_FREE_ONLY=0` **et** `freeOnly:false` dans une requête API ; l'interface, elle,
continue d'envoyer `freeOnly:true`.

L'interface n'ajoute aucun abonnement, mais **les quotas, l'hébergement, les ressources
locales et les frais de paiement restent distincts**. L'autonomie est désactivée par
défaut pour une nouvelle installation (une préférence existante est conservée).
Aucun objectif de chiffre d'affaires, notamment 10 000 € dans la journée, n'est garanti.
Le mode gratuit bloque aussi la création d'une campagne avec un budget positif.

### Contrat et vérifications

- `POST /api/hermes/chat` : `{ prompt, agentId, history, stream: true, freeOnly: true }`.
  `agent` et la réponse JSON restent compatibles. Une seule exécution active par session.
- `POST /api/hermes/chat/stop` : `{ runId }` (même session).
- `POST /api/hermes/confirm` : `{ actionId, decision: "approve" | "refuse" }`.
- `POST /api/hermes/inspect` : `{ tool: "audit_system" | "metrics_summary" | "platform_overview" }`.
- Contrat partagé : `src/types/hermes.ts`. Flux : `run_started`, `status`, `step`,
  `message`, `question`, `confirmation`, `done`, `error` ; heartbeat de 15 s.
- Budgets : 6 pas principaux, 3 par sous-agent, 12 tours LLM partagés et 10 outils au total
  (jusqu’à 8 fournisseurs essayés par tour en cas d’échec, chacun avec sa cascade de modèles — jusqu’à 6 —, le tout dans le même appel), durée de requête plafonnée à 4 minutes. Le dernier pas est réservé à la synthèse.
- Les confirmations en attente et exécutions sont en mémoire : un redémarrage les
  invalide. En multi-instance, prévoir un stockage partagé avant de répartir ces routes.

```bash
npm run lint
npm run build
npm run test:hermes       # transport + moteur, PostgreSQL éphémère isolé, aucun cloud
# Tests navigateur : démarrer npm run dev dans un autre terminal
npx playwright install chromium
npm run test:hermes:ui    # fixtures UI locales ; jamais de vente ou d'IA simulée dans le produit
```

La correction couvre notamment les réponses vides et les signatures Gemini portées
sur le même `Part` que l'appel d'outil (auparavant ignoré). Les tests utilisent des
fixtures de transport clairement isolées ; ils ne garantissent pas la disponibilité
ni la qualité des fournisseurs externes.

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
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | **requis pour encaisser** — sans Stripe, le checkout est indisponible (le mode démo a été supprimé) |
   | `DIG_REAL_DATA_ONLY` | `1` (défaut) — aucune métrique inventée ; `0` réactive les générateurs simulés (**jamais en prod**) |
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
| `HERMES_PROVIDER` | `auto` (défaut) \| `gemini` \| `openai` — **fournisseurs réels uniquement** (`mock` supprimé) |
| `GEMINI_API_KEY` | Clé Google AI Studio (gratuit) — source **env uniquement**, jamais en base |
| `HERMES_GEMINI_MODEL` | Modèle Gemini (défaut `gemini-3.5-flash-lite`). ⚠️ `gemini-2.5-flash` est **déprécié pour les nouvelles clés API** (404 « no longer available to new users », arrêt officiel 20/10/2026) — sur ce 404, Hermes **bascule automatiquement** sur un modèle disponible (`GEMINI_MODEL_FALLBACKS`, `hermes/providers.ts`) |
| `HERMES_OPENAI_BASE_URL` / `_MODEL` / `_API_KEY` | Endpoint compatible OpenAI : **IA locale** (`http://127.0.0.1:11434/v1` — installation guidée : `node scripts/setup-local-llm.mjs`), Groq, OpenRouter… |

Sans fournisseur réel : le serveur reste **honnête** (`status: offline`,
`providerReason` explicite + métriques réelles issues des skills) — les skills exécutent
toujours les actions réelles, l'interprétation libre est simplement indisponible. Aucune
réponse n'est simulée.

#### IA 100 % locale (aucune clé cloud) — `scripts/setup-local-llm.mjs`

```bash
node scripts/setup-local-llm.mjs            # Ollama + qwen2.5:1.5b (tools OK, ~1 Go)
node scripts/setup-local-llm.mjs --check    # diagnostic (rien n'est modifié)
node scripts/setup-local-llm.mjs --engine llama-cpp   # secours : llama-server + GGUF
```

Installe et démarre un moteur LLM **réel et local** (endpoint compatible OpenAI),
télécharge un modèle qui supporte le *function calling*, vérifie le tool-calling
par un appel réel, puis affiche les lignes `.env` exactes (`HERMES_OPENAI_BASE_URL`
etc.). Hermes fonctionne ainsi même sans `GEMINI_API_KEY` — et le pool bascule
automatiquement cloud → local en cas d'erreur.

#### Capacités « agent intelligent, apprenant, évolutif » (vérifiées par `scripts/verify-capabilities.mjs`)

| Capacité | Skills | Réel comment ? |
|---|---|---|
| **Implanter du code** | `code_read`, `code_write` | Lecture/écriture RÉELLE de fichiers projet (src/, hermes/, scripts/, public/ — périmètre + extensions contrôlés, secrets `.env*` refusés, backup automatique dans `.dig-doctor/backups/`, **confirmation obligatoire**, puis `npm run lint`/`build`) |
| **Recherche internet** | `web_search`, `web_fetch`, `web_link_check` | DuckDuckGo SANS clé (repli automatique html → lite), lecture de pages (https, anti-SSRF), contrôle de liens |
| **Télécharger des skills** | `skills_custom_list/install/remove` | Skills **webhook** installés À CHAUD (KV `df_hermes_custom_skills`) : spec JSON inline ou servie par URL — GET (lecture) ou POST (confirmation), endpoint https public ou localhost déclaré ; rejoués au démarrage, visibles de tous les agents immédiatement |
| **Implanter des repos** | `repo_clone`, `repo_files`, `repo_remove` | `git clone --depth 1` RÉEL d'un repo GitHub public dans `references/_clones/` (25 max, gitignoré), puis liste / lecture / grep de ses fichiers |
| **Apprendre / se souvenir** | `memory_search` (+ injection auto) | Les 50 derniers échanges (KV `df_hermes_memories`) sont **rappelés automatiquement** dans le prompt système et **consultables** par recherche plein-texte |
| **Multi-agents & autonomie** | `list_agents`, `dispatch_agent`, cycles planifiés | Orchestrateur + 9 spécialistes, sous-agents budgétés, cycles autonomes en lecture/brouillons uniquement (skills custom exclus du périmètre d'autonomie) |

Sécurité : toutes les écritures destructives passent par la **porte de confirmation** (`actionId` → `POST /api/hermes/confirm` ; le modèle ne peut pas se confirmer lui-même), la garde anti-SSRF s'applique à tout appel sortant (y compris webhooks des skills custom), et aucun secret n'est jamais exposé en clair.

#### Dépannage : « Tous les fournisseurs IA réels sont indisponibles »

- `gemini-env (… 404 … no longer available)` : modèle déprécié pour votre clé.
  Corrigé automatiquement par la chaîne de repli ; pour figer un modèle à jour :
  `HERMES_GEMINI_MODEL=gemini-3.5-flash-lite` (ou `POST /api/hermes/config`).
- `openai-env (fetch failed)` : l'endpoint compatible OpenAI ne répond pas —
  l'erreur affiche désormais l'URL exacte et la cause (`ECONNREFUSED`…).
  Pour l'IA locale : `node scripts/setup-local-llm.mjs --check`.
- `openai-env (ECONNREFUSED 127.0.0.1:11434)` : Ollama local non démarré. Le pool
  peut essayer les endpoints anonymes autorisés en mode `auto` (si ce repli est activé).
  Ils restent soumis à leur disponibilité et leurs quotas. Voir `GET /api/hermes/free-catalog`.
- `openrouter-free (Cascade épuisée … : google/gemma-4-31b-it:free: HTTP 404 No endpoints found | …)` :
  les 4 modèles gratuits ont échoué dans le même appel. Chaque modèle cité indique sa cause
  (404 = retiré du catalogue `:free`, en cooldown 10 min ; 429 = quota minute ; 5xx = panne).
  Remède : attendre, ou changer la cascade via `HERMES_OPENROUTER_FREE_MODELS`
  (liste vivante : https://openrouter.ai/models?max_price=0&supported_parameters=tools).
- `openrouter-free (HTTP 429 … free-models-per-day)` : quota **journalier** de la clé
  (50 req/jour ; 1000/jour avec 10 $ de crédits achetés une fois). La cascade s'arrête
  volontairement — changer de modèle ne contourne pas une limite de clé — et le
  fournisseur suivant est essayé.

#### Catalogue de fournisseurs avec offres gratuites

Hermes intègre un **catalogue de fournisseurs avec offres gratuites** (sans simulation mock), distinct du pool autorisé par la politique de coût :

- **OpenRouter `:free`** (`openrouter-free`, recommandé) : **cascade de 4 modèles gratuits
  avec function calling**, essayés automatiquement l'un après l'autre **au sein d'un même
  appel** : `google/gemma-4-31b-it:free` → `openai/gpt-oss-120b:free` →
  `qwen/qwen3-next-80b-a3b-instruct:free` → `openrouter/free` (routeur gratuit ; le
  modèle réellement servi est affiché dans la réponse). Clé gratuite sans CB :
  `OPENROUTER_API_KEY`. Quota : 20 req/min, 50 req/jour. Cascade modifiable :
  `HERMES_OPENROUTER_FREE_MODELS=a:free,b:free,…` (les modèles payants sont ignorés).
- **Anonymes optionnels** : `ovh-free` (cascade `gpt-oss-20b` → `gpt-oss-120b` → `Qwen3-32B`
  → `Llama-3.3-70B` → `Mistral-Small-3.2`, 2 req/min par IP et par modèle), `llm7-free` —
  sans clé ; disponibilité et limites à vérifier, aucune réponse garantie.
- **Free tier avec clé gratuite (sans CB)** : Groq, Mistral, Cohere, HuggingFace, Together,
  NVIDIA NIM — chacun avec sa cascade de modèles ; **bloqués** par la politique « sans API
  payante » (facturation inconnue), utilisables seulement avec `HERMES_FREE_ONLY=0`.

Catalogue : `GET /api/hermes/free-catalog` (total, configuredEnv, anonymousAlwaysOn, openRouterCascade, howTo) ou skill `free_catalog`.
Installation dans le pool KV : `POST /api/hermes/free-install/:id { apiKey?, model?, models? }` ou skill `free_install` (confirmation serveur dans le chat).
Les clés d'environnement (`OPENROUTER_API_KEY`, `GROQ_API_KEY`) sont lues directement par `buildPool()` : rien n'est recopié en base.
Voir `hermes/freeProviders.ts` et `hermes/knowledge/free-llm-apis.json` (16 providers / 118 modèles curés).


### Gestionnaire d'API & tokens — pool multi-fournisseurs

Hermes ne dépend plus d'un seul fournisseur. Un **pool** mélange, par priorité :

1. les fournisseurs de l'environnement (`GEMINI_API_KEY`, `HERMES_OPENAI_BASE_URL`),
2. les fournisseurs **ajoutés au runtime** (base clé-valeur protégée `df_hermes_provider_pool`).

Le pool ne contient que des fournisseurs **réels** : l'ancien filet « mock » a été retiré
(les specs mock encore présentes en base sont purgées automatiquement au chargement).

La bascule automatique se fait à **deux niveaux, dans un même appel** :

1. **Cascade de modèles** au sein d'un fournisseur compatible OpenAI (`model` + `fallbackModels`,
   6 max) : `404`/« No endpoints found » (modèle retiré du catalogue → cooldown 10 min sur ce
   modèle), `429` (→ 30 s ou `Retry-After`), `5xx`/timeout (→ 15 s) et réponse vide font passer
   **au modèle suivant immédiatement**. Les modèles en cooldown passent en fin de file (zéro
   requête gaspillée au tour suivant). Une erreur qui ne dépend pas du modèle — `401`, requête
   invalide, JSON d'outil corrompu, limite **journalière** de la clé — arrête la cascade.
2. **Fournisseur suivant** : quand un fournisseur a épuisé sa cascade (ou renvoie 429/5xx), il
   passe en **cooldown** (30 s sur rate-limit — ou `Retry-After` — ; 15 s sur erreur) et le
   suivant autorisé est essayé.

Seuls les fournisseurs autorisés par la politique de coût sont essayés (pour OpenRouter : **tous**
les modèles de la cascade doivent être `:free` ou `openrouter/free`). Si tout échoue, un échec
explicite listant chaque modèle et sa cause remplace tout faux succès. La réponse porte le
modèle qui a **réellement** répondu (`model`), y compris derrière le routeur `openrouter/free`.

Sémantique de `HERMES_PROVIDER` : `auto` = env + pool géré · `gemini`/`openai` = verrou
exclusif sur ce type · `mock` = **refusé** (avertissement + repli `auto`).

**Hermes gère le pool lui-même** (4 skills : `providers_list`, `providers_add`
(avec `fallbackModels`), `providers_remove`, `providers_test` — agent Ops + orchestrateur) :
« ajoute Groq au pool », « liste les fournisseurs » (cascade et cooldown par modèle),
« supprime le fournisseur X » — sans redéploiement.
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
| `providers.ts` | Gemini (`@google/genai`), compatible OpenAI (fetch natif), sans fournisseur mock — **pool multi-fournisseurs + bascule automatique (cooldowns 429/erreur) + gestionnaire de tokens** |
| `tools.ts` | **Registre dynamique de skills réelles** : catalogue, pricing, contenu/SEO, canaux, ventes agrégées (sans PII), système, **internet**, **gestion du pool de fournisseurs IA**, **repos GitHub** (`repos_list`/`repos_get`/`repos_harvest` — veille live + harvest de la plateforme), **référentiels locaux** (`reference_repos`), **liens** (`platform_links` + contrôle de santé), **vue globale** (`platform_overview`) |
| `agents.ts` | **10 agents** : orchestrateur + 9 spécialistes (dont l'**Agent Internet** `web_explorer`) |
| `providerPolicy.ts` | Filtrage conservateur sans API payante (pas de clé cloud réutilisée vers un endpoint anonyme) |
| `salesFacts.ts` | Agrégats de paiements confirmés, tests/démos exclus, devises séparées |
| `engine.ts` | Boucle plan → outil → observation, confirmation des actions sensibles (actionId), journal d'audit, mémoire, **contexte plateforme enrichi** (repos, liens, auto-pilot, autonomie) |
| `autonomy.ts` | **Autonomie serveur** : cycle planifié (observation → plan → actions SÛRES → rapport), journal en base, planificateur (intervalle 5-240 min), repli déterministe sans LLM (zéro simulation) |
| `index.ts` | Router `/api/hermes` : `status`, `agents`, `skills`, `chat` (JSON/SSE), `chat/stop`, `inspect`, `confirm`, `autonomous-loop`, **`autonomy` (GET/POST), `autonomy/run`, `autonomy/log`**, `config`, `activity`, **`providers` (GET/POST/DELETE/:name/test)** |
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

Le LLM **réel** (Gemini/OpenAI-compat) pilote l'agent. **Honnêteté** : si le réseau du serveur
est bloqué, l'échec est signalé — aucun résultat n'est inventé. Sans fournisseur configuré,
Hermes exécute ses skills sur données réelles et le dit (aucune interprétation simulée).

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

# 2. Serveur avec un fournisseur IA RÉEL (le mode mock n'existe plus)
PORT=3211 DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=*** DB_NAME=applet \
  MODERATOR_PASSCODE=*** GEMINI_API_KEY=<votre-clé> \
  node_modules/.bin/tsx server.ts
#   (alternative sans clé : IA locale — node scripts/setup-local-llm.mjs
#    puis HERMES_OPENAI_BASE_URL=http://127.0.0.1:11434/v1
#    HERMES_OPENAI_MODEL=qwen2.5:1.5b HERMES_OPENAI_API_KEY=ollama)
#   Sans fournisseur : la suite tourne quand même, les tests d'interprétation sont SKIPPÉS
#   (jamais validés par une réponse simulée).

# 3. Suites
node scripts/verify-security.mjs --base http://127.0.0.1:3211 --passcode <code> --whsec <secret>
node scripts/verify-hermes.mjs    --base http://127.0.0.1:3211 --passcode <code>
node scripts/verify-diagnostics.mjs --base http://127.0.0.1:3211 --passcode <code>
node_modules/.bin/tsx scripts/verify-providers.mjs   # transport (stubs locaux, sans serveur ni clé)
DB_HOST=127.0.0.1 node_modules/.bin/tsx scripts/verify-capabilities.mjs   # capacités réelles (clone GitHub live si réseau)

# 4. Audit statique du mode « 100 % réel » (aucun serveur requis)
node scripts/verify-real-data.mjs
```

`scripts/verify-real-data.mjs` (30 contrôles) vérifie qu'aucun chemin « test / démo /
simulé » n'est réintroduit : fournisseur mock supprimé, tunnel de démo en 410,
générateurs de données simulés neutralisés (`src/services/realDataPolicy.ts`), seeds sans
événements inventés, aucune métrique métier tirée au hasard.

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
| `stripe_doctor` · `GET /api/diagnostics/stripe` | État réel de la config Stripe : source/format de clé (une clé `pk_…` est refusée), cohérence mode live/test, webhook, devise, absence de mode démo, commandes démo héritées, prix, **et joignabilité de `api.stripe.com` depuis le serveur** (egress/DNS) — **jamais de secret en clair** |
| `data_reality_audit` / `data_purge_demo` | Audit « 100 % réel » : détecte les commandes non réelles (ancien mode démo, sans encaissement) et les purge sur confirmation |
| `code_fix` · `POST /api/diagnostics/fix` | Applique le correctif (en-tête `Authorization` + import, garde `res.ok`), **confirmation obligatoire**, fichier original sauvegardé dans `.dig-doctor/` |

Dans le chat Hermes : *« Les fonctions Stripe ne fonctionnent pas, diagnostique »* →
l'agent `code_doctor` enchaîne `stripe_doctor` / `code_scan`, puis propose `code_fix`.
Le contrat (`API_CONTRACT`) est comparé aux routes réelles de `server.ts` par
`verify-diagnostics.mjs` : il ne peut pas dériver silencieusement.

> Un correctif de code n'est actif qu'après `npm run build` (ou redéploiement).
