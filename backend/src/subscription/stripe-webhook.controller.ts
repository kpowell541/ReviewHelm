import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/auth/public.decorator';
import { StripeService } from './stripe.service';

/**
 * Stripe webhook endpoint. Must be public (no JWT) and receive raw body.
 * Raw body parsing is configured in main.ts for the webhook path.
 */
@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // req.body should be a Buffer thanks to the raw body parser in main.ts
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
      return;
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);
      await this.stripeService.handleWebhookEvent(event);
      res.status(HttpStatus.OK).json({ received: true });
    } catch (err: any) {
      this.logger.error(`Webhook error: ${err.message}`);
      res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
    }
  }
}
