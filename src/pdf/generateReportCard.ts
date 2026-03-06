import type { Session, ChecklistItem, Severity } from '../data/types';
import { CONFIDENCE_LABELS, type ConfidenceLevel } from '../data/types';
import type { SessionScores } from '../data/types';

interface ReportCardData {
  session: Session;
  scores: SessionScores;
  allItems: ChecklistItem[];
  stackTitle: string;
}

function severityEmoji(severity: Severity): string {
  return { blocker: '🔴', major: '🟠', minor: '🟡', nit: '⚪' }[severity];
}

function confidenceBar(level: ConfidenceLevel): string {
  const filled = '█'.repeat(level);
  const empty = '░'.repeat(5 - level);
  return `${filled}${empty} ${level}/5`;
}

export function generateReportCardHtml(data: ReportCardData): string {
  const { session, scores, allItems, stackTitle } = data;
  const completedDate = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'In progress';

  // Group items by their response
  const needsAttentionItems = allItems.filter(
    (item) => session.itemResponses[item.id]?.verdict === 'needs-attention',
  );

  const lowConfidenceItems = allItems
    .filter((item) => {
      const r = session.itemResponses[item.id];
      return r && r.confidence <= 2 && r.verdict !== 'na';
    })
    .sort((a, b) => {
      const ca = session.itemResponses[a.id]?.confidence ?? 5;
      const cb = session.itemResponses[b.id]?.confidence ?? 5;
      return ca - cb;
    });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1a1a2e;
    max-width: 700px;
    margin: 0 auto;
    padding: 20px;
    font-size: 14px;
    line-height: 1.5;
  }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 {
    font-size: 16px;
    color: #6c63ff;
    border-bottom: 2px solid #6c63ff;
    padding-bottom: 4px;
    margin-top: 24px;
  }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  .scores {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .score-card {
    flex: 1;
    background: #f5f5ff;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  }
  .score-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .score-label { font-size: 12px; color: #666; text-transform: uppercase; }
  .issue-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #eee;
  }
  .issue-text { flex: 1; }
  .issue-severity {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 8px;
  }
  .confidence-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .conf-bar {
    font-family: monospace;
    font-size: 12px;
    color: #999;
  }
  .footer {
    margin-top: 30px;
    text-align: center;
    color: #999;
    font-size: 11px;
    border-top: 1px solid #eee;
    padding-top: 12px;
  }
</style>
</head>
<body>
  <h1>${session.title}</h1>
  <div class="meta">
    ${stackTitle} · ${session.mode === 'polish' ? 'Polish' : 'Review'} Session · ${completedDate}
  </div>

  <div class="scores">
    <div class="score-card">
      <div class="score-value">${scores.coverage}%</div>
      <div class="score-label">Coverage</div>
    </div>
    <div class="score-card">
      <div class="score-value">${scores.confidence}%</div>
      <div class="score-label">Confidence</div>
    </div>
    <div class="score-card">
      <div class="score-value">${scores.totalIssues}</div>
      <div class="score-label">Issues</div>
    </div>
  </div>

  <h2>Issues by Severity</h2>
  <div class="issue-row">
    <span>🔴 Blockers</span><strong>${scores.issuesBySeverity.blocker}</strong>
  </div>
  <div class="issue-row">
    <span>🟠 Majors</span><strong>${scores.issuesBySeverity.major}</strong>
  </div>
  <div class="issue-row">
    <span>🟡 Minors</span><strong>${scores.issuesBySeverity.minor}</strong>
  </div>
  <div class="issue-row">
    <span>⚪ Nits</span><strong>${scores.issuesBySeverity.nit}</strong>
  </div>

  ${
    needsAttentionItems.length > 0
      ? `
  <h2>Items Needing Attention (${needsAttentionItems.length})</h2>
  ${needsAttentionItems
    .map(
      (item) => `
  <div class="issue-row">
    <span class="issue-text">${severityEmoji(item.severity)} ${escapeHtml(item.text)}</span>
    <span class="issue-severity" style="background: ${getSeverityBg(item.severity)}">${item.severity.toUpperCase()}</span>
  </div>`,
    )
    .join('')}
  `
      : ''
  }

  ${
    lowConfidenceItems.length > 0
      ? `
  <h2>Learning Opportunities (${lowConfidenceItems.length})</h2>
  <p style="color: #666; font-size: 13px;">Items where your confidence was low — focus your learning here.</p>
  ${lowConfidenceItems
    .map((item) => {
      const conf = session.itemResponses[item.id]?.confidence as ConfidenceLevel;
      return `
  <div class="confidence-item">
    <span>${escapeHtml(item.text)}</span>
    <span class="conf-bar">${confidenceBar(conf)} ${CONFIDENCE_LABELS[conf]}</span>
  </div>`;
    })
    .join('')}
  `
      : ''
  }

  ${
    session.sessionNotes
      ? `
  <h2>Session Notes</h2>
  <p>${escapeHtml(session.sessionNotes)}</p>
  `
      : ''
  }

  <div class="footer">
    Generated by ReviewHelm · ${completedDate}
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSeverityBg(severity: Severity): string {
  return {
    blocker: '#ffe0e0',
    major: '#fff0e0',
    minor: '#fff8e0',
    nit: '#f0f0f0',
  }[severity];
}
