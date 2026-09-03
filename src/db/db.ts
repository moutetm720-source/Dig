import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/**
 * Connexion PostgreSQL.
 *
 * Précédence des paramètres :
 *   1) DATABASE_URL (ou SQL_URL) : chaîne complète
 *      postgresql://user:pass@host:port/db?sslmode=require
 *      → c'est ce que Render injecte automatiquement quand la base est
 *        « liée » au service (ou ce que l'on met dans .env).
 *   2) Variables individuelles DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
 *      (+ DB_SSL), avec repli sur le préfixe SQL_*.
 *
 * SSL : explicite (DB_SSL / sslmode dans l'URL) > hôte Render (toujours
 * requis) > production (require) > dev (off). Render exige sslmode=require.
 *
 * NB : `dotenv/config` (chargé par server.ts) ne surcharge PAS une variable
 * déjà définie dans l'environnement du processus → les variables injectées
 * par la plateforme (Render) priment sur le .env local.
 */
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: false | 'require';
}

/** Résout la config DB depuis l'environnement (testable sans réseau). */
export function resolveDbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const url = env.DATABASE_URL || env.SQL_URL;
  const isProd = env.NODE_ENV === 'production';

  let host = env.DB_HOST || env.SQL_HOST || 'localhost';
  let port = Number(env.DB_PORT || env.SQL_PORT || 5432);
  let user = env.DB_USER || env.SQL_USER || 'postgres';
  let password = env.DB_PASSWORD || env.SQL_PASSWORD || 'password';
  let database = env.DB_NAME || env.SQL_DB_NAME || 'applet';
  let sslMode = (env.DB_SSL || env.SQL_SSL || '').toLowerCase();

  if (url) {
    try {
      const u = new URL(url);
      host = u.hostname || host;
      port = u.port ? Number(u.port) : 5432;
      if (u.username) user = decodeURIComponent(u.username);
      if (u.password) password = decodeURIComponent(u.password);
      const dbFromPath = (u.pathname || '').replace(/^\//, '');
      if (dbFromPath) database = dbFromPath;
      const sm = (u.searchParams.get('sslmode') || '').toLowerCase();
      if (sm) sslMode = sm;
    } catch (e) {
      console.error('[db] DATABASE_URL illisible — repli sur DB_* :', (e as Error).message);
    }
  }

  const hostIsRender = /\.render\.com$/i.test(host);
  const ssl: false | 'require' =
    sslMode === 'disable' ? false
    : sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full' ? 'require'
    : (isProd || hostIsRender) ? 'require'
    : false;

  return { host, port, user, password, database, ssl };
}

function buildClient() {
  const { host, port, user, password, database, ssl } = resolveDbConfig();
  const client = postgres({
    host,
    port,
    user,
    password,
    database,
    ssl,
    max: 10,
    idle_timeout: 30,
    connect_timeout: 30,
    // Render (et certains proxies) émettent des notices de démarrage — on ne les loggue pas.
    onnotice: () => {},
  });
  return client;
}

const client = buildClient();
export const db = drizzle({ client, schema });
