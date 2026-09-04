/**
 * scripts/fixtures/doctor/fixture-run.ts — exécution du scénario
 * « détection → correction » du docteur de code sur la fixture cassée.
 *
 * Lancé par scripts/verify-diagnostics.mjs (via tsx). Tout se passe dans un
 * dossier temporaire : le dépôt n'est jamais modifié par ce test.
 *
 * Sortie : une ligne JSON sur stdout (consommée par le test).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { transformSync } from 'esbuild';
import { scanSources, applyFix } from '../../../hermes/diagnostics.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FIXTURE = path.join(HERE, 'BrokenStripe.tsx');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dig-doctor-'));
fs.mkdirSync(path.join(root, 'src', 'components'), { recursive: true });
const target = path.join(root, 'src', 'components', 'BrokenStripe.tsx');
fs.copyFileSync(FIXTURE, target);

function parses(): { ok: boolean; error?: string } {
  try {
    transformSync(fs.readFileSync(target, 'utf-8'), { loader: 'tsx' });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 300) };
  }
}

const initial = scanSources(undefined, root);
const applied: Array<{ rule: string; file: string; backup: string }> = [];
const parseErrors: string[] = [];
let guard = 0;

for (;;) {
  const report = scanSources(undefined, root);
  const next = report.findings.find(f => Boolean(f.fix));
  if (!next || guard++ > 10) break;
  const res = applyFix(next.id, { root });
  if (!res.applied) { parseErrors.push(`applyFix refusé : ${res.reason}`); break; }
  applied.push({ rule: String(res.rule), file: String(res.file), backup: String(res.backup) });
  const p = parses();
  if (!p.ok) { parseErrors.push(`TSX invalide après ${res.rule} : ${p.error}`); break; }
}

const final = scanSources(undefined, root);
const backupDir = path.join(root, '.dig-doctor');
const backups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];

console.log(JSON.stringify({
  root,
  initialCount: initial.findings.length,
  initialByRule: initial.byRule,
  initialFindings: initial.findings.map(f => ({ rule: f.rule, file: f.file, line: f.line, endpoint: f.endpoint, httpStatus: f.httpStatus, autoFix: f.fix ? f.fix.kind : null })),
  appliedCount: applied.length,
  applied,
  backups,
  remaining: final.findings.length,
  remainingFindings: final.findings.map(f => ({ rule: f.rule, file: f.file, line: f.line, endpoint: f.endpoint })),
  parseErrors,
  finalSource: fs.readFileSync(target, 'utf-8')
}));
