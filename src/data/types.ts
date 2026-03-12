import { colors } from '../theme';

// ============================================
// Severity & Mode Types
// ============================================

export type Severity = 'blocker' | 'major' | 'minor' | 'nit';
export type ChecklistMode = 'review' | 'polish';
export type StackId =
  | 'java-protobuf'
  | 'js-ts-react-node'
  | 'go'
  | 'terraform-hcl'
  | 'swift-objc'
  | 'python'
  | 'ruby'
  | 'lua'
  | 'c-lang'
  | 'data-formats'
  | 'postgresql'
  | 'graphql'
  | 'rest-api'
  | 'rust'
  | 'csharp-dotnet'
  | 'kotlin-android'
  | 'security'
  | 'dart-flutter'
  | 'php'
  | 'vue'
  | 'angular'
  | 'cpp'
  | 'shell'
  | 'sql-migrations'
  | 'nextjs'
  | 'django'
  | 'spring-boot'
  | 'elixir-phoenix'
  | 'scala'
  | 'docker-k8s'
  | 'cicd'
  | 'code-review-meta'
  | 'typescript'
  | 'css-styling'
  | 'r-lang'
  | 'nosql'
  | 'package-bundler'
  | 'bdd-testing'
  | 'unit-testing'
  | 'e2e-testing'
  | 'api-testing'
  | 'performance-testing'
  | 'mobile-testing'
  | 'react'
  | 'nodejs'
  | 'protobuf'
  | 'accessibility'
  | 'observability'
  | 'microservices'
  | 'websockets'
  | 'ml-engineering'
  | 'svelte'
  | 'haskell'
  | 'zig'
  | 'api-versioning'
  | 'compliance';

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  blocker: 4,
  major: 3,
  minor: 2,
  nit: 1,
};

// ============================================
// Checklist Data (from JSON files)
// ============================================

export interface CodeExample {
  title: string;
  language: string;
  bad?: {
    code: string;
    explanation: string;
  };
  good?: {
    code: string;
    explanation: string;
  };
}

export interface BaseContent {
  whatItMeans: string;
  whyItMatters: string;
  howToVerify: string;
  exampleComment: string;
  codeExamples: CodeExample[];
  keyTakeaway: string;
  references?: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  severity: Severity;
  tags: string[];
  baseContent: BaseContent;
}

export interface ChecklistSubsection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistSection {
  id: string;
  title: string;
  subsections?: ChecklistSubsection[];
  items?: ChecklistItem[];
}

export interface ChecklistMeta {
  id: string;
  mode: ChecklistMode;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  totalItems: number;
  version: string;
}

export interface Checklist {
  meta: ChecklistMeta;
  sections: ChecklistSection[];
}

// ============================================
// Session & Responses (stored locally)
// ============================================

export type Verdict = 'looks-good' | 'needs-attention' | 'na' | 'skipped';
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  1: 'Lost',
  2: 'Shaky',
  3: 'Getting There',
  4: 'Solid',
  5: 'Expert',
};

export const CONFIDENCE_EMOJI: Record<ConfidenceLevel, string> = {
  1: '😰',
  2: '😕',
  3: '🤔',
  4: '😊',
  5: '💪',
};

export interface ItemResponse {
  verdict: Verdict;
  confidence: ConfidenceLevel;
  notes?: string;
  draftedComment?: string;
}

export interface Session {
  id: string;
  mode: ChecklistMode;
  stackId?: StackId;
  stackIds?: StackId[];
  selectedSections?: string[];
  title: string;
  itemResponses: Record<string, ItemResponse>;
  sessionNotes: string;
  linkedPRId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isComplete: boolean;
}

/** Resolve effective stack IDs from either `stackIds` or legacy `stackId` */
export function getEffectiveStackIds(session: Session): StackId[] {
  if (session.stackIds && session.stackIds.length > 0) return session.stackIds;
  if (session.stackId) return [session.stackId];
  return [];
}

export interface SessionTemplate {
  id: string;
  name: string;
  stackIds: StackId[];
  selectedSections?: string[];
  createdAt: string;
}

// ============================================
// Confidence History & Learning
// ============================================

export type ConfidenceTrend = 'improving' | 'stable' | 'declining' | 'new';

export interface ConfidenceRating {
  sessionId: string;
  confidence: ConfidenceLevel;
  verdict: Verdict;
  date: string;
}

export interface RepetitionState {
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
  repetitions: number;
}

export interface ItemConfidenceHistory {
  itemId: string;
  stackId: string;
  sectionId: string;
  severity: Severity;
  ratings: ConfidenceRating[];
  currentConfidence: ConfidenceLevel;
  averageConfidence: number;
  trend: ConfidenceTrend;
  learningPriority: number;
  repetitionState?: RepetitionState;
}

// ============================================
// Learning Paths
// ============================================

export type LearningDuration = '5min' | '15min' | '30min';

export interface LearningPath {
  id: string;
  stackId: StackId;
  title: string;
  description: string;
  duration: LearningDuration;
  itemIds: string[];
  sectionIds?: string[];
}

// ============================================
// AI Tutor
// ============================================

export type ClaudeModel = 'sonnet' | 'opus';
export type AiFeature = 'learn' | 'deep-dive' | 'comment-drafter';

export const CLAUDE_MODEL_IDS: Record<ClaudeModel, string> = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
};

export const CLAUDE_MODEL_LABELS: Record<ClaudeModel, string> = {
  sonnet: 'Sonnet 4.6',
  opus: 'Opus 4.6',
};

