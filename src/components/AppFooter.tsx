import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSizes } from '../theme';

interface FooterLink {
  label: string;
  onPress: () => void;
}

export function AppFooter() {
  const router = useRouter();

  const links: FooterLink[] = [
    { label: 'Disclaimer', onPress: () => router.push('/disclaimer') },
    { label: 'Privacy', onPress: () => router.push('/privacy') },
    { label: 'Terms', onPress: () => router.push('/terms') },
    { label: 'Contact', onPress: () => void Linking.openURL('mailto:kaitlin@nesttend.app') },
    { label: 'Settings', onPress: () => router.push('/settings') },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.linksRow}>
        {links.map((link, i) => (
          <View key={link.label} style={styles.linkWrapper}>
            {i > 0 && <Text style={styles.separator}>·</Text>}
            <Pressable onPress={link.onPress}>
              <Text style={styles.linkText}>{link.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.copyright}>
        ReviewHelm — A learning tool, not a guarantee.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginHorizontal: spacing.sm,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  copyright: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
});
