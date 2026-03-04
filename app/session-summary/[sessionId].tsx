import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '../../src/store/useSessionStore';
import { getChecklist, getPolishChecklist } from '../../src/data/checklistLoader';
import { getAllChecklistItems } from '../../src/data/types';
import { computeSessionScores } from '../../src/utils/scoring';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function SessionSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = useSessionStore((s) => s.getSession(sessionId));

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Session not found</Text>
      </View>
    );
  }

  const checklist =
    session.mode === 'polish'
      ? getPolishChecklist()
      : session.stackId
        ? getChecklist(session.stackId)
        : null;

  const allItems = checklist ? getAllChecklistItems(checklist) : [];
  const scores = computeSessionScores(session, allItems);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{session.title}</Text>
      <Text style={styles.subtitle}>
        {session.completedAt
          ? `Completed ${new Date(session.completedAt).toLocaleDateString()}`
          : 'In progress'}
      </Text>

      <View style={styles.scoreCards}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreValue}>{scores.coverage}%</Text>
          <Text style={styles.scoreLabel}>Coverage</Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreValue}>{scores.confidence}%</Text>
          <Text style={styles.scoreLabel}>Confidence</Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreValue}>{scores.totalIssues}</Text>
          <Text style={styles.scoreLabel}>Issues</Text>
        </View>
      </View>

      <View style={styles.issueBreakdown}>
        <Text style={styles.sectionTitle}>Issues Found</Text>
        <Text style={styles.issueRow}>
          🔴 {scores.issuesByServerity.blocker} Blockers
        </Text>
        <Text style={styles.issueRow}>
          🟠 {scores.issuesByServerity.major} Majors
        </Text>
        <Text style={styles.issueRow}>
          🟡 {scores.issuesByServerity.minor} Minors
        </Text>
        <Text style={styles.issueRow}>
          ⚪ {scores.issuesByServerity.nit} Nits
        </Text>
      </View>

      <Text style={styles.placeholder}>
        PDF export and detailed breakdown will be built in a later phase.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  error: {
    color: colors.error,
    fontSize: fontSizes.lg,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing['2xl'],
  },
  scoreCards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  issueBreakdown: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  issueRow: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  placeholder: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
