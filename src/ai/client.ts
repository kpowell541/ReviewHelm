import {
  ClaudeModel,
  CLAUDE_MODEL_IDS,
  TutorMessage,
  TutorRole,
  ConfidenceLevel,
  CONFIDENCE_LABELS,
} from '../data/types';
import { useUsageStore } from '../store/useUsageStore';
import { useTutorStore } from '../store/useTutorStore';
import { estimateCost } from './pricing';
import { getTutorSystemPrompt } from './prompts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_COUNT_API_URL = 'https://api.anthropic.com/v1/messages/count_tokens';
const API_VERSION = '2023-06-01';
const CACHE_BETA_HEADER = 'prompt-caching-2024-07-31';
const MAX_CONTINUATION_TURNS = 2;
const RESPONSE_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const MAX_TOKENS_BY_ROLE: Record<TutorRole, number> = {
  'concept-explainer': 1400,
  qa: 1000,
  'comment-drafter': 600,
  'exercise-generator': 1200,
  'anti-bias-challenger': 900,
};

const INPUT_TOKEN_CAP_BY_ROLE: Record<TutorRole, number> = {
  'concept-explainer': 12000,
  qa: 10000,
  'comment-drafter': 6500,
  'exercise-generator': 9000,
  'anti-bias-challenger': 8000,
};

interface AnthropicTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponsePayload {
  content?: Array<{ type: string; text?: string }>;
  model?: string;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export interface AiRequestOptions {
  apiKey: string;
  model: ClaudeModel;
  role: TutorRole;
  itemText: string;
  stackLabel: string;
  confidence: ConfidenceLevel;
  messages: TutorMessage[];
  allowResponseCache?: boolean;
}

export interface AiResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestedModel: ClaudeModel;
  resolvedModel: ClaudeModel;
  autoDowngraded: boolean;
  cached: boolean;
}

export class AiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'AiClientError';
  }
}

function makeSystemBlocks(systemPrompt: string): AnthropicTextBlock[] {
  return [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

function toAnthropicMessages(messages: TutorMessage[]): AnthropicMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

function extractText(payload: AnthropicResponsePayload): string {
  const textBlock = payload.content?.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function normalizeMessagesForCache(messages: TutorMessage[]): Array<{
  role: 'user' | 'assistant';
  content: string;
}> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
}

function resolveModelFromApiModel(
  apiModel: string | undefined,
  fallback: ClaudeModel,
): ClaudeModel {
  const normalized = (apiModel ?? '').toLowerCase();
  if (normalized.includes('opus')) return 'opus';
  if (normalized.includes('sonnet')) return 'sonnet';
  return fallback;
}

function makeBudgetErrorMessage(monthlyCostUsd: number, budgetUsd: number): string {
  return `Monthly AI budget reached ($${monthlyCostUsd.toFixed(2)} / $${budgetUsd.toFixed(
    2,
  )}). Disable hard stop or raise budget in Settings.`;
}

function makeCooldownErrorMessage(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `Please wait ${seconds}s before the next AI call (cooldown enabled).`;
}

async function countInputTokens(args: {
  apiKey: string;
  modelId: string;
  system: AnthropicTextBlock[];
  messages: AnthropicMessage[];
}): Promise<number | null> {
  try {
    const response = await fetch(ANTHROPIC_COUNT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': args.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: args.modelId,
        system: args.system,
        messages: args.messages,
      }),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { input_tokens?: number };
    return payload.input_tokens ?? null;
  } catch {
    return null;
  }
}

async function fitMessagesToTokenBudget(args: {
  apiKey: string;
  modelId: string;
  role: TutorRole;
  system: AnthropicTextBlock[];
  messages: AnthropicMessage[];
}): Promise<{
  messages: AnthropicMessage[];
  inputTokenCount: number | null;
  contextTrimmed: boolean;
}> {
  const tokenCap = INPUT_TOKEN_CAP_BY_ROLE[args.role];
  let working = [...args.messages];
  let contextTrimmed = false;
  let tokenCount = await countInputTokens({
    apiKey: args.apiKey,
    modelId: args.modelId,
    system: args.system,
    messages: working,
  });

  // Keep trimming oldest turns until we're under cap or we reach minimal context.
  while (tokenCount !== null && tokenCount > tokenCap && working.length > 2) {
    working = working.slice(2);
    contextTrimmed = true;
    tokenCount = await countInputTokens({
      apiKey: args.apiKey,
      modelId: args.modelId,
      system: args.system,
      messages: working,
    });
  }

  if (contextTrimmed) {
    working = [
      {
        role: 'user',
        content:
          'Context note: earlier turns were trimmed for token budget. If you need missing context, ask for it before final conclusions.',
      },
      ...working,
    ];
  }

  return { messages: working, inputTokenCount: tokenCount, contextTrimmed };
}

async function sendAnthropicRequest(args: {
  apiKey: string;
  body: Record<string, unknown>;
  usePromptCaching: boolean;
}): Promise<AnthropicResponsePayload> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': args.apiKey,
    'anthropic-version': API_VERSION,
  };
  if (args.usePromptCaching) {
    baseHeaders['anthropic-beta'] = CACHE_BETA_HEADER;
  }

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(args.body),
    });
  } catch {
    throw new AiClientError(
      'Network error. Check your internet connection.',
      undefined,
      true,
    );
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const cacheIssue =
      args.usePromptCaching &&
      response.status === 400 &&
      (errorBody.includes('cache_control') || errorBody.includes('anthropic-beta'));
    if (cacheIssue) {
      // Fallback without prompt caching if account/region doesn't support it.
      const fallbackBody = JSON.parse(JSON.stringify(args.body)) as {
        system?: AnthropicTextBlock[] | string;
      };
      if (Array.isArray(fallbackBody.system)) {
        fallbackBody.system = fallbackBody.system.map((block) => ({
          type: 'text',
          text: block.text,
        }));
      }
      return sendAnthropicRequest({
        apiKey: args.apiKey,
        body: fallbackBody as unknown as Record<string, unknown>,
        usePromptCaching: false,
      });
    }

    if (response.status === 401) {
      throw new AiClientError('Invalid API key. Check your key in Settings.', 401);
    }
    if (response.status === 429) {
      throw new AiClientError('Rate limited. Wait a moment and try again.', 429, true);
    }
    if (response.status === 529) {
      throw new AiClientError(
        'Claude is temporarily overloaded. Try again shortly.',
        529,
        true,
      );
    }
    throw new AiClientError(`API error (${response.status}): ${errorBody}`, response.status);
  }

  return (await response.json()) as AnthropicResponsePayload;
}

