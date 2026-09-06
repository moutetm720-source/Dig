#!/usr/bin/env node
/**
 * setup-local-llm.mjs — Implante un fournisseur IA LOCAL pour Hermes.
 *
 * Objectif : qu'Hermes dispose TOUJOURS d'un fournisseur RÉEL, même sans clé
 * cloud (ou quand Google déprécie un modèle pour les nouvelles clés API).
 * Deux moteurs, endpoint compatible OpenAI dans les deux cas :
 *
 *   1. Ollama (défaut)     — http://127.0.0.1:11434/v1 — modèles open-source
 *                            (qwen2.5, llama3.1, mistral…) avec support des
 *                            tools (function calling).
 *   2. llama.cpp (--engine llama-cpp) — llama-server, http://127.0.0.1:11435/v1
 *                            — binaire + fichier GGUF, zéro service.
 *
 * Usage :
 *   node scripts/setup-local-llm.mjs            # installe/démarre Ollama + modèle par défaut
 *   node scripts/setup-local-llm.mjs --check    # diagnostic (rien n'est modifié)
 *   node scripts/setup-local-llm.mjs --model qwen2.5:3b
 *   node scripts/setup-local-llm.mjs --engine llama-cpp --gguf <url|chemin>
 *   node scripts/setup-local-llm.mjs --test     # test tool-calling réel (après installation)
 *
 * À la fin, le script affiche les lignes à mettre dans .env pour brancher
 * Hermes (HERMES_OPENAI_BASE_URL / HERMES_OPENAI_MODEL / HERMES_OPENAI_API_KEY).
 * Rien n'est écrit sans votre accord : aucun .env modifié automatiquement.
 *
 * Zéro dépendance (node: fs, http, child_process). Linux et macOS pris en
 * charge (arm64 + x64) ; Windows : instructions affichées.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, chmodSync, createWriteStream, statSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const LOCAL_DIR = join(ROOT, '.local-llm');
const OLLAMA_PORT = 11434;
const LLAMA_PORT = 11435;
const OLLAMA_DEFAULT_MODEL = process.env.LOCAL_LLM_MODEL || 'qwen2.5:1.5b'; // 1,0 Go, tools OK

// ---- Arguments ----
const args = process.argv.slice(2);
const FLAG = (...names) => args.some(a => names.includes(a));
const VAL = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};
const CHECK = FLAG('--check');
const TEST_ONLY = FLAG('--test');
const ENGINE = (VAL('--engine') || 'ollama').toLowerCase();
const MODEL = VAL('--model') || OLLAMA_DEFAULT_MODEL;
const GGUF = VAL('--gguf');
const PORT = ENGINE === 'llama-cpp' ? LLAMA_PORT : OLLAMA_PORT;
const BASE = `http://127.0.0.1:${PORT}/v1`;

const log = (...a) => console.log(...a);
const ok = (...a) => console.log('✅', ...a);
const warn = (...a) => console.log('⚠️ ', ...a);
const fail = (...a) => { console.error('❌', ...a); process.exit(1); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- Réseau utilitaires ----

async function fetchJson(url, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'dig-setup-local-llm' } });
    const body = await res.json();
    return { status: res.status, body };
  } finally { clearTimeout(t); }
}

async function isListening(url) {
  try { const r = await fetchJson(url, 4000); return r.status > 0 && r.status < 500; }
  catch { return false; }
}

/** Téléchargement avec suivi, reprise non gérée (fichiers < 5 Go). */
async function download(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) {
    log(`   (déjà présent : ${dest})`);
    return dest;
  }
  mkdirSync(dirnameRecursive(dest), { recursive: true });
  log(`   ⬇️  ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Téléchargement échoué : HTTP ${res.status} (${url})`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const mb = (statSync(dest).size / 1024 / 1024).toFixed(1);
  ok(`Téléchargé : ${dest} (${mb} Mo)`);
  return dest;
}

function dirnameRecursive(p) { return resolve(p, '..'); }

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolveP, rejectP) => {
    const p = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', rejectP);
    p.on('close', code => resolveP({ code, out, err }));
  });
}

/** Démarre un serveur détaché qui survit à ce script. */
function spawnDetached(cmd, cmdArgs, cwd, logFile) {
  const out = openSync(logFile, 'a');
  const child = spawn(cmd, cmdArgs, { cwd, detached: true, stdio: ['ignore', out, out], env: process.env });
  child.unref();
  return child.pid;
}

