import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../common/auth/types';
import { BudgetService } from '../common/budget/budget.service';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBudgetConfigDto } from './dto/update-budget-config.dto';

interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class UsageService {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async getBudgetConfig(authUser: AuthenticatedUser) {
    const status = await this.budgetService.getBudgetStatus(authUser);
    return this.toBudgetConfigResponse(status);
  }

  async updateBudgetConfig(authUser: AuthenticatedUser, input: UpdateBudgetConfigDto) {
    const patch: Prisma.PreferenceUpdateInput = {};
    if (input.monthlyBudgetUsd !== undefined) {
      patch.monthlyBudgetUsd = new Prisma.Decimal(input.monthlyBudgetUsd);
    }
    if (input.alertThresholds !== undefined) {
      patch.alertThresholds = [...new Set(input.alertThresholds)].sort((a, b) => a - b);
    }
    if (input.hardStopAtBudget !== undefined) {
      patch.hardStopAtBudget = input.hardStopAtBudget;
    }
    if (input.autoDowngradeNearBudget !== undefined) {
      patch.autoDowngradeNearBudget = input.autoDowngradeNearBudget;
    }
    if (input.autoDowngradeThresholdPct !== undefined) {
      patch.autoDowngradeThresholdPct = input.autoDowngradeThresholdPct;
    }
    if (input.cooldownSeconds !== undefined) {
      patch.cooldownSeconds = input.cooldownSeconds;
    }

    const status = await this.budgetService.updateBudgetConfig(authUser, patch);
    return this.toBudgetConfigResponse(status);
  }

  async resetUsage(authUser: AuthenticatedUser): Promise<void> {
    await this.budgetService.resetUsage(authUser);
  }

  async getUsageSummary(authUser: AuthenticatedUser, month?: string) {
    const user = await this.ensureUser(authUser);
    const monthKey = month || this.getCurrentMonthKey();
    const rows = await this.prisma.usageDay.findMany({
      where: {
        userId: user.id,
        dateKey: { startsWith: monthKey },
      },
      select: {
        calls: true,
        inputTokens: true,
        outputTokens: true,
        byModel: true,
        dateKey: true,
      },
    });

    const calls = rows.reduce((sum, row) => sum + row.calls, 0);
    const inputTokens = rows.reduce((sum, row) => sum + row.inputTokens, 0);
    const outputTokens = rows.reduce((sum, row) => sum + row.outputTokens, 0);
    const estimatedCostUsd = Number(
      rows.reduce((sum, row) => sum + this.estimateCostUsd(row.byModel), 0).toFixed(6),
    );
    const todayKey = this.getCurrentDateKey();
    const todayCalls = rows.find((row) => row.dateKey === todayKey)?.calls ?? 0;

    return {
      month: monthKey,
      calls,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      officialCostUsd: null,
      todayCalls,
    };
  }

  async getUsageByFeature(authUser: AuthenticatedUser, month?: string) {
    const user = await this.ensureUser(authUser);
    const monthKey = month || this.getCurrentMonthKey();
    const rows = await this.prisma.usageDay.findMany({
      where: {
        userId: user.id,
        dateKey: { startsWith: monthKey },
      },
      select: {
        byFeature: true,
      },
    });

    const aggregate: Record<
      string,
      { calls: number; inputTokens: number; outputTokens: number; costUsd: number }
    > = {};
    for (const row of rows) {
      if (!row.byFeature || typeof row.byFeature !== 'object' || Array.isArray(row.byFeature)) {
        continue;
      }
      for (const [feature, payload] of Object.entries(
        row.byFeature as Record<string, unknown>,
      )) {
        if (!payload || typeof payload !== 'object') continue;
        const entry = payload as Record<string, unknown>;
        const existing = aggregate[feature] ?? {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        };
        const calls = this.safeNumber(entry.calls);
        const inputTokens = this.safeNumber(entry.inputTokens);
        const outputTokens = this.safeNumber(entry.outputTokens);
        const byModel = (entry.byModel ?? {}) as Prisma.JsonValue;
        aggregate[feature] = {
          calls: existing.calls + calls,
          inputTokens: existing.inputTokens + inputTokens,
          outputTokens: existing.outputTokens + outputTokens,
          costUsd: Number((existing.costUsd + this.estimateCostUsd(byModel)).toFixed(6)),
        };
      }
    }

    const items = Object.entries(aggregate)
      .map(([feature, usage]) => ({
        feature,
        calls: usage.calls,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: usage.costUsd,
      }))
      .sort((a, b) => b.costUsd - a.costUsd);

    return { items };
  }

  async getSessionUsage(authUser: AuthenticatedUser, sessionId: string) {
    const user = await this.ensureUser(authUser);
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const usage = await this.prisma.usageSession.findUnique({
      where: {
        sessionId: session.id,
      },
      select: {
        calls: true,
        inputTokens: true,
        outputTokens: true,
        byModel: true,
        byFeature: true,
      },
    });
    if (!usage) {
      return {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        byFeature: [],
      };
    }

    return {
      calls: usage.calls,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: this.estimateCostUsd(usage.byModel),
      byFeature: this.getByFeatureArray(usage.byFeature),
    };
  }

  async recordUsage(args: {
    authUser: AuthenticatedUser;
    model: 'haiku' | 'sonnet' | 'opus';
    feature: string;
    inputTokens: number;
    outputTokens: number;
    sessionId?: string | null;
  }) {
    const user = await this.ensureUser(args.authUser);
    const dateKey = this.getCurrentDateKey();
    const byModelDelta = {
      [args.model]: {
        calls: 1,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
      },
    } as Record<string, unknown>;

    const byFeatureDelta = {
      [args.feature]: {
        calls: 1,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        byModel: {
          [args.model]: {
            calls: 1,
            inputTokens: args.inputTokens,
            outputTokens: args.outputTokens,
          },
        },
      },
    } as Record<string, unknown>;

    const day = await this.prisma.usageDay.findUnique({
      where: {
        userId_dateKey: {
          userId: user.id,
          dateKey,
        },
      },
    });

    const nextDayByModel = this.mergeUsageJson(day?.byModel ?? {}, byModelDelta);
    const nextDayByFeature = this.mergeUsageJson(day?.byFeature ?? {}, byFeatureDelta);

    await this.prisma.usageDay.upsert({
      where: {
        userId_dateKey: {
          userId: user.id,
          dateKey,
        },
      },
      create: {
        userId: user.id,
        dateKey,
        calls: 1,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        byModel: nextDayByModel as Prisma.JsonObject,
        byFeature: nextDayByFeature as Prisma.JsonObject,
      },
      update: {
        calls: { increment: 1 },
        inputTokens: { increment: args.inputTokens },
        outputTokens: { increment: args.outputTokens },
        byModel: nextDayByModel as Prisma.JsonObject,
        byFeature: nextDayByFeature as Prisma.JsonObject,
      },
    });

    if (args.sessionId) {
      const session = await this.prisma.session.findFirst({
        where: { id: args.sessionId, userId: user.id },
        select: { id: true },
      });
      if (session) {
        const existing = await this.prisma.usageSession.findUnique({
          where: { sessionId: session.id },
        });
        const nextSessionByModel = this.mergeUsageJson(existing?.byModel ?? {}, byModelDelta);
        const nextSessionByFeature = this.mergeUsageJson(existing?.byFeature ?? {}, byFeatureDelta);
        await this.prisma.usageSession.upsert({
          where: { sessionId: session.id },
          create: {
            userId: user.id,
            sessionId: session.id,
            calls: 1,
            inputTokens: args.inputTokens,
            outputTokens: args.outputTokens,
            byModel: nextSessionByModel as Prisma.JsonObject,
            byFeature: nextSessionByFeature as Prisma.JsonObject,
          },
          update: {
            calls: { increment: 1 },
            inputTokens: { increment: args.inputTokens },
            outputTokens: { increment: args.outputTokens },
            byModel: nextSessionByModel as Prisma.JsonObject,
            byFeature: nextSessionByFeature as Prisma.JsonObject,
            lastUpdatedAt: new Date(),
          },
        });
      }
    }
  }

  private mergeUsageJson(
    base: Prisma.JsonValue,
    delta: Record<string, unknown>,
  ): Record<string, unknown> {
    const baseObject =
      base && typeof base === 'object' && !Array.isArray(base)
        ? (base as Record<string, unknown>)
        : {};
    const out: Record<string, unknown> = { ...baseObject };
    for (const [key, value] of Object.entries(delta)) {
      if (!value || typeof value !== 'object') {
        out[key] = value;
        continue;
      }
      const existing = out[key];
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
        out[key] = value;
        continue;
      }
      out[key] = this.mergeUsageJson(existing as Prisma.JsonValue, value as Record<string, unknown>);
      const merged = out[key] as Record<string, unknown>;
      if ('calls' in merged) {
        merged.calls = this.safeNumber((existing as Record<string, unknown>).calls) + this.safeNumber((value as Record<string, unknown>).calls);
      }
      if ('inputTokens' in merged) {
        merged.inputTokens =
          this.safeNumber((existing as Record<string, unknown>).inputTokens) +
          this.safeNumber((value as Record<string, unknown>).inputTokens);
      }
      if ('outputTokens' in merged) {
        merged.outputTokens =
          this.safeNumber((existing as Record<string, unknown>).outputTokens) +
          this.safeNumber((value as Record<string, unknown>).outputTokens);
      }
    }
    return out;
  }

  private getByFeatureArray(byFeature: Prisma.JsonValue) {
    if (!byFeature || typeof byFeature !== 'object' || Array.isArray(byFeature)) {
      return [];
    }
    return Object.entries(byFeature as Record<string, unknown>).map(([feature, payload]) => {
      const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      return {
        feature,
        calls: this.safeNumber(row.calls),
        inputTokens: this.safeNumber(row.inputTokens),
        outputTokens: this.safeNumber(row.outputTokens),
        costUsd: this.estimateCostUsd((row.byModel ?? {}) as Prisma.JsonValue),
      };
    });
  }

  private estimateCostUsd(byModel: Prisma.JsonValue): number {
    if (!byModel || typeof byModel !== 'object' || Array.isArray(byModel)) {
      return 0;
    }
    const modelObj = byModel as Record<string, unknown>;
    const calc = (inputTokens: number, outputTokens: number, inPrice: number, outPrice: number) =>
      (inputTokens / 1_000_000) * inPrice + (outputTokens / 1_000_000) * outPrice;
    const priceByModel: Record<string, { input: number; output: number }> = {
      haiku: {
        input: this.config.get('HAIKU_INPUT_COST_PER_MILLION_USD'),
        output: this.config.get('HAIKU_OUTPUT_COST_PER_MILLION_USD'),
      },
      sonnet: {
        input: this.config.get('SONNET_INPUT_COST_PER_MILLION_USD'),
        output: this.config.get('SONNET_OUTPUT_COST_PER_MILLION_USD'),
      },
      opus: {
        input: this.config.get('OPUS_INPUT_COST_PER_MILLION_USD'),
        output: this.config.get('OPUS_OUTPUT_COST_PER_MILLION_USD'),
      },
    };

    let total = 0;
    for (const [model, payload] of Object.entries(modelObj)) {
      if (!payload || typeof payload !== 'object') continue;
      const row = payload as Record<string, unknown>;
      const inputTokens = this.safeNumber(row.inputTokens);
      const outputTokens = this.safeNumber(row.outputTokens);
      const prices = priceByModel[model] ?? priceByModel.sonnet;
      total += calc(inputTokens, outputTokens, prices.input, prices.output);
    }
    return Number(total.toFixed(6));
  }

  private safeNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getCurrentMonthKey(date: Date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private getCurrentDateKey(date: Date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private async ensureUser(authUser: AuthenticatedUser) {
    return this.prisma.user.upsert({
      where: { supabaseUserId: authUser.supabaseUserId },
      update: {
        email: authUser.email,
      },
      create: {
        supabaseUserId: authUser.supabaseUserId,
        email: authUser.email,
      },
    });
  }

  private toBudgetConfigResponse(
    status: Awaited<ReturnType<BudgetService['getBudgetStatus']>>,
  ) {
    return {
      monthlyBudgetUsd: status.monthlyBudgetUsd,
      alertThresholds: status.alertThresholds,
      hardStopAtBudget: status.hardStopAtBudget,
      autoDowngradeNearBudget: status.autoDowngradeNearBudget,
      autoDowngradeThresholdPct: status.autoDowngradeThresholdPct,
      cooldownSeconds: status.cooldownSeconds,
      lastAlertThreshold: status.lastAlertThreshold,
      usage: {
        month: status.month,
        calls: status.calls,
        inputTokens: status.inputTokens,
        outputTokens: status.outputTokens,
        estimatedCostUsd: status.estimatedCostUsd,
        spendPercent: status.spendPercent,
        nearBudget: status.nearBudget,
        overBudget: status.overBudget,
      },
    };
  }
}
