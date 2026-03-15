type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogContext {
  [key: string]: unknown;
}

export function createLogger(level: LogLevel) {
  const threshold = LEVEL_RANK[level];

  const log = (currentLevel: LogLevel, message: string, context: LogContext = {}) => {
    if (LEVEL_RANK[currentLevel] < threshold) return;
    const payload = {
      level: currentLevel,
      message,
      time: new Date().toISOString(),
      ...context,
    };
    const line = JSON.stringify(payload);
    if (currentLevel === 'error') {
      console.error(line);
      return;
    }
    if (currentLevel === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  };

  return {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),
  };
}
