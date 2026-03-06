# Frontend Kickoff Checklist (Claude)

This maps to the six setup items requested before frontend implementation.

## Status

- [x] 1) Freeze backend contract for frontend window.
  - See [backend-contract-freeze.md](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/backend-contract-freeze.md).
- [x] 2) Provide frontend handoff docs bundle.
  - [frontend-api-handoff.md](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/frontend-api-handoff.md)
  - [frontend-error-matrix.md](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/frontend-error-matrix.md)
  - [openapi.yaml](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/openapi.yaml)
- [x] 3) Confirm frontend env values and template.
  - See [.env.example.frontend](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/.env.example.frontend).
- [ ] 4) Run one authenticated smoke request against staging with real token.
  - Command:
    ```bash
    cd backend
    API_PUBLIC_URL=https://reviewhelm-staging.up.railway.app \
    API_BASE_PATH=api/v1 \
    SMOKE_BEARER_TOKEN=<supabase_access_token> \
    npm run smoke:health
    ```
- [x] 5) Keep backend branch stable during frontend build.
  - Track contract changes in [api-delta-log.md](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/api-delta-log.md).
- [x] 6) Add single source for API deltas.
  - See [api-delta-log.md](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/api-delta-log.md).
