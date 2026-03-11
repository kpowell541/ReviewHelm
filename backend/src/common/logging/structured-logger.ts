type LogLevel = 'info' | 'warn' | 'error';

const CONSOLE_METHOD: Record<LogLevel, 'info' | 'warn' | 'error'> = {
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export function structuredLog(
  level: LogLevel,
  type: string,
  data: Record<string, unknown>,
): void {
  const payload = { level, type, ...data, at: new Date().toISOString() };
  console[CONSOLE_METHOD[level]](JSON.stringify(payload));
}

export const slog = {
  info: (type: string, data: Record<string, unknown>) => structuredLog('info', type, data),
  warn: (type: string, data: Record<string, unknown>) => structuredLog('warn', type, data),
  error: (type: string, data: Record<string, unknown>) => structuredLog('error', type, data),
};
