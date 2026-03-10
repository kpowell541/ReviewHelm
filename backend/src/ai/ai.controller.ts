import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AiEndpoint } from '../common/ai/ai-endpoint.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/types';
import { RequiresTier } from '../common/subscription/requires-tier.decorator';
import { RequiresCredits } from '../common/subscription/requires-credits.decorator';
import { AiTutorDto } from './dto/ai-tutor.dto';
import { AiService } from './ai.service';

interface RequestWithBudget extends Request {
  aiBudget?: {
    requestedModel: 'haiku' | 'sonnet' | 'opus';
    resolvedModel: 'haiku' | 'sonnet' | 'opus';
    autoDowngraded: boolean;
  };
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tutor')
  @AiEndpoint('deep_dive')
  @RequiresTier('premium')
  @RequiresCredits()
  async tutor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AiTutorDto,
    @Req() req: RequestWithBudget,
  ) {
    return this.aiService.tutor(user, body, req.aiBudget);
  }
}
