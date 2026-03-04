/**
 * Populate empty checklist baseContent entries using Claude Sonnet.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/generate-base-content.ts
 *   ANTHROPIC_API_KEY=... npx tsx scripts/generate-base-content.ts --limit=25
 *   ANTHROPIC_API_KEY=... npx tsx scripts/generate-base-content.ts --use-batch --batch-size=20
 */

import * as fs from 'fs';
import * as path from 'path';

type StackId = 'java-protobuf' | 'js-ts-react-node' | 'go' | 'polish-my-pr';

interface CodeExample {
  title: string;
  language: string;
  bad?: { code: string; explanation: string };
  good?: { code: string; explanation: string };
}

interface BaseContent {
  whatItMeans: string;
  whyItMatters: string;
  howToVerify: string;
  exampleComment: string;
  codeExamples: CodeExample[];
  keyTakeaway: string;
  references?: string[];
}

interface ChecklistItem {
  id: string;
  text: string;
  baseContent: BaseContent;
}

interface ChecklistSection {
  id: string;
  title: string;
  items?: ChecklistItem[];
  subsections?: Array<{
    id: string;
    title: string;
    items: ChecklistItem[];
  }>;
}

interface Checklist {
  meta: {
    id: StackId;
    title: string;
    version: string;
  };
  sections: ChecklistSection[];
}

interface GenerationTarget {
  customId: string;
  prompt: string;
  item: ChecklistItem;
}

const CHECKLIST_DIR = path.resolve(__dirname, '../assets/data/checklists');
const CHECKLIST_FILES = [
  'java-protobuf.json',
  'js-ts-react-node.json',
  'go.json',
  'polish-my-pr.json',
] as const;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_BATCH_API_URL = 'https://api.anthropic.com/v1/messages/batches';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-6';

