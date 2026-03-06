import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiffsController } from './diffs.controller';
import { DiffsService } from './diffs.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiffsController],
  providers: [DiffsService],
  exports: [DiffsService],
})
export class DiffsModule {}
