import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RequiresTier } from '../common/subscription/requires-tier.decorator';
import { CreateDiffDto } from './dto/create-diff.dto';
import { DiffsService } from './diffs.service';

@RequiresTier('starter')
@Controller('diffs')
export class DiffsController {
  constructor(private readonly diffsService: DiffsService) {}

  @Post()
  async createFromText(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDiffDto,
  ) {
    return this.diffsService.createFromText(user, body);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 1_500_000,
      },
    }),
  )
  async createFromUpload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: { buffer?: Buffer; originalname?: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('No diff file uploaded');
    }
    const content = file.buffer?.toString('utf8') ?? '';
    if (!content) {
      throw new BadRequestException('Uploaded diff file is empty');
    }
    return this.diffsService.createFromUpload(user, {
      filename: file.originalname || 'uploaded.diff',
      content,
    });
  }

  @Get(':diffId')
  async getDiffById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diffId') diffId: string,
  ) {
    return this.diffsService.getDiffById(user, diffId);
  }
}
