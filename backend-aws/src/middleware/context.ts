import type { MiddlewareHandler } from 'hono';
import { getAllowedOrigins, getEnv } from '../config/env';
import { createLogger } from '../lib/logger';
import { getRequestIdHeader } from '../lib/request-id';

export const contextMiddleware: MiddlewareHandler = async (c, next) => {
  const env = getEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const requestId = getRequestIdHeader(c.req.header('x-request-id'));

  c.set('env', env);
  c.set('logger', logger);
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);

  const origin = c.req.header('origin');
  const allowedOrigins = getAllowedOrigins(env);
  if (origin && allowedOrigins.includes(origin)) {
    c.header('access-control-allow-origin', origin);
    c.header('vary', 'Origin');
  }
  c.header('access-control-allow-headers', 'Authorization, Content-Type, Idempotency-Key, X-Request-ID, X-Device-ID');
  c.header('access-control-allow-methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');

  const startedAt = Date.now();

  if (c.req.method === 'OPTIONS') {
    c.status(204);
    return;
  }

  try {
    await next();
  } finally {
    logger.info('request.complete', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  }
};
