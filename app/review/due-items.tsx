import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { findItemById } from '../../src/data/checklistFinder';
import {
  CONFIDENCE_EMOJI,
  CONFIDENCE_LABELS,
  type ConfidenceLevel,
  type ItemConfidenceHistory,
} from '../../src/data/types';
import { computeNextReview } from '../../src/utils/spacedRepetition';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

const SEVERITY_COLORS: Record<string, string> = {
  blocker: colors.blocker,
  major: colors.major,
  minor: colors.minor,
  nit: colors.nit,
};

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [1, 2, 3, 4, 5];
const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  1: colors.confidence1,
  2: colors.confidence2,
  3: colors.confidence3,
  4: colors.confidence4,
  5: colors.confidence5,
};

export default function DueItemsScreen() {
  const router = useRouter();
  const histories = useConfidenceStore((s) => s.histories);

  const dueItems = useMemo(() => {
    const now = Date.now();
    return Object.values(histories).filter((h) => {
      if (!h.repetitionState?.nextReviewDate) return false;
      return new Date(h.repetitionState.nextReviewDate).getTime() <= now;
    });
  }, [histories]);
  const [reviewed, setReviewed] = useState<Record<string, ConfidenceLevel>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const remaining = useMemo(
    () => dueItems.filter((item) => !(item.itemId in reviewed)),
    [dueItems, reviewed],
  );

  const currentItem = remaining[0] as ItemConfidenceHistory | undefined;
  const totalCount = dueItems.length;
  const reviewedCount = Object.keys(reviewed).length;
  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  const handleRate = useCallback(
    (confidence: ConfidenceLevel) => {
      if (!currentItem) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Update the confidence store directly
      const existing = histories[currentItem.itemId];
      if (existing) {
        const now = new Date().toISOString();
        const newRating = {
          sessionId: 'due-review',
          confidence,
          verdict: 'looks-good' as const,
          date: now,
        };
        const ratings = [...existing.ratings, newRating];
        const avgConfidence =
          ratings.reduce((sum, r) => sum + r.confidence, 0) / ratings.length;

        useConfidenceStore.setState((state) => ({
          histories: {
            ...state.histories,
            [currentItem.itemId]: {
              ...existing,
              ratings,
              currentConfidence: confidence,
              averageConfidence: Math.round(avgConfidence * 10) / 10,
              repetitionState: computeNextReview(
                existing.repetitionState ?? null,
                confidence,
              ),
            },
          },
        }));
      }

      setReviewed((prev) => ({ ...prev, [currentItem.itemId]: confidence }));
      setRevealedId(null);
    },
    [currentItem, histories],
  );

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>No items due for review</Text>
        <Text style={styles.emptyHint}>
          Complete more review sessions to build up your spaced repetition queue.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentItem) {
    // All done
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎉</Text>
        <Text style={styles.emptyTitle}>All done!</Text>
        <Text style={styles.emptyHint}>
          You reviewed {reviewedCount} item{reviewedCount !== 1 ? 's' : ''}.
          Great work staying on top of your knowledge gaps.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const found = findItemById(currentItem.itemId);
  const isRevealed = revealedId === currentItem.itemId;
  const sevColor = SEVERITY_COLORS[currentItem.severity] ?? colors.textMuted;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {reviewedCount} / {totalCount} reviewed
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.cardContainer}>
        {/* Flashcard */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.severityBadge, { backgroundColor: sevColor + '20' }]}>
              <Text style={[styles.severityText, { color: sevColor }]}>
                {currentItem.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.stackBadge}>{currentItem.stackId}</Text>
          </View>

          <Text style={styles.itemText}>
            {found?.item.text ?? currentItem.itemId}
          </Text>

          {/* Previous confidence */}
          <View style={styles.previousRow}>
            <Text style={styles.previousLabel}>Last confidence:</Text>
            <Text style={styles.previousValue}>
              {CONFIDENCE_EMOJI[currentItem.currentConfidence as ConfidenceLevel]}{' '}
              {currentItem.currentConfidence}/5
            </Text>
          </View>

          {/* Reveal context */}
          {!isRevealed ? (
            <Pressable
              style={styles.revealButton}
              onPress={() => setRevealedId(currentItem.itemId)}
            >
              <Text style={styles.revealButtonText}>Tap to reveal context</Text>
            </Pressable>
          ) : (
            <View style={styles.contextSection}>
              {found && (
                <>
                  <Text style={styles.contextLabel}>
                    Section: {found.sectionTitle}
                  </Text>
                  <Text style={styles.contextLabel}>
                    Stack: {found.stackTitle}
                  </Text>
                  <Text style={styles.contextLabel}>
                    Reviewed {currentItem.ratings.length} time{currentItem.ratings.length !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
              <Pressable
                style={styles.deepDiveLink}
                onPress={() =>
                  router.push(
                    `/deep-dive/${encodeURIComponent(currentItem.itemId)}`,
                  )
                }
              >
                <Text style={styles.deepDiveLinkText}>📚 Open deep dive</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Rating section */}
        <Text style={styles.ratePrompt}>How confident are you now?</Text>
        <View style={styles.ratingRow}>
          {CONFIDENCE_LEVELS.map((level) => (
            <Pressable
              key={level}
              style={[
                styles.ratingButton,
                { borderColor: CONFIDENCE_COLORS[level] + '60' },
              ]}
              onPress={() => handleRate(level)}
            >
              <Text style={styles.ratingEmoji}>{CONFIDENCE_EMOJI[level]}</Text>
              <Text
                style={[styles.ratingLevel, { color: CONFIDENCE_COLORS[level] }]}
              >
                {level}
              </Text>
              <Text style={styles.ratingLabel} numberOfLines={1}>
                {CONFIDENCE_LABELS[level]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginTop: spacing['2xl'],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
  },
  backButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  progressSection: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  progressText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  cardContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  severityText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  stackBadge: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  itemText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  previousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previousLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  previousValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  revealButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  revealButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  contextSection: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  contextLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  deepDiveLink: {
    marginTop: spacing.sm,
  },
  deepDiveLinkText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  ratePrompt: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
  },
  ratingEmoji: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  ratingLevel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  ratingLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
});
