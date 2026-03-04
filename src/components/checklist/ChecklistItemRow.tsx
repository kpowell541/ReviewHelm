import { useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type {
  ChecklistItem,
  ItemResponse,
  ConfidenceLevel,
  Verdict,
} from '../../data/types';
import { CONFIDENCE_EMOJI, CONFIDENCE_LABELS } from '../../data/types';
import { colors, spacing, fontSizes, radius } from '../../theme';

const SEVERITY_COLORS: Record<string, string> = {
  blocker: colors.blocker,
  major: colors.major,
  minor: colors.minor,
  nit: colors.nit,
};

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

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  1: colors.confidence1,
  2: colors.confidence2,
  3: colors.confidence3,
  4: colors.confidence4,
  5: colors.confidence5,
};

interface Props {
  item: ChecklistItem;
  response?: ItemResponse;
  onSetVerdict: (itemId: string, verdict: Verdict) => void;
  onSetConfidence: (itemId: string, confidence: ConfidenceLevel) => void;
  onDeepDive: (itemId: string) => void;
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  response,
  onSetVerdict,
  onSetConfidence,
  onDeepDive,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const currentVerdict = response?.verdict || 'skipped';
  const currentConfidence = response?.confidence || 3;
  const sevColor = SEVERITY_COLORS[item.severity];

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
        <Text style={styles.itemText} numberOfLines={expanded ? undefined : 2}>
          {item.text}
        </Text>
        <Pressable
          onPress={() => onDeepDive(item.id)}
          hitSlop={8}
          style={styles.deepDiveButton}
        >
          <Text style={styles.deepDiveIcon}>📚</Text>
        </Pressable>
      </Pressable>

      {/* Verdict selector */}
      <View style={styles.verdictRow}>
        {VERDICT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onSetVerdict(item.id, opt.value)}
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
              onPress={() => onSetConfidence(item.id, level)}
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
        <View style={styles.attentionHint}>
          <Text style={styles.attentionHintText}>
            ✍️ Found an issue — tap 📚 to draft a comment
          </Text>
        </View>
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
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  deepDiveButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  deepDiveIcon: {
    fontSize: 18,
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
