import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BudgetService } from './budget.service';

@Module({
  imports: [PrismaModule],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
