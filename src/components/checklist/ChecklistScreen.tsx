import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../../store/useSessionStore';
import { useConfidenceStore } from '../../store/useConfidenceStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { getChecklist, getPolishChecklist, getMergedChecklist, withSecurityChecklist, withCodeReviewMeta } from '../../data/checklistLoader';
import { getAllChecklistItems, getSectionItems, getEffectiveStackIds } from '../../data/types';
import type {
  Checklist,
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

interface ChecklistSectionListEntry {
  section: ChecklistSection;
  items: ChecklistItem[];
  data: ChecklistItem[];
}

const SEVERITY_ORDER: Severity[] = ['blocker', 'major', 'minor', 'nit'];

function hashStringToSeed(value: string): number {
  let hash = 1779033703 ^ value.length;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return (hash >>> 0) || 1;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(input: T[], seed: number): T[] {
  const shuffled = [...input];
  const random = mulberry32(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function severityChipLabel(severity: Severity): string {
  return severity === 'blocker'
    ? 'Blocker'
    : severity === 'major'
      ? 'Major'
      : severity === 'minor'
        ? 'Minor'
        : 'Nit';
}

export function ChecklistScreen({ sessionId }: Props) {
  const router = useRouter();
  const sessions = useSessionStore((s) => s.sessions);
  const session = useMemo(() => sessions[sessionId], [sessions, sessionId]);
  const setItemResponse = useSessionStore((s) => s.setItemResponse);
  const completeSession = useSessionStore((s) => s.completeSession);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);
  const recordSessionResults = useConfidenceStore((s) => s.recordSessionResults);

  const antiBiasMode = usePreferencesStore((s) => s.antiBiasMode);
  const defaultSeverityFilter = usePreferencesStore((s) => s.defaultSeverityFilter);
  const autoExportPdf = usePreferencesStore((s) => s.autoExportPdf);
  const fontSize = usePreferencesStore((s) => s.fontSize);

  const sectionListRef = useRef<SectionList<ChecklistItem, ChecklistSectionListEntry>>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sessionNotesCollapsed, setSessionNotesCollapsed] = useState(true);
  const [sessionNotesDraft, setSessionNotesDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity[]>(defaultSeverityFilter);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSeverityFilter(defaultSeverityFilter);
  }, [defaultSeverityFilter]);

  useEffect(() => {
    setSessionNotesDraft(session?.sessionNotes ?? '');
  }, [session?.id, session?.sessionNotes]);

  const checklist = useMemo(() => {
    if (!session) return null;
    if (session.mode === 'polish') {
      const effectiveIds = getEffectiveStackIds(session);
      if (effectiveIds.length === 0) return withCodeReviewMeta(withSecurityChecklist(getPolishChecklist()));
      // Merge domain checklists + polish checklist for self-reviews with a stack
      const domainChecklist = effectiveIds.length === 1
        ? getChecklist(effectiveIds[0])
        : getMergedChecklist(effectiveIds, session.selectedSections);
      const polishChecklist = getPolishChecklist();
      const merged: Checklist = {
        ...domainChecklist,
        meta: {
          ...domainChecklist.meta,
          id: `${domainChecklist.meta.id}+polish`,
          title: `${domainChecklist.meta.title} + Polish`,
          shortTitle: `${domainChecklist.meta.shortTitle}+Polish`,
          totalItems: domainChecklist.meta.totalItems + polishChecklist.meta.totalItems,
        },
        sections: [...domainChecklist.sections, ...polishChecklist.sections],
      };
      return withCodeReviewMeta(withSecurityChecklist(merged));
    }
    const effectiveIds = getEffectiveStackIds(session);
    if (effectiveIds.length === 0) return null;
    const base = effectiveIds.length === 1
      ? getChecklist(effectiveIds[0])
      : getMergedChecklist(effectiveIds, session.selectedSections);
    return withCodeReviewMeta(withSecurityChecklist(base));
  }, [session]);

  const allItems = useMemo(() => (checklist ? getAllChecklistItems(checklist) : []), [checklist]);

  const scores = useMemo(() => {
    if (!session) return null;
    return computeSessionScores(session, allItems);
  }, [session, allItems]);

  const sections = useMemo<ChecklistSectionListEntry[]>(() => {
    if (!checklist || !session) return [];

    const orderedSections =
      session.mode === 'polish' && antiBiasMode
        ? seededShuffle(checklist.sections, hashStringToSeed(session.id))
        : checklist.sections;

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return orderedSections
      .map((section) => {
        const items = getSectionItems(section).filter((item) => {
          const severityMatch = severityFilter.includes(item.severity);
          const textMatch =
            normalizedQuery === '' ||
            item.text.toLowerCase().includes(normalizedQuery) ||
            item.id.toLowerCase().includes(normalizedQuery);
          return severityMatch && textMatch;
        });
        return {
          section,
          items,
          data: collapsedSections[section.id] ? [] : items,
        };
      })
      .filter((entry) => entry.items.length > 0);
  }, [checklist, session, antiBiasMode, searchQuery, severityFilter, collapsedSections]);

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
    [sessionId, setItemResponse],
  );

  const handleSetConfidence = useCallback(
    (itemId: string, confidence: ConfidenceLevel) => {
      setItemResponse(sessionId, itemId, { confidence });
    },
    [sessionId, setItemResponse],
  );

  const handleSetNotes = useCallback(
    (itemId: string, notes: string) => {
      setItemResponse(sessionId, itemId, { notes });
    },
    [sessionId, setItemResponse],
  );

  const handleDeepDive = useCallback(
    (itemId: string) => {
      router.push(
        `/deep-dive/${encodeURIComponent(itemId)}?sessionId=${encodeURIComponent(sessionId)}`,
      );
    },
    [router, sessionId],
  );

  const handleDraftComment = useCallback(
    (itemId: string) => {
      router.push(
        `/comment-drafter/${encodeURIComponent(itemId)}?sessionId=${encodeURIComponent(sessionId)}`,
      );
    },
    [router, sessionId],
  );

  const toggleSeverity = useCallback((severity: Severity) => {
    setSeverityFilter((prev) => {
      if (prev.includes(severity)) {
        if (prev.length === 1) return prev;
        return prev.filter((value) => value !== severity);
      }
      return [...prev, severity];
    });
  }, []);

  const persistSessionNotes = useCallback(() => {
    updateSessionNotes(sessionId, sessionNotesDraft);
  }, [updateSessionNotes, sessionId, sessionNotesDraft]);

  const jumpToSection = useCallback((sectionIndex: number) => {
    // Expand the section if collapsed
    const section = sections[sectionIndex];
    if (section && collapsedSections[section.section.id]) {
      setCollapsedSections((prev) => ({
        ...prev,
        [section.section.id]: false,
      }));
    }
    setShowSectionPicker(false);
    setTimeout(() => {
      sectionListRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
      });
    }, 100);
  }, [sections, collapsedSections]);

  const toggleBulkItem = useCallback((itemId: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const bulkSetVerdict = useCallback((verdict: Verdict) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (const itemId of bulkSelected) {
      setItemResponse(sessionId, itemId, { verdict });
    }
    setBulkSelected(new Set());
  }, [bulkSelected, sessionId, setItemResponse]);

  const bulkSetConfidence = useCallback((confidence: ConfidenceLevel) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (const itemId of bulkSelected) {
      setItemResponse(sessionId, itemId, { confidence });
    }
    setBulkSelected(new Set());
  }, [bulkSelected, sessionId, setItemResponse]);

  const finalizeCompletion = useCallback(() => {
    if (!session || !checklist || session.isComplete) {
      router.replace(`/session-summary/${sessionId}`);
      return;
    }

    const itemSeverities: Record<string, { severity: Severity; sectionId: string }> = {};
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
      {
        ...session,
        isComplete: true,
        completedAt: new Date().toISOString(),
      },
      itemSeverities,
    );

    const destination = autoExportPdf
      ? `/session-summary/${sessionId}?autoExport=1`
      : `/session-summary/${sessionId}`;
    router.replace(destination);
  }, [
    session,
    checklist,
    sessionId,
    completeSession,
    recordSessionResults,
    autoExportPdf,
    router,
  ]);

  const handleComplete = useCallback(() => {
    if (!session || !scores) return;
    if (session.isComplete) {
      router.replace(`/session-summary/${sessionId}`);
      return;
    }

    const lowCoverage = scores.coverage < 70;
    const warningSuffix = lowCoverage
      ? `\n\nCoverage is ${scores.coverage}%. You may miss important issues if you finish now.`
      : '';

    Alert.alert(
      'Complete session?',
      `This will lock in your scores and save gap tracking.${warningSuffix}`,
      [
        { text: 'Keep reviewing', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: finalizeCompletion,
        },
      ],
    );
  }, [session, scores, router, sessionId, finalizeCompletion]);

  if (!session || !checklist || !scores) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const getSectionProgress = (items: ChecklistItem[]) => {
    const responded = items.filter(
      (item) =>
        session.itemResponses[item.id] &&
        session.itemResponses[item.id].verdict !== 'skipped',
    ).length;
    return { responded, total: items.length };
  };

  const hasSessionNotes = sessionNotesDraft.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { flex: 1 }]} numberOfLines={1}>
            {checklist.meta.title}
          </Text>
          <Pressable
            style={[styles.bulkToggle, bulkMode && styles.bulkToggleActive]}
            onPress={() => {
              setBulkMode((prev) => !prev);
              setBulkSelected(new Set());
            }}
          >
            <Text style={[styles.bulkToggleText, bulkMode && styles.bulkToggleTextActive]}>
              {bulkMode ? 'Exit Bulk' : 'Bulk'}
            </Text>
          </Pressable>
        </View>
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
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${scores.coverage}%` }]} />
        </View>
      </View>

      <View style={styles.notesWrapper}>
        <Pressable
          onPress={() => setSessionNotesCollapsed((prev) => !prev)}
          style={styles.notesHeader}
        >
          <Text style={styles.notesTitle}>
            Session Notes {hasSessionNotes ? '(has notes)' : ''}
          </Text>
          <Text style={styles.notesChevron}>{sessionNotesCollapsed ? '▶' : '▼'}</Text>
        </Pressable>
        {!sessionNotesCollapsed && (
          <TextInput
            style={styles.notesInput}
            value={sessionNotesDraft}
            onChangeText={setSessionNotesDraft}
            onBlur={persistSessionNotes}
            placeholder="Capture important context for your summary..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        )}
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search checklist items..."
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.severityChipRow}>
          {SEVERITY_ORDER.map((severity) => {
            const selected = severityFilter.includes(severity);
            return (
              <Pressable
                key={severity}
                onPress={() => toggleSeverity(severity)}
                style={[
                  styles.severityChip,
                  selected && styles.severityChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.severityChipText,
                    selected && styles.severityChipTextSelected,
                  ]}
                >
                  {severityChipLabel(severity)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionList<ChecklistItem, ChecklistSectionListEntry>
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled
        renderSectionHeader={({ section: sectionEntry }) => {
          const progress = getSectionProgress(sectionEntry.items);
          const isCollapsed = collapsedSections[sectionEntry.section.id];
          return (
            <Pressable
              onPress={() => toggleSection(sectionEntry.section.id)}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionChevron}>{isCollapsed ? '▶' : '▼'}</Text>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {sectionEntry.section.title}
              </Text>
              <Text style={styles.sectionCount}>
                {progress.responded}/{progress.total}
              </Text>
            </Pressable>
          );
        }}
        renderItem={({ item }) => (
          <View style={bulkMode ? styles.bulkItemRow : undefined}>
            {bulkMode && (
              <Pressable
                style={styles.bulkCheckbox}
                onPress={() => toggleBulkItem(item.id)}
              >
                <View style={[
                  styles.checkbox,
                  bulkSelected.has(item.id) && styles.checkboxChecked,
                ]}>
                  {bulkSelected.has(item.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </Pressable>
            )}
            <View style={bulkMode ? { flex: 1 } : undefined}>
              <ChecklistItemRow
                item={item}
                response={session.itemResponses[item.id]}
                textSize={fontSize}
                onSetVerdict={handleSetVerdict}
                onSetConfidence={handleSetConfidence}
                onSetNotes={handleSetNotes}
                onDeepDive={handleDeepDive}
                onDraftComment={handleDraftComment}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>
              No checklist items match your search/filter.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              onPress={handleComplete}
              disabled={session.isComplete}
              style={({ pressed }) => [
                styles.completeButton,
                session.isComplete && styles.completeButtonDisabled,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.completeButtonText}>
                {session.isComplete ? 'Session Completed' : 'Complete Session'}
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Floating section jump-to button */}
      <Pressable
        style={styles.floatingButton}
        onPress={() => setShowSectionPicker(true)}
      >
        <Text style={styles.floatingButtonText}>§</Text>
      </Pressable>

      {/* Section picker modal */}
      <Modal
        visible={showSectionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSectionPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSectionPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Jump to Section</Text>
            <FlatList
              data={sections}
              keyExtractor={(entry) => entry.section.id}
              renderItem={({ item: entry, index }) => {
                const progress = getSectionProgress(entry.items);
                return (
                  <Pressable
                    style={styles.modalSectionRow}
                    onPress={() => jumpToSection(index)}
                  >
                    <Text style={styles.modalSectionTitle} numberOfLines={1}>
                      {entry.section.title}
                    </Text>
                    <Text style={styles.modalSectionCount}>
                      {progress.responded}/{progress.total}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Bulk action bar */}
      {bulkMode && bulkSelected.size > 0 && (
        <View style={styles.bulkActionBar}>
          <Text style={styles.bulkActionCount}>
            {bulkSelected.size} selected
          </Text>
          <Pressable
            style={styles.bulkActionButton}
            onPress={() => bulkSetVerdict('looks-good')}
          >
            <Text style={styles.bulkActionText}>✓ Good</Text>
          </Pressable>
          <Pressable
            style={styles.bulkActionButton}
            onPress={() => bulkSetVerdict('na')}
          >
            <Text style={styles.bulkActionText}>— N/A</Text>
          </Pressable>
          <Pressable
            style={styles.bulkActionButton}
            onPress={() => bulkSetConfidence(5)}
          >
            <Text style={styles.bulkActionText}>5★</Text>
          </Pressable>
        </View>
      )}
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
  notesWrapper: {
    backgroundColor: colors.bgCard,
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notesChevron: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  notesInput: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    minHeight: 80,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  filters: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
  },
  severityChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  severityChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  severityChipSelected: {
    backgroundColor: `${colors.primary}18`,
    borderColor: colors.primary,
  },
  severityChipText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  severityChipTextSelected: {
    color: colors.primary,
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
  emptySearch: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  emptySearchText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  footer: { padding: spacing.lg },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#fff',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulkToggle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
  },
  bulkToggleActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  bulkToggleText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bulkToggleTextActive: {
    color: colors.primary,
  },
  bulkItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulkCheckbox: {
    paddingTop: spacing.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bulkActionCount: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 'auto',
  },
  bulkActionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkActionText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  floatingButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  floatingButtonText: {
    fontSize: fontSizes.xl,
    color: '#fff',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '60%',
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalSectionTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  modalSectionCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
