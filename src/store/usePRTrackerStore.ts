import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';
import { randomUUID } from 'expo-crypto';
import type { TrackedPR, PRStatus, PRRole, PRPriority, PRSize, PRDependency, CIPassing, AcceptanceOutcome, ReviewOutcome } from '../data/types';
import { PR_ACTIVE_STATUSES, PR_PRIORITY_ORDER } from '../data/types';
import { useSessionStore } from './useSessionStore';

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

interface TodaysPlan {
  prs: TrackedPR[];
  capacityNote: string;
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
  dependencies?: PRDependency[];
  ciPassing?: CIPassing;
  notes?: string;
}

interface PRTrackerState {
  prs: Record<string, TrackedPR>;
  deletedPRIds: string[];
  wipLimit: number;
  emergencySlotEnabled: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  addPR: (input: AddPRInput) => string;
  updatePR: (id: string, updates: Partial<Omit<TrackedPR, 'id' | 'createdAt'>>) => void;
  deletePR: (id: string) => void;
  setStatus: (id: string, status: PRStatus) => void;
  markReviewed: (id: string) => void;
  markAccepted: (id: string, outcome: AcceptanceOutcome) => void;
  setReviewOutcome: (id: string, outcome: ReviewOutcome) => void;
  setReReviewed: (id: string, reReviewed: boolean) => void;
  setChangesEverNeeded: (id: string, changesEverNeeded: boolean) => void;
  setSelfReviewed: (id: string, selfReviewed: boolean) => void;
  setReviewRoundCount: (id: string, count: number) => void;
  linkSession: (prId: string, sessionId: string) => void;
  unlinkSession: (prId: string) => void;

  archiveOldPRs: () => number;
  getArchivedPRs: () => TrackedPR[];

  setWipLimit: (limit: number) => void;
  setEmergencySlotEnabled: (enabled: boolean) => void;
  replacePRs: (prs: Record<string, TrackedPR>) => void;
  clearDeletedPRIds: () => void;

  getActivePRs: () => TrackedPR[];
  getActiveAuthoredPRs: () => TrackedPR[];
  getActiveAuthoredRegular: () => TrackedPR[];
  getActiveAuthoredEmergency: () => TrackedPR[];
  getActiveReviewPRs: () => TrackedPR[];
  getResolvedPRs: () => TrackedPR[];
  getWipStatus: () => WipStatus;
  getDailyReviewProgress: () => DailyReviewProgress;
  getTodaysPlan: () => TodaysPlan;
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

function isWeekday(): boolean {
  const day = new Date().getDay();
  return day >= 1 && day <= 5;
}

function isActive(pr: TrackedPR): boolean {
  return PR_ACTIVE_STATUSES.includes(pr.status) && !pr.archivedAt;
}

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

function byUpdatedDesc(a: TrackedPR, b: TrackedPR): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/** Loosely coupled side-effect: complete linked sessions when a PR is resolved. */
function autoCompleteLinkedSessions(prId: string): void {
  try {
    const sessionState = useSessionStore.getState();
    const linkedSessions = Object.values(sessionState.sessions).filter(
      (s) => s.linkedPRId === prId && !s.isComplete,
    );
    for (const s of linkedSessions) {
      sessionState.completeSession(s.id);
    }
  } catch {
    // Session store may not be initialized (e.g. in tests)
  }
}

export const usePRTrackerStore = create<PRTrackerState>()(
  persist(
    (set, get) => ({
      prs: {},
      deletedPRIds: [],
      wipLimit: 3,
      emergencySlotEnabled: true,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      addPR: (input) => {
        const id = randomUUID();
        const now = new Date().toISOString();
        const pr: TrackedPR = {
          id,
          title: input.title,
          url: input.url,
          status: input.role === 'reviewer' ? 'needs-review' : 'in-review',
          role: input.role,
          priority: input.priority ?? 'medium',
          isEmergency: input.isEmergency ?? false,
          size: input.size,
          repo: input.repo,
          prNumber: input.prNumber,
          prAuthor: input.prAuthor,
          dependencies: input.dependencies,
          ciPassing: input.ciPassing,
          notes: input.notes,
          reviewRoundCount: 0,
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
          return {
            prs: rest,
            deletedPRIds: [...state.deletedPRIds, id],
          };
        });
      },

      setStatus: (id, status) => {
        get().updatePR(id, { status });
      },

      markReviewed: (id) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          // Lock reviewed state once in re-review mode
          if (pr.changesEverNeeded) return state;
          const now = new Date().toISOString();
          const wasReviewed = pr.lastReviewedAt && isToday(pr.lastReviewedAt);
          const lastReviewedAt = wasReviewed ? undefined : now;
          return { prs: { ...state.prs, [id]: { ...pr, lastReviewedAt, updatedAt: now } } };
        });
      },

      markAccepted: (id, outcome) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          const toggling = pr.acceptanceOutcome === outcome;
          const acceptanceOutcome = toggling ? undefined : outcome;
          // Move to resolved status when accepted/abandoned, restore when unchecked
          const status = toggling
            ? 'needs-review'
            : outcome === 'accepted-clean'
              ? 'merged'
              : 'closed';
          const now = new Date().toISOString();
          const resolvedAt = toggling ? undefined : now;

          // Auto-complete any linked sessions when PR is accepted/abandoned
          if (!toggling) {
            autoCompleteLinkedSessions(id);
          }

