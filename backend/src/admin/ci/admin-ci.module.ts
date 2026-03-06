import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SessionsModule } from '../../sessions/sessions.module';
import { AdminCiController } from './admin-ci.controller';
import { AdminCiService } from './admin-ci.service';

@Module({
  imports: [PrismaModule, SessionsModule],
  controllers: [AdminCiController],
  providers: [AdminCiService],
})
export class AdminCiModule {}
