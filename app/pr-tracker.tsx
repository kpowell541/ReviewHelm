import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import type {
  PRStatus,
  PRRole,
  PRSize,
  PRPriority,
  CIPassing,
  PRDependency,
  TrackedPR,
  AcceptanceOutcome,
  ReviewOutcome,
} from '../src/data/types';
import { PR_STATUS_LABELS, PR_SIZE_LABELS, PR_PRIORITY_LABELS, PR_PRIORITY_ORDER, PR_ACTIVE_STATUSES } from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useResponsive } from '../src/hooks/useResponsive';

const STATUS_COLORS: Record<PRStatus, string> = {
  'needs-review': colors.warning,
  'in-review': colors.reviewMode,
  'changes-requested': colors.needsAttention,
  approved: colors.looksGood,
  merged: colors.looksGood,
  closed: colors.textMuted,
};

const STATUS_FILTERS: { key: PRStatus | 'all' | 'resolved'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'in-review', label: 'In Review' },
  { key: 'changes-requested', label: 'Changes' },
  { key: 'approved', label: 'Approved' },
  { key: 'resolved', label: 'Resolved' },
];

const PRIORITY_COLORS: Record<PRPriority, string> = {
  critical: colors.error,
  high: colors.needsAttention,
  medium: colors.warning,
  low: colors.textSecondary,
  routine: colors.textMuted,
};

const EMPTY_FORM = {
  title: '',
  url: '',
  role: 'reviewer' as PRRole,
  priority: 'medium' as PRPriority,
  isEmergency: false,
  size: 'medium' as PRSize,
  repo: '',
  prNumber: '',
  prAuthor: '',
  dependencies: [] as PRDependency[],
  ciPassing: 'unknown' as CIPassing,
  notes: '',
};

const EMPTY_DEP = { repo: '', prNumber: '', title: '' };

