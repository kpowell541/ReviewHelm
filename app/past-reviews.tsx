import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../src/store/useSessionStore';
import { usePRTrackerStore } from '../src/store/usePRTrackerStore';
import { PR_SIZE_LABELS } from '../src/data/types';
import { colors, spacing, fontSizes, radius } from '../src/theme';
import { DesktopContainer } from '../src/components/DesktopContainer';
import { useResponsive } from '../src/hooks/useResponsive';

type TimeFilter = 'all' | '30d' | '90d' | '6m' | '1y';
type RoleFilter = 'all' | 'mine' | 'others';

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
];

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All PRs' },
  { key: 'mine', label: 'My PRs' },
  { key: 'others', label: "Others' PRs" },
];

function getTimeCutoff(filter: TimeFilter): number | null {
  const now = Date.now();
  switch (filter) {
    case '30d': return now - 30 * 24 * 60 * 60 * 1000;
    case '90d': return now - 90 * 24 * 60 * 60 * 1000;
    case '6m': return now - 180 * 24 * 60 * 60 * 1000;
    case '1y': return now - 365 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export default function PastReviewsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const prs = usePRTrackerStore((s) => s.prs);
  const archiveOldPRs = usePRTrackerStore((s) => s.archiveOldPRs);
  const sessions = useSessionStore((s) => s.sessions);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Auto-archive on mount
  useEffect(() => {
    archiveOldPRs();
  }, [archiveOldPRs]);

  // All resolved PRs (including archived)
  const resolvedPRs = useMemo(() => {
    const cutoff = getTimeCutoff(timeFilter);
    return Object.values(prs)
      .filter((pr) => {
        // Must be resolved (merged/closed)
        if (!pr.resolvedAt) return false;
        // Time filter
        if (cutoff && new Date(pr.resolvedAt).getTime() < cutoff) return false;
        // Role filter
        if (roleFilter === 'mine' && pr.role !== 'author') return false;
        if (roleFilter === 'others' && pr.role !== 'reviewer') return false;
        return true;
      })
      .sort((a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime());
  }, [prs, timeFilter, roleFilter]);

  const getLinkedSessionTitle = (pr: { linkedSessionId?: string }) => {
    if (!pr.linkedSessionId) return null;
    const session = sessions[pr.linkedSessionId];
    return session ? session.title : null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DesktopContainer>
      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.heading}>Past Reviews</Text>
        <Text style={styles.subtitle}>Browse your completed PR reviews</Text>

        {/* Time filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {TIME_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, timeFilter === f.key && styles.filterChipActive]}
              onPress={() => setTimeFilter(f.key)}
            >
              <Text style={[styles.filterText, timeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Role filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {ROLE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
              onPress={() => setRoleFilter(f.key)}
            >
              <Text style={[styles.filterText, roleFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.resultCount}>
          {resolvedPRs.length} PR{resolvedPRs.length !== 1 ? 's' : ''}
        </Text>

        {resolvedPRs.map((pr) => {
          const subtitle = [
            pr.repo,
            pr.prNumber ? `#${pr.prNumber}` : null,
            pr.prAuthor ? `by @${pr.prAuthor}` : null,
          ].filter(Boolean).join(' ');
          const sessionTitle = getLinkedSessionTitle(pr);

          return (
            <Pressable
              key={pr.id}
              style={styles.prCard}
              onPress={() => {
                if (pr.linkedSessionId) {
                  router.push(`/session-summary/${pr.linkedSessionId}`);
                }
              }}
            >
              <View style={styles.prCardHeader}>
                <View style={styles.prCardInfo}>
                  <Text style={styles.prTitle} numberOfLines={1}>{pr.title}</Text>
                  {subtitle ? (
                    <Text style={styles.prSubtitle} numberOfLines={1}>{subtitle}</Text>
                  ) : null}
                </View>
                <View style={styles.prBadges}>
                  <Text style={[styles.statusBadge, pr.status === 'merged' ? styles.mergedBadge : styles.closedBadge]}>
                    {pr.status === 'merged' ? 'Merged' : 'Closed'}
                  </Text>
                  {pr.size && (
                    <Text style={styles.sizeBadge}>{PR_SIZE_LABELS[pr.size]}</Text>
                  )}
                  <Text style={[styles.roleBadge, pr.role === 'author' ? styles.authorBadge : styles.reviewerBadge]}>
                    {pr.role === 'author' ? 'Mine' : 'Reviewed'}
                  </Text>
                </View>
              </View>
              <View style={styles.prCardFooter}>
                <Text style={styles.resolvedDate}>
                  {pr.resolvedAt ? new Date(pr.resolvedAt).toLocaleDateString() : ''}
                </Text>
                {sessionTitle && (
                  <Text style={styles.linkedSession} numberOfLines={1}>
                    Session: {sessionTitle}
                  </Text>
                )}
                {pr.archivedAt && (
                  <Text style={styles.archivedLabel}>Archived</Text>
                )}
              </View>
            </Pressable>
          );
        })}

        {resolvedPRs.length === 0 && (
          <Text style={styles.empty}>
            No past reviews found for this filter.
          </Text>
        )}
      </ScrollView>
      </DesktopContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  contentDesktop: { paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
  heading: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  filterRow: { marginBottom: spacing.sm },
  filterContent: { gap: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  filterText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  filterTextActive: { color: colors.primary, fontWeight: '600' },
  resultCount: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  prCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  prCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  prCardInfo: { flex: 1 },
  prTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  prSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  prBadges: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  mergedBadge: {
    backgroundColor: colors.looksGood + '25',
    color: colors.looksGood,
  },
  closedBadge: {
    backgroundColor: colors.textMuted + '25',
    color: colors.textMuted,
  },
  sizeBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.reviewMode + '25',
    color: colors.reviewMode,
    overflow: 'hidden',
  },
  roleBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  authorBadge: {
    backgroundColor: colors.polishMode + '25',
    color: colors.polishMode,
  },
  reviewerBadge: {
    backgroundColor: colors.reviewMode + '25',
    color: colors.reviewMode,
  },
  prCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  resolvedDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  linkedSession: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    flex: 1,
  },
  archivedLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
});
