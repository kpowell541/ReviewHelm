import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { AuthPrincipal } from '../auth/types';
import { getEnv } from '../config/env';
import { getDb } from '../db/client';
import { sessions, usageSessions } from '../db/schema';
import { upsertUserFromPrincipal } from '../me/repository';
import { estimateCostUsd } from './costs';

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function mergeUsageJson(base: unknown, delta: Record<string, unknown>): Record<string, unknown> {
  const baseObject =
    base && typeof base === 'object' && !Array.isArray(base)
      ? (base as Record<string, unknown>)
      : {};

  const out: Record<string, unknown> = { ...baseObject };
  for (const [key, value] of Object.entries(delta)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      out[key] = value;
      continue;
    }

    const existing = out[key];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      out[key] = value;
      continue;
    }

    out[key] = mergeUsageJson(existing, value as Record<string, unknown>);
    const merged = out[key] as Record<string, unknown>;
    merged.calls = safeNumber((existing as Record<string, unknown>).calls) + safeNumber((value as Record<string, unknown>).calls);
    merged.inputTokens =
      safeNumber((existing as Record<string, unknown>).inputTokens) +
      safeNumber((value as Record<string, unknown>).inputTokens);
    merged.outputTokens =
      safeNumber((existing as Record<string, unknown>).outputTokens) +
      safeNumber((value as Record<string, unknown>).outputTokens);
  }

  return out;
}

function buildFeatureUsage(byFeature: unknown) {
  if (!byFeature || typeof byFeature !== 'object' || Array.isArray(byFeature)) {
    return [];
  }

  const env = getEnv();
  return Object.entries(byFeature as Record<string, unknown>).map(([feature, payload]) => {
    const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    return {
      feature,
      calls: safeNumber(row.calls),
      inputTokens: safeNumber(row.inputTokens),
      outputTokens: safeNumber(row.outputTokens),
      costUsd: estimateCostUsd(row.byModel ?? {}, env),
    };
  });
}

export async function getSessionUsage(principal: AuthPrincipal, sessionId: string) {
  const user = await upsertUserFromPrincipal(principal);
  const db = getDb();
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)),
  });
  if (!session) {
    throw new HTTPException(404, { message: 'Session not found.' });
  }

  const usage = await db.query.usageSessions.findFirst({
    where: eq(usageSessions.sessionId, session.id),
  });
  if (!usage) {
    return {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      byFeature: [],
    };
  }

  return {
    calls: usage.calls,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: estimateCostUsd(usage.byModel, getEnv()),
    byFeature: buildFeatureUsage(usage.byFeature),
  };
}

export async function recordSessionUsage(args: {
  principal: AuthPrincipal;
  sessionId: string;
  model: 'haiku' | 'sonnet' | 'opus';
  feature: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const user = await upsertUserFromPrincipal(args.principal);
  const db = getDb();
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, args.sessionId), eq(sessions.userId, user.id)),
  });
  if (!session) {
    throw new HTTPException(404, { message: 'Session not found.' });
  }

  const byModelDelta = {
    [args.model]: {
      calls: 1,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
    },
  };

  const byFeatureDelta = {
    [args.feature]: {
      calls: 1,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      byModel: byModelDelta,
    },
  };

  const existing = await db.query.usageSessions.findFirst({
    where: eq(usageSessions.sessionId, session.id),
  });

  const nextByModel = mergeUsageJson(existing?.byModel ?? {}, byModelDelta);
  const nextByFeature = mergeUsageJson(existing?.byFeature ?? {}, byFeatureDelta);

  if (existing) {
    await db
      .update(usageSessions)
      .set({
        calls: existing.calls + 1,
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        byModel: nextByModel,
        byFeature: nextByFeature,
        lastUpdatedAt: new Date(),
      })
      .where(eq(usageSessions.sessionId, session.id));
    return;
  }

  await db.insert(usageSessions).values({
    userId: user.id,
    sessionId: session.id,
    calls: 1,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    byModel: nextByModel,
    byFeature: nextByFeature,
  });
}
