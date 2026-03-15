import * as Sentry from '@sentry/react';
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const IS_WEB = Platform.OS === 'web';

let initialized = false;

/**
 * Initialize Sentry for frontend error reporting.
 *
 * Only initializes on web (the active target platform) and only when a DSN
 * is configured. Silently no-ops otherwise.
 *
 * Privacy: no PII is sent by default. User email/id are NOT attached.
 * Only error messages, stack traces, and route context are captured.
 */
export function initSentry(): void {
  if (initialized || !IS_WEB || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: getEnvironment(),
    // Capture unhandled errors and promise rejections
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Sample 100% of errors in staging, tune down for production
    sampleRate: 1.0,
    // Performance tracing — light sampling for staging
    tracesSampleRate: 0.1,
    // Strip PII from breadcrumbs and events
    beforeSend(event) {
      // Remove user IP
      if (event.user) {
        delete event.user.ip_address;
      }
      // Remove cookies from request context
      if (event.request) {
        delete event.request.cookies;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Redact auth-related URLs from breadcrumbs
      if (breadcrumb.data?.url && typeof breadcrumb.data.url === 'string') {
        const url = breadcrumb.data.url;
        if (url.includes('/auth/') || url.includes('token') || url.includes('cognito')) {
          breadcrumb.data.url = '[REDACTED_AUTH_URL]';
        }
      }
      return breadcrumb;
    },
  });

  initialized = true;
}

/**
 * Capture an error in Sentry with optional context.
 * Safe to call even if Sentry is not initialized.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;

  if (error instanceof Error) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    Sentry.captureMessage(String(error), {
      level: 'error',
      extra: context,
    });
  }
}

/**
 * Set the current route context for Sentry breadcrumbs.
 */
export function setRouteContext(routeName: string): void {
  if (!initialized) return;
  Sentry.setTag('route', routeName);
}

function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    if (hostname.includes('staging')) return 'staging';
  }
  return 'production';
}
