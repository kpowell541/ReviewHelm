# ReviewHelm Terraform Scaffold

This is the AWS infrastructure scaffold for the new backend migration.

Current structure:

- `environments/staging`
  - root module for staging in `us-east-1`
- `modules/*`
  - reusable building blocks for the AWS-native backend stack

This scaffold is intentionally light on concrete resources until the remaining
AWS account, Cognito, domain, and secret values are finalized.
