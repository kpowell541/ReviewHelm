import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/types';
import { TierService } from './tier.service';
import { CreditService } from './credit.service';
import { StripeService } from './stripe.service';

interface AuthRequest {
  user: AuthenticatedUser;
}

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly tierService: TierService,
    private readonly creditService: CreditService,
    private readonly stripeService: StripeService,
  ) {}

  @Get('tier')
  async getTier(@Req() req: AuthRequest) {
    return this.tierService.getTierInfo(req.user);
  }

  @Get('credits')
  async getCredits(@Req() req: AuthRequest) {
    return this.creditService.getBalance(req.user);
  }

  @Get('credits/ledger')
  async getLedger(
    @Req() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : 50;
    return this.creditService.getLedger(req.user, parsedLimit);
  }

  @Post('credits/topup')
  async topUp(
    @Req() req: AuthRequest,
    @Body() body: { amountUsd: number; successUrl: string; cancelUrl: string },
  ) {
    const allowed = [1, 5, 10];
    if (!allowed.includes(body.amountUsd)) {
      throw new HttpException(
        `Top-up amount must be one of: ${allowed.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const tierInfo = await this.tierService.getTierInfo(req.user);
    if (tierInfo.effectiveTier !== 'premium' && tierInfo.effectiveTier !== 'admin') {
      throw new HttpException(
        'AI credits are only available for Premium subscribers',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.stripeService.isConfigured()) {
      throw new HttpException(
        'Payment integration not yet available',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    return this.stripeService.createTopUpCheckout(
      req.user,
      body.amountUsd as 1 | 5 | 10,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('subscribe')
  async subscribe(
    @Req() req: AuthRequest,
    @Body() body: { plan: 'pro' | 'premium'; successUrl: string; cancelUrl: string },
  ) {
    if (!['pro', 'premium'].includes(body.plan)) {
      throw new HttpException(
        'Plan must be "pro" or "premium"',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.stripeService.isConfigured()) {
      throw new HttpException(
        'Payment integration not yet available',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    return this.stripeService.createSubscriptionCheckout(
      req.user,
      body.plan,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('portal')
  async portal(
    @Req() req: AuthRequest,
    @Body() body: { returnUrl: string },
  ) {
    if (!this.stripeService.isConfigured()) {
      throw new HttpException(
        'Payment integration not yet available',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    return this.stripeService.createPortalSession(req.user, body.returnUrl);
  }
}
