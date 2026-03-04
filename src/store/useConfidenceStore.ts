import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ItemConfidenceHistory,
  ConfidenceLevel,
  ConfidenceTrend,
  ConfidenceRating,
  Severity,
  Verdict,
  Session,
} from '../data/types';
import { SEVERITY_WEIGHTS } from '../data/types';

interface ConfidenceState {
  histories: Record<string, ItemConfidenceHistory>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  recordSessionResults: (
    session: Session,
    itemSeverities: Record<string, { severity: Severity; sectionId: string }>
  ) => void;
  replaceHistories: (
    histories: Record<string, ItemConfidenceHistory>
  ) => void;
  getItemHistory: (itemId: string) => ItemConfidenceHistory | undefined;
  getWeakestItems: (limit: number, stackId?: string) => ItemConfidenceHistory[];
  getSectionAverages: (
    stackId: string
  ) => Array<{ sectionId: string; average: number }>;
}

function computeTrend(ratings: ConfidenceRating[]): ConfidenceTrend {
  if (ratings.length < 2) return 'new';
  const recent = ratings.slice(-3);
  if (recent.length < 2) return 'new';

  const diffs: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    diffs.push(recent[i].confidence - recent[i - 1].confidence);
  }
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  if (avgDiff > 0.3) return 'improving';
  if (avgDiff < -0.3) return 'declining';
  return 'stable';
}

function computeLearningPriority(
  confidence: ConfidenceLevel,
  severity: Severity,
  lastDate: string
): number {
  const severityWeight = SEVERITY_WEIGHTS[severity];
  const daysSince = Math.max(
    0,
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyFactor =
    daysSince <= 7 ? 1.0 : daysSince <= 30 ? 0.7 : 0.4;
  return (6 - confidence) * severityWeight * recencyFactor;
}

export const useConfidenceStore = create<ConfidenceState>()(
  persist(
    (set, get) => ({
      histories: {},
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      recordSessionResults: (session, itemSeverities) => {
        set((state) => {
          const newHistories = { ...state.histories };
          const now = new Date().toISOString();
          const stackId = session.stackId || 'polish';

          for (const [itemId, response] of Object.entries(
            session.itemResponses
          )) {
            if (response.verdict === 'na') continue;

            const meta = itemSeverities[itemId];
            if (!meta) continue;

            const existing = newHistories[itemId] || {
              itemId,
              stackId,
              sectionId: meta.sectionId,
              severity: meta.severity,
              ratings: [],
              currentConfidence: response.confidence,
              averageConfidence: response.confidence,
              trend: 'new' as ConfidenceTrend,
              learningPriority: 0,
            };

            const newRating: ConfidenceRating = {
              sessionId: session.id,
              confidence: response.confidence,
              verdict: response.verdict,
              date: now,
            };

            const ratings = [...existing.ratings, newRating];
            const avgConfidence =
              ratings.reduce((sum, r) => sum + r.confidence, 0) /
              ratings.length;

            newHistories[itemId] = {
              ...existing,
              ratings,
              currentConfidence: response.confidence,
              averageConfidence: Math.round(avgConfidence * 10) / 10,
              trend: computeTrend(ratings),
              learningPriority: computeLearningPriority(
                response.confidence,
                meta.severity,
                now
              ),
            };
          }

          return { histories: newHistories };
        });
      },

      replaceHistories: (histories) => set({ histories }),

      getItemHistory: (itemId) => {
        return get().histories[itemId];
      },

      getWeakestItems: (limit, stackId) => {
        const all = Object.values(get().histories);
        const filtered = stackId
          ? all.filter((h) => h.stackId === stackId)
          : all;
        return filtered
          .sort((a, b) => b.learningPriority - a.learningPriority)
          .slice(0, limit);
      },

      getSectionAverages: (stackId) => {
        const all = Object.values(get().histories).filter(
          (h) => h.stackId === stackId
        );
        const bySection: Record<string, number[]> = {};
        for (const h of all) {
          if (!bySection[h.sectionId]) bySection[h.sectionId] = [];
          bySection[h.sectionId].push(h.currentConfidence);
        }
        return Object.entries(bySection)
          .map(([sectionId, confidences]) => ({
            sectionId,
            average:
              Math.round(
                (confidences.reduce((a, b) => a + b, 0) /
                  confidences.length) *
                  10
              ) / 10,
          }))
          .sort((a, b) => a.average - b.average);
      },
    }),
    {
      name: 'confidence-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
