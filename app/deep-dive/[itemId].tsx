import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSizes } from '../../src/theme';

export default function DeepDiveScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Deep Dive</Text>
      <Text style={styles.itemId}>{decodeURIComponent(itemId)}</Text>
      <Text style={styles.placeholder}>
        AI Tutor and deep dive content will be built in the next phase.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemId: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
  },
  placeholder: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
