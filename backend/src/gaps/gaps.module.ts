import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GapsController } from './gaps.controller';
import { GapsService } from './gaps.service';

@Module({
  imports: [PrismaModule],
  controllers: [GapsController],
  providers: [GapsService],
  exports: [GapsService],
})
export class GapsModule {}
