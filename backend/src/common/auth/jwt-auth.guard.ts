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

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksUrl: string;
  private readonly issuer: string;
  private readonly audience: string;
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
    this.adminUserIds = new Set(
      this.config
        .get('ADMIN_USER_IDS')
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean),
    );
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
      await this.audit.write({
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
      await this.audit.write({
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
        algorithms: ['RS256'],
      });
      return verified.payload as Record<string, unknown>;
    } catch {
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

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string | null {
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    if (!scheme || !value) return null;
    if (scheme.toLowerCase() !== 'bearer') return null;
    return value;
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
