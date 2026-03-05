#!/usr/bin/env node
import process from 'node:process';

const baseUrl = process.env.API_PUBLIC_URL;
const token = process.env.SMOKE_BEARER_TOKEN;
const basePath = process.env.API_BASE_PATH || 'api/v1';

if (!baseUrl) {
  console.error('API_PUBLIC_URL is required for smoke health checks.');
  process.exit(1);
}
if (!token) {
  console.error(
    'SMOKE_BEARER_TOKEN is required because health endpoints are authenticated.',
  );
  process.exit(1);
}

const targets = [`${baseUrl}/${basePath}/health`, `${baseUrl}/${basePath}/health/ready`];

for (const target of targets) {
  const response = await fetch(target, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-request-id': `smoke-${Date.now()}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`Smoke check failed for ${target} (${response.status}) ${body}`);
    process.exit(1);
  }

  const payload = await response.json().catch(() => ({}));
  if (!payload || payload.ok !== true) {
    console.error(`Smoke check failed for ${target}: expected { ok: true }`);
    process.exit(1);
  }

  console.log(`Smoke check passed: ${target}`);
}
