import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { hasAccess, useTierStore } from '../../src/store/useTierStore';
import { findItemById } from '../../src/data/checklistFinder';
import { sendTutorMessage, AiClientError } from '../../src/ai';
import { BaseContentView } from '../../src/components/BaseContentView';
import type {
  TutorMessage,
  ConfidenceLevel,
  ConfidenceSource,
  ItemConfidenceHistory,
  LearningFeedback,
} from '../../src/data/types';
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_EMOJI,
  CLAUDE_MODEL_LABELS,
  LEARNING_FEEDBACK_LABELS,
  isLearningSource,
} from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

type StudyMode = Extract<ConfidenceSource, 'learn-ai' | 'learn-self-guided'>;

const FEEDBACK_OPTIONS: Array<{
  key: LearningFeedback;
  title: string;
  detail: string;
  tone: string;
}> = [
  {
    key: 'still-stuck',
    title: 'Still stuck',
    detail: 'Keep this gap hot and bring it back soon.',
    tone: colors.error,
  },
  {
    key: 'clearer',
    title: 'Clearer now',
    detail: 'Nudge confidence up and keep practicing.',
    tone: colors.warning,
  },
  {
    key: 'ready-to-apply',
    title: 'Ready to apply',
    detail: 'Treat this as an improvement and space it out.',
    tone: colors.success,
  },
];

function buildQueue(
  histories: Record<string, ItemConfidenceHistory>,
  stackId: string,
): ItemConfidenceHistory[] {
  let items = Object.values(histories);
  if (stackId !== 'all') {
    items = items.filter((history) => history.stackId === stackId);
  }

  return items
    .filter((history) => history.currentConfidence <= 3)
    .sort((a, b) => b.learningPriority - a.learningPriority)
    .slice(0, 20);
}

