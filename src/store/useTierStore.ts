import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';
import { api } from '../api/client';

type SubscriptionTier = 'free' | 'pro' | 'premium' | 'sponsored';
type EffectiveTier = SubscriptionTier | 'admin';

interface TierState {
  hasHydrated: boolean;
  tier: SubscriptionTier;
  effectiveTier: EffectiveTier;
  isAdmin: boolean;
  isSponsored: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  creditBalanceUsd: number;
  unlimited: boolean;

  fetchTierInfo: () => Promise<void>;
  fetchCreditBalance: () => Promise<void>;
  syncTier: () => Promise<void>;
  startCheckout: (plan: 'pro' | 'premium') => Promise<string>;
  startTopUp: (amountUsd: 1 | 5 | 10) => Promise<string>;
  openPortal: () => Promise<string>;
}

const TIER_RANK: Record<EffectiveTier, number> = {
  free: 0,
  pro: 1,
  premium: 2,
  sponsored: 3,
  admin: 4,
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
          }>('/subscription/tier');
          set({
            tier: info.tier,
            effectiveTier: info.effectiveTier,
            isAdmin: info.isAdmin,
            isSponsored: info.isSponsored,
            isTrial: info.isTrial,
            trialEndsAt: info.trialEndsAt,
          });
        } catch {
          // Offline or not authenticated — keep cached values
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
        } catch {
          // Offline or not authenticated — keep cached values
        }
      },

      syncTier: async () => {
        await get().fetchTierInfo();
        await get().fetchCreditBalance();
      },

      startCheckout: async (plan) => {
        const baseUrl = window?.location?.origin ?? 'reviewhelm://';
        const result = await api.post<{ url: string }>('/subscription/subscribe', {
          plan,
          successUrl: `${baseUrl}/plans?checkout=success`,
          cancelUrl: `${baseUrl}/plans?checkout=cancelled`,
        });
        return result.url;
      },

      startTopUp: async (amountUsd) => {
        const baseUrl = window?.location?.origin ?? 'reviewhelm://';
        const result = await api.post<{ url: string }>('/subscription/credits/topup', {
          amountUsd,
          successUrl: `${baseUrl}/plans?topup=success`,
          cancelUrl: `${baseUrl}/plans?topup=cancelled`,
        });
        return result.url;
      },

      openPortal: async () => {
        const baseUrl = window?.location?.origin ?? 'reviewhelm://';
        const result = await api.post<{ url: string }>('/subscription/portal', {
          returnUrl: `${baseUrl}/settings`,
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
