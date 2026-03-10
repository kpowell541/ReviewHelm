import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { crossAlert } from '../../src/utils/alert';
import { useSessionStore } from '../../src/store/useSessionStore';
import { usePRTrackerStore } from '../../src/store/usePRTrackerStore';
import type { TrackedPR, StackId } from '../../src/data/types';
import { StackLogo } from '../../src/components/StackLogo';
import { PR_ACTIVE_STATUSES } from '../../src/data/types';
import { PRPickerModal } from '../../src/components/PRPickerModal';
import { EmptyState } from '../../src/components/EmptyState';
import { STACKS } from '../../src/data/checklistRegistry';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';
import { useResponsive } from '../../src/hooks/useResponsive';
import { AddPRModal } from '../../src/components/AddPRModal';
import { ModalShell } from '../../src/components/ModalShell';

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

  const handleDelete = (sessionId: string, title: string) => {
    crossAlert('Delete Session', `Delete "${title}"?`, [
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
          <EmptyState message="No sessions yet. Start polishing your next PR!" />
        )}
      </ScrollView>
      </DesktopContainer>

      {/* PR Picker Modal */}
      <PRPickerModal
        visible={showPRPicker}
        onClose={() => setShowPRPicker(false)}
        title="Which PR are you polishing?"
        prs={authorPRs}
        onSelectPR={handleSelectPR}
        onSkip={handleSkipPR}
        onShowAddPR={() => setShowAddPR(true)}
        addLabel="+ Add My PR"
        accentColor={colors.polishMode}
      />

      {/* Stack Picker Modal */}
      <ModalShell
        visible={showStackPicker}
        onClose={() => setShowStackPicker(false)}
        title="What stack is this PR in?"
      >
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
      </ModalShell>

      {/* Add PR Modal */}
      <AddPRModal
        visible={showAddPR}
        onClose={() => setShowAddPR(false)}
        onSave={(data) => {
          addPR(data);
        }}
        fixedRole="author"
        showPriority={false}
        title="Add My PR"
        saveButtonColor={colors.polishMode}
      />
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

  // Stack Picker shared
  prList: { maxHeight: 300 },
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
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },

  // Stack Picker
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
