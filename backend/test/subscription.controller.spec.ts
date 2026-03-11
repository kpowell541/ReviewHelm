import { HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionController } from '../src/subscription/subscription.controller';

describe('SubscriptionController', () => {
  function createController(overrides?: {
    effectiveTier?: string;
    stripeConfigured?: boolean;
    redisTrySetResult?: boolean;
    redisThrow?: boolean;
  }) {
    const tierService = {
      getTierInfo: jest.fn().mockResolvedValue({
        effectiveTier: overrides?.effectiveTier ?? 'premium',
      }),
    } as any;

    const creditService = {
      getBalance: jest.fn().mockResolvedValue({ balanceUsd: 5, unlimited: false }),
      getLedger: jest.fn().mockResolvedValue([]),
    } as any;

    const stripeService = {
      isConfigured: jest.fn().mockReturnValue(overrides?.stripeConfigured ?? true),
      createTopUpCheckout: jest.fn().mockResolvedValue({ url: 'https://stripe.com/checkout' }),
      createSubscriptionCheckout: jest.fn().mockResolvedValue({ url: 'https://stripe.com/subscribe' }),
      createPortalSession: jest.fn().mockResolvedValue({ url: 'https://stripe.com/portal' }),
    } as any;

    const redis = {
      trySetCooldown: overrides?.redisThrow
        ? jest.fn().mockRejectedValue(new Error('redis down'))
        : jest.fn().mockResolvedValue(overrides?.redisTrySetResult ?? true),
    } as any;

    const controller = new SubscriptionController(
      tierService,
      creditService,
      stripeService,
      redis,
    );

    return { controller, tierService, creditService, stripeService, redis };
  }

  const authReq = { user: { supabaseUserId: 'u1', email: 'test@test.com', isAdmin: false, rawClaims: {} } };

  describe('idempotency enforcement', () => {
    it('accepts a valid idempotency key', async () => {
      const { controller, stripeService } = createController();

      await controller.topUp(
        authReq as any,
        { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
        'rh_abc12345_xyz',
      );

      expect(stripeService.createTopUpCheckout).toHaveBeenCalledWith(
        authReq.user,
        5,
        'https://app.com/ok',
        'https://app.com/cancel',
        'rh_abc12345_xyz',
      );
    });

    it('rejects invalid idempotency key format', async () => {
      const { controller } = createController();

      await expect(
        controller.topUp(
          authReq as any,
          { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
          'short',
        ),
      ).rejects.toThrow(HttpException);
    });

    it('rejects duplicate idempotency key', async () => {
      const { controller } = createController({ redisTrySetResult: false });

      await expect(
        controller.topUp(
          authReq as any,
          { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
          'rh_duplicate_key123',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.CONFLICT,
        }),
      );
    });

    it('fails open when Redis is unavailable', async () => {
      const { controller, stripeService } = createController({ redisThrow: true });

      await controller.topUp(
        authReq as any,
        { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
        'rh_redis_down_key',
      );

      expect(stripeService.createTopUpCheckout).toHaveBeenCalled();
    });

    it('skips idempotency when no key provided', async () => {
      const { controller, redis } = createController();

      await controller.topUp(
        authReq as any,
        { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
      );

      expect(redis.trySetCooldown).not.toHaveBeenCalled();
    });
  });

  describe('tier gating', () => {
    it('rejects top-up for non-premium users', async () => {
      const { controller } = createController({ effectiveTier: 'free' });

      await expect(
        controller.topUp(
          authReq as any,
          { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.FORBIDDEN,
        }),
      );
    });

    it('allows top-up for admin users', async () => {
      const { controller, stripeService } = createController({ effectiveTier: 'admin' });

      await controller.topUp(
        authReq as any,
        { amountUsd: 5, successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
      );

      expect(stripeService.createTopUpCheckout).toHaveBeenCalled();
    });
  });

  describe('stripe not configured', () => {
    it('returns 501 when Stripe is not configured', async () => {
      const { controller } = createController({ stripeConfigured: false });

      await expect(
        controller.subscribe(
          authReq as any,
          { plan: 'pro', successUrl: 'https://app.com/ok', cancelUrl: 'https://app.com/cancel' } as any,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.NOT_IMPLEMENTED,
        }),
      );
    });
  });
});
