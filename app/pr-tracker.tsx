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
import * as Haptics from 'expo-haptics';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import type {
  PRStatus,
  PRRole,
  PRSize,
  PRPriority,
  TrackedPR,
} from '../src/data/types';
import { PR_STATUS_LABELS, PR_SIZE_LABELS } from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';

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

const EMPTY_FORM = {
  title: '',
  url: '',
  role: 'reviewer' as PRRole,
  priority: 'normal' as PRPriority,
  isEmergency: false,
  size: 'medium' as PRSize,
  repo: '',
  prNumber: '',
  prAuthor: '',
  notes: '',
};

export default function PRTrackerScreen() {
  const store = usePRTrackerStore();
  const [filter, setFilter] = useState<PRStatus | 'all' | 'resolved'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const wipStatus = store.getWipStatus();
  const dailyProgress = store.getDailyReviewProgress();

  const filteredPRs = useMemo(() => {
    if (filter === 'all') return store.getActivePRs();
    if (filter === 'resolved') return store.getResolvedPRs();
    return store.getPRsByStatus(filter).filter((pr) =>
      filter === 'approved' ? true : true,
    );
  }, [filter, store.prs]);

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
      priority: form.role === 'author' ? form.priority : ('normal' as PRPriority),
      isEmergency: form.role === 'author' ? form.isEmergency : false,
      size: form.role === 'reviewer' ? form.size : undefined,
      repo: form.role === 'reviewer' && form.repo.trim() ? form.repo.trim() : undefined,
      prNumber: form.role === 'reviewer' && form.prNumber ? parseInt(form.prNumber, 10) || undefined : undefined,
      prAuthor: form.role === 'reviewer' && form.prAuthor.trim() ? form.prAuthor.trim() : undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      store.updatePR(editingId, prData);
    } else {
      store.addPR(prData);
    }
    setShowModal(false);
  }, [form, editingId, store]);

  const handleDelete = useCallback(
    (pr: TrackedPR) => {
      Alert.alert('Delete PR', `Remove "${pr.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            store.deletePR(pr.id);
          },
        },
      ]);
    },
    [store],
  );

  const handleMarkReviewed = useCallback(
    (pr: TrackedPR) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      store.markReviewed(pr.id);
    },
    [store],
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
      store.setStatus(pr.id, next);
    },
    [store],
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

  const renderPRCard = (pr: TrackedPR) => {
    const statusColor = STATUS_COLORS[pr.status];
    const subtitle =
      pr.role === 'reviewer' && (pr.repo || pr.prNumber || pr.prAuthor)
        ? [pr.repo, pr.prNumber ? `#${pr.prNumber}` : null, pr.prAuthor ? `by @${pr.prAuthor}` : null]
            .filter(Boolean)
            .join(' ')
        : null;

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
            {pr.role === 'reviewer' && pr.size && (
              <Text style={[styles.badge, styles.sizeBadge]}>
                {PR_SIZE_LABELS[pr.size]}
              </Text>
            )}
            {pr.isEmergency && (
              <Text style={[styles.badge, styles.emergencyBadge]}>
                HOTFIX
              </Text>
            )}
          </View>
        </View>
        {pr.role === 'reviewer' && (
          <Pressable
            style={styles.reviewButton}
            onPress={() => handleMarkReviewed(pr)}
            hitSlop={6}
          >
            <Text style={styles.reviewButtonText}>
              {pr.lastReviewedAt && isToday(pr.lastReviewedAt) ? '✓' : '○'}
            </Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {renderWipGauge()}
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

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
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

              {/* Reviewer-only fields */}
              {form.role === 'reviewer' && (
                <>
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
                  </View>

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
                <>
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.chipRow}>
                    {(['low', 'normal', 'high'] as PRPriority[]).map((p) => (
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
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.fieldLabel}>Emergency / Hotfix</Text>
                    <Switch
                      value={form.isEmergency}
                      onValueChange={(v) => setForm((f) => ({ ...f, isEmergency: v }))}
                      trackColor={{ false: colors.border, true: colors.error }}
                    />
                  </View>
                </>
              )}

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
          </View>
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
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
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
