import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useResponsive } from '../src/hooks/useResponsive';
import {
  CONFIDENCE_EMOJI,
  LEARNING_FEEDBACK_LABELS,
  isLearningSource,
} from '../src/data/types';
import type {
  ConfidenceLevel,
  ConfidenceRating,
  ItemConfidenceHistory,
  LearningFeedback,
} from '../src/data/types';
import { findItemById } from '../src/data/checklistFinder';
import { FilterChips } from '../src/components/FilterChips';
import { EmptyState } from '../src/components/EmptyState';
import { groupByField } from '../src/utils/groupBy';
import { AppFooter } from '../src/components/AppFooter';

type GapFilter = 'all' | 'active' | 'due' | 'wins' | 'studied';

const FILTER_OPTIONS: Array<{ key: GapFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Needs Work' },
  { key: 'due', label: 'Due Today' },
  { key: 'wins', label: 'Recent Wins' },
  { key: 'studied', label: 'Recently Studied' },
];

const RECENT_WINDOW_DAYS = 14;

function isRecent(date: string, days: number = RECENT_WINDOW_DAYS): boolean {
  const ms = new Date(date).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return ms >= cutoff;
}

function getLearningRatings(history: ItemConfidenceHistory): ConfidenceRating[] {
  return history.ratings.filter((rating) => isLearningSource(rating.source));
}

function getLastLearningRating(
  history: ItemConfidenceHistory,
): ConfidenceRating | undefined {
  return getLearningRatings(history).at(-1);
}

