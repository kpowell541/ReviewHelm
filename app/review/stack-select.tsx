import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { STACKS } from '../../src/data/checklistRegistry';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function StackSelectScreen() {
  const router = useRouter();
  const getSectionAverages = useConfidenceStore((s) => s.getSectionAverages);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Choose a tech stack</Text>
      <Text style={styles.subtitle}>
        Select the stack that matches the PR you're reviewing
      </Text>

      {STACKS.map((stack) => {
        const averages = getSectionAverages(stack.id);
        const overallAvg =
          averages.length > 0
            ? averages.reduce((s, a) => s + a.average, 0) /
              averages.length
            : null;

        return (
          <Pressable
            key={stack.id}
            onPress={() =>
              router.push(`/review/sessions?stack=${stack.id}`)
            }
            style={({ pressed }) => [
              styles.stackCard,
              { borderLeftColor: stack.color, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.stackIcon}>{stack.icon}</Text>
            <View style={styles.stackInfo}>
              <Text style={styles.stackTitle}>{stack.title}</Text>
              <Text style={styles.stackDescription}>
                {stack.description}
              </Text>
            </View>
            {overallAvg !== null && (
              <View style={styles.avgBadge}>
                <Text style={styles.avgText}>
                  {overallAvg.toFixed(1)}/5
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  stackCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackIcon: { fontSize: 32, marginRight: spacing.md },
  stackInfo: { flex: 1 },
  stackTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stackDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  avgBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  avgText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
