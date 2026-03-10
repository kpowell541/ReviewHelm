import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/types';
import { parseSessionItemResponses } from '../common/sessions/parse-item-responses';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import { getChecklistBySession, getChecklistItemIndex, getBundledChecklistById, type Severity } from '../checklists/bundled-checklists';
import { PrismaService } from '../prisma/prisma.service';

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
    const user = await upsertUserFromAuth(this.prisma, authUser);
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
        stackIds: true,
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
      // Build a combined item index from all stacks in the session
      const stacks = session.stackIds.length > 0 ? session.stackIds : (session.stackId ? [session.stackId] : []);
      const isMultiStack = stacks.length > 1;

      let itemIndex: Record<string, { itemId: string; text: string; severity: Severity; sectionId: string }> = {};

      if (session.mode === 'polish') {
        const checklist = getChecklistBySession('polish', null);
        if (!checklist) continue;
        itemIndex = getChecklistItemIndex(checklist);
      } else {
        for (const sid of stacks) {
          const checklist = getBundledChecklistById(sid);
          if (!checklist) continue;
          const partial = getChecklistItemIndex(checklist);
          Object.assign(itemIndex, partial);
        }
        if (Object.keys(itemIndex).length === 0) continue;
      }

      const responses = parseSessionItemResponses(session.itemResponses);
      const at = session.completedAt ?? session.updatedAt;
      const defaultStackId = session.stackId ?? 'polish-my-pr';

      for (const [itemId, response] of Object.entries(responses)) {
        if (response.verdict === 'na') continue;
        const meta = itemIndex[itemId];
        if (!meta) continue;

        // For multi-stack sessions, derive stackId from item ID prefix
        const stackId = isMultiStack ? (itemId.split('.')[0] || defaultStackId) : defaultStackId;

        const key = `${stackId}:${itemId}`;
        const existing = itemRatings.get(key) ?? {
          stackId,
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

    const improvingSet = new Set<string>();
    const strongSet = new Set<string>();

    const improving = rows
      .filter((row) => row.trend === 'improving' && row.currentConfidence <= 4)
      .sort((a, b) => b.learningPriority - a.learningPriority);
    improving.forEach((r) => improvingSet.add(r.itemId));

    const strong = rows
      .filter((row) => row.currentConfidence >= 4 && row.trend !== 'declining')
      .sort((a, b) => b.currentConfidence - a.currentConfidence);
    strong.forEach((r) => strongSet.add(r.itemId));

    // Active: confidence <= 2, declining, or anything not in improving/strong
    const active = rows
      .filter((row) => !improvingSet.has(row.itemId) && !strongSet.has(row.itemId))
      .sort((a, b) => b.learningPriority - a.learningPriority);

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

  async getConfidence(authUser: AuthenticatedUser): Promise<{ histories: Record<string, unknown> }> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const pref = await this.prisma.preference.findUnique({
      where: { userId: user.id },
      select: { confidenceHistories: true },
    });
    const histories = (pref?.confidenceHistories as Record<string, unknown>) ?? {};
    return { histories };
  }

  async putConfidence(authUser: AuthenticatedUser, histories: Record<string, unknown>): Promise<void> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    await this.prisma.preference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        confidenceHistories: histories as any,
      },
      update: {
        confidenceHistories: histories as any,
      },
    });
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
}
