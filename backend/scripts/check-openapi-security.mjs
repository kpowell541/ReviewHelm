#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const backendRoot = path.resolve(import.meta.dirname, '..');
const openApiPath = path.resolve(backendRoot, '..', 'docs', 'openapi.yaml');
const content = fs.readFileSync(openApiPath, 'utf8');
const doc = yaml.load(content);

if (!doc || typeof doc !== 'object') {
  console.error('Unable to parse OpenAPI file.');
  process.exit(1);
}

const paths = doc.paths ?? {};
const methods = new Set(['get', 'post', 'patch', 'put', 'delete']);
const problems = [];

for (const [route, operationMap] of Object.entries(paths)) {
  if (!operationMap || typeof operationMap !== 'object') continue;
  for (const [method, operation] of Object.entries(operationMap)) {
    if (!methods.has(method.toLowerCase())) continue;
    if (!operation || typeof operation !== 'object') continue;

    const op = operation;
    const responses = op.responses ?? {};
    if (!responses['401']) {
      problems.push(`${method.toUpperCase()} ${route}: missing 401 response`);
    }
    if (Array.isArray(op.security) && op.security.length === 0) {
      problems.push(`${method.toUpperCase()} ${route}: operation explicitly disables auth`);
    }
  }
}

if (problems.length > 0) {
  console.error('OpenAPI security policy check failed:');
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log('OpenAPI security policy check passed.');
