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

## Operational Docs

- AWS backend scaffold: [`backend-aws/`](/Users/kaitlinpowell/conductor/workspaces/reviewhelm/denpasar/backend-aws) and [`infra/terraform/`](/Users/kaitlinpowell/conductor/workspaces/reviewhelm/denpasar/infra/terraform)
- Backend accounts and keys: [`docs/backend-account-setup.md`](/Users/kaitlinpowell/conductor/workspaces/reviewhelm/denpasar/docs/backend-account-setup.md)
- Security baseline: [`docs/security-operations.md`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/security-operations.md)
- Release gate: [`docs/release-readiness-checklist.md`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/release-readiness-checklist.md)
- Frontend kickoff: [`docs/frontend-kickoff-checklist.md`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/frontend-kickoff-checklist.md)
- Claude prompt: [`docs/claude-frontend-kickoff-prompt.md`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/claude-frontend-kickoff-prompt.md)
- Contract freeze: [`docs/backend-contract-freeze.md`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/backend-contract-freeze.md)
- API delta log: [`docs/api-delta-log.md`](/Users/kaitlinpowell/conductor/workspaces/Home-Hub/bangalore/pr-review-center/docs/api-delta-log.md)
- Brand name shortlist: [`docs/brand-name-shortlist.md`](docs/brand-name-shortlist.md)
