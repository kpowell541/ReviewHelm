import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '../config/env';
import * as schema from './schema';

export type AppDb = PostgresJsDatabase<typeof schema>;

let sqlClient: postgres.Sql | null = null;
let dbClient: AppDb | null = null;

export function getSqlClient(): postgres.Sql {
  if (sqlClient) return sqlClient;
  const env = getEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  sqlClient = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
    idle_timeout: 5,
    connect_timeout: 5,
  });

  return sqlClient;
}

export function getDb(): AppDb {
  if (dbClient) return dbClient;
  dbClient = drizzle(getSqlClient(), { schema });
  return dbClient;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  const env = getEnv();
  if (!env.DATABASE_URL) return false;
  const sql = getSqlClient();
  const result = await sql`select 1 as ok`;
  return result.length === 1;
}
