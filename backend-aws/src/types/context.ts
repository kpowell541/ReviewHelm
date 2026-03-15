import type { ContextVariableMap } from 'hono';
import type { AppEnv } from '../config/env';
import type { createLogger } from '../lib/logger';
import type { AuthPrincipal } from '../auth/types';

export type AppLogger = ReturnType<typeof createLogger>;

declare module 'hono' {
  interface ContextVariableMap {
    env: AppEnv;
    logger: AppLogger;
    requestId: string;
    principal: AuthPrincipal;
  }
}
