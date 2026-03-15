import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { AuthPrincipal } from '../auth/types';
import { getAdminGroups, getEnv, getSponsoredEmails } from '../config/env';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { upsertUserFromPrincipal } from '../me/repository';

export type SubscriptionTier = 'free' | 'starter' | 'advanced' | 'pro' | 'premium';
export type EffectiveTier = SubscriptionTier | 'sponsored' | 'admin';

const TIER_RANK: Record<EffectiveTier, number> = {
  free: 0,
  starter: 1,
  advanced: 2,
  pro: 3,
  premium: 4,
  sponsored: 5,
  admin: 6,
};

function isAdminPrincipal(principal: AuthPrincipal): boolean {
  const adminGroups = getAdminGroups(getEnv());
  return principal.groups.some((group) => adminGroups.includes(group));
}

function isSponsoredEmail(email: string | null): boolean {
  if (!email) return false;
  const sponsoredEmails = getSponsoredEmails(getEnv());
  return sponsoredEmails.includes(email.toLowerCase());
}

function hasUnlimitedCredits(email: string | null, isAdmin: boolean): boolean {
  return isAdmin || isSponsoredEmail(email);
}

function asTier(value: string): SubscriptionTier {
  switch (value) {
    case 'starter':
    case 'advanced':
    case 'pro':
    case 'premium':
      return value;
    default:
      return 'free';
  }
}

export async function getTierInfo(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const email = user.email ?? null;
  const isAdmin = isAdminPrincipal(principal);
  const isSponsored = isSponsoredEmail(email);
  const now = new Date();
  const isTrial = user.trialEndsAt !== null && user.trialEndsAt > now;

  let effectiveTier: EffectiveTier = asTier(user.tier);
  if (isAdmin) {
    effectiveTier = 'admin';
  } else if (isSponsored) {
    effectiveTier = 'sponsored';
  }

  return {
    tier: asTier(user.tier),
    effectiveTier,
    isAdmin,
    isSponsored,
    isTrial,
    trialEndsAt: user.trialEndsAt,
    billingCycleStart: user.billingCycleStart,
  };
}

export async function getCreditBalance(principal: AuthPrincipal) {
  const user = await upsertUserFromPrincipal(principal);
  const isAdmin = isAdminPrincipal(principal);

  return {
    balanceUsd: Number(user.creditBalanceUsd),
    unlimited: hasUnlimitedCredits(user.email ?? null, isAdmin),
  };
}

export function hasTierAccess(effectiveTier: EffectiveTier, requiredTier: SubscriptionTier): boolean {
  return TIER_RANK[effectiveTier] >= TIER_RANK[requiredTier];
}

export async function setTierForSubject(
  subject: string,
  input: {
    tier: SubscriptionTier;
    trialEndsAt?: Date | null;
    billingCycleStart?: Date | null;
  },
) {
  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({
      tier: input.tier,
      trialEndsAt: input.trialEndsAt ?? null,
      billingCycleStart: input.billingCycleStart ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.authSubject, subject))
    .returning();

  return updated;
}

export async function deductCredits(principal: AuthPrincipal, amountUsd: number) {
  const user = await upsertUserFromPrincipal(principal);
  const isAdmin = isAdminPrincipal(principal);
  if (hasUnlimitedCredits(user.email ?? null, isAdmin)) {
    return {
      balanceUsd: Number(user.creditBalanceUsd),
      unlimited: true,
    };
  }

  if (amountUsd <= 0) {
    return {
      balanceUsd: Number(user.creditBalanceUsd),
      unlimited: false,
    };
  }

  const currentBalance = Number(user.creditBalanceUsd);
  if (currentBalance < amountUsd) {
    throw new HTTPException(403, { message: 'Insufficient AI credits.' });
  }

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({
      creditBalanceUsd: String(Number((currentBalance - amountUsd).toFixed(4))),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return {
    balanceUsd: Number(updated.creditBalanceUsd),
    unlimited: false,
  };
}
