import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChecklistMode, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  getChecklistBySession,
  getChecklistItemIndex,
  type Severity,
} from '../checklists/bundled-checklists';
import type { CompleteSessionDto } from './dto/complete-session.dto';
import type { CreateSessionDto } from './dto/create-session.dto';
import type { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import type { PatchItemResponseDto } from './dto/patch-item-response.dto';
import type { UpdateSessionDto } from './dto/update-session.dto';
import type { SessionItemResponse } from './sessions.types';

type SessionRecord = Awaited<ReturnType<PrismaService['session']['create']>>;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async createSession(authUser: AuthenticatedUser, input: CreateSessionDto) {
    const user = await this.ensureUser(authUser);
    if (input.mode === ChecklistMode.review && !input.stackId) {
      throw new BadRequestException('stackId is required for review sessions');
    }
    if (input.mode === ChecklistMode.polish && input.stackId) {
      throw new BadRequestException('stackId must be omitted for polish sessions');
    }

    const now = new Date();
    const title =
      input.title?.trim() ||
      `${input.mode === ChecklistMode.polish ? 'Polish' : 'Review'} - ${now.toLocaleDateString(
        'en-US',
      )}`;

    const created = await this.prisma.session.create({
      data: {
        userId: user.id,
        mode: input.mode,
        stackId: input.stackId ?? null,
        title,
        itemResponses: {},
      },
    });
    return this.toSessionResponse(created);
  }

  async listSessions(authUser: AuthenticatedUser, query: ListSessionsQueryDto) {
    const user = await this.ensureUser(authUser);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const cursor = this.decodeCursor(query.cursor);

    const where: Prisma.SessionWhereInput = {
      userId: user.id,
    };
    if (query.mode) {
      where.mode = query.mode;
    }
    if (query.stackId) {
      where.stackId = query.stackId;
    }
    if (query.status === 'active') {
      where.isComplete = false;
    } else if (query.status === 'completed') {
      where.isComplete = true;
    }
    if (cursor) {
      where.OR = [
        { updatedAt: { lt: cursor.updatedAt } },
        { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.session.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row) => this.toSessionResponse(row));
    const next = hasMore ? rows[limit - 1] : null;
    return {
      items,
      nextCursor: next
        ? this.encodeCursor({ id: next.id, updatedAt: next.updatedAt })
        : null,
    };
  }

  async getSessionById(authUser: AuthenticatedUser, sessionId: string) {
    const user = await this.ensureUser(authUser);
    const session = await this.getSessionForUserOrThrow(user.id, sessionId);
    return this.toSessionResponse(session);
  }

  async updateSession(authUser: AuthenticatedUser, sessionId: string, input: UpdateSessionDto) {
    const user = await this.ensureUser(authUser);
    await this.getSessionForUserOrThrow(user.id, sessionId);
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        title: input.title.trim(),
      },
    });
    return this.toSessionResponse(updated);
  }

  async deleteSession(authUser: AuthenticatedUser, sessionId: string) {
    const user = await this.ensureUser(authUser);
    await this.getSessionForUserOrThrow(user.id, sessionId);
    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async patchItemResponse(
    authUser: AuthenticatedUser,
    sessionId: string,
    itemId: string,
    input: PatchItemResponseDto,
  ) {
    const user = await this.ensureUser(authUser);
    const session = await this.getSessionForUserOrThrow(user.id, sessionId);
    const current = this.parseItemResponses(session.itemResponses);
    const existing = current[itemId] ?? {
      verdict: 'skipped',
      confidence: 3,
    };
    const merged = {
      ...existing,
      ...input,
    } as SessionItemResponse;

    current[itemId] = merged;

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        itemResponses: current as unknown as Prisma.JsonObject,
      },
    });
    return merged;
  }

  async patchSessionNotes(authUser: AuthenticatedUser, sessionId: string, sessionNotes: string) {
    const user = await this.ensureUser(authUser);
    await this.getSessionForUserOrThrow(user.id, sessionId);
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        sessionNotes,
      },
      select: {
        id: true,
        sessionNotes: true,
        updatedAt: true,
      },
    });
    return {
      sessionId: updated.id,
      sessionNotes: updated.sessionNotes,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async completeSession(authUser: AuthenticatedUser, sessionId: string, input: CompleteSessionDto) {
    const user = await this.ensureUser(authUser);
    const existing = await this.getSessionForUserOrThrow(user.id, sessionId);
    if (existing.isComplete && existing.completedAt) {
      return {
        sessionId: existing.id,
        completedAt: existing.completedAt.toISOString(),
        isComplete: true,
      };
    }

    const coverage = this.computeCoveragePercent(existing);
    if (coverage < 50 && !input.confirmLowCoverage) {
      throw new BadRequestException(
        'Coverage is below 50%. Retry with confirmLowCoverage=true to complete anyway.',
      );
    }

    const completedAt = new Date();
    const updated = await this.prisma.session.update({
      where: { id: existing.id },
      data: {
        isComplete: true,
        completedAt,
      },
    });
    return {
      sessionId: updated.id,
      completedAt: (updated.completedAt ?? completedAt).toISOString(),
      isComplete: updated.isComplete,
    };
  }

  async getSessionSummary(authUser: AuthenticatedUser, sessionId: string) {
    const user = await this.ensureUser(authUser);
    const session = await this.getSessionForUserOrThrow(user.id, sessionId);
    const checklist = getChecklistBySession(session.mode as 'review' | 'polish', session.stackId);
    const itemIndex = checklist ? getChecklistItemIndex(checklist) : {};
    const itemResponses = this.parseItemResponses(session.itemResponses);

    const issuesBySeverity: Record<Severity, number> = {
      blocker: 0,
      major: 0,
      minor: 0,
      nit: 0,
    };
    let itemsResponded = 0;
    let naCount = 0;
    let confidenceTotal = 0;

    for (const [itemId, response] of Object.entries(itemResponses)) {
      if (response.verdict === 'na') {
        naCount += 1;
        continue;
      }
      if (response.verdict !== 'skipped') {
        itemsResponded += 1;
        confidenceTotal += response.confidence;
      }
      if (response.verdict === 'needs-attention') {
        const severity = itemIndex[itemId]?.severity ?? 'minor';
        issuesBySeverity[severity] += 1;
      }
    }

    const applicableItems = checklist ? Math.max(0, checklist.meta.totalItems - naCount) : itemsResponded;
    const coverage = applicableItems > 0 ? Math.round((itemsResponded / applicableItems) * 100) : 0;
    const confidence =
      itemsResponded > 0 ? Math.round((confidenceTotal / itemsResponded / 5) * 100) : 0;
    const totalIssues = Object.values(issuesBySeverity).reduce((sum, value) => sum + value, 0);

    const lowConfidenceItems = Object.entries(itemResponses)
      .filter(([, response]) => response.confidence <= 2 && response.verdict !== 'na')
      .map(([itemId, response]) => ({
        itemId,
        text: itemIndex[itemId]?.text ?? itemId,
        severity: itemIndex[itemId]?.severity ?? 'minor',
        sectionId: itemIndex[itemId]?.sectionId ?? 'unknown',
        confidence: response.confidence,
        verdict: response.verdict,
      }))
      .sort((a, b) => a.confidence - b.confidence);

    const usage = await this.prisma.usageSession.findUnique({
      where: { sessionId: session.id },
      select: {
        calls: true,
        inputTokens: true,
        outputTokens: true,
        byFeature: true,
        byModel: true,
      },
    });

    return {
      scores: {
        coverage,
        confidence,
        issuesBySeverity,
        totalIssues,
        itemsResponded,
        applicableItems,
      },
      lowConfidenceItems,
      sessionUsage: {
        calls: usage?.calls ?? 0,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        costUsd: this.estimateCostUsd(usage?.byModel ?? {}),
        byFeature: this.buildFeatureUsage(usage?.byFeature ?? {}),
      },
    };
  }

  private buildFeatureUsage(byFeature: Prisma.JsonValue) {
    if (!byFeature || typeof byFeature !== 'object' || Array.isArray(byFeature)) {
      return [];
    }
    const featureObj = byFeature as Record<string, unknown>;
    return Object.entries(featureObj).map(([feature, payload]) => {
      const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      const byModel = (row.byModel ?? {}) as Prisma.JsonValue;
      return {
        feature,
        calls: this.safeNumber(row.calls),
        inputTokens: this.safeNumber(row.inputTokens),
        outputTokens: this.safeNumber(row.outputTokens),
        costUsd: this.estimateCostUsd(byModel),
      };
    });
  }

  private computeCoveragePercent(session: SessionRecord): number {
    const checklist = getChecklistBySession(session.mode as 'review' | 'polish', session.stackId);
    if (!checklist) {
      return 100;
    }
    const responses = this.parseItemResponses(session.itemResponses);
    let answered = 0;
    let notApplicable = 0;
    for (const response of Object.values(responses)) {
      if (response.verdict === 'na') {
        notApplicable += 1;
      } else if (response.verdict !== 'skipped') {
        answered += 1;
      }
    }
    const applicable = Math.max(0, checklist.meta.totalItems - notApplicable);
    if (applicable === 0) {
      return 100;
    }
    return Math.round((answered / applicable) * 100);
  }

  private estimateCostUsd(byModel: Prisma.JsonValue): number {
    if (!byModel || typeof byModel !== 'object' || Array.isArray(byModel)) {
      return 0;
    }
    const modelObj = byModel as Record<string, unknown>;
    const calc = (inputTokens: number, outputTokens: number, inPrice: number, outPrice: number) =>
      (inputTokens / 1_000_000) * inPrice + (outputTokens / 1_000_000) * outPrice;
    const priceByModel: Record<string, { input: number; output: number }> = {
      haiku: {
        input: this.config.get('HAIKU_INPUT_COST_PER_MILLION_USD'),
        output: this.config.get('HAIKU_OUTPUT_COST_PER_MILLION_USD'),
      },
      sonnet: {
        input: this.config.get('SONNET_INPUT_COST_PER_MILLION_USD'),
        output: this.config.get('SONNET_OUTPUT_COST_PER_MILLION_USD'),
      },
      opus: {
        input: this.config.get('OPUS_INPUT_COST_PER_MILLION_USD'),
        output: this.config.get('OPUS_OUTPUT_COST_PER_MILLION_USD'),
      },
    };

    let total = 0;
    for (const [model, payload] of Object.entries(modelObj)) {
      if (!payload || typeof payload !== 'object') continue;
      const row = payload as Record<string, unknown>;
      const inputTokens = this.safeNumber(row.inputTokens);
      const outputTokens = this.safeNumber(row.outputTokens);
      const prices = priceByModel[model] ?? priceByModel.sonnet;
      total += calc(inputTokens, outputTokens, prices.input, prices.output);
    }
    return Number(total.toFixed(6));
  }

  private safeNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseItemResponses(value: Prisma.JsonValue): Record<string, SessionItemResponse> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    const raw = value as Record<string, unknown>;
    const out: Record<string, SessionItemResponse> = {};
    for (const [itemId, payload] of Object.entries(raw)) {
      if (!payload || typeof payload !== 'object') continue;
      const row = payload as Record<string, unknown>;
      const verdict = row.verdict;
      const confidence = row.confidence;
      if (
        (verdict !== 'looks-good' &&
          verdict !== 'needs-attention' &&
          verdict !== 'na' &&
          verdict !== 'skipped') ||
        ![1, 2, 3, 4, 5].includes(Number(confidence))
      ) {
        continue;
      }
      out[itemId] = {
        verdict,
        confidence: Number(confidence) as 1 | 2 | 3 | 4 | 5,
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        draftedComment:
          typeof row.draftedComment === 'string' ? row.draftedComment : undefined,
      };
    }
    return out;
  }

  private toSessionResponse(session: SessionRecord) {
    return {
      id: session.id,
      mode: session.mode,
      stackId: session.stackId,
      title: session.title,
      itemResponses: this.parseItemResponses(session.itemResponses),
      sessionNotes: session.sessionNotes,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      isComplete: session.isComplete,
    };
  }

  private encodeCursor(cursor: { updatedAt: Date; id: string }) {
    return Buffer.from(
      JSON.stringify({ updatedAt: cursor.updatedAt.toISOString(), id: cursor.id }),
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(
    value: string | undefined,
  ): { updatedAt: Date; id: string } | null {
    if (!value) return null;
    try {
      const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        updatedAt: string;
        id: string;
      };
      if (!decoded.updatedAt || !decoded.id) return null;
      return {
        updatedAt: new Date(decoded.updatedAt),
        id: decoded.id,
      };
    } catch {
      return null;
    }
  }

  private async getSessionForUserOrThrow(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
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
