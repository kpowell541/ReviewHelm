import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import { getChecklistBySession, getChecklistItemIndex } from '../checklists/bundled-checklists';
import { DiffsService } from '../diffs/diffs.service';
import type { SessionItemResponse } from '../sessions/sessions.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diffsService: DiffsService,
  ) {}

  async getSessionHeatmap(
    authUser: AuthenticatedUser,
    sessionId: string,
    query: { diffId?: string },
  ) {
    const user = await this.ensureUser(authUser);
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
      select: {
        id: true,
        mode: true,
        stackId: true,
        itemResponses: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const checklist = getChecklistBySession(session.mode as 'review' | 'polish', session.stackId);
    const itemIndex = checklist ? getChecklistItemIndex(checklist) : {};
    const responses = this.parseItemResponses(session.itemResponses);

    const severityWeight: Record<string, number> = {
      blocker: 40,
      major: 20,
      minor: 10,
      nit: 4,
    };
    const sectionRisk: Record<string, { score: number; issues: number; responded: number }> = {};
    let totalScore = 0;
    let responded = 0;

    for (const [itemId, response] of Object.entries(responses)) {
      if (response.verdict === 'na' || response.verdict === 'skipped') continue;
      responded += 1;
      const meta = itemIndex[itemId];
      const sectionId = meta?.sectionId ?? 'unknown';
      const severity = meta?.severity ?? 'minor';
      const baseWeight = severityWeight[severity] ?? 10;
      const confidencePenalty = (6 - response.confidence) * 2;
      const contribution =
        response.verdict === 'needs-attention'
          ? baseWeight + confidencePenalty
          : Math.max(0, confidencePenalty - 2);

      const section = sectionRisk[sectionId] ?? { score: 0, issues: 0, responded: 0 };
      section.score += contribution;
      section.responded += 1;
      if (response.verdict === 'needs-attention') {
        section.issues += 1;
      }
      sectionRisk[sectionId] = section;
      totalScore += contribution;
    }

    const bySection = Object.entries(sectionRisk)
      .map(([sectionId, data]) => ({
        sectionId,
        score: Number(data.score.toFixed(2)),
        normalizedRisk: Number(Math.min(100, (data.score / Math.max(1, data.responded * 25)) * 100).toFixed(1)),
        issues: data.issues,
        responded: data.responded,
      }))
      .sort((a, b) => b.score - a.score);

    const overallRisk = Number(
      Math.min(100, (totalScore / Math.max(1, responded * 25)) * 100).toFixed(1),
    );

    const byFile = query.diffId
      ? await this.diffsService.getDiffFileHeatmap(authUser, { diffId: query.diffId })
      : [];

    return {
      sessionId: session.id,
      overallRisk,
      respondedItems: responded,
      bySection,
      byFile,
    };
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
      const confidence = Number(row.confidence ?? 0);
      if (
        (verdict !== 'looks-good' &&
          verdict !== 'needs-attention' &&
          verdict !== 'na' &&
          verdict !== 'skipped') ||
        ![1, 2, 3, 4, 5].includes(confidence)
      ) {
        continue;
      }
      out[itemId] = {
        verdict,
        confidence: confidence as 1 | 2 | 3 | 4 | 5,
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        draftedComment:
          typeof row.draftedComment === 'string' ? row.draftedComment : undefined,
      };
    }
    return out;
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
