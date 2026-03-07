import { ApiError, api } from '../api/client';
import { useUsageStore } from '../store/useUsageStore';
import { useTutorStore } from '../store/useTutorStore';
import { estimateCost } from './pricing';
import type {
  ClaudeModel,
  TutorMessage,
  TutorRole,
  ConfidenceLevel,
  AiFeature,
} from '../data/types';

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

interface TutorApiResponse {
  content: string;
  requestedModel: ClaudeModel;
  resolvedModel: string;
  autoDowngraded: boolean;
  autoEscalated?: boolean;
  cached: boolean;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cooldownRemainingMs: number;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiRequestOptions {
  apiKey?: string;
  sessionId?: string | null;
  feature: AiFeature;
  itemId: string;
  model: ClaudeModel;
  role: TutorRole;
  itemText: string;
  stackLabel: string;
  confidence: ConfidenceLevel;
  messages: TutorMessage[];
  allowResponseCache?: boolean;
  allowEscalation?: boolean;
  diffId?: string;
  diffText?: string;
  commentStyleProfileId?: string;
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

function resolveModelFromApiModel(apiModel: string, fallback: ClaudeModel): ClaudeModel {
  const normalized = (apiModel ?? '').toLowerCase();
  if (normalized.includes('opus')) return 'opus';
  if (normalized.includes('sonnet')) return 'sonnet';
  return fallback;
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

function makeCooldownErrorMessage(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `Please wait ${seconds}s before the next AI call (cooldown enabled).`;
}

function makeBudgetErrorMessage(monthlyCostUsd: number, budgetUsd: number): string {
  return `Monthly AI budget reached ($${monthlyCostUsd.toFixed(2)} / $${budgetUsd.toFixed(
    2,
  )}). Disable hard stop or raise budget in Settings.`;
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

function normalizeMessages(messages: TutorMessage[]): AnthropicMessage[] {
  return messages.map((msg) => ({ role: msg.role, content: msg.content }));
}

function runCooldownGuard(): void {
  const usageState = useUsageStore.getState();
  const remainingMs = usageState.getCooldownRemainingMs();
  if (remainingMs > 0) {
    throw new AiClientError(makeCooldownErrorMessage(remainingMs));
  }
  usageState.markAiCallStart();
}

function runBudgetGuard(args: {
  model: ClaudeModel;
  role: TutorRole;
  inputTokenCount: number | null;
}): void {
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

function buildTutorResponseCacheKey(args: {
  model: ClaudeModel;
  role: TutorRole;
  itemId: string;
  itemText: string;
  stackLabel: string;
  confidence: ConfidenceLevel;
  messages: TutorMessage[];
}): string {
  const payload = JSON.stringify({
    model: args.model,
    role: args.role,
    itemId: args.itemId,
    itemText: args.itemText.trim(),
    stackLabel: args.stackLabel.trim(),
    confidence: args.confidence,
    messages: normalizeMessagesForCache(args.messages),
  });
  return `resp_v1_${hashString(payload)}`;
}

function makeRequestBody(options: AiRequestOptions): Record<string, unknown> {
  const messageBody = normalizeMessages(options.messages);
  return {
    sessionId: options.sessionId ?? null,
    feature: options.feature,
    model: options.model,
    role: options.role,
    itemId: options.itemId,
    itemText: options.itemText,
    stackLabel: options.stackLabel,
    confidence: options.confidence,
    messages: messageBody,
    allowEscalation: options.allowEscalation,
    diffId: options.diffId,
    diffText: options.diffText,
    commentStyleProfileId: options.commentStyleProfileId,
  };
}

export async function sendTutorMessage(options: AiRequestOptions): Promise<AiResponse> {
  const {
    apiKey,
    model,
    role,
    itemId,
    itemText,
    stackLabel,
    confidence,
    messages,
    allowResponseCache = true,
    feature,
  } = options;

  if (!itemId) {
    throw new AiClientError('AI request requires checklist item id.');
  }

  const { resolvedModel, autoDowngraded } = resolveModelForBudget(model);
  const shouldUseResponseCache = allowResponseCache && role !== 'comment-drafter';
  const responseCacheKey = shouldUseResponseCache
    ? buildTutorResponseCacheKey({
        model: resolvedModel,
        role,
        itemId,
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

  const body = makeRequestBody({
    ...options,
    model: resolvedModel,
  });
  if (apiKey) {
    body.apiKey = apiKey;
  }

  const modelUsedForBudget = resolvedModel;
  runBudgetGuard({
    model: modelUsedForBudget,
    role,
    inputTokenCount: null,
  });

  let response: TutorApiResponse;
  try {
    response = await api.post<TutorApiResponse>('/ai/tutor', {
      ...body,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        throw new AiClientError('Invalid API key. Check your settings.', 401, false);
      }
      if (err.status === 429) {
        throw new AiClientError('Rate limited. Wait a moment and try again.', 429, true);
      }
      throw new AiClientError(`AI request failed (${err.status}): ${err.message}`, err.status);
    }
    throw new AiClientError('AI request failed. Check your network connection.');
  }

  if (!response?.content) {
    throw new AiClientError('AI response did not include content.');
  }

  if (responseCacheKey && !response.cached) {
    useTutorStore.getState().setCachedResponse({
      key: responseCacheKey,
      content: response.content,
      model: response.resolvedModel || `${resolvedModel}-v1`,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cachedAt: new Date().toISOString(),
    });
  }

  return {
    content: response.content,
    model: response.resolvedModel ?? `${resolvedModel}-v1`,
    inputTokens: response.inputTokens ?? 0,
    outputTokens: response.outputTokens ?? 0,
    requestedModel: response.requestedModel ?? model,
    resolvedModel: resolveModelFromApiModel(response.resolvedModel ?? resolvedModel, resolvedModel),
    autoDowngraded: response.autoDowngraded ?? autoDowngraded,
    cached: !!response.cached,
  };
}
