import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const API_BASE_PATH = process.env.EXPO_PUBLIC_API_BASE_PATH ?? '';

function getBaseUrl(): string {
  return `${API_BASE_URL}${API_BASE_PATH}`;
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
}

function isSecureWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && isLocalHost(parsed.hostname);
  } catch {
    return false;
  }
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
  /** Skip auth header (for public endpoints) */
  public?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  assertBaseUrl(baseUrl);
  const { method = 'GET', body, headers = {} } = options;
  const url = `${baseUrl}${path}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!options.public) {
    const token = await useAuthStore.getState().getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    let errorCode: string | undefined;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorMessage;
      errorCode = errorBody.code;
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

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Convenience wrappers
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
