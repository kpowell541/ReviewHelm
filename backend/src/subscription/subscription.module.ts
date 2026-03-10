import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { TierService } from './tier.service';
import { CreditService } from './credit.service';
import { StripeService } from './stripe.service';
import { CreditExpiryCron } from './credit-expiry.cron';
import { SubscriptionController } from './subscription.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionController, StripeWebhookController],
  providers: [TierService, CreditService, StripeService, CreditExpiryCron],
  exports: [TierService, CreditService, StripeService],
})
export class SubscriptionModule {}
