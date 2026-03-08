import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { api, ApiError } from '../src/api/client';
import { useAuthStore } from '../src/store/useAuthStore';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { colors, fontSizes, radius, spacing } from '../src/theme';

const ALLOWED_ADMIN_EMAILS = (
  process.env.EXPO_PUBLIC_ADMIN_DASHBOARD_EMAILS ??
  'kaitlin.e.powell@gmail.com'
)
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

type StalenessState = 'fresh' | 'due' | 'stale' | 'never_published';

interface DashboardPayload {
  generatedAt: string;
  privacy: {
    mode: string;
    piiIncluded: boolean;
  };
  users: {
    total: number;
    active30d: number;
    new30d: number;
  };
  sessions: {
    total: number;
    completedTotal: number;
    completed30d: number;
    completionRatePct: number;
  };
  ai: {
    calls30d: number;
    inputTokens30d: number;
    outputTokens30d: number;
  };
  trackedPrs: {
    total: number;
    active: number;
  };
  commentFeedback: {
    total: number;
    accepted: number;
    edited: number;
    rejected: number;
    acceptanceRatePct: number;
  };
  prAcceptance: {
    selfPRs: {
      total: number;
      acceptedClean: number;
      acceptedWithChanges: number;
      cleanAcceptancePct: number;
    };
    reviewedPRs: {
      total: number;
      requestedChanges: number;
      noChangesRequested: number;
      changesRequestedPct: number;
    };
  };
  checklistJob: {
    cadence: {
      weeklyScanCronUtc: string;
      monthlyReviewCronUtc: string;
    };
    workflow: {
      owner: string;
      repo: string;
      file: string;
    };
    lastRun: {
      status: string | null;
      conclusion: string | null;
      runStartedAt: string | null;
      htmlUrl: string | null;
    };
  };
  checklistStaleness: {
    thresholdsDays: {
      freshMax: number;
      dueMax: number;
    };
    summary: {
      total: number;
      fresh: number;
      due: number;
      stale: number;
      neverPublished: number;
    };
    items: Array<{
      checklistId: string;
      title: string;
      version: string;
      lastPublishedAt: string | null;
      daysSincePublished: number | null;
      state: StalenessState;
    }>;
  };
}

function StatCard(props: { label: string; value: string | number; tone?: 'default' | 'warn' | 'danger' | 'good' }) {
  const toneStyle =
    props.tone === 'good'
      ? { color: colors.success }
      : props.tone === 'warn'
        ? { color: colors.warning }
        : props.tone === 'danger'
          ? { color: colors.error }
          : undefined;
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, toneStyle]}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
    </View>
  );
}

function badgeStyleForState(state: StalenessState) {
  if (state === 'fresh') return { bg: `${colors.success}22`, fg: colors.success };
  if (state === 'due') return { bg: `${colors.warning}22`, fg: colors.warning };
  if (state === 'stale') return { bg: `${colors.error}22`, fg: colors.error };
  return { bg: `${colors.textMuted}22`, fg: colors.textMuted };
}