async function waitFor(url, label, timeoutMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await isListening(url)) { ok(`${label} répond sur ${url}`); return true; }
    await sleep(1500);
  }
  fail(`${label} ne répond pas sur ${url} après ${Math.round(timeoutMs / 1000)} s (voir le log dans ${LOCAL_DIR}/)`);
}

// ---- Détection plateformes ----

const PLATFORM = process.platform; // linux | darwin | win32
const ARCH_RAW = process.arch;     // x64 | arm64
function archName(engine) {
  if (engine === 'ollama') return ARCH_RAW === 'arm64' ? 'arm64' : 'amd64';
  return ARCH_RAW === 'arm64' ? 'arm64' : 'x64';
}

function whichOllama() {
  const candidates = [
    process.env.OLLAMA_BIN,
    join(LOCAL_DIR, 'ollama', 'bin', 'ollama'),
    join(LOCAL_DIR, 'ollama', 'ollama')
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  const probe = spawnSync('which', ['ollama'], { encoding: 'utf8' });
  if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim();
  return null;
}

// ---- Moteur 1 : Ollama ----

async function setupOllama() {
  let bin = whichOllama();
  if (!bin && !CHECK) {
    log('🦙 Ollama absent — installation locale (sans root) dans .local-llm/ …');
    mkdirSync(LOCAL_DIR, { recursive: true });
    const arch = archName('ollama');
    const urls = [
      `https://ollama.com/download/ollama-linux-${arch}.tgz`,
      `https://github.com/ollama/ollama/releases/latest/download/ollama-linux-${arch}.tgz`
    ];
    if (PLATFORM === 'darwin') urls.unshift(`https://ollama.com/download/ollama-darwin.zip`);
    let tgz = null;
    let lastErr = null;
    for (const u of urls) {
      try { tgz = await download(u, join(LOCAL_DIR, `ollama-${arch}.tgz`)); break; } catch (e) { lastErr = e; }
    }
    if (!tgz) fail(`Impossible de télécharger Ollama (${lastErr?.message}). Installez-le manuellement : https://ollama.com/download puis relancez ce script.`);
    if (PLATFORM === 'linux') {
      const dest = join(LOCAL_DIR, 'ollama');
      mkdirSync(dest, { recursive: true });
      const r = await run('tar', ['-xzf', tgz, '-C', dest]);
      if (r.code !== 0) fail(`Extraction échouée : ${r.err.slice(0, 300)}`);
      const cand = [join(dest, 'bin', 'ollama'), join(dest, 'ollama')].find(existsSync);
      if (!cand) fail('Archive Ollama extraite mais binaire introuvable.');
      chmodSync(cand, 0o755);
      bin = cand;
    } else {
      fail('Installation macOS automatique non prise en charge : installez via `brew install ollama` ou https://ollama.com/download, puis relancez.');
    }
  }
  if (!bin) fail('Ollama introuvable. Installez-le (https://ollama.com/download) ou utilisez `--engine llama-cpp`.');

  ok(`Ollama trouvé : ${bin}`);
  // Version
  const v = await run(bin, ['--version']);
  log(`   ${String(v.out || v.err).trim().slice(0, 80)}`);

  // Serveur démarré ?
  if (!(await isListening(`http://127.0.0.1:${OLLAMA_PORT}/api/version`))) {
    if (CHECK) { warn(`Le serveur Ollama ne répond PAS sur le port ${OLLAMA_PORT} (démarrez-le : \`ollama serve\`)`); return; }
    log('🚀 Démarrage de `ollama serve` (arrière-plan, log : .local-llm/ollama-serve.log)…');
    spawnDetached(bin, ['serve'], LOCAL_DIR, join(LOCAL_DIR, 'ollama-serve.log'));
    await waitFor(`http://127.0.0.1:${OLLAMA_PORT}/api/version`, 'Ollama', 60000);
  } else {
    ok(`Le serveur Ollama répond déjà sur le port ${OLLAMA_PORT}`);
  }

  if (CHECK) return;

  // Modèle (pull si absent)
  const list = await fetchJson(`http://127.0.0.1:${OLLAMA_PORT}/api/tags`, 20000).catch(() => null);
  const models = Array.isArray(list?.body?.models) ? list.body.models.map(m => m.name) : [];
  log(`   Modèles présents : ${models.length ? models.join(', ') : 'aucun'}`);
  if (!models.includes(MODEL)) {
    log(`📥 Pull du modèle ${MODEL} (peut prendre quelques minutes la première fois)…`);
    const r = await run(bin, ['pull', MODEL], { cwd: LOCAL_DIR });
    if (r.code !== 0) fail(`Pull échoué : ${String(r.err || r.out).slice(0, 300)}`);
    ok(`Modèle ${MODEL} installé`);
  } else {
    ok(`Modèle ${MODEL} déjà présent`);
  }
}

// ---- Moteur 2 : llama.cpp (llama-server) ----

async function setupLlamaCpp() {
  const base = join(LOCAL_DIR, 'llama-cpp');
  const binPath = join(base, 'bin', 'llama-server');
  const winBinPath = join(base, 'llama-server.exe');

  if (!(existsSync(binPath) || existsSync(winBinPath))) {
    if (CHECK) { warn('llama-server non installé dans .local-llm/llama-cpp (relancez sans --check pour l\'installer)'); return; }
    log('🦙 Installation de llama.cpp (llama-server) depuis GitHub releases…');
    // Dernière release + asset correspondant à la plateforme
    const rel = await fetchJson('https://api.github.com/repos/ggml-org/llama.cpp/releases/latest', 20000)
      .catch(() => null);
    const assets = Array.isArray(rel?.body?.assets) ? rel.body.assets : [];
    const arch = archName('llama-cpp');
    const wanted = PLATFORM === 'linux' ? `bin-ubuntu-${arch}.tar.gz`
      : PLATFORM === 'darwin' ? `bin-macos-${arch}.tar.gz`
        : `bin-win-cpu-x64.zip`;
    const asset = assets.find(a => a.name && a.name.includes(wanted.replace('.tar.gz', '')) && (a.name.endsWith('.tar.gz') || a.name.endsWith('.zip')))
      || assets.find(a => a.name?.endsWith(wanted));
    if (!asset) fail(`Aucun asset llama.cpp trouvé pour ${PLATFORM}/${arch} (release : ${rel?.body?.tag_name || '?'}).`);
    mkdirSync(join(base, 'bin'), { recursive: true });
    const f = await download(asset.browser_download_url, join(LOCAL_DIR, asset.name));
    if (PLATFORM === 'linux' || PLATFORM === 'darwin') {
      const r = await run('tar', ['-xzf', f, '-C', join(base, 'bin')]);
      if (r.code !== 0) fail(`Extraction échouée : ${r.err.slice(0, 300)}`);
    } else {
      const r = await run('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -Path "${f}" -DestinationPath "${join(base, 'bin')}"`]);
      if (r.code !== 0) fail(`Extraction échouée : ${r.err.slice(0, 300)}`);
    }
    const found = [join(base, 'bin', 'llama-server'), join(base, 'bin', binName())].filter(existsSync)[0];
    if (!found) fail('llama-server introuvable après extraction.');
    if (PLATFORM !== 'win32') chmodSync(found, 0o755);
  }

  function binName() { return PLATFORM === 'win32' ? 'llama-server.exe' : 'llama-server'; }
  const serverBin = [binPath, winBinPath, join(base, 'bin', binName())].find(existsSync);
  if (!serverBin) fail('llama-server introuvable.');
  ok(`llama-server trouvé : ${serverBin}`);

  // GGUF
  const defaultGguf = 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf';
  const ggufSrc = GGUF || defaultGguf;
  let ggufPath;
  if (/^https?:\/\//i.test(ggufSrc)) {
    const name = ggufSrc.split('/').pop().split('?')[0];
    ggufPath = join(LOCAL_DIR, 'models', name);
    if (!existsSync(ggufPath)) {
      log(`📥 Téléchargement du modèle GGUF (Qwen2.5-1.5B-Instruct Q4_K_M ≈ 1,0 Go)…`);
      await download(ggufSrc, ggufPath);
    } else ok(`GGUF déjà présent : ${ggufPath}`);
  } else {
    ggufPath = resolve(ggufSrc);
    if (!existsSync(ggufPath)) fail(`Fichier GGUF introuvable : ${ggufPath}`);
  }

  if (CHECK) return;

  if (!(await isListening(`http://127.0.0.1:${LLAMA_PORT}/health`))) {
    log(`🚀 Démarrage de llama-server (port ${LLAMA_PORT}, log : .local-llm/llama-server.log)…`);
    spawnDetached(serverBin, ['-m', ggufPath, '--host', '127.0.0.1', '--port', String(LLAMA_PORT), '--jinja'], join(LOCAL_DIR, 'llama-cpp'), join(LOCAL_DIR, 'llama-server.log'));
    await waitFor(`http://127.0.0.1:${LLAMA_PORT}/health`, 'llama-server', 120000);
  } else ok(`llama-server répond déjà sur le port ${LLAMA_PORT}`);
}

// ---- Test tool-calling réel (endpoint compatible OpenAI) ----

async function testToolCalling() {
  log('🧪 Test de tool-calling réel sur', BASE);
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ENGINE === 'llama-cpp' ? 'local' : MODEL,
      messages: [{ role: 'user', content: "Quel temps fait-il à Paris ? Utilise l'outil." }],
      tools: [{
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Retourne la météo d\'une ville',
          parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
        }
      }],
      tool_choice: 'auto'
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    fail(`Le endpoint a répondu HTTP ${res.status} : ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (tc?.function?.name === 'get_weather') {
    ok(`Tool-calling RÉEL confirmé : ${tc.function.name}(${tc.function.arguments})`);
  } else {
    warn(`Réponse sans tool_call (le modèle a répondu en texte : « ${String(data?.choices?.[0]?.message?.content || '').slice(0, 80)} »). Réessayez ou choisissez un modèle adapté aux tools (qwen2.5, llama3.1, mistral…).`);
  }
}

// ---- Affichage de la configuration Hermes ----

function printEnv() {
  const model = ENGINE === 'llama-cpp' ? 'local' : MODEL;
  const lines = [
    '# .env — fournisseur IA local (réel, gratuit, sans clé cloud)',
    `HERMES_OPENAI_BASE_URL=${BASE}`,
    `HERMES_OPENAI_MODEL=${model}`,
    'HERMES_OPENAI_API_KEY=ollama',
    '# Optionnel : le pool essaie d\'abord Gemini si GEMINI_API_KEY est définie,',
    '# puis bascule automatiquement sur ce fournisseur local en cas d\'échec.'
  ].join('\n');
  console.log('\n' + '─'.repeat(72));
  log('📝 Ajoutez ces lignes à votre .env (ou à l\'environnement du service) :');
  console.log(lines);
  console.log('─'.repeat(72));
  log('Puis relancez le serveur et vérifiez :');
  log('  curl -s http://127.0.0.1:' + (process.env.PORT || 3211) + '/api/hermes/providers');
  log('Alternative sans redémarrage — ajout au pool runtime (pool « auto ») :');
  log(`  curl -X POST http://127.0.0.1:${process.env.PORT || 3211}/api/hermes/providers \\`);
  log(`    -H 'Content-Type: application/json' \\`);
  log(`    -d '{"name":"local-llm","kind":"openai","baseUrl":"${BASE}","model":"${model}","local":true,"priority":30}'`);
}

// ---- Point d'entrée ----

(async () => {
  log('🛠️  Dig — installation du fournisseur IA local (moteur : ' + ENGINE + ')');
  if (PLATFORM === 'win32' && !CHECK && ENGINE === 'ollama') {
    log('Windows détecté : téléchargez Ollama sur https://ollama.com/download/windows,');
    log('puis : ollama serve  &  ollama pull ' + MODEL);
    fail('Ou relancez avec --engine llama-cpp (extraction zip automatique).');
  }
  mkdirSync(LOCAL_DIR, { recursive: true });

  if (ENGINE === 'llama-cpp') await setupLlamaCpp();
  else await setupOllama();

  if (TEST_ONLY) { await testToolCalling(); return; }
  if (!CHECK) {
    await testToolCalling().catch(e => warn(`Test tool-calling ignoré : ${e.message}`));
    printEnv();
  } else {
    const up = await isListening(ENGINE === 'llama-cpp' ? `http://127.0.0.1:${LLAMA_PORT}/health` : `http://127.0.0.1:${OLLAMA_PORT}/api/version`);
    log(up ? '✅ Diagnostic : serveur local opérationnel' : '⚠️  Diagnostic : serveur local NON démarré');
  }
})().catch(e => fail(e?.stack || e?.message || String(e)));
