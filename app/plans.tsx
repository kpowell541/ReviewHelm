import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useTierStore } from '../src/store/useTierStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { crossAlert } from '../src/utils/alert';
import { api } from '../src/api/client';

interface PlanFeature {
  label: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  premium: boolean | string;
}

const FEATURES: PlanFeature[] = [
  { label: 'PR review checklists', free: true, starter: true, pro: true, premium: true },
  { label: 'Search & bookmarks', free: true, starter: true, pro: true, premium: true },
  { label: 'Active sessions', free: '5 max', starter: 'Unlimited', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Polish My PR mode', free: false, starter: true, pro: true, premium: true },
  { label: 'PR tracker', free: false, starter: true, pro: true, premium: true },
  { label: 'Readiness dashboard', free: false, starter: true, pro: true, premium: true },
  { label: 'Trends & past reviews', free: false, starter: true, pro: true, premium: true },
  { label: 'Comment profiles', free: false, starter: true, pro: true, premium: true },
  { label: 'Diff artifacts', free: false, starter: true, pro: true, premium: true },
  { label: 'Calibration & risk', free: false, starter: true, pro: true, premium: true },
  { label: 'Learn mode', free: false, starter: false, pro: true, premium: true },
  { label: 'Knowledge gaps', free: false, starter: false, pro: true, premium: true },
  { label: 'Spaced repetition', free: false, starter: false, pro: true, premium: true },
  { label: 'AI tutor (Premium only)', free: false, starter: false, pro: false, premium: true },
  { label: 'Comment drafter (AI)', free: false, starter: false, pro: false, premium: true },
  { label: 'Deep dive (AI)', free: false, starter: false, pro: false, premium: true },
  { label: 'AI credits ($7.50/mo)', free: '-', starter: '-', pro: '-', premium: 'Included' },
  { label: 'Tutor conversations sync', free: false, starter: false, pro: false, premium: true },
  { label: '2-week free trial', free: '-', starter: '-', pro: 'Available', premium: 'Available' },
];

const MODEL_COSTS = [
  { model: 'Haiku', input: '$1', output: '$5', note: 'Comment drafter default' },
  { model: 'Sonnet', input: '$3', output: '$15', note: 'Tutor default' },
  { model: 'Opus', input: '$15', output: '$75', note: 'Highest quality' },
];

function CheckMark({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <Text style={styles.featureValue}>{value}</Text>;
  }
  return (
    <Text style={[styles.featureCheck, !value && styles.featureMissing]}>
      {value ? '✓' : '-'}
    </Text>
  );
}

function openCheckoutUrl(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    void Linking.openURL(url);
  }
}

