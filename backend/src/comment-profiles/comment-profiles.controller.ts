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
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { CommentProfilesService } from './comment-profiles.service';
import { CreateCommentProfileDto } from './dto/create-comment-profile.dto';
import { UpdateCommentProfileDto } from './dto/update-comment-profile.dto';

@Controller('comment-profiles')
export class CommentProfilesController {
  constructor(private readonly profilesService: CommentProfilesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.listProfiles(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCommentProfileDto,
  ) {
    return this.profilesService.createProfile(user, body);
  }

  @Patch(':profileId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
    @Body() body: UpdateCommentProfileDto,
  ) {
    return this.profilesService.updateProfile(user, profileId, body);
  }

  @Delete(':profileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
  ) {
    await this.profilesService.deleteProfile(user, profileId);
  }

  @Post(':profileId/activate')
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
  ) {
    return this.profilesService.activateProfile(user, profileId);
  }
}
