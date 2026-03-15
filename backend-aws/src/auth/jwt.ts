import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from 'jose';
import { getEnv, getMachineAuthClientIds } from '../config/env';
import type { AuthPrincipal } from './types';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwksCache) return jwksCache;
  const env = getEnv();
  if (!env.COGNITO_JWKS_URL) {
    throw new Error('COGNITO_JWKS_URL is not configured.');
  }
  jwksCache = createRemoteJWKSet(new URL(env.COGNITO_JWKS_URL));
  return jwksCache;
}

function getGroups(payload: JWTPayload): string[] {
  const rawGroups = payload['cognito:groups'];
  if (Array.isArray(rawGroups)) {
    return rawGroups.filter((value): value is string => typeof value === 'string');
  }
  if (typeof rawGroups === 'string' && rawGroups.length > 0) {
    return [rawGroups];
  }
  return [];
}

function toPrincipal(payload: JWTPayload): AuthPrincipal {
  const env = getEnv();
  const clientId = typeof payload.client_id === 'string'
    ? payload.client_id
    : typeof payload.aud === 'string'
      ? payload.aud
      : null;
  const machineClientIds = getMachineAuthClientIds(env);
  const principalType = clientId && machineClientIds.includes(clientId) ? 'machine' : 'user';

  return {
    principalType,
    subject: String(payload.sub ?? ''),
    email: typeof payload.email === 'string' ? payload.email : null,
    groups: getGroups(payload),
    clientId,
    tokenUse: typeof payload.token_use === 'string' ? payload.token_use : null,
    claims: payload as Record<string, unknown>,
  };
}

export async function verifyAccessToken(token: string): Promise<AuthPrincipal> {
  const env = getEnv();
  if (!env.COGNITO_JWT_ISSUER || !env.COGNITO_JWT_AUDIENCE) {
    throw new Error('Cognito JWT validation settings are not configured.');
  }

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: env.COGNITO_JWT_ISSUER,
    audience: env.COGNITO_JWT_AUDIENCE,
    algorithms: ['RS256'],
  });

  return toPrincipal(payload);
}

export function isJwtValidationError(error: unknown): boolean {
  return error instanceof errors.JOSEError;
}
