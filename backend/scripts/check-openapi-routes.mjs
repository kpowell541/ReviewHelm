#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const backendRoot = path.resolve(import.meta.dirname, '..');
const srcRoot = path.join(backendRoot, 'src');
const openApiPath = path.resolve(backendRoot, '..', 'docs', 'openapi.yaml');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      out.push(full);
    }
  }
  return out;
}

function normalizePathPart(value) {
  if (!value || value === '/') return '';
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function joinRoute(basePath, subPath) {
  const parts = [normalizePathPart(basePath), normalizePathPart(subPath)].filter(Boolean);
  return parts.length > 0 ? `/${parts.join('/')}` : '/';
}

function parseControllerRoutes(source) {
  const controllerMatch = source.match(/@Controller\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  const basePath = controllerMatch?.[1] ?? '';
  const lines = source.split('\n');
  const routes = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const methodMatch = line.match(/^\s*@(?<method>Get|Post|Patch|Put|Delete)\((?<arg>[^)]*)\)/);
    if (!methodMatch?.groups) continue;

    const httpMethod = methodMatch.groups.method.toUpperCase();
    const arg = methodMatch.groups.arg.trim();
    const subPathMatch = arg.match(/['"`]([^'"`]+)['"`]/);
    const subPath = subPathMatch?.[1] ?? '';

    for (let j = i + 1; j < Math.min(lines.length, i + 20); j += 1) {
      const candidate = lines[j];
      if (/^\s*@/.test(candidate)) {
        continue;
      }
      if (/^\s*(?:async\s+)?[A-Za-z0-9_]+\s*\(/.test(candidate)) {
        routes.push(`${httpMethod} ${joinRoute(basePath, subPath)}`);
        break;
      }
      if (candidate.trim() === '') {
        continue;
      }
    }
  }

  return routes;
}

function parseImplementedRoutes() {
  const files = walk(srcRoot);
  const routes = new Set();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const route of parseControllerRoutes(source)) {
      routes.add(route);
    }
  }
  return routes;
}

function parseDocumentedRoutes(openApiYaml) {
  const routes = new Set();
  const lines = openApiYaml.split('\n');
  let currentPath = null;

  for (const line of lines) {
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    if (!currentPath) continue;
    const methodMatch = line.match(/^    (get|post|patch|put|delete):\s*$/);
    if (methodMatch) {
      routes.add(`${methodMatch[1].toUpperCase()} ${currentPath}`);
    }
  }
  return routes;
}

const openApiYaml = fs.readFileSync(openApiPath, 'utf8');
const implemented = parseImplementedRoutes();
const documented = parseDocumentedRoutes(openApiYaml);

const undocumented = [...implemented].filter((route) => !documented.has(route)).sort();
const staleDocs = [...documented].filter((route) => !implemented.has(route)).sort();

if (undocumented.length > 0 || staleDocs.length > 0) {
  console.error('OpenAPI route drift detected.');
  if (undocumented.length > 0) {
    console.error('\nImplemented but not documented:');
    for (const route of undocumented) {
      console.error(`- ${route}`);
    }
  }
  if (staleDocs.length > 0) {
    console.error('\nDocumented but not implemented:');
    for (const route of staleDocs) {
      console.error(`- ${route}`);
    }
  }
  process.exit(1);
}

console.log(`OpenAPI route check passed (${implemented.size} routes).`);
