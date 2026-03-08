import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminOnly } from '../../common/auth/admin.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/types';
import type { AppEnv } from '../../config/env.schema';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@AdminOnly()
export class AdminDashboardController {
  private readonly allowedEmails: Set<string>;

  constructor(
    private readonly dashboardService: AdminDashboardService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.allowedEmails = new Set(
      config
        .get('ADMIN_DASHBOARD_ALLOWED_EMAILS')
        .split(',')
        .map((email: string) => email.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  @Get('overview')
  async getOverview(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    const email = (user.email ?? '').trim().toLowerCase();
    if (!email || !this.allowedEmails.has(email)) {
      throw new ForbiddenException('Admin dashboard access is restricted.');
    }
    return this.dashboardService.getOverview();
  }
}
