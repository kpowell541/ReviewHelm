#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(repoRoot, 'assets', 'data', 'checklists');
const targetDir = path.join(repoRoot, 'backend', 'src', 'checklists', 'data');

const files = [
  'c-lang.json',
  'go.json',
  'java-protobuf.json',
  'js-ts-react-node.json',
  'lua.json',
  'polish-my-pr.json',
  'python.json',
  'ruby.json',
  'swift-objc.json',
  'terraform-hcl.json',
  'web-devops-config.json',
];

await fs.mkdir(targetDir, { recursive: true });

for (const file of files) {
  const from = path.join(sourceDir, file);
  const to = path.join(targetDir, file);
  await fs.copyFile(from, to);
  console.log(`synced ${file}`);
}

console.log(`Synced ${files.length} checklist files to backend.`);
