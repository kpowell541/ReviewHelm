import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { UpdateBudgetConfigDto } from './dto/update-budget-config.dto';
import { UsageMonthQueryDto } from './dto/usage-month-query.dto';
import { OfficialCostQueryDto } from './dto/official-cost.dto';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('budget')
  async getBudgetConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.usageService.getBudgetConfig(user);
  }

  @Get('summary')
  async getUsageSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UsageMonthQueryDto,
  ) {
    return this.usageService.getUsageSummary(user, query.month);
  }

  @Get('by-feature')
  async getUsageByFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UsageMonthQueryDto,
  ) {
    return this.usageService.getUsageByFeature(user, query.month);
  }

  @Get('sessions/:sessionId')
  async getUsageBySession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.usageService.getSessionUsage(user, sessionId);
  }

  @Patch('budget')
  async updateBudgetConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateBudgetConfigDto,
  ) {
    return this.usageService.updateBudgetConfig(user, body);
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetUsage(@CurrentUser() user: AuthenticatedUser) {
    await this.usageService.resetUsage(user);
  }

  @Post('official-cost')
  async getOfficialCost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: OfficialCostQueryDto,
  ) {
    return this.usageService.getOfficialCost(user, body);
  }
}
