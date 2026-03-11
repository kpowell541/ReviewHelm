#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(repoRoot, 'assets', 'data', 'checklists');
const targetDir = path.join(repoRoot, 'backend', 'src', 'checklists', 'data');

const entries = await fs.readdir(sourceDir);
const files = entries.filter((f) => f.endsWith('.json')).sort();

await fs.mkdir(targetDir, { recursive: true });

for (const file of files) {
  const from = path.join(sourceDir, file);
  const to = path.join(targetDir, file);
  await fs.copyFile(from, to);
  console.log(`synced ${file}`);
}

console.log(`Synced ${files.length} checklist files to backend.`);
