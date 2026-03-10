import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';

/**
 * Expires unused credits at the end of each billing cycle.
 * Runs daily at midnight UTC and checks each user's billingCycleStart
 * to determine if their cycle has rolled over.
 */
@Injectable()
export class CreditExpiryCron {
  private readonly logger = new Logger(CreditExpiryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCreditExpiry() {
    this.logger.log('Starting daily credit expiry check');

    const now = new Date();

    // Find users whose billing cycle has ended (billingCycleStart + 1 month <= now)
    // and who have a positive credit balance
    const users = await this.prisma.user.findMany({
      where: {
        creditBalanceUsd: { gt: 0 },
        billingCycleStart: { not: null },
      },
      select: { id: true, billingCycleStart: true, creditBalanceUsd: true },
    });

    let expired = 0;
    let renewed = 0;

    for (const user of users) {
      if (!user.billingCycleStart) continue;

      const cycleEnd = new Date(user.billingCycleStart);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);

      if (now >= cycleEnd) {
        // Billing cycle has ended — expire remaining credits
        await this.creditService.expireCredits(user.id);
        expired++;

        // Reset billing cycle start to now
        await this.prisma.user.update({
          where: { id: user.id },
          data: { billingCycleStart: now },
        });
        renewed++;
      }
    }

    this.logger.log(
      `Credit expiry complete: ${expired} user(s) expired, ${renewed} cycle(s) renewed out of ${users.length} checked`,
    );
  }
}
