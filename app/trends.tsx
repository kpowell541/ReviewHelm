import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSessionStore } from '../src/store/useSessionStore';
import { getChecklist, getMergedChecklist } from '../src/data/checklistLoader';
import { getAllChecklistItems, getSectionItems, getEffectiveStackIds } from '../src/data/types';
import { AppFooter } from '../src/components/AppFooter';
import { computeSessionScores } from '../src/utils/scoring';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import type {
  Session,
  ChecklistItem,
  ChecklistSection,
  ItemResponse,
  StackId,
} from '../src/data/types';

// ============================================
// Types
// ============================================

type Step = 'pick-a' | 'pick-b' | 'compare';

interface SectionComparison {
  sectionId: string;
  sectionTitle: string;
  respondedA: number;
  respondedB: number;
  avgConfidenceA: number;
  avgConfidenceB: number;
}

interface ItemChange {
  itemId: string;
  itemText: string;
  confidenceA: number;
  confidenceB: number;
  verdictA: ItemResponse['verdict'];
  verdictB: ItemResponse['verdict'];
}

// ============================================
// Helpers
// ============================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function deltaSign(delta: number): string {
  if (delta > 0) return '+';
  if (delta < 0) return '';
  return '';
}

function deltaColor(delta: number, invertBetter = false): string {
  if (delta === 0) return colors.textMuted;
  const positive = invertBetter ? delta < 0 : delta > 0;
  return positive ? colors.success : colors.error;
}

function getSessionChecklist(session: Session) {
  const stackIds = getEffectiveStackIds(session);
  if (session.mode === 'polish') {
    return getChecklist('polish-my-pr');
  }
  if (stackIds.length > 1) {
    return getMergedChecklist(stackIds, session.selectedSections);
  }
  if (stackIds.length === 1) {
    return getChecklist(stackIds[0]);
  }
  return getChecklist('polish-my-pr');
}

function stacksOverlap(a: StackId[], b: StackId[]): boolean {
  return a.some((id) => b.includes(id));
}

// ============================================
// Sub-Components
// ============================================

function SessionPickerCard({
  session,
  onPress,
  isSelected,
}: {
  session: Session;
  onPress: () => void;
  isSelected?: boolean;
}) {
  const stackIds = getEffectiveStackIds(session);
  const stackLabel = stackIds.length > 0 ? stackIds.join(', ') : session.mode;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.sessionCard,
        isSelected && styles.sessionCardSelected,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Session: ${session.title}, ${session.mode === 'polish' ? 'Polish' : 'Review'}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.sessionCardHeader}>
        <Text style={styles.sessionCardTitle} numberOfLines={1}>
          {session.title}
        </Text>
        <Text style={styles.sessionCardMode}>
          {session.mode === 'polish' ? 'Polish' : 'Review'}
        </Text>
      </View>
      <View style={styles.sessionCardMeta}>
        <Text style={styles.sessionCardStack} numberOfLines={1}>
          {stackLabel}
        </Text>
        <Text style={styles.sessionCardDate}>
          {formatDate(session.completedAt ?? session.updatedAt)}
        </Text>
      </View>
      <Text style={styles.sessionCardItems}>
        {Object.keys(session.itemResponses).length} items responded
      </Text>
    </Pressable>
  );
}

function DeltaIndicator({
  delta,
  suffix,
  invertBetter,
}: {
  delta: number;
  suffix?: string;
  invertBetter?: boolean;
}) {
  const color = deltaColor(delta, invertBetter);
  const arrow = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2014';
  const display = delta === 0 ? '\u2014' : `${deltaSign(delta)}${Math.abs(delta)}`;

  return (
    <Text style={[styles.deltaText, { color }]}>
      {arrow} {display}{suffix ?? ''}
    </Text>
  );
}

function ScoreCard({
  label,
  valueA,
  valueB,
  suffix,
  invertBetter,
}: {
  label: string;
  valueA: number;
  valueB: number;
  suffix?: string;
  invertBetter?: boolean;
}) {
  const delta = valueB - valueA;
  const sfx = suffix ?? '';

  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreValues}>
        <Text style={styles.scoreValueA}>
          {valueA}{sfx}
        </Text>
        <DeltaIndicator delta={delta} suffix={sfx} invertBetter={invertBetter} />
        <Text style={styles.scoreValueB}>
          {valueB}{sfx}
        </Text>
      </View>
    </View>
  );
}

