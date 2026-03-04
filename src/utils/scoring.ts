import type {
  Session,
  SessionScores,
  Severity,
  ChecklistItem,
} from '../data/types';
import { SEVERITY_WEIGHTS } from '../data/types';

export function computeSessionScores(
  session: Session,
  allItems: ChecklistItem[]
): SessionScores {
  const responses = session.itemResponses;

  let itemsResponded = 0;
  let naCount = 0;
  let totalConfidence = 0;
  const issuesBySeverity: Record<Severity, number> = {
    blocker: 0,
    major: 0,
    minor: 0,
    nit: 0,
  };

  for (const item of allItems) {
    const response = responses[item.id];
    if (!response) continue;

    if (response.verdict === 'na') {
      naCount++;
      continue;
    }

    if (response.verdict !== 'skipped') {
      itemsResponded++;
      totalConfidence += response.confidence;
    }

    if (response.verdict === 'needs-attention') {
      issuesBySeverity[item.severity]++;
    }
  }

  const applicableItems = allItems.length - naCount;
  const coverage =
    applicableItems > 0 ? (itemsResponded / applicableItems) * 100 : 0;
  const confidence =
    itemsResponded > 0
      ? (totalConfidence / itemsResponded / 5) * 100
      : 0;
  const totalIssues = Object.values(issuesBySeverity).reduce(
    (a, b) => a + b,
    0
  );

  return {
    coverage: Math.round(coverage),
    confidence: Math.round(confidence),
    issuesByServerity: issuesBySeverity,
    totalIssues,
    itemsResponded,
    applicableItems,
  };
}
