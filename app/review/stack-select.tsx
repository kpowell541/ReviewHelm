import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { STACKS, getStackInfo } from '../../src/data/checklistRegistry';
import type { StackId } from '../../src/data/types';
import { useConfidenceStore } from '../../src/store/useConfidenceStore';
import { useTemplateStore } from '../../src/store/useTemplateStore';
import { useRepoConfigStore } from '../../src/store/useRepoConfigStore';
import { colors, spacing, fontSizes, radius } from '../../src/theme';
import { DesktopContainer } from '../../src/components/DesktopContainer';
import { useResponsive } from '../../src/hooks/useResponsive';
import { StackLogo } from '../../src/components/StackLogo';

export default function StackSelectScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { repo } = useLocalSearchParams<{ repo?: string }>();
  const histories = useConfidenceStore((s) => s.histories);
  const stackAverages = useMemo(() => {
    const allItems = Object.values(histories);
    const result: Record<string, number | null> = {};
    for (const stack of STACKS) {
      const stackItems = allItems.filter((h) => h.stackId === stack.id);
      if (stackItems.length === 0) {
        result[stack.id] = null;
      } else {
        const sum = stackItems.reduce((s, h) => s + h.currentConfidence, 0);
        result[stack.id] = sum / stackItems.length;
      }
    }
    return result;
  }, [histories]);
  const templateMap = useTemplateStore((s) => s.templates);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const repoConfigs = useRepoConfigStore((s) => s.configs);

  const templates = useMemo(
    () => Object.values(templateMap).sort((a, b) => a.name.localeCompare(b.name)),
    [templateMap],
  );
  const repoConfig = useMemo(
    () => (repo ? repoConfigs[repo] : undefined),
    [repo, repoConfigs],
  );

  // Pre-select previously used stacks for this repo
  const [selectedStacks, setSelectedStacks] = useState<StackId[]>(
    () => repoConfig?.stackIds ?? [],
  );

  // Stacks previously used for this repo (shown as suggestions)
  const previousStackIds = useMemo(
    () => new Set(repoConfig?.stackIds ?? []),
    [repoConfig],
  );

  const toggleStack = (stackId: StackId) => {
    setSelectedStacks((prev) =>
      prev.includes(stackId)
        ? prev.filter((id) => id !== stackId)
        : [...prev, stackId],
    );
  };

  const repoParam = repo ? `&repo=${encodeURIComponent(repo)}` : '';

  const handleUseRepoConfig = () => {
    if (!repoConfig) return;
    const params = repoConfig.selectedSections?.length
      ? `stacks=${repoConfig.stackIds.join(',')}&sections=${repoConfig.selectedSections.join(',')}${repoParam}`
      : repoConfig.stackIds.length === 1
        ? `stack=${repoConfig.stackIds[0]}${repoParam}`
        : `stacks=${repoConfig.stackIds.join(',')}${repoParam}`;
    router.push(`/review/sessions?${params}` as '/review/sessions');
  };

  const handleContinue = () => {
    if (selectedStacks.length === 0) return;
    if (selectedStacks.length === 1) {
      router.push(`/review/sessions?stack=${selectedStacks[0]}${repoParam}` as '/review/sessions');
    } else {
      router.push(
        `/review/sessions?stacks=${selectedStacks.join(',')}${repoParam}` as '/review/sessions',
      );
    }
  };

  return (
    <View style={styles.container}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        {repo && repoConfig && (
          <Pressable
            onPress={handleUseRepoConfig}
            style={({ pressed }) => [
              styles.repoBanner,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.repoBannerContent}>
              <Text style={styles.repoBannerTitle}>
                Saved config for {repo}
              </Text>
              <Text style={styles.repoBannerMeta}>
                {repoConfig.stackIds
                  .map((id) => {
                    try { return getStackInfo(id).shortTitle; }
                    catch { return id; }
                  })
                  .join(' + ')}
                {repoConfig.selectedSections
                  ? ` · ${repoConfig.selectedSections.length} sections`
                  : ''}
              </Text>
            </View>
            <Text style={styles.repoBannerAction}>Use this ›</Text>
          </Pressable>
        )}

        {templates.length > 0 && (
          <>
            <Text style={styles.heading}>Saved Templates</Text>
            {templates.map((tmpl) => {
              const templateStackInfos = tmpl.stackIds
                .map((id) => {
                  try { return getStackInfo(id); }
                  catch { return null; }
                })
                .filter(Boolean);
              return (
                <Pressable
                  key={tmpl.id}
                  onPress={() => {
                    const params = tmpl.selectedSections?.length
                      ? `stacks=${tmpl.stackIds.join(',')}&sections=${tmpl.selectedSections.join(',')}`
                      : tmpl.stackIds.length === 1
                        ? `stack=${tmpl.stackIds[0]}`
                        : `stacks=${tmpl.stackIds.join(',')}`;
                    router.push(`/review/sessions?${params}` as '/review/sessions');
                  }}
                  onLongPress={() => {
                    Alert.alert('Delete template?', `Remove "${tmpl.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(tmpl.id) },
                    ]);
                  }}
                  style={({ pressed }) => [
                    styles.templateCard,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.templateIcons}>
                    {templateStackInfos.map((info) => (
                      <StackLogo key={info!.id} stackId={info!.id} fallbackIcon={info!.icon} size={20} />
                    ))}
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{tmpl.name}</Text>
                    <Text style={styles.templateMeta}>
                      {tmpl.stackIds.length} stack{tmpl.stackIds.length > 1 ? 's' : ''}
                      {tmpl.selectedSections ? ` · ${tmpl.selectedSections.length} sections` : ''}
                    </Text>
                  </View>
                  <Text style={styles.templateArrow}>›</Text>
                </Pressable>
              );
            })}
          </>
        )}

        <Text style={styles.heading}>Choose tech stacks</Text>
        <Text style={styles.subtitle}>
          Select one or more stacks that match the PR you're reviewing
        </Text>

        {STACKS.map((stack) => {
          const isSelected = selectedStacks.includes(stack.id);
          const isPrevious = previousStackIds.has(stack.id);
          const overallAvg = stackAverages[stack.id] ?? null;

          return (
            <Pressable
              key={stack.id}
              onPress={() => toggleStack(stack.id)}
              style={({ pressed }) => [
                styles.stackCard,
                {
                  borderLeftColor: stack.color,
                  opacity: pressed ? 0.85 : 1,
                },
                isSelected && styles.stackCardSelected,
              ]}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <StackLogo stackId={stack.id} fallbackIcon={stack.icon} size={36} style={{ marginRight: spacing.md }} />
              <View style={styles.stackInfo}>
                <Text style={styles.stackTitle}>{stack.title}</Text>
                <Text style={styles.stackDescription}>{stack.description}</Text>
                {isPrevious && (
                  <Text style={styles.previousTag}>Previously used</Text>
                )}
              </View>
              {overallAvg !== null && (
                <View style={styles.avgBadge}>
                  <Text style={styles.avgText}>{overallAvg.toFixed(1)}/5</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      </DesktopContainer>

      {selectedStacks.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.continueText}>
              Continue with {selectedStacks.length} stack
              {selectedStacks.length > 1 ? 's' : ''}
            </Text>
          </Pressable>
          {selectedStacks.length > 1 && (
            <Pressable
              onPress={() =>
                router.push(
                  `/review/section-select?stacks=${selectedStacks.join(',')}${repoParam}` as '/review/section-select',
                )
              }
              style={styles.sectionPickerLink}
            >
              <Text style={styles.sectionPickerText}>
                Or pick specific sections...
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 120 },
  contentDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
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
  stackCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackCardSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
    fontSize: 14,
    fontWeight: '700',
  },
  stackIcon: { fontSize: 36, marginRight: spacing.md },
  stackInfo: { flex: 1 },
  stackTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stackDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  avgBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  avgText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  continueText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  sectionPickerLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  sectionPickerText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  templateCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  templateIcons: {
    flexDirection: 'row',
    gap: 4,
    marginRight: spacing.sm,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  templateMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  templateArrow: {
    fontSize: fontSizes.xl,
    color: colors.textMuted,
  },
  repoBanner: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderLeftWidth: 3,
    borderLeftColor: colors.reviewMode,
  },
  repoBannerContent: {
    flex: 1,
  },
  repoBannerTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  repoBannerMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  repoBannerAction: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.reviewMode,
    marginLeft: spacing.sm,
  },
  previousTag: {
    fontSize: fontSizes.xs,
    color: colors.reviewMode,
    fontWeight: '600',
    marginTop: 4,
  },
});
