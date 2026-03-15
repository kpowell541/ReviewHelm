import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors, spacing, fontSizes } from '../../src/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const handleAuthCallback = useAuthStore((s) => s.handleAuthCallback);
  const error = useAuthStore((s) => s.error);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || !code) return;
    handledRef.current = true;

    handleAuthCallback(code)
      .then(() => router.replace('/'))
      .catch(() => {
        // Error is captured in store — user sees the error UI below
      });
  }, [code, handleAuthCallback, router]);

  if (!code) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>
            Missing authorization code. Please try signing in again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Sign In Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text
            style={styles.link}
            onPress={() => router.replace('/auth/login')}
          >
            Back to Sign In
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Completing sign in...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    fontSize: fontSizes.md,
    marginTop: spacing.md,
  },
});
