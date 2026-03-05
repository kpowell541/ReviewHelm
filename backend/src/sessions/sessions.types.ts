export type Verdict = 'looks-good' | 'needs-attention' | 'na' | 'skipped';
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export interface SessionItemResponse {
  verdict: Verdict;
  confidence: ConfidenceLevel;
  notes?: string;
  draftedComment?: string;
}

export interface SessionItemMeta {
  itemId: string;
  text: string;
  severity: 'blocker' | 'major' | 'minor' | 'nit';
  sectionId: string;
}
