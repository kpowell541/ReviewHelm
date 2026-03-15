import { z } from 'zod';

export const checklistModeSchema = z.enum(['review', 'polish']);
export const verdictSchema = z.enum(['looks-good', 'needs-attention', 'na', 'skipped']);
export const confidenceSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const createSessionSchema = z
  .object({
    id: z.string().uuid().optional(),
    mode: checklistModeSchema,
    stackId: z.string().optional(),
    stackIds: z.array(z.string()).optional(),
    selectedSections: z.array(z.string()).optional(),
    title: z.string().max(200).optional(),
    linkedPRId: z.string().optional(),
  })
  .strict();

export const listSessionsQuerySchema = z.object({
  mode: checklistModeSchema.optional(),
  stackId: z.string().optional(),
  status: z.enum(['active', 'completed', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    linkedPRId: z.string().nullable().optional(),
  })
  .strict();

export const patchItemResponseSchema = z
  .object({
    verdict: verdictSchema.optional(),
    confidence: confidenceSchema.optional(),
    notes: z.string().max(4000).optional(),
    draftedComment: z.string().max(8000).optional(),
  })
  .strict();

export const patchSessionNotesSchema = z
  .object({
    sessionNotes: z.string().max(12000),
  })
  .strict();

export const completeSessionSchema = z
  .object({
    confirmLowCoverage: z.boolean().optional(),
  })
  .strict();

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type PatchItemResponseInput = z.infer<typeof patchItemResponseSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
