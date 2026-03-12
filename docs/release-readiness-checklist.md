# ReviewHelm Release Readiness Checklist

Use this checklist before opening the app beyond a single-user test.

## 1. Deployment Stability (Must Pass)

- [ ] Production web app URL is reachable over HTTPS and serves the expected app build.
- [ ] Staging API is reachable for 24h without repeated `502` from the public Railway domain.
- [ ] `GET /` returns `200` on staging.
- [ ] `GET /api/v1/health` returns `200` on staging.
- [ ] `GET /api/v1/health/ready` returns `ok: true` with both checks healthy.
- [ ] Railway healthcheck path is explicitly set to `/` (or `/api/v1/health`).
- [ ] Railway listener target port matches app runtime listen port in logs.
- [x] Railway deploy runs `npm run env:check` before app start (configured in `railway.json`).
- [ ] Railway restart count is stable (no crash loop after startup).
- [ ] Production web deploy is repeatable from CI or a documented build/deploy command, not manual local state.
- [ ] DNS, TLS certificate issuance, and custom domain routing are verified for the production web host.

## 2. Environment and Secrets (Must Pass)

- [ ] All required env vars exist in Infisical staging and production environments.
- [ ] All required env vars are synced into Railway staging and production services.
- [ ] `DATABASE_URL` and `DIRECT_URL` are valid Postgres URLs and unquoted.
- [ ] `API_PUBLIC_URL` matches the active Railway public domain exactly.
- [ ] `ALLOWED_ORIGINS` is explicitly set for staging and production.
- [ ] `ALLOWED_ORIGINS` contains the exact production web origin and no broader wildcard than intended.
- [ ] `STRICT_STARTUP_CHECKS=true` in production.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is present when backend admin operations require it.
- [x] No secrets are committed to git or stored in plaintext local files (`.env.local` is gitignored).
- [ ] Stripe live keys (not test keys) configured in production.
- [ ] `ANTHROPIC_API_KEY` is configured from Infisical in staging and production.
- [ ] `EXPO_PUBLIC_API_BASE_URL` points to the production API URL for the web build.
- [ ] `EXPO_PUBLIC_SUPABASE_URL` points to the production Supabase project.
- [ ] `EXPO_PUBLIC_AUTH_REDIRECT_URI` is set to the production web auth callback URL.
- [ ] Supabase Site URL is set to the production web origin.
- [ ] Supabase redirect URL allowlist includes all required production web auth/reset callback URLs.
- [ ] Stripe live success, cancel, and portal return URLs point to the production web origin.
- [ ] Stripe live webhook secret is configured in production and matches the live endpoint.

## 3. Data Safety and Recovery (Must Pass)

- [ ] Supabase backups/PITR are enabled.
- [ ] Restore drill is tested at least once in staging.
- [ ] Restore drill verifies both database recovery and the application's ability to boot against restored data.
- [x] Migration flow is documented and repeatable (`prisma migrate deploy` via Infisical).
- [ ] Retention cleanup policy is reviewed for `diff`, `calibration`, and `audit` data.

## 4. Security Baseline (Must Pass)

- [ ] OAuth providers (Google and GitHub) are configured and tested for staging + prod.
- [x] JWT validation against Supabase JWKS is implemented (RS256, issuer/audience/age checks, audit logging on failure).
- [ ] JWT validation is confirmed working in staging.
- [ ] Rate limit and cooldown behavior is verified under burst traffic.
- [ ] Anthropic API key is valid in staging and production, and AI requests succeed without fallback/manual key configuration.
- [ ] Admin access list (`ADMIN_USER_IDS`) is set and reviewed.
- [x] Swagger production controls are implemented (`ENABLE_SWAGGER_DOCS`, IP allowlisting).
- [ ] `ENABLE_SWAGGER_DOCS=false` is confirmed in production env.
- [x] Security headers are set (CSP, HSTS, X-Frame-Options, COEP, COOP, Permissions-Policy).
- [ ] Final CSP is validated in production web host responses with no unexpected inline/script/style violations.
- [x] CORS origin validation is implemented with `ALLOWED_ORIGINS` enforcement.
- [x] Global IP rate limiting is implemented (Redis-backed, configurable per-minute limit).
- [x] Per-user API and AI rate limits are implemented with cooldown support.
- [x] Input validation is enforced globally (ValidationPipe with whitelist + forbidNonWhitelisted).

## 5. Observability and Ops (Must Pass)

