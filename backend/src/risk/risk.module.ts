import { Module } from '@nestjs/common';
import { DiffsModule } from '../diffs/diffs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [PrismaModule, DiffsModule],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