async function runBudgetGuard(args: {
  model: ClaudeModel;
  role: TutorRole;
  inputTokenCount: number | null;
}): Promise<void> {
  const usageState = useUsageStore.getState();
  const status = usageState.getBudgetStatus();
  if (!usageState.hardStopAtBudget) return;
  if (status.overBudget) {
    throw new AiClientError(makeBudgetErrorMessage(status.monthlyCostUsd, status.budgetUsd));
  }

  const projectedInput = args.inputTokenCount ?? INPUT_TOKEN_CAP_BY_ROLE[args.role];
  const projectedOutput = MAX_TOKENS_BY_ROLE[args.role];
  const projectedCost = estimateCost(args.model, projectedInput, projectedOutput);
  if (status.monthlyCostUsd + projectedCost > status.budgetUsd) {
    throw new AiClientError(makeBudgetErrorMessage(status.monthlyCostUsd, status.budgetUsd));
  }
}

function resolveModelForBudget(requestedModel: ClaudeModel): {
  resolvedModel: ClaudeModel;
  autoDowngraded: boolean;
} {
  if (requestedModel !== 'opus') {
    return { resolvedModel: requestedModel, autoDowngraded: false };
  }

  const usageState = useUsageStore.getState();
  if (!usageState.autoDowngradeNearBudget) {
    return { resolvedModel: requestedModel, autoDowngraded: false };
  }

  const budget = usageState.getBudgetStatus();
  if (budget.percentUsed < usageState.autoDowngradeThresholdPct) {
    return { resolvedModel: requestedModel, autoDowngraded: false };
  }

  return { resolvedModel: 'sonnet', autoDowngraded: true };
}

function runCooldownGuard(): void {
  const usageState = useUsageStore.getState();
  const remainingMs = usageState.getCooldownRemainingMs();
  if (remainingMs > 0) {
    throw new AiClientError(makeCooldownErrorMessage(remainingMs));
  }
  usageState.markAiCallStart();
}

