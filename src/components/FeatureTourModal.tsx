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

type EffectiveTier = 'free' | 'starter' | 'pro' | 'premium' | 'sponsored' | 'admin';

interface TourSlide {
  icon: string;
  title: string;
  description: string;
  howTo: string;
  color: string;
  requiredTier: 'free' | 'starter' | 'pro' | 'premium';
  /** Optional section label shown above the title */
  section?: string;
}

const ALL_SLIDES: TourSlide[] = [
  // ── Features ──
  {
    icon: '🔍',
    title: 'Review a PR',
    description:
      'Use curated checklists for 45+ tech stacks to catch bugs, security issues, and code quality problems before they ship.',
    howTo: 'Tap "Review a PR" on the home screen, pick your stack, and start reviewing.',
    color: colors.reviewMode,
    requiredTier: 'free',
  },

  // ── Checklist Guide (always shown, part of free tier) ──
  {
    icon: '📊',
    title: 'Score Header',
    section: 'Using the Checklist',
    description:
      'At the top of every session you\'ll see three scores: Coverage (% of items reviewed), Confidence (your average self-rated understanding), and Issues (items marked "Needs Attention"). A progress bar tracks your overall coverage.',
    howTo: 'These update live as you work through items. Aim for high coverage before completing a session.',
    color: colors.reviewMode,
    requiredTier: 'free',
  },
  {
    icon: '🏷️',
    title: 'Severity Levels',
    section: 'Using the Checklist',
    description:
      'Every checklist item has a severity badge: BLK (Blocker) for critical issues that must be fixed, MAJ (Major) for significant problems, MIN (Minor) for smaller improvements, and NIT for style/preference suggestions.',
    howTo: 'Use the severity filter chips below the search bar to focus on the levels that matter most for your review.',
    color: colors.blocker,
    requiredTier: 'free',
  },
  {
    icon: '✅',
    title: 'Verdict Buttons',
    section: 'Using the Checklist',
    description:
      'For each item, choose a verdict: "Good" means the code passes this check, "Attn" (Needs Attention) flags an issue you found, and "N/A" means this check doesn\'t apply to the current PR. Unreviewed items count as "skipped".',
    howTo: 'Tap the verdict button for each item. Marking "Attn" will prompt you to draft a review comment.',
    color: colors.looksGood,
    requiredTier: 'free',
  },
  {
    icon: '🎯',
    title: 'Confidence Rating',
    section: 'Using the Checklist',
    description:
      'Rate your confidence from 1 to 5 on each item. 1 = "I have no idea what this means" and 5 = "I could teach this." Low confidence items (1-2) will trigger an AI tutor suggestion to help you learn.',
    howTo: 'Be honest! Low ratings help ReviewHelm identify your knowledge gaps for targeted learning later.',
    color: colors.learnMode,
    requiredTier: 'free',
  },
  {
    icon: '📝',
    title: 'Notes & Actions',
    section: 'Using the Checklist',
    description:
      'Each item has action icons: star (bookmark for later), arrow (share the item), and book (deep-dive with AI tutor). You can also add per-item notes to capture specifics, and session-wide notes at the top for general context.',
    howTo: 'Tap an item\'s text to expand/collapse it. Tap "Add per-item notes" to attach notes that appear in your session summary.',
    color: colors.info,
    requiredTier: 'free',
  },
  {
    icon: '📑',
    title: 'Sections & Navigation',
    section: 'Using the Checklist',
    description:
      'Items are grouped into collapsible sections (e.g., Security, Performance, Error Handling). Each section header shows a progress counter like "3/8" — items reviewed out of total.',
    howTo: 'Tap a section header to collapse/expand it. Use the floating "§" button to jump directly to any section.',
    color: colors.primary,
    requiredTier: 'free',
  },
  {
    icon: '⚡',
    title: 'Bulk Mode',
    section: 'Using the Checklist',
    description:
      'When you have many items that share the same verdict (e.g., all look good), Bulk Mode lets you select multiple items and apply a verdict or confidence rating to all of them at once.',
    howTo: 'Tap "Bulk" in the header, check the items you want, then use the floating action bar to apply "Good", "N/A", or a confidence level.',
    color: colors.primaryLight,
    requiredTier: 'free',
  },
  {
    icon: '🏁',
    title: 'Completing a Session',
    section: 'Using the Checklist',
    description:
      'When you\'re done reviewing, tap "Complete Session" at the bottom. This locks in your scores, records confidence data for gap tracking, and generates a session summary. You\'ll be warned if coverage is below 70%.',
    howTo: 'You can re-open and re-complete a session later to update your scores. Your summary and PDF export will reflect the latest answers.',
    color: colors.success,
    requiredTier: 'free',
  },

  // ── More features ──
  {
    icon: '🔎',
    title: 'Search',
    description:
      'Search across all checklist items to quickly find guidance on any topic.',
    howTo: 'Tap "Search" on the home screen and type a keyword.',
    color: colors.info,
    requiredTier: 'free',
  },
  {
    icon: '⭐',
    title: 'Bookmarks',
    description:
      'Save important checklist items for quick reference later.',
    howTo: 'Tap the star icon on any checklist item during a review to bookmark it.',
    color: colors.warning,
    requiredTier: 'free',
  },
  {
    icon: '✨',
    title: 'Polish My PR',
    description:
      'Run through a self-review checklist before requesting reviews. Catch issues early and get smoother merges.',
    howTo: 'Tap "Polish My PR" on the home screen and select a PR to polish.',
    color: colors.polishMode,
    requiredTier: 'starter',
  },
  {
    icon: '🔀',
    title: 'PR Tracker',
    description:
      'Track all your active PRs in one place. See status, link sessions, and manage your review workflow.',
    howTo: 'Tap "PRs" on the home screen or "Add a PR" to start tracking.',
    color: colors.prTrackerMode,
    requiredTier: 'starter',
  },
  {
    icon: '📈',
    title: 'Readiness Dashboard',
    description:
      'See your overall review readiness score and track progress across all your stacks.',
    howTo: 'Tap "Readiness" on the home screen to view your dashboard.',
    color: colors.success,
    requiredTier: 'starter',
  },
  {
    icon: '📊',
    title: 'Trends',
    description:
      'Visualize your review activity over time — sessions completed, items reviewed, and more.',
    howTo: 'Tap "Trends" on the home screen to see your stats.',
    color: colors.gapsMode,
    requiredTier: 'starter',
  },
  {
    icon: '📋',
    title: 'Past Reviews',
    description:
      'Access completed sessions to reference past decisions and learn from previous reviews.',
    howTo: 'Tap "Past PRs" on the home screen to browse your history.',
    color: colors.textSecondary,
    requiredTier: 'starter',
  },
  {
    icon: '📚',
    title: 'Learn Mode',
    description:
      'Study your weak areas with AI-powered tutoring. ReviewHelm uses spaced repetition to help you close knowledge gaps.',
    howTo: 'Tap "Learn" on the home screen, pick a stack, and start studying.',
    color: colors.learnMode,
    requiredTier: 'pro',
  },
  {
    icon: '📊',
    title: 'My Gaps',
    description:
      'See exactly where your knowledge gaps are and get targeted recommendations to improve.',
    howTo: 'Tap "My Gaps" on the home screen to see your weak areas and due items.',
    color: colors.gapsMode,
    requiredTier: 'pro',
  },
  {
    icon: '🤖',
    title: 'AI Tutor',
    description:
      'Deep-dive into any review topic with an AI tutor powered by Claude. Ask follow-ups, get examples, and build understanding.',
    howTo: 'During Learn mode or from a checklist item, tap the book icon to start a conversation.',
    color: colors.primary,
    requiredTier: 'premium',
  },
  {
    icon: '💬',
    title: 'AI Comment Drafter',
    description:
      'Get review comments drafted for you in your preferred tone and style using AI.',
    howTo: 'During a review session, mark an item as "Attn" and tap the prompt to draft a comment.',
    color: colors.primaryLight,
    requiredTier: 'premium',
  },
  {
    icon: '💰',
    title: 'AI Credits',
    description:
      'Your plan includes $10/month in AI credits. Use them for tutoring, comment drafting, and more.',
    howTo: 'Credits are used automatically. Check your balance in Settings or the Plans page.',
    color: colors.success,
    requiredTier: 'premium',
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
        <View style={[styles.modal, { width: contentWidth - spacing['2xl'] * 2 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Your {getTierLabel(effectiveTier)} Features
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeText}>Skip</Text>
            </Pressable>
          </View>

          {/* Slide content */}
          <View style={styles.slideContent}>
            <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
              <Text style={styles.slideIcon}>{slide.icon}</Text>
            </View>
            {slide.section && (
              <Text style={styles.sectionBadge}>{slide.section}</Text>
            )}
            <Text style={[styles.slideTitle, { color: slide.color }]}>
              {slide.title}
            </Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
            <View style={styles.howToBox}>
              <Text style={styles.howToLabel}>How to use</Text>
              <Text style={styles.howToText}>{slide.howTo}</Text>
            </View>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
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
              <Pressable style={styles.backButton} onPress={handleBack}>
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
