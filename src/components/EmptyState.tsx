import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../theme';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
});
