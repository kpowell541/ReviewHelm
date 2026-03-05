# ReviewHelm Feature Rollout Priority

Last updated: 2026-03-05

## Do Now

1. Diff-aware comment grounding (optional paste/upload flow)
2. Automatic model escalation (Haiku -> Sonnet when quality signals are weak)
3. PR/session risk heatmap
4. Comment style profiles
6. Personal calibration loop (feedback + summary)
8. Compliance packs
9. CI policy hooks (session gate endpoint)

## Defer Until User-Base Expansion

5. One-click fix suggestion mode (patch generation)
7. Team mode (consensus/calibration across reviewers)
10. App attestation hard enforcement (Play Integrity/App Check gates in production)

## Notes

- Feature 1 remains optional and is only used when a user explicitly provides a diff.
- No GitHub integration is required for feature 1; user can paste/upload unified diff content.
- Current secret custody baseline is Infisical. AWS KMS can be introduced at expansion/rotation stage.
