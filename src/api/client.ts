import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  '';

const API_BASE_PATH =
  Constants.expoConfig?.extra?.apiBasePath ??
  process.env.EXPO_PUBLIC_API_BASE_PATH ??
  '';

const BASE_URL = `${API_BASE_URL}${API_BASE_PATH}`;

function assertBaseUrl(): void {
  if (!BASE_URL) {
    throw new ApiError(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in your .env file.',
      0,
      'MISSING_CONFIG',
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
  assertBaseUrl();
  const { method = 'GET', body, headers = {} } = options;
  const url = `${BASE_URL}${path}`;

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
