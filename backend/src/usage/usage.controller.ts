import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { UpdateBudgetConfigDto } from './dto/update-budget-config.dto';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('budget')
  async getBudgetConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.usageService.getBudgetConfig(user);
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
}
