import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { AppEnv } from '../../config/env.schema';
import { AuditService } from '../audit/audit.service';
import { IS_AI_ENDPOINT_KEY, IS_PUBLIC_KEY } from '../auth/constants';
import type { AuthenticatedUser } from '../auth/types';
import { RedisService } from './redis.service';

interface RequestLike {
  path?: string;
  method?: string;
  ip?: string;
  requestId?: string;
  user?: AuthenticatedUser;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestLike>();
    const identity = req.user?.supabaseUserId ?? req.ip ?? 'anonymous';
    const isAiEndpoint = this.reflector.getAllAndOverride<boolean>(IS_AI_ENDPOINT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const now = new Date();
    const minuteBucket = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(
      2,
      '0',
    )}${String(now.getUTCMinutes()).padStart(2, '0')}`;

    const isAiRoute = isAiEndpoint || this.looksLikeAiPath(req.path);
    const limit = isAiRoute
      ? this.config.get('AI_RATE_LIMIT_PER_MINUTE')
      : this.config.get('RATE_LIMIT_PER_MINUTE');

    const rateKey = `ratelimit:${isAiRoute ? 'ai' : 'api'}:${identity}:${minuteBucket}`;
    const hits = await this.redis.incrementWithWindow(rateKey, 90);

    if (hits > limit) {
      this.logSecurityEvent('rate_limited', req, { limit, hits });
      await this.audit.write({
        eventType: 'rate_limited',
        eventScope: 'security.ratelimit',
        severity: 'warn',
        requestId: req.requestId,
        details: {
          userId: req.user?.supabaseUserId,
          path: req.path,
          method: req.method,
          limit,
          hits,
        },
      });
      throw new HttpException(
        'Rate limit exceeded. Please retry shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (isAiRoute) {
      const cooldownSeconds = this.config.get('AI_COOLDOWN_SECONDS');
      const cooldownKey = `cooldown:ai:${identity}`;
      const accepted = await this.redis.trySetCooldown(
        cooldownKey,
        String(Date.now()),
        cooldownSeconds,
      );
      if (!accepted) {
        const ttl = await this.redis.getTtlSeconds(cooldownKey);
        this.logSecurityEvent('cooldown_block', req, { ttl });
        await this.audit.write({
          eventType: 'cooldown_block',
          eventScope: 'security.ratelimit',
          severity: 'warn',
          requestId: req.requestId,
          details: {
            userId: req.user?.supabaseUserId,
            path: req.path,
            method: req.method,
            ttl,
          },
        });
        throw new ConflictException(
          `Cooldown active. Please wait ${Math.max(1, ttl)}s before the next AI request.`,
        );
      }
    }

    return true;
  }

  private looksLikeAiPath(path?: string): boolean {
    if (!path) {
      return false;
    }
    return /\/(ai|learn)\//.test(path);
  }

  private logSecurityEvent(
    event: string,
    req: RequestLike,
    details: Record<string, unknown>,
  ): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        type: 'security_event',
        event,
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        userId: req.user?.supabaseUserId,
        details,
        at: new Date().toISOString(),
      }),
    );
  }
}
