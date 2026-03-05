# Frontend API Handoff (Backend-Complete)

This document is the frontend integration guide for current backend scope.

## Base

- Base URL: `https://<api-domain>/api/v1`
- Auth: OAuth2 bearer token in `Authorization: Bearer <token>`
- All endpoints are authenticated.

## Priority Endpoints (Current Scope)

1. AI tutor/comment drafting
- `POST /ai/tutor`
- Notes:
  - `model` optional.
  - comment-drafter defaults to `haiku`.
  - optional diff grounding via `diffId` or `diffText`.
  - optional `allowEscalation` (default true).

2. Optional diff input
- `POST /diffs` (paste)
- `POST /diffs/upload` (file upload)
- `GET /diffs/:diffId`

3. Comment style profiles
- `GET /comment-profiles`
- `POST /comment-profiles`
- `PATCH /comment-profiles/:profileId`
- `DELETE /comment-profiles/:profileId`
- `POST /comment-profiles/:profileId/activate`

4. Personal calibration
- `POST /calibration/feedback`
- `GET /calibration/summary?days=30`

5. Risk heatmap
- `GET /risk/sessions/:sessionId/heatmap?diffId=<optional>`

6. Compliance packs
- `GET /compliance/packs`
- `GET /compliance/packs/:packId`

7. CI policy hook (admin screens/tools only)
- `POST /admin/ci/policy-check`

## Integration Patterns

1. Session flow:
- create session -> patch item responses -> optional notes -> complete -> summary

2. Comment drafting flow:
- optionally ingest diff -> call `ai/tutor` with `feature=comment-drafter` -> submit calibration feedback

3. Learning flow:
- use `learn/queue`, `gaps`, and `ai/tutor` (`feature=learn`)

## Frontend Handling Notes

- Persist and send `X-Request-Id` for traceability.
- Handle `409` cooldown for AI by showing wait/retry UX.
- Handle `402` budget exceeded distinctly.
- Handle `429` rate limits with retry/backoff.
- Gracefully recover on `502` upstream AI errors.

## Contract Source

- Canonical contract: [openapi.yaml](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/openapi.yaml)
