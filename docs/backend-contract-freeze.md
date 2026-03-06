# Backend Contract Freeze (Frontend Implementation Window)

## Baseline

- Freeze date: 2026-03-05
- Baseline branch: `kpowell541/reviewhelm-features`
- Baseline commit: `c4c6af6`
- Contract source: [openapi.yaml](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/openapi.yaml)

## Rules During Frontend Build

1. Treat OpenAPI as source of truth for request/response contracts.
2. Avoid changing existing endpoint payload shapes without updating:
- `docs/openapi.yaml`
- `docs/api-delta-log.md`
- frontend integration notes
3. Additive changes are preferred over breaking changes.
4. If a breaking backend change is unavoidable, log it before merge and update frontend prompts.
