# Audit de sécurité — Digital Product Factory (Dig)

**Date** : 2026-09-03 — **Périmètre** : `server.ts`, `src/` (frontend + services), `vite.config.ts`, scripts racine, `public/`, configs.
**Verdict initial** : ⛔ **Critique** — aucune authentification côté serveur ; base (clé Stripe, passcode, tokens, PII) lisible/écrivable par tous ; paiement contournable.

## ✅ ÉTAT : CORRIGÉ (2026-09-03) — failles critiques et hautes traitées et vérifiées

**Preuve** : suite de régression `scripts/verify-security.mjs` → **23/23 tests PASS** (rejouable :
`node scripts/start-test-pg.mjs` puis `PORT=3211 DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=password DB_NAME=applet tsx server.ts` puis
`node scripts/verify-security.mjs --base http://127.0.0.1:3211 --passcode <passcode> --whsec <secret>`).
`tsc --noEmit` OK · `vite build` production OK.

| # | Faille | Correction | Vérifié |
|---|--------|-----------|---------|
| C1 | Fuite de la base `GET /api/store` | `server.ts` : réponse filtrée (`SENSITIVE_READ_KEYS` : clé Stripe, whsec, passcode, tokens sociaux, orders/customers, logs, leads, factures) ; `syncState.ts` : whitelist purgée (plus de secrets/PII synchronisés) | ✅ secrets absents du GET public, catalogue resté lisible |
| C2 | Écriture non auth `POST /api/store` | `requireAuth` (Bearer passcode serveur) sur toutes les écritures ; `SENSITIVE_WRITE_KEYS` rejetées même authentifiées ; passcode = `MODERATOR_PASSCODE` (env) > base > **auto-généré aléatoire** au 1er démarrage (log serveur) | ✅ 401 sans/mal auth · 403 clé PII · passcode auto-généré opérationnel |
| C3 | Paiement contournable | `create-session` : clé serveur uniquement, **prix issus du catalogue serveur**, **code promo résolu côté serveur** (20/50/codes affiliés ≤50), `origin` assaini. `verify-session` : `?sk=` supprimé, **plus de `paid:true` par défaut**. `StorefrontView.tsx` : plus de clé client, **plus de livraison sans validation confirmée**, codes affiliés vérifiés | ✅ `paid:false` sans validation · 149 € même avec `price:1`+`promo:100` |
| C4 | Passcode `2026`/`admin` client-side | `ModeratorAuthModal.tsx` : plus de défauts faibles, **validation du passcode côté serveur** au login ; `App.tsx` : `?passcode=` limité au passcode connu du navigateur | ✅ `2026`/`admin` rejetés |
| C5 | SSRF ouvert | `assertSafeOutbound()` sur les 3 endpoints webhooks : **https uniquement**, résolution DNS préalable, **blocage IP privées/link-local/loopback/metadata**, hosts internes bloqués ; token Telegram : format strict | ✅ 400 sur metadata GCP, 10/8, localhost, token malformé |
| H1 | CORS + header `x-stripe-secret-key` | Header retiré de `Access-Control-Allow-Headers` | ✅ |
| H2 | Proxy Stripe ouvert + oracle `verify-keys` | `app.all('/api/stripe*')` **supprimé** (+ clone dev dans `vite.config.ts`, plugin `backend-proxy` entier retiré) ; `verify-keys` authentifié + rate-limité | ✅ plus de relais vers api.stripe.com |
| H3 | Webhook Stripe non signé | **Vérification `stripe-signature`** (HMAC-SHA256 du raw body, `whsec` env/base, tolérance 300 s, comparaison en temps constant) | ✅ 400 sans/fausse signature · 200 `verified:true` signature valide |
| H4 | DoS de coût Gemini | Rate limit **6 req/min/IP** sur `hermes/chat`, `autonomous-loop`, `agents/synergy` ; clients passent le Bearer | ✅ 429 au 7e appel |
| H5 | Manipulation métier via Hermes (anonyme) | `hermes/chat`, `skills`, `autonomous-loop`, `agents/synergy` **authentifiés** → plus de re-prix d'catalogue / injection par un visiteur | ✅ 401 sans auth |
| H6 | Télémétrie spoofable / DoS | `telemetryLimiter` 60/min/IP + `app.set('trust proxy', 1)` | ✅ |
| H7 | Aucune limite | Body 50 Mo → **5 Mo/1 Mo** ; rate limit global 300/10 min/IP + limiters checkout (30/min) et webhooks (10/min) | ✅ 429 |
| M1 | Clé IndexNow hardcodée | `process.env.INDEXNOW_KEY` (fallback actuel **à faire tourner**) ; `indexnow-submit` authentifié | ✅ |
| M3 | `public/application_backup.tar.gz` | **Supprimée** du repo ⚠️ purger l'historique Git | ✅ |
| M5 | Injection XML sitemap/RSS | `escapeXml()` + `encodeURIComponent` sur id/titres + garde `]]>` | ✅ |
| M7 | `success_url` client contrôlée | `new URL(originUrl).origin` uniquement | ✅ |
| L2 | En-têtes de sécurité | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (production) | ✅ |

