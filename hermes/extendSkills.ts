/**
 * hermes/extendSkills.ts — Extension RUNTIME d'Hermes (agent « apprenant, évolutif »).
 *
 * Trois briques, toutes 100 % réelles (aucune simulation) :
 *
 *  1. SKILLS PERSONNALISÉS (« télécharger des skills ») — des outils déclaratifs
 *     (JSON) installés À CHAUD, sans redéploiement : chaque skill = un appel
 *     webhook vers un endpoint https public (ou http loopback déclaré `local`,
 *     même exception documentée que les fournisseurs Ollama — AUDIT P3.2).
 *     Stockés en KV protégée `df_hermes_custom_skills`, rejoués au démarrage.
 *     Sécurité : garde anti-SSRF, method GET (lecture) vs POST (confirmation),
 *     timeout ≤ 20 s, réponse plafonnée, headers masqués dans les listes.
 *
 *  2. CLONES DE REPOS (« implanter des repos ») — clonage superficiel réel
 *     (`git clone --depth 1`) d'un repo GitHub public dans `references/_clones/`
 *     (gitignoré), puis lecture/recherche des fichiers par les agents.
 *     Borné : 25 clones max, nom validé, suppression explicite uniquement.
 *
 *  3. MÉMOIRE (« apprenant ») — les échanges passés (df_hermes_memories,
 *     alimenté par hermes/engine.ts) deviennent CONSULTABLES : recherche
 *     plein-texte + rappel des derniers échanges injectés dans le prompt.
 *
 * Ce module n'importe PAS hermes/tools.ts (pas de dépendance circulaire) :
 * tools.ts consomme customSkillTools()/ensureCustomSkillsLoaded() et le registre
 * complet est exposé via getAllSkills() (builtin + custom).
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/db/db';
import { keyValueStore } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { assertProviderBaseUrl, assertSafeOutbound } from '../ssrfGuard';
import { HermesContext, HermesTool, ToolParameterSchema } from './types';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLONES_DIR = path.join(PROJECT_ROOT, 'references', '_clones');
const CUSTOM_SKILLS_KV = 'df_hermes_custom_skills';
const CLONES_KV = 'df_hermes_repo_clones';
const MEMORIES_KV = 'df_hermes_memories';

export const CUSTOM_SKILL_LIMITS = { max: 20, nameRe: /^[a-z0-9_]{2,40}$/, descMax: 300, timeoutMaxMs: 20_000, headersMax: 6 };
export const CLONE_LIMITS = { max: 25, nameRe: /^[A-Za-z0-9._-]{2,80}$/, cloneTimeoutMs: 50_000 };

// ═══════════════════════════════════════════════════════════════════
// 1. SKILLS PERSONNALISÉS (webhook tools installés à chaud)
// ═══════════════════════════════════════════════════════════════════

export interface CustomSkillSpec {
  name: string;
  description: string;
  parameters?: ToolParameterSchema;
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  local?: boolean;
  timeoutMs?: number;
  installedAt: string;
  installedBy: string;
  source: 'inline' | string;
}

/** Masque les valeurs d'en-têtes (Authorization & co) pour toute vue/liste. */
function maskSpec(spec: CustomSkillSpec): Record<string, any> {
  const headers = spec.headers
    ? Object.fromEntries(Object.entries(spec.headers).map(([k, v]) => [k, v ? `•••• (${String(v).length} car.)` : '']))
    : undefined;
  return { ...spec, headers, ...(headers ? {} : { headers: undefined }) };
}

async function loadSpecs(): Promise<CustomSkillSpec[]> {
  const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, CUSTOM_SKILLS_KV));
  if (r.length === 0 || !r[0].value) return [];
  const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
  return Array.isArray(v) ? v.filter((s: any) => s && typeof s.name === 'string' && typeof s.url === 'string') : [];
}

async function saveSpecs(specs: CustomSkillSpec[]): Promise<void> {
  await db.insert(keyValueStore).values({ key: CUSTOM_SKILLS_KV, value: specs })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: specs } });
}

// Cache process (les tools doivent être synchrones pour le registre)
let customToolsCache: HermesTool[] = [];
let customLoadedAt = 0;

