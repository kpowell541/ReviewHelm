import type { PRDependency, TrackedPR } from '../data/types';

function compareDates(a?: string, b?: string): number {
  return new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();
}

function maxDate(a?: string, b?: string): string {
  return compareDates(a, b) >= 0 ? (a ?? b ?? new Date(0).toISOString()) : (b ?? a ?? new Date(0).toISOString());
}

function minDefinedDate(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return compareDates(a, b) <= 0 ? a : b;
}

function mergeOptionalText(
  preferred: string | undefined,
  fallback: string | undefined,
): string | undefined {
  if (preferred && preferred.trim().length > 0) return preferred;
  return fallback;
}

function mergeDependencies(
  preferred?: PRDependency[],
  other?: PRDependency[],
): PRDependency[] | undefined {
  const merged = new Map<string, PRDependency>();
  for (const dependency of other ?? []) {
    merged.set(`${dependency.repo}:${dependency.prNumber}`, dependency);
  }
  for (const dependency of preferred ?? []) {
    merged.set(`${dependency.repo}:${dependency.prNumber}`, dependency);
  }
  const values = [...merged.values()].sort((a, b) =>
    `${a.repo}:${a.prNumber}`.localeCompare(`${b.repo}:${b.prNumber}`),
  );
  return values.length > 0 ? values : undefined;
}

export function mergeTrackedPR(
  local?: TrackedPR,
  remote?: TrackedPR,
): TrackedPR | undefined {
  if (!local && !remote) return undefined;
  const newer =
    compareDates(local?.updatedAt, remote?.updatedAt) >= 0
      ? local ?? remote
      : remote ?? local;
  const older = newer === local ? remote : local;
  if (!newer) return older;
  if (!older) return newer;

  return {
    ...older,
    ...newer,
    id: newer.id,
    title: mergeOptionalText(newer.title, older.title) ?? newer.id,
    url: newer.url ?? older.url,
    status: newer.status,
    role: newer.role,
    priority: newer.priority,
    isEmergency: newer.isEmergency,
    size: newer.size ?? older.size,
    repo: newer.repo ?? older.repo,
    prNumber: newer.prNumber ?? older.prNumber,
    prAuthor: mergeOptionalText(newer.prAuthor, older.prAuthor),
    dependencies: mergeDependencies(newer.dependencies, older.dependencies),
    ciPassing: newer.ciPassing ?? older.ciPassing,
    linkedSessionId:
      newer.linkedSessionId !== undefined
        ? newer.linkedSessionId
        : older.linkedSessionId,
    notes: mergeOptionalText(newer.notes, older.notes),
    acceptanceOutcome: newer.acceptanceOutcome ?? older.acceptanceOutcome,
    reviewOutcome: newer.reviewOutcome ?? older.reviewOutcome,
    reReviewed: newer.reReviewed ?? older.reReviewed,
    changesEverNeeded: newer.changesEverNeeded ?? older.changesEverNeeded,
    selfReviewed: newer.selfReviewed ?? older.selfReviewed,
    reviewRoundCount: newer.reviewRoundCount ?? older.reviewRoundCount,
    createdAt: minDefinedDate(local?.createdAt, remote?.createdAt) ?? newer.createdAt,
    updatedAt: maxDate(local?.updatedAt, remote?.updatedAt),
    resolvedAt: newer.resolvedAt ?? older.resolvedAt,
    lastReviewedAt: newer.lastReviewedAt ?? older.lastReviewedAt,
    archivedAt: newer.archivedAt ?? older.archivedAt,
  };
}

export function serializeTrackedPR(pr: TrackedPR): string {
  return JSON.stringify({
    id: pr.id,
    title: pr.title,
    url: pr.url ?? null,
    status: pr.status,
    role: pr.role,
    priority: pr.priority,
    isEmergency: pr.isEmergency,
    size: pr.size ?? null,
    repo: pr.repo ?? null,
    prNumber: pr.prNumber ?? null,
    prAuthor: pr.prAuthor ?? null,
    dependencies:
      pr.dependencies?.map((dependency) => ({
        repo: dependency.repo,
        prNumber: dependency.prNumber,
        title: dependency.title ?? null,
      })) ?? [],
    ciPassing: pr.ciPassing ?? null,
    linkedSessionId: pr.linkedSessionId ?? null,
    notes: pr.notes ?? null,
    acceptanceOutcome: pr.acceptanceOutcome ?? null,
    reviewOutcome: pr.reviewOutcome ?? null,
    reReviewed: pr.reReviewed ?? null,
    changesEverNeeded: pr.changesEverNeeded ?? null,
    selfReviewed: pr.selfReviewed ?? null,
    reviewRoundCount: pr.reviewRoundCount ?? null,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    resolvedAt: pr.resolvedAt ?? null,
    lastReviewedAt: pr.lastReviewedAt ?? null,
    archivedAt: pr.archivedAt ?? null,
  });
}
