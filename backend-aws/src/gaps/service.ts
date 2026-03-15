import { desc, eq } from 'drizzle-orm';
import type { AuthPrincipal } from '../auth/types';
import { getDb } from '../db/client';
import { preferences, sessions } from '../db/schema';
import { getOrCreatePreferences, upsertUserFromPrincipal } from '../me/repository';

type Trend = 'improving' | 'stable' | 'declining' | 'new';

function parseItemResponses(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, Record<string, unknown>>;
}

function computeTrend(values: number[]): Trend {
  if (values.length < 2) return 'new';
  const recent = values.slice(-3);
  const diffs: number[] = [];
  for (let i = 1; i < recent.length; i += 1) {
    diffs.push(recent[i] - recent[i - 1]);
  }
  const avg = diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
  if (avg > 0.3) return 'improving';
  if (avg < -0.3) return 'declining';
  return 'stable';
}

function severityWeight(severity: string): number {
  switch (severity) {
    case 'blocker':
      return 4;
    case 'major':
      return 3;
    case 'minor':
      return 2;
    default:
      return 1;
  }
}

function computeLearningPriority(confidence: number, severity: string, lastDate?: Date) {
  const daysSince = lastDate
    ? Math.max(0, (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const recencyFactor = daysSince <= 7 ? 1 : daysSince <= 30 ? 0.7 : 0.4;
  return (6 - confidence) * severityWeight(severity) * recencyFactor;
}

export async function getGaps(principal: AuthPrincipal, query: { stackId?: string; limit?: number }) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .orderBy(desc(sessions.updatedAt));

  const itemRatings = new Map<
    string,
    {
      stackId: string;
      sectionId: string;
      severity: string;
      ratings: Array<{ confidence: number; at: Date }>;
    }
  >();

  for (const session of rows) {
    if (session.isComplete !== 1) continue;
    const defaultStackId = session.stackId ?? 'polish-my-pr';
    const itemResponses = parseItemResponses(session.itemResponses);
    const at = session.completedAt ?? session.updatedAt;

    for (const [itemId, response] of Object.entries(itemResponses)) {
      const verdict = typeof response.verdict === 'string' ? response.verdict : 'skipped';
      if (verdict === 'na') continue;

      const stackId = itemId.includes('.') ? itemId.split('.')[0] || defaultStackId : defaultStackId;
      if (query.stackId && query.stackId !== 'all' && stackId !== query.stackId) continue;

      const key = `${stackId}:${itemId}`;
      const existing = itemRatings.get(key) ?? {
        stackId,
        sectionId: typeof response.sectionId === 'string' ? response.sectionId : 'unknown',
        severity:
          typeof response.severity === 'string' &&
          ['blocker', 'major', 'minor', 'nit'].includes(response.severity)
            ? response.severity
            : 'minor',
        ratings: [],
      };
      existing.ratings.push({
        confidence: typeof response.confidence === 'number' ? response.confidence : 3,
        at,
      });
      itemRatings.set(key, existing);
    }
  }

  const allRows = Array.from(itemRatings.entries()).map(([key, value]) => {
    const [stackId, itemId] = key.split(':');
    const current = value.ratings[value.ratings.length - 1]?.confidence ?? 3;
    const average =
      value.ratings.reduce((sum, rating) => sum + rating.confidence, 0) / value.ratings.length;
    return {
      itemId,
      stackId,
      sectionId: value.sectionId,
      severity: value.severity,
      currentConfidence: current,
      averageConfidence: Number(average.toFixed(1)),
      trend: computeTrend(value.ratings.map((rating) => rating.confidence)),
      learningPriority: Number(
        computeLearningPriority(current, value.severity, value.ratings[value.ratings.length - 1]?.at).toFixed(2),
      ),
      ratingsCount: value.ratings.length,
    };
  });

  const improvingIds = new Set(
    allRows.filter((row) => row.trend === 'improving' && row.currentConfidence <= 4).map((row) => row.itemId),
  );
  const strongIds = new Set(
    allRows.filter((row) => row.currentConfidence >= 4 && row.trend !== 'declining').map((row) => row.itemId),
  );

  const active = allRows
    .filter((row) => !improvingIds.has(row.itemId) && !strongIds.has(row.itemId))
    .sort((a, b) => b.learningPriority - a.learningPriority);
  const improving = allRows
    .filter((row) => improvingIds.has(row.itemId))
    .sort((a, b) => b.learningPriority - a.learningPriority);
  const strong = allRows
    .filter((row) => strongIds.has(row.itemId))
    .sort((a, b) => b.currentConfidence - a.currentConfidence);

  const limit = query.limit ?? 10000;
  return {
    active: active.slice(0, limit),
    improving: improving.slice(0, limit),
    strong: strong.slice(0, limit),
  };
}

export async function getLearnQueue(principal: AuthPrincipal, query: { stackId?: string; limit?: number }) {
  const gaps = await getGaps(principal, query);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  return {
    items: [...gaps.active, ...gaps.improving]
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, limit),
  };
}

export async function getConfidence(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const preference = await getOrCreatePreferences(user.id);
  return {
    histories: (preference.confidenceHistories as Record<string, unknown>) ?? {},
  };
}

export async function putConfidence(principal: AuthPrincipal, histories: Record<string, unknown>) {
  const user = await upsertUserFromPrincipal(principal);
  await getOrCreatePreferences(user.id);
  const db = getDb();
  await db
    .update(preferences)
    .set({
      confidenceHistories: histories,
      updatedAt: new Date(),
    })
    .where(eq(preferences.userId, user.id));
}
