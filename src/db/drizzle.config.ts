import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.SQL_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.DB_USER || 'postgres',
    password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.DB_PASSWORD || 'password',
    database: process.env.SQL_DB_NAME || process.env.DB_NAME || 'applet',
    ssl: false,
  },
});
