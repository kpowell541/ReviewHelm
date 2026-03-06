import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { GapsQueryDto } from './dto/gaps-query.dto';
import { GapsService, type GapBuckets } from './gaps.service';

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
}
