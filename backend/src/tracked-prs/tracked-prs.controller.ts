import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { UpsertTrackedPRDto } from './dto/upsert-tracked-pr.dto';
import { TrackedPRsService } from './tracked-prs.service';

@Controller('tracked-prs')
export class TrackedPRsController {
  constructor(private readonly trackedPRsService: TrackedPRsService) {}

  @Get()
  async listPRs(@CurrentUser() user: AuthenticatedUser) {
    return this.trackedPRsService.listPRs(user);
  }

  @Get(':prId')
  async getPR(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
  ) {
    return this.trackedPRsService.getPR(user, prId);
  }

  @Put(':prId')
  async upsertPR(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body() body: UpsertTrackedPRDto,
  ) {
    // Ensure path param matches body id
    body.id = prId;
    return this.trackedPRsService.upsertPR(user, body);
  }

  @Delete(':prId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePR(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
  ) {
    await this.trackedPRsService.deletePR(user, prId);
  }
}
