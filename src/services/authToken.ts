/**
 * AUTHENTIFICATION MODÉRATEUR — token de session + passcode.
 *
 * Après un login validé côté serveur (POST /api/auth/login), le navigateur
 * conserve un TOKEN DE SESSION signé (HMAC-SHA256, expiration 7 j) dans
 * `df_moderator_token`. Les appels API protégés envoient `Bearer <token>`
 * (ou le passcode en repli, compatible).
 *
 * SÉCURITÉ : aucun passcode faible en dur — si ni token ni passcode ne sont
 * connus, l'en-tête est vide et le serveur refuse (401).
 */

const TOKEN_KEY = 'df_moderator_token';
const PASSCODE_KEY = 'df_moderator_passcode';

function readLocal(key: string): string {
  try {
    return (typeof window !== 'undefined' ? window.localStorage.getItem(key) : null) || '';
  } catch {
    return '';
  }
}

function writeLocal(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : l'auth passera par le passcode saisi */
  }
}

/** En-tête Authorization pour les endpoints modérateur (token prioritaire). */
export function getAuthBearer(): string {
  const token = readLocal(TOKEN_KEY).trim();
  const passcode = readLocal(PASSCODE_KEY).trim();
  const credential = token || passcode;
  return credential ? `Bearer ${credential}` : '';
}

/** Y a-t-il uncredential modérateur connu dans ce navigateur ? */
export function hasModeratorCredential(): boolean {
  return Boolean(readLocal(TOKEN_KEY).trim() || readLocal(PASSCODE_KEY).trim());
}

/** Enregistre le token de session retourné par /api/auth/login (s'il existe). */
export function saveSessionToken(token: string | null | undefined): void {
  if (token) writeLocal(TOKEN_KEY, String(token));
}

/** Déconnexion : révocation côté serveur + effacement local (token et rôle). */
export async function logoutModerator(): Promise<void> {
  const bearer = getAuthBearer();
  try {
    if (bearer) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: bearer } : {}) },
        body: '{}'
      });
    }
  } catch {
    /* offline : la révocation échouera silencieusement (token à expiration 7 j) */
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem('df_user_role');
    }
  } catch {
    /* ignore */
  }
}
