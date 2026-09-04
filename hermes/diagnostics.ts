/**
 * hermes/diagnostics.ts — DOCTEUR DE CODE (agent « code_doctor »).
 *
 * Pourquoi ce module existe : après le durcissement sécurité (audit C1/C2),
 * plusieurs endpoints sont devenus `requireAuth` et plusieurs clés KV sont
 * devenues protégées. Le client, lui, n'a pas été mis à jour partout : des
 * appels partent SANS en-tête `Authorization` (→ 401 systématique) ou écrivent
 * des clés protégées (→ 403 systématique). Résultat visible : « les fonctions
 * Stripe ne marchent pas » alors que le serveur est sain.
 *
 * Ce module rend cette classe de bug DÉTECTABLE et CORRIGEABLE à chaud :
 *
 *   1. `API_CONTRACT`  — le contrat réel des endpoints (auth requise ou non,
 *      critique ou non). Le test `scripts/verify-diagnostics.mjs` compare ce
 *      registre aux routes réellement déclarées dans `server.ts` : il ne peut
 *      donc pas dériver silencieusement.
 *   2. `scanSources()` — analyse statique des appels `fetch('/api/…')` du
 *      client : 401 garanti (auth manquante), 403 garanti (clé protégée en
 *      lecture/écriture), réponse jamais vérifiée (échec silencieux affiché
 *      comme un succès), endpoint inconnu du contrat.
 *   3. `applyFix()`    — applique les correctifs mécaniques whitelisted
 *      (injection de l'en-tête Authorization + import, garde `res.ok`), avec
 *      sauvegarde préalable du fichier et re-scan de contrôle.
 *   4. `stripeDoctor()`— diagnostic runtime de la configuration Stripe
 *      (source de la clé, format, cohérence mode live/test, devise, webhook,
 *      mode démo, prix) — JAMAIS de secret en clair.
 *
 * Aucune écriture n'est faite sans `confirm: true` (skill destructif).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..');
/** Dossier (dans la racine analysée) où les fichiers originaux sont sauvegardés. */
export const BACKUP_DIRNAME = '.dig-doctor';

// ============================================================
// 1. CONTRAT DES ENDPOINTS (miroir de server.ts — vérifié par test)
// ============================================================

export interface EndpointContract {
  method: 'GET' | 'POST';
  /** Chemin exact, sans query string. `:param` pour les segments dynamiques. */
  path: string;
  /** `requireAuth` côté serveur → un appel sans Bearer reçoit 401. */
  auth: boolean;
  /** Endpoint métier dont l'échec silencieux casse une fonction utilisateur. */
  critical?: boolean;
}

export const API_CONTRACT: EndpointContract[] = [
  { method: 'POST', path: '/api/auth/login', auth: false },
  { method: 'POST', path: '/api/auth/logout', auth: false },
  { method: 'GET', path: '/api/checkout/config', auth: false },
  { method: 'POST', path: '/api/checkout/create-session', auth: false, critical: true },
  { method: 'POST', path: '/api/checkout/demo-complete', auth: false, critical: true },
  { method: 'GET', path: '/api/checkout/verify-session/:sessionId', auth: false, critical: true },
  { method: 'POST', path: '/api/checkout/verify-keys', auth: true, critical: true },
  { method: 'POST', path: '/api/checkout/crypto-session', auth: false, critical: true },
  { method: 'GET', path: '/api/crypto/rates', auth: false },
  { method: 'POST', path: '/api/crypto/verify-transaction', auth: false, critical: true },
  { method: 'POST', path: '/api/webhooks/stripe', auth: false },
  { method: 'GET', path: '/api/store', auth: false },
  { method: 'GET', path: '/api/store/get', auth: true },
  { method: 'POST', path: '/api/store', auth: true, critical: true },
  { method: 'GET', path: '/api/integrations/social', auth: true },
  { method: 'POST', path: '/api/integrations/social', auth: true, critical: true },
  { method: 'POST', path: '/api/social/verify-connection', auth: true, critical: true },
  { method: 'POST', path: '/api/social/publish-test-post', auth: true, critical: true },
  { method: 'POST', path: '/api/channels/dispatch-webhook', auth: true, critical: true },
  { method: 'POST', path: '/api/seo/indexnow-submit', auth: true },
  { method: 'POST', path: '/api/agents/synergy', auth: true },
  { method: 'POST', path: '/api/agency/generate', auth: false },
  { method: 'POST', path: '/api/obliteratus/ablate', auth: false },
  { method: 'GET', path: '/api/telemetry/stats', auth: false },
  { method: 'POST', path: '/api/telemetry/visit', auth: false },
  { method: 'GET', path: '/api/diagnostics/scan', auth: true },
  { method: 'GET', path: '/api/diagnostics/stripe', auth: true },
  { method: 'POST', path: '/api/diagnostics/fix', auth: true, critical: true }
];

