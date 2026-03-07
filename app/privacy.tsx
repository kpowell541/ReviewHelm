import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';

const SECTIONS = [
  {
    title: 'Data Storage',
    body: 'Your checklist progress, session data, and preferences are stored locally on your device. If you sign in, your data is synced to our servers so you can access it across devices.',
  },
  {
    title: 'API Keys',
    body: 'Your Anthropic API key is stored securely on your device and is never sent to ReviewHelm servers. It is only used to communicate directly with the Anthropic API for AI features.',
  },
  {
    title: 'AI Features',
    body: 'When you use AI-powered features (deep dives, comment drafting, tutoring), your prompts and checklist context are sent to the Anthropic API. ReviewHelm does not store or log these interactions on its servers.',
  },
  {
    title: 'Analytics',
    body: 'ReviewHelm does not use third-party analytics or tracking services. Usage statistics (session counts, completion rates) are calculated locally on your device.',
  },
  {
    title: 'Data Deletion',
    body: 'You can delete all your local data at any time by clearing the app\'s storage. If you have a synced account, contact us to request full deletion of your server-side data.',
  },
];

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DesktopContainer>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Privacy</Text>
          <Text style={styles.intro}>
            ReviewHelm is designed with your privacy in mind. Here is how your data is handled.
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
