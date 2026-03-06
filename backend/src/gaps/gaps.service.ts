import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/types';
import { getChecklistBySession, getChecklistItemIndex, type Severity } from '../checklists/bundled-checklists';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionItemResponse } from '../sessions/sessions.types';

type Trend = 'improving' | 'stable' | 'declining' | 'new';

export interface GapItem {
  itemId: string;
  stackId: string;
  sectionId: string;
  severity: Severity;
  currentConfidence: number;
  averageConfidence: number;
  trend: Trend;
  learningPriority: number;
  ratingsCount: number;
}

export interface GapBuckets {
  active: GapItem[];
  improving: GapItem[];
  strong: GapItem[];
}

export interface LearnQueue {
  items: GapItem[];
}

@Injectable()
export class GapsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGaps(
    authUser: AuthenticatedUser,
    query: { stackId?: string; limit?: number },
  ): Promise<GapBuckets> {
    const user = await this.ensureUser(authUser);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const stackFilter = query.stackId && query.stackId !== 'all' ? query.stackId : null;
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        isComplete: true,
        ...(stackFilter ? { stackId: stackFilter } : {}),
      },
      orderBy: [{ completedAt: 'asc' }, { updatedAt: 'asc' }],
      select: {
        id: true,
        mode: true,
        stackId: true,
        itemResponses: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    const itemRatings = new Map<
      string,
      {
        stackId: string;
        sectionId: string;
        severity: Severity;
        ratings: Array<{ confidence: number; at: Date }>;
      }
    >();

    for (const session of sessions) {
      const checklist = getChecklistBySession(
        session.mode as 'review' | 'polish',
        session.stackId,
      );
      if (!checklist) continue;
      const itemIndex = getChecklistItemIndex(checklist);
      const responses = this.parseItemResponses(session.itemResponses);
      const at = session.completedAt ?? session.updatedAt;
      for (const [itemId, response] of Object.entries(responses)) {
        if (response.verdict === 'na') continue;
        const meta = itemIndex[itemId];
        if (!meta) continue;
        const key = `${session.stackId ?? 'polish-my-pr'}:${itemId}`;
        const existing = itemRatings.get(key) ?? {
          stackId: session.stackId ?? 'polish-my-pr',
          sectionId: meta.sectionId,
          severity: meta.severity,
          ratings: [],
        };
        existing.ratings.push({
          confidence: response.confidence,
          at,
        });
        itemRatings.set(key, existing);
      }
    }

    const rows: GapItem[] = [];
    for (const [key, value] of itemRatings.entries()) {
      const [stackId, itemId] = key.split(':');
      const current = value.ratings[value.ratings.length - 1]?.confidence ?? 3;
      const average =
        value.ratings.reduce((sum, rating) => sum + rating.confidence, 0) / value.ratings.length;
      const trend = this.computeTrend(value.ratings.map((rating) => rating.confidence));
      rows.push({
        itemId,
        stackId,
        sectionId: value.sectionId,
        severity: value.severity,
        currentConfidence: current,
        averageConfidence: Number(average.toFixed(1)),
        trend,
        learningPriority: Number(
          this.computeLearningPriority(current, value.severity, value.ratings[value.ratings.length - 1]?.at).toFixed(
            2,
          ),
        ),
        ratingsCount: value.ratings.length,
      });
    }

    const active = rows
      .filter((row) => row.currentConfidence <= 2 || row.trend === 'declining')
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, limit);
    const improving = rows
      .filter((row) => row.trend === 'improving' && row.currentConfidence <= 4)
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, limit);
    const strong = rows
      .filter((row) => row.currentConfidence >= 4 && row.trend !== 'declining')
      .sort((a, b) => b.currentConfidence - a.currentConfidence)
      .slice(0, limit);

    return { active, improving, strong };
  }

  async getLearnQueue(
    authUser: AuthenticatedUser,
    query: { stackId?: string; limit?: number },
  ): Promise<LearnQueue> {
    const gaps = await this.getGaps(authUser, query);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const merged = [...gaps.active, ...gaps.improving]
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, limit);
    return { items: merged };
  }

  private parseItemResponses(value: unknown): Record<string, SessionItemResponse> {
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
      };
    }
    return out;
  }

  private computeTrend(values: number[]): Trend {
    if (values.length < 2) return 'new';
    const recent = values.slice(-3);
    if (recent.length < 2) return 'new';
    const diffs: number[] = [];
    for (let i = 1; i < recent.length; i += 1) {
      diffs.push(recent[i] - recent[i - 1]);
    }
    const avgDiff = diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
    if (avgDiff > 0.3) return 'improving';
    if (avgDiff < -0.3) return 'declining';
    return 'stable';
  }

  private computeLearningPriority(confidence: number, severity: Severity, lastDate?: Date) {
    const severityWeight: Record<Severity, number> = {
      blocker: 4,
      major: 3,
      minor: 2,
      nit: 1,
    };
    const daysSince = lastDate
      ? Math.max(
          0,
          (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;
    const recencyFactor = daysSince <= 7 ? 1 : daysSince <= 30 ? 0.7 : 0.4;
    return (6 - confidence) * severityWeight[severity] * recencyFactor;
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
