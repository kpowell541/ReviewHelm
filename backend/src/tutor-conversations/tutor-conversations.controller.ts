import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RequiresTier } from '../common/subscription/requires-tier.decorator';
import { TutorConversationsService } from './tutor-conversations.service';

@RequiresTier('premium')
@Controller('tutor-conversations')
export class TutorConversationsController {
  constructor(
    private readonly service: TutorConversationsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listConversations(user);
  }

  @Put(':itemId')
  async upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() body: { messages: unknown[]; lastAccessed: string },
  ) {
    return this.service.upsertConversation(user, {
      itemId,
      messages: body.messages,
      lastAccessed: body.lastAccessed,
    });
  }

  @Put()
  async bulkUpsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      conversations: Array<{
        itemId: string;
        messages: unknown[];
        lastAccessed: string;
      }>;
    },
  ) {
    return this.service.bulkUpsert(user, body.conversations);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    await this.service.deleteConversation(user, itemId);
  }
}