function SectionComparisonRow({ comparison }: { comparison: SectionComparison }) {
  const confidenceDelta = comparison.avgConfidenceB - comparison.avgConfidenceA;
  const respondedDelta = comparison.respondedB - comparison.respondedA;

  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionRowTitle} numberOfLines={1}>
        {comparison.sectionTitle}
      </Text>
      <View style={styles.sectionRowStats}>
        <View style={styles.sectionStat}>
          <Text style={styles.sectionStatLabel}>Items</Text>
          <View style={styles.sectionStatValues}>
            <Text style={styles.sectionStatValue}>{comparison.respondedA}</Text>
            <DeltaIndicator delta={respondedDelta} />
            <Text style={styles.sectionStatValue}>{comparison.respondedB}</Text>
          </View>
        </View>
        <View style={styles.sectionStat}>
          <Text style={styles.sectionStatLabel}>Avg Confidence</Text>
          <View style={styles.sectionStatValues}>
            <Text style={styles.sectionStatValue}>
              {comparison.avgConfidenceA.toFixed(1)}
            </Text>
            <DeltaIndicator
              delta={Math.round(confidenceDelta * 10) / 10}
            />
            <Text style={styles.sectionStatValue}>
              {comparison.avgConfidenceB.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ItemChangeRow({ change }: { change: ItemChange }) {
  const delta = change.confidenceB - change.confidenceA;
  const newIssue =
    change.verdictB === 'needs-attention' && change.verdictA !== 'needs-attention';
  const resolved =
    change.verdictA === 'needs-attention' && change.verdictB !== 'needs-attention';

  let badge = '';
  let badgeColor: string = colors.textMuted;
  if (newIssue) {
    badge = 'NEW ISSUE';
    badgeColor = colors.error;
  } else if (resolved) {
    badge = 'RESOLVED';
    badgeColor = colors.success;
  } else if (delta > 0) {
    badge = 'IMPROVED';
    badgeColor = colors.success;
  } else if (delta < 0) {
    badge = 'REGRESSED';
    badgeColor = colors.error;
  }

  return (
    <View style={styles.itemChangeRow}>
      <View style={styles.itemChangeInfo}>
        <Text style={styles.itemChangeText} numberOfLines={2}>
          {change.itemText}
        </Text>
        {badge !== '' && (
          <View style={[styles.itemBadge, { backgroundColor: `${badgeColor}20` }]}>
            <Text style={[styles.itemBadgeText, { color: badgeColor }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.itemChangeDelta}>
        <Text style={styles.itemChangeConfidence}>{change.confidenceA}</Text>
        <DeltaIndicator delta={delta} />
        <Text style={styles.itemChangeConfidence}>{change.confidenceB}</Text>
      </View>
    </View>
  );
}

// ============================================
// Main Screen
// ============================================

export default function TrendsScreen() {
  const sessions = useSessionStore((s) => s.sessions);
  const [step, setStep] = useState<Step>('pick-a');
  const [sessionAId, setSessionAId] = useState<string | null>(null);
  const [sessionBId, setSessionBId] = useState<string | null>(null);

  // All completed sessions, sorted newest first
  const completedSessions = useMemo(() => {
    return Object.values(sessions)
      .filter((s) => s.isComplete)
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.updatedAt).getTime() -
          new Date(a.completedAt ?? a.updatedAt).getTime(),
      );
  }, [sessions]);

  // Sessions eligible for B pick (must overlap stacks with session A)
  const eligibleForB = useMemo(() => {
    if (!sessionAId) return [];
    const sessionA = sessions[sessionAId];
    if (!sessionA) return [];
    const stacksA = getEffectiveStackIds(sessionA);

    return completedSessions.filter((s) => {
      if (s.id === sessionAId) return false;
      if (s.mode !== sessionA.mode) return false;
      const stacksB = getEffectiveStackIds(s);
      return stacksOverlap(stacksA, stacksB);
    });
  }, [sessionAId, completedSessions, sessions]);

  const sessionA = sessionAId ? sessions[sessionAId] : null;
  const sessionB = sessionBId ? sessions[sessionBId] : null;

  // Compute comparison data
  const comparisonData = useMemo(() => {
    if (!sessionA || !sessionB) return null;

    const checklistA = getSessionChecklist(sessionA);
    const checklistB = getSessionChecklist(sessionB);
    const allItemsA = getAllChecklistItems(checklistA);
    const allItemsB = getAllChecklistItems(checklistB);

    const scoresA = computeSessionScores(sessionA, allItemsA);
    const scoresB = computeSessionScores(sessionB, allItemsB);

    // Build item map from both checklists for text lookup
    const itemMap: Record<string, ChecklistItem> = {};
    for (const item of allItemsA) itemMap[item.id] = item;
    for (const item of allItemsB) itemMap[item.id] = item;

    // Per-section comparison: use sections from both checklists
    const sectionMap: Record<string, { section: ChecklistSection; source: 'a' | 'b' | 'both' }> = {};
    for (const section of checklistA.sections) {
      sectionMap[section.id] = { section, source: 'a' };
    }
    for (const section of checklistB.sections) {
      if (sectionMap[section.id]) {
        sectionMap[section.id].source = 'both';
      } else {
        sectionMap[section.id] = { section, source: 'b' };
      }
    }

    const sectionComparisons: SectionComparison[] = [];
    for (const [sectionId, { section }] of Object.entries(sectionMap)) {
      const sectionItems = getSectionItems(section);
      let respondedA = 0;
      let respondedB = 0;
      let totalConfA = 0;
      let totalConfB = 0;

      for (const item of sectionItems) {
        const respA = sessionA.itemResponses[item.id];
        const respB = sessionB.itemResponses[item.id];

        if (respA && respA.verdict !== 'na' && respA.verdict !== 'skipped') {
          respondedA++;
          totalConfA += respA.confidence;
        }
        if (respB && respB.verdict !== 'na' && respB.verdict !== 'skipped') {
          respondedB++;
          totalConfB += respB.confidence;
        }
      }

      // Only include sections where at least one session responded
      if (respondedA > 0 || respondedB > 0) {
        sectionComparisons.push({
          sectionId,
          sectionTitle: section.title,
          respondedA,
          respondedB,
          avgConfidenceA: respondedA > 0 ? totalConfA / respondedA : 0,
          avgConfidenceB: respondedB > 0 ? totalConfB / respondedB : 0,
        });
      }
    }

    // Item-level changes: items present in both sessions
    const allItemIds = new Set([
      ...Object.keys(sessionA.itemResponses),
      ...Object.keys(sessionB.itemResponses),
    ]);

    const improved: ItemChange[] = [];
    const regressed: ItemChange[] = [];
    const newIssues: ItemChange[] = [];

    for (const itemId of allItemIds) {
      const respA = sessionA.itemResponses[itemId];
      const respB = sessionB.itemResponses[itemId];
      if (!respA || !respB) continue;
      // Skip non-substantive responses
      if (respA.verdict === 'na' || respA.verdict === 'skipped') continue;
      if (respB.verdict === 'na' || respB.verdict === 'skipped') continue;

      const item = itemMap[itemId];
      const change: ItemChange = {
        itemId,
        itemText: item?.text ?? itemId,
        confidenceA: respA.confidence,
        confidenceB: respB.confidence,
        verdictA: respA.verdict,
        verdictB: respB.verdict,
      };

      if (
        respB.verdict === 'needs-attention' &&
        respA.verdict !== 'needs-attention'
      ) {
        newIssues.push(change);
      } else if (respB.confidence > respA.confidence) {
        improved.push(change);
      } else if (respB.confidence < respA.confidence) {
        regressed.push(change);
      }
    }

    // Sort by magnitude of change
    improved.sort((a, b) => (b.confidenceB - b.confidenceA) - (a.confidenceB - a.confidenceA));
    regressed.sort((a, b) => (a.confidenceB - a.confidenceA) - (b.confidenceB - b.confidenceA));

    return {
      scoresA,
      scoresB,
      sectionComparisons,
      improved,
      regressed,
      newIssues,
    };
  }, [sessionA, sessionB]);

  // Handlers
  const handlePickA = useCallback((session: Session) => {
    setSessionAId(session.id);
    setSessionBId(null);
    setStep('pick-b');
  }, []);

  const handlePickB = useCallback((session: Session) => {
    setSessionBId(session.id);
    setStep('compare');
  }, []);

  const handleReset = useCallback(() => {
    setSessionAId(null);
    setSessionBId(null);
    setStep('pick-a');
  }, []);

  const handleBackToPickB = useCallback(() => {
    setSessionBId(null);
    setStep('pick-b');
  }, []);

  // ============================================
  // Step 1: Pick Session A
  // ============================================
  if (step === 'pick-a') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Compare Sessions</Text>
        <Text style={styles.subtitle}>
          Select the first session to compare (Session A)
        </Text>

        {completedSessions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'📊'}</Text>
            <Text style={styles.emptyText}>
              No completed sessions yet. Finish a review or polish session to
              start comparing your progress.
            </Text>
          </View>
        )}

        {completedSessions.map((session) => (
          <SessionPickerCard
            key={session.id}
            session={session}
            onPress={() => handlePickA(session)}
          />
        ))}
        <AppFooter />
      </ScrollView>
    );
  }

  // ============================================
  // Step 2: Pick Session B
  // ============================================
  if (step === 'pick-b') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={handleReset} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Change Session A">
          <Text style={styles.backButtonText}>{'\u2190'} Change Session A</Text>
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">Compare Sessions</Text>
        <Text style={styles.subtitle}>
          Session A selected. Now pick Session B to compare against.
        </Text>

        {sessionA && (
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedBannerLabel}>Session A</Text>
            <Text style={styles.selectedBannerTitle}>{sessionA.title}</Text>
            <Text style={styles.selectedBannerDate}>
              {formatDate(sessionA.completedAt ?? sessionA.updatedAt)}
            </Text>
          </View>
        )}

        {eligibleForB.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'🔍'}</Text>
            <Text style={styles.emptyText}>
              No comparable sessions found. Session B must be the same mode and
              share at least one stack with Session A.
            </Text>
          </View>
        )}

        {eligibleForB.map((session) => (
          <SessionPickerCard
            key={session.id}
            session={session}
            onPress={() => handlePickB(session)}
          />
        ))}
        <AppFooter />
      </ScrollView>
    );
  }

  // ============================================
  // Step 3: Comparison View
  // ============================================
  if (!comparisonData || !sessionA || !sessionB) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const {
    scoresA,
    scoresB,
    sectionComparisons,
    improved,
    regressed,
    newIssues,
  } = comparisonData;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Navigation */}
      <View style={styles.navRow}>
        <Pressable onPress={handleBackToPickB} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Change Session B">
          <Text style={styles.backButtonText}>{'\u2190'} Change Session B</Text>
        </Pressable>
        <Pressable onPress={handleReset} style={styles.resetButton} accessibilityRole="button" accessibilityLabel="Start over">
          <Text style={styles.resetButtonText}>Start Over</Text>
        </Pressable>
      </View>

      <Text style={styles.title} accessibilityRole="header">Session Comparison</Text>

      {/* Session Labels */}
      <View style={styles.sessionLabels}>
        <View style={styles.sessionLabelCard}>
          <Text style={styles.sessionLabelTag}>A</Text>
          <View style={styles.sessionLabelInfo}>
            <Text style={styles.sessionLabelTitle} numberOfLines={1}>
              {sessionA.title}
            </Text>
            <Text style={styles.sessionLabelDate}>
              {formatDate(sessionA.completedAt ?? sessionA.updatedAt)}
            </Text>
          </View>
        </View>
        <View style={styles.sessionLabelCard}>
          <Text style={[styles.sessionLabelTag, styles.sessionLabelTagB]}>B</Text>
          <View style={styles.sessionLabelInfo}>
            <Text style={styles.sessionLabelTitle} numberOfLines={1}>
              {sessionB.title}
            </Text>
            <Text style={styles.sessionLabelDate}>
              {formatDate(sessionB.completedAt ?? sessionB.updatedAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Score Comparison */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText} accessibilityRole="header">Overall Scores</Text>
      </View>

      <View style={styles.scoresGrid}>
        <ScoreCard
          label="Coverage"
          valueA={scoresA.coverage}
          valueB={scoresB.coverage}
          suffix="%"
        />
        <ScoreCard
          label="Confidence"
          valueA={scoresA.confidence}
          valueB={scoresB.confidence}
          suffix="%"
        />
        <ScoreCard
          label="Total Issues"
          valueA={scoresA.totalIssues}
          valueB={scoresB.totalIssues}
          invertBetter
        />
      </View>

      {/* Per-Section Comparison */}
      {sectionComparisons.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText} accessibilityRole="header">By Section</Text>
            <Text style={styles.sectionHeaderSub}>
              A {'\u2192'} B
            </Text>
          </View>

          {sectionComparisons.map((comp) => (
            <SectionComparisonRow key={comp.sectionId} comparison={comp} />
          ))}
        </>
      )}

      {/* Item-Level Changes */}
      {(improved.length > 0 || regressed.length > 0 || newIssues.length > 0) && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText} accessibilityRole="header">Item-Level Changes</Text>
        </View>
      )}

      {improved.length > 0 && (
        <View style={styles.changeGroup}>
          <View style={styles.changeGroupHeader}>
            <View style={[styles.changeGroupDot, { backgroundColor: colors.success }]} />
            <Text style={styles.changeGroupTitle}>
              Improved ({improved.length})
            </Text>
          </View>
          {improved.map((change) => (
            <ItemChangeRow key={change.itemId} change={change} />
          ))}
        </View>
      )}

      {regressed.length > 0 && (
        <View style={styles.changeGroup}>
          <View style={styles.changeGroupHeader}>
            <View style={[styles.changeGroupDot, { backgroundColor: colors.error }]} />
            <Text style={styles.changeGroupTitle}>
              Regressed ({regressed.length})
            </Text>
          </View>
          {regressed.map((change) => (
            <ItemChangeRow key={change.itemId} change={change} />
          ))}
        </View>
      )}

      {newIssues.length > 0 && (
        <View style={styles.changeGroup}>
          <View style={styles.changeGroupHeader}>
            <View style={[styles.changeGroupDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.changeGroupTitle}>
              Newly Flagged Issues ({newIssues.length})
            </Text>
          </View>
          {newIssues.map((change) => (
            <ItemChangeRow key={change.itemId} change={change} />
          ))}
        </View>
      )}

      {improved.length === 0 && regressed.length === 0 && newIssues.length === 0 && (
        <View style={styles.noChanges}>
          <Text style={styles.noChangesText}>
            No overlapping item-level changes detected between these two sessions.
          </Text>
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: spacing['5xl'] }} />
      <AppFooter />
    </ScrollView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  resetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Title / Subtitle
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing['2xl'],
  },

  // Session Picker Card
  sessionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionCardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionCardMode: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionCardStack: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionCardDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  sessionCardItems: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },

  // Selected Banner (for Session A in step 2)
  selectedBanner: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  selectedBannerLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  selectedBannerTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectedBannerDate: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },

  // Session Labels (comparison header)
  sessionLabels: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sessionLabelCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionLabelTag: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.bg,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  sessionLabelTagB: {
    backgroundColor: colors.success,
  },
  sessionLabelInfo: {
    flex: 1,
  },
  sessionLabelTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sessionLabelDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionHeaderText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionHeaderSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },

  // Score Cards
  scoresGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  scoreValues: {
    alignItems: 'center',
    gap: 2,
  },
  scoreValueA: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  scoreValueB: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Delta text
  deltaText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },

  // Section Comparison Rows
  sectionRow: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionRowTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionRowStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  sectionStat: {
    flex: 1,
  },
  sectionStatLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionStatValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionStatValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Item Changes
  changeGroup: {
    marginBottom: spacing.xl,
  },
  changeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  changeGroupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  changeGroupTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  itemChangeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemChangeText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  itemBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  itemBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemChangeDelta: {
    alignItems: 'center',
    gap: 2,
    minWidth: 50,
  },
  itemChangeConfidence: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // No changes
  noChanges: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  noChangesText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
