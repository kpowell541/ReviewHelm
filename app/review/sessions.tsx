import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { crossAlert } from '../../src/utils/alert';
import { useSessionStore } from '../../src/store/useSessionStore';
import { useRepoConfigStore } from '../../src/store/useRepoConfigStore';
import { usePRTrackerStore } from '../../src/store/usePRTrackerStore';
import { getStackInfo } from '../../src/data/checklistRegistry';
import type { StackId, TrackedPR } from '../../src/data/types';
import { PR_ACTIVE_STATUSES } from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';
import { useResponsive } from '../../src/hooks/useResponsive';
import { StackLogo } from '../../src/components/StackLogo';
import { AddPRModal } from '../../src/components/AddPRModal';
import { PRPickerModal } from '../../src/components/PRPickerModal';
import { EmptyState } from '../../src/components/EmptyState';

export default function ReviewSessionsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { stack, stacks, sections, repo, prId, mode } = useLocalSearchParams<{
    stack?: string;
    stacks?: string;
    sections?: string;
    repo?: string;
    prId?: string;
    mode?: string;
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

  // When navigating with a pre-selected PR (from PR Tracker or Polish), skip
  // the PR picker and create the session immediately. Session mode is
  // determined by the PR's role: author → polish, reviewer → review.
  // An explicit `mode` param overrides this (e.g. when skipping PR selection).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || stackIds.length === 0) return;
    if (!prId && !mode) return;

    const pr = prId ? prs[prId] : undefined;
    if (prId && !pr) return;

    autoStarted.current = true;
    const sessionMode = mode === 'polish' || pr?.role === 'author' ? 'polish' : 'review';
    const sessionId = createSession(sessionMode, stackIds, undefined, selectedSections, pr?.id);
    if (pr) linkSession(pr.id, sessionId);
    if (repo) saveRepoConfig(repo, stackIds, selectedSections);
    const route = sessionMode === 'polish' ? `/polish/${sessionId}` : `/review/${sessionId}`;
    router.replace(route);
  }, [prId, mode, stackIds, selectedSections, prs, createSession, linkSession, saveRepoConfig, repo, router]);

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

  const handleStartWithExistingPr = () => {
    setShowPRPicker(true);
  };

  const handleSelectPR = (pr: TrackedPR) => {
    setShowPRPicker(false);
    const sessionMode = mode === 'polish' || pr.role === 'author' ? 'polish' : 'review';
    const sessionId = createSession(sessionMode, stackIds, undefined, selectedSections, pr.id);
    linkSession(pr.id, sessionId);
    if (repo) saveRepoConfig(repo, stackIds, selectedSections);
    const route = sessionMode === 'polish' ? `/polish/${sessionId}` : `/review/${sessionId}`;
    router.push(route);
  };

  const handleSkipPR = () => {
    setShowPRPicker(false);
    const sessionMode = mode === 'polish' ? 'polish' : 'review';
    const sessionId = createSession(sessionMode, stackIds, undefined, selectedSections);
    if (repo) saveRepoConfig(repo, stackIds, selectedSections);
    const route = sessionMode === 'polish' ? `/polish/${sessionId}` : `/review/${sessionId}`;
    router.push(route);
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
          <StackLogo stackId={headerStackId ?? ''} fallbackIcon={headerFallbackIcon} size={32} style={{ marginRight: spacing.sm }} />
          <Text style={styles.heading}>{headerTitle}</Text>
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
          <Text style={styles.addPRButtonText}>Add a new PR to review</Text>
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
          <EmptyState message="No sessions yet. Tap above to start your first review!" />
        )}
      </ScrollView>
      </DesktopContainer>

      {/* PR Picker Modal — shown when starting a new session */}
      <PRPickerModal
        visible={showPRPicker}
        onClose={() => setShowPRPicker(false)}
        title="Which PR is this session for?"
        prs={activePRs}
        onSelectPR={handleSelectPR}
        onSkip={handleSkipPR}
        onShowAddPR={() => setShowAddPR(true)}
      />

      {/* Add PR Modal */}
      <AddPRModal
        visible={showAddPR}
        onClose={() => setShowAddPR(false)}
        onSave={(data) => {
          addPR(data);
        }}
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
    color: colors.reviewMode,
    marginTop: 2,
  },
  sessionMeta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
