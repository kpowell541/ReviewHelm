import { Module } from '@nestjs/common';
import { BudgetModule } from '../common/budget/budget.module';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [BudgetModule],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