function parseLimitArg(): number | undefined {
  const arg = process.argv.find((value) => value.startsWith('--limit='));
  if (!arg) return undefined;
  const parsed = Number(arg.split('=')[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseBatchSizeArg(): number {
  const arg = process.argv.find((value) => value.startsWith('--batch-size='));
  if (!arg) return 20;
  const parsed = Number(arg.split('=')[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.floor(parsed);
}

function useBatchMode(): boolean {
  return process.argv.includes('--use-batch');
}

function stackLanguageHint(stackId: StackId): string {
  if (stackId === 'go') return 'Prefer Go examples.';
  if (stackId === 'java-protobuf')
    return 'Prefer Java/Kotlin + Protobuf examples.';
  if (stackId === 'js-ts-react-node')
    return 'Prefer TypeScript/React/Node examples.';
  return 'Use stack-agnostic examples focused on PR polish and review behavior.';
}

function hasBaseContent(content: BaseContent): boolean {
  return (
    content.whatItMeans.trim() !== '' ||
    content.whyItMatters.trim() !== '' ||
    content.howToVerify.trim() !== '' ||
    content.exampleComment.trim() !== '' ||
    content.keyTakeaway.trim() !== '' ||
    content.codeExamples.length > 0
  );
}

function allItems(checklist: Checklist): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const section of checklist.sections) {
    if (section.items) items.push(...section.items);
    if (section.subsections) {
      for (const subsection of section.subsections) {
        items.push(...subsection.items);
      }
    }
  }
  return items;
}

function buildPrompt(checklist: Checklist, item: ChecklistItem): string {
  return [
    'Generate JSON only. No markdown fences. Match this exact schema:',
    '{"whatItMeans":"string","whyItMatters":"string","howToVerify":"string","exampleComment":"string","codeExamples":[{"title":"string","language":"string","bad":{"code":"string","explanation":"string"},"good":{"code":"string","explanation":"string"}}],"keyTakeaway":"string","references":["string"]}',
    '',
    `Checklist: ${checklist.meta.title}`,
    `Stack: ${checklist.meta.id}`,
    stackLanguageHint(checklist.meta.id),
    `Item ID: ${item.id}`,
    `Item text: ${item.text}`,
    '',
    'Requirements:',
    '- whatItMeans, whyItMatters, howToVerify, keyTakeaway: concise and practical.',
    '- exampleComment: actionable, respectful PR comment.',
    '- include at least one good/bad codeExamples pair when a code example is useful.',
    '- references should be short names or URLs; empty array is allowed.',
    '- return valid JSON only.',
  ].join('\n');
}

function sanitizeJsonPayload(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function normalizeBaseContent(parsed: BaseContent): BaseContent {
  return {
    whatItMeans: parsed.whatItMeans ?? '',
    whyItMatters: parsed.whyItMatters ?? '',
    howToVerify: parsed.howToVerify ?? '',
    exampleComment: parsed.exampleComment ?? '',
    codeExamples: parsed.codeExamples ?? [],
    keyTakeaway: parsed.keyTakeaway ?? '',
    references: parsed.references ?? [],
  };
}

async function callClaude(prompt: string, apiKey: string): Promise<BaseContent> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const contentText = json.content?.find((entry) => entry.type === 'text')?.text;
  if (!contentText) {
    throw new Error('Anthropic response missing text block.');
  }

  return normalizeBaseContent(
    JSON.parse(sanitizeJsonPayload(contentText)) as BaseContent,
  );
}

async function createBatch(
  targets: GenerationTarget[],
  apiKey: string,
): Promise<string> {
  const response = await fetch(ANTHROPIC_BATCH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      requests: targets.map((target) => ({
        custom_id: target.customId,
        params: {
          model: MODEL,
          max_tokens: 1800,
          temperature: 0.3,
          messages: [{ role: 'user', content: target.prompt }],
        },
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Batch create failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error('Batch create response missing id.');
  }
  return payload.id;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBatchCompletion(batchId: string, apiKey: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(`${ANTHROPIC_BATCH_API_URL}/${batchId}`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Batch status failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      processing_status?: string;
      status?: string;
    };
    const status = payload.processing_status ?? payload.status ?? '';
    if (status === 'ended' || status === 'completed') {
      return;
    }
    await wait(5000);
  }
  throw new Error(`Batch ${batchId} timed out waiting for completion.`);
}

async function fetchBatchResults(
  batchId: string,
  apiKey: string,
): Promise<Record<string, BaseContent>> {
  const response = await fetch(`${ANTHROPIC_BATCH_API_URL}/${batchId}/results`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Batch results failed (${response.status}): ${body}`);
  }

  const bodyText = await response.text();
  const lines = bodyText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const contentByCustomId: Record<string, BaseContent> = {};
  for (const line of lines) {
    const row = JSON.parse(line) as {
      custom_id?: string;
      result?: {
        type?: string;
        message?: { content?: Array<{ type: string; text?: string }> };
      };
    };
    const customId = row.custom_id;
    if (!customId) continue;
    if (row.result?.type !== 'succeeded') continue;

    const text = row.result.message?.content?.find((entry) => entry.type === 'text')?.text;
    if (!text) continue;
    contentByCustomId[customId] = normalizeBaseContent(
      JSON.parse(sanitizeJsonPayload(text)) as BaseContent,
    );
  }
  return contentByCustomId;
}

function saveChecklist(filePath: string, checklist: Checklist): void {
  fs.writeFileSync(filePath, `${JSON.stringify(checklist, null, 2)}\n`, 'utf8');
}

async function generateViaBatch(
  targets: GenerationTarget[],
  apiKey: string,
  batchSize: number,
): Promise<{ generated: number; failed: number }> {
  let generated = 0;
  let failed = 0;

  for (let index = 0; index < targets.length; index += batchSize) {
    const chunk = targets.slice(index, index + batchSize);
    console.log(`Submitting batch chunk ${index + 1}-${index + chunk.length}...`);
    try {
      const batchId = await createBatch(chunk, apiKey);
      await waitForBatchCompletion(batchId, apiKey);
      const results = await fetchBatchResults(batchId, apiKey);

      for (const target of chunk) {
        const content = results[target.customId];
        if (!content) {
          failed++;
          console.error(`Batch missing result: ${target.item.id}`);
          continue;
        }
        target.item.baseContent = content;
        generated++;
        console.log(`Generated (batch): ${target.item.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Batch chunk failed: ${message}`);
      failed += chunk.length;
    }
  }

  return { generated, failed };
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
  if (!apiKey) {
    throw new Error('Missing API key. Set ANTHROPIC_API_KEY (or CLAUDE_API_KEY).');
  }

  const limit = parseLimitArg();
  const batchMode = useBatchMode();
  const batchSize = parseBatchSizeArg();

  let generatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const filename of CHECKLIST_FILES) {
    const filePath = path.join(CHECKLIST_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf8');
    const checklist = JSON.parse(raw) as Checklist;
    const items = allItems(checklist);

    console.log(`\nProcessing ${filename} (${items.length} items)...`);
    const pending: GenerationTarget[] = [];
    for (const item of items) {
      if (limit !== undefined && generatedCount + pending.length >= limit) {
        break;
      }
      if (hasBaseContent(item.baseContent)) {
        skippedCount++;
        continue;
      }
      pending.push({
        customId: `item_${pending.length}_${Date.now()}`,
        prompt: buildPrompt(checklist, item),
        item,
      });
    }

    if (pending.length === 0) {
      console.log(`No new content needed for ${filename}.`);
      continue;
    }

    let fileGenerated = 0;
    if (batchMode) {
      const outcome = await generateViaBatch(pending, apiKey, batchSize);
      fileGenerated += outcome.generated;
      failedCount += outcome.failed;
      generatedCount += outcome.generated;
    } else {
      for (const target of pending) {
        try {
          const content = await callClaude(target.prompt, apiKey);
          target.item.baseContent = content;
          generatedCount++;
          fileGenerated++;

          if (generatedCount % 10 === 0) {
            saveChecklist(filePath, checklist);
            console.log(`Checkpoint saved (${generatedCount} generated so far).`);
          }

          console.log(`Generated: ${target.item.id}`);
        } catch (error) {
          failedCount++;
          const message =
            error instanceof Error ? error.message : 'Unknown generation error';
          console.error(`Failed on ${target.item.id}: ${message}`);
        }
      }
    }

    if (fileGenerated > 0) {
      checklist.meta.version = '2.0.0';
      saveChecklist(filePath, checklist);
      console.log(
        `Saved ${filename}: +${fileGenerated} generated, version -> ${checklist.meta.version}`,
      );
    } else {
      console.log(`No generated output persisted for ${filename}.`);
    }

    if (limit !== undefined && generatedCount >= limit) {
      break;
    }
  }

  console.log('\nDone.');
  console.log(`Generated: ${generatedCount}`);
  console.log(`Skipped existing: ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
