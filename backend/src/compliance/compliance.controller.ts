import { Controller, Get, Param } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('packs')
  async listPacks() {
    return this.complianceService.listPacks();
  }

  @Get('packs/:packId')
  async getPackById(@Param('packId') packId: string) {
    return this.complianceService.getPackById(packId);
  }
}
