import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommentProfilesController } from './comment-profiles.controller';
import { CommentProfilesService } from './comment-profiles.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommentProfilesController],
  providers: [CommentProfilesService],
  exports: [CommentProfilesService],
})
export class CommentProfilesModule {}
