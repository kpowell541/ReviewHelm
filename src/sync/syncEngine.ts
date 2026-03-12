import { api, ApiError } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSessionStore } from '../store/useSessionStore';
import { useConfidenceStore } from '../store/useConfidenceStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { usePRTrackerStore } from '../store/usePRTrackerStore';
import { useSyncStore } from '../store/useSyncStore';
import { useTutorStore } from '../store/useTutorStore';
import { useUsageStore } from '../store/useUsageStore';
import { useBookmarkStore } from '../store/useBookmarkStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useRepoConfigStore } from '../store/useRepoConfigStore';
import { useTierStore } from '../store/useTierStore';
import type { ClaudeModel, Session, Severity, TrackedPR, TutorConversation } from '../data/types';

/**
 * Local-first sync engine.
 * All stores work offline. When online + authenticated, data is
 * pushed/pulled in the background with last-write-wins conflict resolution.
 */

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
  details?: string;
}

interface SessionListResponse {
  items: Session[];
  nextCursor: string | null;
}

async function isOnlineAndAuthenticated(): Promise<boolean> {
  const token = await useAuthStore.getState().getAccessToken();
  return token !== null;
}

async function pushSessionSnapshot(session: Session): Promise<void> {
  await api.patch(`/sessions/${session.id}`, {
    title: session.title,
  });

  for (const [itemId, itemResponse] of Object.entries(session.itemResponses)) {
    await api.patch(
      `/sessions/${session.id}/items/${encodeURIComponent(itemId)}`,
      itemResponse,
    );
  }

  await api.patch(`/sessions/${session.id}/notes`, {
    sessionNotes: session.sessionNotes,
  });

  if (session.isComplete) {
    await api.post(`/sessions/${session.id}/complete`, {
      confirmLowCoverage: true,
    });
  }
}

