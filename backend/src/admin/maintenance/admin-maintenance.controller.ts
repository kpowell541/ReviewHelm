import { Body, Controller, Get, Post } from '@nestjs/common';
import { AdminOnly } from '../../common/auth/admin.decorator';
import { AdminMaintenanceService } from './admin-maintenance.service';
import { RunCleanupDto } from './dto/run-cleanup.dto';

@Controller('admin/maintenance')
@AdminOnly()
export class AdminMaintenanceController {
  constructor(private readonly maintenanceService: AdminMaintenanceService) {}

  @Get('policy')
  async getPolicy() {
    return this.maintenanceService.getPolicy();
  }

  @Post('cleanup')
  async runCleanup(@Body() body: RunCleanupDto) {
    return this.maintenanceService.runCleanup(body);
  }
}