export default function PlansScreen() {
  const effectiveTier = useTierStore((s) => s.effectiveTier);
  const billingCycleStart = useTierStore((s) => s.billingCycleStart);
  const creditBalanceUsd = useTierStore((s) => s.creditBalanceUsd);
  const unlimited = useTierStore((s) => s.unlimited);
  const startCheckout = useTierStore((s) => s.startCheckout);
  const startTopUp = useTierStore((s) => s.startTopUp);
  const openPortal = useTierStore((s) => s.openPortal);
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState<string | null>(null);
  const [isRegionAllowed, setIsRegionAllowed] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get<{ allowed: boolean }>('/region/status', { public: true })
      .then((status) => {
        if (!mounted) return;
        setIsRegionAllowed(status.allowed);
      })
      .catch(() => {
        // Keep default true when region checks are unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const creditExpiryDate = useMemo(() => {
    if (!billingCycleStart) return null;
    const d = new Date(billingCycleStart);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [billingCycleStart]);

  const handleSubscribe = async (plan: 'starter' | 'pro' | 'premium', trial?: boolean) => {
    if (!isRegionAllowed) {
      crossAlert('Unavailable', 'Purchases are currently available only in the United States.');
      return;
    }
    setLoading(trial ? `trial-${plan}` : plan);
    try {
      const url = await startCheckout(plan, { trial });
      openCheckoutUrl(url);
    } catch (err: any) {
      const msg = err?.message || 'Unable to start checkout';
      crossAlert('Checkout Error', msg);
    } finally {
      setLoading(null);
    }
  };

  const handleTopUp = async (amount: 1 | 5 | 10 | 20) => {
    if (!isRegionAllowed) {
      crossAlert('Unavailable', 'Purchases are currently available only in the United States.');
      return;
    }
    setLoading(`topup-${amount}`);
    try {
      const url = await startTopUp(amount);
      openCheckoutUrl(url);
    } catch (err: any) {
      const msg = err?.message || 'Unable to start top-up';
      crossAlert('Top-up Error', msg);
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    if (!isRegionAllowed) {
      crossAlert('Unavailable', 'Purchases are currently available only in the United States.');
      return;
    }
    setLoading('portal');
    try {
      const url = await openPortal();
      openCheckoutUrl(url);
    } catch (err: any) {
      const msg = err?.message || 'Unable to open billing portal';
      crossAlert('Portal Error', msg);
    } finally {
      setLoading(null);
    }
  };

  const isPaid = effectiveTier !== 'free';

  return (
    <SafeAreaView style={styles.container}>
      <DesktopContainer>
        <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
          <Text style={styles.heading}>Plans & Pricing</Text>
          {!isRegionAllowed && (
            <Text style={styles.regionNotice}>
              Purchases are currently available only in the United States.
            </Text>
          )}

          <View style={styles.plansRow}>
            <PlanCard
              name="Free"
              price="$0"
              period=""
              features={['PR checklists', 'Search & bookmarks', '5 active sessions']}
              isCurrent={effectiveTier === 'free'}
            />
            <PlanCard
              name="Starter"
              price="$3"
              period="/mo"
              features={['Everything in Free', 'Unlimited sessions', 'Polish mode', 'PR tracker & analytics']}
              isCurrent={effectiveTier === 'starter'}
              actionLabel={effectiveTier === 'free' ? 'Upgrade to Starter' : undefined}
              onAction={() => handleSubscribe('starter')}
              loading={loading === 'starter'}
              disabled={!isRegionAllowed}
            />
            <PlanCard
              name="Pro"
              price="$7"
              period="/mo"
              features={['Everything in Starter', 'Learn mode', 'Knowledge gaps', 'Spaced repetition']}
              isCurrent={effectiveTier === 'pro'}
              trialBadge
              actionLabel={
                effectiveTier === 'free' || effectiveTier === 'starter'
                  ? 'Upgrade to Pro'
                  : undefined
              }
              onAction={() => handleSubscribe('pro')}
              loading={loading === 'pro'}
              disabled={!isRegionAllowed}
            />
            <PlanCard
              name="Premium"
              price="$15"
              period="/mo"
              features={['Everything in Pro', 'AI tutor & drafter', '$7.50/mo AI credits included', 'Tutor sync']}
              isCurrent={effectiveTier === 'premium' || effectiveTier === 'sponsored' || effectiveTier === 'admin'}
              highlighted
              trialBadge
              actionLabel={
                effectiveTier === 'free' || effectiveTier === 'starter' || effectiveTier === 'pro'
                  ? 'Upgrade to Premium'
                  : undefined
              }
              onAction={() => handleSubscribe('premium')}
              loading={loading === 'premium'}
              disabled={!isRegionAllowed}
            />
          </View>

          {isPaid && (
            <Pressable
              style={styles.manageButton}
              onPress={handleManage}
              disabled={loading === 'portal' || !isRegionAllowed}
            >
              {loading === 'portal' ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.manageButtonText}>Manage Subscription</Text>
              )}
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>Feature Comparison</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Text style={[styles.comparisonHeaderCell, styles.featureNameCell]}>Feature</Text>
              <Text style={styles.comparisonHeaderCell}>Free</Text>
              <Text style={styles.comparisonHeaderCell}>Starter</Text>
              <Text style={styles.comparisonHeaderCell}>Pro</Text>
              <Text style={styles.comparisonHeaderCell}>Premium</Text>
            </View>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.comparisonRow}>
                <Text style={[styles.comparisonCell, styles.featureNameCell]} numberOfLines={1}>
                  {f.label}
                </Text>
                <View style={styles.comparisonCell}><CheckMark value={f.free} /></View>
                <View style={styles.comparisonCell}><CheckMark value={f.starter} /></View>
                <View style={styles.comparisonCell}><CheckMark value={f.pro} /></View>
                <View style={styles.comparisonCell}><CheckMark value={f.premium} /></View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>AI Model Costs</Text>
          <Text style={styles.costHint}>
            Per million tokens. Credits are deducted based on actual usage. Only Premium subscribers can use AI features.
          </Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Text style={[styles.comparisonHeaderCell, styles.featureNameCell]}>Model</Text>
              <Text style={styles.comparisonHeaderCell}>Input</Text>
              <Text style={styles.comparisonHeaderCell}>Output</Text>
              <Text style={[styles.comparisonHeaderCell, styles.featureNameCell]}>Note</Text>
            </View>
            {MODEL_COSTS.map((m) => (
              <View key={m.model} style={styles.comparisonRow}>
                <Text style={[styles.comparisonCell, styles.featureNameCell]}>{m.model}</Text>
                <Text style={styles.comparisonCell}>{m.input}</Text>
                <Text style={styles.comparisonCell}>{m.output}</Text>
                <Text style={[styles.comparisonCell, styles.featureNameCell, styles.costNote]}>
                  {m.note}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Credit Top-ups</Text>
          <View style={styles.topUpRow}>
            {([1, 5, 10, 20] as const).map((amount) => (
              <Pressable
                key={amount}
                style={styles.topUpCard}
                onPress={() => handleTopUp(amount)}
                disabled={!isRegionAllowed || (effectiveTier !== 'premium' && effectiveTier !== 'admin')}
              >
                <Text style={styles.topUpAmount}>${amount}</Text>
                <Text style={styles.topUpLabel}>one-time</Text>
                {loading === `topup-${amount}` && (
                  <ActivityIndicator color={colors.primary} size="small" style={{ marginTop: spacing.xs }} />
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.expiryNotice}>
            <Text style={styles.expiryNoticeTitle}>Credit Expiry Policy</Text>
            <Text style={styles.costHint}>
              Credits expire at the end of each billing month and do not roll over. You will be notified 7 days and 1 day before your credits expire.
              {creditExpiryDate && !unlimited && creditBalanceUsd > 0
                ? ` Your current credits ($${creditBalanceUsd.toFixed(2)}) expire on ${creditExpiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
                : ''}
            </Text>
            {effectiveTier !== 'premium' && effectiveTier !== 'admin' && (
              <Text style={styles.costHint}>
                Top-ups are available for Premium subscribers only.
              </Text>
            )}
          </View>

          <View style={styles.expiryNotice}>
            <Text style={styles.expiryNoticeTitle}>Cancellation & Refunds</Text>
            <Text style={styles.costHint}>
              You may cancel at any time. Stripe will issue a prorated refund for the unused portion of your billing period. AI credits are also prorated — you will not receive a full refund for unused credits.
            </Text>
          </View>
        </ScrollView>
      </DesktopContainer>
    </SafeAreaView>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  isCurrent,
  highlighted,
  trialBadge,
  actionLabel,
  onAction,
  loading: isLoading,
  disabled,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent: boolean;
  highlighted?: boolean;
  trialBadge?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        styles.planCard,
        highlighted && styles.planCardHighlighted,
        isCurrent && styles.planCardCurrent,
      ]}
    >
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>Current</Text>
        </View>
      )}
      {trialBadge && !isCurrent && (
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>2-week free trial</Text>
        </View>
      )}
      <Text style={styles.planName}>{name}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.planPrice, highlighted && styles.planPriceHighlighted]}>
          {price}
        </Text>
        {period ? <Text style={styles.planPeriod}>{period}</Text> : null}
      </View>
      <View style={styles.planFeatures}>
        {features.map((f) => (
          <Text key={f} style={styles.planFeature}>
            {f}
          </Text>
        ))}
      </View>
      {actionLabel && onAction && (
        <Pressable
          style={[
            styles.upgradeButton,
            highlighted && styles.upgradeButtonHighlighted,
            disabled && styles.buttonDisabled,
          ]}
          onPress={onAction}
          disabled={isLoading || disabled}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.upgradeButtonText}>{actionLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing['5xl'] },
  scrollDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
  heading: {
    fontSize: fontSizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  regionNotice: {
    fontSize: fontSizes.sm,
    color: colors.error,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  plansRow: {
    gap: spacing.md,
  },
  planCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  planCardCurrent: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  currentBadge: {
    backgroundColor: `${colors.success}20`,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  currentBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.success,
  },
  trialBadge: {
    backgroundColor: `${colors.primary}20`,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  trialBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  planName: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  planPrice: {
    fontSize: fontSizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
  },
  planPriceHighlighted: {
    color: colors.primary,
  },
  planPeriod: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    marginLeft: 2,
  },
  planFeatures: {
    gap: spacing.xs,
  },
  planFeature: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_400Regular',
    paddingLeft: spacing.sm,
  },
  upgradeButton: {
    backgroundColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  upgradeButtonHighlighted: {
    backgroundColor: colors.primary,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
  },
  manageButton: {
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  manageButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
  },
  comparisonCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}10`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  comparisonHeaderCell: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
  comparisonCell: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    textAlign: 'center',
    alignItems: 'center',
  },
  featureNameCell: {
    flex: 2,
    textAlign: 'left',
  },
  featureCheck: {
    fontSize: fontSizes.sm,
    color: colors.success,
  },
  featureMissing: {
    color: colors.textMuted,
  },
  featureValue: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  costHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  costNote: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  topUpRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  topUpCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topUpAmount: {
    fontSize: fontSizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
  },
  topUpLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  expiryNotice: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expiryNoticeTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
