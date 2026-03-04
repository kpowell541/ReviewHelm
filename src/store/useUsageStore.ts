import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClaudeModel } from '../data/types';
import { estimateCost } from '../ai';

interface ModelUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

interface UsageDay {
  date: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  byModel: Partial<Record<ClaudeModel, ModelUsage>>;
}

interface UsageStoreState {
  byDay: Record<string, UsageDay>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  replaceUsage: (byDay: Record<string, UsageDay>) => void;
  recordUsage: (
    model: ClaudeModel,
    inputTokens: number,
    outputTokens: number,
  ) => void;
  resetUsage: () => void;
  getTodayCalls: () => number;
  getTotalTokens: () => number;
  getEstimatedCost: () => number;
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const useUsageStore = create<UsageStoreState>()(
  persist(
    (set, get) => ({
      byDay: {},
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      replaceUsage: (byDay) => set({ byDay }),

      recordUsage: (model, inputTokens, outputTokens) => {
        const today = getDateKey(new Date());
        set((state) => {
          const existingDay = state.byDay[today] ?? {
            date: today,
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            byModel: {},
          };
          const existingModel = existingDay.byModel[model] ?? {
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
          };

          return {
            byDay: {
              ...state.byDay,
              [today]: {
                ...existingDay,
                calls: existingDay.calls + 1,
                inputTokens: existingDay.inputTokens + inputTokens,
                outputTokens: existingDay.outputTokens + outputTokens,
                byModel: {
                  ...existingDay.byModel,
                  [model]: {
                    calls: existingModel.calls + 1,
                    inputTokens: existingModel.inputTokens + inputTokens,
                    outputTokens: existingModel.outputTokens + outputTokens,
                  },
                },
              },
            },
          };
        });
      },

      resetUsage: () => set({ byDay: {} }),

      getTodayCalls: () => {
        const today = getDateKey(new Date());
        return get().byDay[today]?.calls ?? 0;
      },

      getTotalTokens: () => {
        return Object.values(get().byDay).reduce(
          (sum, day) => sum + day.inputTokens + day.outputTokens,
          0,
        );
      },

      getEstimatedCost: () => {
        let cost = 0;
        for (const day of Object.values(get().byDay)) {
          for (const [model, usage] of Object.entries(day.byModel)) {
            if (!usage) continue;
            cost += estimateCost(
              model as ClaudeModel,
              usage.inputTokens,
              usage.outputTokens,
            );
          }
        }
        return cost;
      },
    }),
    {
      name: 'usage-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
