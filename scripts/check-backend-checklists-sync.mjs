#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(repoRoot, 'assets', 'data', 'checklists');
const targetDir = path.join(repoRoot, 'backend', 'src', 'checklists', 'data');

const entries = await fs.readdir(sourceDir);
const files = entries.filter((f) => f.endsWith('.json')).sort();

async function sha256(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const drift = [];

for (const file of files) {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  try {
    const [sourceHash, targetHash] = await Promise.all([
      sha256(sourcePath),
      sha256(targetPath),
    ]);
    if (sourceHash !== targetHash) {
      drift.push(file);
    }
  } catch {
    drift.push(file);
  }
}

if (drift.length > 0) {
  console.error('Backend checklist data is out of sync for:');
  for (const file of drift) {
    console.error(`- ${file}`);
  }
  console.error('Run: node scripts/sync-backend-checklists.mjs');
  process.exit(1);
}

console.log(`Checklist sync check passed (${files.length} files).`);
