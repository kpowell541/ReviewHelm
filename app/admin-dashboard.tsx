import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { api, ApiError } from '../src/api/client';
import { DesktopContainer } from '../src/components/DesktopContainer';
import {
  launchReadinessPlan,
  launchStatusLabels,
  type LaunchTaskStatus,
} from '../src/data/launchReadinessPlan';
import { useAuthStore } from '../src/store/useAuthStore';
import { useLaunchReadinessStore } from '../src/store/useLaunchReadinessStore';
import { colors, fontSizes, radius, spacing } from '../src/theme';
import { PieChart } from '../src/components/charts/PieChart';
import { BarChart } from '../src/components/charts/BarChart';
import { MISS_CATEGORY_LABELS, MISS_CATEGORY_COLORS } from '../src/data/types';
import type { MissCategory } from '../src/data/types';

const ALLOWED_ADMIN_EMAILS = (
  process.env.EXPO_PUBLIC_ADMIN_DASHBOARD_EMAILS ??
  'kaitlin.e.powell@gmail.com'
)
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

type StalenessState = 'fresh' | 'due' | 'stale' | 'never_published';
type LaunchDashboardTab = 'all' | LaunchTaskStatus;

const LAUNCH_TABS: Array<{ key: LaunchDashboardTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'done_in_repo', label: 'Done in Repo' },
  { key: 'needs_verification', label: 'Needs Verification' },
  { key: 'remaining', label: 'Remaining' },
];

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
      selfReviewedCount: number;
      selfReviewPct: number;
      avgReviewRounds: number;
    };
    reviewedPRs: {
      total: number;
      requestedChanges: number;
      noChangesRequested: number;
      changesRequestedPct: number;
      avgReviewRounds: number;
    };
  };
  checklistGaps: {
    total: number;
    breakdown: Array<{
      category: string;
      count: number;
      pct: number;
    }>;
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

function StatCard(props: {
  label: string;
  value: string | number;
  tone?: 'default' | 'warn' | 'danger' | 'good';
}) {
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

function badgeStyleForLaunchStatus(status: LaunchTaskStatus) {
  if (status === 'done_in_repo') return { bg: `${colors.success}22`, fg: colors.success };
  if (status === 'needs_verification') {
    return { bg: `${colors.warning}22`, fg: colors.warning };
  }
  return { bg: `${colors.error}22`, fg: colors.error };
}

export default function AdminDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const email = (user?.email ?? '').trim().toLowerCase();
  const isAllowed = ALLOWED_ADMIN_EMAILS.includes(email);
  const checkedTaskIds = useLaunchReadinessStore((s) => s.checkedTaskIds);
  const toggleTaskChecked = useLaunchReadinessStore((s) => s.toggleTaskChecked);
  const resetTaskChecks = useLaunchReadinessStore((s) => s.resetTaskChecks);

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [selectedLaunchTab, setSelectedLaunchTab] =
    useState<LaunchDashboardTab>('all');

  const fetchDashboard = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    fetchDashboard();
  }, [isAllowed, fetchDashboard]);

  const handlePublishAll = useCallback(async () => {
    if (!data) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const byId: Record<string, string> = {};
      for (const item of data.checklistStaleness.items) {
        byId[item.checklistId] = item.version;
      }
      const result = await api.post<{ ok: boolean; publishedAt: string }>(
        '/admin/checklists/publish',
        { version: data.checklistStaleness.items[0]?.version ?? '1.0.0', byId },
      );
      setPublishResult(`Published at ${new Date(result.publishedAt).toLocaleString()}`);
      fetchDashboard();
    } catch (err) {
      setPublishResult(
        err instanceof ApiError ? err.message : 'Failed to publish checklists.',
      );
    } finally {
      setPublishing(false);
    }
  }, [data, fetchDashboard]);

  const staleCount = useMemo(
    () => data?.checklistStaleness.summary.stale ?? 0,
    [data],
  );

  const launchTasks = useMemo(
    () => launchReadinessPlan.phases.flatMap((phase) => phase.tasks),
    [],
  );

  const launchSummary = useMemo(
    () => ({
      total: launchTasks.length,
      done: launchTasks.filter((task) => task.status === 'done_in_repo').length,
      needsVerification: launchTasks.filter(
        (task) => task.status === 'needs_verification',
      ).length,
      remaining: launchTasks.filter((task) => task.status === 'remaining').length,
      checkedOpen: launchTasks.filter(
        (task) => task.status !== 'done_in_repo' && checkedTaskIds[task.id],
      ).length,
      actionableTotal: launchTasks.filter((task) => task.status !== 'done_in_repo').length,
    }),
    [checkedTaskIds, launchTasks],
  );

  const filteredLaunchPhases = useMemo(
    () =>
      launchReadinessPlan.phases
        .map((phase) => ({
          ...phase,
          tasks: phase.tasks.filter(
            (task) => selectedLaunchTab === 'all' || task.status === selectedLaunchTab,
          ),
        }))
        .filter((phase) => phase.tasks.length > 0),
    [selectedLaunchTab],
  );

  const currentLaunchTasks = useMemo(
    () => filteredLaunchPhases.flatMap((phase) => phase.tasks),
    [filteredLaunchPhases],
  );

  const currentLaunchCheckedCount = useMemo(
    () =>
      currentLaunchTasks.filter(
        (task) => task.status === 'done_in_repo' || checkedTaskIds[task.id],
      ).length,
    [checkedTaskIds, currentLaunchTasks],
  );

  if (!isAllowed) {
    return <Redirect href="/" />;
  }

  return (
    <DesktopContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Admin Dashboard</Text>
        <Text style={styles.subtitle}>Anonymized aggregate metrics only</Text>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.card}>
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          </View>
        )}

        {!loading && data && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Privacy</Text>
              <Text style={styles.metaText}>Mode: {data.privacy.mode}</Text>
              <Text style={styles.metaText}>
                PII included: {data.privacy.piiIncluded ? 'yes' : 'no'}
              </Text>
              <Text style={styles.metaText}>
                Generated: {new Date(data.generatedAt).toLocaleString()}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Web Launch Readiness</Text>
              <Text style={styles.metaText}>Scope: {launchReadinessPlan.scope}</Text>
              <Text style={styles.metaText}>
                Updated: {new Date(launchReadinessPlan.updatedAt).toLocaleDateString()}
              </Text>
              <View style={styles.statsRow}>
                <StatCard label="Total Tasks" value={launchSummary.total} />
                <StatCard label="Done in Repo" value={launchSummary.done} tone="good" />
                <StatCard
                  label="Needs Verification"
                  value={launchSummary.needsVerification}
                  tone="warn"
                />
                <StatCard label="Remaining" value={launchSummary.remaining} tone="danger" />
                <StatCard
                  label="Open Tasks Checked"
                  value={`${launchSummary.checkedOpen}/${launchSummary.actionableTotal}`}
                  tone="warn"
                />
              </View>

              <View style={styles.toolbarRow}>
                <View style={styles.tabBar} accessibilityRole="tablist">
                  {LAUNCH_TABS.map((tab) => (
                    <Pressable
                      key={tab.key}
                      style={[
                        styles.tab,
                        selectedLaunchTab === tab.key && styles.tabActive,
                      ]}
                      onPress={() => setSelectedLaunchTab(tab.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: selectedLaunchTab === tab.key }}
                      accessibilityLabel={`${tab.label} launch-readiness tab`}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          selectedLaunchTab === tab.key && styles.tabTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={resetTaskChecks}
                  accessibilityRole="button"
                  accessibilityLabel="Reset checked launch-readiness items"
                >
                  <Text style={styles.secondaryButtonText}>Reset Checks</Text>
                </Pressable>
              </View>

              <Text style={styles.metaText}>
                Showing {currentLaunchTasks.length} items in this tab. Checked in view:{' '}
                {currentLaunchCheckedCount}/{currentLaunchTasks.length}
              </Text>

              {filteredLaunchPhases.map((phase) => (
                <View key={phase.id} style={styles.phaseBlock}>
                  <Text style={styles.phaseTitle}>
                    Phase {phase.order}: {phase.title}
                  </Text>
                  <Text style={styles.phaseObjective}>{phase.objective}</Text>
                  {phase.tasks.map((task) => {
                    const tone = badgeStyleForLaunchStatus(task.status);
                    const isActionable = task.status !== 'done_in_repo';
                    const isChecked = task.status === 'done_in_repo' || checkedTaskIds[task.id];
                    return (
                      <View key={task.id} style={styles.row}>
                        <Pressable
                          style={[
                            styles.checkbox,
                            isChecked && styles.checkboxChecked,
                            !isActionable && styles.checkboxDisabled,
                          ]}
                          onPress={() => {
                            if (isActionable) toggleTaskChecked(task.id);
                          }}
                          disabled={!isActionable}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isChecked, disabled: !isActionable }}
                          accessibilityLabel={`${task.title} checklist item`}
                        >
                          {isChecked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                        </Pressable>
                        <View style={styles.rowTextWrap}>
                          <Text style={styles.rowTitle}>{task.title}</Text>
                          <Text style={styles.rowMeta}>Owner: {task.owner}</Text>
                          <Text style={styles.rowMeta}>Depends on: {task.dependsOn}</Text>
                          {task.notes ? <Text style={styles.rowMeta}>{task.notes}</Text> : null}
                        </View>
                        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.badgeText, { color: tone.fg }]}>
                            {launchStatusLabels[task.status]}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Checklist Job Health</Text>
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
              <Text style={styles.cardTitle} accessibilityRole="header">Users</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total" value={data.users.total} />
                <StatCard label="Active 30d" value={data.users.active30d} />
                <StatCard label="New 30d" value={data.users.new30d} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Sessions</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total" value={data.sessions.total} />
                <StatCard label="Completed" value={data.sessions.completedTotal} />
                <StatCard label="Completed 30d" value={data.sessions.completed30d} />
                <StatCard label="Completion %" value={`${data.sessions.completionRatePct}%`} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">AI (30d)</Text>
              <View style={styles.statsRow}>
                <StatCard label="Calls" value={data.ai.calls30d} />
                <StatCard label="Input Tokens" value={data.ai.inputTokens30d} />
                <StatCard label="Output Tokens" value={data.ai.outputTokens30d} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Checklist Staleness</Text>
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
              <Pressable
                style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
                onPress={handlePublishAll}
                disabled={publishing}
                accessibilityRole="button"
                accessibilityLabel="Publish all checklists"
                accessibilityState={{ disabled: publishing }}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.publishButtonText}>Publish All Checklists</Text>
                )}
              </Pressable>
              {publishResult && <Text style={styles.metaText}>{publishResult}</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Quality</Text>
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
              <Text style={styles.cardTitle} accessibilityRole="header">PR Tracker</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total PRs" value={data.trackedPrs.total} />
                <StatCard label="Active PRs" value={data.trackedPrs.active} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">PR Acceptance (Self PRs)</Text>
              <Text style={styles.metaText}>
                High clean acceptance % = checklists are adding value
              </Text>
              <View style={styles.statsRow}>
                <StatCard label="Total Tracked" value={data.prAcceptance.selfPRs.total} />
                <StatCard
                  label="Clean Accept %"
                  value={`${data.prAcceptance.selfPRs.cleanAcceptancePct}%`}
                  tone={
                    data.prAcceptance.selfPRs.cleanAcceptancePct >= 70
                      ? 'good'
                      : data.prAcceptance.selfPRs.cleanAcceptancePct >= 40
                        ? 'warn'
                        : 'danger'
                  }
                />
                <StatCard
                  label="No Changes"
                  value={data.prAcceptance.selfPRs.acceptedClean}
                  tone="good"
                />
                <StatCard
                  label="With Changes"
                  value={data.prAcceptance.selfPRs.acceptedWithChanges}
                  tone="warn"
                />
                <StatCard
                  label="Self-review %"
                  value={`${data.prAcceptance.selfPRs.selfReviewPct}%`}
                  tone={
                    data.prAcceptance.selfPRs.selfReviewPct >= 80
                      ? 'good'
                      : data.prAcceptance.selfPRs.selfReviewPct >= 50
                        ? 'warn'
                        : 'danger'
                  }
                />
                <StatCard label="Avg Rounds" value={data.prAcceptance.selfPRs.avgReviewRounds} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Review Outcomes (Others' PRs)</Text>
              <Text style={styles.metaText}>
                % of reviewed PRs where changes were requested
              </Text>
              <View style={styles.statsRow}>
                <StatCard label="Total Reviewed" value={data.prAcceptance.reviewedPRs.total} />
                <StatCard
                  label="Changes Requested %"
                  value={`${data.prAcceptance.reviewedPRs.changesRequestedPct}%`}
                />
                <StatCard
                  label="Requested Changes"
                  value={data.prAcceptance.reviewedPRs.requestedChanges}
                />
                <StatCard
                  label="No Changes"
                  value={data.prAcceptance.reviewedPRs.noChangesRequested}
                  tone="good"
                />
                <StatCard label="Avg Rounds" value={data.prAcceptance.reviewedPRs.avgReviewRounds} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Checklist Gaps</Text>
              <Text style={styles.metaText}>
                What reviewers caught that self-review missed ({data.checklistGaps.total} reports)
              </Text>
              {data.checklistGaps.total === 0 ? (
                <Text style={styles.metaText}>No gap feedback submitted yet.</Text>
              ) : (
                <>
                  <View style={styles.statsRow}>
                    {data.checklistGaps.breakdown
                      .filter((b) => b.count > 0)
                      .map((b) => (
                        <StatCard
                          key={b.category}
                          label={MISS_CATEGORY_LABELS[b.category as MissCategory] ?? b.category}
                          value={b.count}
                        />
                      ))}
                  </View>
                  <Text style={[styles.cardTitle, { fontSize: fontSizes.md, marginTop: spacing.sm }]}>
                    Distribution (%)
                  </Text>
                  <PieChart
                    data={data.checklistGaps.breakdown
                      .filter((b) => b.count > 0)
                      .map((b) => ({
                        label: MISS_CATEGORY_LABELS[b.category as MissCategory] ?? b.category,
                        value: b.count,
                        color: MISS_CATEGORY_COLORS[b.category as MissCategory] ?? colors.textMuted,
                        pct: b.pct,
                      }))}
                  />
                  <Text style={[styles.cardTitle, { fontSize: fontSizes.md, marginTop: spacing.sm }]}>
                    Counts by Category
                  </Text>
                  <BarChart
                    data={data.checklistGaps.breakdown.map((b) => ({
                      label: MISS_CATEGORY_LABELS[b.category as MissCategory] ?? b.category,
                      value: b.count,
                      color: MISS_CATEGORY_COLORS[b.category as MissCategory] ?? colors.textMuted,
                    }))}
                  />
                </>
              )}
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
  toolbarRow: {
    gap: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tab: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSection,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSection,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
  },
  phaseBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phaseTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_700Bold',
  },
  phaseObjective: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.7,
  },
  checkboxMark: {
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_700Bold',
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
  publishButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center' as const,
    marginTop: spacing.sm,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_700Bold',
  },
});
