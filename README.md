# ReviewHelm

ReviewHelm is an Android-first code review training and assistance app, with:

- Expo React Native frontend in the repository root
- NestJS backend API in [`backend/`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/backend)

## Run Locally

Frontend:

```bash
npm install
npm run android
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run start:dev
```

## Test Suite

Current automated tests are in `backend/test` and target regression-prone backend behavior:

- AI tutor model escalation and response caching
- budget guardrails (auto-downgrade and hard-stop behavior)
- cooldown/rate-limit enforcement
- diff parsing/grounding
- CI policy gate evaluation

Run backend tests:

```bash
cd backend
npm run test
```

Run backend tests with coverage:

```bash
cd backend
npm run test:ci
```

Run full backend verification before pushing:

```bash
cd backend
npm run typecheck
npm run build
npm run test
npm run openapi:check-routes
npm run openapi:validate
npm run openapi:check-security
```
