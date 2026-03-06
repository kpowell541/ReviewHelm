import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { findItemById } from '../../src/data/checklistFinder';
import { usePreferencesStore } from '../../src/store/usePreferencesStore';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { useSessionStore } from '../../src/store/useSessionStore';
import { useUsageStore } from '../../src/store/useUsageStore';
import { sendTutorMessage, AiClientError } from '../../src/ai';
import type { TutorMessage, ConfidenceLevel } from '../../src/data/types';
import { CLAUDE_MODEL_LABELS } from '../../src/data/types';
import { CalibrationFeedback } from '../../src/components/comment/CalibrationFeedback';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function CommentDrafterScreen() {
  const { itemId: rawItemId, sessionId } = useLocalSearchParams<{
    itemId: string;
    sessionId?: string;
  }>();
  const itemId = decodeURIComponent(rawItemId);
  const decodedSessionId = sessionId ? decodeURIComponent(sessionId) : undefined;

  const found = findItemById(itemId);
  const history = useConfidenceStore((s) => s.getItemHistory(itemId));
  const session = useSessionStore((s) =>
    decodedSessionId ? s.getSession(decodedSessionId) : undefined,
  );
  const setItemResponse = useSessionStore((s) => s.setItemResponse);
  const hasApiKey = usePreferencesStore((s) => s.hasApiKey);
  const resolveApiKey = usePreferencesStore((s) => s.resolveApiKey);
  const aiModel = usePreferencesStore((s) => s.aiModel);
  const recordUsage = useUsageStore((s) => s.recordUsage);

  const [context, setContext] = useState('');
  const [draftedComment, setDraftedComment] = useState(
    session?.itemResponses[itemId]?.draftedComment ?? '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wasAutoDowngraded, setWasAutoDowngraded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const confidence: ConfidenceLevel = history?.currentConfidence ?? 3;

  const saveDraftToSession = useCallback(() => {
    if (!decodedSessionId || !draftedComment.trim()) return;
    setItemResponse(decodedSessionId, itemId, {
      draftedComment: draftedComment.trim(),
    });
  }, [decodedSessionId, draftedComment, setItemResponse, itemId]);

  const generateDraft = useCallback(async () => {
    if (!found) return;

    setError(null);
    setIsLoading(true);

    const userPrompt = context.trim()
      ? `Help me draft a review comment for this issue: "${found.item.text}"\n\nAdditional context about what I found: ${context.trim()}`
      : `Help me draft a review comment for this issue: "${found.item.text}"`;

    const messages: TutorMessage[] = [
      { role: 'user', content: userPrompt, timestamp: new Date().toISOString() },
    ];

    try {
      const apiKey = await resolveApiKey();
      const response = await sendTutorMessage({
        apiKey,
        model: aiModel,
        role: 'comment-drafter',
        itemText: found.item.text,
        stackLabel: found.stackTitle,
        confidence,
        messages,
        allowResponseCache: false,
      });
      setDraftedComment(response.content);
      setShowFeedback(false);
      if (!response.cached) {
        recordUsage(response.resolvedModel, response.inputTokens, response.outputTokens, {
          feature: 'comment-drafter',
          sessionId: decodedSessionId,
        });
      }
      setWasAutoDowngraded(response.autoDowngraded);
      // Show feedback after a short delay
      setTimeout(() => setShowFeedback(true), 500);
    } catch (err) {
      if (err instanceof AiClientError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    found,
    context,
    aiModel,
    confidence,
    recordUsage,
    resolveApiKey,
    decodedSessionId,
  ]);

  const refineDraft = useCallback(
    async (instruction: string) => {
      if (!found || !draftedComment) return;

      setError(null);
      setIsLoading(true);

      const messages: TutorMessage[] = [
        {
          role: 'user',
          content: `Help me draft a review comment for: "${found.item.text}"`,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: draftedComment,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'user',
          content: instruction,
          timestamp: new Date().toISOString(),
        },
      ];

      try {
        const apiKey = await resolveApiKey();
        const response = await sendTutorMessage({
          apiKey,
          model: aiModel,
          role: 'comment-drafter',
          itemText: found.item.text,
          stackLabel: found.stackTitle,
          confidence,
          messages,
          allowResponseCache: false,
        });
        setDraftedComment(response.content);
        if (!response.cached) {
          recordUsage(response.resolvedModel, response.inputTokens, response.outputTokens, {
            feature: 'comment-drafter',
            sessionId: decodedSessionId,
          });
        }
        setWasAutoDowngraded(response.autoDowngraded);
      } catch (err) {
        if (err instanceof AiClientError) {
          setError(err.message);
        } else {
          setError('Something went wrong. Try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      found,
      draftedComment,
      aiModel,
      confidence,
      recordUsage,
      resolveApiKey,
      decodedSessionId,
    ],
  );

  const copyToClipboard = useCallback(async () => {
    if (!draftedComment) return;
    await Clipboard.setStringAsync(draftedComment);
    saveDraftToSession();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [draftedComment, saveDraftToSession]);

  if (!found) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const { item, stackTitle, sectionTitle } = found;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>Drafting comment for:</Text>
          <Text style={styles.itemText}>{item.text}</Text>
          <Text style={styles.stackLabel}>
            {stackTitle} · {sectionTitle}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What did you find?</Text>
          <Text style={styles.sectionHint}>
            Describe the specific issue you noticed (optional — helps generate a
            more targeted comment)
          </Text>
          <TextInput
            style={styles.contextInput}
            value={context}
            onChangeText={setContext}
            placeholder="e.g., The error from fetchUser() is being silently swallowed on line 42..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {!draftedComment && (
          <Pressable
            style={[styles.generateButton, (!hasApiKey || isLoading) && styles.buttonDisabled]}
            onPress={generateDraft}
            disabled={!hasApiKey || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>
                ✍️ Generate Draft with {CLAUDE_MODEL_LABELS[aiModel]}
              </Text>
            )}
          </Pressable>
        )}

        {!hasApiKey && !draftedComment && (
          <Text style={styles.noKeyHint}>
            Add your Claude API key in Settings first
          </Text>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>{error}</Text>
          </View>
        )}

        {wasAutoDowngraded && (
          <View style={styles.downgradeBadge}>
            <Text style={styles.downgradeBadgeText}>
              Budget mode: request auto-downgraded to Sonnet.
            </Text>
          </View>
        )}

        {draftedComment !== '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drafted Comment</Text>
            <View style={styles.draftCard}>
              <TextInput
                style={styles.draftInput}
                value={draftedComment}
                onChangeText={setDraftedComment}
                multiline
                scrollEnabled={false}
              />
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.actionButton} onPress={copyToClipboard}>
                <Text style={styles.actionButtonText}>
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => refineDraft('Make this more concise')}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>✂️ Shorter</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => refineDraft('Make this more detailed with a code suggestion')}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>📝 More detail</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => refineDraft('Make the tone softer and more encouraging')}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>🤝 Softer tone</Text>
              </Pressable>
              {decodedSessionId && (
                <Pressable style={styles.actionButton} onPress={saveDraftToSession}>
                  <Text style={styles.actionButtonText}>💾 Save to session</Text>
                </Pressable>
              )}
            </View>

            {isLoading && (
              <View style={styles.refiningRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.refiningText}>Refining...</Text>
              </View>
            )}

            <Pressable
              style={styles.regenerateButton}
              onPress={generateDraft}
              disabled={isLoading}
            >
              <Text style={styles.regenerateButtonText}>
                🔄 Regenerate from scratch
              </Text>
            </Pressable>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Rendered preview</Text>
              <Markdown style={markdownStyles}>{draftedComment}</Markdown>
            </View>

            {showFeedback && (
              <CalibrationFeedback
                draftText={draftedComment}
                itemId={itemId}
                feature="comment-drafter"
                model={aiModel}
                sessionId={decodedSessionId}
                onDismiss={() => setShowFeedback(false)}
              />
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollView: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },

  itemCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  itemLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  itemText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  stackLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  contextInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },

  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  noKeyHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  errorCard: {
    backgroundColor: colors.error + '20',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.xl,
  },
  errorCardText: {
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  downgradeBadge: {
    backgroundColor: `${colors.warning}22`,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.warning}66`,
    marginBottom: spacing.md,
  },
  downgradeBadgeText: {
    fontSize: fontSizes.xs,
    color: colors.warning,
    fontWeight: '600',
  },

  draftCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  draftInput: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    lineHeight: 22,
    padding: spacing.lg,
    textAlignVertical: 'top',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  refiningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  refiningText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  regenerateButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.md,
  },
  regenerateButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  previewCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
  },
  previewTitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

const markdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    lineHeight: 22,
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
