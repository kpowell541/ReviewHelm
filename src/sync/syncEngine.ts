import { api, ApiError } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSessionStore } from '../store/useSessionStore';
import { useConfidenceStore } from '../store/useConfidenceStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { usePRTrackerStore } from '../store/usePRTrackerStore';
import { useSyncStore } from '../store/useSyncStore';
import { useTutorStore } from '../store/useTutorStore';
import { useBookmarkStore } from '../store/useBookmarkStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useRepoConfigStore } from '../store/useRepoConfigStore';
import type { Session, TrackedPR, TutorConversation } from '../data/types';

/**
 * Local-first sync engine.
 * All stores work offline. When online + authenticated, data is
 * pushed/pulled in the background with last-write-wins conflict resolution.
 */

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
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
    } catch (err: any) {
      errors.push(`Session ${session.id}: ${err.message}`);
    }
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

    const localSessions = useSessionStore.getState().sessions;

    for (const remote of remoteSessions) {
      const local = localSessions[remote.id];
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        // Remote is newer or doesn't exist locally — adopt it
        useSessionStore.setState((state) => ({
          sessions: { ...state.sessions, [remote.id]: remote },
        }));
        pulled++;
      }
    }
  } catch (err: any) {
    errors.push(`Pull sessions: ${err.message}`);
  }

  return { pulled, errors };
}

async function syncPreferences(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  try {
    const remote = await api.get<{
      aiModel: string;
      defaultSeverityFilter: string[];
      antiBiasMode: boolean;
      fontSize: string;
      codeBlockTheme: string;
      autoExportPdf: boolean;
    }>('/me/preferences');

    usePreferencesStore.getState().replacePreferences({
      aiModel: remote.aiModel as any,
      defaultSeverityFilter: remote.defaultSeverityFilter as any,
      antiBiasMode: remote.antiBiasMode,
      fontSize: remote.fontSize as any,
      codeBlockTheme: remote.codeBlockTheme as any,
      autoExportPdf: remote.autoExportPdf,
    });
    return { pushed: 0, pulled: 1, errors };
  } catch (getErr) {
    // If preferences don't exist remotely (404), push local
    if (getErr instanceof ApiError && getErr.status === 404) {
      try {
        const local = usePreferencesStore.getState();
        await api.patch('/me/preferences', {
          aiModel: local.aiModel,
          defaultSeverityFilter: local.defaultSeverityFilter,
          antiBiasMode: local.antiBiasMode,
          fontSize: local.fontSize,
          codeBlockTheme: local.codeBlockTheme,
          autoExportPdf: local.autoExportPdf,
        });
        return { pushed: 1, pulled: 0, errors };
      } catch (patchErr: any) {
        errors.push(`Preferences push: ${patchErr.message}`);
      }
    } else {
      errors.push(`Preferences: ${getErr instanceof Error ? getErr.message : String(getErr)}`);
    }
    return { pushed: 0, pulled: 0, errors };
  }
}

async function syncConfidence(): Promise<{ pulled: number; errors: string[] }> {
  const errors: string[] = [];
  try {
    // Backend returns { active, improving, strong } buckets
    const response = await api.get<{
      active: Array<{
        itemId: string;
        stackId: string;
        sectionId: string;
        severity: string;
        currentConfidence: number;
        averageConfidence: number;
        trend: string;
        learningPriority: number;
        ratingsCount: number;
      }>;
      improving: Array<{
        itemId: string;
        stackId: string;
        sectionId: string;
        severity: string;
        currentConfidence: number;
        averageConfidence: number;
        trend: string;
        learningPriority: number;
        ratingsCount: number;
      }>;
      strong: Array<{
        itemId: string;
        stackId: string;
        sectionId: string;
        severity: string;
        currentConfidence: number;
        averageConfidence: number;
        trend: string;
        learningPriority: number;
        ratingsCount: number;
      }>;
    }>('/gaps?limit=100');

    const allRemoteGaps = [
      ...response.active,
      ...response.improving,
      ...response.strong,
    ];

    const localHistories = useConfidenceStore.getState().histories;
    const merged = { ...localHistories };
    let pulled = 0;

    for (const remote of allRemoteGaps) {
      const local = merged[remote.itemId];
      // Update local if we don't have it, or if remote has more ratings
      // (meaning other devices completed sessions the backend has seen)
      if (!local || remote.ratingsCount > (local.ratings?.length ?? 0)) {
        merged[remote.itemId] = {
          itemId: remote.itemId,
          stackId: remote.stackId,
          sectionId: remote.sectionId,
          severity: remote.severity as any,
          currentConfidence: remote.currentConfidence as any,
          averageConfidence: remote.averageConfidence,
          trend: remote.trend as any,
          learningPriority: remote.learningPriority,
          ratings: local?.ratings ?? [],
        };
        pulled++;
      }
    }

    useConfidenceStore.getState().replaceHistories(merged);
    return { pulled, errors };
  } catch (err: any) {
    errors.push(`Confidence: ${err.message}`);
    return { pulled: 0, errors };
  }
}

async function syncTrackedPRs(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    // Pull remote PRs
    const remotePRs = await api.get<TrackedPR[]>('/tracked-prs');
    const localPRs = usePRTrackerStore.getState().prs;
    const mergedPRs = { ...localPRs };

    // Merge remote into local (last-write-wins)
    for (const remote of remotePRs) {
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
        } catch (err: any) {
          errors.push(`PR ${local.id}: ${err.message}`);
        }
      }
    }

    // Delete remote PRs that were explicitly deleted locally
    const deletedPRIds = usePRTrackerStore.getState().deletedPRIds ?? [];
    for (const deletedId of deletedPRIds) {
      try {
        await api.delete(`/tracked-prs/${deletedId}`);
      } catch {
        // Ignore delete errors
      }
      delete mergedPRs[deletedId];
    }

    usePRTrackerStore.getState().replacePRs(mergedPRs);
    usePRTrackerStore.getState().clearDeletedPRIds();
  } catch (err: any) {
    errors.push(`Sync PRs: ${err.message}`);
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
      } catch (err: any) {
        errors.push(`Push conversations: ${err.message}`);
      }
    }

    useTutorStore.getState().replaceConversations(merged);
  } catch (err: any) {
    errors.push(`Sync conversations: ${err.message}`);
  }

  return { pushed, pulled, errors };
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
    } catch (err: any) {
      errors.push(`Bookmarks push: ${err.message}`);
    }

    return { pushed, pulled, errors };
  } catch (err: any) {
    errors.push(`Bookmarks/templates: ${err.message}`);
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
    totalPulled += confResult.pulled;
    allErrors.push(...confResult.errors);

    const miscResult = await syncBookmarksTemplatesRepoConfigs();
    totalPushed += miscResult.pushed;
    totalPulled += miscResult.pulled;
    allErrors.push(...miscResult.errors);

    if (allErrors.length > 0) {
      syncStore.markSyncFailure(allErrors.slice(0, 3).join(' | '));
    } else {
      const version = new Date().toISOString();
      syncStore.markSyncSuccess(version);
    }
  } catch (err: any) {
    allErrors.push(err.message);
    syncStore.markSyncFailure(err.message);
  }

  return { pushed: totalPushed, pulled: totalPulled, errors: allErrors };
}
