import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackedPRsController } from './tracked-prs.controller';
import { TrackedPRsService } from './tracked-prs.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrackedPRsController],
  providers: [TrackedPRsService],
  exports: [TrackedPRsService],
})
export class TrackedPRsModule {}
