import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { AppFooter } from '../src/components/AppFooter';
import { useResponsive } from '../src/hooks/useResponsive';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import { AddPRModal } from '../src/components/AddPRModal';
import { useFeatureGate } from '../src/hooks/useFeatureGate';
import { useTierStore } from '../src/store/useTierStore';
import { FeatureTourModal } from '../src/components/FeatureTourModal';
import { crossAlert } from '../src/utils/alert';

const ADMIN_DASHBOARD_EMAILS = (
  process.env.EXPO_PUBLIC_ADMIN_DASHBOARD_EMAILS ??
  'kaitlin.e.powell@gmail.com'
)
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

interface ModeCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: string;
  isDesktop?: boolean;
  locked?: boolean;
}

function ModeCard({ title, subtitle, icon, color, onPress, badge, isDesktop, locked }: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        isDesktop && styles.modeCardDesktop,
        { borderLeftColor: locked ? colors.textMuted : color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.modeCardContent}>
        <Text style={[styles.modeIcon, locked && { opacity: 0.4 }]}>{icon}</Text>
        <View style={styles.modeCardText}>
          <Text style={[styles.modeTitle, locked && { color: colors.textMuted }]}>{title}</Text>
          <Text style={styles.modeSubtitle}>{locked ? 'Upgrade to unlock' : subtitle}</Text>
        </View>
        {locked ? (
          <Text style={styles.lockIcon}>🔒</Text>
        ) : badge ? (
          <View style={[styles.badge, { backgroundColor: color + '30' }]}>
            <Text style={[styles.badgeText, { color }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function RecentSessionCard({
  session,
  prTitle,
  onDelete,
}: {
  session: { id: string; title: string; mode: string; updatedAt: string; isComplete: boolean; linkedPRId?: string };
  prTitle: string | null;
  onDelete: (id: string, title: string) => void;
}) {
  const router = useRouter();
  const route = session.mode === 'polish'
    ? `/polish/${session.id}` as const
    : `/review/${session.id}` as const;

  return (
    <Pressable
      onPress={() => router.push(route)}
      onLongPress={() => onDelete(session.id, session.title)}
      style={({ pressed }) => [
        styles.recentCard,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.recentCardInfo}>
        <Text style={styles.recentTitle} numberOfLines={1}>
          {session.title}
        </Text>
        {prTitle && (
          <Text style={styles.recentPR} numberOfLines={1}>
            {prTitle}
          </Text>
        )}
      </View>
      <Text style={styles.recentMeta}>
        {session.isComplete ? '✅ Complete' : '🔄 In progress'}
      </Text>
    </Pressable>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const hasCompletedOnboarding = usePreferencesStore((s) => s.hasCompletedOnboarding);
  const authUser = useAuthStore((s) => s.user);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  if (!authUser) {
    return <Redirect href="/auth/login" />;
  }

  return <>{children}</>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const authUser = useAuthStore((s) => s.user);
  const sessions = useSessionStore((s) => s.sessions);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const histories = useConfidenceStore((s) => s.histories);
  const prs = usePRTrackerStore((s) => s.prs);
  const addPR = usePRTrackerStore((s) => s.addPR);
  const adminEmail = (authUser?.email ?? '').trim().toLowerCase();
  const isAdminDashboardUser = ADMIN_DASHBOARD_EMAILS.includes(adminEmail);

  const [showAddPR, setShowAddPR] = useState(false);

  const effectiveTier = useTierStore((s) => s.effectiveTier);
  const hasSeenTourForTier = usePreferencesStore((s) => s.hasSeenTourForTier);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (authUser && hasSeenTourForTier !== effectiveTier) {
      setShowTour(true);
    }
  }, [authUser, effectiveTier, hasSeenTourForTier]);

  const handleTourClose = () => {
    setShowTour(false);
    usePreferencesStore.setState({ hasSeenTourForTier: effectiveTier } as any);
  };

  const handleDeleteSession = (sessionId: string, title: string) => {
    crossAlert('Delete Session', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(sessionId) },
    ]);
  };

  const getPRTitle = (prId: string | undefined) => {
    if (!prId) return null;
    const pr = prs[prId];
    return pr ? pr.title : null;
  };

  const starterGate = useFeatureGate('starter');
  const learnGate = useFeatureGate('pro');
  const gapsGate = useFeatureGate('pro');

  const recentSessions = useMemo(() => {
    return Object.values(sessions)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [sessions]);

  const getDueItems = useConfidenceStore((s) => s.getDueItems);
  const { gapCount, dueCount } = useMemo(() => {
    const items = Object.values(histories);
    const weakCount = items.filter((h) => h.currentConfidence <= 2).length;
    return { gapCount: Math.min(weakCount, 5), dueCount: getDueItems().length };
  }, [histories, getDueItems]);

  const activePRCount = useMemo(() => {
    return Object.values(prs).filter(
      (pr) => ['open', 'in-review', 'changes-requested', 'approved'].includes(pr.status),
    ).length;
  }, [prs]);

  return (
    <AuthGate>
    <SafeAreaView style={styles.container}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
        <View style={styles.homeHeader}>
          <View style={styles.logoArea}>
            <Image
              source={require('../assets/splash-icon.png')}
              style={styles.logoIcon}
            />
            <Text style={[styles.appTitle, isDesktop && styles.appTitleDesktop]}>
              <Text style={styles.wordmarkReview}>Review</Text>
              <Text style={styles.wordmarkHelm}>Helm</Text>
            </Text>
          </View>
          <Pressable
            style={styles.headerSettingsBtn}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.headerSettingsIcon}>&#x2699;&#xFE0E;</Text>
          </Pressable>
        </View>
        <Text style={styles.appSubtitle}>
          Review with confidence. Learn as you go.
        </Text>

        <View style={[styles.modeCards, isDesktop && styles.modeCardsDesktop]}>
          <ModeCard
            title="Review a PR"
            subtitle="Checklist for reviewing teammate PRs"
            icon="🔍"
            color={colors.reviewMode}
            onPress={() => router.push('/review/stack-select')}
            isDesktop={isDesktop}
          />

          <ModeCard
            title="Polish My PR"
            subtitle="Prep your PR for a smooth merge"
            icon="✨"
            color={colors.polishMode}
            onPress={() => starterGate.guardedNavigate('/polish/sessions')}
            isDesktop={isDesktop}
            locked={!starterGate.allowed}
          />

          <ModeCard
            title="Learn"
            subtitle="Study your weak areas with AI tutor"
            icon="📚"
            color={colors.learnMode}
            onPress={() => learnGate.guardedNavigate('/learn/stack-select')}
            badge={learnGate.allowed && gapCount > 0 ? `${gapCount} gaps` : undefined}
            isDesktop={isDesktop}
            locked={!learnGate.allowed}
          />

          <ModeCard
            title="My Gaps"
            subtitle="Track and close your knowledge gaps"
            icon="📊"
            color={colors.gapsMode}
            onPress={() => gapsGate.guardedNavigate('/gaps')}
            isDesktop={isDesktop}
            locked={!gapsGate.allowed}
            badge={
              gapsGate.allowed && (gapCount > 0 || dueCount > 0)
                ? [
                    gapCount > 0 ? `${gapCount} gaps` : '',
                    dueCount > 0 ? `${dueCount} due` : '',
                  ].filter(Boolean).join(' · ')
                : undefined
            }
          />
        </View>

        <View style={styles.quickLinksGrid}>
          <Pressable
            style={styles.quickLink}
            onPress={() => starterGate.allowed ? setShowAddPR(true) : starterGate.guardedNavigate('/pr-tracker')}
          >
            <Text style={styles.quickLinkText}>{starterGate.allowed ? '＋' : '🔒'} Add PR</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/search')}
          >
            <Text style={styles.quickLinkText}>🔎 Search</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => starterGate.allowed ? router.push('/pr-tracker') : starterGate.guardedNavigate('/pr-tracker')}
          >
            <Text style={styles.quickLinkText}>
              {starterGate.allowed ? '🔀' : '🔒'} PRs{starterGate.allowed && activePRCount > 0 ? ` (${activePRCount})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => starterGate.allowed ? router.push('/dashboard') : starterGate.guardedNavigate('/dashboard')}
          >
            <Text style={styles.quickLinkText}>{starterGate.allowed ? '📈' : '🔒'} Readiness</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/bookmarks')}
          >
            <Text style={styles.quickLinkText}>⭐ Bookmarks</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => starterGate.allowed ? router.push('/trends') : starterGate.guardedNavigate('/trends')}
          >
            <Text style={styles.quickLinkText}>{starterGate.allowed ? '📊' : '🔒'} Trends</Text>
          </Pressable>
          {dueCount > 0 && (
            <Pressable
              style={styles.quickLink}
              onPress={() => router.push('/review/due-items')}
            >
              <Text style={styles.quickLinkText}>🔁 Due ({dueCount})</Text>
            </Pressable>
          )}
          {isAdminDashboardUser && (
            <Pressable
              style={styles.quickLink}
              onPress={() => router.push('/admin-dashboard')}
            >
              <Text style={styles.quickLinkText}>🛡 Admin</Text>
            </Pressable>
          )}
        </View>

        {recentSessions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {recentSessions.map((session) => (
              <RecentSessionCard
                key={session.id}
                session={session}
                prTitle={getPRTitle(session.linkedPRId)}
                onDelete={handleDeleteSession}
              />
            ))}
          </View>
        )}

        <AppFooter />
      </ScrollView>
      </DesktopContainer>

      <AddPRModal
        visible={showAddPR}
        onClose={() => setShowAddPR(false)}
        onSave={(data) => {
          addPR(data);
        }}
      />

      <FeatureTourModal
        visible={showTour}
        onClose={handleTourClose}
        effectiveTier={effectiveTier}
      />
    </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  scrollDesktop: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  appTitle: {
    fontSize: fontSizes['3xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
  },
  appTitleDesktop: {
    fontSize: fontSizes['4xl'],
  },
  wordmarkReview: {
    color: '#fbbf24',
  },
  wordmarkHelm: {
    color: '#8b5cf6',
  },
  headerSettingsBtn: {
    width: 36,
    height: 36,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSettingsIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  appSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_400Regular',
    marginTop: spacing.xs,
    marginBottom: spacing['3xl'],
  },
  modeCards: {
    gap: spacing.md,
  },
  modeCardsDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
  },
  modeCardDesktop: {
    flexBasis: '48%',
  } as any,
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  modeCardText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  modeSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  lockIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  quickLink: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  quickLinkText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  recentSection: {
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  recentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentCardInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  recentPR: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },

});
