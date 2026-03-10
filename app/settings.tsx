import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Constants from 'expo-constants';
import { crossAlert } from '../src/utils/alert';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useUsageStore } from '../src/store/useUsageStore';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { useTutorStore } from '../src/store/useTutorStore';
import { useSyncStore } from '../src/store/useSyncStore';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import { useRepoConfigStore } from '../src/store/useRepoConfigStore';
import { syncChecklistsFromGithub } from '../src/data/checklistSync';
import { runSync } from '../src/sync/syncEngine';
import { fetchMonthlyCostFromAdminApi } from '../src/ai/costApi';
import {
  CLAUDE_MODEL_LABELS,
  CLAUDE_MODEL_DESCRIPTIONS,
  AI_FEATURE_LABELS,
  type ClaudeModel,
} from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { AppFooter } from '../src/components/AppFooter';
import { useResponsive } from '../src/hooks/useResponsive';

const MODEL_OPTIONS: ClaudeModel[] = ['sonnet', 'opus'];

interface BackupPayload {
  version: number;
  exportedAt: string;
  sessions: unknown;
  confidence: unknown;
  usage: unknown;
  usageConfig?: unknown;
  tutor: unknown;
  sync: unknown;
  preferences: unknown;
  prTracker?: unknown;
  repoConfigs?: unknown;
}

