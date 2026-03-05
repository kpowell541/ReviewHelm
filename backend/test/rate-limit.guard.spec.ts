import { ConflictException, HttpException } from '@nestjs/common';
import { IS_AI_ENDPOINT_KEY, IS_PUBLIC_KEY } from '../src/common/auth/constants';
import { RateLimitGuard } from '../src/common/redis/rate-limit.guard';

describe('RateLimitGuard', () => {
  function createGuard(input?: {
    isPublic?: boolean;
    isAiEndpoint?: boolean;
    rateHits?: number;
    cooldownAccepted?: boolean;
    cooldownTtl?: number;
  }) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return input?.isPublic ?? false;
        if (key === IS_AI_ENDPOINT_KEY) return input?.isAiEndpoint ?? true;
        return undefined;
      }),
    } as any;

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'RATE_LIMIT_PER_MINUTE') return 120;
        if (key === 'AI_RATE_LIMIT_PER_MINUTE') return 20;
        if (key === 'AI_COOLDOWN_SECONDS') return 6;
        return undefined;
      }),
    } as any;

    const redis = {
      incrementWithWindow: jest.fn().mockResolvedValue(input?.rateHits ?? 1),
      trySetCooldown: jest.fn().mockResolvedValue(input?.cooldownAccepted ?? true),
      getTtlSeconds: jest.fn().mockResolvedValue(input?.cooldownTtl ?? 0),
    } as any;

    const audit = {
      write: jest.fn().mockResolvedValue(undefined),
    } as any;

    const guard = new RateLimitGuard(reflector, config, redis, audit);
    return { guard, redis, audit };
  }

  function createContext(requestOverrides?: Record<string, unknown>) {
    const req = {
      path: '/api/v1/ai/tutor',
      method: 'POST',
      ip: '127.0.0.1',
      requestId: 'req-1',
      user: {
        supabaseUserId: 'user-1',
        email: 'user@example.com',
        rawClaims: {},
      },
      ...(requestOverrides ?? {}),
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it('blocks AI requests while cooldown is active', async () => {
    const { guard, redis, audit } = createGuard({
      isAiEndpoint: true,
      cooldownAccepted: false,
      cooldownTtl: 4,
    });

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(redis.incrementWithWindow).toHaveBeenCalled();
    expect(redis.trySetCooldown).toHaveBeenCalled();
    expect(redis.getTtlSeconds).toHaveBeenCalled();
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'cooldown_block' }),
    );
  });

  it('returns 429 when request exceeds per-minute AI rate limit', async () => {
    const { guard, redis, audit } = createGuard({
      isAiEndpoint: true,
      rateHits: 21,
      cooldownAccepted: true,
    });

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(HttpException);

    expect(redis.incrementWithWindow).toHaveBeenCalled();
    expect(redis.trySetCooldown).not.toHaveBeenCalled();
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'rate_limited' }),
    );
  });
});
