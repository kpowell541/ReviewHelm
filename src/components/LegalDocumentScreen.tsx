import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../theme';
import { DesktopContainer } from './DesktopContainer';

export interface LegalSection {
  title: string;
  body: string;
}

interface LegalDocumentScreenProps {
  title: string;
  intro: string;
  sections: LegalSection[];
  lastUpdated: string;
}

export function LegalDocumentScreen({
  title,
  intro,
  sections,
  lastUpdated,
}: LegalDocumentScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DesktopContainer>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.intro}>{intro}</Text>

          {sections.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
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
