import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { usePreferencesStore } from '../../src/store/usePreferencesStore';
import { useUsageStore } from '../../src/store/useUsageStore';
import { findItemById } from '../../src/data/checklistFinder';
import { sendTutorMessage, AiClientError } from '../../src/ai';
import type {
  TutorMessage,
  ConfidenceLevel,
} from '../../src/data/types';
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_EMOJI,
  CLAUDE_MODEL_LABELS,
} from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function LearnSessionScreen() {
  const { stackId } = useLocalSearchParams<{ stackId: string }>();
  const router = useRouter();
  const hasApiKey = usePreferencesStore((s) => s.hasApiKey);
  const resolveApiKey = usePreferencesStore((s) => s.resolveApiKey);
  const aiModel = usePreferencesStore((s) => s.aiModel);
  const recordUsage = useUsageStore((s) => s.recordUsage);

  const histories = useConfidenceStore((s) => s.histories);

  const gaps = useMemo(() => {
    let items = Object.values(histories);
    if (stackId !== 'all') {
      items = items.filter((h) => h.stackId === stackId);
    }
    return items
      .filter((w) => w.currentConfidence <= 3)
      .sort((a, b) => a.learningPriority - b.learningPriority)
      .slice(0, 20);
  }, [histories, stackId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [wasAutoDowngraded, setWasAutoDowngraded] = useState(false);

  const currentGap = gaps[currentIndex];
  const found = useMemo(
    () => (currentGap ? findItemById(currentGap.itemId) : null),
    [currentGap],
  );

  const runTutorRequest = useCallback(async (
    userMsg: TutorMessage,
    role: 'concept-explainer' | 'exercise-generator',
    replaceHistory: boolean,
  ) => {
    if (!found || !currentGap) return;
    setError(null);
    setIsLoading(true);

    const updatedMessages = replaceHistory ? [userMsg] : [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const apiKey = await resolveApiKey();
      const response = await sendTutorMessage({
        apiKey,
        model: aiModel,
        feature: 'learn',
        itemId: found.item.id,
        role,
        itemText: found.item.text,
        stackLabel: found.stackTitle,
        confidence: currentGap.currentConfidence as ConfidenceLevel,
        messages: updatedMessages,
      });

      if (!response.cached) {
        recordUsage(response.resolvedModel, response.inputTokens, response.outputTokens, {
          feature: 'learn',
        });
      }

      setWasAutoDowngraded(response.autoDowngraded);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(
        err instanceof AiClientError ? err.message : 'Something went wrong.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [found, currentGap, messages, aiModel, recordUsage, resolveApiKey]);

  const startLesson = useCallback(async () => {
    if (!found) return;
    setStarted(true);
    setMessages([]);

    const userMsg: TutorMessage = {
      role: 'user',
      content: `Teach me about this concept that I'm weak on: "${found.item.text}". Start from the basics and build up.`,
      timestamp: new Date().toISOString(),
    };

    await runTutorRequest(userMsg, 'concept-explainer', true);
  }, [found, runTutorRequest]);

  const requestExercise = useCallback(async () => {
    if (!found) return;
    const exerciseMsg: TutorMessage = {
      role: 'user',
      content: 'Give me a practice exercise to test my understanding of this concept.',
      timestamp: new Date().toISOString(),
    };
    await runTutorRequest(exerciseMsg, 'exercise-generator', false);
  }, [found, runTutorRequest]);

  const nextItem = useCallback(() => {
    if (currentIndex < gaps.length - 1) {
      setCurrentIndex((i) => i + 1);
      setMessages([]);
      setStarted(false);
      setError(null);
      setWasAutoDowngraded(false);
    }
  }, [currentIndex, gaps.length]);

  if (gaps.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle} accessibilityRole="header">No gaps to study!</Text>
          <Text style={styles.emptySubtext}>
            Complete review sessions and rate your confidence to identify areas
            for learning.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentIndex + 1) / gaps.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText} accessibilityLabel={`Item ${currentIndex + 1} of ${gaps.length}`}>
          {currentIndex + 1} of {gaps.length} items
        </Text>
      </View>

      {/* Current Item Card */}
      {currentGap && found && (
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemStackLabel}>
              {found.stackTitle} · {found.sectionTitle}
            </Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceBadgeText}>
                {CONFIDENCE_EMOJI[currentGap.currentConfidence as ConfidenceLevel]}{' '}
                {CONFIDENCE_LABELS[currentGap.currentConfidence as ConfidenceLevel]}
              </Text>
            </View>
          </View>
          <Text style={styles.itemText} accessibilityRole="header">{found.item.text}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.metaText}>
              Severity: {found.item.severity} · {currentGap.ratings.length}{' '}
              session{currentGap.ratings.length !== 1 ? 's' : ''} · Priority:{' '}
              {currentGap.learningPriority.toFixed(0)}
            </Text>
          </View>
        </View>
      )}

      {/* Not started state */}
      {!started && (
        <View style={styles.startSection}>
          {!hasApiKey ? (
            <View style={styles.noKeyCard}>
              <Text style={styles.noKeyText}>
                Add your Claude API key in Settings to use AI-powered learning.
              </Text>
              <Pressable
                style={styles.settingsLink}
                onPress={() => router.push('/settings')}
                accessibilityRole="link"
                accessibilityLabel="Go to Settings"
              >
                <Text style={styles.settingsLinkText}>
                  Go to Settings
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.startButton}
                onPress={startLesson}
                accessibilityRole="button"
                accessibilityLabel={`Start learning with ${CLAUDE_MODEL_LABELS[aiModel]}`}
              >
                <Text style={styles.startButtonText}>
                  💡 Start Learning with {CLAUDE_MODEL_LABELS[aiModel]}
                </Text>
              </Pressable>
              <Pressable
                style={styles.deepDiveLink}
                onPress={() =>
                  router.push(
                    `/deep-dive/${encodeURIComponent(currentGap!.itemId)}`,
                  )
                }
                accessibilityRole="link"
                accessibilityLabel="View base content instead"
              >
                <Text style={styles.deepDiveLinkText}>
                  📖 View base content instead
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {wasAutoDowngraded && (
        <View style={styles.downgradeBadge}>
          <Text style={styles.downgradeBadgeText}>
            Budget mode: request auto-downgraded to Sonnet.
          </Text>
        </View>
      )}

      {/* Chat Messages */}
      {started && messages.length > 0 && (
        <View style={styles.chatSection}>
          {messages
            .filter((m) => m.role === 'assistant')
            .map((msg, i) => (
              <View key={i} style={styles.lessonCard}>
                <Markdown style={markdownStyles}>{msg.content}</Markdown>
              </View>
            ))}

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorCard} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action buttons after lesson */}
          {!isLoading && (
            <View style={styles.lessonActions}>
              <Pressable
                style={styles.actionButton}
                onPress={requestExercise}
                accessibilityRole="button"
                accessibilityLabel="Practice exercise"
              >
                <Text style={styles.actionButtonText}>
                  🏋️ Practice exercise
                </Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() =>
                  router.push(
                    `/deep-dive/${encodeURIComponent(currentGap!.itemId)}`,
                  )
                }
                accessibilityRole="link"
                accessibilityLabel="Open AI Tutor chat"
              >
                <Text style={styles.actionButtonText}>
                  🎓 Open AI Tutor chat
                </Text>
              </Pressable>
              {currentIndex < gaps.length - 1 && (
                <Pressable
                  style={[styles.actionButton, styles.nextButton]}
                  onPress={nextItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Next item, ${currentIndex + 2} of ${gaps.length}`}
                >
                  <Text style={styles.nextButtonText}>
                    Next item →
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },

  // Progress
  progressBar: {
    marginBottom: spacing.xl,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.learnMode,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },

  // Item Card
  itemCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.learnMode,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemStackLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  confidenceBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.error,
  },
  itemText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  itemMeta: {
    marginTop: spacing.sm,
  },
  metaText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },

  // Start
  startSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  startButton: {
    backgroundColor: colors.learnMode,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
  },
  startButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.bg,
  },
  deepDiveLink: {
    padding: spacing.md,
  },
  deepDiveLinkText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  noKeyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
  },
  noKeyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  downgradeBadge: {
    backgroundColor: `${colors.warning}22`,
    borderWidth: 1,
    borderColor: `${colors.warning}66`,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  downgradeBadgeText: {
    color: colors.warning,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  settingsLink: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  settingsLinkText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },

  // Chat / Lesson
  chatSection: {
    marginTop: spacing.sm,
  },
  lessonCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lessonText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  errorCard: {
    backgroundColor: colors.error + '20',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error,
  },

  // Lesson Actions
  lessonActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: colors.learnMode,
    borderColor: colors.learnMode,
  },
  nextButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.bg,
    textAlign: 'center',
  },

  // Empty state
  emptyState: {
    flex: 1,
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
  emptySubtext: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  backButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});

const markdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    lineHeight: 24,
  },
  code_inline: {
    backgroundColor: colors.codeBg,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  code_block: {
    backgroundColor: colors.codeBg,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  fence: {
    backgroundColor: colors.codeBg,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
};
