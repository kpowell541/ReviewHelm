import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../../store/useSessionStore';
import { useConfidenceStore } from '../../store/useConfidenceStore';
import { getChecklist, getPolishChecklist } from '../../data/checklistLoader';
import {
  getAllChecklistItems,
  getSectionItems,
} from '../../data/types';
import type {
  ChecklistItem,
  ChecklistSection,
  ConfidenceLevel,
  Verdict,
  Severity,
} from '../../data/types';
import { computeSessionScores } from '../../utils/scoring';
import { colors, spacing, fontSizes, radius } from '../../theme';
import { ChecklistItemRow } from './ChecklistItemRow';

interface Props {
  sessionId: string;
}

export function ChecklistScreen({ sessionId }: Props) {
  const router = useRouter();
  const session = useSessionStore((s) => s.getSession(sessionId));
  const setItemResponse = useSessionStore((s) => s.setItemResponse);
  const completeSession = useSessionStore((s) => s.completeSession);
  const recordSessionResults = useConfidenceStore(
    (s) => s.recordSessionResults
  );

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const checklist = useMemo(() => {
    if (!session) return null;
    if (session.mode === 'polish') return getPolishChecklist();
    if (session.stackId) return getChecklist(session.stackId);
    return null;
  }, [session]);

  const allItems = useMemo(
    () => (checklist ? getAllChecklistItems(checklist) : []),
    [checklist]
  );

  const scores = useMemo(() => {
    if (!session) return null;
    return computeSessionScores(session, allItems);
  }, [session, allItems]);

  const sections = useMemo(() => {
    if (!checklist) return [];
    return checklist.sections.map((section) => ({
      section,
      data: collapsedSections[section.id]
        ? []
        : getSectionItems(section),
    }));
  }, [checklist, collapsedSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const handleSetVerdict = useCallback(
    (itemId: string, verdict: Verdict) => {
      setItemResponse(sessionId, itemId, { verdict });
    },
    [sessionId, setItemResponse]
  );

  const handleSetConfidence = useCallback(
    (itemId: string, confidence: ConfidenceLevel) => {
      setItemResponse(sessionId, itemId, { confidence });
    },
    [sessionId, setItemResponse]
  );

  const handleComplete = useCallback(() => {
    if (!session || !checklist) return;

    // Build severity map for confidence store
    const itemSeverities: Record<
      string,
      { severity: Severity; sectionId: string }
    > = {};
    for (const section of checklist.sections) {
      for (const item of getSectionItems(section)) {
        itemSeverities[item.id] = {
          severity: item.severity,
          sectionId: section.id,
        };
      }
    }

    completeSession(sessionId);
    recordSessionResults(
      { ...session, isComplete: true },
      itemSeverities
    );
    router.replace(`/session-summary/${sessionId}`);
  }, [
    session,
    checklist,
    sessionId,
    completeSession,
    recordSessionResults,
    router,
  ]);

  if (!session || !checklist || !scores) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const getSectionProgress = (section: ChecklistSection) => {
    const items = getSectionItems(section);
    const responded = items.filter(
      (item) =>
        session.itemResponses[item.id] &&
        session.itemResponses[item.id].verdict !== 'skipped'
    ).length;
    return { responded, total: items.length };
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {checklist.meta.title}
        </Text>
        <View style={styles.scoreRow}>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>Coverage</Text>
            <Text style={styles.scoreValue}>{scores.coverage}%</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>Confidence</Text>
            <Text style={styles.scoreValue}>{scores.confidence}%</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>Issues</Text>
            <Text style={styles.scoreValue}>{scores.totalIssues}</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${scores.coverage}%` },
            ]}
          />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section: { section } }) => {
          const progress = getSectionProgress(section);
          const isCollapsed = collapsedSections[section.id];
          return (
            <Pressable
              onPress={() => toggleSection(section.id)}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionChevron}>
                {isCollapsed ? '▶' : '▼'}
              </Text>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {section.title}
              </Text>
              <Text style={styles.sectionCount}>
                {progress.responded}/{progress.total}
              </Text>
            </Pressable>
          );
        }}
        renderItem={({ item }) => (
          <ChecklistItemRow
            item={item}
            response={session.itemResponses[item.id]}
            onSetVerdict={handleSetVerdict}
            onSetConfidence={handleSetConfidence}
            onDeepDive={(itemId) =>
              router.push(`/deep-dive/${encodeURIComponent(itemId)}`)
            }
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.completeButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.completeButtonText}>
                Complete Session
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.lg,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  header: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scorePill: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  scoreValue: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSection,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionChevron: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginRight: spacing.sm,
    width: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  listContent: { paddingBottom: spacing['5xl'] },
  footer: { padding: spacing.lg },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#fff',
  },
});
