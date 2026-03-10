import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChecklistMode, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import { parseSessionItemResponses } from '../common/sessions/parse-item-responses';
import { estimateCostUsd, safeNumber } from '../common/usage/cost-estimation';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
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
    const user = await upsertUserFromAuth(this.prisma, authUser);

    // Resolve stackIds from either field
    const stackIds = input.stackIds?.length
      ? input.stackIds
      : input.stackId
        ? [input.stackId]
        : [];

    if (input.mode === ChecklistMode.review && stackIds.length === 0) {
      throw new BadRequestException('At least one stackId is required for review sessions');
    }
    if (input.mode === ChecklistMode.polish && stackIds.length > 0) {
      throw new BadRequestException('stackIds must be empty for polish sessions');
    }

    const now = new Date();
    const title =
      input.title?.trim() ||
      `${input.mode === ChecklistMode.polish ? 'Polish' : 'Review'} - ${now.toLocaleDateString(
        'en-US',
      )}`;

    const created = await this.prisma.session.create({
      data: {
        id: input.id,
        userId: user.id,
        mode: input.mode,
        stackId: stackIds[0] ?? null,
        stackIds,
        selectedSections: input.selectedSections ?? [],
        title,
        itemResponses: {},
      },
    });
    return this.toSessionResponse(created);
  }

  async listSessions(authUser: AuthenticatedUser, query: ListSessionsQueryDto) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
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
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const session = await this.getSessionForUserOrThrow(user.id, sessionId);
    return this.toSessionResponse(session);
  }

  async updateSession(authUser: AuthenticatedUser, sessionId: string, input: UpdateSessionDto) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
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
    const user = await upsertUserFromAuth(this.prisma, authUser);
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
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const session = await this.getSessionForUserOrThrow(user.id, sessionId);
    const current = parseSessionItemResponses(session.itemResponses);
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
    const user = await upsertUserFromAuth(this.prisma, authUser);
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
    const user = await upsertUserFromAuth(this.prisma, authUser);
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
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const session = await this.getSessionForUserOrThrow(user.id, sessionId);
    const checklist = getChecklistBySession(session.mode as 'review' | 'polish', session.stackId);
    const itemIndex = checklist ? getChecklistItemIndex(checklist) : {};
    const itemResponses = parseSessionItemResponses(session.itemResponses);

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
        costUsd: estimateCostUsd(usage?.byModel ?? {}, this.config),
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
        calls: safeNumber(row.calls),
        inputTokens: safeNumber(row.inputTokens),
        outputTokens: safeNumber(row.outputTokens),
        costUsd: estimateCostUsd(byModel, this.config),
      };
    });
  }

  private computeCoveragePercent(session: SessionRecord): number {
    const checklist = getChecklistBySession(session.mode as 'review' | 'polish', session.stackId);
    if (!checklist) {
      return 100;
    }
    const responses = parseSessionItemResponses(session.itemResponses);
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
  private toSessionResponse(session: SessionRecord) {
    return {
      id: session.id,
      mode: session.mode,
      stackId: session.stackId,
      stackIds: session.stackIds,
      selectedSections: session.selectedSections,
      title: session.title,
      itemResponses: parseSessionItemResponses(session.itemResponses),
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
}
