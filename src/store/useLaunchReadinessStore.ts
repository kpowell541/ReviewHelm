import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';

interface LaunchReadinessState {
  checkedTaskIds: Record<string, boolean>;
  setTaskChecked: (taskId: string, checked: boolean) => void;
  toggleTaskChecked: (taskId: string) => void;
  resetTaskChecks: () => void;
}

export const useLaunchReadinessStore = create<LaunchReadinessState>()(
  persist(
    (set, get) => ({
      checkedTaskIds: {},
      setTaskChecked: (taskId, checked) => {
        set((state) => ({
          checkedTaskIds: {
            ...state.checkedTaskIds,
            [taskId]: checked,
          },
        }));
      },
      toggleTaskChecked: (taskId) => {
        const current = Boolean(get().checkedTaskIds[taskId]);
        get().setTaskChecked(taskId, !current);
      },
      resetTaskChecks: () => set({ checkedTaskIds: {} }),
    }),
    {
      name: 'launch-readiness-storage',
      storage: createJSONStorage(() => persistStorage),
    },
  ),
);
