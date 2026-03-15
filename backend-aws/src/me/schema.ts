import { z } from 'zod';

const SeveritySchema = z.enum(['blocker', 'major', 'minor', 'nit']);
const FontSizeSchema = z.enum(['small', 'medium', 'large']);
const CodeThemeSchema = z.enum(['dark', 'light']);
const ClaudeModelSchema = z.enum(['haiku', 'sonnet', 'opus']);

export const updatePreferencesSchema = z
  .object({
    aiModel: ClaudeModelSchema.optional(),
    defaultSeverityFilter: z.array(SeveritySchema).min(1).max(4).optional(),
    antiBiasMode: z.boolean().optional(),
    fontSize: FontSizeSchema.optional(),
    codeBlockTheme: CodeThemeSchema.optional(),
    autoExportPdf: z.boolean().optional(),
    activeCommentStyleProfileId: z.string().max(64).nullable().optional(),
    monthlyBudgetUsd: z.number().min(1).max(10000).optional(),
    alertThresholds: z.array(z.number().int().min(1).max(100)).min(1).max(5).optional(),
    hardStopAtBudget: z.boolean().optional(),
    autoDowngradeNearBudget: z.boolean().optional(),
    autoDowngradeThresholdPct: z.number().int().min(1).max(100).optional(),
    cooldownSeconds: z.number().int().min(0).max(60).optional(),
    bookmarks: z.array(z.string()).optional(),
    templates: z.record(z.string(), z.unknown()).optional(),
    repoConfigs: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
