import { z } from 'zod';

const PostgresUrlSchema = z
  .string()
  .min(10)
  .regex(/^postgres(ql)?:\/\//i, 'must start with postgresql:// or postgres://');

const ApiBasePathSchema = z
  .string()
  .min(1)
  .transform((value) => value.replace(/^\/+|\/+$/g, ''))
  .refine((value) => value.length > 0, {
    message: 'must include at least one path segment (for example: api/v1)',
  });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_PATH: ApiBasePathSchema.default('api/v1'),
  API_PUBLIC_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/g, '')),
  APP_VERSION: z.string().default('0.1.0'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_JWT_ISSUER: z.string().url(),
  SUPABASE_JWT_AUDIENCE: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .default('')
    .refine((value) => value === '' || value.length >= 20, {
      message: 'must be empty or at least 20 characters',
    }),

  DATABASE_URL: PostgresUrlSchema,
  DIRECT_URL: PostgresUrlSchema,

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10),

  KEY_ENCRYPTION_PROVIDER: z.enum(['local', 'aws_kms']).default('local'),
  KEY_ENCRYPTION_VERSION: z.coerce.number().int().min(1).default(1),
  KEY_ENCRYPTION_MASTER_KEY: z.string().min(32),
  KEY_ENCRYPTION_MASTER_KEYS_JSON: z.string().optional().default(''),
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_KMS_KEY_ID: z.string().optional().default(''),

  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),

  STAGING_ACCESS_GATE: z.preprocess(
    (value) => `${value ?? 'false'}`.toLowerCase() === 'true',
    z.boolean(),
  ),

  PLATFORM_ANTHROPIC_KEY: z.string().optional().default(''),
  ADMIN_USER_IDS: z.string().optional().default(''),
  SPONSORED_EMAILS: z.string().optional().default(''),
  ADMIN_DASHBOARD_ALLOWED_EMAILS: z
    .string()
    .optional()
    .default('kaitlin.e.powell@gmail.com'),
  CHECKLIST_RELEVANCE_WORKFLOW_OWNER: z.string().optional().default('kpowell541'),
  CHECKLIST_RELEVANCE_WORKFLOW_REPO: z.string().optional().default('ReviewHelm'),
  CHECKLIST_RELEVANCE_WORKFLOW_FILE: z
    .string()
    .optional()
    .default('checklist-relevance-check.yml'),
  GITHUB_READ_TOKEN: z.string().optional().default(''),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  STRICT_STARTUP_CHECKS: z.preprocess(
    (value) => `${value ?? 'true'}`.toLowerCase() === 'true',
    z.boolean(),
  ),
  ENABLE_SWAGGER_DOCS: z.preprocess(
    (value) => `${value ?? 'false'}`.toLowerCase() === 'true',
    z.boolean(),
  ),
  ALLOW_SWAGGER_DOCS_IN_PRODUCTION: z.preprocess(
    (value) => `${value ?? 'false'}`.toLowerCase() === 'true',
    z.boolean(),
  ),
  SWAGGER_DOCS_ALLOWED_IPS: z.string().optional().default(''),
  REQUEST_BODY_LIMIT: z.string().regex(/^\d+(kb|mb)$/i).default('256kb'),
  BACKUP_IMPORT_ALLOWLIST_HOSTS: z.string().optional().default('raw.githubusercontent.com'),
  BACKUP_IMPORT_SIGNING_SECRET: z.string().optional().default(''),
  BACKUP_IMPORT_MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1024).default(1_048_576),
  BACKUP_IMPORT_MAX_SESSIONS: z.coerce.number().int().min(1).default(2000),
  BACKUP_IMPORT_MAX_USAGE_ROWS: z.coerce.number().int().min(1).default(366),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  AI_COOLDOWN_SECONDS: z.coerce.number().int().min(0).max(60).default(6),
  HAIKU_INPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(1),
  HAIKU_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(5),
  SONNET_INPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(3),
  SONNET_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(15),
  OPUS_INPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(15),
  OPUS_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(75),
  RETAIN_DIFF_DAYS: z.coerce.number().int().min(1).default(90),
  RETAIN_CALIBRATION_DAYS: z.coerce.number().int().min(1).default(180),
  RETAIN_AUDIT_DAYS: z.coerce.number().int().min(7).default(365),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return EnvSchema.parse(config);
}
