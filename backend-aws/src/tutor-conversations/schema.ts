import { z } from 'zod';

export const tutorConversationSchema = z
  .object({
    itemId: z.string(),
    messages: z.array(z.unknown()),
    lastAccessed: z.string().datetime(),
  })
  .strict();

export const bulkTutorConversationsSchema = z
  .object({
    conversations: z.array(tutorConversationSchema),
  })
  .strict();