/** Construit l'outil HermesTool d'une spec (exécution webhook sécurisée). */
function specToTool(spec: CustomSkillSpec): HermesTool {
  const isGet = (spec.method || 'POST').toUpperCase() === 'GET';
  return {
    name: spec.name,
    description: `[skill custom] ${spec.description}${spec.local ? ' (endpoint local)' : ''}`,
    access: isGet ? 'read' : 'write',
    requiresConfirmation: !isGet,
    parameters: spec.parameters || { type: 'object', properties: {} },
    async run(args: Record<string, any>, _ctx: HermesContext) {
      await assertProviderBaseUrl(spec.url, { allowLoopback: Boolean(spec.local) });
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), Math.min(Number(spec.timeoutMs) || 15_000, CUSTOM_SKILL_LIMITS.timeoutMaxMs));
      try {
        const init: RequestInit = isGet
          ? { method: 'GET', headers: { ...(spec.headers || {}) }, signal: ctl.signal }
          : { method: 'POST', headers: { 'Content-Type': 'application/json', ...(spec.headers || {}) }, body: JSON.stringify(args || {}), signal: ctl.signal };
        const res = await fetch(spec.url, init);
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Skill custom « ${spec.name} » : endpoint HTTP ${res.status} ${body.slice(0, 200)}`);
        }
        const ctype = String(res.headers.get('content-type') || '');
        if (ctype.includes('json')) {
          const data = await res.json();
          return { ok: true, httpStatus: res.status, response: truncate(data) };
        }
        const text = await res.text();
        return { ok: true, httpStatus: res.status, response: text.slice(0, 4000) };
      } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error(`Skill custom « ${spec.name} » : délai dépassé (endpoint trop lent).`);
        throw e;
      } finally {
        clearTimeout(t);
      }
    }
  };
}

function truncate(v: any): any {
  if (typeof v === 'string') return v.length > 4000 ? v.slice(0, 4000) + '…[tronqué]' : v;
  let s: string;
  try { s = JSON.stringify(v); } catch { return String(v).slice(0, 4000); }
  return s.length > 4000 ? s.slice(0, 4000) + '…[tronqué]' : v;
}

/** (Re)charge les skills custom depuis la KV → cache process. */
export async function ensureCustomSkillsLoaded(): Promise<HermesTool[]> {
  const specs = await loadSpecs();
  customToolsCache = specs.map(specToTool);
  customLoadedAt = Date.now();
  return customToolsCache;
}

/** Tools custom actuellement chargés (cache). */
export function customSkillTools(): HermesTool[] {
  return customToolsCache;
}

export async function listCustomSkillSpecs(): Promise<Record<string, any>[]> {
  return (await loadSpecs()).map(maskSpec);
}

/**
 * Valide et installe un skill custom. `reservedNames` (skills builtin) est
 * fourni par l'appelant pour éviter toute dépendance circulaire.
 */
export async function installCustomSkill(input: {
  spec: any;
  url?: string;
  local?: boolean;
  actor: string;
  reservedNames: string[];
}): Promise<Record<string, any>> {
  let raw = input.spec;
  if (!raw && input.url) {
    // Téléchargement de la définition (https public, ou loopback déclaré local).
    await assertProviderBaseUrl(input.url, { allowLoopback: Boolean(input.local) });
    const res = await fetch(input.url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Téléchargement du skill échoué : HTTP ${res.status}.`);
    raw = await res.json();
  }
  if (!raw || typeof raw !== 'object') throw new Error('Spec de skill invalide (objet JSON attendu).');

  const name = String(raw.name || '').trim().toLowerCase();
  if (!CUSTOM_SKILL_LIMITS.nameRe.test(name)) throw new Error(`Nom invalide (${CUSTOM_SKILL_LIMITS.nameRe.source}).`);
  if (input.spec?.name) input.spec.name = name;
  if (reservedIncludes(input.reservedNames, name)) throw new Error(`Nom réservé : « ${name} » est un skill builtin — choisissez un autre nom.`);
  const description = String(raw.description || '').trim();
  if (!description || description.length > CUSTOM_SKILL_LIMITS.descMax) throw new Error(`Description requise (≤ ${CUSTOM_SKILL_LIMITS.descMax} car.).`);

  const local = Boolean(raw.local || input.local);
  const url = String(raw.url || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('url requise (https public, ou http://localhost si local=true).');
  await assertProviderBaseUrl(url, { allowLoopback: local });

  const method = String(raw.method || 'POST').toUpperCase();
  if (!['GET', 'POST'].includes(method)) throw new Error("method invalide : 'GET' ou 'POST'.");

  let headers: Record<string, string> | undefined;
  if (raw.headers && typeof raw.headers === 'object' && !Array.isArray(raw.headers)) {
    const entries = Object.entries(raw.headers).slice(0, CUSTOM_SKILL_LIMITS.headersMax);
    if (entries.some(([k]) => !/^[a-z0-9-]+$/i.test(k))) throw new Error('Nom d\'en-tête HTTP invalide.');
    headers = Object.fromEntries(entries.map(([k, v]) => [k, String(v).slice(0, 500)]));
  }

  let parameters: ToolParameterSchema | undefined;
  if (raw.parameters !== undefined) {
    if (typeof raw.parameters !== 'object' || Array.isArray(raw.parameters) || raw.parameters.type !== 'object') {
      throw new Error('parameters doit être un schéma JSON de type object.');
    }
    parameters = raw.parameters;
  }

  const specs = await loadSpecs();
  if (specs.some(s => s.name === name)) throw new Error(`Un skill custom « ${name} » est déjà installé (retirez-le d'abord).`);
  if (specs.length >= CUSTOM_SKILL_LIMITS.max) throw new Error(`Limite atteinte (${CUSTOM_SKILL_LIMITS.max} skills custom).`);

  const spec: CustomSkillSpec = {
    name, description, url, method: method as 'GET' | 'POST',
    ...(headers ? { headers } : {}), ...(local ? { local: true } : {}),
    ...(raw.timeoutMs ? { timeoutMs: Math.min(Number(raw.timeoutMs) || 15_000, CUSTOM_SKILL_LIMITS.timeoutMaxMs) } : {}),
    ...(parameters ? { parameters } : {}),
    installedAt: new Date().toISOString(),
    installedBy: String(input.actor || 'modérateur').slice(0, 60),
    source: input.url ? input.url.slice(0, 300) : 'inline'
  };
  specs.push(spec);
  await saveSpecs(specs);
  await ensureCustomSkillsLoaded();
  return maskSpec(spec);
}