/** Clés KV protégées en LECTURE via l'API (miroir de SENSITIVE_READ_KEYS). */
export const PROTECTED_READ_KEYS = [
  'df_stripe_sk', 'df_stripe_whsec', 'df_moderator_passcode', 'df_session_secret',
  'df_social_integrations_v1', 'dpf_app_v2_orders', 'dpf_server_orders_v1',
  'dpf_app_v2_customers', 'dpf_app_v2_systemLogs', 'df_sales_affiliates_real',
  'df_sales_abandoned_carts_real', 'df_sales_b2b_leads_real',
  'df_sales_scout_history_real', 'df_sales_auto_cart_recovery_real',
  'df_social_selling_state_v1', 'df_french_invoices_v1', 'df_crypto_pending_reviews',
  'df_hermes_provider_pool'
];

/** Clés KV dont l'écriture via l'API est refusée, même authentifiée. */
export const PROTECTED_WRITE_KEYS = [
  'df_social_integrations_v1', 'df_session_secret', 'dpf_server_orders_v1',
  'dpf_app_v2_orders', 'dpf_app_v2_customers', 'dpf_app_v2_systemLogs',
  'df_sales_affiliates_real', 'df_sales_abandoned_carts_real',
  'df_sales_b2b_leads_real', 'df_sales_scout_history_real',
  'df_sales_auto_cart_recovery_real', 'df_social_selling_state_v1',
  'df_french_invoices_v1', 'df_crypto_pending_reviews', 'df_hermes_provider_pool'
];

// ============================================================
// 2. ANALYSE STATIQUE
// ============================================================

export type RuleId =
  | 'missing_auth'        // 401 garanti : endpoint requireAuth appelé sans Bearer
  | 'protected_write'     // 403 garanti : écriture d'une clé KV protégée
  | 'protected_read'      // 403 garanti : lecture d'une clé KV protégée
  | 'unchecked_response'  // échec silencieux : réponse jamais inspectée
  | 'unknown_endpoint';   // endpoint absent du contrat (route supprimée ?)

export interface FixDescriptor {
  kind: 'inject_auth_header' | 'guard_response';
  /** Décalage absolu (en caractères) où insérer `insert`. */
  insertAt: number;
  insert: string;
  /** Second point d'insertion (import manquant), appliqué en premier. */
  importInsertAt?: number;
  importInsert?: string;
}

export interface Finding {
  id: string;
  rule: RuleId;
  severity: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  endpoint: string;
  method: string;
  message: string;
  /** Conséquence HTTP attendue côté serveur. */
  httpStatus: number | null;
  fix: FixDescriptor | null;
}

export interface ScanReport {
  scannedFiles: number;
  apiCalls: number;
  findings: Finding[];
  byRule: Record<string, number>;
  root: string;
  generatedAt: string;
}

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listSourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) acc.push(full);
  }
  return acc;
}

/** Extrait le texte d'un appel en suivant les parenthèses (ignore les chaînes). */
function extractCall(src: string, openParen: number): { text: string; end: number } {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openParen; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return { text: src.slice(openParen, i + 1), end: i + 1 };
    }
  }
  return { text: src.slice(openParen), end: src.length };
}

function normalizePath(raw: string): string {
  return raw.split('?')[0].replace(/\$\{[^}]*\}/g, ':param').replace(/\/+$/, '') || '/';
}

