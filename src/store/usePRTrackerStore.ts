import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { TrackedPR, PRStatus, PRRole, PRPriority, PRSize } from '../data/types';
import { PR_ACTIVE_STATUSES } from '../data/types';

interface WipStatus {
  regularCount: number;
  emergencyCount: number;
  wipLimit: number;
  emergencySlotEnabled: boolean;
  isAtLimit: boolean;
  isOverLimit: boolean;
  emergencySlotUsed: boolean;
  totalActive: number;
}

interface DailyReviewProgress {
  smallTotal: number;
  smallReviewed: number;
  mediumTotal: number;
  mediumReviewed: number;
  largeTotal: number;
  largeReviewed: number;
  suggestion: string;
}

interface AddPRInput {
  title: string;
  url?: string;
  role: PRRole;
  priority?: PRPriority;
  isEmergency?: boolean;
  size?: PRSize;
  repo?: string;
  prNumber?: number;
  prAuthor?: string;
  notes?: string;
}

interface PRTrackerState {
  prs: Record<string, TrackedPR>;
  wipLimit: number;
  emergencySlotEnabled: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  addPR: (input: AddPRInput) => string;
  updatePR: (id: string, updates: Partial<Omit<TrackedPR, 'id' | 'createdAt'>>) => void;
  deletePR: (id: string) => void;
  setStatus: (id: string, status: PRStatus) => void;
  markReviewed: (id: string) => void;
  linkSession: (prId: string, sessionId: string) => void;
  unlinkSession: (prId: string) => void;

  setWipLimit: (limit: number) => void;
  setEmergencySlotEnabled: (enabled: boolean) => void;
  replacePRs: (prs: Record<string, TrackedPR>) => void;

