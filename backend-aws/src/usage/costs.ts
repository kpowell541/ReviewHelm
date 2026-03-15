import type { AppEnv } from '../config/env';

type ModelUsage = {
  inputTokens?: unknown;
  outputTokens?: unknown;
};

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function estimateCostUsd(byModel: unknown, env: AppEnv): number {
  if (!byModel || typeof byModel !== 'object' || Array.isArray(byModel)) {
    return 0;
  }

  const modelObject = byModel as Record<string, unknown>;
  let total = 0;

  for (const [model, rawUsage] of Object.entries(modelObject)) {
    if (!rawUsage || typeof rawUsage !== 'object' || Array.isArray(rawUsage)) continue;
    const usage = rawUsage as ModelUsage;
    const inputTokens = safeNumber(usage.inputTokens);
    const outputTokens = safeNumber(usage.outputTokens);

    switch (model) {
      case 'haiku':
        total += (inputTokens / 1_000_000) * env.HAIKU_INPUT_COST_PER_MILLION_USD;
        total += (outputTokens / 1_000_000) * env.HAIKU_OUTPUT_COST_PER_MILLION_USD;
        break;
      case 'sonnet':
        total += (inputTokens / 1_000_000) * env.SONNET_INPUT_COST_PER_MILLION_USD;
        total += (outputTokens / 1_000_000) * env.SONNET_OUTPUT_COST_PER_MILLION_USD;
        break;
      case 'opus':
        total += (inputTokens / 1_000_000) * env.OPUS_INPUT_COST_PER_MILLION_USD;
        total += (outputTokens / 1_000_000) * env.OPUS_OUTPUT_COST_PER_MILLION_USD;
        break;
      default:
        break;
    }
  }

  return Number(total.toFixed(6));
}
