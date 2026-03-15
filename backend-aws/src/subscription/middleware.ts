import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getTierInfo, hasTierAccess, type SubscriptionTier } from './service';

export function requireTier(requiredTier: SubscriptionTier): MiddlewareHandler {
  return async (c, next) => {
    const principal = c.get('principal');
    const tierInfo = await getTierInfo(principal);
    if (!hasTierAccess(tierInfo.effectiveTier, requiredTier)) {
      throw new HTTPException(403, { message: `${requiredTier} tier is required.` });
    }
    await next();
  };
}
