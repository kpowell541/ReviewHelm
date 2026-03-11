import { useState, memo, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import type {
  ChecklistItem,
  ItemResponse,
  ConfidenceLevel,
  Verdict,
} from '../../data/types';
import { CONFIDENCE_EMOJI, CONFIDENCE_LABELS, SEVERITY_COLORS, CONFIDENCE_COLORS } from '../../data/types';
import { colors, spacing, fontSizes, radius } from '../../theme';

const SEVERITY_SHORT: Record<string, string> = {
  blocker: 'BLK',
  major: 'MAJ',
  minor: 'MIN',
  nit: 'NIT',
};

const VERDICT_OPTIONS: { value: Verdict; label: string; color: string }[] = [
  { value: 'looks-good', label: '✓ Good', color: colors.looksGood },
  { value: 'needs-attention', label: '⚠ Attn', color: colors.needsAttention },
  { value: 'na', label: '— N/A', color: colors.na },
];

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [1, 2, 3, 4, 5];

interface Props {
  item: ChecklistItem;
  response?: ItemResponse;
  textSize: 'small' | 'medium' | 'large';
  onSetVerdict: (itemId: string, verdict: Verdict) => void;
  onSetConfidence: (itemId: string, confidence: ConfidenceLevel) => void;
  onSetNotes: (itemId: string, notes: string) => void;
  onDeepDive: (itemId: string) => void;
  onDraftComment: (itemId: string) => void;
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  response,
  textSize,
  onSetVerdict,
  onSetConfidence,
  onSetNotes,
  onDeepDive,
  onDraftComment,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(response?.notes ?? '');
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked(item.id));
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);
  const currentVerdict = response?.verdict || 'skipped';
  const currentConfidence = response?.confidence || 3;
  const sevColor = SEVERITY_COLORS[item.severity];
  const hasNotes = notesDraft.trim().length > 0;

  const itemTextSize = useMemo(() => {
    if (textSize === 'small') return { fontSize: fontSizes.sm, lineHeight: 20 };
    if (textSize === 'large') return { fontSize: fontSizes.lg, lineHeight: 24 };
    return { fontSize: fontSizes.md, lineHeight: 22 };
  }, [textSize]);

  useEffect(() => {
    setNotesDraft(response?.notes ?? '');
  }, [response?.notes]);

  const handleSetVerdict = (verdict: Verdict) => {
    void Haptics.selectionAsync();
    onSetVerdict(item.id, verdict);
  };

  const handleSetConfidence = (confidence: ConfidenceLevel) => {
    void Haptics.selectionAsync();
    onSetConfidence(item.id, confidence);
  };

  const handleShare = async () => {
    const text = `[${item.severity.toUpperCase()}] ${item.text}`;
    const file = new FileSystem.File(FileSystem.Paths.cache, 'checklist-item.txt');
    file.write(text);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: 'Share Checklist Item',
    });
  };

  return (
    <View style={styles.container}>
      {/* Item text + severity badge */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.textRow}
      >
        <View style={[styles.severityBadge, { backgroundColor: sevColor + '20' }]}>
          <Text style={[styles.severityText, { color: sevColor }]}>
            {SEVERITY_SHORT[item.severity]}
          </Text>
        </View>
        <Text
          style={[styles.itemText, itemTextSize]}
          numberOfLines={expanded ? undefined : 2}
        >
          {item.text}
        </Text>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            toggleBookmark(item.id);
          }}
          hitSlop={8}
          style={styles.deepDiveButton}
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          accessibilityRole="button"
        >
          <Text style={styles.deepDiveIcon}>{isBookmarked ? '★' : '☆'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleShare()}
          hitSlop={8}
          style={styles.deepDiveButton}
          accessibilityLabel="Share item"
          accessibilityRole="button"
        >
          <Text style={styles.deepDiveIcon}>↗</Text>
        </Pressable>
        <Pressable
          onPress={() => onDeepDive(item.id)}
          hitSlop={8}
          style={styles.deepDiveButton}
          accessibilityLabel="Deep dive"
          accessibilityRole="button"
        >
          <Text style={styles.deepDiveIcon}>📚</Text>
        </Pressable>
      </Pressable>

      {/* Verdict selector */}
      <View style={styles.verdictRow}>
        {VERDICT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => handleSetVerdict(opt.value)}
            style={[
              styles.verdictButton,
              currentVerdict === opt.value && {
                backgroundColor: opt.color + '25',
                borderColor: opt.color,
              },
            ]}
          >
            <Text
              style={[
                styles.verdictText,
                currentVerdict === opt.value && { color: opt.color },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Confidence scale */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confidence:</Text>
        <View style={styles.confidenceButtons}>
          {CONFIDENCE_LEVELS.map((level) => (
            <Pressable
              key={level}
              onPress={() => handleSetConfidence(level)}
              style={[
                styles.confidenceButton,
                currentConfidence === level && {
                  backgroundColor: CONFIDENCE_COLORS[level] + '25',
                  borderColor: CONFIDENCE_COLORS[level],
                },
              ]}
            >
              <Text style={styles.confidenceEmoji}>
                {CONFIDENCE_EMOJI[level]}
              </Text>
              <Text
                style={[
                  styles.confidenceNumber,
                  currentConfidence === level && {
                    color: CONFIDENCE_COLORS[level],
                  },
                ]}
              >
                {level}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Confidence hint text */}
      <Text style={styles.confidenceHint}>
        {CONFIDENCE_LABELS[currentConfidence]}
      </Text>

      <Pressable
        onPress={() => setNotesExpanded((prev) => !prev)}
        style={styles.notesToggle}
      >
        <Text style={styles.notesToggleText}>
          {hasNotes ? '📝 Notes (saved)' : '📝 Add per-item notes'}
        </Text>
      </Pressable>

      {notesExpanded && (
        <TextInput
          style={styles.notesInput}
          value={notesDraft}
          onChangeText={setNotesDraft}
          onBlur={() => onSetNotes(item.id, notesDraft)}
          placeholder="Capture specifics for this checklist item..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      )}

      {/* AI tutor nudge for low confidence */}
      {currentConfidence <= 2 && (
        <Pressable
          onPress={() => onDeepDive(item.id)}
          style={styles.tutorNudge}
        >
          <Text style={styles.tutorNudgeText}>
            {currentConfidence === 1
              ? '🎓 Let me teach you this from scratch'
              : '🎓 Want a refresher on this concept?'}
          </Text>
        </Pressable>
      )}

      {/* Comment draft nudge for needs-attention */}
      {currentVerdict === 'needs-attention' && (
        <Pressable
          onPress={() => onDraftComment(item.id)}
          style={styles.attentionHint}
        >
          <Text style={styles.attentionHintText}>
            ✍️ Found an issue — tap to draft a comment
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  severityText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  itemText: {
    flex: 1,
    color: colors.textPrimary,
  },
  deepDiveButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  deepDiveIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  verdictRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  verdictButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  verdictText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confidenceLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  confidenceButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confidenceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confidenceEmoji: {
    fontSize: 14,
  },
  confidenceNumber: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  confidenceHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  notesToggle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  notesToggleText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  notesInput: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    minHeight: 76,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  tutorNudge: {
    backgroundColor: colors.learnMode + '15',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  tutorNudgeText: {
    fontSize: fontSizes.sm,
    color: colors.learnMode,
  },
  attentionHint: {
    backgroundColor: colors.needsAttention + '15',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  attentionHintText: {
    fontSize: fontSizes.sm,
    color: colors.needsAttention,
  },
});
