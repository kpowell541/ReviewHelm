import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import { useSessionStore } from '../src/store/useSessionStore';
import { crossAlert } from '../src/utils/alert';
import { isToday } from '../src/utils/dateUtils';
import type {
  PRStatus,
  TrackedPR,
} from '../src/data/types';
import { PR_STATUS_LABELS, PR_SIZE_LABELS, PR_PRIORITY_LABELS, PR_PRIORITY_ORDER, PR_ACTIVE_STATUSES, STATUS_COLORS, PRIORITY_COLORS, getPRDisplayStatus } from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { AddPRModal } from '../src/components/AddPRModal';
import { FilterChips } from '../src/components/FilterChips';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useResponsive } from '../src/hooks/useResponsive';
import { useReducedMotion } from '../src/hooks/useReducedMotion';
import { AppFooter } from '../src/components/AppFooter';

const STATUS_FILTERS: { key: PRStatus | 'all' | 'resolved'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'in-review', label: 'In Review' },
  { key: 'changes-requested', label: 'Changes' },
  { key: 'approved', label: 'Approved' },
  { key: 'resolved', label: 'Resolved' },
];

export default function PRTrackerScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const reduceMotion = useReducedMotion();
  const prs = usePRTrackerStore((s) => s.prs);
  const wipLimit = usePRTrackerStore((s) => s.wipLimit);
  const emergencySlotEnabled = usePRTrackerStore((s) => s.emergencySlotEnabled);
  const addPR = usePRTrackerStore((s) => s.addPR);
  const updatePR = usePRTrackerStore((s) => s.updatePR);
  const deletePR = usePRTrackerStore((s) => s.deletePR);
  const markReviewed = usePRTrackerStore((s) => s.markReviewed);
  const markAccepted = usePRTrackerStore((s) => s.markAccepted);
  const setReviewOutcome = usePRTrackerStore((s) => s.setReviewOutcome);
  const setReReviewed = usePRTrackerStore((s) => s.setReReviewed);
  const setChangesEverNeeded = usePRTrackerStore((s) => s.setChangesEverNeeded);
  const setStatus = usePRTrackerStore((s) => s.setStatus);
  const [filter, setFilter] = useState<PRStatus | 'all' | 'resolved'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInitialValues, setEditInitialValues] = useState<Record<string, unknown> | undefined>(undefined);

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
    setEditInitialValues(undefined);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((pr: TrackedPR) => {
    setEditingId(pr.id);
    setEditInitialValues({
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

  const handleDelete = useCallback(
    (pr: TrackedPR) => {
      crossAlert('Delete PR', `Remove "${pr.title}"?`, [
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
      if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      markReviewed(pr.id);
    },
    [markReviewed, reduceMotion],
  );

  const sessions = useSessionStore((s) => s.sessions);

  const handleStartReview = useCallback(
    (pr: TrackedPR) => {
      // Check for existing active sessions linked to this PR
      const activeSessions = Object.values(sessions).filter(
        (s) => s.linkedPRId === pr.id && !s.isComplete,
      );

      if (activeSessions.length > 0) {
        const session = activeSessions[0];
        const route = session.mode === 'polish'
          ? `/polish/${session.id}` as const
          : `/review/${session.id}` as const;
        crossAlert(
          'Active Session Found',
          `You have an in-progress session for this PR. Would you like to continue it?`,
          [
            { text: 'Continue Session', onPress: () => router.push(route) },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }

      const params = new URLSearchParams();
      if (pr.repo) params.set('repo', pr.repo);
      params.set('prId', pr.id);
      const query = params.toString();
      router.push(`/review/stack-select?${query}` as '/review/stack-select');
    },
    [router, sessions],
  );

  const handleCardPress = useCallback(
    (pr: TrackedPR) => {
      crossAlert(pr.title, 'What would you like to do?', [
        {
          text: 'Start Session',
          style: 'default',
          onPress: () => handleStartReview(pr),
        },
        {
          text: 'Edit PR',
          style: 'default',
          onPress: () => openEditModal(pr),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [openEditModal, handleStartReview],
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
              <View key={pr.id} style={styles.planRow}>
                <Pressable
                  style={styles.planRowBody}
                  onPress={() => handleStartReview(pr)}
                  accessibilityRole="button"
                  accessibilityLabel={`Start review for ${pr.title}`}
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
                </Pressable>
                <Pressable
                  style={[styles.planReviewBtn, pr.lastReviewedAt && isToday(pr.lastReviewedAt) && styles.planReviewBtnActive]}
                  onPress={() => handleMarkReviewed(pr)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${pr.title} as reviewed`}
                  accessibilityState={{ checked: !!(pr.lastReviewedAt && isToday(pr.lastReviewedAt)) }}
                >
                  <Text style={[styles.planReviewBtnText, pr.lastReviewedAt && isToday(pr.lastReviewedAt) && styles.planReviewBtnTextActive]}>
                    {pr.lastReviewedAt && isToday(pr.lastReviewedAt) ? '✓' : '○'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderPRCard = (pr: TrackedPR) => {
    const displayStatus = getPRDisplayStatus(pr);
    const statusColor = displayStatus.color;
    const subtitleParts = [
      pr.repo,
      pr.prNumber ? `#${pr.prNumber}` : null,
      pr.role === 'reviewer' && pr.prAuthor ? `by @${pr.prAuthor}` : null,
    ].filter(Boolean);
    const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' ') : null;
    const isReviewedToday = !!(pr.lastReviewedAt && isToday(pr.lastReviewedAt));

    return (
      <View key={pr.id} style={styles.prCard}>
        <View style={styles.prCardLeft}>
          <Pressable
            onPress={() => cycleStatus(pr)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Cycle status, currently ${PR_STATUS_LABELS[pr.status]}`}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </Pressable>
        </View>
        <Pressable
          style={styles.prCardCenter}
          onPress={() => handleCardPress(pr)}
          onLongPress={() => handleDelete(pr)}
          accessibilityRole="button"
          accessibilityLabel={`${pr.title}${subtitle ? ', ' + subtitle : ''}, ${displayStatus.label}`}
          accessibilityHint="Tap for actions, long press to delete"
        >
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
              {displayStatus.label}
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
        </Pressable>
        <Pressable
          onPress={() => handleCardPress(pr)}
          hitSlop={8}
          style={styles.prActionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${pr.title}`}
        >
          <Text style={styles.prActionBtnText}>...</Text>
        </Pressable>
        {/* Right side: radio buttons */}
        <View style={styles.prCardRight}>
          {/* Changes ever requested? (tracks review effectiveness) */}
          <View style={styles.radioGroup}>
            <Text style={styles.radioGroupLabel}>Changes?</Text>
            <View style={styles.radioOptions}>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setReviewOutcome(pr.id, 'requested-changes');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: pr.reviewOutcome === 'requested-changes' }}
                accessibilityLabel="Changes needed"
              >
                <View style={[
                  styles.radioCircle,
                  pr.reviewOutcome === 'requested-changes' && styles.radioCircleWarn,
                ]}>
                  {pr.reviewOutcome === 'requested-changes' && <View style={[styles.radioDot, styles.radioDotWarn]} />}
                </View>
                <Text style={[
                  styles.radioLabel,
                  pr.reviewOutcome === 'requested-changes' && styles.radioLabelWarn,
                ]}>Needed</Text>
              </Pressable>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setReviewOutcome(pr.id, 'no-changes-requested');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: pr.reviewOutcome === 'no-changes-requested' }}
                accessibilityLabel="No changes needed"
              >
                <View style={[
                  styles.radioCircle,
                  pr.reviewOutcome === 'no-changes-requested' && styles.radioCircleGood,
                ]}>
                  {pr.reviewOutcome === 'no-changes-requested' && <View style={[styles.radioDot, styles.radioDotGood]} />}
                </View>
                <Text style={[
                  styles.radioLabel,
                  pr.reviewOutcome === 'no-changes-requested' && styles.radioLabelGood,
                ]}>Not Needed</Text>
              </Pressable>
            </View>
          </View>
          {/* Reviewed: No / Yes — locked once in re-review mode */}
          <View style={[styles.radioGroup, pr.changesEverNeeded && styles.radioGroupLocked]}>
            <Text style={styles.radioGroupLabel}>Reviewed:</Text>
            <View style={styles.radioOptions}>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                disabled={!!pr.changesEverNeeded}
                onPress={() => {
                  void Haptics.selectionAsync();
                  if (isReviewedToday) {
                    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    markReviewed(pr.id);
                  }
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: !isReviewedToday, disabled: !!pr.changesEverNeeded }}
                accessibilityLabel="Not reviewed today"
              >
                <View style={[
                  styles.radioCircle,
                  !isReviewedToday && styles.radioCircleDim,
                ]}>
                  {!isReviewedToday && <View style={[styles.radioDot, styles.radioDotDim]} />}
                </View>
                <Text style={[
                  styles.radioLabel,
                  !isReviewedToday && styles.radioLabelDim,
                ]}>No</Text>
              </Pressable>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                disabled={!!pr.changesEverNeeded}
                onPress={() => {
                  void Haptics.selectionAsync();
                  if (!isReviewedToday) {
                    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    markReviewed(pr.id);
                  }
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isReviewedToday, disabled: !!pr.changesEverNeeded }}
                accessibilityLabel="Reviewed today"
              >
                <View style={[
                  styles.radioCircle,
                  isReviewedToday && styles.radioCircleGood,
                ]}>
                  {isReviewedToday && <View style={[styles.radioDot, styles.radioDotGood]} />}
                </View>
                <Text style={[
                  styles.radioLabel,
                  isReviewedToday && styles.radioLabelGood,
                ]}>Yes</Text>
              </Pressable>
            </View>
          </View>
          {/* Re-review: shown when changes were ever needed */}
          {pr.changesEverNeeded && (
            <View style={styles.radioGroup}>
              <Text style={styles.radioGroupLabel}>Re-review:</Text>
              <View style={styles.radioOptions}>
                <Pressable
                  style={styles.radioItem}
                  hitSlop={12}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    if (pr.reReviewed) setReReviewed(pr.id, false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !pr.reReviewed }}
                  accessibilityLabel="Not re-reviewed"
                >
                  <View style={[
                    styles.radioCircle,
                    !pr.reReviewed && styles.radioCircleDim,
                  ]}>
                    {!pr.reReviewed && <View style={[styles.radioDot, styles.radioDotDim]} />}
                  </View>
                  <Text style={[
                    styles.radioLabel,
                    !pr.reReviewed && styles.radioLabelDim,
                  ]}>No</Text>
                </Pressable>
                <Pressable
                  style={styles.radioItem}
                  hitSlop={12}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    if (!pr.reReviewed) setReReviewed(pr.id, true);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !!pr.reReviewed }}
                  accessibilityLabel="Re-reviewed after changes"
                >
                  <View style={[
                    styles.radioCircle,
                    pr.reReviewed && styles.radioCircleGood,
                  ]}>
                    {pr.reReviewed && <View style={[styles.radioDot, styles.radioDotGood]} />}
                  </View>
                  <Text style={[
                    styles.radioLabel,
                    pr.reReviewed && styles.radioLabelGood,
                  ]}>Yes</Text>
                </Pressable>
              </View>
            </View>
          )}
          {/* Changes were needed at some point (historical tracker) */}
          <View style={styles.radioGroup}>
            <Text style={styles.radioGroupLabel}>History:</Text>
            <View style={styles.radioOptions}>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setChangesEverNeeded(pr.id, !pr.changesEverNeeded);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!pr.changesEverNeeded }}
                accessibilityLabel="Changes were needed at some point"
              >
                <View style={[
                  styles.checkbox,
                  pr.changesEverNeeded && styles.checkboxCheckedWarn,
                ]}>
                  {pr.changesEverNeeded && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.radioLabel,
                  pr.changesEverNeeded && styles.radioLabelWarn,
                ]}>Changes needed</Text>
              </Pressable>
            </View>
          </View>
          {/* Outcome: Accepted / Abandoned checkboxes */}
          <View style={styles.radioGroup}>
            <Text style={styles.radioGroupLabel}>Outcome:</Text>
            <View style={styles.radioOptions}>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                onPress={() => {
                  void Haptics.selectionAsync();
                  markAccepted(pr.id, 'accepted-clean');
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: pr.acceptanceOutcome === 'accepted-clean' }}
                accessibilityLabel="PR accepted"
              >
                <View style={[
                  styles.checkbox,
                  pr.acceptanceOutcome === 'accepted-clean' && styles.checkboxCheckedGood,
                ]}>
                  {pr.acceptanceOutcome === 'accepted-clean' && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.radioLabel,
                  pr.acceptanceOutcome === 'accepted-clean' && styles.radioLabelGood,
                ]}>Accepted</Text>
              </Pressable>
              <Pressable
                style={styles.radioItem}
                hitSlop={12}
                onPress={() => {
                  void Haptics.selectionAsync();
                  markAccepted(pr.id, 'abandoned');
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: pr.acceptanceOutcome === 'abandoned' }}
                accessibilityLabel="PR abandoned"
              >
                <View style={[
                  styles.checkbox,
                  pr.acceptanceOutcome === 'abandoned' && styles.checkboxCheckedMuted,
                ]}>
                  {pr.acceptanceOutcome === 'abandoned' && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.radioLabel,
                  pr.acceptanceOutcome === 'abandoned' && styles.radioLabelMuted,
                ]}>Abandoned</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} keyboardShouldPersistTaps="handled">
        {renderWipGauge()}
        {renderTodaysPlan()}
        {renderDailyProgress()}

        {/* Filter chips */}
        <View style={styles.filterRow}>
          <FilterChips chips={STATUS_FILTERS} selected={filter} onSelect={setFilter} />
        </View>

        {/* Add button */}
        <Pressable
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={openAddModal}
          accessibilityRole="button"
          accessibilityLabel="Add a PR"
        >
          <Text style={styles.addButtonText}>+ Add PR</Text>
        </Pressable>

        {/* My PRs */}
        {authoredPRs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">My PRs</Text>
            {authoredPRs.map(renderPRCard)}
          </View>
        )}

        {/* Reviewing */}
        {reviewPRs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Reviewing</Text>
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
        <AppFooter />
      </ScrollView>
      </DesktopContainer>

      {/* Add/Edit Modal */}
      <AddPRModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={(data) => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (editingId) {
            updatePR(editingId, data);
          } else {
            addPR(data);
          }
        }}
        showEmergency
        showNotes
        title={editingId ? 'Edit PR' : 'Add PR'}
        saveLabel={editingId ? 'Update' : 'Add PR'}
        initialValues={editInitialValues}
      />
    </SafeAreaView>
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
  planRowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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

  planReviewBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.looksGood,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: spacing.sm,
  },
  planReviewBtnActive: {
    backgroundColor: colors.looksGood + '20',
  },
  planReviewBtnText: {
    fontSize: fontSizes.sm,
    color: colors.looksGood,
    fontWeight: '700' as const,
  },
  planReviewBtnTextActive: {
    color: colors.looksGood,
  },

  // Filters
  filterRow: { marginBottom: spacing.md },

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
    alignItems: 'flex-start',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden' as const,
  },
  prActionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  prActionBtnText: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    fontWeight: '700',
    lineHeight: 20,
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

  // Right-side radio buttons
  prCardRight: {
    marginLeft: spacing.sm,
    gap: 6,
  },
  radioGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  radioGroupLocked: {
    opacity: 0.5,
  },
  radioGroupLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '600' as const,
    width: 62,
  },
  radioOptions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  radioItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingVertical: 4,
    minHeight: 32,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioCircleGood: {
    borderColor: colors.looksGood,
  },
  radioCircleWarn: {
    borderColor: colors.warning,
  },
  radioCircleDim: {
    borderColor: colors.textMuted,
  },
  radioCircleMuted: {
    borderColor: colors.textMuted,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioDotGood: {
    backgroundColor: colors.looksGood,
  },
  radioDotWarn: {
    backgroundColor: colors.warning,
  },
  radioDotDim: {
    backgroundColor: colors.textMuted,
  },
  radioDotMuted: {
    backgroundColor: colors.textMuted,
  },
  radioLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },
  radioLabelGood: {
    color: colors.looksGood,
    fontWeight: '600' as const,
  },
  radioLabelWarn: {
    color: colors.warning,
    fontWeight: '600' as const,
  },
  radioLabelDim: {
    color: colors.textMuted,
  },
  radioLabelMuted: {
    color: colors.textMuted,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxCheckedGood: {
    backgroundColor: colors.looksGood + '25',
    borderColor: colors.looksGood,
  },
  checkboxCheckedWarn: {
    backgroundColor: colors.warning + '25',
    borderColor: colors.warning,
  },
  checkboxCheckedMuted: {
    backgroundColor: colors.textMuted + '25',
    borderColor: colors.textMuted,
  },
  checkmark: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700' as const,
    marginTop: -1,
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

});
