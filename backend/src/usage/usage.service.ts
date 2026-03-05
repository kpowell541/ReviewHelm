import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import { BudgetService } from '../common/budget/budget.service';
import { UpdateBudgetConfigDto } from './dto/update-budget-config.dto';

@Injectable()
export class UsageService {
  constructor(private readonly budgetService: BudgetService) {}

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
