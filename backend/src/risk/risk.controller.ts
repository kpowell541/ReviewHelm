import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RiskHeatmapQueryDto } from './dto/risk-heatmap-query.dto';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('sessions/:sessionId/heatmap')
  async getSessionHeatmap(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Query() query: RiskHeatmapQueryDto,
  ) {
    return this.riskService.getSessionHeatmap(user, sessionId, query);
  }
}
