import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '../../src/store/useSessionStore';
import { getStackInfo } from '../../src/data/checklistRegistry';
import type { StackId } from '../../src/data/types';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function ReviewSessionsScreen() {
  const router = useRouter();
  const { stack } = useLocalSearchParams<{ stack: string }>();
  const stackId = stack as StackId;
  const stackInfo = getStackInfo(stackId);

  const sessions = useSessionStore((s) => s.getSessionsByMode('review', stackId));
  const createSession = useSessionStore((s) => s.createSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  const activeSessions = sessions.filter((s) => !s.isComplete);
  const completedSessions = sessions.filter((s) => s.isComplete);

  const handleNewSession = () => {
    const id = createSession('review', stackId);
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
        <Text style={styles.stackIcon}>{stackInfo.icon}</Text>
        <Text style={styles.heading}>{stackInfo.title}</Text>
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

      {sessions.length === 0 && (
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
