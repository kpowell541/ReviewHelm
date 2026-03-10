import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { ModalShell } from './ModalShell';
import { colors, spacing, fontSizes, radius } from '../theme';
import type {
  PRRole,
  PRSize,
  PRPriority,
  CIPassing,
  PRDependency,
} from '../data/types';
import { PR_PRIORITY_LABELS, PR_PRIORITY_ORDER } from '../data/types';

interface AddPRForm {
  title: string;
  url: string;
  role: PRRole;
  size: PRSize;
  priority: PRPriority;
  repo: string;
  prNumber: string;
  prAuthor: string;
  dependencies: PRDependency[];
  ciPassing: CIPassing;
  isEmergency: boolean;
  notes: string;
}

const EMPTY_FORM: AddPRForm = {
  title: '',
  url: '',
  role: 'reviewer',
  size: 'medium',
  priority: 'medium',
  repo: '',
  prNumber: '',
  prAuthor: '',
  dependencies: [],
  ciPassing: 'unknown',
  isEmergency: false,
  notes: '',
};

const EMPTY_DEP = { repo: '', prNumber: '', title: '' };

export interface AddPRModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    url?: string;
    role: PRRole;
    priority?: PRPriority;
    size?: PRSize;
    repo?: string;
    prNumber?: number;
    prAuthor?: string;
    dependencies?: PRDependency[];
    ciPassing?: CIPassing;
    isEmergency?: boolean;
    notes?: string;
  }) => void;
  /** Fixed role — hides role selector */
  fixedRole?: PRRole;
  /** Show priority selector (default: true) */
  showPriority?: boolean;
  /** Show emergency/hotfix toggle for authors (default: false) */
  showEmergency?: boolean;
  /** Show notes field (default: false) */
  showNotes?: boolean;
  /** Color for save button (default: colors.primary) */
  saveButtonColor?: string;
  /** Modal title (default: "Add a PR") */
  title?: string;
  /** Initial form values for editing */
  initialValues?: Partial<AddPRForm>;
  /** Save button label (default: "Add PR") */
  saveLabel?: string;
  isDesktop?: boolean;
}

