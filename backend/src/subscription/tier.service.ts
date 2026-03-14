import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SubscriptionTier } from '@prisma/client';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/auth/types';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';

export type EffectiveTier = SubscriptionTier | 'admin';

export interface TierInfo {
  tier: SubscriptionTier;
  effectiveTier: EffectiveTier;
  isAdmin: boolean;
  isSponsored: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  billingCycleStart: Date | null;
}

const TIER_RANK: Record<EffectiveTier, number> = {
  free: 0,
  starter: 1,
  advanced: 2,
  pro: 3,
  premium: 4,
  sponsored: 5,
  admin: 6,
};

@Injectable()
export class TierService {
  private readonly adminEmails: Set<string>;
  private readonly sponsoredEmails: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {
    this.adminEmails = new Set(
      this.config
        .get('ADMIN_DASHBOARD_ALLOWED_EMAILS')
        .split(',')
        .map((email: string) => email.trim().toLowerCase())
        .filter(Boolean),
    );
    this.sponsoredEmails = new Set(
      this.config
        .get('SPONSORED_EMAILS')
        .split(',')
        .map((email: string) => email.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  isAdminEmail(email: string | undefined): boolean {
    if (!email) return false;
    return this.adminEmails.has(email.toLowerCase());
  }

  isSponsoredEmail(email: string | undefined): boolean {
    if (!email) return false;
    return this.sponsoredEmails.has(email.toLowerCase());
  }

  /** Returns true for admin or sponsored users — both get unlimited AI. */
  hasUnlimitedCredits(email: string | undefined, isAdmin = false): boolean {
    return isAdmin || this.isAdminEmail(email) || this.isSponsoredEmail(email);
  }

  async getTierInfo(authUser: AuthenticatedUser): Promise<TierInfo> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const email = user.email ?? undefined;
    const isAdmin = Boolean(authUser.isAdmin) || this.isAdminEmail(email);
    const isSponsored = this.isSponsoredEmail(email);
    const now = new Date();
    const isTrial = user.trialEndsAt !== null && user.trialEndsAt > now;

    let effectiveTier: EffectiveTier = user.tier;
    if (isAdmin) {
      effectiveTier = 'admin';
    } else if (isSponsored) {
      effectiveTier = 'sponsored';
    }

    return {
      tier: user.tier,
      effectiveTier,
      isAdmin,
      isSponsored,
      isTrial,
      trialEndsAt: user.trialEndsAt,
      billingCycleStart: user.billingCycleStart,
    };
  }

  hasAccess(effectiveTier: EffectiveTier, requiredTier: SubscriptionTier): boolean {
    return TIER_RANK[effectiveTier] >= TIER_RANK[requiredTier];
  }

  async setTier(
    authUser: AuthenticatedUser,
    tier: SubscriptionTier,
    options?: { trialEndsAt?: Date; billingCycleStart?: Date },
  ): Promise<void> {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        tier,
        trialEndsAt: options?.trialEndsAt ?? null,
        billingCycleStart: options?.billingCycleStart ?? null,
      },
    });
  }
}
