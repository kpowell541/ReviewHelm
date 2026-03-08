import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { AppFooter } from '../src/components/AppFooter';
import { useResponsive } from '../src/hooks/useResponsive';
import { useSessionStore } from '../src/store/useSessionStore';
import { useConfidenceStore } from '../src/store/useConfidenceStore';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import type { PRRole, PRSize, PRPriority, CIPassing, PRDependency } from '../src/data/types';
import { PR_PRIORITY_LABELS, PR_PRIORITY_ORDER } from '../src/data/types';

interface ModeCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: string;
  isDesktop?: boolean;
}

function ModeCard({ title, subtitle, icon, color, onPress, badge, isDesktop }: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        isDesktop && styles.modeCardDesktop,
        { borderLeftColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.modeCardContent}>
        <Text style={styles.modeIcon}>{icon}</Text>
        <View style={styles.modeCardText}>
          <Text style={styles.modeTitle}>{title}</Text>
          <Text style={styles.modeSubtitle}>{subtitle}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: color + '30' }]}>
            <Text style={[styles.badgeText, { color }]}>{badge}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function RecentSessionCard({ session }: { session: { id: string; title: string; mode: string; updatedAt: string; isComplete: boolean } }) {
  const router = useRouter();
  const route = session.mode === 'polish'
    ? `/polish/${session.id}` as const
    : `/review/${session.id}` as const;

  return (
    <Pressable
      onPress={() => router.push(route)}
      style={({ pressed }) => [
        styles.recentCard,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.recentTitle} numberOfLines={1}>
        {session.title}
      </Text>
      <Text style={styles.recentMeta}>
        {session.isComplete ? '✅ Complete' : '🔄 In progress'}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const sessions = useSessionStore((s) => s.sessions);
  const histories = useConfidenceStore((s) => s.histories);
  const prs = usePRTrackerStore((s) => s.prs);
  const addPR = usePRTrackerStore((s) => s.addPR);

  const [showAddPR, setShowAddPR] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    url: '',
    role: 'reviewer' as PRRole,
    size: 'medium' as PRSize,
    priority: 'medium' as PRPriority,
    repo: '',
    prNumber: '',
    prAuthor: '',
    dependencies: [] as PRDependency[],
    ciPassing: 'unknown' as CIPassing,
  });
  const [depForm, setDepForm] = useState({ repo: '', prNumber: '', title: '' });

  const handleSaveNewPR = useCallback(() => {
    if (!addForm.title.trim()) return;
    addPR({
      title: addForm.title.trim(),
      url: addForm.url.trim() || undefined,
      role: addForm.role,
      priority: addForm.priority,
      size: addForm.size,
      repo: addForm.repo.trim() || undefined,
      prNumber: addForm.prNumber ? parseInt(addForm.prNumber, 10) || undefined : undefined,
      prAuthor: addForm.role === 'author' ? 'Me' : (addForm.prAuthor.trim() || undefined),
      dependencies: addForm.dependencies.length > 0 ? addForm.dependencies : undefined,
      ciPassing: addForm.ciPassing !== 'unknown' ? addForm.ciPassing : undefined,
    });
    setAddForm({ title: '', url: '', role: 'reviewer', size: 'medium', priority: 'medium', repo: '', prNumber: '', prAuthor: '', dependencies: [], ciPassing: 'unknown' });
    setDepForm({ repo: '', prNumber: '', title: '' });
    setShowAddPR(false);
  }, [addForm, addPR]);

  const recentSessions = useMemo(() => {
    return Object.values(sessions)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [sessions]);

  const { gapCount, dueCount } = useMemo(() => {
    const items = Object.values(histories);
    const weakCount = items
      .filter((h) => h.currentConfidence <= 2)
      .length;
    const due = items.filter((h) => {
      if (!h.repetitionState?.nextReviewDate) return false;
      return new Date(h.repetitionState.nextReviewDate).getTime() <= Date.now();
    }).length;
    return { gapCount: Math.min(weakCount, 5), dueCount: due };
  }, [histories]);

  const activePRCount = useMemo(() => {
    return Object.values(prs).filter(
      (pr) => ['open', 'in-review', 'changes-requested', 'approved'].includes(pr.status),
    ).length;
  }, [prs]);

  return (
    <SafeAreaView style={styles.container}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
        <View style={styles.homeHeader}>
          <View style={styles.logoArea}>
            <Image
              source={require('../assets/splash-icon.png')}
              style={styles.logoIcon}
            />
            <Text style={[styles.appTitle, isDesktop && styles.appTitleDesktop]}>
              <Text style={styles.wordmarkReview}>Review</Text>
              <Text style={styles.wordmarkHelm}>Helm</Text>
            </Text>
          </View>
          <Pressable
            style={styles.headerSettingsBtn}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.headerSettingsIcon}>&#x2699;&#xFE0E;</Text>
          </Pressable>
        </View>
        <Text style={styles.appSubtitle}>
          Review with confidence. Learn as you go.
        </Text>

        <View style={[styles.modeCards, isDesktop && styles.modeCardsDesktop]}>
          <ModeCard
            title="Review a PR"
            subtitle="Checklist for reviewing teammate PRs"
            icon="🔍"
            color={colors.reviewMode}
            onPress={() => router.push('/review/stack-select')}
            isDesktop={isDesktop}
          />

          <ModeCard
            title="Polish My PR"
            subtitle="Prep your PR for a smooth merge"
            icon="✨"
            color={colors.polishMode}
            onPress={() => router.push('/polish/sessions')}
            isDesktop={isDesktop}
          />

          <ModeCard
            title="Learn"
            subtitle="Study your weak areas with AI tutor"
            icon="📚"
            color={colors.learnMode}
            onPress={() => router.push('/learn/stack-select')}
            badge={gapCount > 0 ? `${gapCount} gaps` : undefined}
            isDesktop={isDesktop}
          />

          <ModeCard
            title="My Gaps"
            subtitle="Track and close your knowledge gaps"
            icon="📊"
            color={colors.gapsMode}
            onPress={() => router.push('/gaps')}
            isDesktop={isDesktop}
            badge={
              gapCount > 0 || dueCount > 0
                ? [
                    gapCount > 0 ? `${gapCount} gaps` : '',
                    dueCount > 0 ? `${dueCount} due` : '',
                  ].filter(Boolean).join(' · ')
                : undefined
            }
          />
        </View>

        <Pressable
          onPress={() => setShowAddPR(true)}
          style={({ pressed }) => [
            styles.addPRButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.addPRButtonText}>+ Add a PR</Text>
        </Pressable>

        <View style={styles.quickLinks}>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/search')}
          >
            <Text style={styles.quickLinkText}>🔎 Search</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/dashboard')}
          >
            <Text style={styles.quickLinkText}>📈 Readiness</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/bookmarks')}
          >
            <Text style={styles.quickLinkText}>⭐ Bookmarks</Text>
          </Pressable>
        </View>

        <View style={styles.quickLinks}>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/pr-tracker')}
          >
            <Text style={styles.quickLinkText}>
              🔀 PRs{activePRCount > 0 ? ` (${activePRCount})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/trends')}
          >
            <Text style={styles.quickLinkText}>📊 Trends</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => router.push('/past-reviews')}
          >
            <Text style={styles.quickLinkText}>📋 Past PRs</Text>
          </Pressable>
          {dueCount > 0 && (
            <Pressable
              style={styles.quickLink}
              onPress={() => router.push('/review/due-items')}
            >
              <Text style={styles.quickLinkText}>🔁 Due ({dueCount})</Text>
            </Pressable>
          )}
        </View>

        {recentSessions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {recentSessions.map((session) => (
              <RecentSessionCard key={session.id} session={session} />
            ))}
          </View>
        )}

        <AppFooter />
      </ScrollView>
      </DesktopContainer>

      {/* Add PR Modal */}
      <Modal
        visible={showAddPR}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setShowAddPR(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}
          onPress={() => setShowAddPR(false)}
        >
          <Pressable style={[styles.modalCard, isDesktop && styles.modalCardDesktop]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add a PR</Text>

              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.chipRow}>
                {(['reviewer', 'author'] as PRRole[]).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, addForm.role === r && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({
                      ...f,
                      role: r,
                      prAuthor: r === 'author' ? 'Me' : '',
                    }))}
                  >
                    <Text style={[styles.chipText, addForm.role === r && styles.chipTextActive]}>
                      {r === 'author' ? 'My PR' : 'Reviewing'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={addForm.title}
                onChangeText={(v) => setAddForm((f) => ({ ...f, title: v }))}
                placeholder="PR title"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <Text style={styles.fieldLabel}>URL</Text>
              <TextInput
                style={styles.input}
                value={addForm.url}
                onChangeText={(v) => setAddForm((f) => ({ ...f, url: v }))}
                placeholder="https://github.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.fieldLabel}>Repo</Text>
              <TextInput
                style={styles.input}
                value={addForm.repo}
                onChangeText={(v) => setAddForm((f) => ({ ...f, repo: v }))}
                placeholder="org/repo-name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <View style={styles.fieldRowSplit}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>PR #</Text>
                  <TextInput
                    style={styles.input}
                    value={addForm.prNumber}
                    onChangeText={(v) => setAddForm((f) => ({ ...f, prNumber: v }))}
                    placeholder="1234"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                {addForm.role === 'reviewer' && (
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Author</Text>
                    <TextInput
                      style={styles.input}
                      value={addForm.prAuthor}
                      onChangeText={(v) => setAddForm((f) => ({ ...f, prAuthor: v }))}
                      placeholder="username"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>

              <Text style={styles.fieldLabel}>Size</Text>
              <View style={styles.chipRow}>
                {(['small', 'medium', 'large'] as PRSize[]).map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.chip, addForm.size === s && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({ ...f, size: s }))}
                  >
                    <Text style={[styles.chipText, addForm.size === s && styles.chipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.chipRow}>
                {PR_PRIORITY_ORDER.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, addForm.priority === p && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({ ...f, priority: p }))}
                  >
                    <Text style={[styles.chipText, addForm.priority === p && styles.chipTextActive]}>
                      {PR_PRIORITY_LABELS[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Build Passing?</Text>
              <View style={styles.chipRow}>
                {(['yes', 'no', 'unknown'] as CIPassing[]).map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.chip, addForm.ciPassing === v && styles.chipActive]}
                    onPress={() => setAddForm((f) => ({ ...f, ciPassing: v }))}
                  >
                    <Text style={[styles.chipText, addForm.ciPassing === v && styles.chipTextActive]}>
                      {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Unknown'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Dependencies</Text>
              {addForm.dependencies.map((dep, idx) => (
                <View key={idx} style={styles.depRow}>
                  <Text style={styles.depText}>
                    {dep.repo} #{dep.prNumber}{dep.title ? ` — ${dep.title}` : ''}
                  </Text>
                  <Pressable onPress={() => setAddForm((f) => ({
                    ...f,
                    dependencies: f.dependencies.filter((_, i) => i !== idx),
                  }))}>
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
                  style={[styles.depAddBtn, (!depForm.repo.trim() || !depForm.prNumber.trim()) && { opacity: 0.4 }]}
                  onPress={() => {
                    if (!depForm.repo.trim() || !depForm.prNumber.trim()) return;
                    const num = parseInt(depForm.prNumber, 10);
                    if (!num) return;
                    setAddForm((f) => ({
                      ...f,
                      dependencies: [...f.dependencies, { repo: depForm.repo.trim(), prNumber: num, title: depForm.title.trim() || undefined }],
                    }));
                    setDepForm({ repo: '', prNumber: '', title: '' });
                  }}
                >
                  <Text style={styles.depAddBtnText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.modalButtons}>
                <Pressable onPress={() => setShowAddPR(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNewPR}
                  style={[styles.saveButton, !addForm.title.trim() && { opacity: 0.4 }]}
                >
                  <Text style={styles.saveButtonText}>Add PR</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  scrollDesktop: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  appTitle: {
    fontSize: fontSizes['3xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
  },
  appTitleDesktop: {
    fontSize: fontSizes['4xl'],
  },
  wordmarkReview: {
    color: '#fbbf24',
  },
  wordmarkHelm: {
    color: '#8b5cf6',
  },
  headerSettingsBtn: {
    width: 36,
    height: 36,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSettingsIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  appSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_400Regular',
    marginTop: spacing.xs,
    marginBottom: spacing['3xl'],
  },
  modeCards: {
    gap: spacing.md,
  },
  modeCardsDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.lg,
  },
  modeCardDesktop: {
    flexBasis: '48%',
  } as any,
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  modeCardText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  modeSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  quickLink: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  quickLinkText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  recentSection: {
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  recentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    flex: 1,
  },
  recentMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  addPRButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addPRButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  modalCardDesktop: {
    width: 520,
    maxHeight: '80%',
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
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
