import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { AppEnv } from '../../config/env.schema';
import { AuditService } from '../audit/audit.service';
import { IS_PUBLIC_KEY } from './constants';
import type { AuthenticatedUser } from './types';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  path?: string;
  method?: string;
  user?: AuthenticatedUser;
  requestId?: string;
}

type JoseModule = typeof import('jose');
type RemoteJwkSet = ReturnType<JoseModule['createRemoteJWKSet']>;
type JwtAlgorithm = 'RS256' | 'ES256';

const SUPPORTED_JWT_ALGORITHMS = new Set<JwtAlgorithm>(['RS256', 'ES256']);
const JWT_CLOCK_SKEW_SECONDS = 60;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksUrl: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwtAlgorithms: JwtAlgorithm[];
  private readonly maxJwtAgeSeconds: number;
  private readonly requireSessionIdClaim: boolean;
  private readonly adminUserIds: Set<string>;
  private joseModulePromise: Promise<JoseModule> | null = null;
  private jwks: RemoteJwkSet | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly audit: AuditService,
  ) {
    this.jwksUrl = this.config.get('SUPABASE_JWKS_URL');
    this.issuer = this.config.get('SUPABASE_JWT_ISSUER');
    this.audience = this.config.get('SUPABASE_JWT_AUDIENCE');
    this.jwtAlgorithms = this.parseJwtAlgorithms(this.config.get('SUPABASE_JWT_ALGORITHMS'));
    this.maxJwtAgeSeconds = this.config.get('SUPABASE_MAX_JWT_AGE_SECONDS');
    this.requireSessionIdClaim = this.config.get('SUPABASE_REQUIRE_SESSION_ID_CLAIM');
    this.adminUserIds = new Set(
      this.config
        .get('ADMIN_USER_IDS')
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean),
    );

    if (this.jwtAlgorithms.length === 0) {
      throw new Error('SUPABASE_JWT_ALGORITHMS must include at least one supported algorithm');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestLike>();
    const authHeader = req.headers.authorization;
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      this.logAuthFailure(req, 'Missing bearer token');
      void this.audit.write({
        eventType: 'auth_failed',
        eventScope: 'security.auth',
        severity: 'warn',
        requestId: req.requestId,
        details: {
          reason: 'missing_bearer_token',
          path: req.path,
          method: req.method,
        },
      });
      throw new UnauthorizedException('Missing bearer token');
    }

    const userPayload = await this.verifyToken(token);
    const userId = userPayload && typeof userPayload.sub === 'string' ? userPayload.sub : null;
    const userEmail =
      userPayload && typeof userPayload.email === 'string'
        ? userPayload.email
        : undefined;
    if (!userPayload || !userId) {
      this.logAuthFailure(req, 'Invalid token');
      void this.audit.write({
        eventType: 'auth_failed',
        eventScope: 'security.auth',
        severity: 'warn',
        requestId: req.requestId,
        details: {
          reason: 'invalid_or_expired_token',
          path: req.path,
          method: req.method,
        },
      });
      throw new UnauthorizedException('Invalid or expired token');
    }

    const claimValidationError = this.validateSessionClaims(userPayload);
    if (claimValidationError) {
      this.logAuthFailure(req, `Invalid token claims: ${claimValidationError}`);
      void this.audit.write({
        eventType: 'auth_failed',
        eventScope: 'security.auth',
        severity: 'warn',
        requestId: req.requestId,
        details: {
          reason: claimValidationError,
          path: req.path,
          method: req.method,
        },
      });
      throw new UnauthorizedException('Invalid or expired token');
    }

    const roleClaim = this.extractRoles(userPayload);
    const isAdmin = roleClaim.includes('admin') || this.adminUserIds.has(userId);

    req.user = {
      supabaseUserId: userId,
      email: userEmail,
      isAdmin,
      rawClaims: userPayload as Record<string, unknown>,
    };

    return true;
  }

  private async verifyToken(token: string): Promise<Record<string, unknown> | null> {
    try {
      const jose = await this.loadJose();
      const jwks = await this.getJwks();
      const verified = await jose.jwtVerify(token, jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: this.jwtAlgorithms,
      });
      return verified.payload as Record<string, unknown>;
    } catch (err) {
      // Decode header without verification for diagnostics
      let tokenAlg: string | undefined;
      try {
        const jose = await this.loadJose();
        const decoded = jose.decodeProtectedHeader(token);
        tokenAlg = decoded.alg;
      } catch {
        // ignore decode errors
      }
      console.warn(
        JSON.stringify({
          level: 'warn',
          type: 'jwt_verify_failed',
          error: err instanceof Error ? err.message : String(err),
          errorName: err instanceof Error ? err.name : undefined,
          tokenAlg,
          issuer: this.issuer,
          audience: this.audience,
          jwksUrl: this.jwksUrl,
          at: new Date().toISOString(),
        }),
      );
      return null;
    }
  }

  private async loadJose(): Promise<JoseModule> {
    if (!this.joseModulePromise) {
      this.joseModulePromise = Function(
        'return import("jose")',
      )() as Promise<JoseModule>;
    }
    return this.joseModulePromise;
  }

  private async getJwks(): Promise<RemoteJwkSet> {
    if (!this.jwks) {
      const jose = await this.loadJose();
      this.jwks = jose.createRemoteJWKSet(new URL(this.jwksUrl));
    }
    return this.jwks;
  }

  private extractRoles(payload: Record<string, unknown>): string[] {
    const appMeta = payload.app_metadata;
    if (!appMeta || typeof appMeta !== 'object') {
      return [];
    }
    const roles = (appMeta as Record<string, unknown>).roles;
    if (!Array.isArray(roles)) {
      return [];
    }
    return roles.filter((role): role is string => typeof role === 'string');
  }

  private validateSessionClaims(payload: Record<string, unknown>): string | null {
    const issuedAt = payload.iat;
    if (typeof issuedAt !== 'number' || !Number.isFinite(issuedAt)) {
      return 'missing_iat_claim';
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (issuedAt > nowSeconds + JWT_CLOCK_SKEW_SECONDS) {
      return 'iat_in_future';
    }

    if (nowSeconds - issuedAt > this.maxJwtAgeSeconds) {
      return 'token_too_old';
    }

    if (this.requireSessionIdClaim) {
      const sessionId = payload.session_id;
      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        return 'missing_session_id_claim';
      }
    }

    return null;
  }

  private parseJwtAlgorithms(value: string): JwtAlgorithm[] {
    const parsed = value
      .split(',')
      .map((algorithm) => algorithm.trim().toUpperCase())
      .filter((algorithm): algorithm is JwtAlgorithm =>
        SUPPORTED_JWT_ALGORITHMS.has(algorithm as JwtAlgorithm),
      );

    return Array.from(new Set(parsed));
  }

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string | null {
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    if (!header) return null;
    const match = header.match(
      /^\s*Bearer\s+([A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2})\s*$/i,
    );
    if (!match) return null;
    const token = match[1];
    if (token.length > 4096) return null;
    if (token.split('.').length !== 3) return null;
    return token;
  }

  private logAuthFailure(req: RequestLike, reason: string): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        type: 'auth_failure',
        reason,
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        at: new Date().toISOString(),
      }),
    );
  }
}
