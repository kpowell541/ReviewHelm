import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { api, ApiError } from '../src/api/client';
import { crossAlert } from '../src/utils/alert';
import { useAuthStore } from '../src/store/useAuthStore';
import { colors, spacing, fontSizes, radius } from '../src/theme';

interface DiffArtifact {
  id: string;
  source: 'pasted' | 'uploaded';
  label: string | null;
  filename: string | null;
  lineCount: number;
  createdAt: string;
}

export default function DiffsScreen() {
  const user = useAuthStore((s) => s.user);
  const [diffs, setDiffs] = useState<DiffArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasteForm, setShowPasteForm] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteLabel, setPasteLabel] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  const loadDiffs = useCallback(async () => {
    // Diffs don't have a list endpoint in the backend spec we saw,
    // but we can still show the paste form. We'll build on what we have.
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDiffs();
  }, [loadDiffs]);

  const handlePaste = async () => {
    if (!pasteContent.trim()) return;
    setIsPasting(true);
    try {
      const result = await api.post<DiffArtifact>('/diffs', {
        content: pasteContent.trim(),
        label: pasteLabel.trim() || undefined,
      });
      setDiffs((prev) => [result, ...prev]);
      setPasteContent('');
      setPasteLabel('');
      setShowPasteForm(false);
      crossAlert(
        'Diff Saved',
        `${result.lineCount} lines uploaded. You can now link this diff to a review session.`,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to upload diff';
      crossAlert('Error', msg);
    } finally {
      setIsPasting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.empty}>
            Sign in to upload and manage diffs for your review sessions.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">Diff Artifacts</Text>
      <Text style={styles.subtitle}>
        Paste or upload diffs to provide AI context during reviews.
      </Text>

      {!showPasteForm ? (
        <Pressable
          style={styles.newButton}
          onPress={() => setShowPasteForm(true)}
          accessibilityRole="button"
          accessibilityLabel="Paste a diff"
        >
          <Text style={styles.newButtonText}>+ Paste a Diff</Text>
        </Pressable>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Label (optional)</Text>
          <TextInput
            style={styles.input}
            value={pasteLabel}
            onChangeText={setPasteLabel}
            placeholder="e.g., auth-refactor PR #142"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Diff label"
          />

          <Text style={styles.fieldLabel}>Diff Content</Text>
          <TextInput
            style={[styles.input, styles.diffInput]}
            value={pasteContent}
            onChangeText={setPasteContent}
            placeholder="Paste your diff here..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Diff content"
          />

          <View style={styles.formActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setShowPasteForm(false);
                setPasteContent('');
                setPasteLabel('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                (isPasting || !pasteContent.trim()) &&
                  styles.buttonDisabled,
              ]}
              onPress={handlePaste}
              disabled={isPasting || !pasteContent.trim()}
              accessibilityRole="button"
              accessibilityLabel="Upload diff"
              accessibilityState={{ disabled: isPasting || !pasteContent.trim() }}
            >
              {isPasting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Upload</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {isLoading && (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing['2xl'] }}
        />
      )}

      {diffs.map((diff) => (
        <View key={diff.id} style={styles.diffCard}>
          <Text style={styles.diffLabel}>
            {diff.label || diff.filename || 'Unnamed diff'}
          </Text>
          <Text style={styles.diffMeta}>
            {diff.lineCount} lines · {diff.source} ·{' '}
            {new Date(diff.createdAt).toLocaleDateString()}
          </Text>
        </View>
      ))}

      {!isLoading && diffs.length === 0 && !showPasteForm && (
        <Text style={styles.empty}>
          No diffs uploaded yet. Paste a diff to get started.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
  newButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  newButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  diffInput: {
    minHeight: 200,
    fontFamily: 'monospace',
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  submitText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  diffCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  diffLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  diffMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
