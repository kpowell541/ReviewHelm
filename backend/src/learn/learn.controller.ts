import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RequiresTier } from '../common/subscription/requires-tier.decorator';
import { GapsQueryDto } from '../gaps/dto/gaps-query.dto';
import { GapsService, type LearnQueue } from '../gaps/gaps.service';

@RequiresTier('pro')
@Controller('learn')
export class LearnController {
  constructor(private readonly gapsService: GapsService) {}

  @Get('queue')
  async getLearningQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GapsQueryDto,
  ): Promise<LearnQueue> {
    return this.gapsService.getLearnQueue(user, query);
  }
}
