import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionModule } from '../../subscription/subscription.module';
import { AdminCreditsController } from './admin-credits.controller';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [AdminCreditsController],
})
export class AdminCreditsModule {}
