# ReviewHelm Release Readiness Checklist

Use this checklist before opening the app beyond a single-user test.

## 1. Deployment Stability (Must Pass)

- [ ] Staging API is reachable for 24h without repeated `502` from the public Railway domain.
- [ ] `GET /` returns `200` on staging.
- [ ] `GET /api/v1/health` returns `200` on staging.
- [ ] `GET /api/v1/health/ready` returns `ok: true` with both checks healthy.
- [ ] Railway healthcheck path is explicitly set to `/` (or `/api/v1/health`).
- [ ] Railway deploy logs show `Environment check passed` before app start.
- [ ] Railway restart count is stable (no crash loop after startup).

## 2. Environment and Secrets (Must Pass)

- [ ] All required env vars exist in Infisical staging and production environments.
- [ ] All required env vars are synced into Railway staging and production services.
- [ ] `DATABASE_URL` and `DIRECT_URL` are valid Postgres URLs and unquoted.
- [ ] `API_PUBLIC_URL` matches the active Railway public domain exactly.
- [ ] `ALLOWED_ORIGINS` is explicitly set for staging and production.
- [ ] `STRICT_STARTUP_CHECKS=true` in production.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is present when backend admin operations require it.
- [ ] No secrets are committed to git or stored in plaintext local files.

## 3. Data Safety and Recovery (Must Pass)

- [ ] Supabase backups/PITR are enabled.
- [ ] Restore drill is tested at least once in staging.
- [ ] Migration flow is documented and repeatable (`prisma migrate deploy`).
- [ ] Retention cleanup policy is reviewed for `diff`, `calibration`, and `audit` data.

## 4. Security Baseline (Must Pass)

- [ ] OAuth providers (Google and GitHub) are configured and tested for staging + prod.
- [ ] JWT validation against Supabase JWKS is confirmed in staging.
- [ ] Rate limit and cooldown behavior is verified under burst traffic.
- [ ] BYOK key encryption and key rotation endpoint are tested in staging.
- [ ] Admin access list (`ADMIN_USER_IDS`) is set and reviewed.
- [ ] Swagger is disabled in production (`ENABLE_SWAGGER_DOCS=false`).

## 5. Observability and Ops (Must Pass)

- [ ] Alerts exist for API downtime, repeated 5xx spikes, and Railway restart loops.
- [ ] Alerts exist for Supabase and Upstash quota/usage thresholds.
- [ ] Structured logs are retained long enough for incident analysis.
- [ ] Runbook exists for top incidents:
- [ ] API returns `502`.
- [ ] DB connection/auth errors.
- [ ] Redis unavailable.
- [ ] OAuth provider misconfiguration.

## 6. Performance and Scale Gates (Before Broader Rollout)

- [ ] Smoke load test passes at expected near-term concurrency.
- [ ] P95 latency and error rate are recorded for baseline endpoints.
- [ ] AI cost guardrails are validated against real usage patterns.
- [ ] Capacity plan exists for next user milestone (10, 50, 100 users).

## 7. Release Process Controls (Before Broader Rollout)

- [ ] Every backend PR passes typecheck, tests, OpenAPI checks, and secret scan.
- [ ] Staging deploy is verified before production deploy.
- [ ] Rollback procedure is documented and tested.
- [ ] Release checklist sign-off is required before production promotion.

## 8. Suggested Rollout Stages

- Stage 0: single-user internal (current).
- Stage 1: 5-10 trusted testers for 1 week.
- Stage 2: 25-50 users with daily monitoring review.
- Stage 3: broader rollout after two stable weeks with no Sev-1 incidents.
