/**
 * Simplified SM-2 spaced repetition algorithm.
 *
 * Maps confidence levels (1-5) to SM-2 quality grades:
 *   1 → 0 (complete blackout)
 *   2 → 2 (serious difficulty)
 *   3 → 3 (correct with difficulty)
 *   4 → 4 (correct after hesitation)
 *   5 → 5 (perfect response)
 */

export interface RepetitionState {
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
  repetitions: number;
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const CONFIDENCE_TO_QUALITY: Record<number, number> = {
  1: 0,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

export function computeNextReview(
  current: RepetitionState | null,
  confidenceLevel: number,
): RepetitionState {
  const quality = CONFIDENCE_TO_QUALITY[confidenceLevel] ?? 3;
  const ef = current?.easeFactor ?? 2.5;
  const reps = current?.repetitions ?? 0;

  if (quality < 3) {
    // Failed — reset repetitions, review again soon
    return {
      interval: 1,
      easeFactor: Math.max(1.3, ef - 0.2),
      nextReviewDate: addDays(1),
      repetitions: 0,
    };
  }

  // SM-2 ease factor update
  const newEf = Math.max(
    1.3,
    ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  let newInterval: number;
  if (reps === 0) {
    newInterval = 1;
  } else if (reps === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round((current?.interval ?? 1) * newEf);
  }

  // Cap interval at 365 days
  newInterval = Math.min(365, newInterval);

  return {
    interval: newInterval,
    easeFactor: Math.round(newEf * 100) / 100,
    nextReviewDate: addDays(newInterval),
    repetitions: reps + 1,
  };
}

export function isDueForReview(state: RepetitionState | undefined): boolean {
  if (!state) return false;
  return new Date(state.nextReviewDate) <= new Date();
}
