import type { AuthPrincipal } from '../auth/types';
import {
  getOrCreatePreferences,
  updatePreferences as updatePreferencesRecord,
  upsertUserFromPrincipal,
} from './repository';
import type { UpdatePreferencesInput } from './schema';

function toPreferenceResponse(preference: Awaited<ReturnType<typeof getOrCreatePreferences>>) {
  return {
    aiModel: preference.aiModel,
    defaultSeverityFilter: preference.defaultSeverityFilter,
    antiBiasMode: preference.antiBiasMode === 1,
    fontSize: preference.fontSize,
    codeBlockTheme: preference.codeBlockTheme,
    autoExportPdf: preference.autoExportPdf === 1,
    activeCommentStyleProfileId: preference.activeCommentStyleProfileId,
    monthlyBudgetUsd: Number(preference.monthlyBudgetUsd),
    alertThresholds: preference.alertThresholds,
    hardStopAtBudget: preference.hardStopAtBudget === 1,
    autoDowngradeNearBudget: preference.autoDowngradeNearBudget === 1,
    autoDowngradeThresholdPct: preference.autoDowngradeThresholdPct,
    cooldownSeconds: preference.cooldownSeconds,
    lastAlertThreshold: preference.lastAlertThreshold,
    bookmarks: preference.bookmarks,
    templates: preference.templates,
    repoConfigs: preference.repoConfigs,
  };
}

export async function getCurrentUser(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export async function getPreferences(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const preference = await getOrCreatePreferences(user.id);
  return toPreferenceResponse(preference);
}

export async function updatePreferences(principal: AuthPrincipal, input: UpdatePreferencesInput) {
  const user = await upsertUserFromPrincipal(principal);
  const preference = await updatePreferencesRecord(user.id, input);
  return toPreferenceResponse(preference);
}
