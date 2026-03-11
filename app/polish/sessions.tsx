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
import type { TrackedPR } from '../../src/data/types';
import { PR_ACTIVE_STATUSES } from '../../src/data/types';
import { PRPickerModal } from '../../src/components/PRPickerModal';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';
import { useResponsive } from '../../src/hooks/useResponsive';
import { AddPRModal } from '../../src/components/AddPRModal';

export default function PolishSessionsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const allSessions = useSessionStore((s) => s.sessions);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  const prs = usePRTrackerStore((s) => s.prs);
  const addPR = usePRTrackerStore((s) => s.addPR);

  const [showPRPicker, setShowPRPicker] = useState(false);
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

    // Check for existing active sessions linked to this PR
    const existingActive = Object.values(allSessions).filter(
      (s) => s.linkedPRId === pr.id && !s.isComplete,
    );

    if (existingActive.length > 0) {
      const session = existingActive[0];
      const existingRoute = session.mode === 'polish'
        ? `/polish/${session.id}` as const
        : `/review/${session.id}` as const;
      crossAlert(
        'Active Session Found',
        `You have an in-progress session for this PR. Continue it or start a new one?`,
        [
          { text: 'Continue Session', onPress: () => router.push(existingRoute) },
          {
            text: 'Start New',
            onPress: () => {
              const params = new URLSearchParams();
              params.set('mode', 'polish');
              params.set('prId', pr.id);
              if (pr.repo) params.set('repo', pr.repo);
              router.push(`/review/stack-select?${params.toString()}` as '/review/stack-select');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    const params = new URLSearchParams();
    params.set('mode', 'polish');
    params.set('prId', pr.id);
    if (pr.repo) params.set('repo', pr.repo);
    router.push(`/review/stack-select?${params.toString()}` as '/review/stack-select');
  };

  const handleSkipPR = () => {
    setShowPRPicker(false);
    router.push('/review/stack-select?mode=polish' as '/review/stack-select');
  };

  const completeSession = useSessionStore((s) => s.completeSession);

  const handleSessionAction = (sessionId: string, title: string, isComplete: boolean) => {
    const actions: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [];
    if (!isComplete) {
      actions.push({
        text: 'Mark Complete',
        onPress: () => completeSession(sessionId),
      });
    }
    actions.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => deleteSession(sessionId),
    });
    actions.push({ text: 'Cancel', style: 'cancel' });
    crossAlert('Session Options', `"${title}"`, actions);
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
                  onLongPress={() => handleSessionAction(session.id, session.title, false)}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {prTitle && (
                        <Text style={styles.sessionPR} numberOfLines={1}>PR: {prTitle}</Text>
                      )}
                      <Text style={styles.sessionMeta}>
                        {Object.keys(session.itemResponses).length} items reviewed
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleSessionAction(session.id, session.title, false)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionBtnText}>...</Text>
                    </Pressable>
                  </View>
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
                  onLongPress={() => handleSessionAction(session.id, session.title, true)}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    styles.completedCard,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {prTitle && (
                        <Text style={styles.sessionPR} numberOfLines={1}>PR: {prTitle}</Text>
                      )}
                      <Text style={styles.sessionMeta}>
                        {session.completedAt
                          ? new Date(session.completedAt).toLocaleDateString()
                          : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleSessionAction(session.id, session.title, true)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionBtnText}>...</Text>
                    </Pressable>
                  </View>
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
        sessions={allSessions}
      />

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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
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
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  actionBtnText: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    fontWeight: '700',
    lineHeight: 20,
  },
});
