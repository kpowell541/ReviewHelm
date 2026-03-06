import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSizes } from '../src/theme';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { useUsageStore } from '../src/store/useUsageStore';
import { useTutorStore } from '../src/store/useTutorStore';
import { useSyncStore } from '../src/store/useSyncStore';
import { initializeChecklistCache } from '../src/data/checklistLoader';
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

  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    void loadApiKey();
  }, [loadApiKey]);

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
      <StatusBar style="light" />
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
          name="settings"
          options={{ title: 'Settings' }}
        />
      </Stack>
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
