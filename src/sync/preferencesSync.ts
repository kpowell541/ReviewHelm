import { api } from '../api/client';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useUsageStore } from '../store/useUsageStore';
import { useBookmarkStore } from '../store/useBookmarkStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useRepoConfigStore } from '../store/useRepoConfigStore';
import { useConfidenceStore } from '../store/useConfidenceStore';
import type { ClaudeModel, Severity } from '../data/types';
import type { AdapterResult } from './types';

export async function syncPreferences(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const localPrefs = usePreferencesStore.getState();
    const localUsage = useUsageStore.getState();

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

    usePreferencesStore.getState().replacePreferences({
      aiModel: remote.aiModel,
      defaultSeverityFilter: remote.defaultSeverityFilter,
      antiBiasMode: remote.antiBiasMode,
      fontSize: remote.fontSize,
      codeBlockTheme: remote.codeBlockTheme,
      autoExportPdf: remote.autoExportPdf,
    });

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

  return { pushed, pulled, errors, label: 'Prefs' };
}

export async function syncConfidence(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const remote = await api.get<{ histories: Record<string, any> }>('/gaps/confidence');
    const remoteHistories: Record<string, any> = remote.histories ?? {};
    const localHistories = useConfidenceStore.getState().histories;
    const merged: Record<string, any> = {};

    const allIds = new Set([...Object.keys(localHistories), ...Object.keys(remoteHistories)]);

    for (const itemId of allIds) {
      const local = localHistories[itemId];
      const rem = remoteHistories[itemId];

      if (local && !rem) {
        merged[itemId] = local;
      } else if (!local && rem) {
        merged[itemId] = rem;
        pulled++;
      } else if (local && rem) {
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
    await api.put('/gaps/confidence', { histories: merged });
    pushed = 1;
  } catch (err: unknown) {
    errors.push(`Confidence: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pushed, pulled, errors, label: 'Gaps' };
}

export async function syncUsage(): Promise<AdapterResult> {
  const errors: string[] = [];
  let pulled = 0;

  try {
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

  return { pushed: 0, pulled, errors, label: 'Usage' };
}

export async function syncBookmarksTemplatesRepoConfigs(): Promise<AdapterResult> {
  const errors: string[] = [];
  try {
    const remote = await api.get<{
      bookmarks: string[];
      templates: Record<string, unknown>;
      repoConfigs: Record<string, unknown>;
    }>('/me/preferences');

    let pulled = 0;

    const localBookmarks = useBookmarkStore.getState().bookmarkedIds;
    const remoteBookmarks = Array.isArray(remote.bookmarks) ? remote.bookmarks : [];
    const mergedBookmarks = [...new Set([...localBookmarks, ...remoteBookmarks])];
    pulled += mergedBookmarks.length - localBookmarks.length;
    useBookmarkStore.setState({ bookmarkedIds: mergedBookmarks });

    const localTemplates = useTemplateStore.getState().templates;
    const remoteTemplates = (remote.templates && typeof remote.templates === 'object')
      ? remote.templates as Record<string, any>
      : {};
    const mergedTemplates = { ...remoteTemplates, ...localTemplates };
    const newTemplateCount = Object.keys(mergedTemplates).length - Object.keys(localTemplates).length;
    if (newTemplateCount > 0) pulled += newTemplateCount;
    useTemplateStore.setState({ templates: mergedTemplates });

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

    return { pushed, pulled, errors, label: 'Misc' };
  } catch (err: unknown) {
    errors.push(`Bookmarks/templates: ${err instanceof Error ? err.message : String(err)}`);
    return { pushed: 0, pulled: 0, errors, label: 'Misc' };
  }
}
