import { Module } from '@nestjs/common';
import { ChecklistsModule } from '../../checklists/checklists.module';
import { AdminChecklistsController } from './admin-checklists.controller';

@Module({
  imports: [ChecklistsModule],
  controllers: [AdminChecklistsController],
})
export class AdminChecklistsModule {}
