import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { TierService } from './tier.service';
import { CreditService } from './credit.service';
import { StripeService } from './stripe.service';
import { StripeWebhookProcessor } from './stripe-webhook-processor.service';
import { CreditExpiryCron } from './credit-expiry.cron';
import { CreditExpiryWarningCron } from './credit-expiry-warning.cron';
import { SubscriptionController } from './subscription.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [PrismaModule, RedisModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionController, StripeWebhookController],
  providers: [TierService, CreditService, StripeWebhookProcessor, StripeService, CreditExpiryCron, CreditExpiryWarningCron],
  exports: [TierService, CreditService, StripeService],
})
export class SubscriptionModule {}
