import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, radius } from '../theme';

interface BottomActionBarProps {
  label: string;
  onPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

export function BottomActionBar({
  label,
  onPress,
  secondaryLabel,
  onSecondaryPress,
}: BottomActionBarProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.primaryButton,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.primaryLabel}>{label}</Text>
      </Pressable>
      {secondaryLabel && onSecondaryPress && (
        <Pressable
          onPress={onSecondaryPress}
          style={styles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
        >
          <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fontSizes.md,
  },
  secondaryButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
