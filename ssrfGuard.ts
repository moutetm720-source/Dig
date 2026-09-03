/**
 * ssrfGuard.ts — Garde anti-SSRF partagée (server.ts + moteur Hermes).
 * - https uniquement
 * - blocage des hosts/IPs internes (metadata cloud, loopback, RFC1918, CGNAT...)
 * - validation DNS avant tout appel sortant
 */
import * as net from 'node:net';
import * as dns from 'node:dns/promises';

const BLOCKED_HOSTS = new Set([
  'metadata', 'metadata.google.internal', 'localhost', '169.254.169.254',
  '127.0.0.1', '0.0.0.0', '::1', 'ip6-localhost', 'ip6-loopback',
]);

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
  }
  return false;
}

export async function assertSafeOutbound(rawUrl: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error('URL invalide.');
  }
  if (u.protocol !== 'https:') {
    throw new Error('Seul le protocole https est autorisé pour les appels sortants.');
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    throw new Error('Destination interne bloquée.');
  }
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Adresse IP privée/interne bloquée.');
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new Error('Résolution DNS impossible pour cet hôte.');
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error('Résolution vers une adresse interne détectée — bloquée.');
    }
  }
}

/**
 * Validation de l'URL de base d'un fournisseur IA ajouté via le gestionnaire de tokens.
 * - https public : même règle SSRF que la navigation (assertSafeOutbound).
 * - http loopback UNIQUEMENT si opts.allowLoopback (endpoint local de confiance, ex. Ollama
 *   http://localhost:11434/v1) — exception explicite documentée (AUDIT_SECURITE.md P3.2).
 */
export async function assertProviderBaseUrl(rawUrl: string, opts: { allowLoopback?: boolean } = {}): Promise<void> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error('URL de base invalide.');
  }
  if (u.protocol === 'https:') {
    await assertSafeOutbound(rawUrl);
    return;
  }
  if (u.protocol === 'http:') {
    if (opts.allowLoopback) {
      const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return;
      throw new Error('Endpoint local : seul localhost/127.0.0.1 est autorisé en http.');
    }
    throw new Error('http non autorisé (https requis, ou endpoint local déclaré).');
  }
  throw new Error(`Protocole non autorisé : ${u.protocol} (https requis).`);
}
