import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '../../src/store/useSessionStore';
import { useRepoConfigStore } from '../../src/store/useRepoConfigStore';
import { usePRTrackerStore } from '../../src/store/usePRTrackerStore';
import { getStackInfo } from '../../src/data/checklistRegistry';
import type { StackId, PRRole, PRSize, PRPriority, CIPassing, PRDependency, TrackedPR } from '../../src/data/types';
import { PR_ACTIVE_STATUSES, PR_SIZE_LABELS, PR_PRIORITY_LABELS, PR_PRIORITY_ORDER } from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';
import { useResponsive } from '../../src/hooks/useResponsive';
import { StackLogo } from '../../src/components/StackLogo';

export default function ReviewSessionsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { stack, stacks, sections, repo } = useLocalSearchParams<{
    stack?: string;
    stacks?: string;
    sections?: string;
    repo?: string;
  }>();
  const saveRepoConfig = useRepoConfigStore((s) => s.saveRepoConfig);

  const stackIds: StackId[] = useMemo(() => {
    if (stacks) return stacks.split(',') as StackId[];
    if (stack) return [stack as StackId];
    return [];
  }, [stack, stacks]);

  const selectedSections = useMemo(
    () => (sections ? sections.split(',') : undefined),
    [sections],
  );

  const isMultiStack = stackIds.length > 1;
  const firstStackInfo = stackIds.length > 0 ? getStackInfo(stackIds[0]) : null;
  const headerTitle = isMultiStack
    ? stackIds.map((id) => getStackInfo(id).shortTitle).join(' + ')
    : firstStackInfo?.title ?? 'Review';
  const headerStackId = isMultiStack ? null : stackIds[0] ?? null;
  const headerFallbackIcon = isMultiStack ? '📚' : firstStackInfo?.icon ?? '🔍';

  const rawSessions = useSessionStore((s) => s.sessions);
  const createSession = useSessionStore((s) => s.createSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  const prs = usePRTrackerStore((s) => s.prs);
  const addPR = usePRTrackerStore((s) => s.addPR);
  const linkSession = usePRTrackerStore((s) => s.linkSession);

  const [showPRPicker, setShowPRPicker] = useState(false);
  const [showAddPR, setShowAddPR] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    url: '',
    role: 'reviewer' as PRRole,
    size: 'medium' as PRSize,
    priority: 'medium' as PRPriority,
    repo: '',
    prNumber: '',
    prAuthor: '',
    dependencies: [] as PRDependency[],
    ciPassing: 'unknown' as CIPassing,
  });
  const [depForm, setDepForm] = useState({ repo: '', prNumber: '', title: '' });

  const activePRs = useMemo(() => {
    return Object.values(prs)
      .filter((pr) => PR_ACTIVE_STATUSES.includes(pr.status) && pr.role === 'reviewer')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [prs]);

  const allSessions = useMemo(() => {
    return Object.values(rawSessions)
      .filter((sess) => {
        if (sess.mode !== 'review') return false;
        const effective = sess.stackIds?.length
          ? sess.stackIds
          : sess.stackId
            ? [sess.stackId]
            : [];
        if (isMultiStack) {
          return (
            stackIds.length === effective.length &&
            stackIds.every((id) => effective.includes(id))
          );
        }
        return effective.includes(stackIds[0]);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [rawSessions, stackIds, isMultiStack]);

  const activeSessions = useMemo(() => allSessions.filter((s) => !s.isComplete), [allSessions]);
  const completedSessions = useMemo(() => allSessions.filter((s) => s.isComplete), [allSessions]);

  const handleNewSession = () => {
    setShowPRPicker(true);
  };

  const handleSelectPR = (pr: TrackedPR) => {
    setShowPRPicker(false);
    const sessionId = createSession('review', stackIds, undefined, selectedSections, pr.id);
    linkSession(pr.id, sessionId);
    if (repo) saveRepoConfig(repo, stackIds, selectedSections);
    router.push(`/review/${sessionId}`);
  };

  const handleSkipPR = () => {
    setShowPRPicker(false);
    const sessionId = createSession('review', stackIds, undefined, selectedSections);
    if (repo) saveRepoConfig(repo, stackIds, selectedSections);
    router.push(`/review/${sessionId}`);
  };

  const handleSaveNewPR = useCallback(() => {
    if (!addForm.title.trim()) return;
    addPR({
      title: addForm.title.trim(),
      url: addForm.url.trim() || undefined,
      role: addForm.role,
      priority: addForm.priority,
      size: addForm.size,
      repo: addForm.repo.trim() || undefined,
      prNumber: addForm.prNumber ? parseInt(addForm.prNumber, 10) || undefined : undefined,
      prAuthor: addForm.role === 'author' ? 'Me' : (addForm.prAuthor.trim() || undefined),
      dependencies: addForm.dependencies.length > 0 ? addForm.dependencies : undefined,
      ciPassing: addForm.ciPassing !== 'unknown' ? addForm.ciPassing : undefined,
    });
    setAddForm({ title: '', url: '', role: 'reviewer', size: 'medium', priority: 'medium', repo: '', prNumber: '', prAuthor: '', dependencies: [], ciPassing: 'unknown' });
    setDepForm({ repo: '', prNumber: '', title: '' });
    setShowAddPR(false);
  }, [addForm, addPR]);

  const handleDelete = (sessionId: string, title: string) => {
    Alert.alert('Delete Session', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSession(sessionId),
      },
    ]);
  };

  const getPRTitle = (prId: string | undefined) => {
    if (!prId) return null;
    const pr = prs[prId];
    return pr ? pr.title : null;
  };

  return (
    <View style={styles.container}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <View style={styles.header}>
          <StackLogo stackId={headerStackId ?? ''} fallbackIcon={headerFallbackIcon} size={32} style={{ marginRight: spacing.sm }} />
          <Text style={styles.heading}>{headerTitle}</Text>
        </View>

        <Pressable
          onPress={handleNewSession}
          style={({ pressed }) => [
            styles.newButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.newButtonText}>+ New Review Session</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowAddPR(true)}
          style={({ pressed }) => [
            styles.addPRButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.addPRButtonText}>+ Add a PR to Review</Text>
        </Pressable>

        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active</Text>
            {activeSessions.map((session) => {
              const prTitle = getPRTitle(session.linkedPRId);
              return (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/review/${session.id}`)}
                  onLongPress={() => handleDelete(session.id, session.title)}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  {prTitle && (
                    <Text style={styles.sessionPR} numberOfLines={1}>PR: {prTitle}</Text>
                  )}
                  <Text style={styles.sessionMeta}>
                    {Object.keys(session.itemResponses).length} items reviewed
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {completedSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedSessions.map((session) => {
              const prTitle = getPRTitle(session.linkedPRId);
              return (
                <Pressable
                  key={session.id}
                  onPress={() =>
                    router.push(`/session-summary/${session.id}`)
                  }
                  onLongPress={() => handleDelete(session.id, session.title)}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    styles.completedCard,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  {prTitle && (
                    <Text style={styles.sessionPR} numberOfLines={1}>PR: {prTitle}</Text>
                  )}
                  <Text style={styles.sessionMeta}>
                    {session.completedAt
                      ? new Date(session.completedAt).toLocaleDateString()
                      : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {allSessions.length === 0 && (
          <Text style={styles.empty}>
            No sessions yet. Tap above to start your first review!
          </Text>
        )}
      </ScrollView>
      </DesktopContainer>

      {/* PR Picker Modal — shown when starting a new session */}
      <Modal
        visible={showPRPicker}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setShowPRPicker(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}
          onPress={() => setShowPRPicker(false)}
        >
          <Pressable style={[styles.modalCard, isDesktop && styles.modalCardDesktop]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Which PR is this session for?</Text>

            {activePRs.length === 0 ? (
              <View style={styles.emptyPRsContainer}>
                <Text style={styles.emptyPRs}>
                  No tracked PRs to review yet.
                </Text>
                <Pressable
                  onPress={() => { setShowPRPicker(false); setShowAddPR(true); }}
                  style={({ pressed }) => [styles.addPRInlineButton, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.addPRInlineText}>+ Add a PR</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.prList} showsVerticalScrollIndicator={false}>
                {activePRs.map((pr) => {
                  const subtitle = [pr.repo, pr.prNumber ? `#${pr.prNumber}` : null, pr.prAuthor ? `by @${pr.prAuthor}` : null]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <Pressable
                      key={pr.id}
                      onPress={() => handleSelectPR(pr)}
                      style={({ pressed }) => [
                        styles.prPickerCard,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <View style={styles.prPickerInfo}>
                        <Text style={styles.prPickerTitle} numberOfLines={1}>{pr.title}</Text>
                        {subtitle ? (
                          <Text style={styles.prPickerSubtitle} numberOfLines={1}>{subtitle}</Text>
                        ) : null}
                      </View>
                      <View style={styles.prPickerBadges}>
                        {pr.size && (
                          <Text style={styles.prSizeBadge}>{PR_SIZE_LABELS[pr.size]}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.pickerButtons}>
              <Pressable onPress={handleSkipPR} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip — no PR</Text>
              </Pressable>
              <Pressable onPress={() => setShowPRPicker(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add PR Modal */}
      <Modal
        visible={showAddPR}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setShowAddPR(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}
          onPress={() => setShowAddPR(false)}
        >
          <Pressable style={[styles.modalCard, isDesktop && styles.modalCardDesktop]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add a PR</Text>

              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.chipRow}>
                {(['reviewer', 'author'] as PRRole[]).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, addForm.role === r && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({
                      ...f,
                      role: r,
                      prAuthor: r === 'author' ? 'Me' : '',
                    }))}
                  >
                    <Text style={[styles.chipText, addForm.role === r && styles.chipTextActive]}>
                      {r === 'author' ? 'My PR' : 'Reviewing'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={addForm.title}
                onChangeText={(v) => setAddForm((f) => ({ ...f, title: v }))}
                placeholder="PR title"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <Text style={styles.fieldLabel}>URL</Text>
              <TextInput
                style={styles.input}
                value={addForm.url}
                onChangeText={(v) => setAddForm((f) => ({ ...f, url: v }))}
                placeholder="https://github.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.fieldLabel}>Repo</Text>
              <TextInput
                style={styles.input}
                value={addForm.repo}
                onChangeText={(v) => setAddForm((f) => ({ ...f, repo: v }))}
                placeholder="org/repo-name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <View style={styles.fieldRowSplit}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>PR #</Text>
                  <TextInput
                    style={styles.input}
                    value={addForm.prNumber}
                    onChangeText={(v) => setAddForm((f) => ({ ...f, prNumber: v }))}
                    placeholder="1234"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                {addForm.role === 'reviewer' && (
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Author</Text>
                    <TextInput
                      style={styles.input}
                      value={addForm.prAuthor}
                      onChangeText={(v) => setAddForm((f) => ({ ...f, prAuthor: v }))}
                      placeholder="username"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>

              <Text style={styles.fieldLabel}>Size</Text>
              <View style={styles.chipRow}>
                {(['small', 'medium', 'large'] as PRSize[]).map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.chip, addForm.size === s && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({ ...f, size: s }))}
                  >
                    <Text style={[styles.chipText, addForm.size === s && styles.chipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.chipRow}>
                {PR_PRIORITY_ORDER.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, addForm.priority === p && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({ ...f, priority: p }))}
                  >
                    <Text style={[styles.chipText, addForm.priority === p && styles.chipTextActive]}>
                      {PR_PRIORITY_LABELS[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Build Passing?</Text>
              <View style={styles.chipRow}>
                {(['yes', 'no', 'unknown'] as CIPassing[]).map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.chip, addForm.ciPassing === v && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({ ...f, ciPassing: v }))}
                  >
                    <Text style={[styles.chipText, addForm.ciPassing === v && styles.chipTextActive]}>
                      {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Unknown'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Dependencies</Text>
              {addForm.dependencies.map((dep, idx) => (
                <View key={idx} style={styles.depRow}>
                  <Text style={styles.depText}>
                    {dep.repo} #{dep.prNumber}{dep.title ? ` — ${dep.title}` : ''}
                  </Text>
                  <Pressable onPress={() => setAddForm((f) => ({
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
                    setAddForm((f) => ({
                      ...f,
                      dependencies: [...f.dependencies, { repo: depForm.repo.trim(), prNumber: num, title: depForm.title.trim() || undefined }],
                    }));
                    setDepForm({ repo: '', prNumber: '', title: '' });
                  }}
                >
                  <Text style={styles.depAddBtnText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.modalButtons}>
                <Pressable onPress={() => setShowAddPR(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNewPR}
                  style={[styles.saveButton, !addForm.title.trim() && { opacity: 0.4 }]}
                >
                  <Text style={styles.saveButtonText}>Add PR</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  contentDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  stackIcon: { fontSize: 28, marginRight: spacing.sm },
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  newButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  newButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  addPRButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  addPRButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  section: { marginBottom: spacing['2xl'] },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  completedCard: { opacity: 0.7 },
  sessionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  sessionPR: {
    fontSize: fontSizes.sm,
    color: colors.reviewMode,
    marginTop: 2,
  },
  sessionMeta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },

  // Modals
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

  // PR Picker
  prList: { maxHeight: 300 },
  emptyPRsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyPRs: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  addPRInlineButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  addPRInlineText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  prPickerCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  prPickerInfo: { flex: 1 },
  prPickerTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  prPickerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  prPickerBadges: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: spacing.sm,
  },
  prSizeBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.reviewMode + '25',
    color: colors.reviewMode,
    overflow: 'hidden',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },

  // Add PR form
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
  fieldRowSplit: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: { flex: 1 },
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
  depText: { fontSize: fontSizes.sm, color: colors.textPrimary, flex: 1 },
  depRemove: { fontSize: fontSizes.sm, color: colors.error, fontWeight: '600', paddingHorizontal: spacing.sm },
  depInputRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  depAddBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  depAddBtnText: { fontSize: fontSizes.lg, fontWeight: '700', color: '#fff' },
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
