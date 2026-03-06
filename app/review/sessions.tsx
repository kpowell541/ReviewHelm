import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '../../src/store/useSessionStore';
import { useRepoConfigStore } from '../../src/store/useRepoConfigStore';
import { getStackInfo } from '../../src/data/checklistRegistry';
import type { StackId } from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function ReviewSessionsScreen() {
  const router = useRouter();
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
  const headerIcon = isMultiStack ? '📚' : firstStackInfo?.icon ?? '🔍';

  const rawSessions = useSessionStore((s) => s.sessions);
  const createSession = useSessionStore((s) => s.createSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

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
    const id = createSession('review', stackIds, undefined, selectedSections);
    if (repo) saveRepoConfig(repo, stackIds, selectedSections);
    router.push(`/review/${id}`);
  };

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.stackIcon}>{headerIcon}</Text>
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

      {activeSessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active</Text>
          {activeSessions.map((session) => (
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
              <Text style={styles.sessionMeta}>
                {Object.keys(session.itemResponses).length} items reviewed
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {completedSessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completedSessions.map((session) => (
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
              <Text style={styles.sessionMeta}>
                ✅ {session.completedAt
                  ? new Date(session.completedAt).toLocaleDateString()
                  : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {allSessions.length === 0 && (
        <Text style={styles.empty}>
          No sessions yet. Tap above to start your first review!
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
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
    marginBottom: spacing['2xl'],
  },
  newButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
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
});