export default function AdminDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const email = (user?.email ?? '').trim().toLowerCase();
  const isAllowed = ALLOWED_ADMIN_EMAILS.includes(email);

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    api
      .get<DashboardPayload>('/admin/dashboard/overview')
      .then((payload) => setData(payload))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load admin metrics.');
        }
      })
      .finally(() => setLoading(false));
  }, [isAllowed]);

  const staleCount = useMemo(
    () => data?.checklistStaleness.summary.stale ?? 0,
    [data],
  );

  if (!isAllowed) {
    return <Redirect href="/" />;
  }

  return (
    <DesktopContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Anonymized aggregate metrics only</Text>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && data && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Privacy</Text>
              <Text style={styles.metaText}>Mode: {data.privacy.mode}</Text>
              <Text style={styles.metaText}>
                PII included: {data.privacy.piiIncluded ? 'yes' : 'no'}
              </Text>
              <Text style={styles.metaText}>
                Generated: {new Date(data.generatedAt).toLocaleString()}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Checklist Job Health</Text>
              <Text style={styles.metaText}>
                Weekly scan (UTC cron): {data.checklistJob.cadence.weeklyScanCronUtc}
              </Text>
              <Text style={styles.metaText}>
                Monthly review (UTC cron): {data.checklistJob.cadence.monthlyReviewCronUtc}
              </Text>
              <Text style={styles.metaText}>
                Workflow: {data.checklistJob.workflow.owner}/
                {data.checklistJob.workflow.repo}/
                {data.checklistJob.workflow.file}
              </Text>
              <Text style={styles.metaText}>
                Last run:{' '}
                {data.checklistJob.lastRun.runStartedAt
                  ? new Date(data.checklistJob.lastRun.runStartedAt).toLocaleString()
                  : 'not available'}
              </Text>
              <Text style={styles.metaText}>
                Status: {data.checklistJob.lastRun.status ?? 'unknown'} /{' '}
                {data.checklistJob.lastRun.conclusion ?? 'unknown'}
              </Text>
              {data.checklistJob.lastRun.htmlUrl ? (
                <Text style={styles.metaText}>
                  Run URL: {data.checklistJob.lastRun.htmlUrl}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Users</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total" value={data.users.total} />
                <StatCard label="Active 30d" value={data.users.active30d} />
                <StatCard label="New 30d" value={data.users.new30d} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sessions</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total" value={data.sessions.total} />
                <StatCard label="Completed" value={data.sessions.completedTotal} />
                <StatCard label="Completed 30d" value={data.sessions.completed30d} />
                <StatCard label="Completion %" value={`${data.sessions.completionRatePct}%`} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>AI (30d)</Text>
              <View style={styles.statsRow}>
                <StatCard label="Calls" value={data.ai.calls30d} />
                <StatCard label="Input Tokens" value={data.ai.inputTokens30d} />
                <StatCard label="Output Tokens" value={data.ai.outputTokens30d} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Checklist Staleness</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total" value={data.checklistStaleness.summary.total} />
                <StatCard label="Fresh" value={data.checklistStaleness.summary.fresh} tone="good" />
                <StatCard label="Due" value={data.checklistStaleness.summary.due} tone="warn" />
                <StatCard label="Stale" value={staleCount} tone="danger" />
                <StatCard
                  label="Never Published"
                  value={data.checklistStaleness.summary.neverPublished}
                  tone="warn"
                />
              </View>
              <Text style={styles.metaText}>
                Fresh {'<='} {data.checklistStaleness.thresholdsDays.freshMax}d, due {'<='}{' '}
                {data.checklistStaleness.thresholdsDays.dueMax}d
              </Text>
              {data.checklistStaleness.items.map((item) => {
                const tone = badgeStyleForState(item.state);
                return (
                  <View key={item.checklistId} style={styles.row}>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowMeta}>
                        {item.checklistId} · v{item.version} ·{' '}
                        {item.daysSincePublished === null
                          ? 'never published'
                          : `${item.daysSincePublished}d old`}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.badgeText, { color: tone.fg }]}>
                        {item.state}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quality</Text>
              <View style={styles.statsRow}>
                <StatCard label="Feedback Total" value={data.commentFeedback.total} />
                <StatCard label="Accepted" value={data.commentFeedback.accepted} tone="good" />
                <StatCard label="Edited" value={data.commentFeedback.edited} tone="warn" />
                <StatCard label="Rejected" value={data.commentFeedback.rejected} tone="danger" />
                <StatCard
                  label="Acceptance %"
                  value={`${data.commentFeedback.acceptanceRatePct}%`}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>PR Tracker</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total PRs" value={data.trackedPrs.total} />
                <StatCard label="Active PRs" value={data.trackedPrs.active} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>PR Acceptance (Self PRs)</Text>
              <Text style={styles.metaText}>
                High clean acceptance % = checklists are adding value
              </Text>
              <View style={styles.statsRow}>
                <StatCard label="Total Tracked" value={data.prAcceptance.selfPRs.total} />
                <StatCard
                  label="Clean Accept %"
                  value={`${data.prAcceptance.selfPRs.cleanAcceptancePct}%`}
                  tone={data.prAcceptance.selfPRs.cleanAcceptancePct >= 70 ? 'good' : data.prAcceptance.selfPRs.cleanAcceptancePct >= 40 ? 'warn' : 'danger'}
                />
                <StatCard label="No Changes" value={data.prAcceptance.selfPRs.acceptedClean} tone="good" />
                <StatCard label="With Changes" value={data.prAcceptance.selfPRs.acceptedWithChanges} tone="warn" />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Review Outcomes (Others' PRs)</Text>
              <Text style={styles.metaText}>
                % of reviewed PRs where changes were requested
              </Text>
              <View style={styles.statsRow}>
                <StatCard label="Total Reviewed" value={data.prAcceptance.reviewedPRs.total} />
                <StatCard
                  label="Changes Requested %"
                  value={`${data.prAcceptance.reviewedPRs.changesRequestedPct}%`}
                />
                <StatCard label="Requested Changes" value={data.prAcceptance.reviewedPRs.requestedChanges} />
                <StatCard label="No Changes" value={data.prAcceptance.reviewedPRs.noChangesRequested} tone="good" />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </DesktopContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes['2xl'],
    color: colors.textPrimary,
    fontFamily: 'Quicksand_700Bold',
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_700Bold',
  },
  metaText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    minWidth: 120,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSection,
  },
  statValue: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_700Bold',
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontFamily: 'Quicksand_500Medium',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_700Bold',
    textTransform: 'uppercase',
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
