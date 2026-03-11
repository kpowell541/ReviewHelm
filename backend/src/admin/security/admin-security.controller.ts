import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AdminOnly } from '../../common/auth/admin.decorator';
import type { AuthenticatedUser } from '../../common/auth/types';
import { AdminSecurityService } from './admin-security.service';
import { RotateProviderKeysDto } from './dto/rotate-provider-keys.dto';

@Controller('admin/security')
@AdminOnly()
export class AdminSecurityController {
  constructor(private readonly adminSecurityService: AdminSecurityService) {}

  @Get('key-rotation-status')
  async getKeyRotationStatus() {
    return this.adminSecurityService.getKeyRotationStatus();
  }

  @Post('rotate-provider-keys')
  async rotateProviderKeys(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RotateProviderKeysDto,
  ) {
    return this.adminSecurityService.rotateProviderKeys({
      actorSupabaseUserId: user.supabaseUserId,
      provider: body.provider,
      dryRun: body.dryRun,
    });
  }
}
