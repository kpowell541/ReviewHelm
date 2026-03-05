import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_ADMIN_KEY } from './constants';
import type { AuthenticatedUser } from './types';

interface RequestLike {
  user?: AuthenticatedUser;
  requestId?: string;
  path?: string;
  method?: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isAdminRoute = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isAdminRoute) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestLike>();
    if (req.user?.isAdmin) {
      return true;
    }

    console.warn(
      JSON.stringify({
        level: 'warn',
        type: 'authz_failure',
        reason: 'admin_required',
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        userId: req.user?.supabaseUserId,
        at: new Date().toISOString(),
      }),
    );
    throw new ForbiddenException('Admin role required');
  }
}
