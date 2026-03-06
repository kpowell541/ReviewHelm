import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useBookmarkStore } from '../src/store/useBookmarkStore';
import { findItemById } from '../src/data/checklistFinder';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import type { Severity } from '../src/data/types';

const SEVERITY_COLORS: Record<Severity, string> = {
  blocker: colors.blocker,
  major: colors.major,
  minor: colors.minor,
  nit: colors.nit,
};

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarkedIds = useBookmarkStore((s) => s.bookmarkedIds);
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);

  const items = bookmarkedIds
    .map((id) => ({ id, found: findItemById(id) }))
    .filter((entry) => entry.found !== null);

  // Group by stack
  const grouped: Record<string, typeof items> = {};
  for (const entry of items) {
    const stack = entry.found!.stackTitle;
    if (!grouped[stack]) grouped[stack] = [];
    grouped[stack].push(entry);
  }
  const groups = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Bookmarks</Text>

      {items.length === 0 && (
        <Text style={styles.empty}>
          No bookmarks yet. Bookmark items from any checklist to save them here.
        </Text>
      )}

      {groups.map(([stackTitle, entries]) => (
        <View key={stackTitle} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {stackTitle} ({entries.length})
          </Text>
          {entries.map(({ id, found }) => (
            <Pressable
              key={id}
              style={({ pressed }) => [
                styles.card,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() =>
                router.push(`/deep-dive/${encodeURIComponent(id)}`)
              }
            >
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.severityDot,
                    {
                      backgroundColor:
                        SEVERITY_COLORS[found!.item.severity],
                    },
                  ]}
                />
                <View style={styles.cardText}>
                  <Text style={styles.itemText} numberOfLines={2}>
                    {found!.item.text}
                  </Text>
                  <Text style={styles.meta}>
                    {found!.sectionTitle} · {found!.item.severity}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleBookmark(id)}
                  hitSlop={12}
                >
                  <Text style={styles.removeIcon}>-</Text>
                </Pressable>
              </View>
            </Pressable>
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
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
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
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  cardText: { flex: 1 },
  itemText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeIcon: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
});
