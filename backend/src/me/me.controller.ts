import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { MeService } from './me.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpsertAnthropicKeyDto } from './dto/upsert-anthropic-key.dto';

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

  @Get('api-keys/anthropic')
  async getAnthropicKeyStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getAnthropicKeyStatus(user);
  }

  @Put('api-keys/anthropic')
  @HttpCode(HttpStatus.NO_CONTENT)
  async upsertAnthropicKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertAnthropicKeyDto,
  ) {
    await this.meService.upsertAnthropicKey(user, body.apiKey);
  }

  @Delete('api-keys/anthropic')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnthropicKey(@CurrentUser() user: AuthenticatedUser) {
    await this.meService.deleteAnthropicKey(user);
  }
}
