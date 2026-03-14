import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { useResponsive } from '../src/hooks/useResponsive';

interface OnboardingSlide {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: '🔍',
    title: 'Review PRs Like a Pro',
    description:
      'Use curated checklists for 10 tech stacks to catch bugs, security issues, and code quality problems before they ship.',
    color: colors.reviewMode,
  },
  {
    icon: '✨',
    title: 'Polish Your Own PRs',
    description:
      'Run through a self-review checklist before requesting reviews. Catch issues early and get smoother merges.',
    color: colors.polishMode,
  },
  {
    icon: '📚',
    title: 'Learn as You Go',
    description:
      'Track your confidence on each item. ReviewHelm uses spaced repetition to help you close knowledge gaps over time.',
    color: colors.learnMode,
  },
  {
    icon: '🤖',
    title: 'AI-Powered Tutoring',
    description:
      'Deep-dive into any topic with an AI tutor, get review comments drafted, and study your weak areas — all powered by Claude.',
    color: colors.primary,
  },
  {
    icon: '📋',
    title: 'A Learning Tool, Not a Guarantee',
    description:
      'ReviewHelm helps you build better code review habits over time — it\'s not a substitute for thorough human review. Ready to review PRs better? Next: Sign in.',
    color: colors.textSecondary,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = useWindowDimensions();
  const { isDesktop } = useResponsive();

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      if (Platform.OS === 'web') {
        setCurrentIndex(currentIndex + 1);
      } else {
        flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        setCurrentIndex(currentIndex + 1);
      }
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    usePreferencesStore.setState({ hasCompletedOnboarding: true } as any);
    router.replace('/auth/login');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: screenWidth }]}>
      <Text style={styles.slideIcon}>{item.icon}</Text>
      <Text style={[styles.slideTitle, { color: item.color }]}>
        {item.title}
      </Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const currentSlide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        <Pressable onPress={handleFinish} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {Platform.OS === 'web' ? (
        <View style={[styles.slide, { width: screenWidth, maxWidth: isDesktop ? 600 : undefined, alignSelf: 'center' as const }]}>
          <Text style={styles.slideIcon}>{currentSlide.icon}</Text>
          <Text style={[styles.slideTitle, { color: currentSlide.color }]}>
            {currentSlide.title}
          </Text>
          <Text style={styles.slideDescription}>{currentSlide.description}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / screenWidth,
            );
            setCurrentIndex(index);
          }}
          keyExtractor={(_, i) => String(i)}
        />
      )}

      {/* Dots */}
      <View style={styles.dotsRow} accessibilityLabel={`Slide ${currentIndex + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Action */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.nextButton,
            { backgroundColor: SLIDES[currentIndex].color },
          ]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={currentIndex < SLIDES.length - 1 ? 'Next slide' : 'Get started'}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex < SLIDES.length - 1
              ? 'Next'
              : 'Get Started'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skipText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    padding: spacing.sm,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  slideIcon: {
    fontSize: 64,
    marginBottom: spacing['2xl'],
  },
  slideTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  slideDescription: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  nextButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#fff',
  },
});
