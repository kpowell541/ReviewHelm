import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ClaudeModel } from '@prisma/client';
import { IS_AI_ENDPOINT_KEY, IS_PUBLIC_KEY } from '../auth/constants';
import type { AuthenticatedUser } from '../auth/types';
import { AuditService } from '../audit/audit.service';
import { BudgetService } from './budget.service';

interface RequestLike {
  user?: AuthenticatedUser;
  body?: Record<string, unknown>;
  path?: string;
  aiBudget?: {
    requestedModel: ClaudeModel;
    resolvedModel: ClaudeModel;
    autoDowngraded: boolean;
  };
}

interface ResponseLike {
  setHeader: (name: string, value: string) => void;
}

@Injectable()
export class BudgetGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly budgetService: BudgetService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isAiEndpoint = this.reflector.getAllAndOverride<boolean>(IS_AI_ENDPOINT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<RequestLike>();
    if (!isAiEndpoint && !this.looksLikeAiPath(req.path)) {
      return true;
    }
    if (!req.user) {
      return true;
    }

    const response = context.switchToHttp().getResponse<ResponseLike>();
    const requestedModel = this.resolveRequestedModel(req.body);
    const decision = await this.budgetService.enforceAiBudgetPolicy(req.user, requestedModel);

    response.setHeader('x-budget-spend-percent', String(decision.budget.spendPercent));
    response.setHeader('x-budget-estimated-usd', String(decision.budget.estimatedCostUsd));
    if (decision.alertThreshold !== null) {
      response.setHeader('x-budget-alert-threshold', String(decision.alertThreshold));
      await this.audit.write({
        eventType: 'budget_alert_threshold_crossed',
        eventScope: 'billing.budget',
        details: {
          actorSupabaseUserId: req.user.supabaseUserId,
          threshold: decision.alertThreshold,
          spendPercent: decision.budget.spendPercent,
          estimatedCostUsd: decision.budget.estimatedCostUsd,
        },
      });
    }

    if (decision.block) {
      await this.audit.write({
        eventType: 'budget_blocked_request',
        eventScope: 'billing.budget',
        severity: 'warn',
        details: {
          actorSupabaseUserId: req.user.supabaseUserId,
          spendPercent: decision.budget.spendPercent,
          estimatedCostUsd: decision.budget.estimatedCostUsd,
          monthlyBudgetUsd: decision.budget.monthlyBudgetUsd,
        },
      });
      throw new HttpException(
        'Budget limit reached for this billing month.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (
      decision.autoDowngraded &&
      req.body &&
      typeof req.body.model === 'string' &&
      req.body.model !== decision.resolvedModel
    ) {
      req.body.model = decision.resolvedModel;
      response.setHeader('x-ai-auto-downgraded', 'true');
    }
    req.aiBudget = {
      requestedModel,
      resolvedModel: decision.resolvedModel,
      autoDowngraded: decision.autoDowngraded,
    };

    return true;
  }

  private resolveRequestedModel(body: Record<string, unknown> | undefined): ClaudeModel {
    const model = body?.model;
    if (model === 'haiku' || model === 'sonnet' || model === 'opus') {
      return model;
    }
    const feature = body?.feature;
    if (feature === 'comment-drafter') {
      return 'haiku';
    }
    return 'sonnet';
  }

  private looksLikeAiPath(path?: string): boolean {
    if (!path) {
      return false;
    }
    return /\/ai\//.test(path);
  }
}
