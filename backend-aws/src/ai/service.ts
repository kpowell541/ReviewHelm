import { HTTPException } from 'hono/http-exception';
import type { AuthPrincipal } from '../auth/types';
import { getEnv } from '../config/env';
import { deductCredits } from '../subscription/service';
import { recordSessionUsage } from '../usage/service';
import { estimateCostUsd } from '../usage/costs';
import type { AiTutorInput } from './schema';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function toAnthropicModel(model: 'haiku' | 'sonnet' | 'opus') {
  switch (model) {
    case 'haiku':
      return 'claude-3-5-haiku-latest';
    case 'opus':
      return 'claude-3-opus-latest';
    default:
      return 'claude-3-7-sonnet-latest';
  }
}

function buildSystemPrompt(input: AiTutorInput) {
  return [
    'You are ReviewHelm tutor, focused on high-signal code review guidance.',
    `Feature: ${input.feature}`,
    `Role: ${input.role}`,
    `Stack: ${input.stackLabel}`,
    `Item: ${input.itemText}`,
    `User confidence (1-5): ${input.confidence}`,
    'Be concise, correct, and practical.',
    input.feature === 'comment-drafter'
      ? 'Draft a review comment that is specific, actionable, and professional.'
      : 'Help the user understand the concept and how to apply it in review.',
  ].join('\n');
}

export async function tutor(principal: AuthPrincipal, input: AiTutorInput) {
  const env = getEnv();
  if (!env.PLATFORM_ANTHROPIC_KEY) {
    throw new HTTPException(503, { message: 'Anthropic integration is not configured.' });
  }

  const requestedModel = input.model ?? 'sonnet';
  const resolvedModel = requestedModel;
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'x-api-key': env.PLATFORM_ANTHROPIC_KEY,
    },
    body: JSON.stringify({
      model: toAnthropicModel(resolvedModel),
      max_tokens: input.role === 'comment-drafter' ? 600 : 1200,
      system: buildSystemPrompt(input),
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new HTTPException(502, {
      message: `Anthropic request failed (${response.status})${body ? `: ${body.slice(0, 300)}` : ''}`,
    });
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const content = payload.content?.find((part) => part.type === 'text')?.text?.trim() ?? '';
  if (!content) {
    throw new HTTPException(502, { message: 'Anthropic response did not contain text content.' });
  }

  const inputTokens = Number(payload.usage?.input_tokens ?? 0);
  const outputTokens = Number(payload.usage?.output_tokens ?? 0);
  const costUsd = estimateCostUsd(
    {
      [resolvedModel]: {
        inputTokens,
        outputTokens,
      },
    },
    env,
  );

  if (input.sessionId) {
    await recordSessionUsage({
      principal,
      sessionId: input.sessionId,
      model: resolvedModel,
      feature: input.feature,
      inputTokens,
      outputTokens,
    });
  }

  await deductCredits(principal, costUsd);

  return {
    content,
    requestedModel,
    resolvedModel,
    autoDowngraded: false,
    autoEscalated: false,
    cached: false,
    inputTokens,
    outputTokens,
    costUsd,
    cooldownRemainingMs: 0,
  };
}
