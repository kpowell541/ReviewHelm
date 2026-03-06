import type { ClaudeModel } from '../data/types';

export const MODEL_RATES_USD_PER_TOKEN: Record<
  ClaudeModel,
  { input: number; output: number }
> = {
  sonnet: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  opus: { input: 15 / 1_000_000, output: 75 / 1_000_000 },
};

export function estimateCost(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_RATES_USD_PER_TOKEN[model];
  return inputTokens * rate.input + outputTokens * rate.output;
}
