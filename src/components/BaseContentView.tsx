import { View, Text, StyleSheet } from 'react-native';
import type { BaseContent } from '../data/types';
import { colors, spacing, fontSizes, radius } from '../theme';

interface BaseContentViewProps {
  content: BaseContent;
}

export function BaseContentView({ content }: BaseContentViewProps) {
  return (
    <View>
      {content.whatItMeans !== '' && (
        <ContentSection title="What It Means" body={content.whatItMeans} />
      )}
      {content.whyItMatters !== '' && (
        <ContentSection title="Why It Matters" body={content.whyItMatters} />
      )}
      {content.howToVerify !== '' && (
        <ContentSection title="How to Verify" body={content.howToVerify} />
      )}
      {content.exampleComment !== '' && (
        <ContentSection
          title="Example Review Comment"
          body={content.exampleComment}
          isCode
        />
      )}
      {content.codeExamples.length > 0 &&
        content.codeExamples.map((example, index) => (
          <View key={index} style={styles.codeExampleBlock}>
            <Text style={styles.codeExampleTitle}>{example.title}</Text>
            {example.bad && (
              <View style={styles.codeBlock}>
                <Text style={styles.codeLabel}>Bad</Text>
                <Text style={styles.codeText}>{example.bad.code}</Text>
                <Text style={styles.codeExplanation}>
                  {example.bad.explanation}
                </Text>
              </View>
            )}
            {example.good && (
              <View style={[styles.codeBlock, styles.codeBlockGood]}>
                <Text style={[styles.codeLabel, styles.codeLabelGood]}>
                  Good
                </Text>
                <Text style={styles.codeText}>{example.good.code}</Text>
                <Text style={styles.codeExplanation}>
                  {example.good.explanation}
                </Text>
              </View>
            )}
          </View>
        ))}
      {content.keyTakeaway !== '' && (
        <View style={styles.takeaway}>
          <Text style={styles.takeawayLabel} accessibilityRole="header">
            Key Takeaway
          </Text>
          <Text style={styles.takeawayText}>{content.keyTakeaway}</Text>
        </View>
      )}
      {content.references && content.references.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            References
          </Text>
          {content.references.map((reference, index) => (
            <Text key={index} style={styles.reference}>
              • {reference}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ContentSection({
  title,
  body,
  isCode,
}: {
  title: string;
  body: string;
  isCode?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={isCode ? styles.codeText : styles.bodyText}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  codeText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    backgroundColor: colors.codeBg,
    padding: spacing.md,
    borderRadius: radius.sm,
    overflow: 'hidden',
    lineHeight: 20,
  },
  codeExampleBlock: {
    marginBottom: spacing.xl,
  },
  codeExampleTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  codeBlock: {
    backgroundColor: colors.codeBad,
    borderLeftWidth: 3,
    borderLeftColor: colors.codeBadBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  codeBlockGood: {
    backgroundColor: colors.codeGood,
    borderLeftColor: colors.codeGoodBorder,
  },
  codeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.codeBadBorder,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  codeLabelGood: {
    color: colors.codeGoodBorder,
  },
  codeExplanation: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  takeaway: {
    backgroundColor: `${colors.primary}15`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  takeawayLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  takeawayText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  reference: {
    fontSize: fontSizes.sm,
    color: colors.info,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
});
