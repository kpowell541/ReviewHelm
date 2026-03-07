import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertTrackedPRDto } from './dto/upsert-tracked-pr.dto';

type TrackedPRRecord = Awaited<ReturnType<PrismaService['trackedPR']['create']>>;

@Injectable()
export class TrackedPRsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPRs(authUser: AuthenticatedUser) {
    const user = await this.ensureUser(authUser);
    const rows = await this.prisma.trackedPR.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async getPR(authUser: AuthenticatedUser, prId: string) {
    const user = await this.ensureUser(authUser);
    const row = await this.prisma.trackedPR.findFirst({
      where: { id: prId, userId: user.id },
    });
    if (!row) throw new NotFoundException('PR not found');
    return this.toResponse(row);
  }

  async upsertPR(authUser: AuthenticatedUser, input: UpsertTrackedPRDto) {
    const user = await this.ensureUser(authUser);

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
      resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
      lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : null,
      archivedAt: input.archivedAt ? new Date(input.archivedAt) : null,
      createdAt: new Date(input.createdAt),
    };

    const row = await this.prisma.trackedPR.upsert({
      where: { id: input.id },
      create: data,
      update: {
        ...data,
        // Don't overwrite userId or id on update
        id: undefined,
        userId: undefined,
      },
    });

    return this.toResponse(row);
  }

  async deletePR(authUser: AuthenticatedUser, prId: string) {
    const user = await this.ensureUser(authUser);
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
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async ensureUser(authUser: AuthenticatedUser) {
    return this.prisma.user.upsert({
      where: { supabaseUserId: authUser.supabaseUserId },
      update: { email: authUser.email },
      create: {
        supabaseUserId: authUser.supabaseUserId,
        email: authUser.email,
      },
    });
  }
}
