import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, radius } from '../theme';
import { Severity } from '../data/types';

const SEVERITY_COLORS: Record<Severity, string> = {
  blocker: colors.blocker,
  major: colors.major,
  minor: colors.minor,
  nit: colors.nit,
};

interface ChecklistItemCardProps {
  text: string;
  sectionTitle: string;
  severity: Severity;
  onPress: () => void;
  onRemove?: () => void;
}

export function ChecklistItemCard({
  text,
  sectionTitle,
  severity,
  onPress,
  onRemove,
}: ChecklistItemCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.severityDot,
            { backgroundColor: SEVERITY_COLORS[severity] },
          ]}
        />
        <View style={styles.textArea}>
          <Text style={styles.itemText} numberOfLines={2}>
            {text}
          </Text>
          <Text style={styles.meta}>
            {sectionTitle} · {severity}
          </Text>
        </View>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={12}>
            <Text style={styles.removeText}>-</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  textArea: {
    flex: 1,
  },
  itemText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeText: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
});
