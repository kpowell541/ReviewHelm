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

interface CommentStyleProfile {
  id: string;
  name: string;
  tone: string;
  strictness: number;
  verbosity: number;
  includePraise: boolean;
  includeActionItems: boolean;
}

const TONE_OPTIONS = [
  'professional',
  'friendly',
  'direct',
  'mentoring',
  'encouraging',
];

function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderDots}>
        {Array.from({ length: max - min + 1 }, (_, i) => {
          const v = min + i;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={[
                styles.sliderDot,
                v <= value && styles.sliderDotActive,
              ]}
            >
              <Text
                style={[
                  styles.sliderDotText,
                  v <= value && styles.sliderDotTextActive,
                ]}
              >
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CommentProfilesScreen() {
  const user = useAuthStore((s) => s.user);
  const [profiles, setProfiles] = useState<CommentStyleProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProfile, setEditingProfile] =
    useState<Partial<CommentStyleProfile> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data =
        await api.get<CommentStyleProfile[]>('/comment-profiles');
      setProfiles(data);
    } catch {
      // Offline or not authenticated
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const saveProfile = async () => {
    if (!editingProfile?.name?.trim() || !editingProfile?.tone) return;
    setIsSaving(true);
    try {
      if (editingProfile.id) {
        await api.patch(
          `/comment-profiles/${editingProfile.id}`,
          editingProfile,
        );
      } else {
        await api.post('/comment-profiles', editingProfile);
      }
      setEditingProfile(null);
      await loadProfiles();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to save';
      crossAlert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProfile = async (id: string) => {
    crossAlert('Delete Profile', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/comment-profiles/${id}`);
            await loadProfiles();
          } catch {
            crossAlert('Error', 'Failed to delete profile');
          }
        },
      },
    ]);
  };

  const activateProfile = async (id: string) => {
    try {
      await api.post(`/comment-profiles/${id}/activate`);
      crossAlert('Activated', 'This profile is now your default.');
    } catch {
      crossAlert('Error', 'Failed to activate profile');
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.empty}>
            Sign in to create and manage comment style profiles.
          </Text>
        </View>
      </View>
    );
  }

  // Editing form
  if (editingProfile) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {editingProfile.id ? 'Edit Profile' : 'New Profile'}
        </Text>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={editingProfile.name ?? ''}
          onChangeText={(name) =>
            setEditingProfile({ ...editingProfile, name })
          }
          placeholder="e.g., Mentoring, Direct..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Tone</Text>
        <View style={styles.toneRow}>
          {TONE_OPTIONS.map((tone) => (
            <Pressable
              key={tone}
              style={[
                styles.toneChip,
                editingProfile.tone === tone && styles.toneChipActive,
              ]}
              onPress={() =>
                setEditingProfile({ ...editingProfile, tone })
              }
            >
              <Text
                style={[
                  styles.toneChipText,
                  editingProfile.tone === tone &&
                    styles.toneChipTextActive,
                ]}
              >
                {tone}
              </Text>
            </Pressable>
          ))}
        </View>

        <Slider
          label="Strictness"
          value={editingProfile.strictness ?? 3}
          onChange={(strictness) =>
            setEditingProfile({ ...editingProfile, strictness })
          }
        />

        <Slider
          label="Verbosity"
          value={editingProfile.verbosity ?? 3}
          onChange={(verbosity) =>
            setEditingProfile({ ...editingProfile, verbosity })
          }
        />

        <Pressable
          style={styles.toggleRow}
          onPress={() =>
            setEditingProfile({
              ...editingProfile,
              includePraise: !editingProfile.includePraise,
            })
          }
        >
          <Text style={styles.toggleLabel}>Include praise</Text>
          <Text style={styles.toggleValue}>
            {editingProfile.includePraise ? 'Yes' : 'No'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.toggleRow}
          onPress={() =>
            setEditingProfile({
              ...editingProfile,
              includeActionItems: !(editingProfile.includeActionItems ?? true),
            })
          }
        >
          <Text style={styles.toggleLabel}>Include action items</Text>
          <Text style={styles.toggleValue}>
            {editingProfile.includeActionItems !== false ? 'Yes' : 'No'}
          </Text>
        </Pressable>

        <View style={styles.formActions}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => setEditingProfile(null)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.saveButton,
              isSaving && styles.buttonDisabled,
            ]}
            onPress={saveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Comment Style Profiles</Text>
      <Text style={styles.subtitle}>
        Create profiles to control how the AI drafts review comments.
      </Text>

      {isLoading && (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing['2xl'] }}
        />
      )}

      {!isLoading && profiles.length === 0 && (
        <Text style={styles.empty}>
          No profiles yet. Create one to customize your comment style.
        </Text>
      )}

      {profiles.map((profile) => (
        <View key={profile.id} style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileTone}>{profile.tone}</Text>
          </View>
          <Text style={styles.profileMeta}>
            Strictness: {profile.strictness}/5 · Verbosity:{' '}
            {profile.verbosity}/5
          </Text>
          <View style={styles.profileActions}>
            <Pressable
              onPress={() => activateProfile(profile.id)}
              style={styles.profileActionButton}
            >
              <Text style={styles.profileActionText}>Activate</Text>
            </Pressable>
            <Pressable
              onPress={() => setEditingProfile(profile)}
              style={styles.profileActionButton}
            >
              <Text style={styles.profileActionText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => deleteProfile(profile.id)}
              style={styles.profileActionButton}
            >
              <Text
                style={[
                  styles.profileActionText,
                  { color: colors.error },
                ]}
              >
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable
        style={styles.newButton}
        onPress={() =>
          setEditingProfile({
            name: '',
            tone: 'professional',
            strictness: 3,
            verbosity: 3,
            includePraise: false,
            includeActionItems: true,
          })
        }
      >
        <Text style={styles.newButtonText}>+ New Profile</Text>
      </Pressable>
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
  profileCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  profileName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileTone: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  profileMeta: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  profileActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  profileActionButton: { padding: spacing.xs },
  profileActionText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  newButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  newButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  toneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toneChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  toneChipActive: {
    backgroundColor: `${colors.primary}18`,
    borderColor: colors.primary,
  },
  toneChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  toneChipTextActive: { color: colors.primary },
  sliderRow: { marginTop: spacing.lg },
  sliderLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sliderDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sliderDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  sliderDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sliderDotText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sliderDotTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
  },
  toggleLabel: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  toggleValue: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});
