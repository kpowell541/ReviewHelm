import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { TierService } from './tier.service';
import { CreditService } from './credit.service';
import { CreditExpiryCron } from './credit-expiry.cron';
import { SubscriptionController } from './subscription.controller';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionController],
  providers: [TierService, CreditService, CreditExpiryCron],
  exports: [TierService, CreditService],
})
export class SubscriptionModule {}
