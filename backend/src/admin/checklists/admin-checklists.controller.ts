import { Body, Controller, Post } from '@nestjs/common';
import { AdminOnly } from '../../common/auth/admin.decorator';
import { ChecklistsService } from '../../checklists/checklists.service';
import { PublishChecklistsDto } from './dto/publish-checklists.dto';

@Controller('admin/checklists')
@AdminOnly()
export class AdminChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post('publish')
  async publishChecklists(@Body() body: PublishChecklistsDto) {
    return this.checklistsService.publishChecklistVersions({
      version: body.version,
      byId: body.byId,
    });
  }
}
