# ReviewHelm API Backend

NestJS + Prisma backend scaffold for the ReviewHelm API contract.

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

## Available Endpoints (Scaffold)

- `GET /api/v1/health`
- Swagger docs at `/docs`

## Next Implementation Tasks

1. Supabase JWT auth guard and user context extraction.
2. Implement endpoints from `../docs/openapi.yaml`.
3. Add Upstash-backed cooldown and rate-limiting middleware.
4. Add provider key envelope encryption service.
5. Add e2e tests for API contract coverage.

## Deployment

Configured for Railway with `railway.json`.
Set all required environment variables from `.env.example` in Railway.
