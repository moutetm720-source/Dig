import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres({
  host: process.env.SQL_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.SQL_USER || process.env.DB_USER || 'postgres',
  password: process.env.SQL_PASSWORD || process.env.DB_PASSWORD || 'password',
  database: process.env.SQL_DB_NAME || process.env.DB_NAME || 'applet',
  ssl: process.env.NODE_ENV === 'production' && !process.env.SQL_HOST ? 'require' : false,
});

export const db = drizzle({ client, schema });