          return { prs: { ...state.prs, [id]: { ...pr, acceptanceOutcome, status, resolvedAt, updatedAt: now } } };
        });
      },

      setReviewOutcome: (id, outcome) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          const reviewOutcome = pr.reviewOutcome === outcome ? undefined : outcome;
          // Auto-set changesEverNeeded when selecting 'requested-changes'
          const changesEverNeeded = (reviewOutcome === 'requested-changes')
            ? true
            : pr.changesEverNeeded;
          // Reset self-review when changes are requested on author PRs
          const selfReviewed = (reviewOutcome === 'requested-changes' && pr.role === 'author')
            ? undefined
            : pr.selfReviewed;
          // Auto-increment review round count when changes are requested
          const reviewRoundCount = (reviewOutcome === 'requested-changes')
            ? (pr.reviewRoundCount ?? 0) + 1
            : pr.reviewRoundCount;
          return { prs: { ...state.prs, [id]: { ...pr, reviewOutcome, changesEverNeeded, selfReviewed, reviewRoundCount, updatedAt: new Date().toISOString() } } };
        });
      },

      setReReviewed: (id, reReviewed) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          return { prs: { ...state.prs, [id]: { ...pr, reReviewed: reReviewed || undefined, updatedAt: new Date().toISOString() } } };
        });
      },

      setSelfReviewed: (id, selfReviewed) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          return { prs: { ...state.prs, [id]: { ...pr, selfReviewed: selfReviewed || undefined, updatedAt: new Date().toISOString() } } };
        });
      },

      setReviewRoundCount: (id, count) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          const reviewRoundCount = Math.max(0, count);
          return { prs: { ...state.prs, [id]: { ...pr, reviewRoundCount, updatedAt: new Date().toISOString() } } };
        });
      },

      setChangesEverNeeded: (id, changesEverNeeded) => {
        set((state) => {
          const pr = state.prs[id];
          if (!pr) return state;
          // When unchecking, also clear re-review state
          const reReviewed = changesEverNeeded ? pr.reReviewed : undefined;
          return { prs: { ...state.prs, [id]: { ...pr, changesEverNeeded: changesEverNeeded || undefined, reReviewed, updatedAt: new Date().toISOString() } } };
        });
      },

      linkSession: (prId, sessionId) => {
        get().updatePR(prId, { linkedSessionId: sessionId });
      },

      unlinkSession: (prId) => {
        get().updatePR(prId, { linkedSessionId: undefined });
      },

      archiveOldPRs: () => {
        const now = Date.now();
        const cutoff = now - THREE_MONTHS_MS;
        let count = 0;
        set((state) => {
          const updated = { ...state.prs };
          for (const pr of Object.values(updated)) {
            if (pr.archivedAt) continue;
            if (!PR_ACTIVE_STATUSES.includes(pr.status) && pr.resolvedAt) {
              if (new Date(pr.resolvedAt).getTime() < cutoff) {
                const now = new Date().toISOString();
                updated[pr.id] = { ...pr, archivedAt: now, updatedAt: now };
                count++;
              }
            }
          }
          return { prs: updated };
        });
        return count;
      },

      getArchivedPRs: () => {
        return Object.values(get().prs)
          .filter((pr) => !!pr.archivedAt)
          .sort(byUpdatedDesc);
      },

      setWipLimit: (limit) => set({ wipLimit: limit }),
      setEmergencySlotEnabled: (enabled) => set({ emergencySlotEnabled: enabled }),
      replacePRs: (prs) => set({ prs }),
      clearDeletedPRIds: () => set({ deletedPRIds: [] }),

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
          .filter((pr) => !isActive(pr) && !pr.archivedAt)
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
        if (!isWeekday()) {
          return {
            smallTotal: 0, smallReviewed: 0,
            mediumTotal: 0, mediumReviewed: 0,
            largeTotal: 0, largeReviewed: 0,
            suggestion: 'Enjoy your weekend!',
          };
        }

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

      getTodaysPlan: () => {
        if (!isWeekday()) {
          return { prs: [], capacityNote: 'Enjoy your weekend!' };
        }

        const reviewPRs = Object.values(get().prs).filter(
          (pr) => isActive(pr) && pr.role === 'reviewer',
        );

        // Sort by priority (critical first) then by date (oldest first)
        const sorted = [...reviewPRs].sort((a, b) => {
          const aPri = PR_PRIORITY_ORDER.indexOf(a.priority);
          const bPri = PR_PRIORITY_ORDER.indexOf(b.priority);
          if (aPri !== bPri) return aPri - bPri;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Filter out already-reviewed-today
        const notReviewedToday = sorted.filter(
          (pr) => !pr.lastReviewedAt || !isToday(pr.lastReviewedAt),
        );

        // Build plan within daily capacity: all S, up to 5 M, up to 3 L
        const plan: TrackedPR[] = [];
        let mediumCount = 0;
        let largeCount = 0;

        for (const pr of notReviewedToday) {
          const size = pr.size ?? 'medium';
          if (size === 'small') {
            plan.push(pr);
          } else if (size === 'medium' && mediumCount < 5) {
            plan.push(pr);
            mediumCount++;
          } else if (size === 'large' && largeCount < 3) {
            plan.push(pr);
            largeCount++;
          }
        }

        const parts: string[] = [];
        const smallInPlan = plan.filter((pr) => (pr.size ?? 'medium') === 'small').length;
        if (smallInPlan > 0) parts.push(`${smallInPlan}S`);
        if (mediumCount > 0) parts.push(`${mediumCount}M`);
        if (largeCount > 0) parts.push(`${largeCount}L`);

        const capacityNote =
          plan.length === 0
            ? 'All caught up for today!'
            : `Today: ${parts.join(' + ')} (${plan.length} PR${plan.length > 1 ? 's' : ''})`;

        return { prs: plan, capacityNote };
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
      storage: createJSONStorage(() => persistStorage),
      partialize: (state) => ({
        prs: state.prs,
        deletedPRIds: state.deletedPRIds,
        wipLimit: state.wipLimit,
        emergencySlotEnabled: state.emergencySlotEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