function buildTutorResponseCacheKey(args: {
  model: ClaudeModel;
  role: TutorRole;
  itemText: string;
  stackLabel: string;
  confidence: ConfidenceLevel;
  messages: TutorMessage[];
}): string {
  const payload = JSON.stringify({
    model: args.model,
    role: args.role,
    itemText: args.itemText.trim(),
    stackLabel: args.stackLabel.trim(),
    confidence: args.confidence,
    messages: normalizeMessagesForCache(args.messages),
  });
  return `resp_v1_${hashString(payload)}`;
}

export async function sendTutorMessage(options: AiRequestOptions): Promise<AiResponse> {
  const {
    apiKey,
    model,
    role,
    itemText,
    stackLabel,
    confidence,
    messages,
    allowResponseCache = true,
  } = options;

  if (!apiKey) {
    throw new AiClientError('No API key configured. Add your Claude API key in Settings.');
  }

  const { resolvedModel, autoDowngraded } = resolveModelForBudget(model);
  const modelId = CLAUDE_MODEL_IDS[resolvedModel];
  const shouldUseResponseCache = allowResponseCache && role !== 'comment-drafter';
  const responseCacheKey = shouldUseResponseCache
    ? buildTutorResponseCacheKey({
        model: resolvedModel,
        role,
        itemText,
        stackLabel,
        confidence,
        messages,
      })
    : null;

  if (responseCacheKey) {
    const cached = useTutorStore
      .getState()
      .getCachedResponse(responseCacheKey, RESPONSE_CACHE_TTL_MS);
    if (cached) {
      return {
        content: cached.content,
        model: cached.model,
        inputTokens: 0,
        outputTokens: 0,
        requestedModel: model,
        resolvedModel: resolveModelFromApiModel(cached.model, resolvedModel),
        autoDowngraded,
        cached: true,
      };
    }
  }

  runCooldownGuard();

  const systemPrompt = getTutorSystemPrompt({
    role,
    itemText,
    stackLabel,
    confidenceLevel: confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
  });
  const systemBlocks = makeSystemBlocks(systemPrompt);

  const fit = await fitMessagesToTokenBudget({
    apiKey,
    modelId,
    role,
    system: systemBlocks,
    messages: toAnthropicMessages(messages),
  });

  await runBudgetGuard({
    model: resolvedModel,
    role,
    inputTokenCount: fit.inputTokenCount,
  });

  const baseBody = {
    model: modelId,
    max_tokens: MAX_TOKENS_BY_ROLE[role],
    system: systemBlocks,
    messages: fit.messages,
  };

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalContent = '';
  let stopReason: string | undefined;

  const initial = await sendAnthropicRequest({
    apiKey,
    body: baseBody,
    usePromptCaching: true,
  });
  finalContent = extractText(initial);
  totalInputTokens += initial.usage?.input_tokens ?? 0;
  totalOutputTokens += initial.usage?.output_tokens ?? 0;
  stopReason = initial.stop_reason;

  let continuationTurns = 0;
  while (stopReason === 'max_tokens' && continuationTurns < MAX_CONTINUATION_TURNS) {
    continuationTurns += 1;
    const continueMessages = [
      ...fit.messages,
      { role: 'assistant' as const, content: finalContent },
      {
        role: 'user' as const,
        content:
          'Continue exactly where you stopped. Do not repeat previous text. Include any remaining key details concisely.',
      },
    ];

    const continuation = await sendAnthropicRequest({
      apiKey,
      body: {
        model: modelId,
        max_tokens: Math.round(MAX_TOKENS_BY_ROLE[role] * 0.7),
        system: systemBlocks,
        messages: continueMessages,
      },
      usePromptCaching: true,
    });

    const continuationText = extractText(continuation);
    if (continuationText.trim()) {
      finalContent = `${finalContent}\n${continuationText}`.trim();
    }
    totalInputTokens += continuation.usage?.input_tokens ?? 0;
    totalOutputTokens += continuation.usage?.output_tokens ?? 0;
    stopReason = continuation.stop_reason;
  }

  if (responseCacheKey) {
    useTutorStore.getState().setCachedResponse({
      key: responseCacheKey,
      content: finalContent,
      model: initial.model ?? modelId,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cachedAt: new Date().toISOString(),
    });
  }

  const returnedModel = initial.model ?? modelId;

  return {
    content: finalContent,
    model: returnedModel,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    requestedModel: model,
    resolvedModel: resolveModelFromApiModel(returnedModel, resolvedModel),
    autoDowngraded,
    cached: false,
  };
}
