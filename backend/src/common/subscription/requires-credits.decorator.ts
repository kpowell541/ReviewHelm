import { SetMetadata } from '@nestjs/common';
import { REQUIRES_CREDITS_KEY } from '../auth/constants';

export const RequiresCredits = () => SetMetadata(REQUIRES_CREDITS_KEY, true);
