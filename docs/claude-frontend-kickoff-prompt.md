# Claude Frontend Kickoff Prompt

Use this as the initial prompt when implementing frontend integration.

```text
You are implementing frontend API integration for ReviewHelm.

Context:
- Repo root contains Expo React Native frontend.
- Backend contract is frozen for this frontend window.
- Use these docs as source of truth:
  1) docs/backend-contract-freeze.md
  2) docs/openapi.yaml
  3) docs/frontend-api-handoff.md
  4) docs/frontend-error-matrix.md
  5) docs/api-delta-log.md

Non-negotiable constraints:
- Do not invent endpoints, fields, or status codes.
- Treat docs/openapi.yaml as canonical for request/response shapes.
- Keep all business/data calls authenticated with bearer token.
- Public probe endpoints are only:
  - GET /
  - GET /api/v1/health
  - GET /api/v1/health/ready
- If a backend contract mismatch is discovered, stop and append a delta entry to docs/api-delta-log.md.

Environment:
- Read frontend env from .env.example.frontend naming:
  - EXPO_PUBLIC_API_BASE_URL
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY
  - EXPO_PUBLIC_AUTH_REDIRECT_URI

Implementation goals:
1) Add a centralized API client module with:
   - base URL from EXPO_PUBLIC_API_BASE_URL
   - bearer auth injection
   - x-request-id generation per request
2) Implement typed request/response wrappers for priority endpoints in docs/frontend-api-handoff.md.
3) Map backend errors to frontend UX behaviors using docs/frontend-error-matrix.md.
4) Add token-aware retry/backoff for 409/429 and clear UX handling for 401/402/502.
5) Keep changes incremental and compile-safe. After each milestone, run typecheck/build and summarize modified files.

Execution style:
- Make the smallest correct change first.
- Do not rewrite unrelated UI.
- Preserve existing design and navigation patterns.
- Return a concise diff summary after each milestone.
```
