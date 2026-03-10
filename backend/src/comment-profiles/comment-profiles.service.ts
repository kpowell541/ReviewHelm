import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCommentProfileDto } from './dto/create-comment-profile.dto';
import type { UpdateCommentProfileDto } from './dto/update-comment-profile.dto';

@Injectable()
export class CommentProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listProfiles(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const [profiles, preference] = await Promise.all([
      this.prisma.commentStyleProfile.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.prisma.preference.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      }),
    ]);
    return {
      activeProfileId: preference.activeCommentStyleProfileId,
      items: profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        tone: profile.tone,
        strictness: profile.strictness,
        verbosity: profile.verbosity,
        includePraise: profile.includePraise,
        includeActionItems: profile.includeActionItems,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })),
    };
  }

  async createProfile(authUser: AuthenticatedUser, input: CreateCommentProfileDto) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const created = await this.prisma.commentStyleProfile.create({
      data: {
        userId: user.id,
        name: input.name.trim(),
        tone: input.tone.trim(),
        strictness: input.strictness,
        verbosity: input.verbosity,
        includePraise: input.includePraise ?? false,
        includeActionItems: input.includeActionItems ?? true,
      },
    });
    return {
      id: created.id,
      name: created.name,
      tone: created.tone,
      strictness: created.strictness,
      verbosity: created.verbosity,
      includePraise: created.includePraise,
      includeActionItems: created.includeActionItems,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateProfile(
    authUser: AuthenticatedUser,
    profileId: string,
    input: UpdateCommentProfileDto,
  ) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const existing = await this.prisma.commentStyleProfile.findFirst({
      where: { id: profileId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Comment profile not found');
    }
    const updated = await this.prisma.commentStyleProfile.update({
      where: { id: profileId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.tone !== undefined ? { tone: input.tone.trim() } : {}),
        ...(input.strictness !== undefined ? { strictness: input.strictness } : {}),
        ...(input.verbosity !== undefined ? { verbosity: input.verbosity } : {}),
        ...(input.includePraise !== undefined
          ? { includePraise: input.includePraise }
          : {}),
        ...(input.includeActionItems !== undefined
          ? { includeActionItems: input.includeActionItems }
          : {}),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      tone: updated.tone,
      strictness: updated.strictness,
      verbosity: updated.verbosity,
      includePraise: updated.includePraise,
      includeActionItems: updated.includeActionItems,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteProfile(authUser: AuthenticatedUser, profileId: string) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const existing = await this.prisma.commentStyleProfile.findFirst({
      where: { id: profileId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Comment profile not found');
    }
    await this.prisma.$transaction([
      this.prisma.commentStyleProfile.delete({ where: { id: profileId } }),
      this.prisma.preference.updateMany({
        where: { userId: user.id, activeCommentStyleProfileId: profileId },
        data: { activeCommentStyleProfileId: null },
      }),
    ]);
  }

  async activateProfile(authUser: AuthenticatedUser, profileId: string) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const existing = await this.prisma.commentStyleProfile.findFirst({
      where: { id: profileId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Comment profile not found');
    }
    await this.prisma.preference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        activeCommentStyleProfileId: profileId,
      },
      update: {
        activeCommentStyleProfileId: profileId,
      },
    });
    return {
      activeProfileId: profileId,
    };
  }

  async getActiveOrRequestedProfile(
    authUser: AuthenticatedUser,
    profileId?: string | null,
  ) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    let id = profileId ?? null;
    if (!id) {
      const preference = await this.prisma.preference.findUnique({
        where: { userId: user.id },
        select: { activeCommentStyleProfileId: true },
      });
      id = preference?.activeCommentStyleProfileId ?? null;
    }
    if (!id) {
      return null;
    }
    const profile = await this.prisma.commentStyleProfile.findFirst({
      where: { id, userId: user.id },
    });
    return profile;
  }
}
