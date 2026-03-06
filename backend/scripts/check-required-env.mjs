#!/usr/bin/env node
import process from 'node:process';

const required = [
  'API_PUBLIC_URL',
  'SUPABASE_URL',
  'SUPABASE_JWKS_URL',
  'SUPABASE_JWT_ISSUER',
  'SUPABASE_JWT_AUDIENCE',
  'DATABASE_URL',
  'DIRECT_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KEY_ENCRYPTION_MASTER_KEY',
];

const missing = required.filter((key) => {
  const value = process.env[key];
  return !value || !String(value).trim();
});

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if ((process.env.KEY_ENCRYPTION_MASTER_KEY || '').length < 32) {
  console.error('KEY_ENCRYPTION_MASTER_KEY must be at least 32 characters.');
  process.exit(1);
}

const postgresVars = ['DATABASE_URL', 'DIRECT_URL'];
for (const key of postgresVars) {
  const value = String(process.env[key] || '').trim();
  if (!/^postgres(ql)?:\/\//i.test(value)) {
    console.error(`${key} must start with postgresql:// or postgres://`);
    process.exit(1);
  }
}

const isProduction = `${process.env.NODE_ENV || ''}`.toLowerCase() === 'production';
const strictStartupChecks =
  `${process.env.STRICT_STARTUP_CHECKS ?? 'true'}`.toLowerCase() === 'true';
if (isProduction && strictStartupChecks) {
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '').trim();
  if (!allowedOrigins) {
    console.error(
      'ALLOWED_ORIGINS is required when NODE_ENV=production and STRICT_STARTUP_CHECKS=true.',
    );
    process.exit(1);
  }
}

console.log(`Environment check passed (${required.length} required variables).`);
