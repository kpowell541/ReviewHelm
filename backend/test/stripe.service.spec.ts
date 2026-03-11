import { BadRequestException } from '@nestjs/common';
import { StripeService } from '../src/subscription/stripe.service';

describe('StripeService', () => {
  function createService(input?: {
    stripeSecret?: string;
    webhookSecret?: string;
    maxPayloadBytes?: number;
    eventTtlSeconds?: number;
    redis?: {
      getResult?: string | null;
      trySetCooldownResult?: boolean;
      commandResult?: unknown;
      throwGet?: Error;
      throwTrySetCooldown?: Error;
    };
  }) {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return input?.stripeSecret ?? '';
        if (key === 'STRIPE_WEBHOOK_SECRET') return input?.webhookSecret ?? 'whsec_test';
        if (key === 'NODE_ENV') return 'test';
        if (key === 'ALLOWED_ORIGINS') return 'https://reviewhelm.app';
        if (key === 'API_PUBLIC_URL') return 'https://api.reviewhelm.app';
        if (key === 'STRIPE_WEBHOOK_MAX_PAYLOAD_BYTES')
          return input?.maxPayloadBytes ?? 1_024;
        if (key === 'STRIPE_WEBHOOK_EVENT_TTL_SECONDS')
          return input?.eventTtlSeconds ?? 172_800;
        return '';
      }),
    } as any;

    const redis = {
      get: jest.fn().mockResolvedValue(input?.redis?.throwGet ? undefined : input?.redis?.getResult ?? null),
      trySetCooldown: jest
        .fn()
        .mockResolvedValue(
          input?.redis?.throwTrySetCooldown ? false : input?.redis?.trySetCooldownResult ?? true,
        ),
      command: jest.fn().mockResolvedValue(input?.redis?.commandResult ?? 'OK'),
      delete: jest.fn().mockResolvedValue(undefined),
    } as any;

    if (input?.redis?.throwGet) {
      redis.get.mockRejectedValue(input.redis.throwGet);
    }
    if (input?.redis?.throwTrySetCooldown) {
      redis.trySetCooldown.mockRejectedValue(input.redis.throwTrySetCooldown);
    }

    const creditService = { addCredits: jest.fn().mockResolvedValue(undefined) } as any;
    const tierService = { isPremium: jest.fn() } as any;
    const prisma = {
      user: { update: jest.fn().mockResolvedValue(undefined) },
    } as any;

    const service = new StripeService(
      config,
      prisma,
      creditService,
      tierService,
      redis,
    );

    return { service, redis };
  }

  it('rejects missing webhook payload data', () => {
    const { service } = createService({ stripeSecret: 'sk_test_123' });
    expect(() =>
      service.constructWebhookEvent(Buffer.from('', 'utf8'), 't=1,v1=abc'),
    ).toThrow(BadRequestException);
  });

  it('rejects webhook payloads larger than configured maximum', () => {
    const { service } = createService({ stripeSecret: 'sk_test_123', maxPayloadBytes: 4 });

    expect(() =>
      service.constructWebhookEvent(Buffer.from('12345'), 't=1,v1=abc'),
    ).toThrow(BadRequestException);
  });

  it('rejects webhook verification when webhook secret is not configured', async () => {
    const { service } = createService({ stripeSecret: 'sk_test_123', webhookSecret: '' });

    expect(() =>
      service.constructWebhookEvent(Buffer.from('{}'), 't=1,v1=abc'),
    ).toThrow(BadRequestException);
  });

  it('delegates valid webhook verification to Stripe', () => {
    const { service } = createService({ stripeSecret: 'sk_test_123' });
    const constructEvent = jest.fn().mockReturnValue({
      id: 'evt_ok',
      type: 'charge.succeeded',
      data: { object: {} },
    });
    (service as any).stripe = { webhooks: { constructEvent } } as any;

    const payload = Buffer.from('{"id":"evt_ok","type":"charge.succeeded"}');
    const signature = 't=1710000000,v1=aaaaaaaaaaaaaaaaaaaa';

    const event = service.constructWebhookEvent(payload, signature);

    expect(constructEvent).toHaveBeenCalledWith(payload, signature, 'whsec_test');
    expect(event).toEqual(
      expect.objectContaining({ id: 'evt_ok', type: 'charge.succeeded' }),
    );
  });

  it('skips events with duplicate IDs by replay guard state', async () => {
    const { service, redis } = createService({ redis: { getResult: 'processing' } });
    const processSpy = jest
      .spyOn(service as any, 'processWebhookEvent')
      .mockResolvedValue(undefined);
    const event = { id: 'evt_seen', type: 'charge.succeeded', data: { object: {} } } as any;

    await service.handleWebhookEvent(event);

    expect(redis.get).toHaveBeenCalledWith('stripe:webhook:event:evt_seen');
    expect(redis.trySetCooldown).not.toHaveBeenCalled();
    expect(processSpy).not.toHaveBeenCalled();
    expect(redis.command).not.toHaveBeenCalled();
  });

  it('processes events exactly once and stores replay state', async () => {
    const { service, redis } = createService();
    const processSpy = jest
      .spyOn(service as any, 'processWebhookEvent')
      .mockResolvedValue(undefined);
    const event = { id: 'evt_first', type: 'charge.succeeded', data: { object: {} } } as any;

    await service.handleWebhookEvent(event);

    expect(redis.get).toHaveBeenCalledWith('stripe:webhook:event:evt_first');
    expect(redis.trySetCooldown).toHaveBeenCalledWith(
      'stripe:webhook:event:evt_first',
      'processing',
      30,
    );
    expect(processSpy).toHaveBeenCalledWith(event);
    expect(redis.command).toHaveBeenCalledWith([
      'SET',
      'stripe:webhook:event:evt_first',
      'processed',
      'EX',
      172_800,
    ]);
    expect(redis.delete).not.toHaveBeenCalled();
  });

  it('clears processing lock when processing fails', async () => {
    const { service, redis } = createService();
    const failure = new Error('webhook failed');
    jest
      .spyOn(service as any, 'processWebhookEvent')
      .mockRejectedValue(failure);
    const event = { id: 'evt_fail', type: 'charge.succeeded', data: { object: {} } } as any;

    await expect(service.handleWebhookEvent(event)).rejects.toThrow('webhook failed');

    expect(redis.delete).toHaveBeenCalledWith('stripe:webhook:event:evt_fail');
    expect(redis.command).not.toHaveBeenCalledWith([
      'SET',
      'stripe:webhook:event:evt_fail',
      'processed',
      'EX',
      172_800,
    ]);
  });

  it('continues processing when replay-check state is unavailable', async () => {
    const { service, redis } = createService({
      redis: {
        throwGet: new Error('redis down'),
      },
    });
    const processSpy = jest
      .spyOn(service as any, 'processWebhookEvent')
      .mockResolvedValue(undefined);
    const event = { id: 'evt_down', type: 'charge.succeeded', data: { object: {} } } as any;

    await service.handleWebhookEvent(event);

    expect(redis.get).toHaveBeenCalledWith('stripe:webhook:event:evt_down');
    expect(redis.trySetCooldown).not.toHaveBeenCalled();
    expect(processSpy).toHaveBeenCalledWith(event);
    expect(redis.command).toHaveBeenCalledWith([
      'SET',
      'stripe:webhook:event:evt_down',
      'processed',
      'EX',
      172_800,
    ]);
  });
});
