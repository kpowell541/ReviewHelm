import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RequiresTier } from '../common/subscription/requires-tier.decorator';
import { GapsQueryDto } from './dto/gaps-query.dto';
import { PutConfidenceDto } from './dto/put-confidence.dto';
import { GapsService, type GapBuckets } from './gaps.service';

@RequiresTier('pro')
@Controller('gaps')
export class GapsController {
  constructor(private readonly gapsService: GapsService) {}

  @Get()
  async getGaps(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GapsQueryDto,
  ): Promise<GapBuckets> {
    return this.gapsService.getGaps(user, query);
  }

  @Get('confidence')
  async getConfidence(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ histories: Record<string, unknown> }> {
    return this.gapsService.getConfidence(user);
  }

  @Put('confidence')
  async putConfidence(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PutConfidenceDto,
  ): Promise<{ ok: true }> {
    await this.gapsService.putConfidence(user, body.histories);
    return { ok: true };
  }
}
