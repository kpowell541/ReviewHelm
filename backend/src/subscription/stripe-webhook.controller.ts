import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/auth/public.decorator';
import { StripeService } from './stripe.service';

/**
 * Stripe webhook endpoint. Must be public (no JWT) and receive raw body.
 * Raw body parsing is configured in main.ts for the webhook path.
 */
@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private static readonly contentTypeRegex = /^\s*application\/json(?:;.*)?$/i;

  constructor(private readonly stripeService: StripeService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
  ): Promise<{ received: true }> {
    const signature = this.getSingleHeader(req.headers['stripe-signature']);
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!this.isValidStripeSignatureHeader(signature)) {
      throw new BadRequestException('Invalid stripe-signature header');
    }

    const contentType = this.getSingleHeader(req.headers['content-type']);
    if (!contentType || !StripeWebhookController.contentTypeRegex.test(contentType)) {
      throw new BadRequestException('Invalid webhook content-type');
    }

    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);
      await this.stripeService.handleWebhookEvent(event);
      return { received: true };
    } catch (err: any) {
      this.logger.error(`Webhook error: ${err.message}`);
      throw new BadRequestException(
        typeof err?.message === 'string' ? err.message : 'Unable to process webhook',
      );
    }
  }

  private getSingleHeader(
    value: string | string[] | undefined,
  ): string | null {
    if (!value) {
      return null;
    }
    const next = Array.isArray(value) ? value[0] : value;
    if (!next) {
      return null;
    }
    const trimmed = next.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isValidStripeSignatureHeader(signature: string): boolean {
    const segments = signature
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);

    const timestamp = segments.find((segment) => segment.startsWith('t='));
    const hasValidTimestamp = !!timestamp && /^t=\d+$/.test(timestamp);
    const hasValidV1 = segments.some((segment) => /^v1=[A-Fa-f0-9]{20,}$/i.test(segment));

    return hasValidTimestamp && hasValidV1;
  }
}
