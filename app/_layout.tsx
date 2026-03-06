import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSizes, ThemeProvider, useThemeColors } from '../src/theme';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { useUsageStore } from '../src/store/useUsageStore';
import { useTutorStore } from '../src/store/useTutorStore';
import { useSyncStore } from '../src/store/useSyncStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import { useRepoConfigStore } from '../src/store/useRepoConfigStore';
import { initializeChecklistCache } from '../src/data/checklistLoader';
import { runSync } from '../src/sync/syncEngine';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const preferencesHydrated = usePreferencesStore((s) => s.hasHydrated);
  const loadApiKey = usePreferencesStore((s) => s.loadApiKey);
  const isApiKeyLoaded = usePreferencesStore((s) => s.isApiKeyLoaded);

  const sessionsHydrated = useSessionStore((s) => s.hasHydrated);
  const confidenceHydrated = useConfidenceStore((s) => s.hasHydrated);
  const usageHydrated = useUsageStore((s) => s.hasHydrated);
  const usageByDay = useUsageStore((s) => s.byDay);
  const monthlyBudgetUsd = useUsageStore((s) => s.monthlyBudgetUsd);
  const externalMonthlyCostUsd = useUsageStore((s) => s.externalMonthlyCostUsd);
  const alertThresholds = useUsageStore((s) => s.alertThresholds);
  const getBudgetStatus = useUsageStore((s) => s.getBudgetStatus);
  const lastAlertThreshold = useUsageStore((s) => s.lastAlertThreshold);
  const acknowledgeAlertThreshold = useUsageStore((s) => s.acknowledgeAlertThreshold);
  const tutorHydrated = useTutorStore((s) => s.hasHydrated);
  const syncHydrated = useSyncStore((s) => s.hasHydrated);
  const prTrackerHydrated = usePRTrackerStore((s) => s.hasHydrated);
  const repoConfigHydrated = useRepoConfigStore((s) => s.hasHydrated);
  const initAuth = useAuthStore((s) => s.initialize);
  const authUser = useAuthStore((s) => s.user);

  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    void loadApiKey();
    void initAuth();
  }, [loadApiKey, initAuth]);

  useEffect(() => {
    initializeChecklistCache()
      .then(() => setCacheReady(true))
      .catch(() => setCacheReady(true));
  }, []);

  const storesReady =
    preferencesHydrated &&
    sessionsHydrated &&
    confidenceHydrated &&
    usageHydrated &&
    tutorHydrated &&
    syncHydrated &&
    prTrackerHydrated &&
    repoConfigHydrated &&
    isApiKeyLoaded &&
    cacheReady;

  useEffect(() => {
    if (!storesReady) return;
    const budget = getBudgetStatus();
    if (!budget.thresholdReached) return;
    if (lastAlertThreshold && budget.thresholdReached <= lastAlertThreshold) return;

    acknowledgeAlertThreshold(budget.thresholdReached);
    Alert.alert(
      'AI spend alert',
      `You have used ${budget.percentUsed.toFixed(1)}% of your monthly budget ($${budget.monthlyCostUsd.toFixed(
        2,
      )} / $${budget.budgetUsd.toFixed(2)}).`,
    );
  }, [
    storesReady,
    usageByDay,
    monthlyBudgetUsd,
    externalMonthlyCostUsd,
    alertThresholds,
    getBudgetStatus,
    lastAlertThreshold,
    acknowledgeAlertThreshold,
  ]);

  // Background sync when authenticated
  useEffect(() => {
    if (!storesReady || !authUser) return;
    void runSync();
  }, [storesReady, authUser]);

  if (!storesReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ReviewHelm...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'ReviewHelm', headerShown: false }}
        />
        <Stack.Screen
          name="review/stack-select"
          options={{ title: 'Select Stack' }}
        />
        <Stack.Screen
          name="review/sessions"
          options={{ title: 'Review Sessions' }}
        />
        <Stack.Screen
          name="review/section-select"
          options={{ title: 'Select Sections' }}
        />
        <Stack.Screen
          name="review/[sessionId]"
          options={{ title: 'Review' }}
        />
        <Stack.Screen
          name="polish/sessions"
          options={{ title: 'Polish Sessions' }}
        />
        <Stack.Screen
          name="polish/[sessionId]"
          options={{ title: 'Polish My PR' }}
        />
        <Stack.Screen
          name="deep-dive/[itemId]"
          options={{
            title: 'Deep Dive',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="comment-drafter/[itemId]"
          options={{
            title: 'Draft Comment',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="session-summary/[sessionId]"
          options={{ title: 'Session Summary' }}
        />
        <Stack.Screen
          name="learn/stack-select"
          options={{ title: 'Learn — Select Stack' }}
        />
        <Stack.Screen
          name="learn/[stackId]"
          options={{ title: 'Learning Session' }}
        />
        <Stack.Screen
          name="gaps"
          options={{ title: 'My Knowledge Gaps' }}
        />
        <Stack.Screen
          name="search"
          options={{ title: 'Search' }}
        />
        <Stack.Screen
          name="dashboard"
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{ title: 'Bookmarks' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ title: 'Sign In', presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth/signup"
          options={{ title: 'Sign Up', presentation: 'modal' }}
        />
        <Stack.Screen
          name="diffs"
          options={{ title: 'Diff Artifacts' }}
        />
        <Stack.Screen
          name="comment-profiles"
          options={{ title: 'Comment Profiles' }}
        />
        <Stack.Screen
          name="review/due-items"
          options={{ title: 'Review Due Items' }}
        />
        <Stack.Screen
          name="trends"
          options={{ title: 'Session Comparison' }}
        />
        <Stack.Screen
          name="pr-tracker"
          options={{ title: 'PR Tracker' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings' }}
        />
      </Stack>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
});