  getActivePRs: () => TrackedPR[];
  getActiveAuthoredPRs: () => TrackedPR[];
  getActiveAuthoredRegular: () => TrackedPR[];
  getActiveAuthoredEmergency: () => TrackedPR[];
  getActiveReviewPRs: () => TrackedPR[];
  getResolvedPRs: () => TrackedPR[];
  getWipStatus: () => WipStatus;
  getDailyReviewProgress: () => DailyReviewProgress;
  getPRsByStatus: (status: PRStatus) => TrackedPR[];
  getPRsByRole: (role: PRRole) => TrackedPR[];
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isActive(pr: TrackedPR): boolean {
  return PR_ACTIVE_STATUSES.includes(pr.status);
}

function byUpdatedDesc(a: TrackedPR, b: TrackedPR): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export const usePRTrackerStore = create<PRTrackerState>()(
  persist(
    (set, get) => ({
      prs: {},
      wipLimit: 3,
      emergencySlotEnabled: true,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      addPR: (input) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const pr: TrackedPR = {
          id,
          title: input.title,
          url: input.url,
          status: input.role === 'reviewer' ? 'needs-review' : 'in-review',
          role: input.role,
          priority: input.priority ?? 'normal',
          isEmergency: input.isEmergency ?? false,
          size: input.size,
          repo: input.repo,
          prNumber: input.prNumber,
          prAuthor: input.prAuthor,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ prs: { ...state.prs, [id]: pr } }));
        return id;
      },

      updatePR: (id, updates) => {
        set((state) => {
          const existing = state.prs[id];
          if (!existing) return state;
          const now = new Date().toISOString();
          const resolvedAt =
            updates.status && !PR_ACTIVE_STATUSES.includes(updates.status)
              ? now
              : existing.resolvedAt;
          return {
            prs: {
              ...state.prs,
              [id]: { ...existing, ...updates, updatedAt: now, resolvedAt },
            },
          };
        });
      },

      deletePR: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.prs;
          return { prs: rest };
        });
      },

      setStatus: (id, status) => {
        get().updatePR(id, { status });
      },

      markReviewed: (id) => {
        get().updatePR(id, { lastReviewedAt: new Date().toISOString() });
      },

      linkSession: (prId, sessionId) => {
        get().updatePR(prId, { linkedSessionId: sessionId });
      },

      unlinkSession: (prId) => {
        get().updatePR(prId, { linkedSessionId: undefined });
      },

      setWipLimit: (limit) => set({ wipLimit: limit }),
      setEmergencySlotEnabled: (enabled) => set({ emergencySlotEnabled: enabled }),
      replacePRs: (prs) => set({ prs }),

      getActivePRs: () => {
        return Object.values(get().prs).filter(isActive).sort(byUpdatedDesc);
      },

      getActiveAuthoredPRs: () => {
        return Object.values(get().prs)
          .filter((pr) => isActive(pr) && pr.role === 'author')
          .sort(byUpdatedDesc);
      },

      getActiveAuthoredRegular: () => {
        return Object.values(get().prs)
          .filter((pr) => isActive(pr) && pr.role === 'author' && !pr.isEmergency)
          .sort(byUpdatedDesc);
      },

      getActiveAuthoredEmergency: () => {
        return Object.values(get().prs)
          .filter((pr) => isActive(pr) && pr.role === 'author' && pr.isEmergency)
          .sort(byUpdatedDesc);
      },

      getActiveReviewPRs: () => {
        return Object.values(get().prs)
          .filter((pr) => isActive(pr) && pr.role === 'reviewer')
          .sort(byUpdatedDesc);
      },

      getResolvedPRs: () => {
        return Object.values(get().prs)
          .filter((pr) => !isActive(pr))
          .sort(byUpdatedDesc);
      },

      getWipStatus: () => {
        const state = get();
        const authored = Object.values(state.prs).filter(
          (pr) => isActive(pr) && pr.role === 'author',
        );
        const regularCount = authored.filter((pr) => !pr.isEmergency).length;
        const emergencyCount = authored.filter((pr) => pr.isEmergency).length;
        return {
          regularCount,
          emergencyCount,
          wipLimit: state.wipLimit,
          emergencySlotEnabled: state.emergencySlotEnabled,
          isAtLimit: regularCount >= state.wipLimit,
          isOverLimit: regularCount > state.wipLimit,
          emergencySlotUsed: emergencyCount >= 1,
          totalActive: regularCount + emergencyCount,
        };
      },

      getDailyReviewProgress: () => {
        const reviewPRs = Object.values(get().prs).filter(
          (pr) => isActive(pr) && pr.role === 'reviewer',
        );

        const smallPRs = reviewPRs.filter((pr) => pr.size === 'small');
        const mediumPRs = reviewPRs.filter((pr) => pr.size === 'medium');
        const largePRs = reviewPRs.filter((pr) => pr.size === 'large');

        const smallReviewed = smallPRs.filter(
          (pr) => pr.lastReviewedAt && isToday(pr.lastReviewedAt),
        ).length;
        const mediumReviewed = mediumPRs.filter(
          (pr) => pr.lastReviewedAt && isToday(pr.lastReviewedAt),
        ).length;
        const largeReviewed = largePRs.filter(
          (pr) => pr.lastReviewedAt && isToday(pr.lastReviewedAt),
        ).length;

        const suggestions: string[] = [];
        const smallRemaining = smallPRs.length - smallReviewed;
        if (smallRemaining > 0) {
          suggestions.push(`${smallRemaining} small PR${smallRemaining > 1 ? 's' : ''}`);
        }
        const mediumTarget = Math.min(5, mediumPRs.length);
        if (mediumReviewed < mediumTarget) {
          suggestions.push(`${mediumTarget - mediumReviewed} more medium PR${mediumTarget - mediumReviewed > 1 ? 's' : ''}`);
        }
        const largeTarget = Math.min(2, largePRs.length);
        if (largeReviewed < largeTarget) {
          suggestions.push(`${largeTarget - largeReviewed} more large PR${largeTarget - largeReviewed > 1 ? 's' : ''}`);
        }

        const suggestion =
          suggestions.length === 0
            ? 'All caught up!'
            : `Try to review ${suggestions.join(', ')} today`;

        return {
          smallTotal: smallPRs.length,
          smallReviewed,
          mediumTotal: mediumPRs.length,
          mediumReviewed,
          largeTotal: largePRs.length,
          largeReviewed,
          suggestion,
        };
      },

      getPRsByStatus: (status) => {
        return Object.values(get().prs)
          .filter((pr) => pr.status === status)
          .sort(byUpdatedDesc);
      },

      getPRsByRole: (role) => {
        return Object.values(get().prs)
          .filter((pr) => pr.role === role)
          .sort(byUpdatedDesc);
      },
    }),
    {
      name: 'pr-tracker-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        prs: state.prs,
        wipLimit: state.wipLimit,
        emergencySlotEnabled: state.emergencySlotEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
