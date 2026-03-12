import { api, ApiError } from '../api/client';
import { usePRTrackerStore } from '../store/usePRTrackerStore';
import type { TrackedPR } from '../data/types';
import type { AdapterResult } from './types';

export async function syncTrackedPRs(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    // Pull remote PRs
    const remotePRs = await api.get<TrackedPR[]>('/tracked-prs');
    const prState = usePRTrackerStore.getState();
    const localPRs = prState.prs;
    const deletedPRIdSet = new Set(prState.deletedPRIds ?? []);
    const mergedPRs = { ...localPRs };

    // Merge remote into local (last-write-wins), skip locally-deleted PRs
    for (const remote of remotePRs) {
      if (deletedPRIdSet.has(remote.id)) continue;
      const local = mergedPRs[remote.id];
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        mergedPRs[remote.id] = remote;
        pulled++;
      }
    }

    // Push local PRs that are newer or don't exist remotely
    const remoteById = new Map(remotePRs.map((pr) => [pr.id, pr]));
    for (const local of Object.values(localPRs)) {
      const remote = remoteById.get(local.id);
      if (!remote || new Date(local.updatedAt) > new Date(remote.updatedAt)) {
        try {
          await api.put(`/tracked-prs/${local.id}`, {
            id: local.id,
            title: local.title,
            url: local.url,
            status: local.status,
            role: local.role,
            priority: local.priority,
            isEmergency: local.isEmergency ?? false,
            size: local.size,
            repo: local.repo,
            prNumber: local.prNumber,
            prAuthor: local.prAuthor,
            dependencies: local.dependencies,
            ciPassing: local.ciPassing,
            linkedSessionId: local.linkedSessionId,
            notes: local.notes,
            reviewOutcome: local.reviewOutcome,
            acceptanceOutcome: local.acceptanceOutcome,
            resolvedAt: local.resolvedAt,
            lastReviewedAt: local.lastReviewedAt,
            archivedAt: local.archivedAt,
            createdAt: local.createdAt,
            updatedAt: local.updatedAt,
          });
          pushed++;
        } catch (err: unknown) {
          errors.push(`PR ${local.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Delete remote PRs that were explicitly deleted locally
    const deletedPRIds = usePRTrackerStore.getState().deletedPRIds ?? [];
    const successfulPRDeletes: string[] = [];
    for (const deletedId of deletedPRIds) {
      try {
        await api.delete(`/tracked-prs/${deletedId}`);
        successfulPRDeletes.push(deletedId);
        delete mergedPRs[deletedId];
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          successfulPRDeletes.push(deletedId);
          delete mergedPRs[deletedId];
        } else {
          errors.push(`Delete PR ${deletedId}: ${err instanceof Error ? err.message : String(err)}`);
          delete mergedPRs[deletedId];
        }
      }
    }

    usePRTrackerStore.getState().replacePRs(mergedPRs);
    if (successfulPRDeletes.length === deletedPRIds.length) {
      usePRTrackerStore.getState().clearDeletedPRIds();
    } else if (successfulPRDeletes.length > 0) {
      usePRTrackerStore.setState((state) => ({
        deletedPRIds: state.deletedPRIds.filter(
          (id) => !successfulPRDeletes.includes(id),
        ),
      }));
    }
  } catch (err: unknown) {
    errors.push(`Sync PRs: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors, label: 'PRs' };
}
