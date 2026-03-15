# ReviewHelm AWS Backend Skeleton

Parallel backend service for the AWS-native migration.

Current scope:

- Hono app skeleton
- Lambda entrypoint
- Local dev server
- Request IDs
- JSON request logging
- Cognito JWT middleware scaffolding
- Admin claim enforcement scaffolding
- Root liveness endpoint
- `/api/v1/health`
- `/api/v1/health/ready`
- Shared env parsing and error handling

This service is intentionally separate from the legacy NestJS backend under `backend/`.

## Commands

```bash
cd backend-aws
npm install
npm run dev
npm run typecheck
npm run build
```

## Routes

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `GET /api/v1/admin/costs/overview`
- `GET /api/v1/me`
- `GET /api/v1/me/preferences`
- `PATCH /api/v1/me/preferences`
- `GET /api/v1/subscription/tier`
- `GET /api/v1/subscription/credits`
- `POST /api/v1/sessions`
- `GET /api/v1/sessions`
- `GET /api/v1/sessions/:sessionId`
- `PATCH /api/v1/sessions/:sessionId`
- `DELETE /api/v1/sessions/:sessionId`
- `PATCH /api/v1/sessions/:sessionId/items/:itemId`
- `PATCH /api/v1/sessions/:sessionId/notes`
- `POST /api/v1/sessions/:sessionId/complete`
- `GET /api/v1/sessions/:sessionId/summary`
- `GET /api/v1/tracked-prs`
- `GET /api/v1/tracked-prs/:prId`
- `PUT /api/v1/tracked-prs/:prId`
- `DELETE /api/v1/tracked-prs/:prId`
- `GET /api/v1/usage/sessions/:sessionId`
- `GET /api/v1/comment-profiles`
- `POST /api/v1/comment-profiles`
- `PATCH /api/v1/comment-profiles/:profileId`
- `DELETE /api/v1/comment-profiles/:profileId`
- `POST /api/v1/comment-profiles/:profileId/activate`
- `POST /api/v1/ai/tutor`
- `GET /api/v1/gaps`
- `GET /api/v1/gaps/confidence`
- `PUT /api/v1/gaps/confidence`
- `GET /api/v1/learn/queue`
- `GET /api/v1/tutor-conversations`
- `PUT /api/v1/tutor-conversations`
- `PUT /api/v1/tutor-conversations/:itemId`
- `DELETE /api/v1/tutor-conversations/:itemId`

## Notes

- Readiness uses dependency status placeholders until database and cache integrations are added.
- The Lambda entrypoint lives at `src/lambda.ts`.
- Auth middleware is ready to be attached to ported user and admin routes as the migration proceeds.
- Drizzle foundation lives under `src/db`.
- Run `npm run db:generate` after schema changes once migration directories are in use.
- The AI tutor route is a minimal Anthropic-backed port and does not yet include the full legacy cache, calibration, or grounding stack.
- Environment cost tracking expects AWS Cost Explorer IAM access plus environment-filter config and an Anthropic admin reporting key.
