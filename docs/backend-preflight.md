# Backend Preflight and Smoke Checks

Use this before turning on production traffic.

## Commands

From `backend/`:

```bash
npm run env:check
npm run preflight
```

## What `preflight` validates

1. Required environment variables are present.
2. Prisma schema is valid.
3. Migration status is healthy.
4. Typecheck passes.
5. OpenAPI route drift + schema + security checks pass.
6. Public health smoke checks pass.
7. Optional authenticated smoke check (`GET /me`) passes when `SMOKE_BEARER_TOKEN` is set.

## Optional authenticated smoke check

```bash
export API_PUBLIC_URL=https://your-api-domain
export API_BASE_PATH=api/v1
export SMOKE_BEARER_TOKEN=<supabase_access_token>
npm run smoke:health
```

## Notes

- Public health endpoints do not require a bearer token.
- Authenticated smoke check targets `/me` when `SMOKE_BEARER_TOKEN` is set.
- `preflight` skips smoke checks if `SMOKE_BEARER_TOKEN` is not set.
