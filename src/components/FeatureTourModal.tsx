import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSizes, radius } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { hasAccess } from '../store/useTierStore';

type EffectiveTier = 'free' | 'starter' | 'advanced' | 'pro' | 'premium' | 'sponsored' | 'admin';

interface TourSlide {
  icon: string;
  title: string;
  description: string;
  howTo: string;
  color: string;
  requiredTier: 'free' | 'starter' | 'advanced' | 'pro' | 'premium';
  /** Optional section label shown above the title */
  section?: string;
  /** Tier label shown at top of slide */
  tierLabel?: string;
}

const ALL_SLIDES: TourSlide[] = [
  // ── Free tier ──
  {
    icon: '🔍',
    title: 'Review a PR',
    description:
      'Use curated checklists for 45+ tech stacks to catch bugs, security issues, and code quality problems before they ship.',
    howTo: 'Tap "Review a PR" on the home screen, pick your stack, and start reviewing.',
    color: colors.reviewMode,
    requiredTier: 'free',
    tierLabel: 'Included in Free',
  },
  {
    icon: '📊',
    title: 'Using the Checklist',
    description:
      'Each item has a severity badge (BLK, MAJ, MIN, NIT), verdict buttons (Good, Attn, N/A), and a 1–5 confidence rating. Sections are collapsible with progress counters, and Bulk Mode lets you apply verdicts to multiple items at once.',
    howTo: 'Work through items, rate your confidence honestly, and complete the session when done. Coverage below 70% triggers a warning.',
    color: colors.reviewMode,
    requiredTier: 'free',
    tierLabel: 'Included in Free',
  },
  {
    icon: '🔎',
    title: 'Search & Bookmarks',
    description:
      'Search across all checklist items to find guidance on any topic. Bookmark important items for quick reference later.',
    howTo: 'Tap "Search" or the star icon on any item during a review.',
    color: colors.info,
    requiredTier: 'free',
    tierLabel: 'Included in Free',
  },

  // ── Starter tier ──
  {
    icon: '✨',
    title: 'Polish My PR & PR Tracker',
    description:
      'Self-review your own PRs before requesting reviews. Track all your active PRs in one place with status, linked sessions, and review history.',
    howTo: 'Tap "Polish My PR" to self-review, or "Add PR" / "PRs" to start tracking.',
    color: colors.polishMode,
    requiredTier: 'starter',
    tierLabel: 'Starter',
  },
  {
    icon: '📋',
    title: 'Deep Dives & Past Reviews',
    description:
      'Explore authored content for any checklist item — what it means, why it matters, how to verify, with code examples. Access completed sessions to reference past decisions.',
    howTo: 'Tap the book icon on any item, or "Past Reviews" on the home screen.',
    color: colors.textSecondary,
    requiredTier: 'starter',
    tierLabel: 'Starter',
  },

  // ── Advanced tier ──
  {
    icon: '📚',
    title: 'Learn Mode & My Gaps',
    description:
      'Study your weak areas with targeted lessons. ReviewHelm uses spaced repetition to surface items you need to practice, and tracks your knowledge gaps over time.',
    howTo: 'Tap "Learn" to study a queue of your weakest items, or "My Gaps" to see where you need work.',
    color: colors.learnMode,
    requiredTier: 'advanced',
    tierLabel: 'Advanced — 14-day free trial',
  },

  // ── Pro tier ──
  {
    icon: '📈',
    title: 'Trends, Readiness & Analytics',
    description:
      'Compare sessions side-by-side to see how you\'re improving. Track your readiness score across stacks. View checklist gap insights to understand what reviewers catch.',
    howTo: 'Tap "Trends" or "Readiness" on the home screen to explore your analytics.',
    color: colors.success,
    requiredTier: 'pro',
    tierLabel: 'Pro — 14-day free trial',
  },

  // ── Premium tier ──
  {
    icon: '🤖',
    title: 'AI Tutor & Comment Drafter',
    description:
      'Deep-dive into any review topic with an AI tutor powered by Claude. Get review comments drafted in your preferred tone. $3/mo in AI credits included.',
    howTo: 'Tap the book icon during Learn mode or a review, or mark an item as "Attn" to draft a comment.',
    color: colors.primary,
    requiredTier: 'premium',
    tierLabel: 'Premium — 14-day free trial',
  },
];

function getSlidesForTier(effectiveTier: EffectiveTier): TourSlide[] {
  return ALL_SLIDES.filter((slide) => hasAccess(effectiveTier, slide.requiredTier));
}

function getTierLabel(tier: EffectiveTier): string {
  switch (tier) {
    case 'admin':
    case 'sponsored':
      return 'Full Access';
    case 'premium':
      return 'Premium';
    case 'pro':
      return 'Pro';
    case 'advanced':
      return 'Advanced';
    case 'starter':
      return 'Starter';
    default:
      return 'Free';
  }
}

interface FeatureTourModalProps {
  visible: boolean;
  onClose: () => void;
  effectiveTier: EffectiveTier;
}

export function FeatureTourModal({ visible, onClose, effectiveTier }: FeatureTourModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const { isDesktop } = useResponsive();
  const slides = getSlidesForTier(effectiveTier);

  const contentWidth = isDesktop ? Math.min(screenWidth, 500) : screenWidth;

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
      onClose();
    }
  }, [currentIndex, slides.length, onClose]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleClose = useCallback(() => {
    setCurrentIndex(0);
    onClose();
  }, [onClose]);

  if (slides.length === 0) return null;

  const slide = slides[currentIndex];
  const isLast = currentIndex === slides.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modal, { width: contentWidth - spacing['2xl'] * 2 }]}
          accessibilityViewIsModal={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Your {getTierLabel(effectiveTier)} Features
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Skip feature tour"
            >
              <Text style={styles.closeText}>Skip tour</Text>
            </Pressable>
          </View>

          {/* Slide content */}
          <View style={styles.slideContent}>
            {slide.tierLabel && (
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{slide.tierLabel}</Text>
              </View>
            )}
            <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
              <Text style={styles.slideIcon}>{slide.icon}</Text>
            </View>
            {slide.section && (
              <Text style={styles.sectionBadge}>{slide.section}</Text>
            )}
            <Text style={[styles.slideTitle, { color: slide.color }]} accessibilityRole="header">
              {slide.title}
            </Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
            <View style={styles.howToBox}>
              <Text style={styles.howToLabel}>How to use</Text>
              <Text style={styles.howToText}>{slide.howTo}</Text>
            </View>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsRow} accessibilityLabel={`Slide ${currentIndex + 1} of ${slides.length}`}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex && [styles.dotActive, { backgroundColor: slide.color }],
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            {currentIndex > 0 ? (
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Previous slide"
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.backButton} />
            )}
            <Text style={styles.counter}>
              {currentIndex + 1} / {slides.length}
            </Text>
            <Pressable
              style={[styles.nextButton, { backgroundColor: slide.color }]}
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Finish tour' : 'Next slide'}
            >
              <Text style={styles.nextButtonText}>
                {isLast ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  modal: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  slideContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  tierBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  tierBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideIcon: {
    fontSize: 40,
  },
  sectionBadge: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  slideTitle: {
    fontSize: fontSizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  howToBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
  },
  howToLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  howToText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 70,
  },
  backButtonText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontFamily: 'Quicksand_500Medium',
  },
  counter: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  nextButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 70,
  },
  nextButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: '#fff',
  },
});
