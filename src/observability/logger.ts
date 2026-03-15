import { Platform } from 'react-native';

/**
 * Structured logger that outputs Splunk-compatible JSON.
 *
 * Every log entry includes a consistent set of fields so Splunk can
 * index and search without custom parsing rules:
 *
 *   { timestamp, level, message, component, ...extra }
 *
 * On web, logs go to console (picked up by browser devtools and any
 * log forwarding agent). The JSON format means Splunk's HEC or
 * universal forwarder can ingest these directly.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component: string;
  platform: string;
  [key: string]: unknown;
}

const IS_DEV =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

function emit(entry: LogEntry): void {
  const json = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(json);
      break;
    case 'warn':
      console.warn(json);
      break;
    case 'debug':
      if (IS_DEV) console.debug(json);
      break;
    default:
      console.log(json);
  }
}

function createEntry(
  level: LogLevel,
  component: string,
  message: string,
  extra?: Record<string, unknown>,
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    component,
    platform: Platform.OS,
  };

  if (extra) {
    // Flatten extra fields into the entry, but never overwrite reserved keys
    for (const [key, value] of Object.entries(extra)) {
      if (key === 'timestamp' || key === 'level' || key === 'message' || key === 'component' || key === 'platform') {
        entry[`_${key}`] = value;
      } else {
        entry[key] = value;
      }
    }
  }

  return entry;
}

/**
 * Create a scoped logger for a specific component/module.
 *
 * Usage:
 *   const log = createLogger('auth');
 *   log.info('sign-in succeeded', { provider: 'google' });
 *   log.error('token refresh failed', { errorCode: 'EXPIRED' });
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      emit(createEntry('debug', component, message, extra)),

    info: (message: string, extra?: Record<string, unknown>) =>
      emit(createEntry('info', component, message, extra)),

    warn: (message: string, extra?: Record<string, unknown>) =>
      emit(createEntry('warn', component, message, extra)),

    error: (message: string, extra?: Record<string, unknown>) =>
      emit(createEntry('error', component, message, extra)),
  };
}
