import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/auth/types';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import { TierService } from './tier.service';

export interface CreditBalance {
  balanceUsd: number;
  unlimited: boolean;
}

export interface LedgerEntry {
  id: string;
  type: string;
  amountUsd: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tierService: TierService,
  ) {}

  async getBalance(authUser: AuthenticatedUser): Promise<CreditBalance> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const unlimited = this.tierService.hasUnlimitedCredits(
      user.email ?? undefined,
      Boolean(authUser.isAdmin),
    );
    return {
      balanceUsd: Number(user.creditBalanceUsd),
      unlimited,
    };
  }

  async canAffordAiCall(authUser: AuthenticatedUser): Promise<boolean> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    if (this.tierService.hasUnlimitedCredits(user.email ?? undefined, Boolean(authUser.isAdmin))) {
      return true;
    }
    if (user.tier !== 'premium') return false;
    return Number(user.creditBalanceUsd) > 0;
  }

  async deductCredits(
    authUser: AuthenticatedUser,
    amountUsd: number,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<CreditBalance> {
    const user = await upsertUserFromAuth(this.prisma, authUser);

    if (this.tierService.hasUnlimitedCredits(user.email ?? undefined, Boolean(authUser.isAdmin))) {
      return { balanceUsd: Number(user.creditBalanceUsd), unlimited: true };
    }

    const currentBalance = new Prisma.Decimal(user.creditBalanceUsd);
    const deduction = new Prisma.Decimal(amountUsd);
    const newBalance = currentBalance.minus(deduction);

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { creditBalanceUsd: newBalance },
      }),
      this.prisma.creditLedgerEntry.create({
        data: {
          userId: user.id,
          type: 'ai_usage',
          amountUsd: deduction.negated(),
          balanceAfter: newBalance,
          description: description ?? 'AI usage',
          metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      balanceUsd: Number(updatedUser.creditBalanceUsd),
      unlimited: false,
    };
  }

  async addCredits(
    userId: string,
    amountUsd: number,
    type: 'subscription_grant' | 'topup' | 'refund' | 'admin_adjustment',
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<CreditBalance> {
    const amount = new Prisma.Decimal(amountUsd);

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          creditBalanceUsd: { increment: amount },
        },
      }),
      this.prisma.creditLedgerEntry.create({
        data: {
          userId,
          type,
          amountUsd: amount,
          balanceAfter: 0, // placeholder, updated below
          description: description ?? type.replace(/_/g, ' '),
          metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        },
      }),
    ]);

    // Update the ledger entry with the actual balance after
    const lastEntry = await this.prisma.creditLedgerEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastEntry) {
      await this.prisma.creditLedgerEntry.update({
        where: { id: lastEntry.id },
        data: { balanceAfter: updatedUser.creditBalanceUsd },
      });
    }

    return {
      balanceUsd: Number(updatedUser.creditBalanceUsd),
      unlimited: false,
    };
  }

  async expireCredits(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const currentBalance = Number(user.creditBalanceUsd);
    if (currentBalance <= 0) return;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { creditBalanceUsd: 0 },
      }),
      this.prisma.creditLedgerEntry.create({
        data: {
          userId,
          type: 'expiry',
          amountUsd: new Prisma.Decimal(currentBalance).negated(),
          balanceAfter: 0,
          description: 'Monthly credit expiry',
        },
      }),
    ]);
  }

  async getLedger(
    authUser: AuthenticatedUser,
    limit = 50,
  ): Promise<LedgerEntry[]> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const entries = await this.prisma.creditLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
}