export default function PRTrackerScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const prs = usePRTrackerStore((s) => s.prs);
  const wipLimit = usePRTrackerStore((s) => s.wipLimit);
  const emergencySlotEnabled = usePRTrackerStore((s) => s.emergencySlotEnabled);
  const addPR = usePRTrackerStore((s) => s.addPR);
  const updatePR = usePRTrackerStore((s) => s.updatePR);
  const deletePR = usePRTrackerStore((s) => s.deletePR);
  const markReviewed = usePRTrackerStore((s) => s.markReviewed);
  const markAccepted = usePRTrackerStore((s) => s.markAccepted);
  const setReviewOutcome = usePRTrackerStore((s) => s.setReviewOutcome);
  const setStatus = usePRTrackerStore((s) => s.setStatus);
  const [filter, setFilter] = useState<PRStatus | 'all' | 'resolved'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [depForm, setDepForm] = useState(EMPTY_DEP);

  const allPRs = useMemo(() => Object.values(prs), [prs]);

  const wipStatus = useMemo(() => {
    const authored = allPRs.filter((pr) => PR_ACTIVE_STATUSES.includes(pr.status) && pr.role === 'author');
    const regularCount = authored.filter((pr) => !pr.isEmergency).length;
    const emergencyCount = authored.filter((pr) => pr.isEmergency).length;
    return {
      regularCount,
      emergencyCount,
      wipLimit,
      emergencySlotEnabled,
      isAtLimit: regularCount >= wipLimit,
      isOverLimit: regularCount > wipLimit,
      emergencySlotUsed: emergencyCount >= 1,
      totalActive: regularCount + emergencyCount,
    };
  }, [allPRs, wipLimit, emergencySlotEnabled]);

  const isWeekday = useMemo(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 5;
  }, []);

  const dailyProgress = useMemo(() => {
    if (!isWeekday) {
      return {
        smallTotal: 0, smallReviewed: 0,
        mediumTotal: 0, mediumReviewed: 0,
        largeTotal: 0, largeReviewed: 0,
        suggestion: 'Enjoy your weekend!',
      };
    }
    const reviewerPRs = allPRs.filter((pr) => PR_ACTIVE_STATUSES.includes(pr.status) && pr.role === 'reviewer');
    const small = reviewerPRs.filter((pr) => pr.size === 'small');
    const medium = reviewerPRs.filter((pr) => pr.size === 'medium');
    const large = reviewerPRs.filter((pr) => pr.size === 'large');
    const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
    const smallReviewed = small.filter((pr) => pr.lastReviewedAt && isToday(pr.lastReviewedAt)).length;
    const mediumReviewed = medium.filter((pr) => pr.lastReviewedAt && isToday(pr.lastReviewedAt)).length;
    const largeReviewed = large.filter((pr) => pr.lastReviewedAt && isToday(pr.lastReviewedAt)).length;
    const suggestions: string[] = [];
    if (small.length - smallReviewed > 0) suggestions.push(`${small.length - smallReviewed} small`);
    const medTarget = Math.min(5, medium.length);
    if (mediumReviewed < medTarget) suggestions.push(`${medTarget - mediumReviewed} medium`);
    const lgTarget = Math.min(2, large.length);
    if (largeReviewed < lgTarget) suggestions.push(`${lgTarget - largeReviewed} large`);
    return {
      smallTotal: small.length, smallReviewed,
      mediumTotal: medium.length, mediumReviewed,
      largeTotal: large.length, largeReviewed,
      suggestion: suggestions.length === 0 ? 'All caught up!' : `Try to review ${suggestions.join(', ')} today`,
    };
  }, [allPRs, isWeekday]);

  const todaysPlan = useMemo(() => {
    if (!isWeekday) {
      return { prs: [] as TrackedPR[], capacityNote: 'Enjoy your weekend!' };
    }
    const reviewerPRs = allPRs.filter((pr) => PR_ACTIVE_STATUSES.includes(pr.status) && pr.role === 'reviewer');
    // Sort by priority (critical first) then oldest first
    const sorted = [...reviewerPRs].sort((a, b) => {
      const aPri = PR_PRIORITY_ORDER.indexOf(a.priority);
      const bPri = PR_PRIORITY_ORDER.indexOf(b.priority);
      if (aPri !== bPri) return aPri - bPri;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const notReviewedToday = sorted.filter(
      (pr) => !pr.lastReviewedAt || !isToday(pr.lastReviewedAt),
    );
    const plan: TrackedPR[] = [];
    let mediumCount = 0;
    let largeCount = 0;
    for (const pr of notReviewedToday) {
      const size = pr.size ?? 'medium';
      if (size === 'small') {
        plan.push(pr);
      } else if (size === 'medium' && mediumCount < 5) {
        plan.push(pr);
        mediumCount++;
      } else if (size === 'large' && largeCount < 3) {
        plan.push(pr);
        largeCount++;
      }
    }
    const parts: string[] = [];
    const smallInPlan = plan.filter((pr) => (pr.size ?? 'medium') === 'small').length;
    if (smallInPlan > 0) parts.push(`${smallInPlan}S`);
    if (mediumCount > 0) parts.push(`${mediumCount}M`);
    if (largeCount > 0) parts.push(`${largeCount}L`);
    const capacityNote =
      plan.length === 0
        ? 'All caught up for today!'
        : `${parts.join(' + ')} (${plan.length} PR${plan.length > 1 ? 's' : ''})`;
    return { prs: plan, capacityNote };
  }, [allPRs, isWeekday]);

  const filteredPRs = useMemo(() => {
    const sorted = (list: TrackedPR[]) => [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (filter === 'all') return sorted(allPRs.filter((pr) => PR_ACTIVE_STATUSES.includes(pr.status)));
    if (filter === 'resolved') return sorted(allPRs.filter((pr) => !PR_ACTIVE_STATUSES.includes(pr.status)));
    return sorted(allPRs.filter((pr) => pr.status === filter));
  }, [filter, allPRs]);

  const authoredPRs = useMemo(
    () => filteredPRs.filter((pr) => pr.role === 'author'),
    [filteredPRs],
  );
  const reviewPRs = useMemo(
    () => filteredPRs.filter((pr) => pr.role === 'reviewer'),
    [filteredPRs],
  );

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((pr: TrackedPR) => {
    setEditingId(pr.id);
    setForm({
      title: pr.title,
      url: pr.url ?? '',
      role: pr.role,
      priority: pr.priority,
      isEmergency: pr.isEmergency,
      size: pr.size ?? 'medium',
      repo: pr.repo ?? '',
      prNumber: pr.prNumber?.toString() ?? '',
      prAuthor: pr.prAuthor ?? '',
      dependencies: pr.dependencies ?? [],
      ciPassing: pr.ciPassing ?? 'unknown',
      notes: pr.notes ?? '',
    });
    setShowModal(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const prData = {
      title: form.title.trim(),
      url: form.url.trim() || undefined,
      role: form.role,
      priority: form.priority,
      isEmergency: form.role === 'author' ? form.isEmergency : false,
      size: form.role === 'reviewer' ? form.size : undefined,
      repo: form.repo.trim() || undefined,
      prNumber: form.prNumber ? parseInt(form.prNumber, 10) || undefined : undefined,
      prAuthor: form.role === 'reviewer' && form.prAuthor.trim() ? form.prAuthor.trim() : undefined,
      dependencies: form.dependencies.length > 0 ? form.dependencies : undefined,
      ciPassing: form.ciPassing !== 'unknown' ? form.ciPassing : undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updatePR(editingId, prData);
    } else {
      addPR(prData);
    }
    setShowModal(false);
  }, [form, editingId, updatePR, addPR]);

  const handleDelete = useCallback(
    (pr: TrackedPR) => {
      Alert.alert('Delete PR', `Remove "${pr.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deletePR(pr.id);
          },
        },
      ]);
    },
    [deletePR],
  );

  const handleMarkReviewed = useCallback(
    (pr: TrackedPR) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      markReviewed(pr.id);
    },
    [markReviewed],
  );

  const handleStartReview = useCallback(
    (pr: TrackedPR) => {
      const route = pr.repo
        ? `/review/stack-select?repo=${encodeURIComponent(pr.repo)}`
        : '/review/stack-select';
      router.push(route as '/review/stack-select');
    },
    [router],
  );

  const cycleStatus = useCallback(
    (pr: TrackedPR) => {
      const order: PRStatus[] = [
        'needs-review',
        'in-review',
        'changes-requested',
        'approved',
        'merged',
      ];
      const idx = order.indexOf(pr.status);
      const next = order[(idx + 1) % order.length];
      void Haptics.selectionAsync();
      setStatus(pr.id, next);
    },
    [setStatus],
  );

  // --- Render Helpers ---

  const renderWipGauge = () => {
    const slots = Array.from({ length: wipStatus.wipLimit }, (_, i) => i);
    return (
      <View style={styles.gaugeCard}>
        <Text style={styles.gaugeTitle}>My PRs</Text>
        <View style={styles.gaugeRow}>
          <View style={styles.slotsRow}>
            {slots.map((i) => (
              <View
                key={i}
                style={[
                  styles.slot,
                  i < wipStatus.regularCount && styles.slotFilled,
                  wipStatus.isOverLimit &&
                    i < wipStatus.regularCount &&
                    styles.slotOver,
                ]}
              />
            ))}
            {wipStatus.emergencySlotEnabled && (
              <View
                style={[
                  styles.slot,
                  styles.slotEmergency,
                  wipStatus.emergencySlotUsed && styles.slotEmergencyFilled,
                ]}
              />
            )}
          </View>
          <Text style={styles.gaugeCount}>
            {wipStatus.regularCount}/{wipStatus.wipLimit}
            {wipStatus.emergencySlotEnabled
              ? ` + ${wipStatus.emergencyCount}/1`
              : ''}
          </Text>
        </View>
        {wipStatus.isAtLimit && (
          <Text
            style={[
              styles.gaugeWarning,
              wipStatus.isOverLimit && { color: colors.error },
            ]}
          >
            {wipStatus.isOverLimit
              ? 'Over WIP limit — consider closing a PR before starting new work'
              : 'At WIP limit'}
          </Text>
        )}
      </View>
    );
  };

  const renderDailyProgress = () => {
    const hasReviewPRs =
      dailyProgress.smallTotal + dailyProgress.mediumTotal + dailyProgress.largeTotal > 0;
    if (!hasReviewPRs) return null;

    return (
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Today's Reviews</Text>
        <View style={styles.progressRow}>
          {dailyProgress.smallTotal > 0 && (
            <View style={styles.progressChip}>
              <Text style={styles.progressLabel}>S</Text>
              <Text style={styles.progressCount}>
                {dailyProgress.smallReviewed}/{dailyProgress.smallTotal}
              </Text>
            </View>
          )}
          {dailyProgress.mediumTotal > 0 && (
            <View style={styles.progressChip}>
              <Text style={styles.progressLabel}>M</Text>
              <Text style={styles.progressCount}>
                {dailyProgress.mediumReviewed}/{Math.min(5, dailyProgress.mediumTotal)}
              </Text>
            </View>
          )}
          {dailyProgress.largeTotal > 0 && (
            <View style={styles.progressChip}>
              <Text style={styles.progressLabel}>L</Text>
              <Text style={styles.progressCount}>
                {dailyProgress.largeReviewed}/{Math.min(2, dailyProgress.largeTotal)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.progressSuggestion}>{dailyProgress.suggestion}</Text>
      </View>
    );
  };

  const renderTodaysPlan = () => {
    if (todaysPlan.prs.length === 0 && dailyProgress.smallTotal + dailyProgress.mediumTotal + dailyProgress.largeTotal === 0) return null;

    return (
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planTitle}>Today's Plan</Text>
          <Text style={styles.planCapacity}>{todaysPlan.capacityNote}</Text>
        </View>
        {todaysPlan.prs.length === 0 ? (
          <Text style={styles.planEmpty}>All caught up for today!</Text>
        ) : (
          todaysPlan.prs.map((pr) => {
            const priColor = PRIORITY_COLORS[pr.priority];
            return (
              <Pressable
                key={pr.id}
                style={styles.planRow}
                onPress={() => handleStartReview(pr)}
              >
                <View style={[styles.planPriorityDot, { backgroundColor: priColor }]} />
                <Text style={styles.planPRTitle} numberOfLines={1}>{pr.title}</Text>
                <View style={styles.planBadges}>
                  {pr.size && (
                    <Text style={[styles.planBadge, styles.sizeBadge]}>{PR_SIZE_LABELS[pr.size]}</Text>
                  )}
                  <Text style={[styles.planBadge, { backgroundColor: priColor + '25', color: priColor }]}>
                    {PR_PRIORITY_LABELS[pr.priority]}
                  </Text>
                </View>
                <Pressable
                  style={styles.reviewButton}
                  onPress={() => handleMarkReviewed(pr)}
                  hitSlop={6}
                >
                  <Text style={styles.reviewButtonText}>
                    {pr.lastReviewedAt && isToday(pr.lastReviewedAt) ? '✓' : '○'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </View>
    );
  };

  const renderPRCard = (pr: TrackedPR) => {
    const statusColor = STATUS_COLORS[pr.status];
    const subtitleParts = [
      pr.repo,
      pr.prNumber ? `#${pr.prNumber}` : null,
      pr.role === 'reviewer' && pr.prAuthor ? `by @${pr.prAuthor}` : null,
    ].filter(Boolean);
    const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' ') : null;

    return (
      <Pressable
        key={pr.id}
        style={styles.prCard}
        onPress={() => openEditModal(pr)}
        onLongPress={() => handleDelete(pr)}
      >
        <View style={styles.prCardLeft}>
          <Pressable onPress={() => cycleStatus(pr)} hitSlop={8}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </Pressable>
        </View>
        <View style={styles.prCardCenter}>
          <Text style={styles.prTitle} numberOfLines={1}>
            {pr.title}
          </Text>
          {subtitle && (
            <Text style={styles.prSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          <View style={styles.prBadges}>
            <Text style={[styles.badge, { backgroundColor: statusColor + '25', color: statusColor }]}>
              {PR_STATUS_LABELS[pr.status]}
            </Text>
            {pr.size && (
              <Text style={[styles.badge, styles.sizeBadge]}>
                {PR_SIZE_LABELS[pr.size]}
              </Text>
            )}
            {pr.priority !== 'medium' && (
              <Text style={[styles.badge, { backgroundColor: PRIORITY_COLORS[pr.priority] + '25', color: PRIORITY_COLORS[pr.priority] }]}>
                {PR_PRIORITY_LABELS[pr.priority]}
              </Text>
            )}
            {pr.isEmergency && (
              <Text style={[styles.badge, styles.emergencyBadge]}>
                HOTFIX
              </Text>
            )}
          </View>
          {/* Author: acceptance outcome toggles */}
          {pr.role === 'author' && PR_ACTIVE_STATUSES.includes(pr.status) && (
            <View style={styles.outcomeRow}>
              <Pressable
                style={[
                  styles.outcomeBtn,
                  pr.acceptanceOutcome === 'accepted-clean' && styles.outcomeBtnActiveGood,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  markAccepted(pr.id, 'accepted-clean');
                }}
                hitSlop={4}
              >
                <Text style={[
                  styles.outcomeBtnText,
                  pr.acceptanceOutcome === 'accepted-clean' && styles.outcomeBtnTextActive,
                ]}>Accepted (no changes)</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.outcomeBtn,
                  pr.acceptanceOutcome === 'accepted-with-changes' && styles.outcomeBtnActiveWarn,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  markAccepted(pr.id, 'accepted-with-changes');
                }}
                hitSlop={4}
              >
                <Text style={[
                  styles.outcomeBtnText,
                  pr.acceptanceOutcome === 'accepted-with-changes' && styles.outcomeBtnTextActive,
                ]}>Changes requested</Text>
              </Pressable>
            </View>
          )}
          {pr.role === 'author' && pr.acceptanceOutcome && (
            <Text style={styles.outcomeLabel}>
              {pr.acceptanceOutcome === 'accepted-clean'
                ? 'Merged without changes requested'
                : 'Merged after changes were requested'}
            </Text>
          )}
          {/* Reviewer: review outcome toggles */}
          {pr.role === 'reviewer' && (
            <View style={styles.outcomeRow}>
              <Pressable
                style={[
                  styles.outcomeBtn,
                  pr.reviewOutcome === 'requested-changes' && styles.outcomeBtnActiveWarn,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setReviewOutcome(pr.id, 'requested-changes');
                }}
                hitSlop={4}
              >
                <Text style={[
                  styles.outcomeBtnText,
                  pr.reviewOutcome === 'requested-changes' && styles.outcomeBtnTextActive,
                ]}>Requested changes</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.outcomeBtn,
                  pr.reviewOutcome === 'no-changes-requested' && styles.outcomeBtnActiveGood,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setReviewOutcome(pr.id, 'no-changes-requested');
                }}
                hitSlop={4}
              >
                <Text style={[
                  styles.outcomeBtnText,
                  pr.reviewOutcome === 'no-changes-requested' && styles.outcomeBtnTextActive,
                ]}>No changes needed</Text>
              </Pressable>
            </View>
          )}
          {pr.role === 'reviewer' && !pr.reviewOutcome && (
            <Text style={styles.outcomeDisclaimer}>
              Only request changes that truly need to be made and add value.
            </Text>
          )}
        </View>
        {pr.role === 'reviewer' && (
          <View style={styles.reviewActions}>
            <Pressable
              style={styles.startReviewButton}
              onPress={() => handleStartReview(pr)}
              hitSlop={6}
            >
              <Text style={styles.startReviewText}>Review</Text>
            </Pressable>
            <Pressable
              style={styles.reviewButton}
              onPress={() => handleMarkReviewed(pr)}
              hitSlop={6}
            >
              <Text style={styles.reviewButtonText}>
                {pr.lastReviewedAt && isToday(pr.lastReviewedAt) ? '✓' : '○'}
              </Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        {renderWipGauge()}
        {renderTodaysPlan()}
        {renderDailyProgress()}

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Add button */}
        <Pressable
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={openAddModal}
        >
          <Text style={styles.addButtonText}>+ Add PR</Text>
        </Pressable>

        {/* My PRs */}
        {authoredPRs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My PRs</Text>
            {authoredPRs.map(renderPRCard)}
          </View>
        )}

        {/* Reviewing */}
        {reviewPRs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviewing</Text>
            {reviewPRs.map(renderPRCard)}
          </View>
        )}

        {filteredPRs.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'No active PRs. Tap "+ Add PR" to track one.'
                : 'No PRs with this status.'}
            </Text>
          </View>
        )}
      </ScrollView>
      </DesktopContainer>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}
          onPress={() => setShowModal(false)}
        >
          <Pressable style={[styles.modalCard, isDesktop && styles.modalCardDesktop]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit PR' : 'Add PR'}
              </Text>

              {/* Title */}
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="PR title"
                placeholderTextColor={colors.textMuted}
                autoFocus={!editingId}
              />

              {/* URL */}
              <Text style={styles.fieldLabel}>URL</Text>
              <TextInput
                style={styles.input}
                value={form.url}
                onChangeText={(v) => setForm((f) => ({ ...f, url: v }))}
                placeholder="https://github.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Role */}
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.chipRow}>
                {(['author', 'reviewer'] as PRRole[]).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, form.role === r && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, role: r }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.role === r && styles.chipTextActive,
                      ]}
                    >
                      {r === 'author' ? 'My PR' : 'Reviewing'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Priority (both roles) */}
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.chipRow}>
                {PR_PRIORITY_ORDER.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, form.priority === p && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, priority: p }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.priority === p && styles.chipTextActive,
                      ]}
                    >
                      {PR_PRIORITY_LABELS[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Repo & PR # (both roles) */}
              <Text style={styles.fieldLabel}>Repo</Text>
              <TextInput
                style={styles.input}
                value={form.repo}
                onChangeText={(v) => setForm((f) => ({ ...f, repo: v }))}
                placeholder="org/repo-name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <View style={styles.fieldRowSplit}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>PR #</Text>
                  <TextInput
                    style={styles.input}
                    value={form.prNumber}
                    onChangeText={(v) => setForm((f) => ({ ...f, prNumber: v }))}
                    placeholder="1234"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                {form.role === 'reviewer' && (
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Author</Text>
                    <TextInput
                      style={styles.input}
                      value={form.prAuthor}
                      onChangeText={(v) => setForm((f) => ({ ...f, prAuthor: v }))}
                      placeholder="username"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>

              {/* Reviewer-only fields */}
              {form.role === 'reviewer' && (
                <>
                  <Text style={styles.fieldLabel}>Size</Text>
                  <View style={styles.chipRow}>
                    {(['small', 'medium', 'large'] as PRSize[]).map((s) => (
                      <Pressable
                        key={s}
                        style={[styles.chip, form.size === s && styles.chipActive]}
                        onPress={() => setForm((f) => ({ ...f, size: s }))}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            form.size === s && styles.chipTextActive,
                          ]}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Author-only fields */}
              {form.role === 'author' && (
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Emergency / Hotfix</Text>
                  <Switch
                    value={form.isEmergency}
                    onValueChange={(v) => setForm((f) => ({ ...f, isEmergency: v }))}
                    trackColor={{ false: colors.border, true: colors.error }}
                  />
                </View>
              )}

              {/* CI Passing */}
              <Text style={styles.fieldLabel}>Build Passing?</Text>
              <View style={styles.chipRow}>
                {(['yes', 'no', 'unknown'] as CIPassing[]).map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.chip, form.ciPassing === v && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, ciPassing: v }))}
                  >
                    <Text style={[styles.chipText, form.ciPassing === v && styles.chipTextActive]}>
                      {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Unknown'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Dependencies */}
              <Text style={styles.fieldLabel}>Dependencies</Text>
              {form.dependencies.map((dep, idx) => (
                <View key={idx} style={styles.depRow}>
                  <Text style={styles.depText}>
                    {dep.repo} #{dep.prNumber}{dep.title ? ` — ${dep.title}` : ''}
                  </Text>
                  <Pressable onPress={() => setForm((f) => ({
                    ...f,
                    dependencies: f.dependencies.filter((_, i) => i !== idx),
                  }))}>
                    <Text style={styles.depRemove}>X</Text>
                  </Pressable>
                </View>
              ))}
              <View style={styles.depInputRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={depForm.repo}
                  onChangeText={(v) => setDepForm((f) => ({ ...f, repo: v }))}
                  placeholder="org/repo"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={depForm.prNumber}
                  onChangeText={(v) => setDepForm((f) => ({ ...f, prNumber: v }))}
                  placeholder="PR #"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
                <Pressable
                  style={[styles.depAddBtn, (!depForm.repo.trim() || !depForm.prNumber.trim()) && { opacity: 0.4 }]}
                  onPress={() => {
                    if (!depForm.repo.trim() || !depForm.prNumber.trim()) return;
                    const num = parseInt(depForm.prNumber, 10);
                    if (!num) return;
                    setForm((f) => ({
                      ...f,
                      dependencies: [...f.dependencies, { repo: depForm.repo.trim(), prNumber: num, title: depForm.title.trim() || undefined }],
                    }));
                    setDepForm(EMPTY_DEP);
                  }}
                >
                  <Text style={styles.depAddBtnText}>+</Text>
                </Pressable>
              </View>

              {/* Notes */}
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Optional notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={[
                    styles.saveButton,
                    !form.title.trim() && { opacity: 0.4 },
                  ]}
                >
                  <Text style={styles.saveButtonText}>
                    {editingId ? 'Update' : 'Add PR'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  contentDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },

  // WIP Gauge
  gaugeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  gaugeTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotsRow: { flexDirection: 'row', gap: spacing.xs },
  slot: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  slotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotOver: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  slotEmergency: {
    borderColor: colors.error + '60',
    borderStyle: 'dashed',
    marginLeft: spacing.xs,
  },
  slotEmergencyFilled: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  gaugeCount: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gaugeWarning: {
    fontSize: fontSizes.sm,
    color: colors.warning,
    marginTop: spacing.sm,
  },

  // Daily Progress
  progressCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  progressRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  progressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  progressCount: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressSuggestion: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Today's Plan
  planCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planCapacity: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  planEmpty: {
    fontSize: fontSizes.sm,
    color: colors.looksGood,
    fontStyle: 'italic',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  planPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  planPRTitle: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  planBadges: {
    flexDirection: 'row',
    gap: 4,
    marginRight: spacing.sm,
  },
  planBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },

  // Filters
  filterRow: { marginBottom: spacing.md },
  filterContent: { gap: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  filterText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  filterTextActive: { color: colors.primary, fontWeight: '600' },

  // Add button
  addButton: {
    backgroundColor: colors.prTrackerMode,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  addButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // PR Card
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  prCardLeft: { marginRight: spacing.sm },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  prCardCenter: { flex: 1 },
  prTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  prSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  prBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  sizeBadge: {
    backgroundColor: colors.reviewMode + '25',
    color: colors.reviewMode,
  },
  emergencyBadge: {
    backgroundColor: colors.error + '25',
    color: colors.error,
  },

  // Outcome toggles
  outcomeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  outcomeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  outcomeBtnActiveGood: {
    backgroundColor: colors.looksGood + '20',
    borderColor: colors.looksGood,
  },
  outcomeBtnActiveWarn: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
  },
  outcomeBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  outcomeBtnTextActive: {
    color: colors.textPrimary,
  },
  outcomeLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  outcomeDisclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Review actions
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  startReviewButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.reviewMode + '20',
  },
  startReviewText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.reviewMode,
  },

  // Review button
  reviewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.looksGood,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  reviewButtonText: {
    fontSize: fontSizes.md,
    color: colors.looksGood,
    fontWeight: '700',
  },

  // Empty
  empty: {
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  modalCardDesktop: {
    width: 520,
    maxHeight: '80%',
    borderRadius: radius.xl,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  fieldRowSplit: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: { flex: 1 },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  depRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  depText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  depRemove: {
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  depInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  depAddBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depAddBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});
