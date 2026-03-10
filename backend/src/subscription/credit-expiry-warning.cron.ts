import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Checks daily for users whose credits will expire soon (7 days or 1 day)
 * and creates audit events that the frontend can poll for notifications.
 */
@Injectable()
export class CreditExpiryWarningCron {
  private readonly logger = new Logger(CreditExpiryWarningCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiryWarnings() {
    this.logger.log('Starting credit expiry warning check');

    const now = new Date();

    const users = await this.prisma.user.findMany({
      where: {
        creditBalanceUsd: { gt: 0 },
        billingCycleStart: { not: null },
      },
      select: { id: true, billingCycleStart: true, creditBalanceUsd: true },
    });

    let warned7 = 0;
    let warned1 = 0;

    for (const user of users) {
      if (!user.billingCycleStart) continue;

      const cycleEnd = new Date(user.billingCycleStart);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);

      const daysUntilExpiry = Math.ceil(
        (cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilExpiry === 7 || daysUntilExpiry === 1) {
        await this.prisma.auditEvent.create({
          data: {
            userId: user.id,
            eventType: 'credit_expiry_warning',
            eventScope: 'subscription.credits',
            severity: daysUntilExpiry === 1 ? 'warn' : 'info',
            details: {
              daysUntilExpiry,
              creditBalanceUsd: Number(user.creditBalanceUsd),
              expiresAt: cycleEnd.toISOString(),
            },
          },
        });

        if (daysUntilExpiry === 7) warned7++;
        if (daysUntilExpiry === 1) warned1++;
      }
    }

    this.logger.log(
      `Expiry warnings: ${warned7} at 7 days, ${warned1} at 1 day, out of ${users.length} checked`,
    );
  }
}
