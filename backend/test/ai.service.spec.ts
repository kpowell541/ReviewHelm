import { AiService } from '../src/ai/ai.service';
import type { AiTutorDto } from '../src/ai/dto/ai-tutor.dto';

describe('AiService', () => {
  const authUser = {
    supabaseUserId: 'user-1',
    email: 'user@example.com',
    rawClaims: {},
  };

  const baseDto: AiTutorDto = {
    feature: 'comment-drafter',
    role: 'comment-drafter',
    itemId: 'go.error-handling.check-errors',
    itemText: 'Are all errors checked and handled?',
    stackLabel: 'Go',
    confidence: 2,
    messages: [{ role: 'user', content: 'Draft a code review comment.' }],
    diffText: `diff --git a/service.go b/service.go
index 1111111..2222222 100644
--- a/service.go
+++ b/service.go
@@ -10,6 +10,7 @@ func run() error {
-   process()
+   if err := process(); err != nil { return err }
 }`,
  };

  function createService() {
    const prisma = {
      user: { upsert: jest.fn().mockResolvedValue({ id: 'u1', email: 'user@example.com' }) },
    } as any;

    const redis = {
      command: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue('OK'),
    } as any;

    const usage = {
      recordUsage: jest.fn().mockResolvedValue(undefined),
    } as any;

    const diffs = {
      buildGroundingContext: jest.fn().mockResolvedValue({
        diffId: null,
        lineCount: 8,
        fileCount: 1,
        summary: 'Files changed: 1',
        excerpt: '@@ -10,6 +10,7 @@',
      }),
    } as any;

    const profiles = {
      getActiveOrRequestedProfile: jest.fn().mockResolvedValue(null),
    } as any;

    const calibration = {
      buildPersonalGuidance: jest.fn().mockResolvedValue('Prefer actionable comments.'),
    } as any;

    const budget = {
      enforceAiBudgetPolicy: jest.fn().mockResolvedValue({
        block: false,
        resolvedModel: 'sonnet',
        autoDowngraded: false,
        alertThreshold: null,
        budget: {},
      }),
    } as any;

    const tierService = {
      isAdminEmail: jest.fn().mockReturnValue(false),
    } as any;

    const creditService = {
      deductCredits: jest.fn().mockResolvedValue({ balanceUsd: 0, unlimited: false }),
    } as any;

    const config = {
      get: jest.fn().mockReturnValue('platform-test-key'),
    } as any;

    const service = new AiService(
      prisma,
      redis,
      usage,
      diffs,
      profiles,
      calibration,
      budget,
      tierService,
      creditService,
      config,
    );
    return { service, usage };
  }

  it('auto-escalates comment drafting from Haiku to Sonnet when quality is weak', async () => {
    const { service, usage } = createService();
    const fetchSpy = jest.spyOn(global, 'fetch' as any);
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Looks okay.' }],
          usage: { input_tokens: 100, output_tokens: 20 },
        }),
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: 'In service.go @@ -10,6 +10,7 @@ please return the error from process() to avoid silent failures.',
            },
          ],
          usage: { input_tokens: 200, output_tokens: 80 },
        }),
        text: async () => '',
      } as any);

    const result = await service.tutor(authUser, {
      ...baseDto,
      model: 'haiku',
    });

    expect(result.autoEscalated).toBe(true);
    expect(result.resolvedModel).toBe('sonnet');
    expect(usage.recordUsage).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('does not escalate when allowEscalation=false', async () => {
    const { service, usage } = createService();
    const fetchSpy = jest.spyOn(global, 'fetch' as any);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Short answer.' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
      text: async () => '',
    } as any);

    const result = await service.tutor(authUser, {
      ...baseDto,
      model: 'haiku',
      allowEscalation: false,
    });

    expect(result.autoEscalated).toBe(false);
    expect(usage.recordUsage).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('returns cached tutor response without calling Anthropic again', async () => {
    const prisma = {
      user: { upsert: jest.fn().mockResolvedValue({ id: 'u1', email: 'user@example.com' }) },
    } as any;

    const redis = {
      command: jest.fn().mockResolvedValue(
        JSON.stringify({
          content: 'Cached response',
          inputTokens: 50,
          outputTokens: 15,
          costUsd: 0.0002,
          resolvedModel: 'haiku',
          autoEscalated: false,
        }),
      ),
    } as any;

    const usage = {
      recordUsage: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AiService(
      prisma,
      redis,
      usage,
      { buildGroundingContext: jest.fn().mockResolvedValue(null) } as any,
      { getActiveOrRequestedProfile: jest.fn().mockResolvedValue(null) } as any,
      { buildPersonalGuidance: jest.fn().mockResolvedValue('') } as any,
      { enforceAiBudgetPolicy: jest.fn().mockResolvedValue({ block: false, resolvedModel: 'haiku' }) } as any,
      { isAdminEmail: jest.fn().mockReturnValue(false) } as any,
      { deductCredits: jest.fn().mockResolvedValue({ balanceUsd: 0, unlimited: false }) } as any,
      { get: jest.fn().mockReturnValue('platform-test-key') } as any,
    );

    const fetchSpy = jest.spyOn(global, 'fetch' as any);

    const result = await service.tutor(authUser, {
      ...baseDto,
      model: 'haiku',
    });

    expect(result.cached).toBe(true);
    expect(result.content).toBe('Cached response');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(usage.recordUsage).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
