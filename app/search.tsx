import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAllReviewChecklists } from '../src/data/checklistLoader';
import { getSectionItems } from '../src/data/types';
import type { ChecklistItem, Severity } from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';

const SEVERITY_COLORS: Record<Severity, string> = {
  blocker: colors.blocker,
  major: colors.major,
  minor: colors.minor,
  nit: colors.nit,
};

interface SearchResult {
  item: ChecklistItem;
  stackId: string;
  stackTitle: string;
  sectionTitle: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const allItems = useMemo(() => {
    const results: SearchResult[] = [];
    for (const checklist of getAllReviewChecklists()) {
      for (const section of checklist.sections) {
        for (const item of getSectionItems(section)) {
          results.push({
            item,
            stackId: checklist.meta.id,
            stackTitle: checklist.meta.shortTitle,
            sectionTitle: section.title,
          });
        }
      }
    }
    return results;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return allItems
      .filter(
        (r) =>
          r.item.text.toLowerCase().includes(q) ||
          r.item.id.toLowerCase().includes(q) ||
          r.item.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 50);
  }, [query, allItems]);

  // Group results by stack
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of filtered) {
      if (!groups[r.stackTitle]) groups[r.stackTitle] = [];
      groups[r.stackTitle].push(r);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Search Checklists</Text>

      <TextInput
        style={styles.input}
        placeholder="Search items, tags, IDs..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoFocus
        returnKeyType="search"
      />

      {query.trim().length >= 2 && (
        <Text style={styles.resultCount}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {filtered.length === 50 ? ' (showing first 50)' : ''}
        </Text>
      )}

      {query.trim().length < 2 && query.length > 0 && (
        <Text style={styles.hint}>Type at least 2 characters to search</Text>
      )}

      {grouped.map(([stackTitle, results]) => (
        <View key={stackTitle} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {stackTitle} ({results.length})
          </Text>
          {results.map((r) => (
            <Pressable
              key={r.item.id}
              style={({ pressed }) => [
                styles.card,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() =>
                router.push(
                  `/deep-dive/${encodeURIComponent(r.item.id)}`,
                )
              }
            >
              <View
                style={[
                  styles.severityDot,
                  { backgroundColor: SEVERITY_COLORS[r.item.severity] },
                ]}
              />
              <View style={styles.cardText}>
                <Text style={styles.itemText} numberOfLines={2}>
                  {r.item.text}
                </Text>
                <Text style={styles.meta}>
                  {r.sectionTitle} · {r.item.severity}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}

      {query.trim().length >= 2 && filtered.length === 0 && (
        <Text style={styles.empty}>
          No items match "{query}". Try different keywords.
        </Text>
      )}
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
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  resultCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
});
