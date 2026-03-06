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
import { CONFIDENCE_EMOJI } from '../src/data/types';
import type { ConfidenceLevel, ItemConfidenceHistory } from '../src/data/types';
import { findItemById } from '../src/data/checklistFinder';

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
  const histories = useConfidenceStore((s) => s.histories);
  const [filter, setFilter] = useState<GapFilter>('all');

  const weakest = useMemo(() => {
    return Object.values(histories)
      .sort((a, b) => a.learningPriority - b.learningPriority)
      .slice(0, 50);
  }, [histories]);

  const dueItems = useMemo(() => {
    const now = Date.now();
    return Object.values(histories).filter((h) => {
      if (!h.repetitionState?.nextReviewDate) return false;
      return new Date(h.repetitionState.nextReviewDate).getTime() <= now;
    });
  }, [histories]);

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

  // Group items by stack for display
  const groupByStack = (items: ItemConfidenceHistory[]) => {
    const groups: Record<string, ItemConfidenceHistory[]> = {};
    for (const item of items) {
      if (!groups[item.stackId]) groups[item.stackId] = [];
      groups[item.stackId].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

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
    () => groupByStack(filteredItems),
    [filteredItems],
  );

  const isEmpty =
    weakest.length === 0 && dueItems.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isSelected = filter === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setFilter(opt.key)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
        <Text style={styles.empty}>
          No gaps tracked yet. Complete a review session and rate your
          confidence on each item to start tracking.
        </Text>
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
        <Text style={styles.empty}>
          No items match this filter.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
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
  filterRow: {
    gap: spacing.xs,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgCard,
  },
  filterChipSelected: {
    backgroundColor: `${colors.primary}18`,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: colors.primary,
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
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
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
