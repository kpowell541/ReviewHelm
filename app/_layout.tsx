import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, AppState, Image, Platform, StyleSheet, Text, View } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useFonts, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
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
  const hasCompletedOnboarding = usePreferencesStore((s) => s.hasCompletedOnboarding);

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
  const archiveOldPRs = usePRTrackerStore((s) => s.archiveOldPRs);
  const repoConfigHydrated = useRepoConfigStore((s) => s.hasHydrated);
  const initAuth = useAuthStore((s) => s.initialize);
  const authUser = useAuthStore((s) => s.user);
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const signOut = useAuthStore((s) => s.signOut);

  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  const [cacheReady, setCacheReady] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void loadApiKey();
    void initAuth();
  }, [loadApiKey, initAuth]);

  useEffect(() => {
    initializeChecklistCache()
      .then(() => setCacheReady(true))
      .catch(() => setCacheReady(true));
  }, []);

  // Auto-archive resolved PRs older than 3 months
  useEffect(() => {
    if (prTrackerHydrated) archiveOldPRs();
  }, [prTrackerHydrated, archiveOldPRs]);

  // Sign out when app goes to background (native only — on web, tab switches trigger inactive)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        void signOut();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [signOut]);

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
    cacheReady &&
    fontsLoaded;

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

  if (!storesReady || authIsLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ReviewHelm...</Text>
      </View>
    );
  }

  // Gate: onboarding first, then auth, then app
  if (!hasCompletedOnboarding) {
    return (
      <ErrorBoundary>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.textPrimary,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false, animation: 'fade' }}
          />
        </Stack>
      </ThemeProvider>
      </ErrorBoundary>
    );
  }

  if (!authUser) {
    return (
      <ErrorBoundary>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.textPrimary,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="auth/login"
            options={{ title: 'Sign In', headerShown: false }}
          />
          <Stack.Screen
            name="auth/signup"
            options={{ title: 'Sign Up' }}
          />
        </Stack>
      </ThemeProvider>
      </ErrorBoundary>
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
          headerTitleStyle: { fontFamily: 'Quicksand_600SemiBold' },
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
          headerBackTitle: 'Back',
          headerTitleAlign: 'center',
          headerTitle: ({ children }) => (
            <View style={styles.headerTitleRow}>
              <Image
                source={require('../assets/splash-icon.png')}
                style={styles.headerLogo}
              />
              <Text style={styles.headerTitleText}>{children}</Text>
            </View>
          ),
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Home', headerShown: false }}
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
          options={{ title: 'Customize Sections' }}
        />
        <Stack.Screen
          name="review/[sessionId]"
          options={{ title: 'Review Checklist' }}
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
          options={{ title: 'Learn - Select Stack' }}
        />
        <Stack.Screen
          name="learn/[stackId]"
          options={{ title: 'Learning Session' }}
        />
        <Stack.Screen
          name="gaps"
          options={{ title: 'Knowledge Gaps' }}
        />
        <Stack.Screen
          name="search"
          options={{ title: 'Search' }}
        />
        <Stack.Screen
          name="dashboard"
          options={{ title: 'Review Readiness' }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{ title: 'Bookmarks' }}
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
          options={{ title: 'Items Due for Review' }}
        />
        <Stack.Screen
          name="trends"
          options={{ title: 'Session Trends' }}
        />
        <Stack.Screen
          name="pr-tracker"
          options={{ title: 'PR Tracker' }}
        />
        <Stack.Screen
          name="past-reviews"
          options={{ title: 'Past PRs' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="disclaimer"
          options={{ title: 'Disclaimer' }}
        />
        <Stack.Screen
          name="privacy"
          options={{ title: 'Privacy' }}
        />
        <Stack.Screen
          name="terms"
          options={{ title: 'Terms of Use' }}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  headerTitleText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
});
