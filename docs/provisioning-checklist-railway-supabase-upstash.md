# ReviewHelm Provisioning Checklist (Railway + Supabase + Upstash)

This checklist provisions the lowest-cost secure stack for the backend API.

## 1. Architecture (Final)

- API host: Railway (Hobby)
- DB + OAuth auth: Supabase (Postgres + Auth)
- Redis cache/rate limit/cooldown: Upstash Redis
- Secret custody:
  - Application secrets in Railway service variables
  - `KEY_ENCRYPTION_MASTER_KEY` sourced from a vault product (HCP Vault or Infisical)

## 2. Prerequisites

- GitHub repo connected to Railway
- Supabase account
- Upstash account
- Vault account (HCP Vault or Infisical)
- Android app redirect URI plan for OAuth PKCE

## 3. Supabase Setup

## 3.1 Create project

1. Create Supabase project in region closest to users.
2. Save:
- Project ref
- DB password
- Project URL

## 3.2 Enable OAuth providers (now, not later)

In **Supabase Dashboard -> Authentication -> Providers**:

1. Enable Google OAuth
2. Enable GitHub OAuth (optional but recommended)
3. Add redirect URIs:
- Expo dev: `exp://127.0.0.1:19000/--/auth/callback`
- Custom scheme production example: `reviewhelm://auth/callback`

## 3.3 Collect Supabase values

From Supabase project settings, collect:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL` (usually `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
- `SUPABASE_JWT_ISSUER` (usually `{SUPABASE_URL}/auth/v1`)
- `SUPABASE_JWT_AUDIENCE` (`authenticated` unless customized)

## 3.4 Database URLs for Prisma

From Supabase **Connect** section:

- `DATABASE_URL` = pooled connection (port 6543) for runtime
- `DIRECT_URL` = direct Postgres (port 5432) for migrations

## 4. Upstash Redis Setup

1. Create Redis database (free tier is fine for one user).
2. Copy:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 5. Vault Setup (for KEK)

Use either HCP Vault or Infisical.

1. Create a project/env secret named `KEY_ENCRYPTION_MASTER_KEY`.
2. Generate a random 32+ char secret.
3. Do not store this value in git or local plaintext docs.

Example generation:

```bash
openssl rand -base64 48
```

## 6. Railway Setup

## 6.1 Create service

1. In Railway, create a new service from this repo.
2. Set root directory to `backend`.
3. Confirm `railway.json` is detected.

## 6.2 Add environment variables

Set these in Railway service variables:

```bash
NODE_ENV=production
PORT=3000
API_BASE_PATH=api/v1
API_PUBLIC_URL=https://YOUR_RAILWAY_DOMAIN
APP_VERSION=0.1.0

SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_JWKS_URL=https://YOUR_PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://YOUR_PROJECT_REF.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME

DATABASE_URL=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres

UPSTASH_REDIS_REST_URL=https://YOUR_INSTANCE.upstash.io
UPSTASH_REDIS_REST_TOKEN=REPLACE_ME
HAIKU_INPUT_COST_PER_MILLION_USD=1
HAIKU_OUTPUT_COST_PER_MILLION_USD=5
SONNET_INPUT_COST_PER_MILLION_USD=3
SONNET_OUTPUT_COST_PER_MILLION_USD=15
OPUS_INPUT_COST_PER_MILLION_USD=15
OPUS_OUTPUT_COST_PER_MILLION_USD=75

KEY_ENCRYPTION_MASTER_KEY=REPLACE_ME
ALLOWED_ORIGINS=reviewhelm://auth/callback,exp://127.0.0.1:19000
```

## 6.3 Deploy checks

After deploy:

1. `GET https://YOUR_RAILWAY_DOMAIN/api/v1/health` with `Authorization: Bearer <supabase_jwt>` should return `ok: true`
2. `GET https://YOUR_RAILWAY_DOMAIN/api/v1/health/ready` with JWT should return DB/Redis readiness
3. Keep `ENABLE_SWAGGER_DOCS=false` in production

## 7. Prisma Setup and Migrations

Run locally from repo root:

```bash
cd backend
cp .env.example .env
# Fill .env with real values
npm install
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

For production migrations in Railway, run via a release command or CI job:

```bash
npm run prisma:migrate:deploy
```

## 8. OAuth Mobile App Wiring (Expo Android)

1. Configure Supabase client in app with project URL + anon key.
2. Use PKCE flow with redirect URI:
- `reviewhelm://auth/callback`
3. After login, include access token in API calls:

```http
Authorization: Bearer <supabase_access_token>
```

## 9. Security Controls Checklist

- [ ] Service role key only on backend, never shipped to app
- [ ] `KEY_ENCRYPTION_MASTER_KEY` stored in vault, not in repo
- [ ] Provider API keys encrypted before DB storage
- [ ] JWT verified against Supabase JWKS
- [ ] CORS restricted to known origins/schemes
- [ ] Rate limit + cooldown backed by Upstash
- [ ] Audit logs for key write/delete and budget config changes

## 10. Cost Guardrails (Single User)

- Railway Hobby plan
- Supabase free tier to start
- Upstash free tier
- Alerts:
  - Railway spend alert
  - Supabase usage alert
  - Upstash usage alert

## 11. Post-Provisioning Next Steps

1. Run `npm run prisma:migrate:deploy` in production.
2. Configure app with Supabase OAuth PKCE and API base URL.
3. Validate OpenAPI drift check and security workflow in CI on PR.
4. Add uptime monitoring that includes OAuth token injection for health checks.
