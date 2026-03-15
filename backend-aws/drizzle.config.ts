import type { Config } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

loadEnv();

const databaseUrl = process.env.DATABASE_MIGRATIONS_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DATABASE_MIGRATIONS_URL must be set for Drizzle.');
}

export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
