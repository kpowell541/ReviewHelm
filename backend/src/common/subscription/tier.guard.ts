import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SubscriptionTier } from '@prisma/client';
import { IS_PUBLIC_KEY, REQUIRED_TIER_KEY, REQUIRES_CREDITS_KEY } from '../auth/constants';
import type { AuthenticatedUser } from '../auth/types';
import { AuditService } from '../audit/audit.service';
import { TierService } from '../../subscription/tier.service';
import { CreditService } from '../../subscription/credit.service';

interface RequestLike {
  user?: AuthenticatedUser;
  path?: string;
  method?: string;
  requestId?: string;
}

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tierService: TierService,
    private readonly creditService: CreditService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredTier = this.reflector.getAllAndOverride<SubscriptionTier | undefined>(
      REQUIRED_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiresCredits = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_CREDITS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTier && !requiresCredits) return true;

    const req = context.switchToHttp().getRequest<RequestLike>();
    if (!req.user) return true;

    if (requiredTier) {
      const tierInfo = await this.tierService.getTierInfo(req.user);
      if (!this.tierService.hasAccess(tierInfo.effectiveTier, requiredTier)) {
        void this.audit.write({
          eventType: 'tier_access_denied',
          eventScope: 'subscription.tier',
          severity: 'warn',
          requestId: req.requestId,
          details: {
            actorSupabaseUserId: req.user.supabaseUserId,
            requiredTier,
            effectiveTier: tierInfo.effectiveTier,
            path: req.path,
            method: req.method,
          },
        });
        throw new ForbiddenException(
          `This feature requires a ${requiredTier} subscription or higher`,
        );
      }
    }

    if (requiresCredits) {
      const canAfford = await this.creditService.canAffordAiCall(req.user);
      if (!canAfford) {
        void this.audit.write({
          eventType: 'credit_insufficient',
          eventScope: 'subscription.credits',
          severity: 'warn',
          requestId: req.requestId,
          details: {
            actorSupabaseUserId: req.user.supabaseUserId,
            path: req.path,
            method: req.method,
          },
        });
        throw new HttpException(
          'Insufficient AI credits. Please top up to continue.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    return true;
  }
}
