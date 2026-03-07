import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';

const SECTIONS = [
  {
    title: 'Acceptance',
    body: 'By using ReviewHelm, you agree to these terms. If you do not agree, please discontinue use of the application.',
  },
  {
    title: 'Intended Use',
    body: 'ReviewHelm is an educational tool for improving code review practices. It is intended for personal and professional development. You may not use it to misrepresent automated output as your own expert analysis.',
  },
  {
    title: 'API Usage',
    body: 'AI features require your own Anthropic API key. You are responsible for all charges incurred through the Anthropic API. ReviewHelm provides usage tracking as a convenience, but the official billing from Anthropic is authoritative.',
  },
  {
    title: 'Content Accuracy',
    body: 'Checklists, guides, and AI-generated content are provided "as is" without warranty. ReviewHelm makes no guarantees about the accuracy, completeness, or suitability of any content for your specific use case.',
  },
  {
    title: 'Limitation of Liability',
    body: 'ReviewHelm and its contributors shall not be liable for any damages arising from the use of this application, including but not limited to bugs shipped, security vulnerabilities missed, or code quality issues in reviewed code.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of ReviewHelm after changes constitutes acceptance of the updated terms.',
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DesktopContainer>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Terms of Use</Text>
          <Text style={styles.intro}>
            These terms govern your use of the ReviewHelm application.
          </Text>

          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <Text style={styles.lastUpdated}>Last updated: March 2026</Text>
        </ScrollView>
      </DesktopContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  heading: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  intro: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  lastUpdated: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
