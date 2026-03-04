import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../../src/theme';

export default function LearnStackSelectScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.placeholder}>
        Learning paths and AI-powered exercises will be built in a later phase.
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
    marginBottom: spacing.lg,
  },
  placeholder: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