export const CLAUDE_MODEL_DESCRIPTIONS: Record<ClaudeModel, string> = {
  sonnet: 'Great for daily learning, explanations, and comment drafting',
  opus: 'Best for complex topics like concurrency, architecture, and type systems',
};

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  learn: 'Learn',
  'deep-dive': 'Deep Dive Tutor',
  'comment-drafter': 'Comment Drafter',
};

export type TutorRole =
  | 'concept-explainer'
  | 'qa'
  | 'comment-drafter'
  | 'exercise-generator'
  | 'anti-bias-challenger';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TutorConversation {
  itemId: string;
  messages: TutorMessage[];
  lastAccessed: string;
}

// ============================================
// Scoring
// ============================================

export interface SessionScores {
  coverage: number;
  confidence: number;
  issuesBySeverity: Record<Severity, number>;
  totalIssues: number;
  itemsResponded: number;
  applicableItems: number;
}

// ============================================
// PR Tracker
// ============================================

export type PRStatus =
  | 'needs-review'
  | 'in-review'
  | 'changes-requested'
  | 'approved'
  | 'merged'
  | 'closed';

export type PRRole = 'author' | 'reviewer';

export type PRPriority = 'routine' | 'low' | 'medium' | 'high' | 'critical';

export const PR_PRIORITY_ORDER: PRPriority[] = ['critical', 'high', 'medium', 'low', 'routine'];

export type PRSize = 'small' | 'medium' | 'large';

export interface PRDependency {
  repo: string;
  prNumber: number;
  title?: string;
}

export type CIPassing = 'yes' | 'no' | 'unknown';

/** Whether the author's PR was accepted with or without changes requested by reviewers */
export type AcceptanceOutcome = 'accepted-clean' | 'accepted-with-changes' | 'abandoned';

/** Whether the reviewer requested changes on someone else's PR */
export type ReviewOutcome = 'requested-changes' | 'no-changes-requested';

export interface TrackedPR {
  id: string;
  title: string;
  url?: string;
  status: PRStatus;
  role: PRRole;
  priority: PRPriority;
  isEmergency: boolean;
  size?: PRSize;
  repo?: string;
  prNumber?: number;
  prAuthor?: string;
  dependencies?: PRDependency[];
  ciPassing?: CIPassing;
  linkedSessionId?: string;
  notes?: string;
  /** For author PRs: whether it was accepted clean or with changes requested */
  acceptanceOutcome?: AcceptanceOutcome;
  /** For reviewer PRs: whether changes were requested */
  reviewOutcome?: ReviewOutcome;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  lastReviewedAt?: string;
  archivedAt?: string;
}

export const PR_ACTIVE_STATUSES: PRStatus[] = [
  'needs-review',
  'in-review',
  'changes-requested',
  'approved',
];

export const PR_STATUS_LABELS: Record<PRStatus, string> = {
  'needs-review': 'Needs Review',
  'in-review': 'In Review',
  'changes-requested': 'Changes Requested',
  approved: 'Approved',
  merged: 'Merged',
  closed: 'Closed',
};

export const PR_ROLE_LABELS: Record<PRRole, string> = {
  author: 'My PR',
  reviewer: 'Reviewing',
};

export const PR_SIZE_LABELS: Record<PRSize, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

export const PR_PRIORITY_LABELS: Record<PRPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  routine: 'Routine',
};

// ============================================
// Color Mappings
// ============================================

export const SEVERITY_COLORS: Record<Severity, string> = {
  blocker: colors.blocker,
  major: colors.major,
  minor: colors.minor,
  nit: colors.nit,
};

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  1: colors.confidence1,
  2: colors.confidence2,
  3: colors.confidence3,
  4: colors.confidence4,
  5: colors.confidence5,
};

export const STATUS_COLORS: Record<PRStatus, string> = {
  'needs-review': colors.warning,
  'in-review': colors.reviewMode,
  'changes-requested': colors.needsAttention,
  approved: colors.looksGood,
  merged: colors.looksGood,
  closed: colors.textMuted,
};

export const PRIORITY_COLORS: Record<PRPriority, string> = {
  critical: colors.error,
  high: colors.needsAttention,
  medium: colors.warning,
  low: colors.textSecondary,
  routine: colors.textMuted,
};

/** Derive a display label and color from the PR's full state */
export function getPRDisplayStatus(pr: TrackedPR): { label: string; color: string } {
  if (pr.acceptanceOutcome === 'abandoned') {
    return { label: 'Abandoned', color: colors.textMuted };
  }
  if (pr.acceptanceOutcome === 'accepted-clean' || pr.acceptanceOutcome === 'accepted-with-changes') {
    return { label: 'Accepted', color: colors.looksGood };
  }
  if (pr.reviewOutcome === 'requested-changes') {
    return { label: 'Needs Changes', color: colors.needsAttention };
  }
  if (pr.reviewOutcome === 'no-changes-requested') {
    return { label: 'Ready for Merge', color: colors.looksGood };
  }
  return { label: PR_STATUS_LABELS[pr.status], color: STATUS_COLORS[pr.status] };
}

// ============================================
// Helpers
// ============================================

/** Get all items from a section, whether in subsections or directly on the section */
export function getSectionItems(section: ChecklistSection): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  if (section.items) {
    items.push(...section.items);
  }
  if (section.subsections) {
    for (const sub of section.subsections) {
      items.push(...sub.items);
    }
  }
  return items;
}

/** Get all items from an entire checklist */
export function getAllChecklistItems(checklist: Checklist): ChecklistItem[] {
  return checklist.sections.flatMap(getSectionItems);
}
