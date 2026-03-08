import { useState, useMemo, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { useSessionStore } from '../../src/store/useSessionStore';
import { usePRTrackerStore } from '../../src/store/usePRTrackerStore';
import type { TrackedPR, PRSize, CIPassing, PRDependency, StackId } from '../../src/data/types';
import { StackLogo } from '../../src/components/StackLogo';
import { PR_ACTIVE_STATUSES, PR_SIZE_LABELS } from '../../src/data/types';
import { STACKS } from '../../src/data/checklistRegistry';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function PolishSessionsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const allSessions = useSessionStore((s) => s.sessions);
  const createSession = useSessionStore((s) => s.createSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  const prs = usePRTrackerStore((s) => s.prs);
  const addPR = usePRTrackerStore((s) => s.addPR);
  const linkSession = usePRTrackerStore((s) => s.linkSession);

  const [showPRPicker, setShowPRPicker] = useState(false);
  const [showStackPicker, setShowStackPicker] = useState(false);
  const [pendingPRId, setPendingPRId] = useState<string | undefined>(undefined);
  const [selectedStacks, setSelectedStacks] = useState<StackId[]>([]);
  const [showAddPR, setShowAddPR] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    url: '',
    size: 'medium' as PRSize,
    repo: '',
    prNumber: '',
    dependencies: [] as PRDependency[],
    ciPassing: 'unknown' as CIPassing,
  });
  const [depForm, setDepForm] = useState({ repo: '', prNumber: '', title: '' });

  const authorPRs = useMemo(() => {
    return Object.values(prs)
      .filter((pr) => PR_ACTIVE_STATUSES.includes(pr.status) && pr.role === 'author' && !pr.archivedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [prs]);

  const sessions = useMemo(
    () => Object.values(allSessions).filter((s) => s.mode === 'polish'),
    [allSessions],
  );
  const activeSessions = useMemo(() => sessions.filter((s) => !s.isComplete), [sessions]);
  const completedSessions = useMemo(() => sessions.filter((s) => s.isComplete), [sessions]);

  const handleStartWithExistingPr = () => {
    setShowPRPicker(true);
  };

  const handleSelectPR = (pr: TrackedPR) => {
    setShowPRPicker(false);
    setPendingPRId(pr.id);
    setSelectedStacks([]);
    setShowStackPicker(true);
  };

  const handleSkipPR = () => {
    setShowPRPicker(false);
    setPendingPRId(undefined);
    setSelectedStacks([]);
    setShowStackPicker(true);
  };

  const toggleStack = (stackId: StackId) => {
    setSelectedStacks((prev) =>
      prev.includes(stackId)
        ? prev.filter((id) => id !== stackId)
        : [...prev, stackId],
    );
  };

  const handleStartPolish = () => {
    setShowStackPicker(false);
    const stacks = selectedStacks.length > 0 ? selectedStacks : undefined;
    const sessionId = createSession('polish', stacks, undefined, undefined, pendingPRId);
    if (pendingPRId) linkSession(pendingPRId, sessionId);
    router.push(`/polish/${sessionId}`);
  };

  const handleSaveNewPR = useCallback(() => {
    if (!addForm.title.trim()) return;
    addPR({
      title: addForm.title.trim(),
      url: addForm.url.trim() || undefined,
      role: 'author',
      size: addForm.size,
      repo: addForm.repo.trim() || undefined,
      prNumber: addForm.prNumber ? parseInt(addForm.prNumber, 10) || undefined : undefined,
      prAuthor: 'Me',
      dependencies: addForm.dependencies.length > 0 ? addForm.dependencies : undefined,
      ciPassing: addForm.ciPassing !== 'unknown' ? addForm.ciPassing : undefined,
    });
    setAddForm({ title: '', url: '', size: 'medium', repo: '', prNumber: '', dependencies: [], ciPassing: 'unknown' });
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
          <Text style={styles.icon}>✨</Text>
          <Text style={styles.heading}>Polish My PR</Text>
        </View>

        <Pressable
          onPress={handleStartWithExistingPr}
          style={({ pressed }) => [
            styles.newButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.newButtonText}>Start a new session with an existing PR</Text>
        </Pressable>

        <Text style={styles.orText}>OR</Text>

        <Pressable
          onPress={() => setShowAddPR(true)}
          style={({ pressed }) => [
            styles.addPRButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.addPRButtonText}>Add my PR</Text>
        </Pressable>

        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active</Text>
            {activeSessions.map((session) => {
              const prTitle = getPRTitle(session.linkedPRId);
              return (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/polish/${session.id}`)}
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

        {sessions.length === 0 && (
          <Text style={styles.empty}>
            No sessions yet. Start polishing your next PR!
          </Text>
        )}
      </ScrollView>
      </DesktopContainer>

      {/* PR Picker Modal */}
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
            <Text style={styles.modalTitle}>Which PR are you polishing?</Text>

            {authorPRs.length === 0 ? (
              <View style={styles.emptyPRsContainer}>
                <Text style={styles.emptyPRs}>No PRs tracked as yours yet.</Text>
                <Pressable
                  onPress={() => { setShowPRPicker(false); setShowAddPR(true); }}
                  style={({ pressed }) => [styles.addPRInlineButton, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.addPRInlineText}>+ Add My PR</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.prList} showsVerticalScrollIndicator={false}>
                {authorPRs.map((pr) => {
                  const subtitle = [pr.repo, pr.prNumber ? `#${pr.prNumber}` : null]
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
                      {pr.size && (
                        <Text style={styles.prSizeBadge}>{PR_SIZE_LABELS[pr.size]}</Text>
                      )}
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

      {/* Stack Picker Modal */}
      <Modal
        visible={showStackPicker}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setShowStackPicker(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}
          onPress={() => setShowStackPicker(false)}
        >
          <Pressable style={[styles.modalCard, isDesktop && styles.modalCardDesktop]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>What stack is this PR in?</Text>
            <Text style={styles.stackHint}>
              Select stacks to include domain-specific checks alongside the polish checklist. Skip to use polish only.
            </Text>

            <ScrollView style={styles.prList} showsVerticalScrollIndicator={false}>
              {STACKS.map((stack) => {
                const selected = selectedStacks.includes(stack.id);
                return (
                  <Pressable
                    key={stack.id}
                    onPress={() => toggleStack(stack.id)}
                    style={({ pressed }) => [
                      styles.stackCard,
                      selected && { borderColor: stack.color, backgroundColor: stack.color + '15' },
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <StackLogo stackId={stack.id} fallbackIcon={stack.icon} size={24} style={{ marginRight: spacing.sm }} />
                    <View style={styles.stackInfo}>
                      <Text style={styles.stackTitle}>{stack.shortTitle}</Text>
                    </View>
                    {selected && <Text style={[styles.stackCheck, { color: stack.color }]}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.pickerButtons}>
              <Pressable onPress={handleStartPolish} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>
                  {selectedStacks.length === 0 ? 'Skip — polish only' : 'Start'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowStackPicker(false)} style={styles.cancelButton}>
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
              <Text style={styles.modalTitle}>Add My PR</Text>

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

              <Text style={styles.fieldLabel}>PR #</Text>
              <TextInput
                style={styles.input}
                value={addForm.prNumber}
                onChangeText={(v) => setAddForm((f) => ({ ...f, prNumber: v }))}
                placeholder="1234"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

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
  icon: { fontSize: 28, marginRight: spacing.sm },
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  newButton: {
    backgroundColor: colors.polishMode,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  newButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  orText: {
    textAlign: 'center',
    marginVertical: spacing.lg,
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
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
    color: colors.polishMode,
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
    backgroundColor: colors.polishMode,
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
  prSizeBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.polishMode + '25',
    color: colors.polishMode,
    overflow: 'hidden',
    marginLeft: spacing.sm,
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
    backgroundColor: colors.polishMode,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  stackHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  stackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stackIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  stackInfo: { flex: 1 },
  stackTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  stackCheck: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});
