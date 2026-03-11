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
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      // Error is captured in store
    }
  };

  const isValid = email.trim().length > 0;

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <DesktopContainer>
          <View style={styles.content}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a password reset link to {email}. Click it to set a new
              password.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </DesktopContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DesktopContainer>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            {error && (
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
              returnKeyType="done"
              onSubmitEditing={() => {
                if (isValid && !isLoading) handleReset();
              }}
              accessibilityLabel="Email address"
            />

            <Pressable
              style={[
                styles.primaryButton,
                (!isValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleReset}
              disabled={!isValid || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
              accessibilityState={{ disabled: !isValid || isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.back()}
              accessibilityRole="link"
              accessibilityLabel="Back to sign in"
            >
              <Text style={styles.secondaryButtonText}>
                Back to Sign In
              </Text>
            </Pressable>
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
  successIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
    lineHeight: 22,
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
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
  },
});
