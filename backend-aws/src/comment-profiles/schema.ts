import { z } from 'zod';

export const createCommentProfileSchema = z
  .object({
    name: z.string().max(80),
    tone: z.string().max(80),
    strictness: z.number().int().min(1).max(5),
    verbosity: z.number().int().min(1).max(5),
    includePraise: z.boolean().optional(),
    includeActionItems: z.boolean().optional(),
  })
  .strict();

export const updateCommentProfileSchema = z
  .object({
    name: z.string().max(80).optional(),
    tone: z.string().max(80).optional(),
    strictness: z.number().int().min(1).max(5).optional(),
    verbosity: z.number().int().min(1).max(5).optional(),
    includePraise: z.boolean().optional(),
    includeActionItems: z.boolean().optional(),
  })
  .strict();

export type CreateCommentProfileInput = z.infer<typeof createCommentProfileSchema>;
export type UpdateCommentProfileInput = z.infer<typeof updateCommentProfileSchema>;
