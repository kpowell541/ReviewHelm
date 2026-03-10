import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminOnly } from '../../common/auth/admin.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/types';
import { CreditService } from '../../subscription/credit.service';
import { TierService } from '../../subscription/tier.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/credits')
@AdminOnly()
export class AdminCreditsController {
  constructor(
    private readonly creditService: CreditService,
    private readonly tierService: TierService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('users')
  async listUsers(
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : 50;
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        tier: true,
        creditBalanceUsd: true,
        billingCycleStart: true,
        trialEndsAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
    });
    return users.map((u) => ({
      ...u,
      creditBalanceUsd: Number(u.creditBalanceUsd),
      isAdmin: this.tierService.isAdminEmail(u.email ?? undefined),
      isSponsored: this.tierService.isSponsoredEmail(u.email ?? undefined),
    }));
  }

  @Get('users/:userId/ledger')
  async getUserLedger(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500) : 100;
    const entries = await this.prisma.creditLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
    });
    return entries.map((e) => ({
      id: e.id,
      type: e.type,
      amountUsd: Number(e.amountUsd),
      balanceAfter: Number(e.balanceAfter),
      description: e.description,
      createdAt: e.createdAt,
    }));
  }

  @Post('users/:userId/adjust')
  async adjustCredits(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() body: { amountUsd: number; description?: string },
  ) {
    if (typeof body.amountUsd !== 'number' || body.amountUsd === 0) {
      throw new HttpException('amountUsd must be a non-zero number', HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const result = await this.creditService.addCredits(
      userId,
      body.amountUsd,
      'admin_adjustment',
      body.description ?? `Admin adjustment by ${admin.email}`,
      { adjustedBy: admin.supabaseUserId },
    );

    return result;
  }

  @Post('users/:userId/tier')
  async setUserTier(
    @Param('userId') userId: string,
    @Body() body: { tier: string },
  ) {
    const validTiers = ['free', 'pro', 'premium', 'sponsored'];
    if (!validTiers.includes(body.tier)) {
      throw new HttpException(
        `tier must be one of: ${validTiers.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tier: body.tier as any },
      select: {
        id: true,
        email: true,
        tier: true,
        creditBalanceUsd: true,
      },
    });

    return {
      ...updated,
      creditBalanceUsd: Number(updated.creditBalanceUsd),
    };
  }
}
