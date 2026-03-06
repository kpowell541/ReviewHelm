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
import type { ConfidenceLevel } from '../src/data/types';
import { findItemById } from '../src/data/checklistFinder';

export default function GapsScreen() {
  const router = useRouter();
  const weakest = useConfidenceStore((s) => s.getWeakestItems(20));

  const activeGaps = weakest.filter((w) => w.currentConfidence <= 2);
  const improving = weakest.filter(
    (w) => w.currentConfidence === 3 && w.trend === 'improving'
  );
  const strong = weakest.filter((w) => w.currentConfidence >= 4);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Knowledge Gaps</Text>

      {activeGaps.length === 0 && improving.length === 0 && (
        <Text style={styles.empty}>
          No gaps tracked yet. Complete a review session and rate your
          confidence on each item to start tracking.
        </Text>
      )}

      {activeGaps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔴 Active Gaps ({activeGaps.length})
          </Text>
          {activeGaps.map((gap) => {
            const item = findItemById(gap.itemId);
            return (
              <Pressable
                key={gap.itemId}
                style={({ pressed }) => [
                  styles.gapCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() =>
                  router.push(`/deep-dive/${encodeURIComponent(gap.itemId)}`)
                }
              >
              <Text style={styles.gapEmoji}>
                {CONFIDENCE_EMOJI[gap.currentConfidence as ConfidenceLevel]}
              </Text>
              <View style={styles.gapInfo}>
                <Text style={styles.gapItemId} numberOfLines={1}>
                  {item?.item.text ?? gap.itemId}
                </Text>
                <Text style={styles.gapMeta}>
                  {gap.stackId} · {gap.ratings.length} sessions · priority{' '}
                  {gap.learningPriority.toFixed(0)}
                </Text>
              </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {improving.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📈 Improving ({improving.length})
          </Text>
          {improving.map((gap) => {
            const item = findItemById(gap.itemId);
            return (
              <Pressable
                key={gap.itemId}
                style={({ pressed }) => [
                  styles.gapCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() =>
                  router.push(`/deep-dive/${encodeURIComponent(gap.itemId)}`)
                }
              >
              <Text style={styles.gapEmoji}>🤔</Text>
              <View style={styles.gapInfo}>
                <Text style={styles.gapItemId} numberOfLines={1}>
                  {item?.item.text ?? gap.itemId}
                </Text>
                <Text style={styles.gapMeta}>
                  {gap.stackId} · trending up
                </Text>
              </View>
              </Pressable>
            );
          })}
        </View>
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
    marginBottom: spacing['2xl'],
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
  gapItemId: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  gapMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
