import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { PatchItemResponseDto } from './dto/patch-item-response.dto';
import { PatchSessionNotesDto } from './dto/patch-session-notes.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSessionDto,
  ) {
    return this.sessionsService.createSession(user, body);
  }

  @Get()
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSessionsQueryDto,
  ) {
    return this.sessionsService.listSessions(user, query);
  }

  @Get(':sessionId')
  async getSessionById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getSessionById(user, sessionId);
  }

  @Patch(':sessionId')
  async updateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateSessionDto,
  ) {
    return this.sessionsService.updateSession(user, sessionId, body);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionsService.deleteSession(user, sessionId);
  }

  @Patch(':sessionId/items/:itemId')
  async patchItemResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
    @Body() body: PatchItemResponseDto,
  ) {
    return this.sessionsService.patchItemResponse(user, sessionId, itemId, body);
  }

  @Patch(':sessionId/notes')
  async patchSessionNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() body: PatchSessionNotesDto,
  ) {
    return this.sessionsService.patchSessionNotes(user, sessionId, body.sessionNotes);
  }

  @Post(':sessionId/complete')
  async completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() body: CompleteSessionDto,
  ) {
    return this.sessionsService.completeSession(user, sessionId, body);
  }

  @Get(':sessionId/summary')
  async getSessionSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getSessionSummary(user, sessionId);
  }
}
