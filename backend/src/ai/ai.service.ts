import { createHash } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeyCryptoService } from '../common/crypto/key-crypto.service';
import type { AuthenticatedUser } from '../common/auth/types';
import { RedisService } from '../common/redis/redis.service';
import { UsageService } from '../usage/usage.service';
import { DiffsService, type DiffGroundingContext } from '../diffs/diffs.service';
import { CommentProfilesService } from '../comment-profiles/comment-profiles.service';
import { CalibrationService } from '../calibration/calibration.service';
import { BudgetService } from '../common/budget/budget.service';
import type { AiTutorDto } from './dto/ai-tutor.dto';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const RESPONSE_CACHE_TTL_SECONDS = 60 * 60 * 6;
type ClaudeModelChoice = 'haiku' | 'sonnet' | 'opus';

interface AiBudgetMeta {
  requestedModel: ClaudeModelChoice;
  resolvedModel: ClaudeModelChoice;
  autoDowngraded: boolean;
}

interface AnthropicResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: ClaudeModelChoice;
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keyCrypto: KeyCryptoService,
    private readonly redis: RedisService,
    private readonly usageService: UsageService,
    private readonly diffsService: DiffsService,
    private readonly profilesService: CommentProfilesService,
    private readonly calibrationService: CalibrationService,
    private readonly budgetService: BudgetService,
  ) {}

  async tutor(
    authUser: AuthenticatedUser,
    dto: AiTutorDto,
    budgetMeta?: AiBudgetMeta,
  ) {
    const user = await this.ensureUser(authUser);
    const key = await this.prisma.providerKey.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'anthropic',
        },
      },
    });
    if (!key) {
      throw new BadRequestException('No Anthropic API key configured for this user.');
    }

    const apiKey = await this.keyCrypto.decryptSecret({
      keyProvider: key.kmsKeyId ? 'aws_kms' : 'local',
      keyVersion: key.kekVersion,
      kmsKeyId: key.kmsKeyId,
      encryptedDek: key.encryptedDek,
      ciphertext: key.ciphertext,
      iv: key.iv,
      authTag: key.authTag,
    });

    const fallbackModel = this.defaultModelForFeature(dto.feature);
    const requestedModel = budgetMeta?.requestedModel ?? dto.model ?? fallbackModel;
    let resolvedModel = budgetMeta?.resolvedModel ?? dto.model ?? fallbackModel;

    const diffContext =
      dto.feature === 'comment-drafter'
        ? await this.diffsService.buildGroundingContext(authUser, {
            diffId: dto.diffId,
            diffText: dto.diffText,
          })
        : null;
    const activeProfile =
      dto.feature === 'comment-drafter'
        ? await this.profilesService.getActiveOrRequestedProfile(
            authUser,
            dto.commentStyleProfileId,
          )
        : null;
    const personalGuidance =
      dto.feature === 'comment-drafter'
        ? await this.calibrationService.buildPersonalGuidance(authUser)
        : '';

    const system = this.buildSystemPrompt(dto, {
      diffContext,
      styleProfile: activeProfile,
      personalGuidance,
    });
    const messageBody = dto.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const allowCache = dto.allowResponseCache !== false;
    const diffSignature = dto.diffId
      ? `diffId:${dto.diffId}`
      : dto.diffText
        ? `diffHash:${createHash('sha256').update(dto.diffText).digest('hex')}`
        : 'none';
    const cacheKey = allowCache
      ? this.buildCacheKey({
          userId: user.id,
          feature: dto.feature,
          model: resolvedModel,
          role: dto.role,
          itemId: dto.itemId,
          confidence: dto.confidence,
          diffSignature,
          styleProfileId: activeProfile?.id ?? 'none',
          messages: messageBody,
        })
      : null;
    if (cacheKey) {
      const cached = await this.redis.command<string>(['GET', cacheKey]);
      if (cached) {
        const payload = JSON.parse(cached) as {
          content: string;
          inputTokens: number;
          outputTokens: number;
          costUsd: number;
          resolvedModel: ClaudeModelChoice;
          autoEscalated?: boolean;
        };
        return {
          content: payload.content,
          requestedModel,
          resolvedModel: payload.resolvedModel,
          autoDowngraded: budgetMeta?.autoDowngraded ?? false,
          autoEscalated: payload.autoEscalated ?? false,
          cached: true,
          inputTokens: payload.inputTokens,
          outputTokens: payload.outputTokens,
          costUsd: payload.costUsd,
          cooldownRemainingMs: 0,
        };
      }
    }

    const first = await this.requestAnthropic({
      apiKey,
      model: resolvedModel,
      dto,
      system,
      messageBody,
    });

    await this.usageService.recordUsage({
      authUser,
      model: first.model,
      feature: dto.feature,
      inputTokens: first.inputTokens,
      outputTokens: first.outputTokens,
      sessionId: dto.sessionId ?? null,
    });

    let final = first;
    let autoEscalated = false;

    if (
      this.shouldAutoEscalate({
        dto,
        resolvedModel,
        content: first.content,
        diffContext,
      })
    ) {
      const escalationDecision = await this.budgetService.enforceAiBudgetPolicy(
        authUser,
        'sonnet',
      );
      if (!escalationDecision.block) {
        const escalated = await this.requestAnthropic({
          apiKey,
          model: escalationDecision.resolvedModel,
          dto,
          system: `${system}\n\nSecond pass instruction: tighten technical precision and actionability.`,
          messageBody,
        });
        await this.usageService.recordUsage({
          authUser,
          model: escalated.model,
          feature: dto.feature,
          inputTokens: escalated.inputTokens,
          outputTokens: escalated.outputTokens,
          sessionId: dto.sessionId ?? null,
        });
        final = {
          content: escalated.content,
          inputTokens: first.inputTokens + escalated.inputTokens,
          outputTokens: first.outputTokens + escalated.outputTokens,
          costUsd: Number((first.costUsd + escalated.costUsd).toFixed(6)),
          model: escalated.model,
        };
        resolvedModel = escalated.model;
        autoEscalated = true;
      }
    }

    if (cacheKey) {
      await this.redis.command([
        'SET',
        cacheKey,
        JSON.stringify({
          content: final.content,
          inputTokens: final.inputTokens,
          outputTokens: final.outputTokens,
          costUsd: final.costUsd,
          resolvedModel,
          autoEscalated,
        }),
        'EX',
        RESPONSE_CACHE_TTL_SECONDS,
      ]);
    }

    return {
      content: final.content,
      requestedModel,
      resolvedModel,
      autoDowngraded: budgetMeta?.autoDowngraded ?? false,
      autoEscalated,
      cached: false,
      inputTokens: final.inputTokens,
      outputTokens: final.outputTokens,
      costUsd: final.costUsd,
      cooldownRemainingMs: 0,
    };
  }

  private async requestAnthropic(args: {
    apiKey: string;
    model: ClaudeModelChoice;
    dto: AiTutorDto;
    system: string;
    messageBody: Array<{ role: string; content: string }>;
  }): Promise<AnthropicResult> {
    const requestBody = {
      model: this.toAnthropicModelId(args.model),
      max_tokens: this.maxTokensByRole(args.dto.role),
      system: args.system,
      messages: args.messageBody,
    };

    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': ANTHROPIC_VERSION,
        'x-api-key': args.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Anthropic request failed (${response.status})${body ? `: ${body.slice(0, 300)}` : ''}`,
      );
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = payload.content?.find((part) => part.type === 'text')?.text?.trim() ?? '';
    if (!content) {
      throw new BadGatewayException('Anthropic response did not contain text content');
    }

    const inputTokens = Number(payload.usage?.input_tokens ?? 0);
    const outputTokens = Number(payload.usage?.output_tokens ?? 0);
    const costUsd = this.estimateCostUsd(args.model, inputTokens, outputTokens);

    return {
      content,
      inputTokens,
      outputTokens,
      costUsd,
      model: args.model,
    };
  }

  private buildSystemPrompt(
    dto: AiTutorDto,
    input: {
      diffContext: DiffGroundingContext | null;
      styleProfile: {
        id: string;
        name: string;
        tone: string;
        strictness: number;
        verbosity: number;
        includePraise: boolean;
        includeActionItems: boolean;
      } | null;
      personalGuidance: string;
    },
  ): string {
    const lines = [
      'You are ReviewHelm tutor, focused on high-signal code review guidance.',
      `Feature: ${dto.feature}`,
      `Role: ${dto.role}`,
      `Stack: ${dto.stackLabel}`,
      `Item: ${dto.itemText}`,
      `User confidence (1-5): ${dto.confidence}`,
      'Be concise, correct, and specific. Prefer practical examples and verification steps.',
    ];

    if (input.styleProfile && dto.feature === 'comment-drafter') {
      lines.push(`Comment profile: ${input.styleProfile.name}`);
      lines.push(`Tone: ${input.styleProfile.tone}`);
      lines.push(`Strictness (1-5): ${input.styleProfile.strictness}`);
      lines.push(`Verbosity (1-5): ${input.styleProfile.verbosity}`);
      lines.push(`Include praise: ${input.styleProfile.includePraise ? 'yes' : 'no'}`);
      lines.push(
        `Include explicit action items: ${input.styleProfile.includeActionItems ? 'yes' : 'no'}`,
      );
    }

    if (input.personalGuidance && dto.feature === 'comment-drafter') {
      lines.push(`Personal guidance: ${input.personalGuidance}`);
    }

    if (input.diffContext && dto.feature === 'comment-drafter') {
      lines.push('Diff grounding is available and optional for this request.');
      lines.push('When drafting comments, tie feedback to concrete file paths/hunks when present.');
      lines.push(`Diff summary:\n${input.diffContext.summary}`);
      lines.push(`Diff excerpt (truncated):\n${input.diffContext.excerpt}`);
    }

    return lines.join('\n');
  }

  private shouldAutoEscalate(input: {
    dto: AiTutorDto;
    resolvedModel: ClaudeModelChoice;
    content: string;
    diffContext: DiffGroundingContext | null;
  }) {
    if (input.dto.allowEscalation === false) {
      return false;
    }
    if (input.dto.feature !== 'comment-drafter') {
      return false;
    }
    if (input.resolvedModel !== 'haiku') {
      return false;
    }

    const text = input.content.trim();
    const tooShort = text.length < 140;
    const lacksActionLanguage =
      !/\b(should|consider|recommend|suggest|ensure|add|remove|refactor|guard)\b/i.test(text);
    const needsGroundingButMissing =
      !!input.diffContext && !/\b([\w./-]+\.[a-zA-Z0-9]+|@@\s*-[0-9,]+\s*\+[0-9,]+\s*@@)\b/.test(text);

    const failCount = [tooShort, lacksActionLanguage, needsGroundingButMissing].filter(Boolean)
      .length;
    return failCount >= 2;
  }

  private buildCacheKey(input: {
    userId: string;
    feature: string;
    model: string;
    role: string;
    itemId: string;
    confidence: number;
    diffSignature: string;
    styleProfileId: string;
    messages: Array<{ role: string; content: string }>;
  }) {
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          ...input,
          messages: input.messages.map((message) => ({
            role: message.role,
            content: message.content.trim(),
          })),
        }),
      )
      .digest('hex');
    return `ai:cache:${input.userId}:${digest}`;
  }

  private maxTokensByRole(role: string) {
    const table: Record<string, number> = {
      'concept-explainer': 1400,
      qa: 1000,
      'comment-drafter': 600,
      'exercise-generator': 1200,
      'anti-bias-challenger': 900,
    };
    return table[role] ?? 1000;
  }

  private defaultModelForFeature(feature: AiTutorDto['feature']): ClaudeModelChoice {
    if (feature === 'comment-drafter') {
      return 'haiku';
    }
    return 'sonnet';
  }

  private toAnthropicModelId(model: ClaudeModelChoice) {
    if (model === 'opus') {
      return 'claude-opus-4-6';
    }
    if (model === 'sonnet') {
      return 'claude-sonnet-4-6';
    }
    return 'claude-haiku-4-5';
  }

  private estimateCostUsd(model: ClaudeModelChoice, inputTokens: number, outputTokens: number) {
    const prices: Record<ClaudeModelChoice, { input: number; output: number }> = {
      haiku: { input: 1, output: 5 },
      sonnet: { input: 3, output: 15 },
      opus: { input: 15, output: 75 },
    };
    const selected = prices[model];
    return Number(
      (
        (inputTokens / 1_000_000) * selected.input +
        (outputTokens / 1_000_000) * selected.output
      ).toFixed(6),
    );
  }

  private async ensureUser(authUser: AuthenticatedUser) {
    return this.prisma.user.upsert({
      where: { supabaseUserId: authUser.supabaseUserId },
      update: {
        email: authUser.email,
      },
      create: {
        supabaseUserId: authUser.supabaseUserId,
        email: authUser.email,
      },
    });
  }
}
