# ReviewHelm Backend API Contract (v1)

## 1. Stack Decision (Locked)

- Mobile client: Expo React Native (Android), TypeScript
- API: NestJS + Express, TypeScript
- API style: REST (`/api/v1`)
- Auth: Supabase Auth OAuth (Google/GitHub/etc.) with PKCE
- Database: Supabase Postgres (managed PostgreSQL)
- ORM: Prisma
- Cache/rate limit/cooldown state: Upstash Redis
- Secret and key custody:
  - Service secrets: Supabase project secrets + server environment secrets
  - User provider keys (Anthropic): envelope encryption, ciphertext stored in DB
  - KEK storage: vault-backed secret (HCP Vault or Infisical), never committed

## 2. Authentication and Authorization

### 2.1 Client Auth Flow

1. Android app authenticates with Supabase OAuth using PKCE.
2. App receives Supabase JWT access token.
3. App sends `Authorization: Bearer <jwt>` to ReviewHelm API.
4. API validates JWT using Supabase JWKS.
5. API maps `sub` claim to internal `users.id`.

### 2.2 Required Headers

- `Authorization: Bearer <token>` for all protected endpoints
- `Content-Type: application/json` for JSON request bodies
- `X-Client-Version: <semver>` recommended
- `X-Request-Id: <uuid>` optional, echoed in response if present

### 2.3 Auth Rules

- All `/api/v1/*` endpoints are protected by OAuth2 JWT validation.
- A user can only access their own resources.
- Admin endpoints are explicitly prefixed `/api/v1/admin/*` and require admin role.

## 3. API Conventions

- Base URL: `https://api.reviewhelm.com/api/v1`
- Timestamp format: ISO 8601 UTC (`2026-03-05T12:34:56.000Z`)
- ID format: UUID v4 unless otherwise noted
- Pagination:
  - query: `limit` (default 20, max 100), `cursor` (opaque)
  - response: `nextCursor` nullable string
- Currency: USD

## 4. Standard Error Contract

All non-2xx responses use:

```json
{
  "error": {
    "code": "string",
    "message": "Human readable summary",
    "details": {},
    "requestId": "uuid"
  }
}
```

Common `error.code` values:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `BUDGET_EXCEEDED`
- `COOLDOWN_ACTIVE`
- `CONFLICT`
- `UPSTREAM_AI_ERROR`
- `INTERNAL_ERROR`

## 5. Shared Domain Types

### 5.1 Enums

- `StackId`:
  - `java-protobuf`
  - `js-ts-react-node`
  - `go`
  - `terraform-hcl`
  - `swift-objc`
  - `web-devops-config`
  - `python`
  - `ruby`
  - `lua`
  - `c-lang`
- `ChecklistMode`: `review` | `polish`
- `Severity`: `blocker` | `major` | `minor` | `nit`
- `Verdict`: `looks-good` | `needs-attention` | `na` | `skipped`
- `ConfidenceLevel`: `1` | `2` | `3` | `4` | `5`
- `ClaudeModel`: `haiku` | `sonnet` | `opus`
- `TutorRole`:
  - `concept-explainer`
  - `qa`
  - `comment-drafter`
  - `exercise-generator`
  - `anti-bias-challenger`
- `AiFeature`: `learn` | `deep-dive` | `comment-drafter`

### 5.2 Checklist Shape (response)

```json
{
  "meta": {
    "id": "go",
    "mode": "review",
    "title": "Go",
    "shortTitle": "Go",
    "description": "Go services and libraries",
    "icon": "🐹",
    "totalItems": 176,
    "version": "2.0.0"
  },
  "sections": []
}
```

### 5.3 Session Shape (response)

```json
{
  "id": "uuid",
  "mode": "review",
  "stackId": "go",
  "title": "Review - 3/5/2026",
  "itemResponses": {
    "go.some.item": {
      "verdict": "needs-attention",
      "confidence": 2,
      "notes": "...",
      "draftedComment": "..."
    }
  },
  "sessionNotes": "...",
  "createdAt": "2026-03-05T12:00:00.000Z",
  "updatedAt": "2026-03-05T12:10:00.000Z",
  "completedAt": null,
  "isComplete": false
}
```

## 6. Health Endpoints (Authenticated)

- `GET /health`
- Auth: required
- Response `200`:

```json
{
  "ok": true,
  "service": "reviewhelm-api",
  "version": "1.0.0",
  "time": "2026-03-05T12:00:00.000Z"
}
```

## 7. User and Preferences Endpoints

### 7.1 Get Current User

