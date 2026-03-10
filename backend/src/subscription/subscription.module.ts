import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TierService } from './tier.service';
import { CreditService } from './credit.service';
import { SubscriptionController } from './subscription.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionController],
  providers: [TierService, CreditService],
  exports: [TierService, CreditService],
})
export class SubscriptionModule {}
