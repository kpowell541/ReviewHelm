import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';
import type { AiFeature, ClaudeModel } from '../data/types';
import { estimateCost } from '../ai/pricing';

interface ModelUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

interface FeatureUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  byModel: Partial<Record<ClaudeModel, ModelUsage>>;
}

interface UsageDay {
  date: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  byModel: Partial<Record<ClaudeModel, ModelUsage>>;
  byFeature: Partial<Record<AiFeature, FeatureUsage>>;
}

interface SessionUsage {
  sessionId: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  byModel: Partial<Record<ClaudeModel, ModelUsage>>;
  byFeature: Partial<Record<AiFeature, FeatureUsage>>;
  lastUpdatedAt: string;
}

interface UsageSnapshot {
  byDay: Record<string, UsageDay>;
  bySession: Record<string, SessionUsage>;
}

interface FeatureCostBreakdown {
  feature: AiFeature;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface SessionUsageSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  byFeature: FeatureCostBreakdown[];
}

interface BudgetStatus {
  monthlyCostUsd: number;
  budgetUsd: number;
  percentUsed: number;
  thresholdReached: number | null;
  overBudget: boolean;
}

interface UsageStoreState {
  byDay: Record<string, UsageDay>;
  bySession: Record<string, SessionUsage>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  monthlyBudgetUsd: number;
  alertThresholds: number[];
  hardStopAtBudget: boolean;
  autoDowngradeNearBudget: boolean;
  autoDowngradeThresholdPct: number;
  cooldownSeconds: number;
  lastAiCallAtMs: number | null;
  lastAlertThreshold: number | null;
  externalMonthlyCostUsd: number | null;
  externalCostUpdatedAt: string | null;

