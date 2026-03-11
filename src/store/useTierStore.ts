import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';
import { api } from '../api/client';

type SubscriptionTier = 'free' | 'starter' | 'pro' | 'premium' | 'sponsored';
type EffectiveTier = SubscriptionTier | 'admin';

interface TierState {
  hasHydrated: boolean;
  tier: SubscriptionTier;
  effectiveTier: EffectiveTier;
  isAdmin: boolean;
  isSponsored: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  billingCycleStart: string | null;
  creditBalanceUsd: number;
  unlimited: boolean;

  fetchTierInfo: () => Promise<void>;
  fetchCreditBalance: () => Promise<void>;
  syncTier: () => Promise<void>;
  startCheckout: (plan: 'starter' | 'pro' | 'premium', options?: { trial?: boolean }) => Promise<string>;
  startTopUp: (amountUsd: 1 | 5 | 10 | 20) => Promise<string>;
  openPortal: () => Promise<string>;
}

const TIER_RANK: Record<EffectiveTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 3,
  sponsored: 4,
  admin: 5,
};

export const useTierStore = create<TierState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      tier: 'free',
      effectiveTier: 'free',
      isAdmin: false,
      isSponsored: false,
      isTrial: false,
      trialEndsAt: null,
      billingCycleStart: null,
      creditBalanceUsd: 0,
      unlimited: false,

      fetchTierInfo: async () => {
        try {
          const info = await api.get<{
            tier: SubscriptionTier;
            effectiveTier: EffectiveTier;
            isAdmin: boolean;
            isSponsored: boolean;
            isTrial: boolean;
            trialEndsAt: string | null;
            billingCycleStart: string | null;
          }>('/subscription/tier');
          set({
            tier: info.tier,
            effectiveTier: info.effectiveTier,
            isAdmin: info.isAdmin,
            isSponsored: info.isSponsored,
            isTrial: info.isTrial,
            trialEndsAt: info.trialEndsAt,
            billingCycleStart: info.billingCycleStart,
          });
        } catch (err) {
          console.warn('[TierStore] fetchTierInfo failed:', err);
        }
      },

      fetchCreditBalance: async () => {
        try {
          const credits = await api.get<{
            balanceUsd: number;
            unlimited: boolean;
          }>('/subscription/credits');
          set({
            creditBalanceUsd: credits.balanceUsd,
            unlimited: credits.unlimited,
          });
        } catch (err) {
          console.warn('[TierStore] fetchCreditBalance failed:', err);
        }
      },

      syncTier: async () => {
        await get().fetchTierInfo();
        await get().fetchCreditBalance();
      },

      startCheckout: async (plan, options) => {
        const baseUrl = window?.location?.origin ?? 'reviewhelm://';
        const result = await api.post<{ url: string }>('/subscription/subscribe', {
          plan,
          trial: options?.trial,
          successUrl: `${baseUrl}/plans?checkout=success`,
          cancelUrl: `${baseUrl}/plans?checkout=cancelled`,
        }, {
          idempotencyKey: generateIdempotencyKey(),
        });
        return result.url;
      },

      startTopUp: async (amountUsd) => {
        const baseUrl = window?.location?.origin ?? 'reviewhelm://';
        const result = await api.post<{ url: string }>('/subscription/credits/topup', {
          amountUsd,
          successUrl: `${baseUrl}/plans?topup=success`,
          cancelUrl: `${baseUrl}/plans?topup=cancelled`,
        }, {
          idempotencyKey: generateIdempotencyKey(),
        });
        return result.url;
      },

      openPortal: async () => {
        const baseUrl = window?.location?.origin ?? 'reviewhelm://';
        const result = await api.post<{ url: string }>('/subscription/portal', {
          returnUrl: `${baseUrl}/settings`,
        }, {
          idempotencyKey: generateIdempotencyKey(),
        });
        return result.url;
      },
    }),
    {
      name: 'reviewhelm-tier',
      storage: createJSONStorage(() => persistStorage),
      partialize: (state) => ({
        tier: state.tier,
        effectiveTier: state.effectiveTier,
        isAdmin: state.isAdmin,
        isSponsored: state.isSponsored,
        isTrial: state.isTrial,
        trialEndsAt: state.trialEndsAt,
        billingCycleStart: state.billingCycleStart,
        creditBalanceUsd: state.creditBalanceUsd,
        unlimited: state.unlimited,
      }),
      onRehydrateStorage: () => () => {
        useTierStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/** Check if user's effective tier meets the required tier */
export function hasAccess(
  effectiveTier: EffectiveTier,
  requiredTier: SubscriptionTier,
): boolean {
  return TIER_RANK[effectiveTier] >= TIER_RANK[requiredTier];
}

function generateIdempotencyKey(): string {
  const random = Math.random().toString(36).slice(2, 18);
  const timestamp = Date.now().toString(36);
  return `rh_${timestamp}_${random}`;
}
