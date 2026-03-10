import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { AppEnv } from '../../config/env.schema';
import { IS_PUBLIC_KEY } from './constants';
import type { AuthenticatedUser } from './types';

/**
 * When STAGING_ACCESS_GATE=true, only admin and sponsored users may
 * access the API. All other authenticated users receive a 403.
 * Public endpoints (health, webhooks) are unaffected.
 */
@Injectable()
export class StagingAccessGuard implements CanActivate {
  private readonly enabled: boolean;
  private readonly sponsoredEmails: Set<string>;
  private readonly adminEmails: Set<string>;
  private readonly logger = new Logger(StagingAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppEnv, true>,
  ) {
    this.enabled = this.config.get('STAGING_ACCESS_GATE');
    this.sponsoredEmails = new Set(
      this.config
        .get('SPONSORED_EMAILS')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean),
    );
    this.adminEmails = new Set(
      this.config
        .get('ADMIN_DASHBOARD_ALLOWED_EMAILS')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean),
    );
    if (this.enabled) {
      this.logger.warn('Staging access gate is ENABLED — only admin/sponsored users may access the API');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.enabled) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) return true; // no user means JwtAuthGuard will handle it

    if (user.isAdmin) return true;

    const email = user.email?.toLowerCase();
    if (email && (this.adminEmails.has(email) || this.sponsoredEmails.has(email))) {
      return true;
    }

    throw new ForbiddenException(
      'ReviewHelm is currently in private staging. Only invited accounts have access.',
    );
  }
}
