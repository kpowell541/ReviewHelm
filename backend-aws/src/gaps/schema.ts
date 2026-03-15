import { z } from 'zod';

export const gapsQuerySchema = z.object({
  stackId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
});

export const putConfidenceSchema = z
  .object({
    histories: z.record(z.string(), z.unknown()),
  })
  .strict();
