import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { validateEnv } from './config/env.schema';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { AdminGuard } from './common/auth/admin.guard';
import { RedisModule } from './common/redis/redis.module';
import { RateLimitGuard } from './common/redis/rate-limit.guard';
import { MeModule } from './me/me.module';
import { BudgetModule } from './common/budget/budget.module';
import { BudgetGuard } from './common/budget/budget.guard';
import { UsageModule } from './usage/usage.module';
import { AdminSecurityModule } from './admin/security/admin-security.module';
import { AuditModule } from './common/audit/audit.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { SessionsModule } from './sessions/sessions.module';
import { GapsModule } from './gaps/gaps.module';
import { LearnModule } from './learn/learn.module';
import { AiModule } from './ai/ai.module';
import { BackupsModule } from './backups/backups.module';
import { ExportsModule } from './exports/exports.module';
import { AdminChecklistsModule } from './admin/checklists/admin-checklists.module';
import { DiffsModule } from './diffs/diffs.module';
import { RiskModule } from './risk/risk.module';
import { CommentProfilesModule } from './comment-profiles/comment-profiles.module';
import { CalibrationModule } from './calibration/calibration.module';
import { ComplianceModule } from './compliance/compliance.module';
import { AdminCiModule } from './admin/ci/admin-ci.module';
import { AdminMaintenanceModule } from './admin/maintenance/admin-maintenance.module';
import { TrackedPRsModule } from './tracked-prs/tracked-prs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    BudgetModule,
    AuditModule,
    HealthModule,
    MeModule,
    UsageModule,
    ChecklistsModule,
    SessionsModule,
    GapsModule,
    LearnModule,
    AiModule,
    DiffsModule,
    RiskModule,
    CommentProfilesModule,
    CalibrationModule,
    ComplianceModule,
    TrackedPRsModule,
    BackupsModule,
    ExportsModule,
    AdminSecurityModule,
    AdminChecklistsModule,
    AdminCiModule,
    AdminMaintenanceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BudgetGuard,
    },
  ],
})
export class AppModule {}
