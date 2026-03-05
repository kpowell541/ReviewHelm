# ReviewHelm Security Operations Baseline

## Implemented Controls
- JWT validation against Supabase JWKS (local verification, no per-request auth roundtrip).
- BYOK provider key storage with envelope encryption.
- KEK versioning and key rotation endpoint (`POST /api/v1/admin/security/rotate-provider-keys`).
- Global API and AI rate limiting + AI cooldown.
- Server-side budget guard with hard stop and auto-downgrade policy.
- AI model support and usage accounting for Haiku/Sonnet/Opus with feature-level defaults.
- Audit events for auth failures, rate-limit/cooldown blocks, budget events, and provider key lifecycle events.
- Readiness health check (`GET /api/v1/health/ready`) with DB and Redis probes.
- Admin cleanup controls for retention-managed datasets (`/api/v1/admin/maintenance/*`).
- CI workflow for typecheck, Prisma validation, dependency audit, and secret scanning.

## Required Runtime Setup
- Keep `KEY_ENCRYPTION_MASTER_KEY` and any legacy keys only in vault-managed environment variables.
- If using KMS mode, set:
  - `KEY_ENCRYPTION_PROVIDER=aws_kms`
  - `AWS_REGION`
  - `AWS_KMS_KEY_ID`
- Set `ADMIN_USER_IDS` for allowed security admins.
- Keep Swagger docs disabled in production (`ENABLE_SWAGGER_DOCS=false`).
- Health and readiness probes are authenticated; uptime checks must include OAuth bearer tokens.
- Run backend preflight (`npm run preflight`) before production cutovers.

## Rotation Procedure
1. Increase `KEY_ENCRYPTION_VERSION` in runtime secrets.
2. For local mode, place prior keys in `KEY_ENCRYPTION_MASTER_KEYS_JSON` while rotating.
3. Trigger dry run:
   - `POST /api/v1/admin/security/rotate-provider-keys` with `{ "dryRun": true }`
4. Trigger rotation:
   - `POST /api/v1/admin/security/rotate-provider-keys` with `{ "dryRun": false }`
5. Verify response counts (`rotated`, `failed`) and audit events.
6. Remove deprecated legacy key material after successful rotation.

## Backup and Downtime Safeguards
- Enable Supabase PITR backups and verify restore ability monthly.
- Monitor `health` and `health/ready` endpoints via uptime checks.
- Alert on repeated `auth_failed`, `rate_limited`, and `budget_blocked_request` audit events.
- Keep Railway deployment on zero-downtime rollout and set process-level restart policy.
