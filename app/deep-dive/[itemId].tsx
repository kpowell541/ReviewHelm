import { useState, useRef, useMemo, useCallback } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { findItemById } from '../../src/data/checklistFinder';
import { useBookmarkStore } from '../../src/store/useBookmarkStore';
import { usePreferencesStore } from '../../src/store/usePreferencesStore';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { useTutorStore } from '../../src/store/useTutorStore';
import { useUsageStore } from '../../src/store/useUsageStore';
import { sendTutorMessage, AiClientError } from '../../src/ai';
import type {
  TutorMessage,
  TutorRole,
  ConfidenceLevel,
  BaseContent,
} from '../../src/data/types';
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_EMOJI,
  CLAUDE_MODEL_LABELS,
} from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

type Tab = 'content' | 'tutor';

const QUICK_ACTIONS: { role: TutorRole; label: string; icon: string }[] = [
  { role: 'concept-explainer', label: 'Explain this', icon: '💡' },
  { role: 'comment-drafter', label: 'Draft a comment', icon: '✍️' },
  { role: 'exercise-generator', label: 'Give me an exercise', icon: '🏋️' },
  { role: 'anti-bias-challenger', label: 'Challenge my thinking', icon: '🤔' },
];

export default function DeepDiveScreen() {
  const { itemId: rawItemId, sessionId } = useLocalSearchParams<{
    itemId: string;
    sessionId?: string;
  }>();
  const itemId = decodeURIComponent(rawItemId);
  const decodedSessionId = sessionId ? decodeURIComponent(sessionId) : undefined;

  const found = useMemo(() => findItemById(itemId), [itemId]);
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked(itemId));
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);
  const history = useConfidenceStore((s) => s.getItemHistory(itemId));
  const hasApiKey = usePreferencesStore((s) => s.hasApiKey);
  const resolveApiKey = usePreferencesStore((s) => s.resolveApiKey);
  const aiModel = usePreferencesStore((s) => s.aiModel);
  const recordUsage = useUsageStore((s) => s.recordUsage);
  const persistedMessages = useTutorStore(
    (s) => s.conversations[itemId]?.messages ?? [],
  );
  const setConversationMessages = useTutorStore((s) => s.setMessages);
  const clearConversation = useTutorStore((s) => s.clearConversation);

  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<TutorRole>('qa');
  const [wasAutoDowngraded, setWasAutoDowngraded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const confidence: ConfidenceLevel = history?.currentConfidence ?? 3;

  const sendMessage = useCallback(
    async (text: string, role: TutorRole) => {
      if (!found || !text.trim()) return;

      const userMsg: TutorMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...persistedMessages, userMsg];
      setConversationMessages(itemId, updatedMessages);
      setInputText('');
      setError(null);
      setIsLoading(true);

      try {
        const apiKey = await resolveApiKey();
        const response = await sendTutorMessage({
          apiKey,
          model: aiModel,
          role,
          itemText: found.item.text,
          stackLabel: found.stackTitle,
          confidence,
          messages: updatedMessages,
        });

        const assistantMsg: TutorMessage = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
        };
        setConversationMessages(itemId, [
          ...updatedMessages,
          assistantMsg,
        ]);
        if (!response.cached) {
          recordUsage(response.resolvedModel, response.inputTokens, response.outputTokens, {
            feature: 'deep-dive',
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
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [
      found,
      persistedMessages,
      aiModel,
      confidence,
      itemId,
      setConversationMessages,
      recordUsage,
      resolveApiKey,
      decodedSessionId,
    ],
  );

  const handleQuickAction = useCallback(
    (role: TutorRole) => {
      setActiveRole(role);
      setActiveTab('tutor');
      const prompt =
        role === 'concept-explainer'
          ? `Explain this checklist item to me: "${found?.item.text}"`
          : role === 'comment-drafter'
            ? `Help me draft a review comment for this issue: "${found?.item.text}"`
            : role === 'exercise-generator'
              ? `Create a practice exercise for: "${found?.item.text}"`
              : `Challenge my thinking on: "${found?.item.text}"`;
      sendMessage(prompt, role);
    },
    [found, sendMessage],
  );

  if (!found) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Item not found</Text>
        <Text style={styles.errorSubtext}>{itemId}</Text>
      </View>
    );
  }

  const { item, stackTitle, sectionTitle } = found;
  const hasBaseContent = item.baseContent.whatItMeans !== '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Item Header */}
      <View style={styles.header}>
        <View style={styles.headerMeta}>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(item.severity) + '20' },
            ]}
          >
            <Text
              style={[
                styles.severityText,
                { color: getSeverityColor(item.severity) },
              ]}
            >
              {item.severity.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.stackLabel}>
            {stackTitle} · {sectionTitle}
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              toggleBookmark(itemId);
            }}
            hitSlop={8}
            style={styles.bookmarkButton}
          >
            <Text style={styles.bookmarkIcon}>{isBookmarked ? '★' : '☆'}</Text>
          </Pressable>
        </View>
        <Text style={styles.itemText}>{item.text}</Text>
        {history && (
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceText}>
              Your confidence: {CONFIDENCE_EMOJI[confidence]}{' '}
              {CONFIDENCE_LABELS[confidence]} ({confidence}/5)
            </Text>
          </View>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'content' && styles.tabActive]}
          onPress={() => setActiveTab('content')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'content' && styles.tabTextActive,
            ]}
          >
            📖 Content
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'tutor' && styles.tabActive]}
          onPress={() => setActiveTab('tutor')}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'tutor' && styles.tabTextActive,
              ]}
            >
              🎓 AI Tutor
            </Text>
            {persistedMessages.length > 0 && activeTab !== 'tutor' && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>
                  {persistedMessages.length}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {activeTab === 'content' ? (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
        >
          {hasBaseContent ? (
            <BaseContentView content={item.baseContent} />
          ) : (
            <View style={styles.emptyContent}>
              <Text style={styles.emptyTitle}>
                Content coming soon
              </Text>
              <Text style={styles.emptySubtext}>
                Base content for this item hasn't been authored yet. Use the AI
                Tutor tab to learn about this topic now.
              </Text>
              <Pressable
                style={styles.askTutorButton}
                onPress={() => handleQuickAction('concept-explainer')}
              >
                <Text style={styles.askTutorButtonText}>
                  💡 Ask the AI Tutor to explain
                </Text>
              </Pressable>
            </View>
          )}

          {/* Quick Actions */}
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.role}
                style={styles.quickActionButton}
                onPress={() => handleQuickAction(action.role)}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* AI Tutor Chat */
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {persistedMessages.length === 0 && (
              <View style={styles.chatEmpty}>
                <Text style={styles.chatEmptyTitle}>
                  🎓 Your AI Tutor
                </Text>
                <Text style={styles.chatEmptySubtext}>
                  Ask anything about "{item.text}" — or use a quick action
                  below.
                </Text>
                <Text style={styles.chatEmptyModel}>
                  Using {CLAUDE_MODEL_LABELS[aiModel]}
                </Text>
                <View style={styles.chatQuickActions}>
                  {QUICK_ACTIONS.map((action) => (
                    <Pressable
                      key={action.role}
                      style={styles.chatQuickActionButton}
                      onPress={() => handleQuickAction(action.role)}
                    >
                      <Text style={styles.chatQuickActionText}>
                        {action.icon} {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {persistedMessages.length > 0 && (
              <Pressable
                style={styles.clearChatButton}
                onPress={() => clearConversation(itemId)}
              >
                <Text style={styles.clearChatButtonText}>Clear saved chat</Text>
              </Pressable>
            )}

            {persistedMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.messageBubble,
                  msg.role === 'user'
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                {msg.role === 'assistant' ? (
                  <Markdown style={markdownStyles}>{msg.content}</Markdown>
                ) : (
                  <Text style={[styles.messageText, styles.userMessageText]}>
                    {msg.content}
                  </Text>
                )}
              </View>
            ))}

            {isLoading && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBubble}>
                <Text style={styles.errorBubbleText}>{error}</Text>
              </View>
            )}

            {wasAutoDowngraded && (
              <View style={styles.downgradeBadge}>
                <Text style={styles.downgradeBadgeText}>
                  Budget mode: request auto-downgraded to Sonnet.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Chat Input */}
          <View style={styles.inputBar}>
            {!hasApiKey ? (
              <Text style={styles.noKeyText}>
                Add your Claude API key in Settings to use the AI tutor
              </Text>
            ) : (
              <>
                <TextInput
                  style={styles.chatInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask a follow-up question..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={2000}
                  editable={!isLoading}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={() => sendMessage(inputText, activeRole)}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Text style={styles.sendButtonText}>↑</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function BaseContentView({ content }: { content: BaseContent }) {
  return (
    <View>
      {content.whatItMeans !== '' && (
        <ContentSection title="What It Means" body={content.whatItMeans} />
      )}
      {content.whyItMatters !== '' && (
        <ContentSection title="Why It Matters" body={content.whyItMatters} />
      )}
      {content.howToVerify !== '' && (
        <ContentSection title="How to Verify" body={content.howToVerify} />
      )}
      {content.exampleComment !== '' && (
        <ContentSection
          title="Example Review Comment"
          body={content.exampleComment}
          isCode
        />
      )}
      {content.codeExamples.length > 0 &&
        content.codeExamples.map((ex, i) => (
          <View key={i} style={sectionStyles.codeExampleBlock}>
            <Text style={sectionStyles.codeExampleTitle}>{ex.title}</Text>
            {ex.bad && (
              <View style={sectionStyles.codeBlock}>
                <Text style={sectionStyles.codeLabel}>❌ Bad</Text>
                <Text style={sectionStyles.codeText}>{ex.bad.code}</Text>
                <Text style={sectionStyles.codeExplanation}>
                  {ex.bad.explanation}
                </Text>
              </View>
            )}
            {ex.good && (
              <View
                style={[sectionStyles.codeBlock, sectionStyles.codeBlockGood]}
              >
                <Text
                  style={[sectionStyles.codeLabel, sectionStyles.codeLabelGood]}
                >
                  ✅ Good
                </Text>
                <Text style={sectionStyles.codeText}>{ex.good.code}</Text>
                <Text style={sectionStyles.codeExplanation}>
                  {ex.good.explanation}
                </Text>
              </View>
            )}
          </View>
        ))}
      {content.keyTakeaway !== '' && (
        <View style={sectionStyles.takeaway}>
          <Text style={sectionStyles.takeawayLabel}>Key Takeaway</Text>
          <Text style={sectionStyles.takeawayText}>
            {content.keyTakeaway}
          </Text>
        </View>
      )}
      {content.references && content.references.length > 0 && (
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>References</Text>
          {content.references.map((ref, i) => (
            <Text key={i} style={sectionStyles.reference}>
              • {ref}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ContentSection({
  title,
  body,
  isCode,
}: {
  title: string;
  body: string;
  isCode?: boolean;
}) {
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>{title}</Text>
      <Text style={isCode ? sectionStyles.codeText : sectionStyles.bodyText}>
        {body}
      </Text>
    </View>
  );
}

function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    blocker: colors.blocker,
    major: colors.major,
    minor: colors.minor,
    nit: colors.nit,
  };
  return map[severity] || colors.textMuted;
}

const sectionStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  codeText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    backgroundColor: colors.codeBg,
    padding: spacing.md,
    borderRadius: radius.sm,
    overflow: 'hidden',
    lineHeight: 20,
  },
  codeExampleBlock: {
    marginBottom: spacing.xl,
  },
  codeExampleTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  codeBlock: {
    backgroundColor: colors.codeBad,
    borderLeftWidth: 3,
    borderLeftColor: colors.codeBadBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  codeBlockGood: {
    backgroundColor: colors.codeGood,
    borderLeftColor: colors.codeGoodBorder,
  },
  codeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.codeBadBorder,
    marginBottom: spacing.xs,
  },
  codeLabelGood: {
    color: colors.codeGoodBorder,
  },
  codeExplanation: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  takeaway: {
    backgroundColor: colors.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  takeawayLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  takeawayText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  reference: {
    fontSize: fontSizes.sm,
    color: colors.info,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  errorSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Header
  header: {
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  severityText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  stackLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    flex: 1,
  },
  bookmarkButton: {
    padding: spacing.xs,
  },
  bookmarkIcon: {
    fontSize: 22,
    color: colors.warning,
  },
  itemText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  confidenceRow: {
    marginTop: spacing.sm,
  },
  confidenceText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Base Content
  contentScroll: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  askTutorButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  askTutorButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },

  // Quick Actions
  quickActionsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionLabel: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },

  // Chat
  chatScroll: { flex: 1 },
  chatContent: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  chatEmpty: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  chatEmptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chatEmptySubtext: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chatEmptyModel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  chatQuickActions: {
    gap: spacing.sm,
    width: '100%',
  },
  chatQuickActionButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatQuickActionText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  clearChatButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearChatButtonText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },

  // Messages
  messageBubble: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: colors.bgCard,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: colors.textPrimary,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignSelf: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  errorBubble: {
    backgroundColor: colors.error + '20',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBubbleText: {
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  downgradeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.warning}22`,
    borderWidth: 1,
    borderColor: `${colors.warning}66`,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  downgradeBadgeText: {
    color: colors.warning,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.bgCard,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  noKeyText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: '700',
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
  bullet_list: {
    marginVertical: 0,
  },
  ordered_list: {
    marginVertical: 0,
  },
};
