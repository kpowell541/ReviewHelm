import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { STACKS } from '../../src/data/checklistRegistry';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { StackLogo } from '../../src/components/StackLogo';

export default function LearnStackSelectScreen() {
  const router = useRouter();
  const getWeakestItems = useConfidenceStore((s) => s.getWeakestItems);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Choose a stack to study your weak areas
      </Text>

      {STACKS.map((stack) => {
        const gaps = getWeakestItems(100, stack.id).filter(
          (w) => w.currentConfidence <= 2,
        );
        const improving = getWeakestItems(100, stack.id).filter(
          (w) => w.currentConfidence === 3 && w.trend === 'improving',
        );

        return (
          <Pressable
            key={stack.id}
            style={({ pressed }) => [
              styles.stackCard,
              { borderLeftColor: stack.color, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() =>
              router.push(`/learn/${stack.id}`)
            }
            accessibilityRole="link"
            accessibilityLabel={`${stack.title}: ${stack.description}${gaps.length > 0 ? `, ${gaps.length} gap${gaps.length !== 1 ? 's' : ''}` : ''}`}
            accessibilityHint="Opens learning session for this stack"
          >
            <StackLogo stackId={stack.id} fallbackIcon={stack.icon} size={32} style={{ marginRight: spacing.md }} />
            <View style={styles.stackInfo}>
              <Text style={styles.stackTitle}>{stack.title}</Text>
              <Text style={styles.stackDescription}>{stack.description}</Text>
              {gaps.length > 0 ? (
                <View style={styles.badges}>
                  <View
                    style={[styles.badge, { backgroundColor: colors.error + '20' }]}
                  >
                    <Text style={[styles.badgeText, { color: colors.error }]}>
                      {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {improving.length > 0 && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.success + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: colors.success }]}
                      >
                        {improving.length} improving
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.noGaps}>
                  No gaps yet — complete a review session first
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}

      {/* All stacks combined option */}
      <Pressable
        style={({ pressed }) => [
          styles.stackCard,
          { borderLeftColor: colors.learnMode, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => router.push('/learn/all')}
        accessibilityRole="link"
        accessibilityLabel="All Stacks: Study your weakest areas across all tech stacks"
        accessibilityHint="Opens learning session for all stacks combined"
      >
        <Text style={styles.stackIcon}>📚</Text>
        <View style={styles.stackInfo}>
          <Text style={styles.stackTitle}>All Stacks</Text>
          <Text style={styles.stackDescription}>
            Study your weakest areas across all tech stacks
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  heading: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  stackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  stackIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  stackInfo: {
    flex: 1,
  },
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
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  noGaps: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
