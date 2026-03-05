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
npm run openapi:check-routes
```

The OpenAPI route check verifies implemented controller routes against `../docs/openapi.yaml`.

## Deployment

Configured for Railway with `railway.json`.
Set all required environment variables from `.env.example` in Railway.
