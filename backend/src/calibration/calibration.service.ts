import { Injectable } from '@nestjs/common';
import type { FeedbackOutcome } from '@prisma/client';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitCommentFeedbackDto } from './dto/submit-comment-feedback.dto';

@Injectable()
export class CalibrationService {
  constructor(private readonly prisma: PrismaService) {}

  async submitFeedback(authUser: AuthenticatedUser, input: SubmitCommentFeedbackDto) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const created = await this.prisma.commentFeedback.create({
      data: {
        userId: user.id,
        sessionId: input.sessionId ?? null,
        itemId: input.itemId,
        feature: input.feature,
        model: input.model,
        draftText: input.draftText,
        finalText: input.finalText ?? null,
        outcome: input.outcome,
        editDistance: input.editDistance ?? null,
      },
    });
    return {
      id: created.id,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getSummary(authUser: AuthenticatedUser, days = 30) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.commentFeedback.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: since },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        outcome: true,
        model: true,
        editDistance: true,
        createdAt: true,
      },
    });

    const counts: Record<FeedbackOutcome, number> = {
      accepted: 0,
      edited: 0,
      rejected: 0,
    };
    const byModel: Record<string, { total: number; accepted: number; edited: number; rejected: number }> = {};
    let editDistanceTotal = 0;
    let editDistanceCount = 0;

    for (const row of rows) {
      counts[row.outcome] += 1;
      const modelStats = byModel[row.model] ?? {
        total: 0,
        accepted: 0,
        edited: 0,
        rejected: 0,
      };
      modelStats.total += 1;
      modelStats[row.outcome] += 1;
      byModel[row.model] = modelStats;

      if (typeof row.editDistance === 'number') {
        editDistanceTotal += row.editDistance;
        editDistanceCount += 1;
      }
    }

    const total = rows.length;
    const acceptanceRate = total > 0 ? Number((counts.accepted / total).toFixed(4)) : 0;
    const averageEditDistance = editDistanceCount > 0 ? Number((editDistanceTotal / editDistanceCount).toFixed(2)) : 0;

    return {
      windowDays: days,
      totalFeedback: total,
      counts,
      acceptanceRate,
      averageEditDistance,
      byModel,
      guidance: this.buildGuidance({
        acceptanceRate,
        averageEditDistance,
      }),
    };
  }

  async buildPersonalGuidance(authUser: AuthenticatedUser) {
    const summary = await this.getSummary(authUser, 45);
    return summary.guidance;
  }

  private buildGuidance(input: { acceptanceRate: number; averageEditDistance: number }) {
    const notes: string[] = [];
    if (input.acceptanceRate >= 0.75) {
      notes.push('User often accepts first drafts; keep concise and direct.');
    } else if (input.acceptanceRate >= 0.5) {
      notes.push('User moderately edits drafts; include clearer action items.');
    } else {
      notes.push('User frequently edits/rejects drafts; prioritize precision and context.');
    }
    if (input.averageEditDistance > 60) {
      notes.push('Edits are substantial; favor explicit rationale and verification steps.');
    } else if (input.averageEditDistance > 20) {
      notes.push('Moderate edits; tighten wording and reduce ambiguity.');
    } else {
      notes.push('Edits are light; keep responses compact.');
    }
    return notes.join(' ');
  }
}
