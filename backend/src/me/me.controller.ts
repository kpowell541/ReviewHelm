import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { MeService } from './me.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getOrCreateCurrentUser(user);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getPreferences(user);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.meService.updatePreferences(user, body);
  }
}
