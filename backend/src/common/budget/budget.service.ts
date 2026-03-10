import { Injectable } from '@nestjs/common';
import { Prisma, type ClaudeModel, type Preference } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../auth/types';
import { upsertUserFromAuth } from '../users/upsert-user-from-auth';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppEnv } from '../../config/env.schema';

interface ModelTokenTotals {
  haiku: { inputTokens: number; outputTokens: number };
  sonnet: { inputTokens: number; outputTokens: number };
  opus: { inputTokens: number; outputTokens: number };
}

export interface BudgetStatus {
  monthlyBudgetUsd: number;
  alertThresholds: number[];
  hardStopAtBudget: boolean;
  autoDowngradeNearBudget: boolean;
  autoDowngradeThresholdPct: number;
  cooldownSeconds: number;
  lastAlertThreshold: number | null;
  month: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  spendPercent: number;
  nearBudget: boolean;
  overBudget: boolean;
}

export interface AiBudgetDecision {
  block: boolean;
  resolvedModel: ClaudeModel;
  autoDowngraded: boolean;
  alertThreshold: number | null;
  budget: BudgetStatus;
}

@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async getBudgetStatus(authUser: AuthenticatedUser): Promise<BudgetStatus> {
    const { user, preference } = await this.ensureUserWithPreference(authUser);
    return this.getBudgetStatusForUserId(user.id, preference);
  }

  async updateBudgetConfig(
    authUser: AuthenticatedUser,
    patch: Prisma.PreferenceUpdateInput,
  ): Promise<BudgetStatus> {
    const { user } = await this.ensureUserWithPreference(authUser);
    const updated = await this.prisma.preference.update({
      where: { userId: user.id },
      data: patch,
    });
    return this.getBudgetStatusForUserId(user.id, updated);
  }

  async resetUsage(authUser: AuthenticatedUser): Promise<void> {
    const { user } = await this.ensureUserWithPreference(authUser);
    await this.prisma.$transaction([
      this.prisma.usageDay.deleteMany({ where: { userId: user.id } }),
      this.prisma.usageSession.deleteMany({ where: { userId: user.id } }),
      this.prisma.preference.update({
        where: { userId: user.id },
        data: { lastAlertThreshold: null },
      }),
    ]);
  }

  async enforceAiBudgetPolicy(
    authUser: AuthenticatedUser,
    requestedModel: ClaudeModel,
  ): Promise<AiBudgetDecision> {
    const { user, preference } = await this.ensureUserWithPreference(authUser);
    const budget = await this.getBudgetStatusForUserId(user.id, preference);
    const overBudget = budget.estimatedCostUsd >= budget.monthlyBudgetUsd;
    const shouldBlock = preference.hardStopAtBudget && overBudget;

    const shouldDowngrade =
      preference.autoDowngradeNearBudget &&
      requestedModel === 'opus' &&
      budget.spendPercent >= preference.autoDowngradeThresholdPct;

    const resolvedModel = shouldDowngrade ? 'sonnet' : requestedModel;
    const alertThreshold = await this.handleThresholdAlert(
      user.id,
      preference,
      budget.spendPercent,
    );

    return {
      block: shouldBlock,
      resolvedModel,
      autoDowngraded: shouldDowngrade,
      alertThreshold,
      budget,
    };
  }

  private async ensureUserWithPreference(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const preference = await this.prisma.preference.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    return { user, preference };
  }

  private async getBudgetStatusForUserId(userId: string, preference: Preference): Promise<BudgetStatus> {
    const month = this.getCurrentMonthKey();
    const monthRows = await this.prisma.usageDay.findMany({
      where: {
        userId,
        dateKey: { startsWith: month },
      },
      select: {
        calls: true,
        inputTokens: true,
        outputTokens: true,
        byModel: true,
      },
    });

    const normalized = monthRows.map((row) => ({
      ...row,
      byModelUsage: this.parseByModelUsage(row.byModel, row.inputTokens, row.outputTokens),
    }));
    const totals = normalized.reduce(
      (acc, row) => {
        acc.calls += row.calls;
        acc.inputTokens += row.inputTokens;
        acc.outputTokens += row.outputTokens;
        return acc;
      },
      {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    );
    const modelTotals = normalized.reduce<ModelTokenTotals>(
      (acc, row) => {
        acc.haiku.inputTokens += row.byModelUsage.haiku.inputTokens;
        acc.haiku.outputTokens += row.byModelUsage.haiku.outputTokens;
        acc.sonnet.inputTokens += row.byModelUsage.sonnet.inputTokens;
        acc.sonnet.outputTokens += row.byModelUsage.sonnet.outputTokens;
        acc.opus.inputTokens += row.byModelUsage.opus.inputTokens;
        acc.opus.outputTokens += row.byModelUsage.opus.outputTokens;
        return acc;
      },
      {
        haiku: { inputTokens: 0, outputTokens: 0 },
        sonnet: { inputTokens: 0, outputTokens: 0 },
        opus: { inputTokens: 0, outputTokens: 0 },
      },
    );

    const estimatedCostUsd = this.calculateCostUsd(modelTotals);
    const monthlyBudgetUsd = Number(preference.monthlyBudgetUsd);
    const spendPercent =
      monthlyBudgetUsd > 0 ? Number(((estimatedCostUsd / monthlyBudgetUsd) * 100).toFixed(2)) : 0;

    return {
      monthlyBudgetUsd,
      alertThresholds: preference.alertThresholds,
      hardStopAtBudget: preference.hardStopAtBudget,
      autoDowngradeNearBudget: preference.autoDowngradeNearBudget,
      autoDowngradeThresholdPct: preference.autoDowngradeThresholdPct,
      cooldownSeconds: preference.cooldownSeconds,
      lastAlertThreshold: preference.lastAlertThreshold,
      month,
      calls: totals.calls,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      estimatedCostUsd,
      spendPercent,
      nearBudget: spendPercent >= preference.autoDowngradeThresholdPct,
      overBudget: estimatedCostUsd >= monthlyBudgetUsd,
    };
  }

  private parseByModelUsage(
    byModel: Prisma.JsonValue,
    totalInput: number,
    totalOutput: number,
  ): ModelTokenTotals {
    const fallback: ModelTokenTotals = {
      haiku: { inputTokens: 0, outputTokens: 0 },
      sonnet: { inputTokens: 0, outputTokens: 0 },
      opus: { inputTokens: 0, outputTokens: 0 },
    };
    if (!byModel || typeof byModel !== 'object' || Array.isArray(byModel)) {
      return fallback;
    }

    const usage: ModelTokenTotals = {
      haiku: { inputTokens: 0, outputTokens: 0 },
      sonnet: { inputTokens: 0, outputTokens: 0 },
      opus: { inputTokens: 0, outputTokens: 0 },
    };
    const obj = byModel as Record<string, unknown>;

    const parseEntry = (entry: unknown): { inputTokens: number; outputTokens: number } => {
      if (!entry || typeof entry !== 'object') {
        return { inputTokens: 0, outputTokens: 0 };
      }
      const record = entry as Record<string, unknown>;
      const inputTokens = Number(
        record.inputTokens ?? record.input ?? record.in ?? record.promptTokens ?? 0,
      );
      const outputTokens = Number(
        record.outputTokens ?? record.output ?? record.out ?? record.completionTokens ?? 0,
      );
      return {
        inputTokens: Number.isFinite(inputTokens) ? Math.max(0, inputTokens) : 0,
        outputTokens: Number.isFinite(outputTokens) ? Math.max(0, outputTokens) : 0,
      };
    };

    usage.haiku = parseEntry(obj.haiku);
    usage.sonnet = parseEntry(obj.sonnet);
    usage.opus = parseEntry(obj.opus);

    if (
      usage.haiku.inputTokens +
        usage.haiku.outputTokens +
        usage.sonnet.inputTokens +
        usage.sonnet.outputTokens +
        usage.opus.inputTokens +
        usage.opus.outputTokens ===
      0
    ) {
      return {
        ...fallback,
        sonnet: { inputTokens: totalInput, outputTokens: totalOutput },
      };
    }
    return usage;
  }

  private calculateCostUsd(totals: ModelTokenTotals): number {
    const haikuIn = this.config.get('HAIKU_INPUT_COST_PER_MILLION_USD');
    const haikuOut = this.config.get('HAIKU_OUTPUT_COST_PER_MILLION_USD');
    const sonnetIn = this.config.get('SONNET_INPUT_COST_PER_MILLION_USD');
    const sonnetOut = this.config.get('SONNET_OUTPUT_COST_PER_MILLION_USD');
    const opusIn = this.config.get('OPUS_INPUT_COST_PER_MILLION_USD');
    const opusOut = this.config.get('OPUS_OUTPUT_COST_PER_MILLION_USD');

    const haikuCost =
      (totals.haiku.inputTokens / 1_000_000) * haikuIn +
      (totals.haiku.outputTokens / 1_000_000) * haikuOut;
    const sonnetCost =
      (totals.sonnet.inputTokens / 1_000_000) * sonnetIn +
      (totals.sonnet.outputTokens / 1_000_000) * sonnetOut;
    const opusCost =
      (totals.opus.inputTokens / 1_000_000) * opusIn +
      (totals.opus.outputTokens / 1_000_000) * opusOut;
    return Number((haikuCost + sonnetCost + opusCost).toFixed(6));
  }

  private getCurrentMonthKey(date: Date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async handleThresholdAlert(
    userId: string,
    preference: Preference,
    spendPercent: number,
  ): Promise<number | null> {
    const thresholds = [...preference.alertThresholds].sort((a, b) => a - b);
    const crossed = thresholds.filter((threshold) => spendPercent >= threshold);
    const highestCrossed = crossed.length > 0 ? crossed[crossed.length - 1] : null;

    if (highestCrossed && preference.lastAlertThreshold !== highestCrossed) {
      await this.prisma.preference.update({
        where: { userId },
        data: { lastAlertThreshold: highestCrossed },
      });
      return highestCrossed;
    }

    if (!highestCrossed && preference.lastAlertThreshold !== null) {
      await this.prisma.preference.update({
        where: { userId },
        data: { lastAlertThreshold: null },
      });
    }

    return null;
  }
}
