import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchDownload, triggerBrowserDownload, DownloadError } from '../../src/utils/download';
import { colors, spacing, fontSizes, radius } from '../../src/theme';

export default function DownloadScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const startedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (startedRef.current || !token) return;
    startedRef.current = true;

    fetchDownload(`/downloads/${token}`)
      .then((result) => {
        triggerBrowserDownload(result);
        setStatus('success');
      })
      .catch((err) => {
        if (err instanceof DownloadError && err.code === 'RESTORE_PENDING') {
          setStatus('pending');
          setErrorMessage(err.message);
        } else {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Download failed');
        }
      });
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.text}>Preparing download...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.title}>Download Started</Text>
            <Text style={styles.text}>
              Your file should begin downloading automatically.
            </Text>
            <Pressable style={styles.button} onPress={() => router.replace('/')}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </Pressable>
          </>
        )}

        {status === 'pending' && (
          <>
            <Text style={styles.title}>File Being Restored</Text>
            <Text style={styles.text}>{errorMessage}</Text>
            <Pressable
              style={styles.button}
              onPress={() => {
                startedRef.current = false;
                setStatus('loading');
              }}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.title}>Download Failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.button} onPress={() => router.replace('/')}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </Pressable>
          </>
        )}
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
  text: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: fontSizes.md,
    color: colors.error,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
