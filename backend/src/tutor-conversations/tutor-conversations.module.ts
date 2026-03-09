import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TutorConversationsController } from './tutor-conversations.controller';
import { TutorConversationsService } from './tutor-conversations.service';

@Module({
  imports: [PrismaModule],
  controllers: [TutorConversationsController],
  providers: [TutorConversationsService],
  exports: [TutorConversationsService],
})
export class TutorConversationsModule {}
