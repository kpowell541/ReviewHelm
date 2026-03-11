import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Req,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/types';
import { TierService } from './tier.service';
import { CreditService } from './credit.service';
import { StripeService } from './stripe.service';
import { RedisService } from '../common/redis/redis.service';
import { SubscriptionTopUpDto } from './dto/subscription-topup.dto';
import { SubscriptionSubscribeDto } from './dto/subscription-subscribe.dto';
import { SubscriptionPortalDto } from './dto/subscription-portal.dto';
import { CreditLedgerQueryDto } from './dto/credit-ledger-query.dto';

interface AuthRequest {
  user: AuthenticatedUser;
}

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly tierService: TierService,
    private readonly creditService: CreditService,
    private readonly stripeService: StripeService,
    private readonly redis: RedisService,
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
    @Query() query: CreditLedgerQueryDto,
  ) {
    return this.creditService.getLedger(req.user, query.limit ?? 50);
  }

  @Post('credits/topup')
  async topUp(
    @Req() req: AuthRequest,
    @Body() body: SubscriptionTopUpDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
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
    const validatedIdempotencyKey = await this.enforceIdempotency(
      req.user.supabaseUserId,
      'topup',
      idempotencyKey,
    );

    return this.stripeService.createTopUpCheckout(
      req.user,
      body.amountUsd as 1 | 5 | 10 | 20,
      body.successUrl,
      body.cancelUrl,
      validatedIdempotencyKey,
    );
  }

  @Post('subscribe')
  async subscribe(
    @Req() req: AuthRequest,
    @Body() body: SubscriptionSubscribeDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!this.stripeService.isConfigured()) {
      throw new HttpException(
        'Payment integration not yet available',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    const validatedIdempotencyKey = await this.enforceIdempotency(
      req.user.supabaseUserId,
      'subscribe',
      idempotencyKey,
    );

    return this.stripeService.createSubscriptionCheckout(
      req.user,
      body.plan,
      body.successUrl,
      body.cancelUrl,
      {
        trial: body.trial,
        idempotencyKey: validatedIdempotencyKey,
      },
    );
  }

  @Post('portal')
  async portal(
    @Req() req: AuthRequest,
    @Body() body: SubscriptionPortalDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!this.stripeService.isConfigured()) {
      throw new HttpException(
        'Payment integration not yet available',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    const validatedIdempotencyKey = await this.enforceIdempotency(
      req.user.supabaseUserId,
      'portal',
      idempotencyKey,
    );

    return this.stripeService.createPortalSession(req.user, body.returnUrl, validatedIdempotencyKey);
  }

  private async enforceIdempotency(
    userId: string | undefined,
    action: string,
    rawIdempotencyKey?: string,
  ): Promise<string | undefined> {
    if (!rawIdempotencyKey) return;
    const idempotencyKey = rawIdempotencyKey.trim();
    if (!/^[a-zA-Z0-9._-]{8,128}$/.test(idempotencyKey)) {
      throw new HttpException('Invalid idempotency key', HttpStatus.BAD_REQUEST);
    }

    const scopeId = userId ?? 'anonymous';
    const key = `idem:subscription:${scopeId}:${action}:${idempotencyKey}`;
    try {
      const accepted = await this.redis.trySetCooldown(key, Date.now().toString(), 60);
      if (!accepted) {
        throw new HttpException(
          'Duplicate request. Retry with a new idempotency key.',
          HttpStatus.CONFLICT,
        );
      }
    } catch (err) {
      // Re-throw intentional HTTP exceptions (e.g. duplicate key conflict).
      if (err instanceof HttpException) throw err;
      // If Redis is unavailable, fail open rather than blocking customer actions.
    }

    return idempotencyKey;
  }
}
