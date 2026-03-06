# ReviewHelm Backend Accounts and Keys

This is the full backend account/key checklist to prepare before turning on production resources.

## Required Accounts

1. Supabase
- Purpose: Postgres database + OAuth2 auth (PKCE) + JWKS for JWT verification
- Needed values:
  - `SUPABASE_URL`
  - `SUPABASE_JWKS_URL`
  - `SUPABASE_JWT_ISSUER`
  - `SUPABASE_JWT_AUDIENCE`
  - `SUPABASE_SERVICE_ROLE_KEY` (backend only)
  - `DATABASE_URL`
  - `DIRECT_URL`

2. Railway
- Purpose: host NestJS backend API
- Needed values:
  - `API_PUBLIC_URL`
  - all backend env vars from `.env.example`

3. Upstash Redis
- Purpose: AI cooldown, API/AI rate limiting, AI response caching
- Needed values:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

4. Anthropic (for BYOK users)
- Purpose: model inference for tutor/learn/comment drafting
- Needed values:
  - user-managed Anthropic API key (stored encrypted via `/me/api-keys/anthropic`)

## Secrets Custody (Required)

You need one of these options for key encryption master material:

1. Vault-managed secret (recommended baseline)
- HCP Vault or Infisical
- Needed value:
  - `KEY_ENCRYPTION_MASTER_KEY` (32+ chars)

2. AWS KMS envelope mode (recommended when ready)
- Keep vault secret flow for fallback and rotations
- Needed values:
  - `KEY_ENCRYPTION_PROVIDER=aws_kms`
  - `AWS_REGION`
  - `AWS_KMS_KEY_ID`

## Optional but Recommended

1. Uptime monitor
- Monitor:
  - `GET /`
  - `GET /api/v1/health`
  - `GET /api/v1/health/ready`

2. Error monitoring (Sentry)
- For backend runtime exception tracking and alerting.

## Private-Only API Posture

- All business/data routes are auth-protected (OAuth2 JWT required).
- Public liveness/readiness routes exist for platform probes only.
- Swagger should remain disabled in production (`ENABLE_SWAGGER_DOCS=false`).
- For stricter app-only access, add app attestation at the edge (Play Integrity/App Check) in front of OAuth2.
