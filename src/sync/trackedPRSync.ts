import { api, ApiError } from '../api/client';
import { usePRTrackerStore } from '../store/usePRTrackerStore';
import type { TrackedPR } from '../data/types';
import type { ApiTrackedPR } from '../api/schema';
import type { AdapterResult } from './types';
import { mergeTrackedPR, serializeTrackedPR } from '../utils/trackedPRMerge';

export async function syncTrackedPRs(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const remotePRs = await api.get<ApiTrackedPR[]>('/tracked-prs');
    const prState = usePRTrackerStore.getState();
    const localPRs = prState.prs;
    const deletedPRIdSet = new Set(prState.deletedPRIds ?? []);
    const remoteById = new Map(
      remotePRs.map((pr) => [pr.id, pr as unknown as TrackedPR]),
    );

    const mergedPRs = { ...localPRs };
    const allIds = new Set([
      ...Object.keys(localPRs),
      ...remotePRs.map((pr) => pr.id),
    ]);

    for (const id of allIds) {
      if (deletedPRIdSet.has(id)) continue;
      const local = localPRs[id];
      const remote = remoteById.get(id);
      const merged = mergeTrackedPR(local, remote);
      if (!merged) continue;

      mergedPRs[id] = merged;
      if (!local || serializeTrackedPR(local) !== serializeTrackedPR(merged)) {
        pulled++;
      }
    }

    for (const pr of Object.values(mergedPRs)) {
      if (deletedPRIdSet.has(pr.id)) continue;
      const remote = remoteById.get(pr.id);
      if (remote && serializeTrackedPR(pr) === serializeTrackedPR(remote)) {
        continue;
      }

      try {
        await api.put(`/tracked-prs/${pr.id}`, {
          id: pr.id,
          title: pr.title,
          url: pr.url,
          status: pr.status,
          role: pr.role,
          priority: pr.priority,
          isEmergency: pr.isEmergency ?? false,
          size: pr.size,
          repo: pr.repo,
          prNumber: pr.prNumber,
          prAuthor: pr.prAuthor,
          dependencies: pr.dependencies,
          ciPassing: pr.ciPassing,
          linkedSessionId: pr.linkedSessionId,
          notes: pr.notes,
          reviewOutcome: pr.reviewOutcome,
          acceptanceOutcome: pr.acceptanceOutcome,
          resolvedAt: pr.resolvedAt,
          lastReviewedAt: pr.lastReviewedAt,
          archivedAt: pr.archivedAt,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
        });
        pushed++;
      } catch (err: unknown) {
        errors.push(`PR ${pr.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

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
