import { Controller, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { BackupsService } from '../backups/backups.service';

@Controller('exports')
export class ExportsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post('sessions/:sessionId/pdf')
  async exportSessionPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.backupsService.exportSessionPdf(user, sessionId);
  }
}
