import { SetMetadata } from '@nestjs/common';
import { IS_ADMIN_KEY } from './constants';

export const AdminOnly = () => SetMetadata(IS_ADMIN_KEY, true);
