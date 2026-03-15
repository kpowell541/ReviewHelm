import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { persistStorage } from '../storage/secureStorage';
import { api } from '../api/client';
import { createLogger } from '../observability/logger';

const log = createLogger('tier');
import type { ApiSubscriptionTier, ApiSubscriptionCredits, ApiStripeCheckout } from '../api/schema';
import { useAuthStore } from './useAuthStore';

export type SubscriptionTier = 'free' | 'starter' | 'advanced' | 'pro' | 'premium' | 'sponsored';
export type EffectiveTier = SubscriptionTier | 'admin';

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
  startCheckout: (plan: 'starter' | 'advanced' | 'pro' | 'premium', options?: { trial?: boolean }) => Promise<string>;
  startTopUp: (amountUsd: 1 | 5 | 10 | 20) => Promise<string>;
  openPortal: () => Promise<string>;
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
          const info = await api.get<ApiSubscriptionTier>('/subscription/tier');
          set({
            tier: info.tier,
            effectiveTier: info.effectiveTier,
            isAdmin: info.isAdmin,
            isSponsored: info.isSponsored,
            isTrial: info.isTrial,
            trialEndsAt: info.trialEndsAt,
            billingCycleStart: info.billingCycleStart,
          });
        } catch (err: unknown) {
          log.warn('fetchTierInfo failed', { error: err instanceof Error ? err.message : String(err) });
        }
      },

      fetchCreditBalance: async () => {
        try {
          const credits = await api.get<ApiSubscriptionCredits>('/subscription/credits');
          set({
            creditBalanceUsd: credits.balanceUsd,
            unlimited: credits.unlimited,
          });
        } catch (err: unknown) {
          log.warn('fetchCreditBalance failed', { error: err instanceof Error ? err.message : String(err) });
        }
      },

      syncTier: async () => {
        const token = await useAuthStore.getState().getAccessToken();
        if (!token) return;
        await get().fetchTierInfo();
        await get().fetchCreditBalance();
      },

      startCheckout: async (plan, options) => {
        const baseUrl = getBaseUrl();
        const result = await api.post<ApiStripeCheckout>('/subscription/subscribe', {
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
        const baseUrl = getBaseUrl();
        const result = await api.post<ApiStripeCheckout>('/subscription/credits/topup', {
          amountUsd,
          successUrl: `${baseUrl}/plans?topup=success`,
          cancelUrl: `${baseUrl}/plans?topup=cancelled`,
        }, {
          idempotencyKey: generateIdempotencyKey(),
        });
        return result.url;
      },

      openPortal: async () => {
        const baseUrl = getBaseUrl();
        const result = await api.post<ApiStripeCheckout>('/subscription/portal', {
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

function getBaseUrl(): string {
  if (Platform.OS === 'web') {
    try {
      return window.location.origin;
    } catch {
      return 'https://reviewhelm.app';
    }
  }
  return Linking.createURL('/').replace(/\/$/, '');
}

function generateIdempotencyKey(): string {
  const random = crypto.randomUUID();
  return `rh_${random}`;
}
