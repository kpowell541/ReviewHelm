#!/usr/bin/env node
import process from 'node:process';

const baseUrl = process.env.API_PUBLIC_URL;
const token = process.env.SMOKE_BEARER_TOKEN;
const rawBasePath = process.env.API_BASE_PATH || 'api/v1';
const basePath = rawBasePath.replace(/^\/+|\/+$/g, '');
const normalizedBaseUrl = baseUrl?.replace(/\/+$/g, '');

if (!baseUrl) {
  console.error('API_PUBLIC_URL is required for smoke health checks.');
  process.exit(1);
}

const publicTargets = [
  `${normalizedBaseUrl}/${basePath}/health`,
  `${normalizedBaseUrl}/${basePath}/health/ready`,
];

for (const target of publicTargets) {
  const response = await fetch(target, {
    headers: { 'x-request-id': `smoke-${Date.now()}` },
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

if (!token) {
  console.log('Skipping authenticated smoke checks (SMOKE_BEARER_TOKEN not set).');
  process.exit(0);
}

const authenticatedTarget = `${normalizedBaseUrl}/${basePath}/me`;
const authenticatedResponse = await fetch(authenticatedTarget, {
  headers: {
    Authorization: `Bearer ${token}`,
    'x-request-id': `smoke-auth-${Date.now()}`,
  },
});
if (!authenticatedResponse.ok) {
  const body = await authenticatedResponse.text().catch(() => '');
  console.error(
    `Authenticated smoke check failed for ${authenticatedTarget} (${authenticatedResponse.status}) ${body}`,
  );
  process.exit(1);
}
console.log(`Authenticated smoke check passed: ${authenticatedTarget}`);
