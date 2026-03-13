import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertTrackedPRDto } from './dto/upsert-tracked-pr.dto';

type TrackedPRRecord = Awaited<ReturnType<PrismaService['trackedPR']['create']>>;

@Injectable()
export class TrackedPRsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPRs(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const rows = await this.prisma.trackedPR.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async getPR(authUser: AuthenticatedUser, prId: string) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const row = await this.prisma.trackedPR.findFirst({
      where: { id: prId, userId: user.id },
    });
    if (!row) throw new NotFoundException('PR not found');
    return this.toResponse(row);
  }

  async upsertPR(authUser: AuthenticatedUser, input: UpsertTrackedPRDto) {
    const user = await upsertUserFromAuth(this.prisma, authUser);

    const data: Prisma.TrackedPRUncheckedCreateInput = {
      id: input.id,
      userId: user.id,
      title: input.title,
      url: input.url ?? null,
      status: input.status,
      role: input.role,
      priority: input.priority,
      isEmergency: input.isEmergency,
      size: input.size ?? null,
      repo: input.repo ?? null,
      prNumber: input.prNumber ?? null,
      prAuthor: input.prAuthor ?? null,
      dependencies: (input.dependencies ?? []) as Prisma.JsonArray,
      ciPassing: input.ciPassing ?? null,
      linkedSessionId: input.linkedSessionId ?? null,
      notes: input.notes ?? null,
      acceptanceOutcome: input.acceptanceOutcome ?? null,
      reviewOutcome: input.reviewOutcome ?? null,
      selfReviewed: input.selfReviewed ?? null,
      reviewRoundCount: input.reviewRoundCount ?? 0,
      changesEverNeeded: input.changesEverNeeded ?? null,
      reReviewed: input.reReviewed ?? null,
      missCategory: input.missCategory ?? null,
      missNote: input.missNote ?? null,
      resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
      lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : null,
      archivedAt: input.archivedAt ? new Date(input.archivedAt) : null,
      createdAt: new Date(input.createdAt),
    };

    // Check ownership before upserting — reject if another user owns this ID
    const existing = await this.prisma.trackedPR.findUnique({
      where: { id: input.id },
      select: { userId: true },
    });
    if (existing && existing.userId !== user.id) {
      throw new ForbiddenException('PR belongs to another user');
    }

    const row = existing
      ? await this.prisma.trackedPR.update({
          where: { id: input.id },
          data: {
            ...data,
            id: undefined,
            userId: undefined,
          },
        })
      : await this.prisma.trackedPR.create({ data });

    return this.toResponse(row);
  }

  async deletePR(authUser: AuthenticatedUser, prId: string) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const row = await this.prisma.trackedPR.findFirst({
      where: { id: prId, userId: user.id },
    });
    if (!row) throw new NotFoundException('PR not found');
    await this.prisma.trackedPR.delete({ where: { id: prId } });
  }

  private toResponse(row: TrackedPRRecord) {
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      status: row.status,
      role: row.role,
      priority: row.priority,
      isEmergency: row.isEmergency,
      size: row.size,
      repo: row.repo,
      prNumber: row.prNumber,
      prAuthor: row.prAuthor,
      dependencies: row.dependencies,
      ciPassing: row.ciPassing,
      linkedSessionId: row.linkedSessionId,
      notes: row.notes,
      acceptanceOutcome: row.acceptanceOutcome,
      reviewOutcome: row.reviewOutcome,
      selfReviewed: row.selfReviewed,
      reviewRoundCount: row.reviewRoundCount,
      changesEverNeeded: row.changesEverNeeded,
      reReviewed: row.reReviewed,
      missCategory: row.missCategory,
      missNote: row.missNote,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

}