function reservedIncludes(reserved: string[], name: string): boolean {
  return reserved.includes(name);
}

export async function removeCustomSkill(name: string): Promise<string> {
  const n = String(name || '').trim().toLowerCase();
  const specs = await loadSpecs();
  const idx = specs.findIndex(s => s.name === n);
  if (idx === -1) throw new Error(`Skill custom inconnu : ${n}`);
  specs.splice(idx, 1);
  await saveSpecs(specs);
  await ensureCustomSkillsLoaded();
  return n;
}

// ═══════════════════════════════════════════════════════════════════
// 2. CLONES DE REPOS GitHub (implantation réelle dans le projet)
// ═══════════════════════════════════════════════════════════════════

interface CloneEntry { name: string; url: string; clonedAt: string; clonedBy: string }

async function loadClones(): Promise<CloneEntry[]> {
  const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, CLONES_KV));
  if (r.length === 0 || !r[0].value) return [];
  const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
  return Array.isArray(v) ? v : [];
}

async function saveClones(list: CloneEntry[]): Promise<void> {
  await db.insert(keyValueStore).values({ key: CLONES_KV, value: list })
    .onConflictDoUpdate({ target: keyValueStore.key, set: { value: list } });
}

const GITHUB_URL_RE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

/** Clone superficiel d'un repo GitHub public dans references/_clones/<owner>__<repo>. */
export async function cloneRepo(url: string, actor: string): Promise<Record<string, any>> {
  const m = GITHUB_URL_RE.exec(String(url || '').trim());
  if (!m) throw new Error('URL GitHub invalide (attendu : https://github.com/<owner>/<repo>, repo public).');
  const [, owner, repo] = m;
  await assertSafeOutbound(`https://github.com/${owner}/${repo}`);
  const name = `${owner}__${repo}`;
  if (!CLONE_LIMITS.nameRe.test(name)) throw new Error('Nom de clone invalide.');
  const dir = path.join(CLONES_DIR, name);
  if (fs.existsSync(dir)) throw new Error(`Clone déjà présent : ${name} (utilisez repo_remove pour le remplacer).`);
  const clones = await loadClones();
  if (clones.length >= CLONE_LIMITS.max) throw new Error(`Limite atteinte (${CLONE_LIMITS.max} clones — supprimez-en avec repo_remove).`);

  fs.mkdirSync(CLONES_DIR, { recursive: true });
  const t0 = Date.now();
  await gitSpawn(['clone', '--depth', '1', '--single-branch', '--no-tags', `https://github.com/${owner}/${repo}.git`, dir]);
  const files = walkFiles(dir).length;
  clones.push({ name, url: `https://github.com/${owner}/${repo}`, clonedAt: new Date().toISOString(), clonedBy: String(actor || 'modérateur').slice(0, 60) });
  await saveClones(clones);
  return {
    cloned: true, name, url: `https://github.com/${owner}/${repo}`, files,
    ms: Date.now() - t0,
    dir: path.relative(PROJECT_ROOT, dir),
    note: `Clone réel (git clone --depth 1). Explorez-le avec repo_files (name="${name}").`
  };
}