function maskToken(token: string | null): string {
  if (!token) return 'none';
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const authUser = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const apiKeyToken = usePreferencesStore((s) => s.apiKeyToken);
  const hasApiKey = usePreferencesStore((s) => s.hasApiKey);
  const adminApiKeyToken = usePreferencesStore((s) => s.adminApiKeyToken);
  const hasAdminApiKey = usePreferencesStore((s) => s.hasAdminApiKey);
  const isApiKeyLoaded = usePreferencesStore((s) => s.isApiKeyLoaded);
  const setApiKey = usePreferencesStore((s) => s.setApiKey);
  const clearApiKey = usePreferencesStore((s) => s.clearApiKey);
  const setAdminApiKey = usePreferencesStore((s) => s.setAdminApiKey);
  const clearAdminApiKey = usePreferencesStore((s) => s.clearAdminApiKey);
  const resolveAdminApiKey = usePreferencesStore((s) => s.resolveAdminApiKey);
  const replacePreferences = usePreferencesStore((s) => s.replacePreferences);
  const aiModel = usePreferencesStore((s) => s.aiModel);
  const setAiModel = usePreferencesStore((s) => s.setAiModel);
  const antiBiasMode = usePreferencesStore((s) => s.antiBiasMode);
  const setAntiBiasMode = usePreferencesStore((s) => s.setAntiBiasMode);
  const fontSize = usePreferencesStore((s) => s.fontSize);
  const setFontSize = usePreferencesStore((s) => s.setFontSize);
  const autoExportPdf = usePreferencesStore((s) => s.autoExportPdf);
  const setAutoExportPdf = usePreferencesStore((s) => s.setAutoExportPdf);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  const byDay = useUsageStore((s) => s.byDay);
  const bySession = useUsageStore((s) => s.bySession);
  const getTotalTokens = useUsageStore((s) => s.getTotalTokens);
  const getEstimatedCost = useUsageStore((s) => s.getEstimatedCost);
  const getTodayCalls = useUsageStore((s) => s.getTodayCalls);
  const getCurrentMonthFeatureBreakdown = useUsageStore(
    (s) => s.getCurrentMonthFeatureBreakdown,
  );
  const resetUsage = useUsageStore((s) => s.resetUsage);
  const replaceUsage = useUsageStore((s) => s.replaceUsage);
  const monthlyBudgetUsd = useUsageStore((s) => s.monthlyBudgetUsd);
  const setMonthlyBudget = useUsageStore((s) => s.setMonthlyBudget);
  const hardStopAtBudget = useUsageStore((s) => s.hardStopAtBudget);
  const setHardStopAtBudget = useUsageStore((s) => s.setHardStopAtBudget);
  const autoDowngradeNearBudget = useUsageStore((s) => s.autoDowngradeNearBudget);
  const setAutoDowngradeNearBudget = useUsageStore((s) => s.setAutoDowngradeNearBudget);
  const autoDowngradeThresholdPct = useUsageStore((s) => s.autoDowngradeThresholdPct);
  const setAutoDowngradeThresholdPct = useUsageStore((s) => s.setAutoDowngradeThresholdPct);
  const cooldownSeconds = useUsageStore((s) => s.cooldownSeconds);
  const setCooldownSeconds = useUsageStore((s) => s.setCooldownSeconds);
  const alertThresholds = useUsageStore((s) => s.alertThresholds);
  const setAlertThresholds = useUsageStore((s) => s.setAlertThresholds);
  const getBudgetStatus = useUsageStore((s) => s.getBudgetStatus);
  const setExternalMonthlyCost = useUsageStore((s) => s.setExternalMonthlyCost);
  const externalCostUpdatedAt = useUsageStore((s) => s.externalCostUpdatedAt);

  const sessions = useSessionStore((s) => s.sessions);
  const replaceSessions = useSessionStore((s) => s.replaceSessions);
  const histories = useConfidenceStore((s) => s.histories);
  const replaceHistories = useConfidenceStore((s) => s.replaceHistories);
  const conversations = useTutorStore((s) => s.conversations);
  const responseCacheCount = useTutorStore(
    (s) => Object.keys(s.responseCache).length,
  );
  const clearResponseCache = useTutorStore((s) => s.clearResponseCache);
  const replaceConversations = useTutorStore((s) => s.replaceConversations);
  const syncLastChecked = useSyncStore((s) => s.lastChecked);
  const syncLastSyncedVersion = useSyncStore((s) => s.lastSyncedVersion);
  const syncLastError = useSyncStore((s) => s.lastError);
  const syncSyncing = useSyncStore((s) => s.syncing);
  const replaceSyncState = useSyncStore((s) => s.replaceSyncState);
  const wipLimit = usePRTrackerStore((s) => s.wipLimit);
  const setWipLimit = usePRTrackerStore((s) => s.setWipLimit);
  const emergencySlotEnabled = usePRTrackerStore((s) => s.emergencySlotEnabled);
  const setEmergencySlotEnabled = usePRTrackerStore((s) => s.setEmergencySlotEnabled);
  const prTrackerPRs = usePRTrackerStore((s) => s.prs);
  const replacePRs = usePRTrackerStore((s) => s.replacePRs);
  const repoConfigs = useRepoConfigStore((s) => s.configs);
  const replaceRepoConfigs = useRepoConfigStore((s) => s.replaceConfigs);
  const markSyncStart = useSyncStore((s) => s.markSyncStart);
  const markSyncSuccess = useSyncStore((s) => s.markSyncSuccess);
  const markSyncFailure = useSyncStore((s) => s.markSyncFailure);

  const [savingApiKey, setSavingApiKey] = useState(false);
  const [savingAdminApiKey, setSavingAdminApiKey] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [syncingOfficialCost, setSyncingOfficialCost] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [adminApiKeyInput, setAdminApiKeyInput] = useState('');
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudgetUsd));
  const [thresholdInput, setThresholdInput] = useState(alertThresholds.join(','));
  const [autoDowngradeThresholdInput, setAutoDowngradeThresholdInput] = useState(
    String(autoDowngradeThresholdPct),
  );
  const [cooldownInput, setCooldownInput] = useState(String(cooldownSeconds));

  const handleApiKeySave = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    setSavingApiKey(true);
    await setApiKey(apiKeyInput);
    setApiKeyInput('');
    setSavingApiKey(false);
  }, [apiKeyInput, setApiKey]);

  const handleApiKeyClear = useCallback(async () => {
    setSavingApiKey(true);
    await clearApiKey();
    setApiKeyInput('');
    setSavingApiKey(false);
  }, [clearApiKey]);

  const handleSyncData = useCallback(async () => {
    setSyncingData(true);
    try {
      const result = await runSync();
      if (result.errors.length > 0) {
        crossAlert('Sync completed with errors', result.errors.slice(0, 3).join('\n'));
      } else {
        crossAlert(
          'Sync complete',
          `Pushed ${result.pushed} item${result.pushed !== 1 ? 's' : ''}, pulled ${result.pulled} item${result.pulled !== 1 ? 's' : ''}.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed.';
      crossAlert('Sync failed', message);
    } finally {
      setSyncingData(false);
    }
  }, []);

  const handleAdminApiKeySave = useCallback(async () => {
    if (!adminApiKeyInput.trim()) return;
    setSavingAdminApiKey(true);
    await setAdminApiKey(adminApiKeyInput);
    setAdminApiKeyInput('');
    setSavingAdminApiKey(false);
  }, [adminApiKeyInput, setAdminApiKey]);

  const handleAdminApiKeyClear = useCallback(async () => {
    setSavingAdminApiKey(true);
    await clearAdminApiKey();
    setAdminApiKeyInput('');
    setSavingAdminApiKey(false);
  }, [clearAdminApiKey]);

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setSavingApiKey(true);
      setApiKeyInput(value);
      setTimeout(() => setSavingApiKey(false), 120);
    },
    [],
  );

  const handleAdminApiKeyChange = useCallback((value: string) => {
    setSavingAdminApiKey(true);
    setAdminApiKeyInput(value);
    setTimeout(() => setSavingAdminApiKey(false), 120);
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    markSyncStart();
    try {
      const result = await syncChecklistsFromGithub();
      markSyncSuccess(result.latestVersion);
      crossAlert(
        result.updated ? 'Checklist data updated' : 'Already up to date',
        result.updated
          ? `Updated ${result.changedIds.length} checklist files to v${result.latestVersion}.`
          : `Current checklist version is v${result.latestVersion}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync checklist data.';
      markSyncFailure(message);
      crossAlert('Sync failed', message);
    } finally {
      setCheckingUpdates(false);
    }
  }, [markSyncStart, markSyncSuccess, markSyncFailure]);

  const handleSaveBudget = useCallback(() => {
    const parsed = Number(budgetInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      crossAlert('Invalid budget', 'Enter a positive USD amount.');
      return;
    }
    setMonthlyBudget(parsed);
  }, [budgetInput, setMonthlyBudget]);

  const handleSaveThresholds = useCallback(() => {
    const parsed = thresholdInput
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value)) as number[];
    if (parsed.length === 0) {
      crossAlert(
        'Invalid thresholds',
        'Enter comma-separated percentages like 70,85,95.',
      );
      return;
    }
    setAlertThresholds(parsed);
    setThresholdInput(parsed.join(','));
  }, [thresholdInput, setAlertThresholds]);

  const handleSaveAutoDowngradeThreshold = useCallback(() => {
    const parsed = Number(autoDowngradeThresholdInput);
    if (!Number.isFinite(parsed) || parsed < 50 || parsed > 99) {
      crossAlert(
        'Invalid threshold',
        'Enter a percentage between 50 and 99.',
      );
      return;
    }
    setAutoDowngradeThresholdPct(parsed);
    setAutoDowngradeThresholdInput(String(Math.round(parsed)));
  }, [autoDowngradeThresholdInput, setAutoDowngradeThresholdPct]);

  const handleSaveCooldown = useCallback(() => {
    const parsed = Number(cooldownInput);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60) {
      crossAlert(
        'Invalid cooldown',
        'Enter seconds between 0 and 60.',
      );
      return;
    }
    setCooldownSeconds(parsed);
    setCooldownInput(String(Math.round(parsed)));
  }, [cooldownInput, setCooldownSeconds]);

  const handleSyncOfficialCost = useCallback(async () => {
    setSyncingOfficialCost(true);
    try {
      const adminApiKey = await resolveAdminApiKey();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const end = now.toISOString().slice(0, 10);
      const monthlyCost = await fetchMonthlyCostFromAdminApi({
        adminApiKey,
        startDate: start,
        endDate: end,
      });
      setExternalMonthlyCost(monthlyCost);
      crossAlert(
        'Official cost synced',
        `Current month spend from Admin API: $${monthlyCost.toFixed(2)}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sync official cost right now.';
      crossAlert(
        'Official cost sync failed',
        `${message}\n\nIf you are on an individual account, Admin Usage/Cost API may be unavailable.`,
      );
    } finally {
      setSyncingOfficialCost(false);
    }
  }, [resolveAdminApiKey, setExternalMonthlyCost]);

  const handleClearTutorCache = useCallback(() => {
    clearResponseCache();
    crossAlert('Tutor cache cleared', 'Cached tutor responses were removed.');
  }, [clearResponseCache]);

  const handleExportBackup = useCallback(async () => {
    setBackupBusy(true);
    try {
      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        sessions,
        confidence: histories,
        usage: {
          byDay,
          bySession,
        },
        usageConfig: {
          monthlyBudgetUsd,
          alertThresholds,
          hardStopAtBudget,
          autoDowngradeNearBudget,
          autoDowngradeThresholdPct,
          cooldownSeconds,
        },
        tutor: conversations,
        sync: { lastChecked: syncLastChecked, lastSyncedVersion: syncLastSyncedVersion, lastError: syncLastError, syncing: syncSyncing },
        preferences: {
          aiModel,
          antiBiasMode,
          autoExportPdf,
        },
        prTracker: prTrackerPRs,
        repoConfigs,
      };

      const dir = FileSystem.cacheDirectory;
      if (!dir) {
        throw new Error('Cannot access local cache directory.');
      }
      const filename = `reviewhelm-backup-${Date.now()}.json`;
      const fileUri = `${dir}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export ReviewHelm Backup',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Backup export failed.';
      crossAlert('Export failed', message);
    } finally {
      setBackupBusy(false);
    }
  }, [
    sessions,
    histories,
    byDay,
    bySession,
    conversations,
    syncLastChecked, syncLastSyncedVersion, syncLastError, syncSyncing,
    aiModel,
    antiBiasMode,
    autoExportPdf,
    prTrackerPRs,
    repoConfigs,
    monthlyBudgetUsd,
    alertThresholds,
    hardStopAtBudget,
    autoDowngradeNearBudget,
    autoDowngradeThresholdPct,
    cooldownSeconds,
  ]);

  const handleImportBackup = useCallback(async () => {
    setBackupBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = JSON.parse(raw) as Partial<BackupPayload>;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Selected file is not a valid backup.');
      }

      const nextSessions =
        parsed.sessions && typeof parsed.sessions === 'object'
          ? parsed.sessions
          : {};
      const nextConfidence =
        parsed.confidence && typeof parsed.confidence === 'object'
          ? parsed.confidence
          : {};
      const nextUsage =
        parsed.usage && typeof parsed.usage === 'object'
          ? parsed.usage
          : {};
      const nextTutor =
        parsed.tutor && typeof parsed.tutor === 'object'
          ? parsed.tutor
          : {};
      const nextSync =
        parsed.sync && typeof parsed.sync === 'object'
          ? parsed.sync
          : {};

      replaceSessions(nextSessions as Parameters<typeof replaceSessions>[0]);
      replaceHistories(nextConfidence as Parameters<typeof replaceHistories>[0]);
      replaceUsage(nextUsage as Parameters<typeof replaceUsage>[0]);
      replaceConversations(nextTutor as Parameters<typeof replaceConversations>[0]);
      replaceSyncState(nextSync as Parameters<typeof replaceSyncState>[0]);

      if (parsed.prTracker && typeof parsed.prTracker === 'object') {
        replacePRs(parsed.prTracker as Parameters<typeof replacePRs>[0]);
      }
      if (parsed.repoConfigs && typeof parsed.repoConfigs === 'object') {
        replaceRepoConfigs(parsed.repoConfigs as Parameters<typeof replaceRepoConfigs>[0]);
      }

      const usageConfig = parsed.usageConfig as
        | {
            monthlyBudgetUsd?: number;
            alertThresholds?: number[];
            hardStopAtBudget?: boolean;
            autoDowngradeNearBudget?: boolean;
            autoDowngradeThresholdPct?: number;
            cooldownSeconds?: number;
          }
        | undefined;
      if (usageConfig) {
        if (typeof usageConfig.monthlyBudgetUsd === 'number') {
          setMonthlyBudget(usageConfig.monthlyBudgetUsd);
        }
        if (Array.isArray(usageConfig.alertThresholds)) {
          setAlertThresholds(usageConfig.alertThresholds);
        }
        if (typeof usageConfig.hardStopAtBudget === 'boolean') {
          setHardStopAtBudget(usageConfig.hardStopAtBudget);
        }
        if (typeof usageConfig.autoDowngradeNearBudget === 'boolean') {
          setAutoDowngradeNearBudget(usageConfig.autoDowngradeNearBudget);
        }
        if (typeof usageConfig.autoDowngradeThresholdPct === 'number') {
          setAutoDowngradeThresholdPct(usageConfig.autoDowngradeThresholdPct);
          setAutoDowngradeThresholdInput(
            String(Math.round(usageConfig.autoDowngradeThresholdPct)),
          );
        }
        if (typeof usageConfig.cooldownSeconds === 'number') {
          setCooldownSeconds(usageConfig.cooldownSeconds);
          setCooldownInput(String(Math.round(usageConfig.cooldownSeconds)));
        }
      }

      const pref = parsed.preferences as
        | {
            aiModel?: ClaudeModel;
            antiBiasMode?: boolean;
            autoExportPdf?: boolean;
          }
        | undefined;
      if (pref) {
        replacePreferences({
          aiModel: pref.aiModel,
          antiBiasMode: pref.antiBiasMode,
          autoExportPdf: pref.autoExportPdf,
        });
      }

      crossAlert('Restore complete', 'Backup data has been restored.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Backup import failed.';
      crossAlert('Import failed', message);
    } finally {
      setBackupBusy(false);
    }
  }, [
    replaceSessions,
    replaceHistories,
    replaceUsage,
    replaceConversations,
    replaceSyncState,
    replacePRs,
    replaceRepoConfigs,
    replacePreferences,
    setMonthlyBudget,
    setAlertThresholds,
    setHardStopAtBudget,
    setAutoDowngradeNearBudget,
    setAutoDowngradeThresholdPct,
    setCooldownSeconds,
  ]);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'dev';
  const budgetStatus = getBudgetStatus();
  const featureBreakdown = getCurrentMonthFeatureBreakdown();

  return (
    <DesktopContainer>
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Sync</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          Sync sessions, PRs, gaps, and preferences across all your devices.
        </Text>
        <Pressable
          style={[styles.primaryButton, syncingData && styles.buttonDisabled]}
          onPress={handleSyncData}
          disabled={syncingData}
        >
          <Text style={styles.primaryButtonText}>
            {syncingData ? 'Syncing...' : 'Sync data between devices'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>AI Tutor</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Claude API Key</Text>
        {!isApiKeyLoaded ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={apiKeyInput}
              onChangeText={handleApiKeyChange}
              placeholder="Paste Claude API key"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.keyActions}>
              <Pressable
                style={[
                  styles.primaryButton,
                  (!apiKeyInput.trim() || savingApiKey) && styles.buttonDisabled,
                ]}
                onPress={handleApiKeySave}
                disabled={!apiKeyInput.trim() || savingApiKey}
              >
                <Text style={styles.primaryButtonText}>Save Key</Text>
              </Pressable>
              {hasApiKey && (
                <Pressable
                  style={[styles.secondaryButton, savingApiKey && styles.buttonDisabled]}
                  onPress={handleApiKeyClear}
                  disabled={savingApiKey}
                >
                  <Text style={styles.secondaryButtonText}>Clear Key</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
        <Text style={styles.hint}>
          Stored securely on this device only. You must enter it on each device separately.
        </Text>
        <Text style={styles.subtle}>
          Status: {hasApiKey ? 'Key is configured' : 'No key saved'}
        </Text>
        {savingApiKey && <Text style={styles.subtle}>Updating key input...</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Anthropic Admin API Key (Optional)</Text>
        <Text style={styles.hint}>
          Enables official monthly cost sync from Anthropic Usage/Cost API.
        </Text>
        <TextInput
          style={styles.input}
          value={adminApiKeyInput}
          onChangeText={handleAdminApiKeyChange}
          placeholder="Paste Admin API key"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.keyActions}>
          <Pressable
            style={[
              styles.primaryButton,
              (!adminApiKeyInput.trim() || savingAdminApiKey) &&
                styles.buttonDisabled,
            ]}
            onPress={handleAdminApiKeySave}
            disabled={!adminApiKeyInput.trim() || savingAdminApiKey}
          >
            <Text style={styles.primaryButtonText}>Save Admin Key</Text>
          </Pressable>
          {hasAdminApiKey && (
            <Pressable
              style={[styles.secondaryButton, savingAdminApiKey && styles.buttonDisabled]}
              onPress={handleAdminApiKeyClear}
              disabled={savingAdminApiKey}
            >
              <Text style={styles.secondaryButtonText}>Clear Admin Key</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.subtle}>
          Token: {maskToken(adminApiKeyToken)} · Status:{' '}
          {hasAdminApiKey ? 'Configured' : 'Not configured'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>AI Model</Text>
        <Text style={styles.hint}>
          Choose which Claude model powers your tutor sessions.
        </Text>
        <View style={styles.modelOptions}>
          {MODEL_OPTIONS.map((model) => {
            const isSelected = aiModel === model;
            return (
              <TouchableOpacity
                key={model}
                style={[
                  styles.modelOption,
                  isSelected && styles.modelOptionSelected,
                ]}
                onPress={() => setAiModel(model)}
                activeOpacity={0.7}
              >
                <View style={styles.modelHeader}>
                  <View style={styles.modelRadioRow}>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.modelName,
                        isSelected && styles.modelNameSelected,
                      ]}
                    >
                      {CLAUDE_MODEL_LABELS[model]}
                    </Text>
                  </View>
                  {model === 'sonnet' && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modelDescription}>
                  {CLAUDE_MODEL_DESCRIPTIONS[model]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>API Usage</Text>
      <View style={styles.card}>
        <Text style={styles.statText}>Total tokens: {getTotalTokens().toLocaleString()}</Text>
        <Text style={styles.statText}>Estimated spend: ${getEstimatedCost().toFixed(2)}</Text>
        <Text style={styles.statText}>Today’s API calls: {getTodayCalls()}</Text>
        <Text style={styles.statText}>Tutor cache entries: {responseCacheCount}</Text>
        <Text style={styles.statText}>
          Monthly cost used: ${budgetStatus.monthlyCostUsd.toFixed(2)} / $
          {budgetStatus.budgetUsd.toFixed(2)} ({budgetStatus.percentUsed.toFixed(1)}%)
        </Text>
        {featureBreakdown.length > 0 && (
          <View style={styles.featureBreakdown}>
            <Text style={styles.label}>Monthly Cost by Feature</Text>
            {featureBreakdown.map((entry) => (
              <Text key={entry.feature} style={styles.statText}>
                {AI_FEATURE_LABELS[entry.feature]}: ${entry.costUsd.toFixed(2)} ·{' '}
                {entry.calls} call{entry.calls === 1 ? '' : 's'}
              </Text>
            ))}
          </View>
        )}
        {externalCostUpdatedAt && (
          <Text style={styles.subtle}>
            Official cost last synced: {new Date(externalCostUpdatedAt).toLocaleString()}
          </Text>
        )}
        <Pressable style={styles.secondaryButton} onPress={resetUsage}>
          <Text style={styles.secondaryButtonText}>Reset usage</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleClearTutorCache}>
          <Text style={styles.secondaryButtonText}>Clear tutor response cache</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, syncingOfficialCost && styles.buttonDisabled]}
          onPress={handleSyncOfficialCost}
          disabled={syncingOfficialCost}
        >
          <Text style={styles.secondaryButtonText}>
            {syncingOfficialCost ? 'Syncing official cost...' : 'Sync official cost (Admin API)'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Budget Controls</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Monthly Budget (USD)</Text>
        <TextInput
          style={styles.input}
          value={budgetInput}
          onChangeText={setBudgetInput}
          keyboardType="decimal-pad"
          placeholder="40"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.secondaryButton} onPress={handleSaveBudget}>
          <Text style={styles.secondaryButtonText}>Save budget</Text>
        </Pressable>

        <Text style={[styles.label, styles.inlineLabel]}>Alert Thresholds (%)</Text>
        <TextInput
          style={styles.input}
          value={thresholdInput}
          onChangeText={setThresholdInput}
          placeholder="70,85,95"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.secondaryButton} onPress={handleSaveThresholds}>
          <Text style={styles.secondaryButtonText}>Save thresholds</Text>
        </Pressable>

        <View style={[styles.settingRow, styles.hardStopRow]}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Hard Stop At Budget</Text>
            <Text style={styles.hint}>
              Block new AI calls when projected monthly spend exceeds budget.
            </Text>
          </View>
          <Switch
            value={hardStopAtBudget}
            onValueChange={setHardStopAtBudget}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={[styles.settingRow, styles.hardStopRow]}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Auto-Downgrade Near Budget</Text>
            <Text style={styles.hint}>
              Automatically switch Opus requests to Sonnet when spend gets close to budget.
            </Text>
          </View>
          <Switch
            value={autoDowngradeNearBudget}
            onValueChange={setAutoDowngradeNearBudget}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Text style={[styles.label, styles.inlineLabel]}>
          Auto-Downgrade Threshold (%)
        </Text>
        <TextInput
          style={styles.input}
          value={autoDowngradeThresholdInput}
          onChangeText={setAutoDowngradeThresholdInput}
          keyboardType="number-pad"
          placeholder="85"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          style={styles.secondaryButton}
          onPress={handleSaveAutoDowngradeThreshold}
        >
          <Text style={styles.secondaryButtonText}>Save auto-downgrade threshold</Text>
        </Pressable>

        <Text style={[styles.label, styles.inlineLabel]}>AI Call Cooldown (seconds)</Text>
        <TextInput
          style={styles.input}
          value={cooldownInput}
          onChangeText={setCooldownInput}
          keyboardType="number-pad"
          placeholder="6"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.secondaryButton} onPress={handleSaveCooldown}>
          <Text style={styles.secondaryButtonText}>Save cooldown</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Anthropic Workspace Limits</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          Set hard spend and rate limits in Anthropic Console Workspaces for an account-level
          backstop. This is external to the app and recommended even with in-app controls.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Review Settings</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Anti-Bias Mode</Text>
            <Text style={styles.hint}>
              Randomize section order in Polish mode to prevent checklist fatigue.
            </Text>
          </View>
          <Switch
            value={antiBiasMode}
            onValueChange={setAntiBiasMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={[styles.label, styles.inlineLabel]}>Checklist Text Size</Text>
        <View style={styles.inlineChoices}>
          {(['small', 'medium', 'large'] as const).map((size) => (
            <Pressable
              key={size}
              style={[
                styles.inlineChoiceButton,
                fontSize === size && styles.inlineChoiceButtonActive,
              ]}
              onPress={() => setFontSize(size)}
            >
              <Text
                style={[
                  styles.inlineChoiceText,
                  fontSize === size && styles.inlineChoiceTextActive,
                ]}
              >
                {size[0].toUpperCase() + size.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, styles.inlineLabel]}>Theme</Text>
        <View style={styles.inlineChoices}>
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.inlineChoiceButton,
                themeMode === mode && styles.inlineChoiceButtonActive,
              ]}
              onPress={() => setThemeMode(mode)}
            >
              <Text
                style={[
                  styles.inlineChoiceText,
                  themeMode === mode && styles.inlineChoiceTextActive,
                ]}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>PR Tracker</Text>
      <View style={styles.card}>
        <Text style={[styles.label, styles.inlineLabel]}>My PR WIP Limit</Text>
        <Text style={styles.hint}>
          Maximum active personal PRs before showing a warning.
        </Text>
        <View style={styles.inlineChoices}>
          {[2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              style={[
                styles.inlineChoiceButton,
                wipLimit === n && styles.inlineChoiceButtonActive,
              ]}
              onPress={() => setWipLimit(n)}
            >
              <Text
                style={[
                  styles.inlineChoiceText,
                  wipLimit === n && styles.inlineChoiceTextActive,
                ]}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.settingRow, { marginTop: spacing.md }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Emergency Slot</Text>
            <Text style={styles.hint}>
              Reserve one extra slot for emergency/hotfix PRs.
            </Text>
          </View>
          <Switch
            value={emergencySlotEnabled}
            onValueChange={setEmergencySlotEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.card}>
        <Pressable
          style={[styles.primaryButton, checkingUpdates && styles.buttonDisabled]}
          onPress={handleCheckUpdates}
          disabled={checkingUpdates}
        >
          <Text style={styles.primaryButtonText}>
            {checkingUpdates ? 'Checking...' : 'Check for Updates'}
          </Text>
        </Pressable>
        {syncLastChecked && (
          <Text style={styles.subtle}>
            Last checked: {new Date(syncLastChecked).toLocaleString()}
          </Text>
        )}
        {syncLastSyncedVersion && (
          <Text style={styles.subtle}>Checklist version: v{syncLastSyncedVersion}</Text>
        )}
        {syncLastError && (
          <Text style={styles.errorText}>{syncLastError}</Text>
        )}

        <View style={styles.backupButtons}>
          <Pressable
            style={[styles.secondaryButton, backupBusy && styles.buttonDisabled]}
            onPress={handleExportBackup}
            disabled={backupBusy}
          >
            <Text style={styles.secondaryButtonText}>Export backup JSON</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, backupBusy && styles.buttonDisabled]}
            onPress={handleImportBackup}
            disabled={backupBusy}
          >
            <Text style={styles.secondaryButtonText}>Import backup JSON</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Export</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Auto-Export PDF</Text>
            <Text style={styles.hint}>
              Automatically open PDF export after session completion.
            </Text>
          </View>
          <Switch
            value={autoExportPdf}
            onValueChange={setAutoExportPdf}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        {authUser ? (
          <>
            <Text style={styles.label}>{authUser.email}</Text>
            <Text style={styles.hint}>
              Signed in. Your data syncs across devices.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                await signOut();
                crossAlert('Signed out', 'You can continue using the app offline.');
              }}
            >
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Sign in to sync your sessions, preferences, and progress
              across devices.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Sign In / Sign Up</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Connected Features</Text>
      <View style={styles.card}>
        <Pressable
          style={styles.connectedLink}
          onPress={() => router.push('/pr-tracker')}
        >
          <Text style={styles.connectedLinkText}>PR Tracker</Text>
          <Text style={styles.connectedLinkArrow}>{'>'}</Text>
        </Pressable>
        <Pressable
          style={styles.connectedLink}
          onPress={() => router.push('/comment-profiles')}
        >
          <Text style={styles.connectedLinkText}>Comment Style Profiles</Text>
          <Text style={styles.connectedLinkArrow}>{'>'}</Text>
        </Pressable>
        <Pressable
          style={styles.connectedLink}
          onPress={() => router.push('/diffs')}
        >
          <Text style={styles.connectedLinkText}>Diff Artifacts</Text>
          <Text style={styles.connectedLinkArrow}>{'>'}</Text>
        </Pressable>
      </View>

      <AppFooter />
      <Text style={styles.footer}>ReviewHelm v{appVersion}</Text>
    </ScrollView>
    </DesktopContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  contentDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  subtle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyActions: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hardStopRow: {
    marginTop: spacing.md,
  },
  inlineLabel: {
    marginTop: spacing.md,
  },
  inlineChoices: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  inlineChoiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  inlineChoiceButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}16`,
  },
  inlineChoiceText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  inlineChoiceTextActive: {
    color: colors.primary,
  },
  settingInfo: { flex: 1 },
  modelOptions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modelOption: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modelOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modelRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  modelName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modelNameSelected: {
    color: colors.primary,
  },
  defaultBadge: {
    backgroundColor: `${colors.primary}30`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  modelDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 26,
  },
  statText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureBreakdown: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  backupButtons: {
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  connectedLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  connectedLinkText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  connectedLinkArrow: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
  },
});
