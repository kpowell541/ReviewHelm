import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ModalShell } from './ModalShell';
import { colors, spacing, fontSizes, radius } from '../theme';
import { PR_SIZE_LABELS } from '../data/types';
import type { TrackedPR, Session } from '../data/types';

interface PRPickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  prs: TrackedPR[];
  onSelectPR: (pr: TrackedPR) => void;
  onSkip: () => void;
  onShowAddPR: () => void;
  /** Label for the skip button (default: "Skip — no PR") */
  skipLabel?: string;
  /** Label for the add PR button (default: "+ Add a PR") */
  addLabel?: string;
  /** Accent color for the add button and size badge (default: colors.primary) */
  accentColor?: string;
  /** All sessions, used to show "Active session" indicator */
  sessions?: Record<string, Session>;
}

export function PRPickerModal({
  visible,
  onClose,
  title,
  prs,
  onSelectPR,
  onSkip,
  onShowAddPR,
  skipLabel = 'Skip — no PR',
  addLabel = '+ Add a PR',
  accentColor,
  sessions,
}: PRPickerModalProps) {
  const accent = accentColor ?? colors.primary;

  const hasActiveSession = (prId: string) => {
    if (!sessions) return false;
    return Object.values(sessions).some((s) => s.linkedPRId === prId && !s.isComplete);
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title={title}>
      {prs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tracked PRs yet.
          </Text>
          <Pressable
            onPress={() => { onClose(); onShowAddPR(); }}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.addButtonText}>{addLabel}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {prs.map((pr) => {
            const subtitle = [
              pr.repo,
              pr.prNumber ? `#${pr.prNumber}` : null,
              pr.prAuthor && pr.prAuthor !== 'Me' ? `by @${pr.prAuthor}` : null,
            ]
              .filter(Boolean)
              .join(' ');
            const active = hasActiveSession(pr.id);
            return (
              <Pressable
                key={pr.id}
                onPress={() => onSelectPR(pr)}
                style={({ pressed }) => [
                  styles.card,
                  active && styles.cardActive,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {pr.title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                  {active && (
                    <Text style={styles.activeLabel}>In-progress session</Text>
                  )}
                </View>
                {pr.size && (
                  <Text
                    style={[
                      styles.sizeBadge,
                      {
                        backgroundColor: accent + '25',
                        color: accent,
                      },
                    ]}
                  >
                    {PR_SIZE_LABELS[pr.size]}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.buttons}>
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>{skipLabel}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 300 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  addButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  addButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.warning,
  },
  cardInfo: { flex: 1 },
  activeLabel: {
    fontSize: fontSizes.xs,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 2,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  sizeBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginLeft: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
