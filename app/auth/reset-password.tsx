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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const isValid = password.length >= 6 && password === confirmPassword;

  const handleUpdate = async () => {
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch {
      // Error is captured in store
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <DesktopContainer>
          <View style={styles.content}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.title}>Password Updated</Text>
            <Text style={styles.subtitle}>
              Your password has been changed successfully. You can now sign in
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

  return (
    <SafeAreaView style={styles.container}>
      <DesktopContainer>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Set New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below.
            </Text>

            {error && (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="New Password (min 6 characters)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
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
                if (isValid && !isLoading) handleUpdate();
              }}
              accessibilityLabel="Confirm new password"
            />
            {passwordMismatch && (
              <Text style={styles.fieldError} accessibilityRole="alert" accessibilityLiveRegion="polite">Passwords do not match</Text>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                (!isValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={!isValid || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              accessibilityState={{ disabled: !isValid || isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Update Password</Text>
              )}
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
});
