import { z } from 'zod';

const ApiBasePathSchema = z
  .string()
  .min(1)
  .transform((value) => value.replace(/^\/+|\/+$/g, ''))
  .refine((value) => value.length > 0, {
    message: 'must include at least one path segment',
  });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_BASE_PATH: ApiBasePathSchema.default('api/v1'),
  API_PUBLIC_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/g, ''))
    .default('https://api-staging.reviewhelm.app'),
  APP_VERSION: z.string().default('0.1.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEPLOY_ENVIRONMENT: z.string().default('staging'),
  CORS_ORIGINS: z.string().default(''),
  DATABASE_URL: z.string().default(''),
  DATABASE_MIGRATIONS_URL: z.string().default(''),
  DATABASE_SCHEMA: z.string().default('public'),
  CACHE_REDIS_URL: z.string().default(''),
  SENTRY_DSN: z.string().default(''),
  AWS_COST_EXPLORER_REGION: z.string().default('us-east-1'),
  AWS_COST_EXPLORER_TAG_KEY: z.string().default('Environment'),
  AWS_COST_EXPLORER_TAG_VALUE: z.string().default(''),
  AWS_COST_EXPLORER_LINKED_ACCOUNT: z.string().default(''),
  COGNITO_JWKS_URL: z.string().url().optional().or(z.literal('')).default(''),
  COGNITO_JWT_ISSUER: z.string().url().optional().or(z.literal('')).default(''),
  COGNITO_JWT_AUDIENCE: z.string().optional().default(''),
  COGNITO_ADMIN_GROUPS: z.string().default('admin'),
  MACHINE_AUTH_CLIENT_IDS: z.string().default(''),
  SPONSORED_EMAILS: z.string().default(''),
  HAIKU_INPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(1),
  HAIKU_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(5),
  SONNET_INPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(3),
  SONNET_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(15),
  OPUS_INPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(15),
  OPUS_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().positive().default(75),
  PLATFORM_ANTHROPIC_KEY: z.string().default(''),
  ANTHROPIC_ADMIN_API_KEY: z.string().default(''),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  cachedEnv = EnvSchema.parse(process.env);
  return cachedEnv;
}

export function getAllowedOrigins(env: AppEnv): string[] {
  return env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAdminGroups(env: AppEnv): string[] {
  return env.COGNITO_ADMIN_GROUPS.split(',')
    .map((group) => group.trim())
    .filter(Boolean);
}

export function getMachineAuthClientIds(env: AppEnv): string[] {
  return env.MACHINE_AUTH_CLIENT_IDS.split(',')
    .map((clientId) => clientId.trim())
    .filter(Boolean);
}

export function getSponsoredEmails(env: AppEnv): string[] {
  return env.SPONSORED_EMAILS.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
