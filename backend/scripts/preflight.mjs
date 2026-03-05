#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const backendRoot = path.resolve(import.meta.dirname, '..');

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('1/6 Checking required environment variables');
run('node', ['scripts/check-required-env.mjs']);

console.log('2/6 Validating Prisma schema');
run('npx', ['prisma', 'validate']);

console.log('3/6 Checking Prisma migration status');
run('npx', ['prisma', 'migrate', 'status']);

console.log('4/6 Typecheck');
run('npm', ['run', 'typecheck']);

console.log('5/6 OpenAPI verification');
run('npm', ['run', 'openapi:check-routes']);
run('npm', ['run', 'openapi:validate']);
run('npm', ['run', 'openapi:check-security']);

console.log('6/6 Optional authenticated smoke checks');
if (process.env.SMOKE_BEARER_TOKEN) {
  run('node', ['scripts/smoke-health.mjs']);
} else {
  console.log('Skipping smoke health checks (SMOKE_BEARER_TOKEN not set).');
}

console.log('Preflight passed.');
