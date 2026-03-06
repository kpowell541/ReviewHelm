# ReviewHelm API Backend

NestJS + Prisma backend implementation of the ReviewHelm API contract.

## Stack

- NestJS (Express)
- Prisma ORM
- Supabase Postgres + Supabase Auth
- Upstash Redis (cooldown/rate limit/cache)

## Quick Start

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create local env file:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Start dev server:

```bash
npm run start:dev
```

## Available Endpoints

- `GET /api/v1/health` (authenticated)
- `GET /api/v1/health/ready` (authenticated)
- `GET/PATCH /api/v1/me/preferences`
- `GET/PUT/DELETE /api/v1/me/api-keys/anthropic`
- `GET /api/v1/checklists`, `GET /api/v1/checklists/version`, `GET /api/v1/checklists/:id`
- Full sessions API under `/api/v1/sessions/*`
- `GET /api/v1/gaps`, `GET /api/v1/learn/queue`
- `POST /api/v1/ai/tutor`
- Diff grounding APIs under `/api/v1/diffs/*` (optional for comment drafting)
- Comment style profile APIs under `/api/v1/comment-profiles/*`
- Calibration APIs under `/api/v1/calibration/*`
- Risk heatmap API at `/api/v1/risk/sessions/:sessionId/heatmap`
- Compliance pack APIs under `/api/v1/compliance/packs*`
- Usage and budget API under `/api/v1/usage/*`
- Export and backup API under `/api/v1/exports/*` and `/api/v1/backups/*`
- Admin endpoints:
  - `POST /api/v1/admin/checklists/publish`
  - `POST /api/v1/admin/security/rotate-provider-keys`
  - `POST /api/v1/admin/ci/policy-check`
  - `GET /api/v1/admin/maintenance/policy`
  - `POST /api/v1/admin/maintenance/cleanup`

Swagger docs are available at `/docs` when `ENABLE_SWAGGER_DOCS=true`.

## AI Model Policy

- Supported models: `haiku`, `sonnet`, `opus`
- `comment-drafter` defaults to `haiku` when model is not provided
- Other AI features default to `sonnet` when model is not provided
- For `comment-drafter`, server can auto-escalate `haiku -> sonnet` when quality signals are weak (can be disabled per request).

## Validation Commands

```bash
npm run typecheck
npm run build
npm run test
npm run test:ci
npm run checklists:verify-sync
npm run openapi:check-routes
npm run openapi:validate
npm run openapi:check-security
npm run preflight
```

The OpenAPI route check verifies implemented controller routes against `../docs/openapi.yaml`.

Checklist JSON source-of-truth lives at `../assets/data/checklists`.
If checklist files change, sync them into backend with:

```bash
npm run checklists:sync
```

## Test Coverage Focus

The backend tests are intended to catch real regressions in critical paths:

- `test/ai.service.spec.ts`
  - verifies comment-drafter auto-escalation from Haiku to Sonnet
  - verifies cached tutor responses short-circuit external AI calls
- `test/budget.service.spec.ts`
  - verifies auto-downgrade near budget threshold
  - verifies hard-stop blocking once budget is exceeded
- `test/rate-limit.guard.spec.ts`
  - verifies cooldown rejection (`409`) for back-to-back AI calls
  - verifies AI per-minute rate-limit rejection (`429`)
- `test/diffs.service.spec.ts`
  - verifies diff grounding summary and file heatmap ordering
- `test/admin-ci.service.spec.ts`
  - verifies CI policy checks fail/pass based on thresholds

## Deployment

Configured for Railway with `railway.json`.
Set all required environment variables from `.env.example` in Railway.
