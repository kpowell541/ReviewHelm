import {
  CanActivate,
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
import { slog } from '../logging';
import type { Response } from 'express';

interface RequestLike {
  path?: string;
  method?: string;
  ip?: string;
  requestId?: string;
  user?: AuthenticatedUser;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly apiLimit: number;
  private readonly aiLimit: number;
  private readonly aiCooldownSeconds: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {
    this.apiLimit = this.config.get('RATE_LIMIT_PER_MINUTE');
    this.aiLimit = this.config.get('AI_RATE_LIMIT_PER_MINUTE');
    this.aiCooldownSeconds = this.config.get('AI_COOLDOWN_SECONDS');
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
    const identity = req.user?.supabaseUserId ?? req.ip ?? 'anonymous';
    const isAiEndpoint = this.reflector.getAllAndOverride<boolean>(IS_AI_ENDPOINT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const now = new Date();
    const minuteBucket = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;

    const response = context.switchToHttp().getResponse<Response>();
    const isAiRoute = isAiEndpoint || this.looksLikeAiPath(req.path);
    const limit = isAiRoute ? this.aiLimit : this.apiLimit;

    const rateKey = `ratelimit:${isAiRoute ? 'ai' : 'api'}:${identity}:${minuteBucket}`;
    let hits: number;
    try {
      hits = await this.redis.incrementWithWindow(rateKey, 90);
    } catch {
      this.logSecurityEvent('rate_limit_redis_unavailable', req, {
        identity,
        path: req.path,
      });
      return true;
    }

    if (hits > limit) {
      const retryAfterSeconds = Math.max(1, 60 - now.getUTCSeconds());
      response.setHeader('Retry-After', String(retryAfterSeconds));
      response.setHeader('X-RateLimit-Limit', String(limit));
      response.setHeader('X-RateLimit-Remaining', '0');
      response.setHeader(
        'X-RateLimit-Reset',
        String(Math.floor(now.getTime() / 1000) + retryAfterSeconds),
      );
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
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please retry shortly.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (isAiRoute) {
      const cooldownSeconds = this.aiCooldownSeconds;
      const cooldownKey = `cooldown:ai:${identity}`;
      let cooldownSet = false;
      try {
        cooldownSet = await this.redis.trySetCooldown(
          cooldownKey,
          String(Date.now()),
          cooldownSeconds,
        );
      } catch {
        this.logSecurityEvent('cooldown_redis_unavailable', req, {
          identity,
          path: req.path,
        });
        return true;
      }
      if (!cooldownSet) {
        let ttl: number;
        try {
          ttl = await this.redis.getTtlSeconds(cooldownKey);
        } catch {
          this.logSecurityEvent('cooldown_ttl_redis_unavailable', req, {
            identity,
            path: req.path,
          });
          return true;
        }
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
        const retryAfterSeconds = Math.max(1, ttl);
        response.setHeader('Retry-After', String(retryAfterSeconds));
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: `Cooldown active. Please wait ${retryAfterSeconds}s before the next AI request.`,
            retryAfterSeconds,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    return true;
  }

  private looksLikeAiPath(path?: string): boolean {
    if (!path) {
      return false;
    }
    return /\/ai\//.test(path);
  }

  private logSecurityEvent(
    event: string,
    req: RequestLike,
    details: Record<string, unknown>,
  ): void {
    slog.warn('security_event', {
      event,
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      userId: req.user?.supabaseUserId,
      ...details,
    });
  }
}
