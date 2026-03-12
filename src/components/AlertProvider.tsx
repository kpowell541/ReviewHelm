import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, spacing, fontSizes, radius } from '../theme';
import type { AlertRequest, AlertButton } from '../utils/alert';
import { setWebAlertHandler } from '../utils/alert';

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setWebAlertHandler((req) => setRequest(req));
    return () => setWebAlertHandler(null);
  }, []);

  const dismiss = useCallback((btn?: AlertButton) => {
    setRequest(null);
    btn?.onPress?.();
  }, []);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Modal
        visible={request !== null}
        transparent
        animationType="fade"
        onRequestClose={() => dismiss()}
      >
        {request && (
          <Pressable style={styles.overlay} onPress={() => dismiss()}>
            <View
              style={styles.dialog}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.title}>{request.title}</Text>
              {request.message ? (
                <Text style={styles.message}>{request.message}</Text>
              ) : null}
              <View style={styles.buttons}>
                {request.buttons.map((btn, i) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  return (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [
                        styles.button,
                        isCancel && styles.buttonCancel,
                        isDestructive && styles.buttonDestructive,
                        !isCancel && !isDestructive && styles.buttonDefault,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => dismiss(btn)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.buttonTextCancel,
                          isDestructive && styles.buttonTextDestructive,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Pressable>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    maxWidth: 360,
    width: '90%',
    borderWidth: 1,
    borderColor: colors.bgCardHover,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttons: {
    gap: spacing.xs,
  },
  button: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonDefault: {
    backgroundColor: colors.primary,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
  buttonTextDestructive: {
    color: colors.error,
  },
});
