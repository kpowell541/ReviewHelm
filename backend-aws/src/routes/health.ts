import { Hono } from 'hono';
import { checkDatabaseHealth } from '../db/client';

interface DependencyStatus {
  configured: boolean;
  healthy: boolean | null;
  detail: string;
}

function getDependencyStatuses() {
  const env = {
    databaseUrl: process.env.DATABASE_URL?.trim() ?? '',
    cacheRedisUrl: process.env.CACHE_REDIS_URL?.trim() ?? '',
  };

  const database: DependencyStatus = env.databaseUrl
    ? { configured: true, healthy: null, detail: 'Database health check not wired yet.' }
    : { configured: false, healthy: null, detail: 'DATABASE_URL is not configured.' };

  const cache: DependencyStatus = env.cacheRedisUrl
    ? { configured: true, healthy: null, detail: 'Cache health check not wired yet.' }
    : { configured: false, healthy: null, detail: 'CACHE_REDIS_URL is not configured.' };

  return { database, cache };
}

export function createHealthRouter() {
  const app = new Hono();

  app.get('/health', (c) =>
    c.json({
      ok: true,
      service: 'reviewhelm-api-aws',
      version: c.get('env').APP_VERSION,
      time: new Date().toISOString(),
      requestId: c.get('requestId'),
    }),
  );

  app.get('/health/ready', async (c) => {
    const checks = getDependencyStatuses();
    if (checks.database.configured) {
      try {
        checks.database.healthy = await checkDatabaseHealth();
        checks.database.detail = checks.database.healthy
          ? 'Database connectivity check passed.'
          : 'Database connectivity check failed.';
      } catch (error) {
        checks.database.healthy = false;
        checks.database.detail = error instanceof Error ? error.message : 'Database connectivity check failed.';
      }
    }

    const hasFailedConfiguredDependency = Object.values(checks).some(
      (check) => check.configured && check.healthy === false,
    );

    return c.json({
      ok: !hasFailedConfiguredDependency,
      service: 'reviewhelm-api-aws',
      checks,
      time: new Date().toISOString(),
      requestId: c.get('requestId'),
    });
  });

  return app;
}
