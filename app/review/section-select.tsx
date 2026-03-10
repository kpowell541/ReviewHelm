import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { crossAlert } from '../../src/utils/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getChecklist } from '../../src/data/checklistLoader';
import { getStackInfo } from '../../src/data/checklistRegistry';
import { getSectionItems } from '../../src/data/types';
import type { StackId } from '../../src/data/types';
import { useTemplateStore } from '../../src/store/useTemplateStore';
import { useRepoConfigStore } from '../../src/store/useRepoConfigStore';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { StackLogo } from '../../src/components/StackLogo';
import { BottomActionBar } from '../../src/components/BottomActionBar';
import { ModalShell } from '../../src/components/ModalShell';

export default function SectionSelectScreen() {
  const router = useRouter();
  const saveTemplate = useTemplateStore((s) => s.saveTemplate);
  const saveRepoConfig = useRepoConfigStore((s) => s.saveRepoConfig);
  const { stack, stacks, repo } = useLocalSearchParams<{ stack?: string; stacks?: string; repo?: string }>();
  const stackIds = useMemo(
    () => {
      if (stacks) return stacks.split(',') as StackId[];
      if (stack) return [stack as StackId];
      return [];
    },
    [stack, stacks],
  );

  const stackSections = useMemo(() => {
    return stackIds.map((stackId) => {
      const checklist = getChecklist(stackId);
      const stackInfo = getStackInfo(stackId);
      return {
        stackId,
        stackInfo,
        sections: checklist.sections.map((section) => ({
          id: section.id,
          title: section.title,
          itemCount: getSectionItems(section).length,
        })),
      };
    });
  }, [stackIds]);

  const allSectionIds = useMemo(
    () => stackSections.flatMap((ss) => ss.sections.map((s) => s.id)),
    [stackSections],
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(allSectionIds),
  );
  const [showNameModal, setShowNameModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const toggleSection = (sectionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleStack = (stackId: string) => {
    const stackEntry = stackSections.find((ss) => ss.stackId === stackId);
    if (!stackEntry) return;
    const sectionIds = stackEntry.sections.map((s) => s.id);
    const allSelected = sectionIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of sectionIds) {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  };

  const repoParam = repo ? `&repo=${encodeURIComponent(repo)}` : '';

  const handleContinue = () => {
    if (selected.size === 0) return;
    const selectedArray = [...selected];
    const isAllSelected = selectedArray.length === allSectionIds.length;
    const stackParam = stackIds.length === 1
      ? `stack=${stackIds[0]}`
      : `stacks=${stackIds.join(',')}`;
    const sectionParam = isAllSelected ? '' : `&sections=${selectedArray.join(',')}`;
    router.push(`/review/sessions?${stackParam}${sectionParam}${repoParam}` as '/review/sessions');
  };

  const totalSelected = stackSections.reduce((sum, ss) => {
    return sum + ss.sections.filter((s) => selected.has(s.id)).length;
  }, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Pick sections</Text>
        <Text style={styles.subtitle}>
          Select which sections to include in your combined review
        </Text>

        {stackSections.map(({ stackId, stackInfo, sections }) => {
          const stackSectionIds = sections.map((s) => s.id);
          const allStackSelected = stackSectionIds.every((id) =>
            selected.has(id),
          );

          return (
            <View key={stackId} style={styles.stackGroup}>
              <Pressable
                onPress={() => toggleStack(stackId)}
                style={styles.stackHeader}
              >
                <StackLogo stackId={stackInfo.id} fallbackIcon={stackInfo.icon} size={28} style={{ marginRight: spacing.sm }} />
                <Text style={styles.stackTitle}>{stackInfo.shortTitle}</Text>
                <Text
                  style={[
                    styles.selectAllText,
                    { color: allStackSelected ? colors.error : colors.primary },
                  ]}
                >
                  {allStackSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>

              {sections.map((section) => {
                const isSelected = selected.has(section.id);
                return (
                  <Pressable
                    key={section.id}
                    onPress={() => toggleSection(section.id)}
                    style={[
                      styles.sectionRow,
                      isSelected && styles.sectionRowSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.sectionTitle} numberOfLines={1}>
                      {section.title}
                    </Text>
                    <Text style={styles.itemCount}>
                      {section.itemCount} items
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {totalSelected > 0 && (
        <BottomActionBar
          label={`Continue with ${totalSelected} section${totalSelected > 1 ? 's' : ''}`}
          onPress={handleContinue}
          secondaryLabel="Save as template"
          onSecondaryPress={() => {
            setTemplateName('');
            setShowNameModal(true);
          }}
        />
      )}

      <ModalShell
        visible={showNameModal}
        onClose={() => setShowNameModal(false)}
        title="Save Template"
      >
        <Text style={styles.modalHint}>
          Name this configuration for quick access later
        </Text>
        <TextInput
          style={styles.modalInput}
          value={templateName}
          onChangeText={setTemplateName}
          placeholder="e.g. Full Stack Review"
          placeholderTextColor={colors.textMuted}
          autoFocus
          onSubmitEditing={() => {
            if (templateName.trim()) {
              saveTemplate(templateName.trim(), stackIds, [...selected]);
              if (repo) saveRepoConfig(repo, stackIds, [...selected]);
              setShowNameModal(false);
              crossAlert('Template saved', `"${templateName.trim()}" saved for quick reuse.`);
            }
          }}
        />
        <View style={styles.modalButtons}>
          <Pressable
            onPress={() => setShowNameModal(false)}
            style={styles.modalCancel}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (templateName.trim()) {
                saveTemplate(templateName.trim(), stackIds, [...selected]);
                if (repo) saveRepoConfig(repo, stackIds, [...selected]);
                setShowNameModal(false);
                crossAlert('Template saved', `"${templateName.trim()}" saved for quick reuse.`);
              }
            }}
            style={[
              styles.modalSave,
              !templateName.trim() && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </Pressable>
        </View>
      </ModalShell>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 120 },
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  stackGroup: {
    marginBottom: spacing.xl,
  },
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stackIcon: { fontSize: 28, marginRight: spacing.sm },
  stackTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectAllText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionRowSelected: {
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  itemCount: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  modalHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  modalCancelText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  modalSave: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  modalSaveText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});
