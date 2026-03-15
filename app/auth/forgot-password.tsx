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
  const confirmPasswordReset = useAuthStore((s) => s.confirmPasswordReset);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendCode = async () => {
    try {
      await resetPassword(email.trim());
      setStep('code');
    } catch {
      // Error is captured in store
    }
  };

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const resetValid =
    code.trim().length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const handleResetPassword = async () => {
    try {
      await confirmPasswordReset(email.trim(), code.trim(), newPassword);
      setSuccess(true);
    } catch {
      // Error is captured in store
    }
  };

  const isEmailValid = email.trim().length > 0;

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <DesktopContainer>
          <View style={styles.content}>
            <Text style={styles.title}>Password Updated</Text>
            <Text style={styles.subtitle}>
              Your password has been reset successfully. You can now sign in
              with your new password.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Go to Sign In</Text>
            </Pressable>
          </View>
        </DesktopContainer>
      </SafeAreaView>
    );
  }

  if (step === 'code') {
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
                We sent a verification code to {email}. Enter it below with
                your new password.
              </Text>

              {error && (
                <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Verification Code"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                returnKeyType="next"
                accessibilityLabel="Verification code"
              />

              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 characters)"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="next"
                accessibilityLabel="New password, minimum 6 characters"
              />

              <TextInput
                style={[
                  styles.input,
                  passwordMismatch && styles.inputError,
                ]}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (resetValid && !isLoading) handleResetPassword();
                }}
                accessibilityLabel="Confirm new password"
              />
              {passwordMismatch && (
                <Text style={styles.fieldError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  Passwords do not match
                </Text>
              )}

              <Pressable
                style={[
                  styles.primaryButton,
                  (!resetValid || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={!resetValid || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Reset password"
                accessibilityState={{ disabled: !resetValid || isLoading }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
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
              Enter your email and we'll send you a code to reset your password.
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
                if (isEmailValid && !isLoading) handleSendCode();
              }}
              accessibilityLabel="Email address"
            />

            <Pressable
              style={[
                styles.primaryButton,
                (!isEmailValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSendCode}
              disabled={!isEmailValid || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Send reset code"
              accessibilityState={{ disabled: !isEmailValid || isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Code</Text>
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
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    color: colors.error,
    fontSize: fontSizes.xs,
    marginTop: -spacing.sm,
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