function gitSpawn(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolveP, rejectP) => {
    const p = spawn('git', args, { cwd: PROJECT_ROOT });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); rejectP(new Error(`git ${args[0]} : délai dépassé (${CLONE_LIMITS.cloneTimeoutMs / 1000} s) — repo trop gros ou réseau lent.`)); }, CLONE_LIMITS.cloneTimeoutMs);
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(timer); rejectP(new Error(`git indisponible sur le serveur : ${e.message}`)); });
    p.on('close', code => { clearTimeout(timer); code === 0 ? resolveP({ code, out, err }) : rejectP(new Error(`git clone échoué (exit ${code}) : ${err.slice(0, 250)}`)); });
  });
}

/** Liste récursive des fichiers d'un répertoire (skip .git), chemins relatifs. */
export function walkFiles(dir: string, base = dir, acc: string[] = [], depth = 0): string[] {
  if (depth > 8 || acc.length > 2000) return acc;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, base, acc, depth + 1);
    else acc.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return acc;
}

export async function listClones(): Promise<Array<Record<string, any>>> {
  const clones = await loadClones();
  return clones.map(c => {
    const dir = path.join(CLONES_DIR, c.name);
    const present = fs.existsSync(dir);
    return { ...c, present, files: present ? walkFiles(dir).length : 0 };
  });
}

/** Résout un clone par nom (doit exister sur disque) — périmètre validé, exporté pour repo_files. */
export function cloneDirChecked(name: string): string {
  return cloneDir(name);
}

function cloneDir(name: string): string {
  if (!CLONE_LIMITS.nameRe.test(name)) throw new Error('Nom de clone invalide.');
  const dir = path.resolve(CLONES_DIR, name);
  if (!dir.startsWith(CLONES_DIR + path.sep)) throw new Error('Chemin hors du répertoire des clones.');
  if (!fs.existsSync(dir)) throw new Error(`Clone inconnu : ${name} (installez-le avec repo_clone).`);
  return dir;
}

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.mdx', '.txt', '.css', '.scss', '.html', '.htm', '.yml', '.yaml', '.svg', '.sh', '.py', '.rb', '.go', '.rs', '.java', '.sql', '.xml', '.toml', '.env', '.gitignore', '.dockerignore', '.example']);

/** Fichiers sans extension courants dans les repos (README, LICENSE, Makefile…). */
const TEXT_NO_EXT = new Set(['readme', 'license', 'licence', 'contributing', 'changelog', 'history', 'notice', 'authors', 'contributors', 'makefile', 'dockerfile', 'codeowners', 'gemfile', 'rakefile', 'procfile', 'vagrantfile', 'jenkinsfile', '.gitignore', '.gitattributes', '.dockerignore', '.editorconfig', '.npmrc', '.nvmrc', '.python-version', '.gitmodules']);

