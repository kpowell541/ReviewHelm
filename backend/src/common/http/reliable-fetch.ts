export interface ReliableFetchOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  baseRetryDelayMs?: number;
  retryableStatuses?: number[];
  retryOnNetworkErrorsOnly?: boolean;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

export async function reliableFetch(
  input: string | URL,
  init: RequestInit = {},
  options: ReliableFetchOptions = {},
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = options.baseRetryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const retryableStatuses = options.retryableStatuses ?? DEFAULT_RETRYABLE_STATUSES;
  const retryOnlyNetworkErrors = options.retryOnNetworkErrorsOnly ?? false;

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: abortController.signal,
      });
      clearTimeout(timeout);

      if (
        attempt < maxAttempts &&
        !retryOnlyNetworkErrors &&
        retryableStatuses.includes(response.status)
      ) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      if (!(error instanceof Error)) {
        lastError = new Error('Unknown network error');
      } else {
        lastError = error;
      }

      const isRetryable = isRetryableNetworkError(lastError);
      const shouldRetry = attempt < maxAttempts && isRetryable;
      if (!shouldRetry) {
        throw lastError;
      }

      await sleep(baseDelayMs * Math.pow(2, attempt - 1));
      continue;
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

function isRetryableNetworkError(error: Error): boolean {
  if (error.name === 'AbortError') {
    return true;
  }
  if (!(error instanceof TypeError)) {
    return false;
  }

  const typed = error as Error & {
    cause?: { code?: string; message?: string };
    code?: string;
  };
  const codes = [
    typed.code,
    typeof typed.cause === 'object' && typed.cause ? typed.cause.code : undefined,
  ]
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.toLowerCase());

  if (codes.some((code) => NETWORK_ERROR_CODES.has(code))) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
}

const NETWORK_ERROR_CODES = new Set<string>([
  'econnreset',
  'econnrefused',
  'econnaborted',
  'enotfound',
  'eai_again',
  'etimedout',
  'enotconn',
  'ehostunreach',
  'enetunreach',
  'enetworkunreachable',
  'ehostdown',
  'ecouldnotresolve',
  'etoo_many_redirects',
  'und_err_connect_timeout',
  'und_err_headers_timeout',
  'und_err_body_timeout',
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
