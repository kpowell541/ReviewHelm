import type { AuthenticatedUser } from '../auth/types';
import { PrismaService } from '../../prisma/prisma.service';

export async function upsertUserFromAuth(
  prisma: PrismaService,
  authUser: AuthenticatedUser,
) {
  return prisma.user.upsert({
    where: { supabaseUserId: authUser.supabaseUserId },
    update: {
      email: authUser.email,
    },
    create: {
      supabaseUserId: authUser.supabaseUserId,
      email: authUser.email,
    },
  });
}