export function isTextFile(rel: string): boolean {
  const base = path.basename(rel).toLowerCase();
  const ext = path.extname(rel).toLowerCase();
  if (!ext) return TEXT_NO_EXT.has(base) || /^(readme|license|changelog|notice|contributing)/.test(base);
  if (base.startsWith('.env')) return true; // .env.example etc. (lecture seule d'artefacts de clones)
  return TEXT_EXT.has(ext);
}

/** Lit un fichier d'un clone (plafonné). */
export function readCloneFile(name: string, rel: string, maxChars = 4000): Record<string, any> {
  const dir = cloneDir(name);
  const safeRel = path.resolve(dir, rel);
  if (!safeRel.startsWith(dir + path.sep)) throw new Error('Chemin hors du clone.');
  if (!fs.existsSync(safeRel) || !fs.statSync(safeRel).isFile()) throw new Error(`Fichier introuvable dans ${name} : ${rel}`);
  if (!isTextFile(rel)) throw new Error('Fichier binaire/non textuel — lecture refusée.');
  const content = fs.readFileSync(safeRel, 'utf-8');
  return {
    clone: name, file: rel, bytes: Buffer.byteLength(content),
    truncated: content.length > maxChars,
    content: content.slice(0, maxChars)
  };
}

/** Recherche textuelle (grep simple) dans un clone. */
export function grepClone(name: string, query: string, limit = 40): Record<string, any> {
  const dir = cloneDir(name);
  const q = query.toLowerCase();
  const matches: Array<{ file: string; line: number; text: string }> = [];
  const files = walkFiles(dir).filter(isTextFile).slice(0, 400);
  for (const rel of files) {
    let content: string;
    try { content = fs.readFileSync(path.join(dir, rel), 'utf-8'); } catch { continue; }
    if (content.length > 400_000) continue;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length && matches.length < limit; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        matches.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 200) });
      }
    }
    if (matches.length >= limit) break;
  }
  return { clone: name, query, scannedFiles: files.length, matches: matches.length, results: matches };
}

export async function removeClone(name: string): Promise<Record<string, any>> {
  cloneDir(name); // valide l'existence + le périmètre
  const clones = await loadClones();
  const next = clones.filter(c => c.name !== name);
  await saveClones(next);
  fs.rmSync(path.join(CLONES_DIR, name), { recursive: true, force: true });
  return { removed: name, remaining: next.length };
}

// ═══════════════════════════════════════════════════════════════════
// 3. MÉMOIRE (apprentissage — lecture des échanges passés)
// ═══════════════════════════════════════════════════════════════════

async function loadMemories(): Promise<any[]> {
  const r = await db.select().from(keyValueStore).where(eq(keyValueStore.key, MEMORIES_KV));
  if (r.length === 0 || !r[0].value) return [];
  const v = typeof r[0].value === 'string' ? JSON.parse(r[0].value) : r[0].value;
  return Array.isArray(v) ? v : [];
}

/** Derniers souvenirs (injectés dans le prompt système : apprentissage contextuel). */
export async function recentMemories(agentId?: string, n = 3): Promise<any[]> {
  const all = await loadMemories();
  const scoped = agentId ? all.filter(m => m?.agent === agentId) : all;
  return scoped.slice(0, Math.max(1, Math.min(n, 10)));
}

/** Recherche plein-texte dans les souvenirs. */
export async function searchMemories(query: string, agentId?: string, limit = 10): Promise<Record<string, any>> {
  const q = String(query || '').trim().toLowerCase();
  const all = await loadMemories();
  const scoped = agentId ? all.filter(m => m?.agent === agentId) : all;
  const hits = q
    ? scoped.filter(m => {
        const hay = `${m?.prompt || ''} ${m?.response || ''} ${(m?.tools || []).join(' ')}`.toLowerCase();
        return hay.includes(q);
      })
    : scoped;
  return {
    query, agent: agentId || 'tous', totalMemories: all.length,
    matches: hits.length,
    memories: hits.slice(0, Math.max(1, Math.min(limit, 25))).map(m => ({
      at: m.at, agent: m.agent, prompt: String(m.prompt || '').slice(0, 200),
      tools: m.tools, response: String(m.response || '').slice(0, 300)
    }))
  };
}
