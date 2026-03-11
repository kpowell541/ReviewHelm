import { BadRequestException } from '@nestjs/common';
import { StripeService } from '../src/subscription/stripe.service';

describe('StripeService', () => {
  function createService(input?: {
    stripeSecret?: string;
    webhookSecret?: string;
    maxPayloadBytes?: number;
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
        return '';
      }),
    } as any;

    const prisma = {
      user: { update: jest.fn().mockResolvedValue(undefined) },
    } as any;

    const webhookProcessor = {
      handleWebhookEvent: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new StripeService(
      config,
      prisma,
      webhookProcessor,
    );

    return { service, webhookProcessor };
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

  it('delegates webhook event handling to processor', async () => {
    const { service, webhookProcessor } = createService();
    const event = { id: 'evt_test', type: 'charge.succeeded', data: { object: {} } } as any;

    await service.handleWebhookEvent(event);

    expect(webhookProcessor.handleWebhookEvent).toHaveBeenCalledWith(event);
  });

  it('reports as not configured when no secret key', () => {
    const { service } = createService({ stripeSecret: '' });
    expect(service.isConfigured()).toBe(false);
  });

  it('reports as configured when secret key is present', () => {
    const { service } = createService({ stripeSecret: 'sk_test_123' });
    expect(service.isConfigured()).toBe(true);
  });
});
