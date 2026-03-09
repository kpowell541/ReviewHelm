import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';

type ConversationRecord = Awaited<
  ReturnType<PrismaService['tutorConversation']['create']>
>;

@Injectable()
export class TutorConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(authUser: AuthenticatedUser) {
    const user = await this.ensureUser(authUser);
    const rows = await this.prisma.tutorConversation.findMany({
      where: { userId: user.id },
      orderBy: { lastAccessed: 'desc' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async upsertConversation(
    authUser: AuthenticatedUser,
    input: {
      itemId: string;
      messages: unknown[];
      lastAccessed: string;
    },
  ) {
    const user = await this.ensureUser(authUser);

    const data: Omit<Prisma.TutorConversationUncheckedCreateInput, 'id'> = {
      userId: user.id,
      itemId: input.itemId,
      messages: input.messages as Prisma.JsonArray,
      lastAccessed: new Date(input.lastAccessed),
    };

    const row = await this.prisma.tutorConversation.upsert({
      where: {
        userId_itemId: { userId: user.id, itemId: input.itemId },
      },
      create: { ...data },
      update: {
        messages: data.messages,
        lastAccessed: data.lastAccessed,
      },
    });

    return this.toResponse(row);
  }

  async bulkUpsert(
    authUser: AuthenticatedUser,
    conversations: Array<{
      itemId: string;
      messages: unknown[];
      lastAccessed: string;
    }>,
  ) {
    const results = [];
    for (const conv of conversations) {
      results.push(await this.upsertConversation(authUser, conv));
    }
    return results;
  }

  async deleteConversation(authUser: AuthenticatedUser, itemId: string) {
    const user = await this.ensureUser(authUser);
    await this.prisma.tutorConversation.deleteMany({
      where: { userId: user.id, itemId },
    });
  }

  private toResponse(row: ConversationRecord) {
    return {
      itemId: row.itemId,
      messages: row.messages,
      lastAccessed: row.lastAccessed.toISOString(),
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
