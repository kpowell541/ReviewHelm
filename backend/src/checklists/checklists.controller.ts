import { Controller, Get, Param } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';

@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get()
  async listChecklists() {
    const items = await this.checklistsService.listChecklists();
    return { items };
  }

  @Get('version')
  async getChecklistVersion() {
    return this.checklistsService.getChecklistVersionSnapshot();
  }

  @Get(':id')
  async getChecklistById(@Param('id') id: string) {
    return this.checklistsService.getChecklistByIdOrThrow(id);
  }
}
