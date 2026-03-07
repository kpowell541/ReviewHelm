import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useResponsive } from '../src/hooks/useResponsive';

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, color ? { color } : undefined]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ConfidenceBar({
  label,
  average,
}: {
  label: string;
  average: number;
}) {
  const pct = Math.round((average / 5) * 100);
  const barColor =
    average >= 4
      ? colors.success
      : average >= 3
        ? colors.warning
        : colors.error;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={styles.barValue}>{average.toFixed(1)}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { isDesktop } = useResponsive();
  const sessions = useSessionStore((s) => s.sessions);
  const histories = useConfidenceStore((s) => s.histories);

  const stats = useMemo(() => {
    const all = Object.values(sessions);
    const completed = all.filter((s) => s.isComplete);
    const reviewSessions = completed.filter((s) => s.mode === 'review');
    const polishSessions = completed.filter((s) => s.mode === 'polish');

    // Items responded
    let totalItemsResponded = 0;
    for (const s of completed) {
      totalItemsResponded += Object.keys(s.itemResponses).length;
    }

    // By stack
    const byStack: Record<string, number> = {};
    for (const s of reviewSessions) {
      const stacks = s.stackIds?.length ? s.stackIds : s.stackId ? [s.stackId] : [];
      for (const stackId of stacks) {
        byStack[stackId] = (byStack[stackId] || 0) + 1;
      }
    }

    // Confidence data
    const allHistories = Object.values(histories);
    const totalTracked = allHistories.length;
    const activeGaps = allHistories.filter(
      (h) => h.currentConfidence <= 2,
    ).length;
    const strongItems = allHistories.filter(
      (h) => h.currentConfidence >= 4,
    ).length;

    // Average confidence
    const avgConfidence =
      totalTracked > 0
        ? allHistories.reduce((sum, h) => sum + h.currentConfidence, 0) /
          totalTracked
        : 0;

    // Section averages
    const bySectionStack: Record<
      string,
      { stackId: string; sectionId: string; sum: number; count: number }
    > = {};
    for (const h of allHistories) {
      const key = `${h.stackId}:${h.sectionId}`;
      if (!bySectionStack[key]) {
        bySectionStack[key] = {
          stackId: h.stackId,
          sectionId: h.sectionId,
          sum: 0,
          count: 0,
        };
      }
      bySectionStack[key].sum += h.currentConfidence;
      bySectionStack[key].count += 1;
    }
    const sectionAverages = Object.values(bySectionStack)
      .map((s) => ({
        label: `${s.stackId} / ${s.sectionId}`,
        average: Math.round((s.sum / s.count) * 10) / 10,
      }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 10);

    // Streak: consecutive days with completed sessions
    const completedDates = new Set(
      completed
        .filter((s) => s.completedAt)
        .map((s) => new Date(s.completedAt!).toISOString().slice(0, 10)),
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (completedDates.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalSessions: completed.length,
      reviewCount: reviewSessions.length,
      polishCount: polishSessions.length,
      totalItemsResponded,
      byStack: Object.entries(byStack).sort(([, a], [, b]) => b - a),
      totalTracked,
      activeGaps,
      strongItems,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      sectionAverages,
      streak,
    };
  }, [sessions, histories]);

  const isEmpty = stats.totalSessions === 0 && stats.totalTracked === 0;

  return (
    <DesktopContainer>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <Text style={styles.title}>Dashboard</Text>

      {isEmpty && (
        <Text style={styles.empty}>
          Complete a review or polish session to see your stats here.
        </Text>
      )}

      {!isEmpty && (
        <>
          {/* Overview */}
          <View style={styles.statsRow}>
            <StatBlock
              label="Sessions"
              value={stats.totalSessions}
              color={colors.primary}
            />
            <StatBlock
              label="Items"
              value={stats.totalItemsResponded}
              color={colors.info}
            />
            <StatBlock
              label="Streak"
              value={`${stats.streak}d`}
              color={colors.success}
            />
          </View>

          {/* Session breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sessions</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Reviews</Text>
              <Text style={styles.breakdownValue}>
                {stats.reviewCount}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Polish</Text>
              <Text style={styles.breakdownValue}>
                {stats.polishCount}
              </Text>
            </View>
          </View>

          {/* By stack */}
          {stats.byStack.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reviews by Stack</Text>
              {stats.byStack.map(([stackId, count]) => (
                <View key={stackId} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{stackId}</Text>
                  <Text style={styles.breakdownValue}>{count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Confidence overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Knowledge</Text>
            <View style={styles.statsRow}>
              <StatBlock
                label="Tracked"
                value={stats.totalTracked}
              />
              <StatBlock
                label="Gaps"
                value={stats.activeGaps}
                color={colors.error}
              />
              <StatBlock
                label="Strong"
                value={stats.strongItems}
                color={colors.success}
              />
            </View>
            {stats.avgConfidence > 0 && (
              <Text style={styles.avgText}>
                Avg. confidence: {stats.avgConfidence}/5
              </Text>
            )}
          </View>

          {/* Weakest sections */}
          {stats.sectionAverages.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Weakest Sections (Top 10)
              </Text>
              {stats.sectionAverages.map((s) => (
                <ConfidenceBar
                  key={s.label}
                  label={s.label}
                  average={s.average}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
    </DesktopContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  contentDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBlock: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  breakdownLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  avgText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barLabel: {
    width: 120,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.bgSection,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 32,
    textAlign: 'right',
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});
