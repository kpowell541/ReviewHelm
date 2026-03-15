import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import { getAdminGroups } from '../config/env';
import { isJwtValidationError, verifyAccessToken } from './jwt';
import type { AuthPrincipal } from './types';

function parseBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    throw new HTTPException(401, { message: 'Missing Authorization header.' });
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HTTPException(401, { message: 'Authorization header must use Bearer token.' });
  }

  return token;
}

function hasAdminAccess(principal: AuthPrincipal, adminGroups: string[]): boolean {
  if (principal.principalType !== 'user') return false;
  return principal.groups.some((group) => adminGroups.includes(group));
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const logger = c.get('logger');
  const requestId = c.get('requestId');

  try {
    const token = parseBearerToken(c.req.header('authorization'));
    const principal = await verifyAccessToken(token);
    c.set('principal', principal);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    logger.warn('auth.failed', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      error: error instanceof Error ? error.message : String(error),
      isJwtValidationError: isJwtValidationError(error),
    });

    throw new HTTPException(401, { message: 'Invalid or expired access token.' });
  }
};

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  await requireAuth(c, async () => {
    const principal = c.get('principal');
    const adminGroups = getAdminGroups(c.get('env'));
    if (!hasAdminAccess(principal, adminGroups)) {
      throw new HTTPException(403, { message: 'Admin access is required.' });
    }
    await next();
  });
};
