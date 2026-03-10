import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RequiresTier } from '../common/subscription/requires-tier.decorator';
import { CalibrationService } from './calibration.service';
import { CalibrationSummaryQueryDto } from './dto/calibration-summary-query.dto';
import { SubmitCommentFeedbackDto } from './dto/submit-comment-feedback.dto';

@RequiresTier('starter')
@Controller('calibration')
export class CalibrationController {
  constructor(private readonly calibrationService: CalibrationService) {}

  @Post('feedback')
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SubmitCommentFeedbackDto,
  ) {
    return this.calibrationService.submitFeedback(user, body);
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalibrationSummaryQueryDto,
  ) {
    return this.calibrationService.getSummary(user, query.days ?? 30);
  }
}
