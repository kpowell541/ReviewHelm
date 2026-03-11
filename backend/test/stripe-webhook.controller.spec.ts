import { BadRequestException } from '@nestjs/common';
import { StripeWebhookController } from '../src/subscription/stripe-webhook.controller';

function createController() {
  const stripeService = {
    constructWebhookEvent: jest.fn(),
    handleWebhookEvent: jest.fn(),
  } as any;

  return {
    controller: new StripeWebhookController(stripeService),
    stripeService,
  };
}

function createRequest(input?: {
  signature?: string | string[];
  contentType?: string | string[];
  rawBody?: Buffer;
}) {
  return {
    headers: {
      'stripe-signature': input?.signature,
      'content-type': input?.contentType,
    },
    rawBody: input?.rawBody,
  } as any;
}

describe('StripeWebhookController', () => {
  it('rejects missing stripe-signature header', async () => {
    const { controller, stripeService } = createController();
    const request = createRequest({ contentType: 'application/json', rawBody: Buffer.from('{}') });

    await expect(controller.handleWebhook(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripeService.constructWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects invalid stripe-signature header values', async () => {
    const { controller, stripeService } = createController();
    const request = createRequest({
      signature: 'invalid-signature',
      contentType: 'application/json',
      rawBody: Buffer.from('{}'),
    });

    await expect(controller.handleWebhook(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripeService.constructWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects non-json content types', async () => {
    const { controller, stripeService } = createController();
    const request = createRequest({
      signature: 't=1710000000,v1=aaaaaaaaaaaaaaaaaaaa',
      contentType: 'text/plain',
      rawBody: Buffer.from('{}'),
    });

    await expect(controller.handleWebhook(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripeService.constructWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects missing raw body', async () => {
    const { controller, stripeService } = createController();
    const request = createRequest({
      signature: 't=1710000000,v1=aaaaaaaaaaaaaaaaaaaa',
      contentType: 'application/json',
    });

    await expect(controller.handleWebhook(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripeService.constructWebhookEvent).not.toHaveBeenCalled();
  });

  it('constructs and handles a valid webhook event', async () => {
    const { controller, stripeService } = createController();
    const rawBody = Buffer.from('{"id":"evt_1","type":"checkout.session.completed"}');
    const signature = 't=1710000000,v1=aaaaaaaaaaaaaaaaaaaa';
    const event = { id: 'evt_1', type: 'checkout.session.completed', data: { object: {} } };
    stripeService.constructWebhookEvent.mockReturnValue(event);

    const result = await controller.handleWebhook(
      createRequest({
        signature,
        contentType: 'application/json; charset=utf-8',
        rawBody,
      }),
    );

    expect(stripeService.constructWebhookEvent).toHaveBeenCalledWith(rawBody, signature);
    expect(stripeService.handleWebhookEvent).toHaveBeenCalledWith(event);
    expect(result).toEqual({ received: true });
  });

  it('wraps downstream webhook processing errors as bad requests', async () => {
    const { controller, stripeService } = createController();
    const request = createRequest({
      signature: 't=1710000000,v1=aaaaaaaaaaaaaaaaaaaa',
      contentType: 'application/json',
      rawBody: Buffer.from('{}'),
    });
    stripeService.constructWebhookEvent.mockImplementation(() => {
      throw new Error('invalid event');
    });

    await expect(controller.handleWebhook(request)).rejects.toMatchObject({
      response: { message: 'invalid event' },
    });
    expect(stripeService.handleWebhookEvent).not.toHaveBeenCalled();
  });
});
