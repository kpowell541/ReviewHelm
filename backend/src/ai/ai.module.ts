import { Module } from '@nestjs/common';
import { CalibrationModule } from '../calibration/calibration.module';
import { CommentProfilesModule } from '../comment-profiles/comment-profiles.module';
import { BudgetModule } from '../common/budget/budget.module';
import { DiffsModule } from '../diffs/diffs.module';
import { RedisModule } from '../common/redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageModule } from '../usage/usage.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    UsageModule,
    DiffsModule,
    CommentProfilesModule,
    CalibrationModule,
    BudgetModule,
    SubscriptionModule,
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
