import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { AppEnv } from '../../config/env.schema';

interface ModelPricing {
  input: number;
  output: number;
}

function buildModelPricing(config: ConfigService<AppEnv, true>): Record<string, ModelPricing> {
  return {
    haiku: {
      input: config.get('HAIKU_INPUT_COST_PER_MILLION_USD'),
      output: config.get('HAIKU_OUTPUT_COST_PER_MILLION_USD'),
    },
    sonnet: {
      input: config.get('SONNET_INPUT_COST_PER_MILLION_USD'),
      output: config.get('SONNET_OUTPUT_COST_PER_MILLION_USD'),
    },
    opus: {
      input: config.get('OPUS_INPUT_COST_PER_MILLION_USD'),
      output: config.get('OPUS_OUTPUT_COST_PER_MILLION_USD'),
    },
  };
}

export function safeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function estimateCostUsd(
  byModel: Prisma.JsonValue,
  config: ConfigService<AppEnv, true>,
): number {
  if (!byModel || typeof byModel !== 'object' || Array.isArray(byModel)) {
    return 0;
  }

  const modelObj = byModel as Record<string, unknown>;
  const pricing = buildModelPricing(config);

  let total = 0;
  for (const [model, payload] of Object.entries(modelObj)) {
    if (!payload || typeof payload !== 'object') continue;
    const row = payload as Record<string, unknown>;
    const inputTokens = safeNumber(row.inputTokens);
    const outputTokens = safeNumber(row.outputTokens);
    const prices = pricing[model] ?? pricing.sonnet;
    total +=
      (inputTokens / 1_000_000) * prices.input +
      (outputTokens / 1_000_000) * prices.output;
  }

  return Number(total.toFixed(6));
}
