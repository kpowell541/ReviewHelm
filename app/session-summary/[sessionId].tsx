import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSessionStore } from '../../src/store/useSessionStore';
import {
  getChecklist,
  getPolishChecklist,
} from '../../src/data/checklistLoader';
import {
  getAllChecklistItems,
  CONFIDENCE_LABELS,
  CONFIDENCE_EMOJI,
} from '../../src/data/types';
import type { ConfidenceLevel } from '../../src/data/types';
import { computeSessionScores } from '../../src/utils/scoring';
import { generateReportCardHtml } from '../../src/pdf/generateReportCard';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function SessionSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const session = useSessionStore((s) => s.getSession(sessionId));
  const [exporting, setExporting] = useState(false);

  const checklist = useMemo(() => {
    if (!session) return null;
    return session.mode === 'polish'
      ? getPolishChecklist()
      : session.stackId
        ? getChecklist(session.stackId)
        : null;
  }, [session]);

  const allItems = useMemo(
    () => (checklist ? getAllChecklistItems(checklist) : []),
    [checklist],
  );

  const scores = useMemo(
    () => (session ? computeSessionScores(session, allItems) : null),
    [session, allItems],
  );

  const needsAttentionItems = useMemo(
    () =>
      allItems.filter(
        (item) =>
          session?.itemResponses[item.id]?.verdict === 'needs-attention',
      ),
    [allItems, session],
  );

  const lowConfidenceItems = useMemo(
    () =>
      allItems
        .filter((item) => {
          const r = session?.itemResponses[item.id];
          return r && r.confidence <= 2 && r.verdict !== 'na';
        })
        .sort((a, b) => {
          const ca = session!.itemResponses[a.id]?.confidence ?? 5;
          const cb = session!.itemResponses[b.id]?.confidence ?? 5;
          return ca - cb;
        }),
    [allItems, session],
  );

  const handleExportPdf = useCallback(async () => {
    if (!session || !scores) return;
    setExporting(true);
    try {
      const html = generateReportCardHtml({
        session,
        scores,
        allItems,
        stackTitle: checklist?.meta.title ?? 'Review',
      });
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Report Card',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      // User cancelled sharing — not an error
    } finally {
      setExporting(false);
    }
  }, [session, scores, allItems, checklist]);

  if (!session || !scores) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Session not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Text style={styles.title}>{session.title}</Text>
      <Text style={styles.subtitle}>
        {session.completedAt
          ? `Completed ${new Date(session.completedAt).toLocaleDateString()}`
          : 'In progress'}
        {' · '}
        {checklist?.meta.title}
      </Text>

      {/* Score Cards */}
      <View style={styles.scoreCards}>
        <ScoreCard
          value={`${scores.coverage}%`}
          label="Coverage"
          color={scores.coverage >= 80 ? colors.success : colors.warning}
        />
        <ScoreCard
          value={`${scores.confidence}%`}
          label="Confidence"
          color={scores.confidence >= 60 ? colors.success : colors.warning}
        />
        <ScoreCard
          value={`${scores.totalIssues}`}
          label="Issues"
          color={scores.totalIssues === 0 ? colors.success : colors.needsAttention}
        />
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Items reviewed</Text>
          <Text style={styles.progressValue}>
            {scores.itemsResponded} / {scores.applicableItems}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${scores.coverage}%` },
            ]}
          />
        </View>
      </View>

      {/* Issues Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Issues by Severity</Text>
        <IssueRow emoji="🔴" label="Blockers" count={scores.issuesByServerity.blocker} color={colors.blocker} />
        <IssueRow emoji="🟠" label="Majors" count={scores.issuesByServerity.major} color={colors.major} />
        <IssueRow emoji="🟡" label="Minors" count={scores.issuesByServerity.minor} color={colors.minor} />
        <IssueRow emoji="⚪" label="Nits" count={scores.issuesByServerity.nit} color={colors.nit} />
      </View>

      {/* Items Needing Attention */}
      {needsAttentionItems.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Items Needing Attention ({needsAttentionItems.length})
          </Text>
          {needsAttentionItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.itemRow}
              onPress={() =>
                router.push(
                  `/deep-dive/${encodeURIComponent(item.id)}`,
                )
              }
            >
              <View
                style={[
                  styles.sevDot,
                  { backgroundColor: getSevColor(item.severity) },
                ]}
              />
              <Text style={styles.itemText} numberOfLines={2}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Low Confidence Items */}
      {lowConfidenceItems.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Learning Opportunities ({lowConfidenceItems.length})
          </Text>
          <Text style={styles.sectionHint}>
            Items where your confidence was low — focus your learning here.
          </Text>
          {lowConfidenceItems.map((item) => {
            const conf = session.itemResponses[item.id]
              ?.confidence as ConfidenceLevel;
            return (
              <Pressable
                key={item.id}
                style={styles.itemRow}
                onPress={() =>
                  router.push(
                    `/deep-dive/${encodeURIComponent(item.id)}`,
                  )
                }
              >
                <Text style={styles.confEmoji}>
                  {CONFIDENCE_EMOJI[conf]}
                </Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemText} numberOfLines={2}>
                    {item.text}
                  </Text>
                  <Text style={styles.confLabel}>
                    {CONFIDENCE_LABELS[conf]} ({conf}/5)
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Export Button */}
      <Pressable
        style={[styles.exportButton, exporting && styles.buttonDisabled]}
        onPress={handleExportPdf}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.exportButtonText}>
            📄 Export as PDF Report Card
          </Text>
        )}
      </Pressable>

      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
}

function ScoreCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.scoreCard}>
      <Text style={[styles.scoreValue, { color }]}>{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function IssueRow({
  emoji,
  label,
  count,
  color,
}: {
  emoji: string;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={styles.issueRow}>
      <Text style={styles.issueEmoji}>{emoji}</Text>
      <Text style={styles.issueLabel}>{label}</Text>
      <Text style={[styles.issueCount, count > 0 && { color }]}>{count}</Text>
    </View>
  );
}

function getSevColor(severity: string): string {
  return (
    { blocker: colors.blocker, major: colors.major, minor: colors.minor, nit: colors.nit }[
      severity
    ] ?? colors.textMuted
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  error: {
    color: colors.error,
    fontSize: fontSizes.lg,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing['2xl'],
  },
  scoreCards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  progressCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  issueEmoji: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  issueLabel: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  issueCount: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sevDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  itemText: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  itemInfo: { flex: 1 },
  confEmoji: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  confLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});
