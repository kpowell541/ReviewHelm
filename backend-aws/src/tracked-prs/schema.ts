import { z } from 'zod';

const statusSchema = z.enum([
  'needs-review',
  'in-review',
  'changes-requested',
  'approved',
  'merged',
  'closed',
]);

const roleSchema = z.enum(['author', 'reviewer']);
const prioritySchema = z.enum(['routine', 'low', 'medium', 'high', 'critical']);
const sizeSchema = z.enum(['small', 'medium', 'large']);
const ciPassingSchema = z.enum(['yes', 'no', 'unknown']);
const acceptanceOutcomeSchema = z.enum(['accepted-clean', 'accepted-with-changes', 'abandoned']);
const reviewOutcomeSchema = z.enum(['requested-changes', 'no-changes-requested']);
const missCategorySchema = z.enum([
  'logic',
  'edge-case',
  'naming-style',
  'performance',
  'security',
  'test-coverage',
  'docs',
  'architecture',
]);

export const upsertTrackedPrSchema = z
  .object({
    id: z.string().max(36),
    title: z.string().max(500),
    url: z.string().max(2048).optional(),
    status: statusSchema,
    role: roleSchema,
    priority: prioritySchema,
    isEmergency: z.boolean(),
    size: sizeSchema.optional(),
    repo: z.string().max(500).optional(),
    prNumber: z.number().int().optional(),
    prAuthor: z.string().max(200).optional(),
    dependencies: z.array(z.unknown()).optional(),
    ciPassing: ciPassingSchema.optional(),
    linkedSessionId: z.string().uuid().optional(),
    notes: z.string().max(4096).optional(),
    acceptanceOutcome: acceptanceOutcomeSchema.optional(),
    reviewOutcome: reviewOutcomeSchema.optional(),
    selfReviewed: z.boolean().optional(),
    reviewRoundCount: z.number().int().optional(),
    changesEverNeeded: z.boolean().optional(),
    reReviewed: z.boolean().optional(),
    missCategory: missCategorySchema.optional(),
    missNote: z.string().max(2000).optional(),
    resolvedAt: z.string().datetime().optional(),
    lastReviewedAt: z.string().datetime().optional(),
    archivedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type UpsertTrackedPrInput = z.infer<typeof upsertTrackedPrSchema>;
