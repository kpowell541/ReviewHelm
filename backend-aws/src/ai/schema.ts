import { z } from 'zod';

export const aiTutorSchema = z
  .object({
    sessionId: z.string().uuid().nullable().optional(),
    feature: z.enum(['learn', 'deep-dive', 'comment-drafter']),
    model: z.enum(['haiku', 'sonnet', 'opus']).optional(),
    role: z.enum([
      'concept-explainer',
      'qa',
      'comment-drafter',
      'exercise-generator',
      'anti-bias-challenger',
    ]),
    itemId: z.string().max(300),
    itemText: z.string().max(2000),
    stackLabel: z.string().max(200),
    confidence: z.number().int().min(1).max(5),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(20000),
        }),
      )
      .max(60),
    allowResponseCache: z.boolean().optional(),
    allowEscalation: z.boolean().optional(),
    diffId: z.string().max(64).optional(),
    diffText: z.string().max(500000).optional(),
    commentStyleProfileId: z.string().max(64).optional(),
  })
  .strict();

export type AiTutorInput = z.infer<typeof aiTutorSchema>;
