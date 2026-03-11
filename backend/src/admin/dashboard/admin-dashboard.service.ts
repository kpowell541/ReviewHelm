import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { getBundledChecklists } from '../../checklists/bundled-checklists';
import type { AppEnv } from '../../config/env.schema';
import { reliableFetch } from '../../common/http/reliable-fetch';

type StalenessState = 'fresh' | 'due' | 'stale' | 'never_published';

interface ChecklistStalenessRow {
  checklistId: string;
  title: string;
  version: string;
  lastPublishedAt: string | null;
  daysSincePublished: number | null;
  state: StalenessState;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async getOverview() {
    const now = new Date();
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoffDateKey = this.toDateKey(cutoff30d);

    const [
      totalUsers,
      newUsers30d,
      totalSessions,
      completedSessions,
      completedSessions30d,
      aiUsage30d,
      totalTrackedPrs,
      activeTrackedPrs,
      feedbackAgg,
      checklistRows,
      checklistJobStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: cutoff30d } } }),
      this.prisma.session.count(),
      this.prisma.session.count({ where: { isComplete: true } }),
      this.prisma.session.count({
        where: {
          isComplete: true,
          updatedAt: { gte: cutoff30d },
        },
      }),
      this.prisma.usageDay.aggregate({
        where: { dateKey: { gte: cutoffDateKey } },
        _sum: {
          calls: true,
          inputTokens: true,
          outputTokens: true,
        },
      }),
      this.prisma.trackedPR.count(),
      this.prisma.trackedPR.count({
        where: {
          archivedAt: null,
          status: { in: ['open', 'in-review', 'changes-requested', 'approved'] },
        },
      }),
      this.prisma.commentFeedback.groupBy({
        by: ['outcome'],
        _count: { _all: true },
      }),
      this.prisma.checklistVersion.findMany({
        orderBy: [{ checklistId: 'asc' }, { createdAt: 'desc' }],
        select: {
          checklistId: true,
          version: true,
          createdAt: true,
        },
      }),
      this.fetchChecklistWorkflowStatus(),
    ]);

    const activeUsers30d = await this.prisma.user.count({
      where: {
        OR: [
          { sessions: { some: { updatedAt: { gte: cutoff30d } } } },
          { usageDays: { some: { dateKey: { gte: cutoffDateKey } } } },
          { trackedPRs: { some: { updatedAt: { gte: cutoff30d } } } },
        ],
      },
    });

    const staleness = this.buildChecklistStaleness(now, checklistRows);
    const feedbackTotals = this.toFeedbackTotals(feedbackAgg);

    return {
      generatedAt: now.toISOString(),
      privacy: {
        mode: 'anonymous_aggregates_only',
        piiIncluded: false,
      },
      users: {
        total: totalUsers,
        active30d: activeUsers30d,
        new30d: newUsers30d,
      },
      sessions: {
        total: totalSessions,
        completedTotal: completedSessions,
        completed30d: completedSessions30d,
        completionRatePct:
          totalSessions > 0
            ? Number(((completedSessions / totalSessions) * 100).toFixed(1))
            : 0,
      },
      ai: {
        calls30d: aiUsage30d._sum.calls ?? 0,
        inputTokens30d: aiUsage30d._sum.inputTokens ?? 0,
        outputTokens30d: aiUsage30d._sum.outputTokens ?? 0,
      },
      trackedPrs: {
        total: totalTrackedPrs,
        active: activeTrackedPrs,
      },
      commentFeedback: feedbackTotals,
      prAcceptance: await this.buildPRAcceptanceMetrics(),
      checklistStaleness: staleness,
      checklistJob: checklistJobStatus,
    };
  }

  private async buildPRAcceptanceMetrics() {
    const [authorPRs, reviewerPRs] = await Promise.all([
      this.prisma.trackedPR.findMany({
        where: {
          role: 'author',
          acceptanceOutcome: { not: null },
        },
        select: { acceptanceOutcome: true },
      }),
      this.prisma.trackedPR.findMany({
        where: {
          role: 'reviewer',
          reviewOutcome: { not: null },
        },
        select: { reviewOutcome: true },
      }),
    ]);

    const selfTotal = authorPRs.length;
    const selfAcceptedClean = authorPRs.filter(
      (pr) => pr.acceptanceOutcome === 'accepted-clean',
    ).length;
    const selfAcceptedWithChanges = authorPRs.filter(
      (pr) => pr.acceptanceOutcome === 'accepted-with-changes',
    ).length;

    const reviewTotal = reviewerPRs.length;
    const reviewRequestedChanges = reviewerPRs.filter(
      (pr) => pr.reviewOutcome === 'requested-changes',
    ).length;
    const reviewNoChanges = reviewerPRs.filter(
      (pr) => pr.reviewOutcome === 'no-changes-requested',
    ).length;

    return {
      selfPRs: {
        total: selfTotal,
        acceptedClean: selfAcceptedClean,
        acceptedWithChanges: selfAcceptedWithChanges,
        cleanAcceptancePct:
          selfTotal > 0
            ? Number(((selfAcceptedClean / selfTotal) * 100).toFixed(1))
            : 0,
      },
      reviewedPRs: {
        total: reviewTotal,
        requestedChanges: reviewRequestedChanges,
        noChangesRequested: reviewNoChanges,
        changesRequestedPct:
          reviewTotal > 0
            ? Number(((reviewRequestedChanges / reviewTotal) * 100).toFixed(1))
            : 0,
      },
    };
  }

  private async fetchChecklistWorkflowStatus(): Promise<{
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
  }> {
    const owner = this.config.get('CHECKLIST_RELEVANCE_WORKFLOW_OWNER');
    const repo = this.config.get('CHECKLIST_RELEVANCE_WORKFLOW_REPO');
    const file = this.config.get('CHECKLIST_RELEVANCE_WORKFLOW_FILE');
    const token = this.config.get('GITHUB_READ_TOKEN');
    const cadence = {
      weeklyScanCronUtc: '0 14 * * 1',
      monthlyReviewCronUtc: '0 15 1 * *',
    };
    const workflow = { owner, repo, file };

    if (!owner || !repo || !file) {
      return {
        cadence,
        workflow,
        lastRun: {
          status: null,
          conclusion: null,
          runStartedAt: null,
          htmlUrl: null,
        },
      };
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${file}/runs?per_page=1`;
      const response = await reliableFetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }, {
        timeoutMs: 8_000,
        maxAttempts: 2,
        baseRetryDelayMs: 250,
        retryableStatuses: [408, 429, 500, 502, 503, 504],
      });
      if (!response.ok) {
        return {
          cadence,
          workflow,
          lastRun: {
            status: null,
            conclusion: null,
            runStartedAt: null,
            htmlUrl: null,
          },
        };
      }
      const payload = (await response.json()) as {
        workflow_runs?: Array<{
          status?: string;
          conclusion?: string;
          run_started_at?: string;
          html_url?: string;
        }>;
      };
      const latest = payload.workflow_runs?.[0];
      return {
        cadence,
        workflow,
        lastRun: {
          status: latest?.status ?? null,
          conclusion: latest?.conclusion ?? null,
          runStartedAt: latest?.run_started_at ?? null,
          htmlUrl: latest?.html_url ?? null,
        },
      };
    } catch {
      return {
        cadence,
        workflow,
        lastRun: {
          status: null,
          conclusion: null,
          runStartedAt: null,
          htmlUrl: null,
        },
      };
    }
  }

  private buildChecklistStaleness(
    now: Date,
    versions: Array<{ checklistId: string; version: string; createdAt: Date }>,
  ) {
    const latestByChecklist: Record<
      string,
      { version: string; createdAt: Date }
    > = {};
    for (const row of versions) {
      if (!latestByChecklist[row.checklistId]) {
        latestByChecklist[row.checklistId] = {
          version: row.version,
          createdAt: row.createdAt,
        };
      }
    }

    const rows: ChecklistStalenessRow[] = getBundledChecklists().map((checklist) => {
      const latest = latestByChecklist[checklist.meta.id];
      if (!latest) {
        return {
          checklistId: checklist.meta.id,
          title: checklist.meta.title,
          version: checklist.meta.version,
          lastPublishedAt: null,
          daysSincePublished: null,
          state: 'never_published',
        };
      }

      const days = Math.max(
        0,
        Math.floor((now.getTime() - latest.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      );
      return {
        checklistId: checklist.meta.id,
        title: checklist.meta.title,
        version: latest.version,
        lastPublishedAt: latest.createdAt.toISOString(),
        daysSincePublished: days,
        state: this.getStalenessState(days),
      };
    });

    const summary = {
      total: rows.length,
      fresh: rows.filter((row) => row.state === 'fresh').length,
      due: rows.filter((row) => row.state === 'due').length,
      stale: rows.filter((row) => row.state === 'stale').length,
      neverPublished: rows.filter((row) => row.state === 'never_published').length,
    };

    return {
      thresholdsDays: {
        freshMax: 40,
        dueMax: 75,
      },
      summary,
      items: rows.sort((a, b) => {
        const rank = (state: StalenessState) => {
          if (state === 'stale') return 0;
          if (state === 'due') return 1;
          if (state === 'never_published') return 2;
          return 3;
        };
        return rank(a.state) - rank(b.state);
      }),
    };
  }

  private toFeedbackTotals(
    rows: Array<{ outcome: string; _count: { _all: number } }>,
  ) {
    let accepted = 0;
    let edited = 0;
    let rejected = 0;
    for (const row of rows) {
      if (row.outcome === 'accepted') accepted = row._count._all;
      if (row.outcome === 'edited') edited = row._count._all;
      if (row.outcome === 'rejected') rejected = row._count._all;
    }
    const total = accepted + edited + rejected;
    return {
      total,
      accepted,
      edited,
      rejected,
      acceptanceRatePct: total > 0 ? Number(((accepted / total) * 100).toFixed(1)) : 0,
    };
  }

  private getStalenessState(days: number): StalenessState {
    if (days <= 40) return 'fresh';
    if (days <= 75) return 'due';
    return 'stale';
  }

  private toDateKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
}
