import { SetMetadata } from '@nestjs/common';
import type { SubscriptionTier } from '@prisma/client';
import { REQUIRED_TIER_KEY } from '../auth/constants';

export const RequiresTier = (tier: SubscriptionTier) =>
  SetMetadata(REQUIRED_TIER_KEY, tier);
