import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsService } from '../../sessions/sessions.service';
import type { CiPolicyCheckDto } from './dto/ci-policy-check.dto';

@Injectable()
export class AdminCiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
  ) {}

  async runPolicyCheck(input: CiPolicyCheckDto) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId: input.userSupabaseUserId },
      select: { supabaseUserId: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Target user not found');
    }

    const summary = await this.sessionsService.getSessionSummary(
      {
        supabaseUserId: user.supabaseUserId,
        email: user.email ?? undefined,
        rawClaims: {},
      },
      input.sessionId,
    );
    const thresholds = {
      minCoverage: input.minCoverage ?? 70,
      minConfidence: input.minConfidence ?? 60,
      maxBlockers: input.maxBlockers ?? 0,
      maxMajors: input.maxMajors ?? 3,
    };

    const reasons: string[] = [];
    if (summary.scores.coverage < thresholds.minCoverage) {
      reasons.push(
        `Coverage ${summary.scores.coverage}% below threshold ${thresholds.minCoverage}%`,
      );
    }
    if (summary.scores.confidence < thresholds.minConfidence) {
      reasons.push(
        `Confidence ${summary.scores.confidence}% below threshold ${thresholds.minConfidence}%`,
      );
    }
    if (summary.scores.issuesBySeverity.blocker > thresholds.maxBlockers) {
      reasons.push(
        `Blocker issues ${summary.scores.issuesBySeverity.blocker} exceed threshold ${thresholds.maxBlockers}`,
      );
    }
    if (summary.scores.issuesBySeverity.major > thresholds.maxMajors) {
      reasons.push(
        `Major issues ${summary.scores.issuesBySeverity.major} exceed threshold ${thresholds.maxMajors}`,
      );
    }

    return {
      pass: reasons.length === 0,
      reasons,
      thresholds,
      metrics: summary.scores,
    };
  }
}
