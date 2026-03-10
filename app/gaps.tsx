import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useResponsive } from '../src/hooks/useResponsive';
import { CONFIDENCE_EMOJI } from '../src/data/types';
import type { ConfidenceLevel, ItemConfidenceHistory } from '../src/data/types';
import { findItemById } from '../src/data/checklistFinder';
import { FilterChips } from '../src/components/FilterChips';
import { EmptyState } from '../src/components/EmptyState';
import { groupByField } from '../src/utils/groupBy';

type GapFilter = 'all' | 'active' | 'due' | 'improving' | 'strong';

const FILTER_OPTIONS: Array<{ key: GapFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active Gaps' },
  { key: 'due', label: 'Due Today' },
  { key: 'improving', label: 'Improving' },
  { key: 'strong', label: 'Strong' },
];

function GapCard({ gap, onPress }: { gap: ItemConfidenceHistory; onPress: () => void }) {
  const item = findItemById(gap.itemId);
  const recentRatings = gap.ratings.slice(-5);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gapCard,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.gapEmoji}>
        {CONFIDENCE_EMOJI[gap.currentConfidence as ConfidenceLevel]}
      </Text>
      <View style={styles.gapInfo}>
        <Text style={styles.gapItemText} numberOfLines={1}>
          {item?.item.text ?? gap.itemId}
        </Text>
        <View style={styles.gapMetaRow}>
          <Text style={styles.gapMeta}>
            {gap.stackId} · {gap.ratings.length} sessions
          </Text>
          <View style={styles.ratingDots}>
            {recentRatings.map((r, i) => (
              <View
                key={i}
                style={[
                  styles.ratingDot,
                  {
                    backgroundColor:
                      r.confidence >= 4
                        ? colors.success
                        : r.confidence >= 3
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function GapsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const histories = useConfidenceStore((s) => s.histories);
  const [filter, setFilter] = useState<GapFilter>('all');

  const weakest = useMemo(() => {
    return Object.values(histories)
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, 50);
  }, [histories]);

  const getDueItems = useConfidenceStore((s) => s.getDueItems);
  const dueItems = useMemo(() => getDueItems(), [getDueItems, histories]);

  const activeGaps = useMemo(
    () => weakest.filter((w) => w.currentConfidence <= 2),
    [weakest],
  );
  const improving = useMemo(
    () =>
      weakest.filter(
        (w) => w.currentConfidence === 3 && w.trend === 'improving',
      ),
    [weakest],
  );
  const strong = useMemo(
    () => weakest.filter((w) => w.currentConfidence >= 4),
    [weakest],
  );

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeGaps;
      case 'due':
        return dueItems;
      case 'improving':
        return improving;
      case 'strong':
        return strong;
      default:
        return weakest;
    }
  }, [filter, activeGaps, dueItems, improving, strong, weakest]);

  const grouped = useMemo(
    () => groupByField(filteredItems, (item) => item.stackId),
    [filteredItems],
  );

  const isEmpty =
    weakest.length === 0 && dueItems.length === 0;

  return (
    <DesktopContainer>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <Text style={styles.title}>My Knowledge Gaps</Text>

      {/* Summary stats */}
      {!isEmpty && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeGaps.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dueItems.length}</Text>
            <Text style={styles.statLabel}>Due</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{improving.length}</Text>
            <Text style={styles.statLabel}>Improving</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{strong.length}</Text>
            <Text style={styles.statLabel}>Strong</Text>
          </View>
        </View>
      )}

      {/* Filter chips */}
      {!isEmpty && (
        <View style={styles.filterScroll}>
          <FilterChips chips={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />
        </View>
      )}

      {/* Review Due Items button */}
      {filter === 'due' && dueItems.length > 0 && (
        <Pressable
          style={styles.reviewDueButton}
          onPress={() => router.push('/review/due-items')}
        >
          <Text style={styles.reviewDueText}>
            🔁 Review {dueItems.length} Due Item{dueItems.length !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}

      {isEmpty && (
        <EmptyState message="No gaps tracked yet. Complete a review session and rate your confidence on each item to start tracking." />
      )}

      {/* Grouped gap items */}
      {grouped.map(([stackId, items]) => (
        <View key={stackId} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {stackId} ({items.length})
          </Text>
          {items.map((gap) => (
            <GapCard
              key={gap.itemId}
              gap={gap}
              onPress={() =>
                router.push(
                  `/deep-dive/${encodeURIComponent(gap.itemId)}`,
                )
              }
            />
          ))}
        </View>
      ))}

      {!isEmpty && filteredItems.length === 0 && (
        <EmptyState message="No items match this filter." />
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
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
  reviewDueButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  reviewDueText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
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
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  gapEmoji: { fontSize: 20, marginRight: spacing.md },
  gapInfo: { flex: 1 },
  gapItemText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  gapMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gapMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
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
});
