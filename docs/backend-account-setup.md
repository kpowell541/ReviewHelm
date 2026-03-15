# ReviewHelm Backend Accounts and Keys

This is the AWS-native backend account and secret checklist. Railway, Supabase, and Upstash are no longer part of the target path.

## Required Accounts

1. AWS account per environment
- Purpose: API Gateway, Lambda, Cognito, Aurora, ElastiCache, SQS, EventBridge, S3, SES, CloudWatch
- Needed values:
  - AWS account ID
  - target region
  - GitHub OIDC role assumption setup
  - DNS and certificate ownership for:
    - `staging.reviewhelm.app`
    - `admin-staging.reviewhelm.app`
    - `api-staging.reviewhelm.app`

2. Cognito
- Purpose: user auth, admin auth, hosted UI, JWT verification
- Needed values:
  - User Pool ID
  - App Client ID(s)
  - Hosted UI domain
  - callback/logout URLs
  - admin group/claim mapping

3. Anthropic
- Purpose: tutor, learn, comment drafting, and environment-level cost reporting
- Needed values:
  - `PLATFORM_ANTHROPIC_KEY`
  - `ANTHROPIC_ADMIN_API_KEY`

4. Stripe
- Purpose: subscriptions, checkout, credits/billing
- Needed values:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

5. Sentry
- Purpose: runtime exception tracking
- Needed values:
  - `SENTRY_DSN`

6. Infisical
- Purpose: secret custody for backend runtime and CI
- Needed values:
  - database connection secrets
  - cache connection secrets
  - provider keys and webhook secrets

## Secrets Custody

- Preferred deploy auth: GitHub Actions OIDC into AWS
- Preferred secret source: Infisical
- Do not depend on long-lived AWS access keys unless temporarily bootstrapping

## Runtime Config That Is Not Secret

- `DEPLOY_ENVIRONMENT`
- `API_PUBLIC_URL`
- `COGNITO_JWKS_URL`
- `COGNITO_JWT_ISSUER`
- `COGNITO_JWT_AUDIENCE`
- `COGNITO_ADMIN_GROUPS`
- `AWS_COST_EXPLORER_REGION`
- optional:
  - `AWS_COST_EXPLORER_TAG_KEY`
  - `AWS_COST_EXPLORER_TAG_VALUE`
  - `AWS_COST_EXPLORER_LINKED_ACCOUNT`

## Private-Only API Posture

- All business routes remain auth-protected.
- Public endpoints stay limited to liveness/readiness and explicit auth flow needs.
- Admin authorization is backend-enforced via Cognito claims/groups.
- OpenAPI remains the contract source of truth.
