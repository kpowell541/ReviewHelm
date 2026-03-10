import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { EmptyState } from '../src/components/EmptyState';
import { useRouter } from 'expo-router';
import { useBookmarkStore } from '../src/store/useBookmarkStore';
import { findItemById } from '../src/data/checklistFinder';
import { colors, spacing, fontSizes } from '../src/theme';
import { ChecklistItemCard } from '../src/components/ChecklistItemCard';
import { groupByField } from '../src/utils/groupBy';

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarkedIds = useBookmarkStore((s) => s.bookmarkedIds);
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);

  const items = bookmarkedIds
    .map((id) => ({ id, found: findItemById(id) }))
    .filter((entry) => entry.found !== null);

  const groups = groupByField(items, (entry) => entry.found!.stackTitle);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Bookmarks</Text>

      {items.length === 0 && (
        <EmptyState message="No bookmarks yet. Bookmark items from any checklist to save them here." />
      )}

      {groups.map(([stackTitle, entries]) => (
        <View key={stackTitle} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {stackTitle} ({entries.length})
          </Text>
          {entries.map(({ id, found }) => (
            <ChecklistItemCard
              key={id}
              text={found!.item.text}
              sectionTitle={found!.sectionTitle}
              severity={found!.item.severity}
              onPress={() =>
                router.push(`/deep-dive/${encodeURIComponent(id)}`)
              }
              onRemove={() => toggleBookmark(id)}
            />
          ))}
        </View>
      ))}
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
  section: { marginBottom: spacing['2xl'] },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
