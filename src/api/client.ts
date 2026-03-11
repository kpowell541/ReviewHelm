import { useAuthStore } from '../store/useAuthStore';
import { isSecureWebUrl } from '../utils/urlSecurity';
import { getDeviceId } from '../utils/deviceId';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const API_BASE_PATH = process.env.EXPO_PUBLIC_API_BASE_PATH ?? '';
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_GET_RETRIES = 1;
const RETRY_DELAY_MS = 200;
const MAX_REQUEST_BODY_BYTES = 1_048_576;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

function getBaseUrl(): string {
  return `${API_BASE_URL}${API_BASE_PATH}`;
}

function assertBaseUrl(baseUrl: string): void {
  if (!baseUrl) {
    throw new ApiError(
      'API base URL is not configured. Ensure Infisical secrets are loaded.',
      0,
      'MISSING_CONFIG',
    );
  }
  if (typeof window !== 'undefined' && !isSecureWebUrl(baseUrl)) {
    throw new ApiError(
      'API base URL must use HTTPS on web (except localhost).',
      0,
      'INSECURE_API_URL',
    );
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  /** Skip auth header (for public endpoints) */
  public?: boolean;
  timeoutMs?: number;
  retries?: number;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  assertBaseUrl(baseUrl);
  if (!path.startsWith('/')) {
    throw new ApiError('API request path must start with "/"', 0, 'INVALID_REQUEST_PATH');
  }
  if (/[\r\n]/.test(path) || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path) || path.startsWith('//')) {
    throw new ApiError('API request path must be a relative path', 0, 'INVALID_REQUEST_PATH');
  }

  const {
    method = 'GET',
    body,
    headers = {},
    idempotencyKey,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries,
  } = options;
  const url = `${baseUrl}${path}`;
  const maxAttempts = Math.max(1, 1 + (retries ?? (method === 'GET' ? DEFAULT_GET_RETRIES : 0)));

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-ID': getDeviceId(),
    ...headers,
  };
  if (idempotencyKey) {
    requestHeaders['Idempotency-Key'] = idempotencyKey;
  }
  let requestBody: string | undefined;
  if (body !== undefined) {
    try {
      requestBody = JSON.stringify(body);
    } catch {
      throw new ApiError('Unable to serialize request payload', 0, 'INVALID_REQUEST_BODY');
    }
    if (new TextEncoder().encode(requestBody).length > MAX_REQUEST_BODY_BYTES) {
      throw new ApiError('Request payload is too large', 0, 'REQUEST_BODY_TOO_LARGE');
    }
  }

  if (!options.public) {
    const token = await useAuthStore.getState().getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: abortController.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        let errorMessage = `Request failed: ${response.status}`;
        let errorCode: string | undefined;
        const errorText = await response.text().catch(() => '');
        try {
          const errorBody = errorText ? (JSON.parse(errorText) as Record<string, unknown>) : {};
          errorMessage = (typeof errorBody.message === 'string' && errorBody.message.trim().length > 0
            ? errorBody.message
            : errorMessage) as string;
          errorCode =
            typeof errorBody.code === 'string' && errorBody.code.length > 0
              ? errorBody.code
              : undefined;
        } catch {
          // Use default error message
        }

        if (
          errorCode === 'REGION_NOT_SUPPORTED' &&
          typeof window !== 'undefined' &&
          window.location.pathname !== '/region-unavailable'
        ) {
          window.location.replace('/region-unavailable');
        }

        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < maxAttempts - 1) {
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        throw new ApiError(errorMessage, response.status, errorCode);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const responseText = await response.text();
      if (!responseText) {
        return undefined as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch {
        throw new ApiError(
          `Response body was not valid JSON (HTTP ${response.status})`,
          response.status,
          'INVALID_RESPONSE_JSON',
        );
      }
    } catch (error) {
      clearTimeout(timeout);
      if (
        error instanceof ApiError
      ) {
        throw error;
      }

      lastError = error instanceof Error
        ? error
        : new Error('Request failed');

      if (attempt < maxAttempts - 1 && isRetryableNetworkError(lastError)) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      throw lastError instanceof Error
        ? new ApiError(lastError.message, 0, 'REQUEST_FAILED')
        : new ApiError('Request failed', 0, 'REQUEST_FAILED');
    }
  }

  throw new ApiError(
    lastError?.message ?? 'Request failed after retries',
    0,
    'REQUEST_RETRY_EXHAUSTED',
  );
}

function isRetryableNetworkError(error: Error): boolean {
  if (error.name === 'AbortError') {
    return true;
  }
  if (error.name !== 'TypeError') {
    return false;
  }
  const typedError = error as Error & {
    code?: string;
    cause?: { code?: string; message?: string };
  };
  const candidateCodes = [
    typedError.code,
    typeof typedError.cause === 'object' && typedError.cause ? typedError.cause.code : undefined,
  ].filter((entry): entry is string => typeof entry === 'string');

  if (candidateCodes.some((code) => RETRYABLE_NETWORK_ERROR_CODES.has(code.toLowerCase()))) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
}

const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'enotfound',
  'econnreset',
  'econnrefused',
  'econnaborted',
  'etimedout',
  'ehostunreach',
  'enetunreach',
  'und_err_connect_timeout',
  'und_err_headers_timeout',
  'und_err_body_timeout',
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
