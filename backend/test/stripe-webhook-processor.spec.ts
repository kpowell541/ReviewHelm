import { StripeWebhookProcessor } from '../src/subscription/stripe-webhook-processor.service';
import type Stripe from 'stripe';

describe('StripeWebhookProcessor', () => {
  function createProcessor(overrides?: {
    redis?: {
      getResult?: string | null;
      trySetCooldownResult?: boolean;
      throwGet?: Error;
    };
  }) {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_WEBHOOK_EVENT_TTL_SECONDS') return 172_800;
        return '';
      }),
    } as any;

    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    const creditService = {
      addCredits: jest.fn().mockResolvedValue(undefined),
    } as any;

    const redis = {
      get: jest.fn().mockResolvedValue(overrides?.redis?.getResult ?? null),
      trySetCooldown: jest.fn().mockResolvedValue(overrides?.redis?.trySetCooldownResult ?? true),
      command: jest.fn().mockResolvedValue('OK'),
      delete: jest.fn().mockResolvedValue(undefined),
    } as any;

    if (overrides?.redis?.throwGet) {
      redis.get.mockRejectedValue(overrides.redis.throwGet);
    }

    const processor = new StripeWebhookProcessor(config, prisma, creditService, redis);

    return { processor, prisma, creditService, redis };
  }

  function makeEvent(type: string, id: string, data: Record<string, unknown> = {}): Stripe.Event {
    return { id, type, data: { object: data } } as unknown as Stripe.Event;
  }

  describe('replay protection', () => {
    it('skips events already processed', async () => {
      const { processor, redis } = createProcessor({ redis: { getResult: 'processed' } });
      const event = makeEvent('checkout.session.completed', 'evt_dup');

      await processor.handleWebhookEvent(event);

      expect(redis.get).toHaveBeenCalledWith('stripe:webhook:event:evt_dup');
      expect(redis.trySetCooldown).not.toHaveBeenCalled();
    });

    it('processes new events and marks them processed', async () => {
      const { processor, redis } = createProcessor();
      const event = makeEvent('customer.subscription.deleted', 'evt_new', {
        metadata: { userId: 'u1' },
      });

      await processor.handleWebhookEvent(event);

      expect(redis.trySetCooldown).toHaveBeenCalledWith(
        'stripe:webhook:event:evt_new',
        'processing',
        30,
      );
      expect(redis.command).toHaveBeenCalledWith([
        'SET',
        'stripe:webhook:event:evt_new',
        'processed',
        'EX',
        172_800,
      ]);
    });

    it('clears processing state on failure', async () => {
      const { processor, redis } = createProcessor();
      // Force processEvent to fail by using an event that triggers a handler error
      jest.spyOn(processor as any, 'processEvent').mockRejectedValue(new Error('fail'));
      const event = makeEvent('checkout.session.completed', 'evt_fail');

      await expect(processor.handleWebhookEvent(event)).rejects.toThrow('fail');

      expect(redis.delete).toHaveBeenCalledWith('stripe:webhook:event:evt_fail');
    });

    it('processes events without ID (no replay protection)', async () => {
      const { processor, redis } = createProcessor();
      const event = makeEvent('checkout.session.completed', '', {
        metadata: { userId: 'u1', type: 'topup', amountUsd: '5' },
      });
      (event as any).id = '';

      await processor.handleWebhookEvent(event);

      expect(redis.get).not.toHaveBeenCalled();
    });

    it('falls back to processing when Redis is unavailable', async () => {
      const { processor, redis } = createProcessor({
        redis: { throwGet: new Error('redis down') },
      });
      const event = makeEvent('customer.subscription.deleted', 'evt_down', {
        metadata: { userId: 'u1' },
      });

      await processor.handleWebhookEvent(event);

      expect(redis.get).toHaveBeenCalled();
      // Should still process and attempt to mark
      expect(redis.command).toHaveBeenCalled();
    });
  });

  describe('checkout completed', () => {
    it('credits top-up amount to user', async () => {
      const { processor, creditService } = createProcessor();
      const event = makeEvent('checkout.session.completed', 'evt_topup', {
        id: 'cs_123',
        metadata: { userId: 'u1', type: 'topup', amountUsd: '10' },
      });

      await processor.handleWebhookEvent(event);

      expect(creditService.addCredits).toHaveBeenCalledWith(
        'u1',
        10,
        'topup',
        'Stripe top-up $10',
        { stripeSessionId: 'cs_123' },
      );
    });

    it('ignores checkout without userId', async () => {
      const { processor, creditService } = createProcessor();
      const event = makeEvent('checkout.session.completed', 'evt_noid', {
        metadata: {},
      });

      await processor.handleWebhookEvent(event);

      expect(creditService.addCredits).not.toHaveBeenCalled();
    });
  });

  describe('subscription updated', () => {
    it('upgrades user tier on active subscription', async () => {
      const { processor, prisma } = createProcessor();
      const event = makeEvent('customer.subscription.updated', 'evt_up', {
        id: 'sub_123',
        status: 'active',
        customer: 'cus_abc',
        metadata: { userId: 'u1', plan: 'pro' },
        trial_end: null,
      });

      await processor.handleWebhookEvent(event);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            tier: 'pro',
            stripeCustomerId: 'cus_abc',
            stripeSubscriptionId: 'sub_123',
          }),
        }),
      );
    });

    it('grants credits for premium active subscription', async () => {
      const { processor, creditService } = createProcessor();
      const event = makeEvent('customer.subscription.updated', 'evt_prem', {
        id: 'sub_prem',
        status: 'active',
        customer: 'cus_abc',
        metadata: { userId: 'u1', plan: 'premium' },
        trial_end: null,
      });

      await processor.handleWebhookEvent(event);

      expect(creditService.addCredits).toHaveBeenCalledWith(
        'u1',
        7.5,
        'subscription_grant',
        'Premium subscription credit grant',
        { stripeSubscriptionId: 'sub_prem', status: 'active' },
      );
    });

    it('downgrades to free on non-active status', async () => {
      const { processor, prisma } = createProcessor();
      const event = makeEvent('customer.subscription.updated', 'evt_past', {
        id: 'sub_past',
        status: 'past_due',
        metadata: { userId: 'u1', plan: 'pro' },
      });

      await processor.handleWebhookEvent(event);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ tier: 'free' }),
        }),
      );
    });
  });

  describe('subscription deleted', () => {
    it('downgrades user to free tier', async () => {
      const { processor, prisma } = createProcessor();
      const event = makeEvent('customer.subscription.deleted', 'evt_del', {
        metadata: { userId: 'u1' },
      });

      await processor.handleWebhookEvent(event);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          tier: 'free',
          billingCycleStart: null,
          stripeSubscriptionId: null,
        },
      });
    });
  });
});
