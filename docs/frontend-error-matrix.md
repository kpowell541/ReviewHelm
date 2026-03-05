# Frontend Error Matrix

Use this mapping for UX and retry behavior.

| HTTP | Code | Where | Frontend behavior |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Any mutating endpoint | Show field-level validation and keep form state |
| 401 | `UNAUTHORIZED` | All | Refresh login token; redirect to sign-in if refresh fails |
| 403 | `FORBIDDEN` | Admin routes | Show authorization error screen |
| 404 | `NOT_FOUND` | Resource routes | Show missing/deleted state and navigation fallback |
| 402 | `BUDGET_EXCEEDED` | `POST /ai/tutor` | Show budget warning with settings deep-link |
| 409 | `COOLDOWN_ACTIVE` | `POST /ai/tutor` | Disable send briefly and show countdown |
| 429 | `RATE_LIMITED` | API + AI routes | Exponential backoff and retry button |
| 502 | `UPSTREAM_AI_ERROR` | `POST /ai/tutor` | Offer retry and non-AI fallback actions |
| 500 | `INTERNAL_ERROR` | Any | Generic failure UI + report request id |

## Parsing

- Always parse `error.code`, `error.message`, `error.requestId`.
- Surface `requestId` in debug/error detail UI.
