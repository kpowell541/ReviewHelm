import {
  ClaudeModel,
  CLAUDE_MODEL_IDS,
  TutorMessage,
  TutorRole,
  ConfidenceLevel,
  CONFIDENCE_LABELS,
} from '../data/types';
import { getTutorSystemPrompt } from './prompts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MAX_TOKENS = 2048;

export interface AiRequestOptions {
  apiKey: string;
  model: ClaudeModel;
  role: TutorRole;
  /** The checklist item text the user is asking about */
  itemText: string;
  /** The tech stack context (e.g., "Go", "Java/Kotlin + Protobuf") */
  stackLabel: string;
  /** User's current confidence on this item */
  confidence: ConfidenceLevel;
  /** Conversation history for multi-turn chat */
  messages: TutorMessage[];
}

export interface AiResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
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

/**
 * Send a message to the Claude API and get a response.
 * Uses direct fetch for React Native compatibility.
 */
export async function sendTutorMessage(
  options: AiRequestOptions,
): Promise<AiResponse> {
  const { apiKey, model, role, itemText, stackLabel, confidence, messages } =
    options;

  if (!apiKey) {
    throw new AiClientError(
      'No API key configured. Add your Claude API key in Settings.',
    );
  }

  const modelId = CLAUDE_MODEL_IDS[model];
  const systemPrompt = getTutorSystemPrompt({
    role,
    itemText,
    stackLabel,
    confidenceLevel: confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
  });

  // Convert TutorMessages to Anthropic message format
  const apiMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const body = {
    model: modelId,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: apiMessages,
  };

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AiClientError(
      'Network error. Check your internet connection.',
      undefined,
      true,
    );
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new AiClientError(
        'Invalid API key. Check your key in Settings.',
        401,
      );
    }
    if (response.status === 429) {
      throw new AiClientError(
        'Rate limited. Wait a moment and try again.',
        429,
        true,
      );
    }
    if (response.status === 529) {
      throw new AiClientError(
        'Claude is temporarily overloaded. Try again shortly.',
        529,
        true,
      );
    }
    throw new AiClientError(
      `API error (${response.status}): ${errorBody}`,
      response.status,
    );
  }

  const data = await response.json();

  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === 'text',
  );

  return {
    content: textBlock?.text ?? '',
    model: data.model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

/**
 * Estimate monthly cost based on accumulated token usage.
 */
export function estimateCost(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates: Record<ClaudeModel, { input: number; output: number }> = {
    sonnet: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    opus: { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  };
  const rate = rates[model];
  return inputTokens * rate.input + outputTokens * rate.output;
}