function getRelativeTimeLabel(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function GapCard({
  gap,
  onPress,
}: {
  gap: ItemConfidenceHistory;
  onPress: () => void;
}) {
  const item = findItemById(gap.itemId);
  const recentRatings = gap.ratings.slice(-5);
  const learningRatings = getLearningRatings(gap);
  const lastLearning = learningRatings.at(-1);
  const feedbackLabel = lastLearning?.feedback
    ? LEARNING_FEEDBACK_LABELS[lastLearning.feedback as LearningFeedback]
    : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gapCard,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${
        item?.item.text ?? gap.itemId
      }, confidence ${gap.currentConfidence}`}
      accessibilityHint="Opens deep dive for this item"
    >
      <Text style={styles.gapEmoji}>
        {CONFIDENCE_EMOJI[gap.currentConfidence as ConfidenceLevel]}
      </Text>
      <View style={styles.gapInfo}>
        <Text style={styles.gapItemText} numberOfLines={2}>
          {item?.item.text ?? gap.itemId}
        </Text>
        <Text style={styles.gapMeta}>
          {gap.stackId} ·{' '}
          {
            gap.ratings.filter(
              (rating) => !rating.source || rating.source === 'review',
            ).length
          }{' '}
          reviews · {learningRatings.length} lessons
        </Text>
        {lastLearning && feedbackLabel && (
          <Text style={styles.gapSubmeta}>
            Last lesson: {feedbackLabel} · {getRelativeTimeLabel(lastLearning.date)}
          </Text>
        )}
        <View style={styles.gapFooter}>
          <View style={styles.ratingDots}>
            {recentRatings.map((rating, index) => (
              <View
                key={index}
                style={[
                  styles.ratingDot,
                  {
                    backgroundColor:
                      rating.confidence >= 4
                        ? colors.success
                        : rating.confidence >= 3
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.openLabel}>Open</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function GapsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const histories = useConfidenceStore((s) => s.histories);
  const getDueItems = useConfidenceStore((s) => s.getDueItems);
  const [filter, setFilter] = useState<GapFilter>('all');

  const weakest = useMemo(() => {
    return Object.values(histories)
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, 50);
  }, [histories]);

  const dueItems = useMemo(() => getDueItems(), [getDueItems, histories]);

  const activeGaps = useMemo(
    () => weakest.filter((history) => history.currentConfidence <= 2),
    [weakest],
  );

  const recentWins = useMemo(() => {
    return weakest
      .filter((history) => {
        const lastLearning = getLastLearningRating(history);
        return Boolean(
          lastLearning &&
            isRecent(lastLearning.date) &&
            (lastLearning.feedback === 'clearer' ||
              lastLearning.feedback === 'ready-to-apply'),
        );
      })
      .sort((a, b) => {
        const aDate = getLastLearningRating(a)?.date ?? '';
        const bDate = getLastLearningRating(b)?.date ?? '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [weakest]);

  const recentlyStudied = useMemo(() => {
    return weakest
      .filter((history) => {
        const lastLearning = getLastLearningRating(history);
        return Boolean(lastLearning && isRecent(lastLearning.date));
      })
      .sort((a, b) => {
        const aDate = getLastLearningRating(a)?.date ?? '';
        const bDate = getLastLearningRating(b)?.date ?? '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [weakest]);

  const studySessionsLastWeek = useMemo(() => {
    return weakest.reduce((count, history) => {
      return (
        count +
        getLearningRatings(history).filter((rating) => isRecent(rating.date, 7))
          .length
      );
    }, 0);
  }, [weakest]);

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeGaps;
      case 'due':
        return dueItems;
      case 'wins':
        return recentWins;
      case 'studied':
        return recentlyStudied;
      default:
        return weakest;
    }
  }, [activeGaps, dueItems, filter, recentWins, recentlyStudied, weakest]);

  const grouped = useMemo(
    () => groupByField(filteredItems, (item) => item.stackId),
    [filteredItems],
  );

  const isEmpty = weakest.length === 0 && dueItems.length === 0;

  return (
    <DesktopContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.contentDesktop,
        ]}
      >
        <Text style={styles.title} accessibilityRole="header">
          My Knowledge Gaps
        </Text>
        <Text style={styles.subtitle}>
          Track where confidence is low, what you studied, and whether a lesson
          actually moved the gap.
        </Text>

        {!isEmpty && (
          <View style={styles.heroCard}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Give the gaps screen a job</Text>
              <Text style={styles.heroCopy}>
                Review due items when you need recall practice. Run a learning
                session when you need understanding. Each lesson now ends with a
                feedback check-in so this list reflects improvement, not just
                activity.
              </Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                style={styles.heroPrimaryButton}
                onPress={() => router.push('/learn/all')}
                accessibilityRole="button"
                accessibilityLabel="Study top gaps"
              >
                <Text style={styles.heroPrimaryButtonText}>Study top gaps</Text>
              </Pressable>
              <Pressable
                style={styles.heroSecondaryButton}
                onPress={() => router.push('/review/due-items')}
                accessibilityRole="button"
                accessibilityLabel="Review due items"
              >
                <Text style={styles.heroSecondaryButtonText}>
                  Review due items
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {!isEmpty && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeGaps.length}</Text>
              <Text style={styles.statLabel}>Needs work</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dueItems.length}</Text>
              <Text style={styles.statLabel}>Due today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{recentWins.length}</Text>
              <Text style={styles.statLabel}>Recent wins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{studySessionsLastWeek}</Text>
              <Text style={styles.statLabel}>Lessons this week</Text>
            </View>
          </View>
        )}

        {!isEmpty && (
          <View style={styles.filterScroll}>
            <FilterChips
              chips={FILTER_OPTIONS}
              selected={filter}
              onSelect={setFilter}
            />
          </View>
        )}

        {isEmpty && (
          <EmptyState message="No gaps tracked yet. Complete a review session and rate your confidence on each item to start building a useful learning queue." />
        )}

        {grouped.map(([stackId, items]) => (
          <View key={stackId} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {stackId} ({items.length})
            </Text>
            {items.map((gap) => (
              <GapCard
                key={gap.itemId}
                gap={gap}
                onPress={() =>
                  router.push(`/deep-dive/${encodeURIComponent(gap.itemId)}`)
                }
              />
            ))}
          </View>
        ))}

        {!isEmpty && filteredItems.length === 0 && (
          <EmptyState message="Nothing matches this filter yet." />
        )}
        <AppFooter />
      </ScrollView>
    </DesktopContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  contentDesktop: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: `${colors.learnMode}12`,
    borderWidth: 1,
    borderColor: `${colors.learnMode}30`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroText: {
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  heroCopy: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroPrimaryButton: {
    backgroundColor: colors.learnMode,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  heroPrimaryButtonText: {
    color: colors.bg,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  heroSecondaryButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroSecondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  filterScroll: {
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing['2xl'] },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gapCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gapEmoji: {
    fontSize: 20,
    marginRight: spacing.md,
    marginTop: 2,
  },
  gapInfo: { flex: 1 },
  gapItemText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  gapMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  gapSubmeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  ratingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  ratingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
});
