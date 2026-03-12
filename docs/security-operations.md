# ReviewHelm Security Operations Baseline

## Implemented Controls
- JWT validation against Supabase JWKS (local verification, no per-request auth roundtrip).
- Platform Anthropic API key managed via `PLATFORM_ANTHROPIC_KEY` env var in Infisical.
- Global API and AI rate limiting + AI cooldown.
- Server-side budget guard with hard stop and auto-downgrade policy.
- AI model support and usage accounting for Haiku/Sonnet/Opus with feature-level defaults.
- Audit events for auth failures, rate-limit/cooldown blocks, and budget events.
- Readiness health check (`GET /api/v1/health/ready`) with DB and Redis probes.
- Admin cleanup controls for retention-managed datasets (`/api/v1/admin/maintenance/*`).
- CI workflow for typecheck, Prisma validation, dependency audit, and secret scanning.

## Required Runtime Setup
- Set `PLATFORM_ANTHROPIC_KEY` in Infisical (vault-managed, never committed to git).
- Set `ADMIN_USER_IDS` for allowed security admins.
- Keep Swagger docs disabled in production (`ENABLE_SWAGGER_DOCS=false`).
- Keep public liveness/readiness endpoints monitored:
  - `GET /`
  - `GET /api/v1/health`
  - `GET /api/v1/health/ready`
- Run backend preflight (`npm run preflight`) before production cutovers.

## Backup and Downtime Safeguards
- Enable Supabase PITR backups and verify restore ability monthly.
- Monitor `health` and `health/ready` endpoints via uptime checks.
- Alert on repeated `auth_failed`, `rate_limited`, and `budget_blocked_request` audit events.
- Keep Railway deployment on zero-downtime rollout and set process-level restart policy.
