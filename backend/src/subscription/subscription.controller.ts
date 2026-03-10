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

interface AuthRequest {
  user: AuthenticatedUser;
}

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly tierService: TierService,
    private readonly creditService: CreditService,
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
    @Body() body: { amountUsd: number },
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

    // TODO: integrate Stripe payment before adding credits
    // For now, this endpoint validates the request but doesn't charge
    throw new HttpException(
      'Payment integration not yet available',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
