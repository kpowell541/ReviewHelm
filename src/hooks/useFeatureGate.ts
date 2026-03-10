import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useTierStore, hasAccess } from '../store/useTierStore';
import { crossAlert } from '../utils/alert';

type SubscriptionTier = 'free' | 'starter' | 'pro' | 'premium' | 'sponsored';

interface FeatureGateResult {
  /** Whether the user's effective tier meets the requirement */
  allowed: boolean;
  /** Navigate if allowed, show upgrade prompt if not */
  guardedNavigate: (path: string) => void;
}

/**
 * Hook to gate features by subscription tier.
 * Returns `allowed` boolean and a `guardedNavigate` that shows an upgrade
 * prompt instead of navigating when the user's tier is insufficient.
 */
export function useFeatureGate(requiredTier: SubscriptionTier): FeatureGateResult {
  const effectiveTier = useTierStore((s) => s.effectiveTier);
  const router = useRouter();

  const allowed = hasAccess(effectiveTier, requiredTier);

  const guardedNavigate = useCallback(
    (path: string) => {
      if (allowed) {
        router.push(path as any);
        return;
      }
      const tierLabel = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);
      crossAlert(
        'Upgrade Required',
        `This feature requires a ${tierLabel} subscription. Upgrade in Settings to unlock it.`,
      );
    },
    [allowed, requiredTier, router],
  );

  return { allowed, guardedNavigate };
}
