export const colors = {
  // Background
  bg: '#0f0f1a',
  bgCard: '#1a1a2e',
  bgCardHover: '#222240',
  bgSection: '#16162b',
  bgModal: '#1a1a2e',

  // Text
  textPrimary: '#e8e8f0',
  textSecondary: '#9a9ab0',
  textMuted: '#6a6a80',

  // Accent
  primary: '#6c63ff',
  primaryLight: '#8b83ff',
  primaryDark: '#4a42d4',

  // Severity
  blocker: '#ff4757',
  major: '#ff8c42',
  minor: '#ffc107',
  nit: '#78909c',

  // Verdict
  looksGood: '#2ecc71',
  needsAttention: '#ff8c42',
  na: '#555570',
  skipped: '#3a3a50',

  // Confidence scale
  confidence1: '#ff4757',
  confidence2: '#ff8c42',
  confidence3: '#ffc107',
  confidence4: '#2ecc71',
  confidence5: '#00b894',

  // Status
  success: '#2ecc71',
  warning: '#ffc107',
  error: '#ff4757',
  info: '#54a0ff',

  // Code blocks
  codeBg: '#0d0d1a',
  codeBad: '#ff475720',
  codeGood: '#2ecc7120',
  codeBadBorder: '#ff4757',
  codeGoodBorder: '#2ecc71',

  // UI
  border: '#2a2a45',
  divider: '#1f1f35',
  overlay: '#00000080',

  // Modes
  reviewMode: '#54a0ff',
  polishMode: '#ff6b81',
  learnMode: '#ffc107',
  gapsMode: '#a29bfe',
} as const;

export type ColorKey = keyof typeof colors;