- [ ] External error monitoring is configured (Sentry, Datadog, or equivalent).
- [ ] Frontend web crash/error reporting is configured and verified from a production-like build.
- [ ] Uptime checks exist for both the web app origin and the API health endpoint.
- [ ] Alerts exist for API downtime, repeated 5xx spikes, and Railway restart loops.
- [ ] Alerts exist for Supabase and Upstash quota/usage thresholds.
- [ ] Alerts exist for Stripe webhook delivery failures or sustained webhook signature errors.
- [x] Structured JSON logging is implemented for all HTTP requests (method, path, status, duration, userId, deviceId).
- [x] Audit logging is implemented for security events (auth failures, rate limits, budget blocks).
- [x] Process signal logging is implemented (uncaughtException, unhandledRejection, SIGTERM, SIGINT).
- [ ] Log aggregation is configured (CloudWatch, Datadog, or equivalent) so logs are retained and searchable.
- [ ] Deploy notifications and incident ownership are defined for failed production deploys.
- [ ] Runbook exists for top incidents:
  - [ ] API returns `502`.
  - [ ] DB connection/auth errors.
  - [ ] Redis unavailable.
  - [ ] OAuth provider misconfiguration.
  - [ ] Web app deploy is broken or serving stale assets.
  - [ ] Stripe live checkout/webhook failures.

## 6. Web App Readiness (Must Pass for Web Launch)

- [x] Web platform is configured (Metro bundler, react-native-web, Expo Router).
- [x] Responsive layout with desktop breakpoint detection (`useResponsive`, `DesktopContainer`).
- [x] Platform-specific fallbacks are handled (alerts, storage, device ID, SSL pinning).
- [x] Supabase auth detects web session in URL (`detectSessionInUrl: Platform.OS === 'web'`).
- [x] Payment flow is web-compatible (Stripe redirect URLs use `window.location.origin`).
- [x] Legal pages exist (Terms of Use at `/terms`, Privacy Policy at `/privacy`).
- [x] CSP headers configured in `app/+html.tsx` (includes Stripe iframe support).
- [ ] OG meta tags added to `app/+html.tsx` (`og:title`, `og:description`, `og:image`).
- [ ] `<title>` and `<meta name="description">` tags added to HTML head.
- [ ] Favicon verified at production URL.
- [ ] `robots.txt` and indexing strategy are intentionally configured for launch stage (public launch vs private beta).
- [ ] Email verification flow tested end-to-end on web.
- [ ] Password reset flow tested end-to-end on web.
- [ ] Signed-out, expired-session, and refresh-failure flows tested on web.
- [ ] Supabase email templates are customized (not default Supabase branding).
- [ ] Browser QA completed on latest Chrome, Safari, and Firefox.
- [ ] Mobile browser QA completed for iPhone Safari and Android Chrome form factors.
- [ ] Production Stripe checkout and customer portal flows are tested in live mode or a production-like cutover rehearsal.

## 7. Data Privacy and Compliance (Must Pass)

- [x] Privacy policy documents data storage, payment handling, and AI data usage.
- [x] Terms of use cover subscriptions, trials, AI credits, and liability.
- [ ] Full account data export endpoint exists (GDPR Article 20 portability).
- [ ] Account deletion flow removes all user data from database.
- [x] User backup/restore is implemented with HMAC signing and timestamp validation.
- [x] AI prompts are sent to Anthropic API but not logged or stored (documented in privacy policy).

## 8. Performance and Scale Gates (Before Broader Rollout)

- [ ] Smoke load test passes at expected near-term concurrency.
- [ ] P95 latency and error rate are recorded for baseline endpoints.
- [ ] First-load web performance baseline is recorded for the landing/login/app shell on desktop and mobile browsers.
- [x] AI cost guardrails are implemented (BudgetGuard, auto-downgrade Opus to Sonnet, hard stop).
- [ ] AI cost guardrails are validated against real usage patterns.
- [ ] Capacity plan exists for next user milestone (10, 50, 100 users).
- [ ] Multi-device sync conflict strategy is reviewed for broader rollout; decide whether the current merge heuristics are sufficient or whether sessions/PRs need an operation-log or CRDT-based model before launch expansion.

## 9. Release Process Controls (Before Broader Rollout)

- [x] Every PR passes typecheck, tests, OpenAPI checks, and secret scan in CI.
- [ ] Automated deployment pipeline exists (CI to Railway).
- [ ] Web app deployment path and promotion process are documented for staging -> production.
- [ ] Staging deploy is verified before production deploy.
- [ ] Rollback procedure is documented and tested.
- [ ] Rollback includes both API rollback and web asset rollback / cache invalidation steps.
- [ ] Release checklist sign-off is required before production promotion.

## 10. Testing Coverage (Before Broader Rollout)

- [x] Backend test suites exist (auth, rate limiting, Stripe webhooks, AI service, budget guards).
- [x] Frontend unit tests exist (device ID, URL security).
- [ ] Integration tests cover critical user flows (signup, login, session create, sync).
- [ ] Web-specific e2e tests cover auth callback, payment redirect, and session persistence.

## 11. Suggested Rollout Stages

- Stage 0: single-user internal (current).
- Stage 1: web-only soft launch, 5-10 trusted testers for 1 week.
- Stage 2: 25-50 users with daily monitoring review.
- Stage 3: broader rollout after two stable weeks with no Sev-1 incidents.
- Stage 4: iOS and Android app store submissions after web is stable.
