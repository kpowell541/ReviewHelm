import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';

interface ModeCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: string;
}

function ModeCard({ title, subtitle, icon, color, onPress, badge }: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        { borderLeftColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.modeCardContent}>
        <Text style={styles.modeIcon}>{icon}</Text>
        <View style={styles.modeCardText}>
          <Text style={styles.modeTitle}>{title}</Text>
          <Text style={styles.modeSubtitle}>{subtitle}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: color + '30' }]}>
            <Text style={[styles.badgeText, { color }]}>{badge}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function RecentSessionCard({ session }: { session: { id: string; title: string; mode: string; updatedAt: string; isComplete: boolean } }) {
  const router = useRouter();
  const route = session.mode === 'polish'
    ? `/polish/${session.id}` as const
    : `/review/${session.id}` as const;

  return (
    <Pressable
      onPress={() => router.push(route)}
      style={({ pressed }) => [
        styles.recentCard,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.recentTitle} numberOfLines={1}>
        {session.title}
      </Text>
      <Text style={styles.recentMeta}>
        {session.isComplete ? '✅ Complete' : '🔄 In progress'}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const recentSessions = useSessionStore((s) => s.getRecentSessions(3));
  const weakest = useConfidenceStore((s) => s.getWeakestItems(5));
  const gapCount = weakest.filter((w) => w.currentConfidence <= 2).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.appTitle}>PR Review Center</Text>
        <Text style={styles.appSubtitle}>
          Review with confidence. Learn as you go.
        </Text>

        <View style={styles.modeCards}>
          <ModeCard
            title="Review a PR"
            subtitle="Checklist for reviewing teammate PRs"
            icon="🔍"
            color={colors.reviewMode}
            onPress={() => router.push('/review/stack-select')}
          />

          <ModeCard
            title="Polish My PR"
            subtitle="Prep your PR for a smooth merge"
            icon="✨"
            color={colors.polishMode}
            onPress={() => router.push('/polish/sessions')}
          />

          <ModeCard
            title="Learn"
            subtitle="Study your weak areas with AI tutor"
            icon="📚"
            color={colors.learnMode}
            onPress={() => router.push('/learn/stack-select')}
            badge={gapCount > 0 ? `${gapCount} gaps` : undefined}
          />

          <ModeCard
            title="My Gaps"
            subtitle="Track and close your knowledge gaps"
            icon="📊"
            color={colors.gapsMode}
            onPress={() => router.push('/gaps')}
            badge={
              gapCount > 0 ? `${gapCount} to learn` : undefined
            }
          />
        </View>

        {recentSessions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {recentSessions.map((session) => (
              <RecentSessionCard key={session.id} session={session} />
            ))}
          </View>
        )}

        <Pressable
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.settingsText}>⚙️ Settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  appTitle: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  appSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing['3xl'],
  },
  modeCards: {
    gap: spacing.md,
  },
  modeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
  },
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modeSubtitle: {
    fontSize: fontSizes.sm,
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
  recentSection: {
    marginTop: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
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
  recentTitle: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    flex: 1,
  },
  recentMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  settingsButton: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
    padding: spacing.md,
  },
  settingsText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
