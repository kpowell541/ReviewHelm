import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api, ApiError } from '../../src/api/client';
import { isOAuthConfigured } from '../../src/auth/cognito';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';

const OAUTH_AVAILABLE = isOAuthConfigured();

const STAGING_GATE = process.env.EXPO_PUBLIC_STAGING_ACCESS_GATE === 'true';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithProvider = useAuthStore((s) => s.signInWithProvider);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [stagingBlocked, setStagingBlocked] = useState(false);

  const handleSignIn = async () => {
    try {
      await signIn(email.trim(), password);

      // If staging gate is enabled, verify backend access before proceeding
      if (STAGING_GATE) {
        try {
          await api.get('/subscription/tier');
        } catch (err) {
          if (err instanceof ApiError && err.status === 403) {
            // Not an authorized staging user — sign out and show message
            await useAuthStore.getState().signOut();
            setStagingBlocked(true);
            return;
          }
        }
      }

      router.replace('/');
    } catch {
      // Error is captured in store
    }
  };

  const isValid = email.trim().length > 0 && password.length >= 6;

  return (
    <SafeAreaView style={styles.container}>
      <DesktopContainer>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to start reviewing PRs with guided checklists
            </Text>

            {stagingBlocked && (
              <View style={styles.stagingBox}>
                <Text style={styles.stagingTitle}>Access Restricted</Text>
                <Text style={styles.stagingText}>
                  ReviewHelm is currently in private staging. Only invited accounts have access. If you believe this is an error, please contact the team.
                </Text>
              </View>
            )}

            {error && !stagingBlocked && (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              accessibilityLabel="Email address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => { if (isValid && !isLoading) handleSignIn(); }}
              accessibilityLabel="Password"
            />

            <Pressable
              style={styles.forgotButton}
              onPress={() => router.push('/auth/forgot-password')}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotButtonText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                (!isValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={!isValid || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !isValid || isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </Pressable>

            {OAUTH_AVAILABLE && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={[styles.oauthButton, isLoading && styles.buttonDisabled]}
                  onPress={() => signInWithProvider('Google')}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with Google"
                >
                  <Text style={styles.oauthButtonText}>Sign in with Google</Text>
                </Pressable>

                <Pressable
                  style={[styles.oauthButton, isLoading && styles.buttonDisabled]}
                  onPress={() => signInWithProvider('GitHub')}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with GitHub"
                >
                  <Text style={styles.oauthButtonText}>Sign in with GitHub</Text>
                </Pressable>
              </>
            )}

            {!STAGING_GATE && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/signup')}
                accessibilityRole="link"
                accessibilityLabel="Don't have an account? Sign up"
              >
                <Text style={styles.secondaryButtonText}>
                  Don't have an account? Sign Up
                </Text>
              </Pressable>
            )}

          </View>
        </KeyboardAvoidingView>
      </DesktopContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  stagingBox: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  stagingTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stagingText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: `${colors.error}20`,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    padding: spacing.sm,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.xs,
  },
  forgotButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginHorizontal: spacing.md,
  },
  oauthButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  oauthButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
  },
});
