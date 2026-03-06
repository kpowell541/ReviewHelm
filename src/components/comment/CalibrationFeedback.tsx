import { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import type { ClaudeModel } from '../../data/types';
import { colors, spacing, fontSizes, radius } from '../../theme';

type FeedbackOutcome = 'accepted' | 'edited' | 'rejected';

interface CalibrationFeedbackProps {
  draftText: string;
  itemId: string;
  feature: string;
  model: ClaudeModel;
  sessionId?: string;
  onDismiss: () => void;
}

export function CalibrationFeedback({
  draftText,
  itemId,
  feature,
  model,
  sessionId,
  onDismiss,
}: CalibrationFeedbackProps) {
  const user = useAuthStore((s) => s.user);
  const [outcome, setOutcome] = useState<FeedbackOutcome | null>(null);
  const [editedText, setEditedText] = useState(draftText);
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = useCallback(
    async (selectedOutcome: FeedbackOutcome) => {
      if (!user) {
        onDismiss();
        return;
      }

      const finalText =
        selectedOutcome === 'edited' ? editedText : undefined;

      try {
        await api.post('/calibration/feedback', {
          itemId,
          feature,
          model,
          sessionId,
          draftText,
          finalText,
          outcome: selectedOutcome,
        });
      } catch {
        // Silently fail — feedback is best-effort
      }
      setSubmitted(true);
    },
    [user, editedText, itemId, feature, model, sessionId, draftText, onDismiss],
  );

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.thankYou}>Thanks for your feedback!</Text>
        <Pressable style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    );
  }

  if (outcome === 'edited') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Edit the comment, then submit:</Text>
        <TextInput
          style={styles.editInput}
          value={editedText}
          onChangeText={setEditedText}
          multiline
        />
        <View style={styles.row}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => setOutcome(null)}
          >
            <Text style={styles.cancelText}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.submitButton}
            onPress={() => submitFeedback('edited')}
          >
            <Text style={styles.submitText}>Submit Edited</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How was this draft?</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.feedbackButton, styles.acceptButton]}
          onPress={() => submitFeedback('accepted')}
        >
          <Text style={styles.feedbackText}>Accepted</Text>
        </Pressable>
        <Pressable
          style={[styles.feedbackButton, styles.editButton]}
          onPress={() => setOutcome('edited')}
        >
          <Text style={styles.feedbackText}>Edited</Text>
        </Pressable>
        <Pressable
          style={[styles.feedbackButton, styles.rejectButton]}
          onPress={() => submitFeedback('rejected')}
        >
          <Text style={styles.feedbackText}>Rejected</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  acceptButton: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  editButton: {
    borderColor: colors.warning,
    backgroundColor: `${colors.warning}15`,
  },
  rejectButton: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}15`,
  },
  feedbackText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  submitText: {
    fontSize: fontSizes.sm,
    color: '#fff',
    fontWeight: '600',
  },
  thankYou: {
    fontSize: fontSizes.md,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dismissButton: {
    alignItems: 'center',
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});
