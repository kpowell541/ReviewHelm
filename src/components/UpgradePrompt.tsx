import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSizes, radius } from '../theme';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  requiredTier: 'starter' | 'advanced' | 'pro' | 'premium';
  featureName?: string;
}

const TIER_DETAILS = {
  starter: {
    label: 'Starter',
    price: '$3/mo',
    features: ['Polish My PR (self-review)', 'PR tracker', 'Deep dive content', 'Past reviews'],
  },
  advanced: {
    label: 'Advanced',
    price: '$5/mo',
    features: ['Learn mode', 'Knowledge gap tracking', 'Spaced repetition', '14-day free trial'],
  },
  pro: {
    label: 'Pro',
    price: '$8/mo',
    features: ['Trends & session comparison', 'Readiness dashboard', 'Checklist gap insights', '14-day free trial'],
  },
  premium: {
    label: 'Premium',
    price: '$12/mo',
    features: ['AI tutor & comment drafter', '$3/mo AI credits included', 'All Pro features', '14-day free trial'],
  },
};

export function UpgradePrompt({ visible, onClose, requiredTier, featureName }: UpgradePromptProps) {
  const router = useRouter();
  const tier = TIER_DETAILS[requiredTier];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.title}>
            {featureName ? `${featureName} requires ${tier.label}` : `Upgrade to ${tier.label}`}
          </Text>
          <Text style={styles.price}>{tier.price}</Text>

          <View style={styles.featureList}>
            {tier.features.map((f) => (
              <Text key={f} style={styles.featureItem}>
                {f}
              </Text>
            ))}
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              onClose();
              router.push('/plans');
            }}
          >
            <Text style={styles.primaryButtonText}>View Plans</Text>
          </Pressable>

          <Pressable style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>Not now</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: fontSizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  featureItem: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_400Regular',
    paddingLeft: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
  },
  dismissButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  dismissText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
});