async function pushSessions(): Promise<{ pushed: number; errors: string[] }> {
  const localSessions = Object.values(useSessionStore.getState().sessions);
  let pushed = 0;
  const errors: string[] = [];

  for (const session of localSessions) {
    try {
      // Try to get remote version
      try {
        const remote = await api.get<{ updatedAt: string }>(
          `/sessions/${session.id}`,
        );
        // If local is newer, push update
        if (new Date(session.updatedAt) > new Date(remote.updatedAt)) {
          await pushSessionSnapshot(session);
          pushed++;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // Session doesn't exist remotely — create it
          const isPolish = session.mode === 'polish';
          await api.post('/sessions', {
            id: session.id,
            mode: session.mode,
            stackId: isPolish ? undefined : session.stackId,
            stackIds: isPolish ? [] : session.stackIds,
            selectedSections: session.selectedSections,
            title: session.title,
          });
          await pushSessionSnapshot(session);
          pushed++;
        } else {
          throw err;
        }
      }
    } catch (err: unknown) {
      errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Delete sessions that were removed locally
  const deletedSessionIds = useSessionStore.getState().deletedSessionIds ?? [];
  const successfulDeletes: string[] = [];
  for (const deletedId of deletedSessionIds) {
    try {
      await api.delete(`/sessions/${deletedId}`);
      successfulDeletes.push(deletedId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Already gone remotely — treat as success
        successfulDeletes.push(deletedId);
      } else {
        errors.push(`Delete session ${deletedId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  // Only clear tombstones for successfully deleted sessions
  if (successfulDeletes.length > 0) {
    useSessionStore.setState((state) => ({
      deletedSessionIds: state.deletedSessionIds.filter(
        (id) => !successfulDeletes.includes(id),
      ),
    }));
  }

  return { pushed, errors };
}

async function pullSessions(): Promise<{ pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pulled = 0;

  try {
    const remoteSessions: Session[] = [];
    let cursor: string | null = null;

    do {
      const requestPath: string = cursor
        ? `/sessions?limit=100&cursor=${encodeURIComponent(cursor)}`
        : '/sessions?limit=100';
      const response: SessionListResponse = await api.get<SessionListResponse>(
        requestPath,
      );
      remoteSessions.push(...response.items);
      cursor = response.nextCursor;
    } while (cursor);

    const sessionState = useSessionStore.getState();
    const localSessions = sessionState.sessions;
    const deletedSessionIds = new Set(sessionState.deletedSessionIds ?? []);

    for (const remote of remoteSessions) {
      // Don't resurrect sessions that were deleted locally
      if (deletedSessionIds.has(remote.id)) continue;

      const local = localSessions[remote.id];
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        // Remote is newer or doesn't exist locally — adopt it
        useSessionStore.setState((state) => ({
          sessions: { ...state.sessions, [remote.id]: remote },
        }));
        pulled++;
      }
    }
  } catch (err: unknown) {
    errors.push(`Pull sessions: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pulled, errors };
}

async function syncPreferences(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const localPrefs = usePreferencesStore.getState();
    const localUsage = useUsageStore.getState();

    // Push local preferences + budget settings to remote
    await api.patch('/me/preferences', {
      aiModel: localPrefs.aiModel,
      defaultSeverityFilter: localPrefs.defaultSeverityFilter,
      antiBiasMode: localPrefs.antiBiasMode,
      fontSize: localPrefs.fontSize,
      codeBlockTheme: localPrefs.codeBlockTheme,
      autoExportPdf: localPrefs.autoExportPdf,
      monthlyBudgetUsd: localUsage.monthlyBudgetUsd,
      alertThresholds: localUsage.alertThresholds,
      hardStopAtBudget: localUsage.hardStopAtBudget,
      autoDowngradeNearBudget: localUsage.autoDowngradeNearBudget,
      autoDowngradeThresholdPct: localUsage.autoDowngradeThresholdPct,
      cooldownSeconds: localUsage.cooldownSeconds,
    });
    pushed = 1;

    // Pull remote preferences (now reflects merged state)
    const remote = await api.get<{
      aiModel: ClaudeModel;
      defaultSeverityFilter: Severity[];
      antiBiasMode: boolean;
      fontSize: 'small' | 'medium' | 'large';
      codeBlockTheme: 'dark' | 'light';
      autoExportPdf: boolean;
      monthlyBudgetUsd: number;
      alertThresholds: number[];
      hardStopAtBudget: boolean;
      autoDowngradeNearBudget: boolean;
      autoDowngradeThresholdPct: number;
      cooldownSeconds: number;
    }>('/me/preferences');

    // Apply UI preferences
    usePreferencesStore.getState().replacePreferences({
      aiModel: remote.aiModel,
      defaultSeverityFilter: remote.defaultSeverityFilter,
      antiBiasMode: remote.antiBiasMode,
      fontSize: remote.fontSize,
      codeBlockTheme: remote.codeBlockTheme,
      autoExportPdf: remote.autoExportPdf,
    });

    // Apply budget settings to usage store
    useUsageStore.setState({
      monthlyBudgetUsd: remote.monthlyBudgetUsd,
      alertThresholds: remote.alertThresholds,
      hardStopAtBudget: remote.hardStopAtBudget,
      autoDowngradeNearBudget: remote.autoDowngradeNearBudget,
      autoDowngradeThresholdPct: remote.autoDowngradeThresholdPct,
      cooldownSeconds: remote.cooldownSeconds,
    });
    pulled = 1;
  } catch (err: unknown) {
    errors.push(`Preferences: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors };
}

async function syncConfidence(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    // Pull remote confidence histories
    const remote = await api.get<{ histories: Record<string, any> }>('/gaps/confidence');
    const remoteHistories: Record<string, any> = remote.histories ?? {};

    const localHistories = useConfidenceStore.getState().histories;
    const merged: Record<string, any> = {};

    // Collect all item IDs from both sides
    const allIds = new Set([...Object.keys(localHistories), ...Object.keys(remoteHistories)]);

    for (const itemId of allIds) {
      const local = localHistories[itemId];
      const rem = remoteHistories[itemId];

      if (local && !rem) {
        // Only exists locally
        merged[itemId] = local;
      } else if (!local && rem) {
        // Only exists remotely
        merged[itemId] = rem;
        pulled++;
      } else if (local && rem) {
        // Both exist — keep the one with more ratings (more data)
        const localCount = local.ratings?.length ?? 0;
        const remoteCount = rem.ratings?.length ?? 0;
        if (remoteCount > localCount) {
          merged[itemId] = rem;
          pulled++;
        } else {
          merged[itemId] = local;
        }
      }
    }

    useConfidenceStore.getState().replaceHistories(merged);

    // Push merged histories back to server
    await api.put('/gaps/confidence', { histories: merged });
    pushed = 1;
  } catch (err: unknown) {
    errors.push(`Confidence: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors };
}

async function syncTrackedPRs(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
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
          // Already gone remotely — treat as success
          successfulPRDeletes.push(deletedId);
          delete mergedPRs[deletedId];
        } else {
          errors.push(`Delete PR ${deletedId}: ${err instanceof Error ? err.message : String(err)}`);
          // Keep in mergedPRs so it doesn't reappear, but don't clear tombstone
          delete mergedPRs[deletedId];
        }
      }
    }

    usePRTrackerStore.getState().replacePRs(mergedPRs);
    // Only clear tombstones for successfully deleted PRs
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

  return { pushed, pulled, errors };
}

async function syncTutorConversations(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    // Pull remote conversations
    const remote = await api.get<Array<{
      itemId: string;
      messages: unknown[];
      lastAccessed: string;
      updatedAt: string;
    }>>('/tutor-conversations');

    const localConversations = useTutorStore.getState().conversations;
    const merged = { ...localConversations };

    // Merge remote into local (last-write-wins)
    for (const conv of remote) {
      const local = merged[conv.itemId];
      if (!local || new Date(conv.lastAccessed) > new Date(local.lastAccessed)) {
        merged[conv.itemId] = {
          itemId: conv.itemId,
          messages: conv.messages as TutorConversation['messages'],
          lastAccessed: conv.lastAccessed,
        };
        pulled++;
      }
    }

    // Push local conversations that are newer or don't exist remotely
    const remoteByItemId = new Map(remote.map((c) => [c.itemId, c]));
    const toPush: Array<{ itemId: string; messages: unknown[]; lastAccessed: string }> = [];

    for (const local of Object.values(localConversations)) {
      const r = remoteByItemId.get(local.itemId);
      if (!r || new Date(local.lastAccessed) > new Date(r.lastAccessed)) {
        toPush.push({
          itemId: local.itemId,
          messages: local.messages,
          lastAccessed: local.lastAccessed,
        });
      }
    }

    if (toPush.length > 0) {
      try {
        await api.put('/tutor-conversations', { conversations: toPush });
        pushed += toPush.length;
      } catch (err: unknown) {
        errors.push(`Push conversations: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    useTutorStore.getState().replaceConversations(merged);
  } catch (err: unknown) {
    errors.push(`Sync conversations: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors };
}

async function syncUsage(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pulled = 0;

  try {
    // Pull server-side usage summary so budget status reflects cross-device usage
    const summary = await api.get<{
      month: string;
      calls: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCostUsd: number;
      todayCalls: number;
    }>('/usage/summary');

    useUsageStore.getState().setExternalMonthlyCost(summary.estimatedCostUsd);
    pulled = 1;
  } catch (err: unknown) {
    errors.push(`Usage: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed: 0, pulled, errors };
}

async function syncBookmarksTemplatesRepoConfigs(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  try {
    const remote = await api.get<{
      bookmarks: string[];
      templates: Record<string, unknown>;
      repoConfigs: Record<string, unknown>;
    }>('/me/preferences');

    let pulled = 0;

    // Bookmarks: merge (union of local + remote)
    const localBookmarks = useBookmarkStore.getState().bookmarkedIds;
    const remoteBookmarks = Array.isArray(remote.bookmarks) ? remote.bookmarks : [];
    const mergedBookmarks = [...new Set([...localBookmarks, ...remoteBookmarks])];
    pulled += mergedBookmarks.length - localBookmarks.length;
    useBookmarkStore.setState({ bookmarkedIds: mergedBookmarks });

    // Templates: last-write-wins per template
    const localTemplates = useTemplateStore.getState().templates;
    const remoteTemplates = (remote.templates && typeof remote.templates === 'object')
      ? remote.templates as Record<string, any>
      : {};
    const mergedTemplates = { ...remoteTemplates, ...localTemplates };
    const newTemplateCount = Object.keys(mergedTemplates).length - Object.keys(localTemplates).length;
    if (newTemplateCount > 0) pulled += newTemplateCount;
    useTemplateStore.setState({ templates: mergedTemplates });

    // Repo configs: last-write-wins per repo
    const localConfigs = useRepoConfigStore.getState().configs;
    const remoteConfigs = (remote.repoConfigs && typeof remote.repoConfigs === 'object')
      ? remote.repoConfigs as Record<string, any>
      : {};
    const mergedConfigs = { ...remoteConfigs };
    for (const [repo, local] of Object.entries(localConfigs)) {
      const r = mergedConfigs[repo];
      if (!r || new Date(local.updatedAt) > new Date(r.updatedAt ?? 0)) {
        mergedConfigs[repo] = local;
      }
    }
    const newConfigCount = Object.keys(mergedConfigs).length - Object.keys(localConfigs).length;
    if (newConfigCount > 0) pulled += newConfigCount;
    useRepoConfigStore.getState().replaceConfigs(mergedConfigs);

    // Push merged data back
    let pushed = 0;
    try {
      await api.patch('/me/preferences', {
        bookmarks: mergedBookmarks,
        templates: mergedTemplates,
        repoConfigs: mergedConfigs,
      });
      pushed = 1;
    } catch (err: unknown) {
      errors.push(`Bookmarks push: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { pushed, pulled, errors };
  } catch (err: unknown) {
    errors.push(`Bookmarks/templates: ${err instanceof Error ? err.message : String(err)}`);
    return { pushed: 0, pulled: 0, errors };
  }
}

export async function runSync(): Promise<SyncResult> {
  const syncStore = useSyncStore.getState();

  if (syncStore.syncing) {
    return { pushed: 0, pulled: 0, errors: ['Sync already in progress'] };
  }

  if (!(await isOnlineAndAuthenticated())) {
    return { pushed: 0, pulled: 0, errors: ['Not authenticated'] };
  }

  syncStore.markSyncStart();
  const allErrors: string[] = [];
  let totalPushed = 0;
  let totalPulled = 0;
  let details = '';

  try {
    // Push local changes first
    const pushResult = await pushSessions();
    totalPushed += pushResult.pushed;
    allErrors.push(...pushResult.errors);

    // Pull remote changes
    const pullResult = await pullSessions();
    totalPulled += pullResult.pulled;
    allErrors.push(...pullResult.errors);

    // Sync PRs
    const prResult = await syncTrackedPRs();
    totalPushed += prResult.pushed;
    totalPulled += prResult.pulled;
    allErrors.push(...prResult.errors);

    // Sync tutor conversations
    const tutorResult = await syncTutorConversations();
    totalPushed += tutorResult.pushed;
    totalPulled += tutorResult.pulled;
    allErrors.push(...tutorResult.errors);

    // Sync preferences, confidence, bookmarks, templates, repo configs
    const prefResult = await syncPreferences();
    totalPushed += prefResult.pushed;
    totalPulled += prefResult.pulled;
    allErrors.push(...prefResult.errors);

    const confResult = await syncConfidence();
    totalPushed += confResult.pushed;
    totalPulled += confResult.pulled;
    allErrors.push(...confResult.errors);

    const usageResult = await syncUsage();
    totalPushed += usageResult.pushed;
    totalPulled += usageResult.pulled;
    allErrors.push(...usageResult.errors);

    const miscResult = await syncBookmarksTemplatesRepoConfigs();
    totalPushed += miscResult.pushed;
    totalPulled += miscResult.pulled;
    allErrors.push(...miscResult.errors);

    // Sync subscription tier & credit balance (pull-only)
    try {
      await useTierStore.getState().syncTier();
    } catch {
      // Non-critical — tier info stays cached
    }

    const detailParts: string[] = [];
    if (pushResult.pushed || pullResult.pulled) detailParts.push(`Sessions: ${pushResult.pushed}↑ ${pullResult.pulled}↓`);
    if (prResult.pushed || prResult.pulled) detailParts.push(`PRs: ${prResult.pushed}↑ ${prResult.pulled}↓`);
    if (tutorResult.pushed || tutorResult.pulled) detailParts.push(`Tutor: ${tutorResult.pushed}↑ ${tutorResult.pulled}↓`);
    if (confResult.pushed || confResult.pulled) detailParts.push(`Gaps: ${confResult.pushed}↑ ${confResult.pulled}↓`);
    if (prefResult.pushed || prefResult.pulled) detailParts.push(`Prefs: ${prefResult.pushed}↑ ${prefResult.pulled}↓`);
    if (usageResult.pushed || usageResult.pulled) detailParts.push(`Usage: ${usageResult.pushed}↑ ${usageResult.pulled}↓`);
    if (miscResult.pushed || miscResult.pulled) detailParts.push(`Misc: ${miscResult.pushed}↑ ${miscResult.pulled}↓`);
    details = detailParts.join(', ');

    if (allErrors.length > 0) {
      syncStore.markSyncFailure(allErrors.slice(0, 3).join(' | '));
    } else {
      const version = new Date().toISOString();
      syncStore.markSyncSuccess(version);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    allErrors.push(message);
    syncStore.markSyncFailure(message);
  }

  return { pushed: totalPushed, pulled: totalPulled, errors: allErrors, details };
}