### ⚠️ Actions opérationnelles restantes (hors code — prioritaires)
1. **Révoquer/rotater** : clé Stripe `sk` + `whsec` (exposées par l'ancien `GET /api/store`), tokens Telegram/API des canaux, clé Gemini, clé IndexNow, mot de passe DB.
2. **Purger l'historique Git** (`git filter-repo`) : passcode `2026`, proxy Stripe, backup.tar.gz et scripts `fix_*.cjs`/`test-*.js` y restent visibles.
3. **Définir `MODERATOR_PASSCODE` en variable d'env** du déploiement (recommandé) ; sinon le passcode auto-généré (log serveur au 1er démarrage) est utilisé.
4. Période suivante : vraie auth par utilisateur (Supabase Auth / sessions) au lieu du passcode partagé ; commandes créées **côté serveur** par le webhook signé (livraison 100 % serveur) ; vraie confirmation on-chain du paiement crypto ; CSP.

Légende : 🔴 Critique · 🟠 Haute · 🟡 Moyenne · 🔵 Faible

---

## 🔴 CRITIQUE

### C1. Fuite totale de la base de données (clé secrète Stripe, tokens, PII)
- **`server.ts:271`** — `GET /api/store` : **sans aucune authentification**, retourne **toutes** les lignes de `keyValueStore` (`res.json(allKeys)`).
- Ce qui est synchronisé vers cette base publique (`src/services/syncState.ts:5-63`, whitelist) :
  - `df_stripe_sk` → **la clé secrète Stripe (`sk_live_…`/`sk_test_…`) du commerçant** ;
  - `df_stripe_whsec` (secret de signature webhook), `df_stripe_pk` ;
  - `df_moderator_passcode` → **le "code secret" d'admin est lui-même stocké en base publique** ;
  - `df_social_integrations_v1` → `botToken`, `accessToken`, `apiKey`, `webhookUrl` (Telegram, X, Meta, TikTok…) — voir `src/services/socialIntegrationsService.ts:29-34` ;
  - `dpf_app_v2_orders` + `dpf_app_v2_customers` → **PII : e-mails, noms, adresses postales, montants** (les adresses Stripe sont rattachées aux commandes côté client, `StorefrontView.tsx:347-360`) ;
  - `df_crypto_settings_v1`, `df_token_manager_records`, logs système, etc.
- **Attaque** : `curl https://<site>/api/store` → vol de la clé Stripe → **vide du compte Stripe** (refunds, virements, lecture de toutes les transactions), prise de contrôle des bots Telegram/canaux, vol de PII (RGPD), révélation du passcode.
- **Amplificateur** : `CORS: *` (voir H1) — le vol peut être fait depuis n'importe quel site tiers, même en "no-cors" pour la lecture JSON via `fetch`+`res.text()`.

### C2. Écriture non authentifiée de la base — prise de contrôle totale
- **`server.ts:1591`** — `POST /api/store` : **aucun contrôle d'identité** en production (le "Bearer passcode" envoyé par le client n'est **jamais vérifié** dans `server.ts` ; la seule vérification existe dans le middleware **dev** `vite.config.ts:39-68`, et elle est **bypassable** : si la clé `df_moderator_passcode` n'existe pas en base, `hasPasscode=false` → aucun check ; et le token `'admin'` est accepté).
- **Conséquences concrètes** (n'importe quel visiteur) :
  - Remplacer `df_stripe_sk` par **sa propre clé** → les prochains `create-session` (server.ts:48) créent les sessions de paiement **sur le compte Stripe de l'attaquant** → **les paiements des clients vont à l'attaquant** ;
  - Rediriger les **adresses crypto marchandes** (`df_crypto_settings_v1`, `df_crypto_btc/eth/sol/usdt` — `src/services/cryptoPaymentService.ts:9-12`) vers ses propres wallets ;
  - Réinitialiser `df_moderator_passcode` ; réécrire le catalogue, les prix, les factures, les stats.
- **Attaque** : `curl -X POST -H 'Content-Type: application/json' -d '{"key":"df_stripe_sk","value":"sk_live_…(clé de l'attaquant)"}' https://<site>/api/store`

### C3. Contournement du paiement (produits gratuits / prix arbitraires)
1. **Prix contrôlé par le client** — `server.ts:80` : `discountedPrice = Math.max(100, Math.round(Number(item.price || 47) * (1 - discount/100) * 100))`. Le prix vient de `req.body.items[].price` et `promoDiscount` du body (server.ts:45) : envoyer `price: 47, promoDiscount: 100` → **tous les produits à 1 €**. Aucune référence au catalogue côté serveur.
2. **`verify-session` "paid by default"** — `server.ts:198` : si aucune clé n'est configurée, le serveur répond `{ paid: true, simulated: true }` → le client **délivre le produit**.
3. **Fallback client de confirmation** — `StorefrontView.tsx:372-387` : après 4 échecs de vérification (ou n'importe quelle erreur réseau), **la commande est quand même confirmée** ("Fallback confirmation if webhook lagged"). L'URL `/?success=true&session_id=<quoi que ce soit>` est contrôlée par l'utilisateur → **produit gratuit avec un lien URL**.
4. **Clé Stripe fournie par le client** — `server.ts:48` (`customStripeSk` / header `x-stripe-secret-key`) et `server.ts:187` (`?sk=` en query string) : n'importe quelle clé peut être passée à l'endpoint de vérification.
5. **Crypto sans vérification on-chain** — `cryptoPaymentService.ts:305-328` : le "mempool watcher" **fabrique un hash de transaction aléatoire** ; la "confirmation" est un bouton manuel (`triggerManualInstantConfirmation`). Aucun contrôle réel des fonds. + adresses marchandes modifiables via C2.
6. **Code promo universel** — `StorefrontView.tsx:404` : **tout code de ≥ 4 caractères = −30 %** (le "reconnaissance de code affilié" n'est pas vérifié).
7. **Commandes 100 % client-side** — `store.ts:878-914` : `processCheckout()` crée la commande avec `paymentStatus: 'paid'` instantanément, token de téléchargement aléatoire généré **dans le navigateur** ; les produits sont des fichiers générés côté client (`utils/fileDownloader.ts`) → l'"accès payant" est illusoire.

### C4. "Authentification" admin = passcode client-side `2026` (et `admin`)
- `src/components/auth/ModeratorAuthModal.tsx:24-27` : passcode par défaut `'2026'`, `'admin'` accepté ; vérifié **uniquement dans le JavaScript du navigateur**, stocké dans `localStorage`.
- `src/App.tsx:101-103` : **`?passcode=2026` ou `?token=2026` dans l'URL** = accès modérateur (lien partageable).
- Tout le back-office (catalogue, commandes, IA, intégrations) est du React servi publiquement : **il n'existe aucun secret côté serveur**. La "séance modérateur" est un flag localStorage falsifiable.

### C5. SSRF ouvert (Server-Side Request Forgery)
Trois endpoints font un `fetch()` vers **n'importe quelle URL http(s)** fournie par le client :
- `server.ts:827` — `POST /api/channels/dispatch-webhook` (payload JSON de l'app) ;
- `server.ts:891` — `POST /api/social/verify-connection` (ping de test) ;
- `server.ts:1035` — `POST /api/social/publish-test-post`.
- **Conséquences** (l'app tourne sur Cloud Run — `metadata.json` : `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`) : lecture du **metadata GCP `http://169.254.169.254/...`** (IAM tokens, clés de service), scan du réseau interne (10/8, 172.16/12, 192.168/16), détection d'outils internes. La réponse HTTP (statut) est renvoyée à l'attaquant (`dispatch-webhook` retourne `status`/`statusText`).

---

## 🟠 HAUTE

### H1. CORS `*` sur toute l'API
- `server.ts:19-22` : `Access-Control-Allow-Origin: *` + `Allow-Headers: … Authorization, x-stripe-secret-key …` sur **tous** les endpoints. N'importe quel site web peut dialoguer avec l'API (lecture de `/api/store`, écritures, déclenchement de webhooks) depuis le navigateur d'un visiteur. Sans auth, cela rend l'ensemble de C1/C2 exploitable cross-origin sans effort.

### H2. Proxy Stripe ouvert + oracle de validation de clés
- `server.ts:231` — `app.all('/api/stripe*')` : **relais vers `api.stripe.com`** sur tous les sous-chemins, toutes méthodes, avec le header `Authorization` du client. Serveur = proxy ouvert qui **masque l'IP d'origine** des appels Stripe (détection d'abus Stripe rendue impossible), utilisable par tout le monde (CORS `*`).
- `server.ts:113` — `POST /api/checkout/verify-keys` accepte une clé dans le body/header et renvoie `success`/nom du compte/devise : **oracle de validité de clés Stripe** (permet de valider des clés volées/devinées) + appels Stripe déclenchés à la demande (rate-limit du compte victime).

### H3. Webhook Stripe sans vérification de signature
- `server.ts:38-41` — `POST /api/webhooks/stripe` répond `received: true` **sans vérifier `stripe-signature`/`whsec`** (le secret stocké en base n'est jamais utilisé). Aujourd'hui l'impact est limité (pas de logique métier), mais c'est la porte d'entrée de la **forge de webhook** dès qu'une confirmation de paiement y sera branchée — or le tunnel de livraison dépend de `verify-session` (C3).

### H4. DoS de coût sur l'API Gemini (clé serveur) + clé dans le bundle
- `server.ts:1170` (`/api/hermes/chat`), `server.ts:1504` (`/api/agents/synergy`) : appels Gemini **non authentifiés** avec `GEMINI_API_KEY` serveur → n'importe qui peut **griller les quotas/paier les crédits** sans limite (aucun rate limit).
- `src/services/geminiService.ts:9-10` : `import.meta.env.VITE_GEMINI_API_KEY` est **inliné dans le bundle JS public** → clé exposée (même problème si configurée).

### H5. Manipulation non authentifiée de la logique métier via "Hermes"
- `server.ts:1170-1380` — un prompt anonyme contenant certains mots écrit **directement en base** :
  - "boutique"/"modération"/"prix"/"store" → **re-publie tout le catalogue avec VENTE FLASH -50 %** (prix forcé 29,90 € / barré 59,90 €) ;
  - "obliteratus" → injection d'un produit factice ; "produit"/"créer" (sans clé Gemini) → injection de produit.
- Un visiteur anonyme peut donc **modifier les prix de tout le catalogue** en tapant un mot dans le chat.
- `server.ts:1432` — `POST /api/hermes/skills` : n'importe qui crée des "skills" (code arbitraire) persistés en base publique (pas d'exécution trouvée — pas RCE, mais pollution/l'info).

### H6. Télémétrie spoofable + données exposées + DoS par écriture
- `server.ts:309` — `POST /api/telemetry/visit` **public** : `X-Forwarded-For` lu **sans `trust proxy`** (IP spoofable), pays/ville/device/action fournis par le client, `action: 'purchase'` déclarable librement → **fausses ventes, stats gonflées** ; écriture DB sans limite (DoS).
- `server.ts:533` — `GET /api/telemetry/stats` **public** : expose les visiteurs (IP masquée, ville, device, source, produit consulté).

### H7. Aucune limite de débit ni de taille de requête adaptée
- `server.ts:14-15` : `express.json({ limit: '50mb' })` + **aucun rate limiting** sur aucun endpoint → DoS trivial (parsing 50 Mo, écritures DB, appels Gemini/Stripe/webhooks externes déclenchables en boucle).

---

## 🟡 MOYENNE

### M1. Clé IndexNow hardcodée + publique
- `server.ts:751` : `INDEXNOW_KEY = '8b31a29f4f724dc59371239851493b82'` commitée dans le repo et servie publiquement (`/${INDEXNOW_KEY}.txt`). Quiconque peut soumettre des URLs au nom du domaine (spam d'indexation, pages indésirables indexées).

### M2. Identifiants par défaut dans le code + infos d'infra dans le repo
- `src/db/db.ts:6-11` et `src/db/drizzle.config.ts:9-12` : fallbacks `postgres`/`password` (base accessible sans config = sans mot de passe).
- `.env.example` : `DB_INSTANCE_NAME=ai-studio-aef04b77`, `DB_PROJECT_ID=tangential-hub-1t8c4` (identification d'infra GCP réelle).

### M3. `public/application_backup.tar.gz` — binaire corrompu commité dans le repo
- Archive de 660 Ko **servie publiquement** par `express.static`, corrompue par une passe UTF-8 (moitié des octets `EF BF BD`, non extractable). Si elle contenait un dump de base (noms de fichiers type DB/`.env`), **tout son contenu potentiel est déjà exposé dans l'historique Git**. À supprimer immédiatement + purger l'historique + auditer l'historique des commits.

### M4. Informations d'intégrations dans les seeds
- `src/data/seedData.ts:679-683` : URL Supabase réelle `https://o7x7qgnd3gcv6bny2mih.supabase.co` + `anonKey` tronquée ; IDs de comptes publicitaires (Meta `act_90428120`, pixel `pix_8894102`). Divulgation d'infrastructure.

### M5. Injection XML/Markdown dans sitemap, RSS et llms.txt
- `server.ts` (générateurs dynamiques) : `p.id`, `p.title`, `p.subtitle` **non échappés** dans `<loc>`, `title`, `guid` et Markdown. Combiné à C2 (écriture publique de `dpf_app_v2_products`) → un attaquant insère un produit avec `id: "</loc><loc>http://evil.example"` → **injection dans le sitemap/RSS** (phishing indexé par Google, cassure du XML).

### M6. PII et secrets dans `localStorage` sans CSP
- Tout est en `localStorage` (passcode, clés Stripe, tokens bots, commandes, e-mails) ; **pas de Content-Security-Policy** ni d'en-têtes de sécurité → un simple XSS (ex. via M5/CSS injection ou dépendance) = **compromission totale du profil "modérateur"** sur la machine. Le flag `df_user_role` est aussi falsifiable par n'importe quel JS.

### M7. `success_url`/`cancel_url` contrôlées par le client
- `server.ts:73-74` : `originUrl` du body détermine les URLs de redirection Stripe → un attaquant peut créer des sessions de checkout du commerçant pointant vers ses propres pages (phishing "paiement Stripe" avec `session_id`), et spammer le compte Stripe de la victime avec des sessions falsifiées.

### M8. `verify-keys` / vérification avec clé d'autrui (déjà vu en C3-4)
- Toute clé fournie est utilisée pour des appels `balance`/`account`/`checkout/sessions` au nom du serveur → exécution d'opérations Stripe avec n'importe quelle clé volée (le serveur devient un "executeur" aveugle).

---

## 🔵 FAIBLE / HYGIÈNE

- **L1.** ~25 scripts debug commités (`fix_*.cjs`, `patch*.cjs/js`, `test-*.js`, `query-db.js`, `extract.cjs`) : historique de l'évolution (logique Stripe client-side avec `sk` en localStorage, `sk_test_123`…), surface de confusion et de risque.
- **L2.** Aucun en-tête de sécurité : ni CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (cf. M6).
- **L3.** `Cache-Control: no-store` sur tout (perf), et SPA fallback `app.get('*')` qui sert `index.html` pour n'importe quel chemin.
- **L4.** Token de vérification TikTok commité (`public/tiktok-developers-site-verification.txt`, `index.html`) — public par nature, mais à surveiller au rotation.
- **L5.** `app.all('/api/stripe*')` + `dispatch-webhook` : le serveur peut servir de **relay HTTP ouvert** (abuser des appels sortants de l'infra Cloud Run).
- **L6.** Erreurs remontées brutes au client (`err.message` dans les réponses JSON) → fuite d'infos internes (chemins, détails DB).

---

## Plan de correction (par ordre de priorité)

| # | Action | Failles couvertes |
|---|--------|-------------------|
| 1 | **Purger et révoquer** : `git filter-repo` sur l'historique, rotation **immédiate** de la clé Stripe, du `whsec`, des tokens Telegram/API, du passcode, du mot de passe DB, de la clé IndexNow, de la clé Gemini. | C1, C2, M1, M3, H4 |
| 2 | **Protéger `/api/store`** : supprimer `GET /api/store` (ou auth obligatoire) ; auth réelle sur `POST /api/store` ; **retirer les secrets de la whitelist de sync** (`df_stripe_sk`, `df_stripe_whsec`, `df_moderator_passcode`, `df_social_integrations_v1`, orders/customers) → les secrets ne vivent que dans les **env/Secrets du serveur**. | C1, C2, M6 |
| 3 | **Vraie authentification serveur** : session httpOnly/Secure cookie ou Supabase Auth sur tout le back-office ; supprimer le passcode localStorage, `?passcode=`, `'admin'`. | C4, H5 |
| 4 | **Durcir le paiement** : prix issus du **catalogue serveur** (jamais du body), `verify-session` **uniquement** avec la clé serveur, supprimer `paid:true` par défaut et le fallback client de confirmation, confirmer les commandes **uniquement via webhook Stripe signé** (`constructEvent` avec le `whsec`), supprimer `?sk=`/`customStripeSk`. | C3, H2, H3, M7 |
| 5 | **Anti-SSRF** : allowlist de domaines (`discord.com`, `hooks.slack.com`, `api.telegram.org`, `make.com`…) + refus des IP privées/link-local/metadata (169.254.169.254, 10/8, 172.16/12, 192.168/16, 127/8, ::1). | C5 |
| 6 | **Supprimer le proxy `/api/stripe*`** et la vérification `verify-keys` ouverte (ou auth + allowlist stricte). | H2, L5 |
| 7 | **Rate limiting** (`express-rate-limit`) + `bodyParser limit: '1mb'` + `app.set('trust proxy', 1)` + `helmet`. | H1, H4, H7, M6 |
| 8 | **Gemini** : un seul point d'entrée authentifié et quota par session côté serveur ; supprimer `VITE_GEMINI_API_KEY` du bundle ; limiter les effets de bord des prompts Hermes (jamais d'écriture base sur un prompt anonyme). | H4, H5 |
| 9 | **Nettoyage repo** : supprimer `public/application_backup.tar.gz`, les `fix_*.cjs`/`patch*`/`test-*`, retirer infos GCP de `.env.example`, clés de l'IndexNow du code (→ env). | M2, M3, L1 |
| 10 | **Crypto** : vraie confirmation on-chain (mempool/tx vérifiée via API) ou masquer le paiement crypto ; ne jamais stocker d'adresses marchandes dans une KV publique. | C3-5 |
| 11 | **Sortie** : échapper/sanitizer `p.id`/`p.title` dans sitemap/RSS/llms.txt ; en-têtes CSP. | M5, L2 |

### Preuves d'attaque (reproductibles en local)
```bash
# 1. Vol de la clé Stripe + PII (aucune auth)
curl -s http://localhost:3000/api/store | jq '.[] | select(.key | contains("stripe") or contains("passcode"))'

# 2. Redirection des paiements Stripe vers un compte d'attaquant
curl -s -X POST http://localhost:3000/api/store \
  -H 'Content-Type: application/json' \
  -d '{"key":"df_stripe_sk","value":"sk_live_ATTACKER"}'

# 3. Produit à 1 € (prix contrôlé par le client)
curl -s -X POST http://localhost:3000/api/checkout/create-session \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"productTitle":"Kit Premium","price":999,"quantity":1}],"promoDiscount":100}'

# 4. Produit gratuit (fallback client : charger l'URL suivante dans le navigateur)
#    http://localhost:3000/?success=true&session_id=xyz

# 5. SSRF vers le metadata GCP
curl -s -X POST http://localhost:3000/api/channels/dispatch-webhook \
  -H 'Content-Type: application/json' \
  -d '{"endpointUrl":"http://169.254.169.254/computeMetadata/v1/","platform":"custom"}'

# 6. -50 % sur tout le catalogue (mot-clé dans le chat Hermes)
curl -s -X POST http://localhost:3000/api/hermes/chat \
  -H 'Content-Type: application/json' -d '{"prompt":"optimise la boutique"}'
```

---

# 🛠️ PHASE 2 — Implémentation des renforcements restants (2026-09-03)

Sur instruction (« Continue, améliore, implémente »), les points de l'audit
labeled « période suivante » sont désormais **implémentés et testés** :
commandes 100 % côté serveur, authentification par token de session,
confirmation crypto on-chain réelle, CSP, et nettoyage du repo.

**Statut : 43/43 tests de sécurité PASS** (23 phase 1 + 20 phase 2) —
`node scripts/verify-security.mjs --base http://127.0.0.1:3211 --passcode <code> --whsec <whsec>`.

## P2-1. Commandes 100 % serveur (C3 clos définitivement)

**Avant** : le client calculait le total, choisissait le mode de paiement et
s'auto-accordait la livraison (`?success=true&session_id=x` → `paid:true`
par défaut, tokens de téléchargement générés dans le navigateur).

**Après** — flux serveur :
- `POST /api/checkout/create-session` (3 modes) :
  - `stripe` : la session Stripe est créée **côté serveur** avec les prix du
    catalogue serveur (`totalCents` recalculé — jamais le prix du client) ;
    une commande `PENDING` (`dpf_server_orders_v1`) est enregistrée avec
    l'ID de session Stripe.
  - `demo` (sans Stripe, `DEMO_CHECKOUT=1`) : commande `PENDING` créée côté
    serveur, renvoie `serverOrderId`.
  - `unconfigured` : pas de passerelle, pas de livraison — message explicite.
- `GET /api/checkout/verify-session/:id` : interroge Stripe avec **la clé
  serveur** ; `paid` n'est vrai qu'après validation Stripe **ET** retourne la
  commande serveur (`serverOrder`) avec le `downloadToken` émis par le serveur
  (généré une seule fois, à la confirmation, par le webhook ou le verify).
  Sans `serverOrder` → le client **ne livre rien** (fail-closed, log +
  message support).
- `POST /api/webhooks/stripe` (signature `whsec` validée) : confirme la
  commande PENDING liée à l'ID de session — idempotent, double-livraison
  impossible.
- `POST /api/checkout/demo-complete` : livraison du mode démo **uniquement**
  avec un `serverOrderId` réel (`source: demo`, `status: pending_payment`) ;
  idempotent (409 en replay), `downloadToken` émis par le serveur.
- `GET /api/checkout/config` : expose `stripeConfigured` / `demoEnabled`
  (le client ne devine plus).

**Preuve (tests)** : ID fabriqué → 404 ; sans ID → 400 ; double
`demo-complete` → 409 ; `totalCents` imposé par le serveur (6600 attendu /
reçu) ; token serveur `dl_token_…` uniquement.

## P2-2. Authentification modérateur : tokens de session signés (C4 clos)

Supabase Auth indisponible dans ce runtime → sessions auto-contenues :
- `POST /api/auth/login` {passcode} → token HMAC-SHA256 signé
  (`mod.<payload>.<sig>`, TTL 7 j, `jti` unique), secret = `SESSION_SECRET`
  (env). Comparaison `timingSafeEqual`, limiter 10 req / 10 min.
- `POST /api/auth/logout` → **révocation** du token (liste côté serveur,
  persistée) ; le token est immédiatement mort (testé).
- Passcode serveur **fail-closed** : env `MODERATOR_PASSCODE` s'il est
  défini (s'impose, non modifiable via l'UI), sinon clé `df_moderator_passcode`
  de la base ; **plus de défaut `2026`/`admin`** et plus de création
  aléatoire muette — sans passcode connu, les écritures modérateur sont refusées.
- Client : `src/services/authToken.ts` — `getAuthBearer()` (token de session
  d'abord, passcode local sinon) utilisé par **tous** les appels modérateur
  (hermes, channels, traffic, social, synergy, syncState, Intégrations) ;
  `ModeratorAuthModal` fait un `login` serveur au déblocage et stocke le token
  ; le changement de passcode synchronise le **serveur** (credential pré-rotation).

**Preuve (tests)** : token valide → 200 ; token révoqué → 401 ; passcode
invalide → 401 ; écriture non auth → 401.

## P2-3. Crypto : confirmation ON-CHAIN réelle, fail-safe (C3 crypto)

**Avant** : « mempool » simulé côté client, auto-confirmation locale, montants
calculés par le navigateur.

**Après** :
- `POST /api/checkout/crypto-session` : commande PENDING côté serveur
  (prix catalogue, `merchantAddress` lue de la **base serveur** — l'adresse
  du client est ignorée pour la validation), renvoie `serverOrderId` + taux.
- `POST /api/crypto/verify-transaction` {asset, txHash, expectedAmount,
  serverOrderId} : **seul le serveur confirme** —
  - BTC : `mempool.space` (tx confirmée + sortie vers l'adresse marchande du
    serveur + montant ≥ attendu, en sats) ;
  - ETH : `api.etherscan.io` proxy (tx `to` = adresse marchande + `value` ≥
    attendu en wei + receipt `status 0x1`) ;
  - SOL / USDT : **jamais** de confirmation auto → `manual_review` (txHashs
    enfilés dans `df_crypto_pending_reviews` pour un modérateur) ;
  - toute erreur réseau/API → `error`, **jamais** `confirmed` (fail-safe) ;
  - cache 5 min par (asset, hash), limiter 10 req / 5 min.
- Client : `CryptoCheckoutModal` réécrit — commande serveur → montant exact
  calculé depuis `totalCents`/taux serveur → **vrai QR code** (lib `qrcode`,
  payload URI de paiement) → hash de transaction → vérification serveur →
  re-polling 20 s × 8 si en mempool → livraison **uniquement** sur
  `confirmed` avec `serverOrder`. Les montants « fantômes » et l'auto-
  confirmation locale sont supprimés de `cryptoPaymentService`.

**Preuve (tests)** : hashes malformés → 400 ; BTC inconnu → `verified:false`
(état `error` sans egress / `not_found` en prod) ; SOL → `manual_review` ;
aucun chemin ne produit `verified:true` sans source on-chain.

## P2-4. En-têtes de sécurité (M6)

En `NODE_ENV=production` : `Content-Security-Policy` stricte
(`default-src 'self'`, `script-src 'self'`, `connect-src 'self' https: wss:`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy`. (Inapplicables en dev Vite par
nature — HMR/scripts inline.)

## P2-5. Nettoyage & hygiène (M2/B*)

- **36 scripts one-shot supprimés** à la racine (`fix_*.cjs`, `patch*.js`,
  `test-*.js`, `check_db.cjs/.ts`, `extract.cjs`, `generate_*.cjs`,
  `inspect_db.ts`, `query-db.js`, `seed-db.ts`…) — non référencés, référençant
  de l'infra legacy (sqlite/libsql, bundles dist, clés test en dur).
  Conservés : `server.ts`, `vite.config.ts`, `scripts/` (3 fichiers).
- **`.env.example` réécrit** et documenté : `SESSION_SECRET` (obligatoire en
  prod), `MODERATOR_PASSCODE`, `DEMO_CHECKOUT`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `INDEXNOW_KEY`, `DB_*`
  (avec la précision que `db.ts` ignore `DB_PORT`).
- `seedData.ts` vérifié : `initialOrders` / `initialCustomers` déjà vides —
  aucun PII factice seedé.
- Bug corrigé en cours de route : `express.json()` global enregistré
  **après** les routes auth → body jamais parsé (login 400 permanent) ;
  parser local ajouté sur `/api/auth/login`.
- Deux réponses `downloadToken` renvoyaient l'objet **avant** confirmation
  (token absent) ; correction : utiliser l'objet retourné par
  `markServerOrderPaid` (demo-complete + verify-transaction).

## P3. Moteur HERMES v4 — agent réel avec tool-calling (2026-09-03)

**Constat** : l'ancienne « IA Hermes » était une **simulation par mots-clés**
(`server.ts` : table de correspondance prompt→JSON factice) et le module
**OBLITERATUS** un théâtre de « désalignement » (chiffres d'ablation
inventés, prompts de type jailbreak injectés au LLM, skill et diffusion
sociales « créées » sans exécution, quota Gemini consommé pour du texte
fantaisie). Le client fabriquait aussi des réponses locales
(`generateClientFallbackReply`, étapes « 23 bots actifs », etc.).

**Correction** : le moteur est désormais **réel, côté serveur**, dans `hermes/` :

| Module | Rôle |
|--------|------|
| `hermes/types.ts` | Types + limites (budgets 6 pas / 10 outils, timeouts, tailles) |
| `hermes/providers.ts` | Fournisseurs : **Gemini** (`@google/genai`, clé env), **compatible OpenAI** (Ollama local / Groq / OpenRouter — fetch natif), **mock** (tests uniquement). Sélection : `HERMES_PROVIDER` (env) > KV `df_hermes_config` ; `auto` = gemini→openai→hors-ligne honnête. **Aucun secret en base** (env uniquement) |
| `hermes/tools.ts` | **29 skills** = opérations réelles serveur (catalogue, pricing, contenu/SEO, canaux, ventes agrégées, système). Whitelist de clés KV par skill ; aucune PII ni clé de paiement exposée ; egress https + anti-SSRF (`ssrfGuard.ts`) pour webhooks |
| `hermes/agents.ts` | **8 agents** (orchestrateur + 7 spécialistes) avec sous-sets de skills et budget de pas ; dispatch via `dispatch_agent` |
| `hermes/engine.ts` | Boucle plan→appel d'outil→observation (≤ budget), **confirmation obligatoire** des actions sensibles (actionId, TTL 10 min), journal d'audit `df_hermes_activity` (200), mémoire `df_hermes_memories` (50), résultats d'outils tronqués 4 000 car. |
| `hermes/index.ts` | Router `/api/hermes` : `status`, `agents`, `skills`, `chat`, `confirm`, `autonomous-loop`, `config` (aucun secret renvoyé), `activity` |

**Sécurité appliquée** (vérifiée) :
- `requireAuth` + rate-limit IA (6/min/IP) sur toutes les écritures IA — 401/429 ✅
- Actions destructives (suppression, re-pricing, écriture libre) **bloquées sans confirmation explicite** (actionId) ✅
- **Aucune PII** (e-mails/adresses/noms clients) ni clé de paiement n'atteint le LLM : les skills `orders_*` renvoyent des agrégats uniquement ✅
- **Mode hors-ligne honnête** : sans fournisseur IA, le serveur renvoie un état explicite
  (`provider: 'aucun'` + raison) et les actions outillées continues restent possibles ;
  aucun texte n'est inventé côté serveur **ni côté client** (tous les fallbacks factices supprimés) ✅
- Journal d'audit de chaque action outillée (agent, outil, statut) ✅

**Retrait du module OBLITERATUS** (2026-09-03) :
- `POST /api/obliteratus/ablate` → **410 Gone** avec note de non-recommandation ✅
- `POST /api/agents/synergy` (contrat 401 conservé) → délègue désormais au
  moteur Hermes réel (orchestrateur + skills) au lieu du prompt « débridé » ✅
- Fichiers supprimés : `ObliteratusChatWidget.tsx`, `HermesObliteratusSynergyView.tsx`,
  `obliteratusAgentService.ts` ; vue remplacée par `MultiAgentCenterView.tsx`
  (état réel, grille des 8 agents, exécution réelle) ; `AutonomousAgentView`
  (« Super-Compilation » factice) remplacée par une **consultation réelle**
  des agents Hermes (proposition produit + diagnostic) sans aucune étape inventée.
- Sidebar : « Alliance OBLITERATUS x HERMES » → « Centre Multi-Agents (Hermes v4) ».

### P3.1 — Agent Internet (`web_explorer`) & base gratuite (2026-09-03)

Nouvel agent **Internet** + 4 skills d'interaction web, mêmes garde-fous que le reste :

| Skill | Garantie |
|---|---|
| `web_search` | DuckDuckGo (sans clé) ; URL de recherche **constante** (jamais d'URL utilisateur) ; 15 s ; max 10 résultats |
| `web_fetch` | `assertSafeOutbound` (https, anti-SSRF, DNS préalable), **credentials dans l'URL interdits**, 20 s, body plafonné 1,5 Mo → texte ~4 000 car. |
| `web_link_check` | ≤10 URLs, mêmes gardes, HEAD puis GET si 405/501 |
| `free_tier_lookup` | **Offline** : snapshot curé de free-for.dev (`hermes/knowledge/free-for.json`, 106 services) — aucun appel sortant |

- Aucun credential, aucune destination interne (IP privées, metadata, loopback) — bloqués par
  `ssrfGuard.ts` (vérifié par la suite sécurité, 400 sur 10/8, localhost, metadata GCP).
- En cas de réseau indisponible : l'erreur est renvoyée telle quelle au LLM et affichée en UI
  (**jamais de résultat inventé** — testé : « échec réseau signalé honnêtement »).
- L'agent est en **lecture seule** sur le web (pas de formulaire, pas de compte, pas de PII de
  tiers) — rappelé dans son system prompt.

**Références (submodules, lecture seule)** : `references/OBLITERATUS`
([elder-plinius/OBLITERATUS](https://github.com/elder-plinius/OBLITERATUS) — outil de recherche
d'abliteration de modèles **locaux** Python/GPU ; **non intégré** au runtime, l'ancien module
factice a été retiré — cf. P3) et `references/awesome-llm-apps`
([Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) — catalogue
de 100+ apps/agents LLM ; patterns *search → fetch → synthétiser* repris par `web_explorer`).
Exclus du `tsc`/build, jamais importés.

**Tests** : `scripts/verify-hermes.mjs` (fournisseur mock, base seedée) — **24/24 PASS** :
registres (**33 skills / 9 agents**), 401/400, **re-pricing vérifié en base**,
suppression **bloquée jusqu'à confirmation** puis réellement supprimée,
création réelle (draft), PII absente des réponses, journal d'audit,
**agent internet** (KB offline, `web_fetch` réel, `web_search` honnête sans egress),
cycle autonome (insight réel), synergy 401, ablate 410, 429.
La suite gère elle-même les pauses sur 429 (fenêtre IA 6/min) → rejouable à la suite.

## Risques résiduels acceptés (documentés)

1. **Messages d'erreur** : certains détails d'erreurs Stripe/DB peuvent
   filtrer dans les logs serveur (pas exposés en JSON, sauf `verify-session`
   qui renvoie `err.message` — à durcir si exposé publiquement).
2. **Fenêtre DNS-rebinding** dans le check anti-SSRF (validation du host
   avant résolution ; une rebinding malveillante pourrait en théorie contourner
   — mitigations : allowlist egress au niveau infra, ou proxy égress).
3. **SOL/USDT** : revue manuelle uniquement (pas d'API publique fiable sans
   clé) — les livraisons de ces chaînes attendent un modérateur
   (`df_crypto_pending_reviews`).
4. **`ModeratorAuthModal`** : si le serveur est injoignable au déblocage,
   l'UI se débloque en local (passcode) pour ne pas bloquer le back-office ;
   les écritures serveur restent refusées tant que la credential serveur n'est
   pas validée.
5. **Taux crypto de repli** : si CoinGecko est injoignable, des taux de
   référence (établis au 2026-09) sont utilisés pour l'affichage — la
   **validation** du montant reste stricte (le serveur compare les unités de
   base on-chain à l'attendu fourni, calculé depuis le total serveur).
6. **Dépendance ajoutée (exception à la règle « zéro dépendance »)** :
   `qrcode` + `@types/qrcode` (client, QR de paiement réel). Alternative sans
   dépendance : service QR public tiers — refusé (CSP + confidentialité de
   l'URL de paiement).

## Déploiement (rappel)

```bash
export PORT=3211
export DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=*** DB_NAME=applet
export SESSION_SECRET=$(openssl rand -hex 32)   # OBLIGATOIRE en prod
export MODERATOR_PASSCODE=***                    # recommandé (s'impose à l'UI)
export DEMO_CHECKOUT=1                            # seulement SANS Stripe
# export STRIPE_SECRET_KEY=*** STRIPE_WEBHOOK_SECRET=whsec_...
export NODE_ENV=production
npm run build && npm start
```

**Déploiement Render (base Postgres liée)** : `db.ts` lit `DATABASE_URL`
(injectée par Render quand la base est liée au service) ou les variables
`DB_*`. Render **exige le SSL** → l'URL doit contenir `?sslmode=require`
(ou `DB_SSL=require` ; `db.ts` le déduit aussi pour un hôte `*.render.com`).
Les variables d'env du service priment sur `.env` (`dotenv` ne surcharge pas).
`SESSION_SECRET` + `MODERATOR_PASSCODE` doivent être définis dans l'env du service.

## Suite de tests (régression)

- `scripts/start-test-pg.mjs` — Postgres embarqué de test (5432).
- `scripts/verify-security.mjs` — **43 tests** : store KV (9), tunnel paiement
  (2), anti-SSRF (4), webhook signé (3), endpoints modérateur (3), rate-limit
  (1), proxy Stripe (1), **auth token (5)**, **commandes serveur/démo (7)**,
  **crypto on-chain fail-safe (8)**.
- `scripts/verify-hermes.mjs` — **24 tests** du moteur Hermes v4 (fournisseur
  `HERMES_PROVIDER=mock`, base seedée par `start-test-pg.mjs`) : registres
  (33 skills / 9 agents), auth, boucle outil réelle (prix/suppression/création
  vérifiés en base), confirmation des actions sensibles, PII, audit,
  **agent internet** (KB free-for.dev offline, web_fetch réel, web_search
  honnête), cycle autonome, 429. Gère les pauses 429 (fenêtre IA 6/min).
- `npm run build` — bundle production OK (1817 modules).
- `tsc --noEmit` — zéro erreur (serveur + client).