- `GET /me`
- Auth: required
- Response `200`:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Kaitlin",
  "createdAt": "2026-03-05T12:00:00.000Z"
}
```

### 7.2 Get Preferences

- `GET /me/preferences`
- Auth: required
- Response `200`:

```json
{
  "aiModel": "sonnet",
  "defaultSeverityFilter": ["blocker", "major", "minor", "nit"],
  "antiBiasMode": true,
  "fontSize": "medium",
  "codeBlockTheme": "dark",
  "autoExportPdf": false
}
```

### 7.3 Update Preferences

- `PATCH /me/preferences`
- Auth: required
- Request body (partial allowed):

```json
{
  "aiModel": "opus",
  "fontSize": "large",
  "autoExportPdf": true
}
```

- Response `200`: updated preferences object

### 7.4 Anthropic Key Status

- `GET /me/api-keys/anthropic`
- Auth: required
- Response `200`:

```json
{
  "configured": true,
  "tokenHint": "atk_ab12cd...89ef",
  "updatedAt": "2026-03-05T12:00:00.000Z",
  "keySource": "byok",
  "keyVersion": 2
}
```

### 7.5 Upsert Anthropic Key

- `PUT /me/api-keys/anthropic`
- Auth: required
- Request:

```json
{
  "apiKey": "<anthropic_api_key_value>"
}
```

- Behavior:
  - server encrypts using envelope encryption
  - stores ciphertext only
  - plaintext never persisted
- Response `204`

### 7.6 Delete Anthropic Key

- `DELETE /me/api-keys/anthropic`
- Auth: required
- Response `204`

## 8. Checklist Endpoints

### 8.1 List Available Checklists

- `GET /checklists`
- Auth: required
- Response `200`:

```json
{
  "items": [
    {
      "id": "go",
      "mode": "review",
      "title": "Go",
      "shortTitle": "Go",
      "version": "2.0.0",
      "totalItems": 176
    },
    {
      "id": "polish-my-pr",
      "mode": "polish",
      "title": "Polish My PR",
      "shortTitle": "Polish",
      "version": "2.0.0",
      "totalItems": 43
    }
  ]
}
```

### 8.2 Get Global Checklist Version Snapshot

- `GET /checklists/version`
- Auth: required
- Response `200`:

```json
{
  "latestVersion": "2.0.0",
  "byId": {
    "go": "2.0.0",
    "java-protobuf": "2.0.0",
    "polish-my-pr": "2.0.0"
  }
}
```

### 8.3 Get Checklist By ID

- `GET /checklists/:id`
- Auth: required
- Path `id`: checklist id (`go`, `python`, `polish-my-pr`, etc.)
- Response `200`: checklist object (see shared shape)

## 9. Session Endpoints

### 9.1 Create Session

- `POST /sessions`
- Auth: required
- Request:

```json
{
  "mode": "review",
  "stackId": "go",
  "title": "Optional custom title"
}
```

- Validation:
  - `stackId` required when `mode=review`
  - `stackId` must be omitted for `mode=polish`
- Response `201`: session object

### 9.2 List Sessions

- `GET /sessions?mode=review&stackId=go&status=active&limit=20&cursor=...`
- Auth: required
- Query:
  - `mode` optional
  - `stackId` optional
  - `status` optional: `active|completed|all` (default `all`)
- Response `200`:

```json
{
  "items": [],
  "nextCursor": null
}
```

### 9.3 Get Session

- `GET /sessions/:sessionId`
- Auth: required
- Response `200`: session object

### 9.4 Rename Session

- `PATCH /sessions/:sessionId`
- Auth: required
- Request:

```json
{
  "title": "Sprint 42 - API cleanup"
}
```

- Response `200`: session object

### 9.5 Upsert Item Response

- `PATCH /sessions/:sessionId/items/:itemId`
- Auth: required
- Request (partial allowed):

```json
{
  "verdict": "needs-attention",
  "confidence": 2,
  "notes": "nil check missing",
  "draftedComment": "Could we guard against nil here?"
}
```

- Response `200`: item response

### 9.6 Update Session Notes

- `PATCH /sessions/:sessionId/notes`
- Auth: required
- Request:

```json
{
  "sessionNotes": "Need to revisit concurrency section"
}
```

- Response `200`:

```json
{
  "sessionId": "uuid",
  "sessionNotes": "Need to revisit concurrency section",
  "updatedAt": "2026-03-05T12:00:00.000Z"
}
```

### 9.7 Complete Session

- `POST /sessions/:sessionId/complete`
- Auth: required
- Request:

```json
{
  "confirmLowCoverage": true
}
```

- Behavior:
  - idempotent
  - if already complete, returns existing completion timestamp
- Response `200`:

```json
{
  "sessionId": "uuid",
  "completedAt": "2026-03-05T12:00:00.000Z",
  "isComplete": true
}
```

### 9.8 Delete Session

- `DELETE /sessions/:sessionId`
- Auth: required
- Response `204`

### 9.9 Session Summary

- `GET /sessions/:sessionId/summary`
- Auth: required
- Response `200`:

```json
{
  "scores": {
    "coverage": 74,
    "confidence": 63,
    "issuesBySeverity": {
      "blocker": 1,
      "major": 3,
      "minor": 5,
      "nit": 2
    },
    "totalIssues": 11,
    "itemsResponded": 42,
    "applicableItems": 57
  },
  "lowConfidenceItems": [],
  "sessionUsage": {
    "calls": 7,
    "inputTokens": 14500,
    "outputTokens": 9200,
    "costUsd": 0.87,
    "byFeature": [
      {
        "feature": "deep-dive",
        "calls": 4,
        "inputTokens": 9200,
        "outputTokens": 5000,
        "costUsd": 0.51
      }
    ]
  }
}
```

## 10. Gaps and Learning Endpoints

### 10.1 Get Gaps

- `GET /gaps?stackId=go&limit=20`
- Auth: required
- Response `200`:

```json
{
  "active": [],
  "improving": [],
  "strong": []
}
```

Each item includes:

```json
{
  "itemId": "go.error-handling.check-errors",
  "stackId": "go",
  "sectionId": "error-handling",
  "severity": "major",
  "currentConfidence": 2,
  "averageConfidence": 2.3,
  "trend": "declining",
  "learningPriority": 12.2,
  "ratingsCount": 3
}
```

### 10.2 Learning Queue

- `GET /learn/queue?stackId=go&limit=20`
- Auth: required
- `stackId=all` is allowed
- Response `200`:

```json
{
  "items": []
}
```

## 11. AI Endpoints

### 11.1 Tutor Message (Primary AI Endpoint)

- `POST /ai/tutor`
- Auth: required
- Request:

```json
{
  "sessionId": "uuid",
  "feature": "deep-dive",
  "model": "opus",
  "role": "qa",
  "itemId": "go.error-handling.check-errors",
  "itemText": "Are all errors checked and handled?",
  "stackLabel": "Go",
  "confidence": 2,
  "messages": [
    { "role": "user", "content": "Explain why this matters." }
  ],
  "allowResponseCache": true
}
```

- `model` is optional:
  - default = `haiku` when `feature=comment-drafter`
  - default = `sonnet` for other features
- Additional optional fields:
  - `allowEscalation` (default true)
  - `diffId`
  - `diffText`
  - `commentStyleProfileId`
- Escalation policy:
  - For `comment-drafter`, if model is Haiku and quality heuristics are weak, server may auto-escalate to Sonnet.

- Server behavior (required):
  - enforces cooldown
  - enforces hard budget stop
  - auto-downgrades model near budget threshold
  - caches deterministic repeated requests when eligible
  - records usage by user/day/session/feature/model
- Response `200`:

```json
{
  "content": "...",
  "requestedModel": "opus",
  "resolvedModel": "sonnet",
  "autoDowngraded": true,
  "autoEscalated": false,
  "cached": false,
  "inputTokens": 1200,
  "outputTokens": 500,
  "costUsd": 0.07,
  "cooldownRemainingMs": 0
}
```

- Error cases:
  - `429 RATE_LIMITED`
  - `409 COOLDOWN_ACTIVE`
  - `402 BUDGET_EXCEEDED`
- `502 UPSTREAM_AI_ERROR`

## 11.2 Diff Intake Endpoints (Optional Grounding Input)

- `POST /diffs` (paste diff text)
- `POST /diffs/upload` (upload patch/diff file)
- `GET /diffs/:diffId` (retrieve stored diff)
- Auth: required
- Purpose: provide optional grounding context for comment drafting.

## 11.3 Comment Style Profiles

- `GET /comment-profiles`
- `POST /comment-profiles`
- `PATCH /comment-profiles/:profileId`
- `DELETE /comment-profiles/:profileId`
- `POST /comment-profiles/:profileId/activate`
- Auth: required
- Purpose: configure reusable drafting tone/strictness profile.

## 11.4 Personal Calibration Endpoints

- `POST /calibration/feedback`
- `GET /calibration/summary`
- Auth: required
- Purpose: learn from accepted/edited/rejected outputs to tune future drafting guidance.

## 11.5 Risk Heatmap

- `GET /risk/sessions/:sessionId/heatmap`
- Auth: required
- Optional query: `diffId`
- Purpose: compute section/file risk signal for reviewed sessions.

## 11.6 Compliance Packs

- `GET /compliance/packs`
- `GET /compliance/packs/:packId`
- Auth: required
- Purpose: provide structured control packs (OWASP API, Terraform guardrails, SOC2 change control).

## 12. Usage and Budget Endpoints

### 12.1 Usage Summary

- `GET /usage/summary?month=2026-03`
- Auth: required
- Response `200`:

```json
{
  "month": "2026-03",
  "calls": 42,
  "inputTokens": 84000,
  "outputTokens": 53000,
  "estimatedCostUsd": 4.23,
  "officialCostUsd": 4.11,
  "todayCalls": 3
}
```

### 12.2 Usage By Feature

- `GET /usage/by-feature?month=2026-03`
- Auth: required
- Response `200`:

```json
{
  "items": [
    {
      "feature": "learn",
      "calls": 11,
      "inputTokens": 24000,
      "outputTokens": 13000,
      "costUsd": 1.12
    }
  ]
}
```

### 12.3 Usage By Session

- `GET /usage/sessions/:sessionId`
- Auth: required
- Response `200`:

```json
{
  "calls": 7,
  "inputTokens": 14500,
  "outputTokens": 9200,
  "costUsd": 0.87,
  "byFeature": []
}
```

### 12.4 Budget Config

- `GET /usage/budget`
- Auth: required
- Response `200`:

```json
{
  "monthlyBudgetUsd": 40,
  "alertThresholds": [70, 85, 95],
  "hardStopAtBudget": false,
  "autoDowngradeNearBudget": true,
  "autoDowngradeThresholdPct": 85,
  "cooldownSeconds": 6,
  "lastAlertThreshold": 70
}
```

- `PATCH /usage/budget`
- Auth: required
- Request (partial allowed):

```json
{
  "monthlyBudgetUsd": 25,
  "hardStopAtBudget": true,
  "autoDowngradeNearBudget": true,
  "autoDowngradeThresholdPct": 80,
  "cooldownSeconds": 8,
  "alertThresholds": [60, 80, 95]
}
```

- Response `200`: updated budget config

### 12.5 Reset Usage

- `POST /usage/reset`
- Auth: required
- Response `204`

## 13. Export and Backup Endpoints

### 13.1 Export Session PDF

- `POST /exports/sessions/:sessionId/pdf`
- Auth: required
- Response `200`:

```json
{
  "url": "https://...signed-url...",
  "expiresAt": "2026-03-05T12:30:00.000Z"
}
```

### 13.2 Export User Backup

- `POST /backups/export`
- Auth: required
- Response `200`:

```json
{
  "url": "https://...signed-url...",
  "expiresAt": "2026-03-05T12:30:00.000Z",
  "version": 1
}
```

### 13.3 Import User Backup

- `POST /backups/import`
- Auth: required
- Request:

```json
{
  "sourceUrl": "https://..."
}
```

- Response `202`:

```json
{
  "jobId": "uuid",
  "status": "queued"
}
```

## 14. Admin Endpoints (Optional but Recommended)

### 14.1 Publish Checklist Versions

- `POST /admin/checklists/publish`
- Auth: admin only
- Request:

```json
{
  "version": "2.1.0",
  "byId": {
    "go": "2.1.0",
    "python": "2.1.0"
  }
}
```

- Response `200`:

```json
{
  "ok": true,
  "publishedAt": "2026-03-05T12:00:00.000Z"
}
```

### 14.2 Rotate Provider Key Wrapping Version

- `POST /admin/security/rotate-provider-keys`
- Auth: admin only
- Request (optional):

```json
{
  "provider": "anthropic",
  "dryRun": false
}
```

- Response `200`:

```json
{
  "currentVersion": 2,
  "scanned": 120,
  "rotated": 119,
  "failed": 1
}
```

### 14.3 CI Policy Gate Hook

- `POST /admin/ci/policy-check`
- Auth: admin only
- Purpose: evaluate session quality thresholds for CI gating.

### 14.4 Retention Policy and Cleanup

- `GET /admin/maintenance/policy`
- `POST /admin/maintenance/cleanup`
- Auth: admin only
- Purpose: expose retention policy and run cleanup for old diff artifacts, calibration feedback, and audit logs.

## 15. Rate Limits and Idempotency

- Default authenticated limit: 120 requests/minute/user
- AI endpoint limit: 20 requests/minute/user
- `POST /sessions/:sessionId/complete` is idempotent
- Optional idempotency header for mutating endpoints:
  - `Idempotency-Key: <uuid>`

## 16. Audit and Security Requirements

- Log all auth failures, key writes/deletes, budget changes, and AI request metadata.
- Never log:
  - raw Anthropic API keys
  - full OAuth tokens
  - full message content when privacy mode is enabled
- Encrypt at rest (DB managed encryption) plus application-level encryption for provider keys.
- Add key rotation policy:
  - rotate KEK every 90 days
  - rewrap DEKs asynchronously

## 17. OpenAPI Deliverable Requirement

This contract must be emitted as OpenAPI 3.1 from the NestJS codebase.

- Canonical artifact path: `docs/openapi.yaml`
- CI check:
  - fail if runtime DTOs and `openapi.yaml` drift
  - fail if undocumented endpoint is added
