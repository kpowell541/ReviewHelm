import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import { AdminMaintenanceService } from './admin-maintenance.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMaintenanceController],
  providers: [AdminMaintenanceService],
})
export class AdminMaintenanceModule {}