export function AddPRModal({
  visible,
  onClose,
  onSave,
  fixedRole,
  showPriority = true,
  showEmergency = false,
  showNotes = false,
  saveButtonColor,
  title: modalTitle = 'Add a PR',
  initialValues,
  saveLabel = 'Add PR',
  isDesktop: isDesktopProp,
}: AddPRModalProps) {
  const [form, setForm] = useState<AddPRForm>(() => ({
    ...EMPTY_FORM,
    ...initialValues,
    role: fixedRole ?? initialValues?.role ?? EMPTY_FORM.role,
  }));
  const [depForm, setDepForm] = useState(EMPTY_DEP);

  const resetAndClose = useCallback(() => {
    setForm({
      ...EMPTY_FORM,
      role: fixedRole ?? EMPTY_FORM.role,
    });
    setDepForm(EMPTY_DEP);
    onClose();
  }, [fixedRole, onClose]);

  // Reset form when modal opens with new initialValues
  const prevVisibleRef = React.useRef(false);
  if (visible && !prevVisibleRef.current) {
    const newForm = {
      ...EMPTY_FORM,
      ...initialValues,
      role: fixedRole ?? initialValues?.role ?? EMPTY_FORM.role,
    };
    // Only reset if form doesn't match initial values
    if (form.title !== newForm.title || form.url !== newForm.url) {
      setForm(newForm);
      setDepForm(EMPTY_DEP);
    }
  }
  prevVisibleRef.current = visible;

  const role = fixedRole ?? form.role;

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      url: form.url.trim() || undefined,
      role,
      priority: showPriority ? form.priority : undefined,
      size: form.size,
      repo: form.repo.trim() || undefined,
      prNumber: form.prNumber
        ? parseInt(form.prNumber, 10) || undefined
        : undefined,
      prAuthor:
        role === 'author'
          ? 'Me'
          : form.prAuthor.trim() || undefined,
      dependencies:
        form.dependencies.length > 0 ? form.dependencies : undefined,
      ciPassing: form.ciPassing !== 'unknown' ? form.ciPassing : undefined,
      isEmergency: showEmergency && role === 'author' ? form.isEmergency : undefined,
      notes: showNotes && form.notes.trim() ? form.notes.trim() : undefined,
    });
    resetAndClose();
  }, [form, role, showPriority, showEmergency, showNotes, onSave, resetAndClose]);

  return (
    <ModalShell
      visible={visible}
      onClose={resetAndClose}
      title={modalTitle}
      isDesktop={isDesktopProp}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Role */}
        {!fixedRole && (
          <>
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.chipRow}>
              {(['reviewer', 'author'] as PRRole[]).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, role === r && styles.chipActive]}
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      role: r,
                      prAuthor: r === 'author' ? 'Me' : '',
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      role === r && styles.chipTextActive,
                    ]}
                  >
                    {r === 'author' ? 'My PR' : 'Reviewing'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Title */}
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
          placeholder="PR title"
          placeholderTextColor={colors.textMuted}
          autoFocus={!initialValues?.title}
        />

        {/* URL */}
        <Text style={styles.fieldLabel}>URL</Text>
        <TextInput
          style={styles.input}
          value={form.url}
          onChangeText={(v) => setForm((f) => ({ ...f, url: v }))}
          placeholder="https://github.com/..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Repo */}
        <Text style={styles.fieldLabel}>Repo</Text>
        <TextInput
          style={styles.input}
          value={form.repo}
          onChangeText={(v) => setForm((f) => ({ ...f, repo: v }))}
          placeholder="org/repo-name"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        {/* PR # and Author */}
        <View style={styles.fieldRowSplit}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>PR #</Text>
            <TextInput
              style={styles.input}
              value={form.prNumber}
              onChangeText={(v) => setForm((f) => ({ ...f, prNumber: v }))}
              placeholder="1234"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
          {role === 'reviewer' && (
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Author</Text>
              <TextInput
                style={styles.input}
                value={form.prAuthor}
                onChangeText={(v) => setForm((f) => ({ ...f, prAuthor: v }))}
                placeholder="username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          )}
        </View>

        {/* Size */}
        <Text style={styles.fieldLabel}>Size</Text>
        <View style={styles.chipRow}>
          {(['small', 'medium', 'large'] as PRSize[]).map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, form.size === s && styles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, size: s }))}
            >
              <Text
                style={[
                  styles.chipText,
                  form.size === s && styles.chipTextActive,
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Priority */}
        {showPriority && (
          <>
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {PR_PRIORITY_ORDER.map((p) => (
                <Pressable
                  key={p}
                  style={[styles.chip, form.priority === p && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, priority: p }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.priority === p && styles.chipTextActive,
                    ]}
                  >
                    {PR_PRIORITY_LABELS[p]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Emergency toggle (author only) */}
        {showEmergency && role === 'author' && (
          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>Emergency / Hotfix</Text>
            <Switch
              value={form.isEmergency}
              onValueChange={(v) => setForm((f) => ({ ...f, isEmergency: v }))}
              trackColor={{ false: colors.border, true: colors.error }}
            />
          </View>
        )}

        {/* Build Passing */}
        <Text style={styles.fieldLabel}>Build Passing?</Text>
        <View style={styles.chipRow}>
          {(['yes', 'no', 'unknown'] as CIPassing[]).map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, form.ciPassing === v && styles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, ciPassing: v }))}
            >
              <Text
                style={[
                  styles.chipText,
                  form.ciPassing === v && styles.chipTextActive,
                ]}
              >
                {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Unknown'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Dependencies */}
        <Text style={styles.fieldLabel}>Dependencies</Text>
        {form.dependencies.map((dep, idx) => (
          <View key={idx} style={styles.depRow}>
            <Text style={styles.depText}>
              {dep.repo} #{dep.prNumber}
              {dep.title ? ` — ${dep.title}` : ''}
            </Text>
            <Pressable
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  dependencies: f.dependencies.filter((_, i) => i !== idx),
                }))
              }
            >
              <Text style={styles.depRemove}>X</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.depInputRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            value={depForm.repo}
            onChangeText={(v) => setDepForm((f) => ({ ...f, repo: v }))}
            placeholder="org/repo"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={depForm.prNumber}
            onChangeText={(v) => setDepForm((f) => ({ ...f, prNumber: v }))}
            placeholder="PR #"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
          <Pressable
            style={[
              styles.depAddBtn,
              (!depForm.repo.trim() || !depForm.prNumber.trim()) && {
                opacity: 0.4,
              },
            ]}
            onPress={() => {
              if (!depForm.repo.trim() || !depForm.prNumber.trim()) return;
              const num = parseInt(depForm.prNumber, 10);
              if (!num) return;
              setForm((f) => ({
                ...f,
                dependencies: [
                  ...f.dependencies,
                  {
                    repo: depForm.repo.trim(),
                    prNumber: num,
                    title: depForm.title.trim() || undefined,
                  },
                ],
              }));
              setDepForm(EMPTY_DEP);
            }}
          >
            <Text style={styles.depAddBtnText}>+</Text>
          </Pressable>
        </View>

        {/* Notes */}
        {showNotes && (
          <>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Optional notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </>
        )}

        {/* Buttons */}
        <View style={styles.modalButtons}>
          <Pressable onPress={resetAndClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[
              styles.saveButton,
              saveButtonColor ? { backgroundColor: saveButtonColor } : undefined,
              !form.title.trim() && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.saveButtonText}>{saveLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  fieldRowSplit: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: { flex: 1 },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  depRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  depText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  depRemove: {
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  depInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  depAddBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depAddBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});
