import { Module } from '@nestjs/common';
import { CalibrationModule } from '../calibration/calibration.module';
import { CommentProfilesModule } from '../comment-profiles/comment-profiles.module';
import { BudgetModule } from '../common/budget/budget.module';
import { CryptoModule } from '../common/crypto/crypto.module';
import { DiffsModule } from '../diffs/diffs.module';
import { RedisModule } from '../common/redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageModule } from '../usage/usage.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    PrismaModule,
    CryptoModule,
    RedisModule,
    UsageModule,
    DiffsModule,
    CommentProfilesModule,
    CalibrationModule,
    BudgetModule,
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
