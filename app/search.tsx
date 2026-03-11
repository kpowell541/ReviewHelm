import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAllReviewChecklists } from '../src/data/checklistLoader';
import { getSectionItems } from '../src/data/types';
import type { ChecklistItem } from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { EmptyState } from '../src/components/EmptyState';
import { ChecklistItemCard } from '../src/components/ChecklistItemCard';
import { groupByField } from '../src/utils/groupBy';
import { AppFooter } from '../src/components/AppFooter';

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
  const grouped = useMemo(() => groupByField(filtered, (r) => r.stackTitle), [filtered]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">Search Checklists</Text>

      <TextInput
        style={styles.input}
        placeholder="Search items, tags, IDs..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoFocus
        returnKeyType="search"
        accessibilityLabel="Search checklist items"
      />

      {query.trim().length >= 2 && (
        <Text
          style={styles.resultCount}
          accessibilityRole="summary"
          accessibilityLiveRegion="polite"
        >
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {filtered.length === 50 ? ' (showing first 50)' : ''}
        </Text>
      )}

      {query.trim().length < 2 && query.length > 0 && (
        <Text style={styles.hint}>Type at least 2 characters to search</Text>
      )}

      {grouped.map(([stackTitle, results]) => (
        <View key={stackTitle} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {stackTitle} ({results.length})
          </Text>
          {results.map((r) => (
            <ChecklistItemCard
              key={r.item.id}
              text={r.item.text}
              sectionTitle={r.sectionTitle}
              severity={r.item.severity}
              onPress={() => router.push(`/deep-dive/${encodeURIComponent(r.item.id)}`)}
            />
          ))}
        </View>
      ))}

      {query.trim().length >= 2 && filtered.length === 0 && (
        <EmptyState message={`No items match "${query}". Try different keywords.`} />
      )}
      <AppFooter />
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
});
