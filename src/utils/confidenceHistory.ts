import type {
  ConfidenceLevel,
  ConfidenceRating,
  ConfidenceTrend,
  ItemConfidenceHistory,
  Severity,
} from '../data/types';
import { SEVERITY_WEIGHTS } from '../data/types';
import { computeNextReview } from './spacedRepetition';

export function computeTrend(
  ratings: ConfidenceRating[],
): ConfidenceTrend {
  if (ratings.length < 2) return 'new';
  const recent = ratings.slice(-3);
  if (recent.length < 2) return 'new';

  const diffs: number[] = [];
  for (let index = 1; index < recent.length; index += 1) {
    diffs.push(recent[index].confidence - recent[index - 1].confidence);
  }

  const avgDiff = diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
  if (avgDiff > 0.3) return 'improving';
  if (avgDiff < -0.3) return 'declining';
  return 'stable';
}

export function computeLearningPriority(
  confidence: ConfidenceLevel,
  severity: Severity,
  lastDate: string,
): number {
  const severityWeight = SEVERITY_WEIGHTS[severity];
  const daysSince = Math.max(
    0,
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  const recencyFactor = daysSince <= 7 ? 1 : daysSince <= 30 ? 0.7 : 0.4;
  return (6 - confidence) * severityWeight * recencyFactor;
}

function compareRatings(a: ConfidenceRating, b: ConfidenceRating): number {
  const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
  if (dateDiff !== 0) return dateDiff;
  return `${a.sessionId}:${a.source ?? 'legacy'}`.localeCompare(
    `${b.sessionId}:${b.source ?? 'legacy'}`,
  );
}

function getRatingKey(rating: ConfidenceRating): string {
  return [
    rating.sessionId,
    rating.source ?? 'legacy',
    rating.date,
  ].join('|');
}

export function normalizeHistory(
  history: ItemConfidenceHistory,
): ItemConfidenceHistory {
  const ratings = [...history.ratings].sort(compareRatings);
  const lastRating = ratings[ratings.length - 1];

  if (!lastRating) {
    return {
      ...history,
      ratings,
    };
  }

  const averageConfidence =
    ratings.reduce((sum, rating) => sum + rating.confidence, 0) / ratings.length;

  let repetitionState = null;
  for (const rating of ratings) {
    repetitionState = computeNextReview(repetitionState, rating.confidence);
  }

  return {
    ...history,
    ratings,
    currentConfidence: lastRating.confidence,
    averageConfidence: Math.round(averageConfidence * 10) / 10,
    trend: computeTrend(ratings),
    learningPriority: computeLearningPriority(
      lastRating.confidence,
      history.severity,
      lastRating.date,
    ),
    repetitionState: repetitionState ?? history.repetitionState,
  };
}

export function mergeConfidenceHistory(
  local?: ItemConfidenceHistory,
  remote?: ItemConfidenceHistory,
): ItemConfidenceHistory | undefined {
  if (!local && !remote) return undefined;
  const base = local ?? remote;
  if (!base) return undefined;

  const mergedRatings = new Map<string, ConfidenceRating>();
  for (const rating of local?.ratings ?? []) {
    mergedRatings.set(getRatingKey(rating), rating);
  }
  for (const rating of remote?.ratings ?? []) {
    mergedRatings.set(getRatingKey(rating), rating);
  }

  return normalizeHistory({
    ...base,
    itemId: local?.itemId ?? remote?.itemId ?? base.itemId,
    stackId: local?.stackId ?? remote?.stackId ?? base.stackId,
    sectionId: local?.sectionId ?? remote?.sectionId ?? base.sectionId,
    severity: local?.severity ?? remote?.severity ?? base.severity,
    ratings: [...mergedRatings.values()],
  });
}
