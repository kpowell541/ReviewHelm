import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { BackupImportDto } from './dto/backup-import.dto';
import { BackupsService } from './backups.service';

@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post('export')
  async exportBackup(@CurrentUser() user: AuthenticatedUser) {
    return this.backupsService.exportBackup(user);
  }

  @Post('import')
  @HttpCode(HttpStatus.ACCEPTED)
  async importBackup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BackupImportDto,
  ) {
    return this.backupsService.importBackup(
      user,
      body.sourceUrl.trim(),
      body.signature,
      body.signatureTimestamp,
    );
  }
}