export default function LearnSessionScreen() {
  const { stackId = 'all' } = useLocalSearchParams<{ stackId: string }>();
  const router = useRouter();
  const aiModel = usePreferencesStore((s) => s.aiModel);
  const recordUsage = useUsageStore((s) => s.recordUsage);
  const effectiveTier = useTierStore((s) => s.effectiveTier);
  const hasAiTutor = hasAccess(effectiveTier, 'premium');

  const histories = useConfidenceStore((s) => s.histories);
  const hasHydrated = useConfidenceStore((s) => s.hasHydrated);
  const recordLearningFeedback = useConfidenceStore(
    (s) => s.recordLearningFeedback,
  );

  const [queue, setQueue] = useState<ItemConfidenceHistory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode | null>(null);
  const [wasAutoDowngraded, setWasAutoDowngraded] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] =
    useState<LearningFeedback | null>(null);
  const [updatedConfidence, setUpdatedConfidence] =
    useState<ConfidenceLevel | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    setQueue(buildQueue(histories, stackId));
    setCurrentIndex(0);
    setMessages([]);
    setIsLoading(false);
    setError(null);
    setStudyMode(null);
    setWasAutoDowngraded(false);
    setSubmittedFeedback(null);
    setUpdatedConfidence(null);
    setFinished(false);
  }, [hasHydrated, stackId]);

  useEffect(() => {
    if (!hasHydrated || queue.length > 0) return;
    setQueue(buildQueue(histories, stackId));
  }, [hasHydrated, histories, queue.length, stackId]);

  const currentGap = queue[currentIndex];
  const liveHistory = currentGap
    ? histories[currentGap.itemId] ?? currentGap
    : undefined;
  const found = useMemo(
    () => (currentGap ? findItemById(currentGap.itemId) : null),
    [currentGap],
  );

  const hasBaseContent = Boolean(
    found &&
      (
        found.item.baseContent.whatItMeans ||
        found.item.baseContent.whyItMatters ||
        found.item.baseContent.howToVerify ||
        found.item.baseContent.exampleComment ||
        found.item.baseContent.keyTakeaway ||
        found.item.baseContent.codeExamples.length > 0 ||
        found.item.baseContent.references?.length
      ),
  );

  const learningSessionCount = useMemo(() => {
    if (!liveHistory) return 0;
    return liveHistory.ratings.filter((rating) => isLearningSource(rating.source))
      .length;
  }, [liveHistory]);

  const reviewSessionCount = useMemo(() => {
    if (!liveHistory) return 0;
    return liveHistory.ratings.filter(
      (rating) => !rating.source || rating.source === 'review',
    ).length;
  }, [liveHistory]);

  const runTutorRequest = useCallback(
    async (
      userMsg: TutorMessage,
      role: 'concept-explainer' | 'exercise-generator',
      replaceHistory: boolean,
    ) => {
      if (!found || !liveHistory) return;

      setError(null);
      setIsLoading(true);

      const updatedMessages = replaceHistory ? [userMsg] : [...messages, userMsg];
      setMessages(updatedMessages);

      try {
        const response = await sendTutorMessage({
          model: aiModel,
          feature: 'learn',
          itemId: found.item.id,
          role,
          itemText: found.item.text,
          stackLabel: found.stackTitle,
          confidence: liveHistory.currentConfidence as ConfidenceLevel,
          messages: updatedMessages,
        });

        if (!response.cached) {
          recordUsage(
            response.resolvedModel,
            response.inputTokens,
            response.outputTokens,
            { feature: 'learn' },
          );
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
    },
    [aiModel, found, liveHistory, messages, recordUsage],
  );

  const startAiLesson = useCallback(async () => {
    if (!found || !hasAiTutor) return;

    setStudyMode('learn-ai');
    setSubmittedFeedback(null);
    setUpdatedConfidence(null);
    setMessages([]);
    setError(null);

    const userMsg: TutorMessage = {
      role: 'user',
      content: `Teach me about this concept that I'm weak on: "${found.item.text}". Start from the basics and build up toward how I would spot it in code review.`,
      timestamp: new Date().toISOString(),
    };

    await runTutorRequest(userMsg, 'concept-explainer', true);
  }, [found, hasAiTutor, runTutorRequest]);

  const startSelfGuidedLesson = useCallback(() => {
    setStudyMode('learn-self-guided');
    setSubmittedFeedback(null);
    setUpdatedConfidence(null);
    setMessages([]);
    setError(null);
    setWasAutoDowngraded(false);
  }, []);

  const requestExercise = useCallback(async () => {
    if (!found || studyMode !== 'learn-ai') return;
    const exerciseMsg: TutorMessage = {
      role: 'user',
      content:
        'Give me a short practice exercise so I can test whether I really understand this.',
      timestamp: new Date().toISOString(),
    };
    await runTutorRequest(exerciseMsg, 'exercise-generator', false);
  }, [found, runTutorRequest, studyMode]);

  const submitFeedback = useCallback(
    (feedback: LearningFeedback) => {
      if (!currentGap || !studyMode) return;
      const nextConfidence = recordLearningFeedback(
        currentGap.itemId,
        studyMode,
        feedback,
      );
      setSubmittedFeedback(feedback);
      setUpdatedConfidence(nextConfidence ?? null);
    },
    [currentGap, recordLearningFeedback, studyMode],
  );

  const nextItem = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((index) => index + 1);
      setMessages([]);
      setIsLoading(false);
      setError(null);
      setStudyMode(null);
      setWasAutoDowngraded(false);
      setSubmittedFeedback(null);
      setUpdatedConfidence(null);
      return;
    }

    setFinished(true);
  }, [currentIndex, queue.length]);

  if (!hasHydrated) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="small" color={colors.learnMode} />
        <Text style={styles.loadingScreenText}>Loading your learning queue...</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle} accessibilityRole="header">
            Learning session complete
          </Text>
          <Text style={styles.emptySubtext}>
            Every lesson in this run ended with a confidence check-in, so your
            gaps list now reflects what actually helped.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace('/gaps')}
            accessibilityRole="button"
            accessibilityLabel="Back to gaps"
          >
            <Text style={styles.backButtonText}>Back to gaps</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (queue.length === 0 || !currentGap || !found || !liveHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle} accessibilityRole="header">
            No gaps to study
          </Text>
          <Text style={styles.emptySubtext}>
            Complete review sessions and rate your confidence to build a useful
            learning queue.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressBar}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentIndex + 1) / queue.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text
          style={styles.progressText}
          accessibilityLabel={`Item ${currentIndex + 1} of ${queue.length}`}
        >
          {currentIndex + 1} of {queue.length} items
        </Text>
      </View>

      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemStackLabel}>
            {found.stackTitle} · {found.sectionTitle}
          </Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceBadgeText}>
              {CONFIDENCE_EMOJI[
                liveHistory.currentConfidence as ConfidenceLevel
              ]}{' '}
              {CONFIDENCE_LABELS[liveHistory.currentConfidence as ConfidenceLevel]}
            </Text>
          </View>
        </View>
        <Text style={styles.itemText} accessibilityRole="header">
          {found.item.text}
        </Text>
        <Text style={styles.metaText}>
          Severity: {found.item.severity} · {reviewSessionCount} review check-in
          {reviewSessionCount !== 1 ? 's' : ''} · {learningSessionCount}{' '}
          learning session{learningSessionCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {studyMode === null && (
        <View style={styles.startSection}>
          <View style={styles.directionCard}>
            <Text style={styles.directionTitle}>Close the loop on this gap</Text>
            <Text style={styles.directionText}>
              Study the concept, then tell ReviewHelm whether you are still
              stuck, clearer, or ready to apply it. That feedback updates your
              confidence instead of leaving learning sessions disconnected from
              progress.
            </Text>
          </View>

          {hasAiTutor && (
            <Pressable
              style={styles.primaryStartButton}
              onPress={startAiLesson}
              accessibilityRole="button"
              accessibilityLabel={`Start guided lesson with ${CLAUDE_MODEL_LABELS[aiModel]}`}
            >
              <Text style={styles.primaryStartButtonText}>
                Guided AI lesson with {CLAUDE_MODEL_LABELS[aiModel]}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.secondaryStartButton}
            onPress={startSelfGuidedLesson}
            accessibilityRole="button"
            accessibilityLabel="Start self-guided lesson"
          >
            <Text style={styles.secondaryStartButtonText}>
              Self-guided lesson from ReviewHelm content
            </Text>
          </Pressable>

          <Pressable
            style={styles.deepDiveLink}
            onPress={() =>
              router.push(`/deep-dive/${encodeURIComponent(currentGap.itemId)}`)
            }
            accessibilityRole="link"
            accessibilityLabel="Open the full deep dive"
          >
            <Text style={styles.deepDiveLinkText}>Open the full deep dive</Text>
          </Pressable>

          {!hasAiTutor && (
            <View style={styles.upsellCard}>
              <Text style={styles.upsellTitle}>Need more guidance?</Text>
              <Text style={styles.upsellText}>
                Premium adds guided explanations and practice questions for each
                gap. If you stay self-guided, use the deep dive, official docs,
                examples, and your own follow-up research when this lesson is
                not enough.
              </Text>
              <Pressable
                style={styles.upsellButton}
                onPress={() => router.push('/plans')}
                accessibilityRole="button"
                accessibilityLabel="View Premium plan"
              >
                <Text style={styles.upsellButtonText}>See Premium</Text>
              </Pressable>
            </View>
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

      {studyMode === 'learn-ai' && (
        <View style={styles.lessonSection}>
          {messages
            .filter((message) => message.role === 'assistant')
            .map((message, index) => (
              <View key={index} style={styles.lessonCard}>
                <Markdown style={markdownStyles}>{message.content}</Markdown>
              </View>
            ))}

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Building your lesson...</Text>
            </View>
          )}

          {error && (
            <View
              style={styles.errorCard}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!isLoading && messages.length > 0 && (
            <View style={styles.lessonActions}>
              <Pressable
                style={styles.actionButton}
                onPress={requestExercise}
                accessibilityRole="button"
                accessibilityLabel="Generate a practice exercise"
              >
                <Text style={styles.actionButtonText}>Practice exercise</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() =>
                  router.push(`/deep-dive/${encodeURIComponent(currentGap.itemId)}`)
                }
                accessibilityRole="link"
                accessibilityLabel="Open full deep dive"
              >
                <Text style={styles.actionButtonText}>Open full deep dive</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {studyMode === 'learn-self-guided' && (
        <View style={styles.lessonSection}>
          {hasBaseContent ? (
            <View style={styles.lessonCard}>
              <BaseContentView content={found.item.baseContent} />
            </View>
          ) : (
            <View style={styles.emptyContentCard}>
              <Text style={styles.emptyContentTitle}>No authored lesson yet</Text>
              <Text style={styles.emptyContentText}>
                This item does not have enough built-in content yet. Open the
                deep dive and continue with references or your own research.
              </Text>
            </View>
          )}
        </View>
      )}

      {studyMode !== null && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>How did this session go?</Text>
          <Text style={styles.feedbackSubtitle}>
            Your answer updates this gap so the next learning recommendation is
            based on what changed, not just the fact that you opened the page.
          </Text>

          {submittedFeedback ? (
            <View style={styles.feedbackSaved}>
              <Text style={styles.feedbackSavedTitle}>
                Saved: {LEARNING_FEEDBACK_LABELS[submittedFeedback]}
              </Text>
              {updatedConfidence && (
                <Text style={styles.feedbackSavedText}>
                  Confidence is now {updatedConfidence}/5 (
                  {CONFIDENCE_LABELS[updatedConfidence]}).
                </Text>
              )}
              <Pressable
                style={styles.nextButton}
                onPress={nextItem}
                accessibilityRole="button"
                accessibilityLabel={
                  currentIndex < queue.length - 1 ? 'Study next gap' : 'Finish'
                }
              >
                <Text style={styles.nextButtonText}>
                  {currentIndex < queue.length - 1 ? 'Study next gap' : 'Finish'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.feedbackOptions}>
              {FEEDBACK_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  style={[
                    styles.feedbackOption,
                    { borderColor: `${option.tone}55` },
                  ]}
                  onPress={() => submitFeedback(option.key)}
                  accessibilityRole="button"
                  accessibilityLabel={option.title}
                >
                  <Text style={[styles.feedbackOptionTitle, { color: option.tone }]}>
                    {option.title}
                  </Text>
                  <Text style={styles.feedbackOptionText}>{option.detail}</Text>
                </Pressable>
              ))}
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
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  loadingScreenText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },

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
    gap: spacing.sm,
  },
  itemStackLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: `${colors.warning}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  confidenceBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.warning,
  },
  itemText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },

  startSection: {
    gap: spacing.md,
  },
  directionCard: {
    backgroundColor: `${colors.learnMode}12`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.learnMode}35`,
    padding: spacing.lg,
  },
  directionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  directionText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  primaryStartButton: {
    backgroundColor: colors.learnMode,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  primaryStartButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.bg,
    textAlign: 'center',
  },
  secondaryStartButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryStartButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  deepDiveLink: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deepDiveLinkText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  upsellCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  upsellTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  upsellText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  upsellButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  upsellButtonText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },

  downgradeBadge: {
    backgroundColor: `${colors.warning}22`,
    borderWidth: 1,
    borderColor: `${colors.warning}66`,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  downgradeBadgeText: {
    color: colors.warning,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },

  lessonSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  lessonCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyContentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyContentTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyContentText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
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
    backgroundColor: `${colors.error}20`,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  lessonActions: {
    gap: spacing.sm,
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

  feedbackCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  feedbackTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  feedbackSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  feedbackOptions: {
    gap: spacing.sm,
  },
  feedbackOption: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.bg,
  },
  feedbackOptionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  feedbackOptionText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  feedbackSaved: {
    gap: spacing.sm,
  },
  feedbackSavedTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.success,
  },
  feedbackSavedText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  nextButton: {
    backgroundColor: colors.learnMode,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nextButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.bg,
  },

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
    textAlign: 'center',
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