  replaceUsage: (usage: UsageSnapshot | Record<string, UsageDay>) => void;
  recordUsage: (
    model: ClaudeModel,
    inputTokens: number,
    outputTokens: number,
    meta?: { feature?: AiFeature; sessionId?: string },
  ) => void;
  resetUsage: () => void;
  getTodayCalls: () => number;
  getTotalTokens: () => number;
  getEstimatedCost: () => number;
  getCurrentMonthLocalCost: () => number;
  getCurrentMonthFeatureBreakdown: () => FeatureCostBreakdown[];
  getSessionUsageSummary: (sessionId: string) => SessionUsageSummary;
  getBudgetStatus: () => BudgetStatus;
  getCooldownRemainingMs: () => number;
  markAiCallStart: () => void;
  setMonthlyBudget: (budgetUsd: number) => void;
  setAlertThresholds: (thresholds: number[]) => void;
  setHardStopAtBudget: (enabled: boolean) => void;
  setAutoDowngradeNearBudget: (enabled: boolean) => void;
  setAutoDowngradeThresholdPct: (thresholdPct: number) => void;
  setCooldownSeconds: (seconds: number) => void;
  setExternalMonthlyCost: (costUsd: number | null) => void;
  acknowledgeAlertThreshold: (threshold: number | null) => void;
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthPrefix(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function sanitizeThresholds(thresholds: number[]): number[] {
  const normalized = thresholds
    .map((value) => Math.round(value))
    .filter((value) => value > 0 && value < 100);
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function sanitizePercentThreshold(value: number): number {
  const rounded = Math.round(value);
  return Math.min(99, Math.max(50, rounded));
}

function sanitizeCooldownSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(60, Math.round(value)));
}

function isUsageSnapshot(
  usage: UsageSnapshot | Record<string, UsageDay>,
): usage is UsageSnapshot {
  return (
    typeof usage === 'object' &&
    usage !== null &&
    'byDay' in usage
  );
}

function computeCost(byModel: Partial<Record<ClaudeModel, ModelUsage>>): number {
  let cost = 0;
  for (const [model, usage] of Object.entries(byModel)) {
    if (!usage) continue;
    cost += estimateCost(
      model as ClaudeModel,
      usage.inputTokens,
      usage.outputTokens,
    );
  }
  return cost;
}

function addModelUsage(
  byModel: Partial<Record<ClaudeModel, ModelUsage>>,
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number,
): Partial<Record<ClaudeModel, ModelUsage>> {
  const existingModel = byModel[model] ?? {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
  return {
    ...byModel,
    [model]: {
      calls: existingModel.calls + 1,
      inputTokens: existingModel.inputTokens + inputTokens,
      outputTokens: existingModel.outputTokens + outputTokens,
    },
  };
}

function addFeatureUsage(
  byFeature: Partial<Record<AiFeature, FeatureUsage>>,
  feature: AiFeature,
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number,
): Partial<Record<AiFeature, FeatureUsage>> {
  const existingFeature = byFeature[feature] ?? {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    byModel: {},
  };
  return {
    ...byFeature,
    [feature]: {
      calls: existingFeature.calls + 1,
      inputTokens: existingFeature.inputTokens + inputTokens,
      outputTokens: existingFeature.outputTokens + outputTokens,
      byModel: addModelUsage(
        existingFeature.byModel,
        model,
        inputTokens,
        outputTokens,
      ),
    },
  };
}

export const useUsageStore = create<UsageStoreState>()(
  persist(
    (set, get) => ({
      byDay: {},
      bySession: {},
      hasHydrated: false,
      monthlyBudgetUsd: 40,
      alertThresholds: [70, 85, 95],
      hardStopAtBudget: false,
      autoDowngradeNearBudget: true,
      autoDowngradeThresholdPct: 85,
      cooldownSeconds: 6,
      lastAiCallAtMs: null,
      lastAlertThreshold: null,
      externalMonthlyCostUsd: null,
      externalCostUpdatedAt: null,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      replaceUsage: (usage) => {
        if (isUsageSnapshot(usage)) {
          set({
            byDay: usage.byDay ?? {},
            bySession: usage.bySession ?? {},
          });
          return;
        }
        set({
          byDay: usage ?? {},
          bySession: {},
        });
      },

      recordUsage: (model, inputTokens, outputTokens, meta) => {
        const today = getDateKey(new Date());
        const feature = meta?.feature;
        const sessionId = meta?.sessionId;

        set((state) => {
          const nextByDay = { ...(state.byDay ?? {}) };
          const existingDay = nextByDay[today] ?? {
            date: today,
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            byModel: {},
            byFeature: {},
          };
          const nextDay: UsageDay = {
            ...existingDay,
            calls: existingDay.calls + 1,
            inputTokens: existingDay.inputTokens + inputTokens,
            outputTokens: existingDay.outputTokens + outputTokens,
            byModel: addModelUsage(
              existingDay.byModel ?? {},
              model,
              inputTokens,
              outputTokens,
            ),
            byFeature: existingDay.byFeature ?? {},
          };
          if (feature) {
            nextDay.byFeature = addFeatureUsage(
              nextDay.byFeature,
              feature,
              model,
              inputTokens,
              outputTokens,
            );
          }
          nextByDay[today] = nextDay;

          const nextState: Partial<UsageStoreState> = { byDay: nextByDay };

          if (sessionId) {
            const nextBySession = { ...(state.bySession ?? {}) };
            const existingSession = nextBySession[sessionId] ?? {
              sessionId,
              calls: 0,
              inputTokens: 0,
              outputTokens: 0,
              byModel: {},
              byFeature: {},
              lastUpdatedAt: new Date().toISOString(),
            };
            const nextSession: SessionUsage = {
              ...existingSession,
              calls: existingSession.calls + 1,
              inputTokens: existingSession.inputTokens + inputTokens,
              outputTokens: existingSession.outputTokens + outputTokens,
              byModel: addModelUsage(
                existingSession.byModel ?? {},
                model,
                inputTokens,
                outputTokens,
              ),
              byFeature: existingSession.byFeature ?? {},
              lastUpdatedAt: new Date().toISOString(),
            };
            if (feature) {
              nextSession.byFeature = addFeatureUsage(
                nextSession.byFeature,
                feature,
                model,
                inputTokens,
                outputTokens,
              );
            }
            nextBySession[sessionId] = nextSession;
            nextState.bySession = nextBySession;
          }

          return nextState;
        });
      },

      resetUsage: () =>
        set({
          byDay: {},
          bySession: {},
          lastAlertThreshold: null,
          externalMonthlyCostUsd: null,
          externalCostUpdatedAt: null,
        }),

      getTodayCalls: () => {
        const today = getDateKey(new Date());
        return (get().byDay ?? {})[today]?.calls ?? 0;
      },

      getTotalTokens: () => {
        return Object.values(get().byDay ?? {}).reduce(
          (sum, day) => sum + day.inputTokens + day.outputTokens,
          0,
        );
      },

      getEstimatedCost: () => {
        let cost = 0;
        for (const day of Object.values(get().byDay ?? {})) {
          cost += computeCost(day.byModel ?? {});
        }
        return cost;
      },

      getCurrentMonthLocalCost: () => {
        const monthPrefix = getCurrentMonthPrefix(new Date());
        let cost = 0;
        for (const day of Object.values(get().byDay ?? {})) {
          if (!day.date.startsWith(monthPrefix)) continue;
          cost += computeCost(day.byModel ?? {});
        }
        return cost;
      },

      getCurrentMonthFeatureBreakdown: () => {
        const monthPrefix = getCurrentMonthPrefix(new Date());
        const aggregate: Partial<Record<AiFeature, FeatureUsage>> = {};

        for (const day of Object.values(get().byDay ?? {})) {
          if (!day.date.startsWith(monthPrefix)) continue;
          for (const [feature, usage] of Object.entries(day.byFeature ?? {})) {
            if (!usage) continue;
            const key = feature as AiFeature;
            const existing = aggregate[key] ?? {
              calls: 0,
              inputTokens: 0,
              outputTokens: 0,
              byModel: {},
            };
            aggregate[key] = {
              calls: existing.calls + usage.calls,
              inputTokens: existing.inputTokens + usage.inputTokens,
              outputTokens: existing.outputTokens + usage.outputTokens,
              byModel: Object.entries(usage.byModel ?? {}).reduce(
                (acc, [model, modelUsage]) => {
                  if (!modelUsage) return acc;
                  const modelKey = model as ClaudeModel;
                  const existingModel = acc[modelKey] ?? {
                    calls: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                  };
                  acc[modelKey] = {
                    calls: existingModel.calls + modelUsage.calls,
                    inputTokens:
                      existingModel.inputTokens + modelUsage.inputTokens,
                    outputTokens:
                      existingModel.outputTokens + modelUsage.outputTokens,
                  };
                  return acc;
                },
                { ...(existing.byModel ?? {}) } as Partial<
                  Record<ClaudeModel, ModelUsage>
                >,
              ),
            };
          }
        }

        return Object.entries(aggregate)
          .map(([feature, usage]) => ({
            feature: feature as AiFeature,
            calls: usage?.calls ?? 0,
            inputTokens: usage?.inputTokens ?? 0,
            outputTokens: usage?.outputTokens ?? 0,
            costUsd: computeCost(usage?.byModel ?? {}),
          }))
          .filter((item) => item.calls > 0)
          .sort((a, b) => b.costUsd - a.costUsd);
      },

      getSessionUsageSummary: (sessionId) => {
        const usage = (get().bySession ?? {})[sessionId];
        if (!usage) {
          return {
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            byFeature: [],
          };
        }

        const byFeature = Object.entries(usage.byFeature ?? {})
          .map(([feature, featureUsage]) => ({
            feature: feature as AiFeature,
            calls: featureUsage?.calls ?? 0,
            inputTokens: featureUsage?.inputTokens ?? 0,
            outputTokens: featureUsage?.outputTokens ?? 0,
            costUsd: computeCost(featureUsage?.byModel ?? {}),
          }))
          .filter((item) => item.calls > 0)
          .sort((a, b) => b.costUsd - a.costUsd);

        return {
          calls: usage.calls,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costUsd: computeCost(usage.byModel ?? {}),
          byFeature,
        };
      },

      getBudgetStatus: () => {
        const state = get();
        const local = state.getCurrentMonthLocalCost();
        const monthlyCostUsd =
          state.externalMonthlyCostUsd === null
            ? local
            : Math.max(local, state.externalMonthlyCostUsd);
        const budgetUsd = Math.max(1, state.monthlyBudgetUsd);
        const percentUsed = (monthlyCostUsd / budgetUsd) * 100;
        const thresholdReached =
          [...state.alertThresholds]
            .sort((a, b) => b - a)
            .find((threshold) => percentUsed >= threshold) ?? null;
        return {
          monthlyCostUsd,
          budgetUsd,
          percentUsed,
          thresholdReached,
          overBudget: percentUsed >= 100,
        };
      },

      getCooldownRemainingMs: () => {
        const state = get();
        if (state.cooldownSeconds <= 0 || !state.lastAiCallAtMs) return 0;
        const elapsed = Date.now() - state.lastAiCallAtMs;
        const remaining = state.cooldownSeconds * 1000 - elapsed;
        return Math.max(0, remaining);
      },

      markAiCallStart: () => set({ lastAiCallAtMs: Date.now() }),

      setMonthlyBudget: (budgetUsd) =>
        set({ monthlyBudgetUsd: Math.max(1, budgetUsd) }),

      setAlertThresholds: (thresholds) =>
        set({ alertThresholds: sanitizeThresholds(thresholds) }),

      setHardStopAtBudget: (enabled) => set({ hardStopAtBudget: enabled }),

      setAutoDowngradeNearBudget: (enabled) =>
        set({ autoDowngradeNearBudget: enabled }),

      setAutoDowngradeThresholdPct: (thresholdPct) =>
        set({ autoDowngradeThresholdPct: sanitizePercentThreshold(thresholdPct) }),

      setCooldownSeconds: (seconds) =>
        set({ cooldownSeconds: sanitizeCooldownSeconds(seconds) }),

      setExternalMonthlyCost: (costUsd) =>
        set({
          externalMonthlyCostUsd: costUsd,
          externalCostUpdatedAt:
            costUsd === null ? null : new Date().toISOString(),
        }),

      acknowledgeAlertThreshold: (threshold) =>
        set({ lastAlertThreshold: threshold }),
    }),
    {
      name: 'usage-storage',
      storage: createJSONStorage(() => persistStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
