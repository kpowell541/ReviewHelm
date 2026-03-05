import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  getPolicy() {
    return {
      retainDiffDays: this.config.get('RETAIN_DIFF_DAYS'),
      retainCalibrationDays: this.config.get('RETAIN_CALIBRATION_DAYS'),
      retainAuditDays: this.config.get('RETAIN_AUDIT_DAYS'),
    };
  }

  async runCleanup(input: { dryRun?: boolean }) {
    const policy = this.getPolicy();
    const dryRun = input.dryRun ?? true;
    const now = Date.now();

    const diffCutoff = new Date(now - policy.retainDiffDays * 24 * 60 * 60 * 1000);
    const calibrationCutoff = new Date(
      now - policy.retainCalibrationDays * 24 * 60 * 60 * 1000,
    );
    const auditCutoff = new Date(now - policy.retainAuditDays * 24 * 60 * 60 * 1000);

    const [diffCount, calibrationCount, auditCount] = await Promise.all([
      this.prisma.diffArtifact.count({
        where: {
          createdAt: { lt: diffCutoff },
        },
      }),
      this.prisma.commentFeedback.count({
        where: {
          createdAt: { lt: calibrationCutoff },
        },
      }),
      this.prisma.auditEvent.count({
        where: {
          createdAt: { lt: auditCutoff },
        },
      }),
    ]);

    if (!dryRun) {
      await this.prisma.$transaction([
        this.prisma.diffArtifact.deleteMany({
          where: { createdAt: { lt: diffCutoff } },
        }),
        this.prisma.commentFeedback.deleteMany({
          where: { createdAt: { lt: calibrationCutoff } },
        }),
        this.prisma.auditEvent.deleteMany({
          where: { createdAt: { lt: auditCutoff } },
        }),
      ]);
    }

    return {
      dryRun,
      policy,
      targets: {
        diffArtifacts: diffCount,
        commentFeedback: calibrationCount,
        auditEvents: auditCount,
      },
      cutoffs: {
        diffBefore: diffCutoff.toISOString(),
        calibrationBefore: calibrationCutoff.toISOString(),
        auditBefore: auditCutoff.toISOString(),
      },
    };
  }
}