function matchContract(method: string, p: string): EndpointContract | undefined {
  return API_CONTRACT.find(c => c.method === method && c.path === p)
    || API_CONTRACT.find(c => c.method === method && c.path.replace(/:[^/]+/g, ':param') === p);
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length;
}

/** ID stable (indépendant des offsets) : permet de rejouer un correctif. */
function findingId(file: string, rule: RuleId, endpoint: string, line: number): string {
  let h = 0;
  const s = `${file}|${rule}|${endpoint}|${line}`;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return `${rule}-${h.toString(36)}`;
}

/** Chemin d'import relatif vers src/services/authToken depuis un fichier donné. */
function authTokenImportPath(fromFile: string, root: string): string {
  const from = path.dirname(fromFile);
  const to = path.join(root, 'src', 'services', 'authToken');
  let rel = path.relative(from, to).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/**
 * Prépare l'insertion de `getAuthBearer` : ajoute le symbole à un import
 * existant, sinon crée la ligne d'import après le dernier import du fichier.
 */
function planAuthImport(src: string, file: string, root: string): { insertAt: number; insert: string } | null {
  if (/getAuthBearer/.test(src)) return null;
  const spec = authTokenImportPath(file, root);
  const existing = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*authToken)['"];?/g;
  let m: RegExpExecArray | null;
  while ((m = existing.exec(src)) !== null) {
    const names = m[1];
    const at = m.index + m[0].indexOf('{') + 1;
    return { insertAt: at, insert: ` getAuthBearer,` + (names.trim() ? '' : '') };
  }
  const imports = [...src.matchAll(/^import\s[^\n]*\n/gm)];
  const at = imports.length > 0 ? (imports[imports.length - 1].index || 0) + imports[imports.length - 1][0].length : 0;
  return { insertAt: at, insert: `import { getAuthBearer } from '${spec}';\n` };
}

/** Le fichier contient-il un `catch` après cet offset (garde `throw` sûre) ? */
function hasCatchAfter(src: string, offset: number): boolean {
  return /\bcatch\b/.test(src.slice(offset, offset + 4000));
}

/**
 * Analyse statique des appels `fetch('/api/…')` d'un dossier de sources.
 * `root` = racine du dépôt (pour les chemins relatifs et les imports).
 */
export function scanSources(targetDir?: string, root: string = REPO_ROOT): ScanReport {
  const dir = targetDir ? path.resolve(root, targetDir) : path.join(root, 'src');
  const files = listSourceFiles(dir);
  const findings: Finding[] = [];
  let apiCalls = 0;

  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    let src = '';
    try { src = fs.readFileSync(file, 'utf-8'); } catch { continue; }

    const re = /fetch\s*\(\s*(['"`])(\/api\/[^'"`]*)\1/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      apiCalls++;
      const urlStart = m.index;
      const rawUrl = m[2];
      const endpoint = normalizePath(rawUrl);
      const openParen = src.indexOf('(', m.index);
      const call = extractCall(src, openParen);
      const method = (/method\s*:\s*['"](\w+)['"]/.exec(call.text)?.[1] || 'GET').toUpperCase();
      const contract = matchContract(method, endpoint);
      const line = lineOf(src, urlStart);

      // ---- R1 : endpoint requireAuth appelé sans credential ----
      if (contract?.auth && !/Authorization|getAuthBearer/.test(call.text)) {
        findings.push({
          id: findingId(rel, 'missing_auth', `${method} ${endpoint}`, line),
          rule: 'missing_auth',
          severity: 'high',
          file: rel,
          line,
          endpoint: `${method} ${endpoint}`,
          method,
          httpStatus: 401,
          message: `Appel sans en-tête Authorization sur un endpoint \`requireAuth\` → 401 systématique (la fonction échoue côté serveur alors que l'UI peut afficher un succès).`,
          fix: planAuthFix(src, call, rel, root)
        });
      }

      // ---- R2 : écriture d'une clé KV protégée (403 même authentifié) ----
      if (method === 'POST') {
        for (const key of PROTECTED_WRITE_KEYS) {
          const asProp = new RegExp(`['"\`]?${key}['"\`]?\\s*:`).test(call.text);
          const asValue = new RegExp(`key\\s*:\\s*['"\`]${key}['"\`]`).test(call.text);
          if ((asProp || asValue) && /\/api\/store/.test(endpoint)) {
            findings.push({
              id: findingId(rel, 'protected_write', `${method} ${endpoint}`, line),
              rule: 'protected_write',
              severity: 'high',
              file: rel,
              line,
              endpoint: `${method} ${endpoint}`,
              method,
              httpStatus: 403,
              message: `Écriture de la clé protégée \`${key}\` via /api/store → 403 systématique (SENSITIVE_WRITE_KEYS). Passer par un endpoint dédié authentifié.`,
              fix: null
            });
            break;
          }
        }
      }

      // ---- R3 : lecture d'une clé KV protégée (403 même authentifié) ----
      for (const key of PROTECTED_READ_KEYS) {
        if (rawUrl.includes(`key=${key}`)) {
          findings.push({
            id: findingId(rel, 'protected_read', `${method} ${endpoint}`, line),
            rule: 'protected_read',
            severity: 'high',
            file: rel,
            line,
            endpoint: `${method} ${endpoint}`,
            method,
            httpStatus: 403,
            message: `Lecture de la clé protégée \`${key}\` via /api/store/get → 403 systématique (SENSITIVE_READ_KEYS). Passer par un endpoint dédié authentifié.`,
            fix: null
          });
          break;
        }
      }

      // ---- R4 : réponse jamais inspectée sur un endpoint critique ----
      if (contract?.critical) {
        const before = src.slice(Math.max(0, urlStart - 160), urlStart);
        const assign = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s*$/.exec(before);
        const after = src.slice(call.end, call.end + 2500);
        const inspected = assign ? new RegExp(`\\b${assign[1]}\\s*\\.\\s*(ok|status)\\b`).test(after) : false;
        // Chaîne .then(...) explicite : la réponse est traitée dans la chaîne.
        const chained = /^\s*\.then\s*\(/.test(src.slice(call.end, call.end + 24));
        if (!inspected && !chained) {
          const canGuard = Boolean(assign) && hasCatchAfter(src, call.end);
          findings.push({
            id: findingId(rel, 'unchecked_response', `${method} ${endpoint}`, line),
            rule: 'unchecked_response',
            severity: 'medium',
            file: rel,
            line,
            endpoint: `${method} ${endpoint}`,
            method,
            httpStatus: null,
            message: assign
              ? `Réponse de ${method} ${endpoint} affectée à \`${assign[1]}\` mais jamais vérifiée (\`${assign[1]}.ok\`) : un 401/403/500 passe pour un succès.`
              : `Réponse de ${method} ${endpoint} jetée (pas de variable) : un échec serveur est invisible, l'UI affiche un succès.`,
            fix: canGuard
              ? {
                  kind: 'guard_response',
                  insertAt: statementEnd(src, call.end),
                  insert: `\n${indentOf(src, urlStart)}if (!${assign![1]}.ok) throw new Error(\`HTTP \${${assign![1]}.status} — ${endpoint}\`);`
                }
              : null
          });
        }
      }

      // ---- R5 : endpoint inconnu du contrat ----
      if (!contract && !endpoint.includes(':param')) {
        findings.push({
          id: findingId(rel, 'unknown_endpoint', `${method} ${endpoint}`, line),
          rule: 'unknown_endpoint',
          severity: 'low',
          file: rel,
          line,
          endpoint: `${method} ${endpoint}`,
          method,
          httpStatus: null,
          message: `Endpoint ${method} ${endpoint} absent du contrat API_CONTRACT (route supprimée ou registre à mettre à jour).`,
          fix: null
        });
      }
    }
  }

  const byRule: Record<string, number> = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;

  return {
    scannedFiles: files.length,
    apiCalls,
    findings,
    byRule,
    root,
    generatedAt: new Date().toISOString()
  };
}

/** Fin de l'instruction (`;`) qui suit l'appel, pour insérer une garde après. */
function statementEnd(src: string, from: number): number {
  const semi = src.indexOf(';', from);
  return semi === -1 ? from : semi + 1;
}

function indentOf(src: string, index: number): string {
  const start = src.lastIndexOf('\n', index) + 1;
  return (/^[ \t]*/.exec(src.slice(start, index))?.[0]) || '';
}

/** Correctif « en-tête Authorization » : insertion dans `headers` + import. */
function planAuthFix(src: string, call: { text: string; end: number }, rel: string, root: string): FixDescriptor | null {
  const absHeader = /headers\s*:\s*\{/.exec(call.text);
  if (!absHeader) {
    // Pas d'objet headers : on en crée un après `method: 'X',` (ou en tête d'objet).
    const meth = /method\s*:\s*['"]\w+['"]\s*,?/.exec(call.text);
    if (!meth) return null;
    const insertAt = call.end - call.text.length + meth.index + meth[0].length;
    const imp = planAuthImport(src, path.join(root, rel), root);
    return {
      kind: 'inject_auth_header',
      insertAt,
      insert: `\n${indentOf(src, insertAt)}headers: { ...(getAuthBearer() ? { Authorization: getAuthBearer() } : {}) },`,
      importInsertAt: imp ? imp.insertAt + (imp.insertAt > insertAt ? 0 : 0) : undefined,
      importInsert: imp?.insert
    };
  }
  const braceAt = call.end - call.text.length + absHeader.index + absHeader[0].length;
  const imp = planAuthImport(src, path.join(root, rel), root);
  return {
    kind: 'inject_auth_header',
    insertAt: braceAt,
    insert: ` ...(getAuthBearer() ? { Authorization: getAuthBearer() } : {}),`,
    importInsertAt: imp?.insertAt,
    importInsert: imp?.insert
  };
}

// ============================================================
// 3. APPLICATION DES CORRECTIFS
// ============================================================

export interface FixResult {
  applied: boolean;
  file?: string;
  line?: number;
  rule?: string;
  backup?: string;
  before?: string;
  after?: string;
  remainingFindings?: number;
  reason?: string;
}

const MAX_FIX_FILES = 50;

/**
 * Applique le correctif d'un finding (identifié par son `id`).
 * Le scan est relancé pour obtenir des offsets à jour : aucun offset périmé
 * n'est jamais appliqué. Sauvegarde du fichier original dans `.dig-doctor/`.
 */
export function applyFix(id: string, opts: { targetDir?: string; root?: string } = {}): FixResult {
  const root = opts.root || REPO_ROOT;
  const report = scanSources(opts.targetDir, root);
  const f = report.findings.find(x => x.id === id);
  if (!f) return { applied: false, reason: `Finding introuvable (scan rejoué) : ${id}` };
  if (!f.fix) return { applied: false, reason: `Pas de correctif automatique pour ${f.rule} (${f.file}:${f.line}) — ${f.message}`, file: f.file, line: f.line, rule: f.rule };

  const abs = path.join(root, f.file);
  const original = fs.readFileSync(abs, 'utf-8');

  // Les deux insertions (import + corps) triées du plus tardif au plus tôt :
  // les offsets antérieurs restent valides.
  const edits: Array<{ at: number; text: string }> = [{ at: f.fix.insertAt, text: f.fix.insert }];
  if (f.fix.importInsert && f.fix.importInsertAt !== undefined) {
    edits.push({ at: f.fix.importInsertAt, text: f.fix.importInsert });
  }
  edits.sort((a, b) => b.at - a.at);

  let patched = original;
  for (const e of edits) {
    if (e.at < 0 || e.at > patched.length) return { applied: false, reason: `Offset hors fichier (${e.at}) — abandon, fichier intact.`, file: f.file };
    patched = patched.slice(0, e.at) + e.text + patched.slice(e.at);
  }
  if (patched === original) return { applied: false, reason: 'Le correctif ne change rien (déjà appliqué ?).', file: f.file };

  const backupDir = path.join(root, BACKUP_DIRNAME);
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(backupDir, `${stamp}-${f.file.replace(/[\\/]/g, '_')}`);
  fs.writeFileSync(backup, original, 'utf-8');
  fs.writeFileSync(abs, patched, 'utf-8');

  const after = scanSources(opts.targetDir, root);
  return {
    applied: true,
    file: f.file,
    line: f.line,
    rule: f.rule,
    backup: path.relative(root, backup),
    before: original.split('\n').slice(Math.max(0, f.line - 2), f.line + 4).join('\n'),
    after: patched.split('\n').slice(Math.max(0, f.line - 2), f.line + 6).join('\n'),
    remainingFindings: after.findings.length
  };
}

/** Aperçu sans écriture (dry-run) : ce que le correctif changerait. */
export function previewFix(id: string, opts: { targetDir?: string; root?: string } = {}): FixResult {
  const root = opts.root || REPO_ROOT;
  const report = scanSources(opts.targetDir, root);
  const f = report.findings.find(x => x.id === id);
  if (!f) return { applied: false, reason: `Finding introuvable : ${id}` };
  if (!f.fix) return { applied: false, reason: `Pas de correctif automatique pour ${f.rule} — ${f.message}`, file: f.file, line: f.line, rule: f.rule };
  const original = fs.readFileSync(path.join(root, f.file), 'utf-8');
  const edits: Array<{ at: number; text: string }> = [{ at: f.fix.insertAt, text: f.fix.insert }];
  if (f.fix.importInsert && f.fix.importInsertAt !== undefined) edits.push({ at: f.fix.importInsertAt, text: f.fix.importInsert });
  edits.sort((a, b) => b.at - a.at);
  let patched = original;
  for (const e of edits) patched = patched.slice(0, e.at) + e.text + patched.slice(e.at);
  return {
    applied: false,
    file: f.file,
    line: f.line,
    rule: f.rule,
    before: original.split('\n').slice(Math.max(0, f.line - 2), f.line + 4).join('\n'),
    after: patched.split('\n').slice(Math.max(0, f.line - 2), f.line + 6).join('\n'),
    reason: 'dry-run (aucune écriture)'
  };
}

export const DOCTOR_LIMITS = { MAX_FIX_FILES };

// ============================================================
// 4. DOCTEUR STRIPE (diagnostic runtime, sans secret)
// ============================================================

export interface StripeCheck {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

const ISO_CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN',
  'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'TRY', 'MXN', 'BRL', 'INR', 'NZD', 'SGD'
]);
/** Devises sans décimales chez Stripe : les montants sont en unités, pas en centimes. */
const ZERO_DECIMAL = new Set(['JPY', 'HUF', 'KRW', 'CLP', 'VND']);

export function maskSecret(v: string): string {
  if (!v) return '';
  if (v.length <= 12) return `${v.slice(0, 3)}…`;
  return `${v.slice(0, 10)}…${v.slice(-4)}`;
}

export interface StripeDoctorInput {
  envKey: string;
  dbKey: string;
  envWhsec: string;
  dbWhsec: string;
  mode: string;
  currency: string;
  demoCheckout: string;
  products: Array<{ id?: string; title?: string; status?: string; price?: number; pricing?: { recommendedPrice?: number } }>;
  publicUrl?: string;
  /** Sonde réseau vers api.stripe.com (optionnelle) : egress/DNS du serveur. */
  apiProbe?: { ok: boolean; status?: number; error?: string; ms?: number };
}

/**
 * Sonde api.stripe.com depuis le serveur. Une réponse 401 signifie « joignable »
 * (seule l'authentification manque). Sert à distinguer « clé invalide » de
 * « le serveur ne peut pas sortir » — deux pannes aux causes opposées.
 */
export async function probeStripeApi(timeoutMs = 6000): Promise<{ ok: boolean; status?: number; error?: string; ms?: number }> {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch('https://api.stripe.com/v1/account', { signal: ctrl.signal });
    clearTimeout(t);
    return { ok: true, status: r.status, ms: Date.now() - started };
  } catch (e: any) {
    return { ok: false, error: String(e?.cause?.code || e?.message || e).slice(0, 120), ms: Date.now() - started };
  }
}

/**
 * Diagnostic de la configuration Stripe. Ne retourne JAMAIS une clé en clair
 * (masquage systématique) — le résultat peut donc être renvoyé au LLM/UI.
 */
export function stripeDoctor(i: StripeDoctorInput): { ok: boolean; checks: StripeCheck[]; effective: Record<string, any> } {
  const checks: StripeCheck[] = [];
  const sk = (i.envKey || i.dbKey || '').trim();
  const whsec = (i.envWhsec || i.dbWhsec || '').trim();
  const source = i.envKey ? 'env (STRIPE_SECRET_KEY)' : (i.dbKey ? 'base (df_stripe_sk)' : 'aucune');
  const currency = (i.currency || 'EUR').toUpperCase();

  // S1 — présence de la clé
  if (!sk) {
    checks.push({
      id: 'stripe_key_present', status: 'fail',
      message: 'Aucune clé secrète Stripe : ni STRIPE_SECRET_KEY (env), ni df_stripe_sk (base). create-session refuse donc de créer une session de paiement.',
      fix: "Renseigner la clé dans Intégrations → Stripe (écrivant df_stripe_sk, authentifié) ou la variable d'environnement STRIPE_SECRET_KEY."
    });
  } else {
    checks.push({ id: 'stripe_key_present', status: 'pass', message: `Clé secrète présente (source : ${source}, ${maskSecret(sk)}).` });
  }

  // S2 — format de la clé (pk_ collée à la place de sk_ = erreur classique)
  if (sk && !/^(sk|rk)_(live|test)_/.test(sk)) {
    checks.push({
      id: 'stripe_key_format', status: 'fail',
      message: `Format de clé invalide (${maskSecret(sk)}) : une clé secrète commence par sk_live_ / sk_test_ (ou rk_…). Une clé pk_… est PUBLIABLE et ne peut pas créer de session.`,
      fix: 'Utiliser la « Secret key » du dashboard Stripe (Developers → API keys), pas la « Publishable key ».'
    });
  } else if (sk) {
    checks.push({ id: 'stripe_key_format', status: 'pass', message: 'Format de clé secrète valide.' });
  }

  // S3 — cohérence mode déclaré / préfixe de clé
  const mode = (i.mode || 'test').toLowerCase();
  if (sk && /^(sk|rk)_/.test(sk)) {
    const keyMode = sk.includes('_live_') ? 'live' : 'test';
    if (mode !== keyMode) {
      checks.push({
        id: 'stripe_mode_consistency', status: 'fail',
        message: `Incohérence : mode déclaré « ${mode} » mais clé ${keyMode === 'live' ? 'LIVE' : 'TEST'} (${maskSecret(sk)}). Les sessions seraient créées sur le mauvais environnement.`,
        fix: `Aligner df_stripe_mode sur « ${keyMode} » ou fournir une clé ${mode}.`
      });
    } else {
      checks.push({ id: 'stripe_mode_consistency', status: 'pass', message: `Mode cohérent (${mode}).` });
    }
  }

  // S4 — secret de webhook
  if (!whsec) {
    checks.push({
      id: 'stripe_whsec', status: 'warn',
      message: 'Aucun secret de signature webhook (STRIPE_WEBHOOK_SECRET / df_stripe_whsec) : /api/webhooks/stripe refuse tous les événements (400) et la livraison par webhook est impossible.',
      fix: 'Créer l’endpoint webhook dans le dashboard Stripe, copier le signing secret (whsec_…) et le renseigner.'
    });
  } else if (!/^whsec_/.test(whsec)) {
    checks.push({ id: 'stripe_whsec', status: 'fail', message: `Secret de webhook au format invalide (${maskSecret(whsec)}) : attendu whsec_…`, fix: 'Copier le « Signing secret » de l’endpoint webhook.' });
  } else {
    checks.push({ id: 'stripe_whsec', status: 'pass', message: `Secret de webhook présent (${maskSecret(whsec)}).` });
  }

  // S5 — devise
  if (!ISO_CURRENCIES.has(currency)) {
    checks.push({ id: 'stripe_currency', status: 'fail', message: `Devise « ${currency} » non ISO-4217 (ou non supportée par la boutique) : Stripe rejettera la session.`, fix: 'Utiliser EUR, USD, GBP, CHF… (3 lettres).' });
  } else if (ZERO_DECIMAL.has(currency)) {
    checks.push({ id: 'stripe_currency', status: 'warn', message: `Devise ${currency} sans décimales chez Stripe : les montants doivent être en unités, pas en centimes (totalCents serait 100× trop grand).`, fix: 'Vérifier la conversion € → unit_amount pour cette devise.' });
  } else {
    checks.push({ id: 'stripe_currency', status: 'pass', message: `Devise ${currency} valide.` });
  }

  // S6 — mode démo vs Stripe configuré
  if (i.demoCheckout === '1' && sk) {
    checks.push({ id: 'demo_vs_stripe', status: 'warn', message: 'DEMO_CHECKOUT=1 alors qu’une clé Stripe est configurée : le tunnel réel prime, le mode démo est ignoré (comportement voulu).', fix: 'Retirer DEMO_CHECKOUT pour éviter toute ambiguïté.' });
  } else if (i.demoCheckout === '1' && !sk) {
    checks.push({ id: 'demo_vs_stripe', status: 'warn', message: 'Mode démo actif (DEMO_CHECKOUT=1, aucune clé Stripe) : les commandes sont finalisées sans paiement réel.', fix: 'Configurer Stripe pour encaisser réellement.' });
  } else {
    checks.push({ id: 'demo_vs_stripe', status: 'pass', message: 'Mode de paiement cohérent (démo inactif).' });
  }

  // S7 — prix du catalogue (Stripe refuse unit_amount <= 0)
  const bad = (i.products || []).filter(p => {
    const price = Number(p?.pricing?.recommendedPrice ?? p?.price ?? 0);
    return p?.status === 'published' && !(price > 0);
  });
  if (bad.length > 0) {
    checks.push({
      id: 'catalog_prices', status: 'fail',
      message: `${bad.length} produit(s) publié(s) sans prix exploitable (<= 0) : Stripe rejetterait la session. Ex. ${bad.slice(0, 3).map(p => p.id).join(', ')}.`,
      fix: 'Corriger les prix (skill catalog_set_price) ou dépublier ces produits.'
    });
  } else {
    checks.push({ id: 'catalog_prices', status: 'pass', message: 'Tous les produits publiés ont un prix > 0.' });
  }

  // S8 — le serveur peut-il joindre api.stripe.com ? (egress/DNS)
  if (i.apiProbe) {
    if (!i.apiProbe.ok) {
      checks.push({
        id: 'stripe_api_reachable', status: 'fail',
        message: `api.stripe.com INJOIGNABLE depuis le serveur (${i.apiProbe.error || 'erreur réseau'} en ${i.apiProbe.ms} ms) : aucune session de paiement ne peut être créée, quelle que soit la clé. Cause typique : egress/DNS bloqué, proxy, ou sandbox sans accès sortant.`,
        fix: "Vérifier la sortie réseau du service (pare-feu/egress, DNS, proxy HTTP(S)) puis relancer ce diagnostic."
      });
    } else {
      checks.push({
        id: 'stripe_api_reachable', status: 'pass',
        message: `api.stripe.com joignable (HTTP ${i.apiProbe.status} en ${i.apiProbe.ms} ms).`
      });
    }
  }

  // S9 — URL publique pour le webhook
  const url = (i.publicUrl || '').trim();
  if (whsec && !url) {
    checks.push({ id: 'public_url', status: 'warn', message: 'PUBLIC_URL non définie : l’URL du webhook affichée dans l’UI ne peut pas être devinée (à saisir dans le dashboard Stripe).', fix: 'Définir PUBLIC_URL=https://<votre-service>.onrender.com' });
  }

  const fails = checks.filter(c => c.status === 'fail').length;
  return {
    ok: fails === 0,
    checks,
    effective: {
      keySource: source,
      keyMasked: maskSecret(sk),
      whsecMasked: maskSecret(whsec),
      mode,
      currency,
      demoCheckout: i.demoCheckout === '1'
    }
  };
}
