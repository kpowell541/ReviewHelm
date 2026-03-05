import { applyDecorators, SetMetadata } from '@nestjs/common';
import type { AiFeature } from '@prisma/client';
import { IS_AI_ENDPOINT_KEY } from '../auth/constants';

export const AI_FEATURE_KEY = 'aiFeature';

export const AiEndpoint = (feature: AiFeature) =>
  applyDecorators(
    SetMetadata(IS_AI_ENDPOINT_KEY, true),
    SetMetadata(AI_FEATURE_KEY, feature),
  );
