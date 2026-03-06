import { AdminCiService } from '../src/admin/ci/admin-ci.service';

describe('AdminCiService', () => {
  it('fails policy check when blocker/major thresholds are exceeded', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          supabaseUserId: 'u1',
          email: 'user@example.com',
        }),
      },
    } as any;

    const sessions = {
      getSessionSummary: jest.fn().mockResolvedValue({
        scores: {
          coverage: 65,
          confidence: 58,
          issuesBySeverity: {
            blocker: 1,
            major: 6,
            minor: 2,
            nit: 0,
          },
        },
      }),
    } as any;

    const service = new AdminCiService(prisma, sessions);
    const result = await service.runPolicyCheck({
      sessionId: 'session-1',
      userSupabaseUserId: 'u1',
      minCoverage: 70,
      minConfidence: 60,
      maxBlockers: 0,
      maxMajors: 3,
    });

    expect(result.pass).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('passes policy check when metrics are within thresholds', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          supabaseUserId: 'u1',
          email: 'user@example.com',
        }),
      },
    } as any;

    const sessions = {
      getSessionSummary: jest.fn().mockResolvedValue({
        scores: {
          coverage: 88,
          confidence: 79,
          issuesBySeverity: {
            blocker: 0,
            major: 1,
            minor: 3,
            nit: 1,
          },
        },
      }),
    } as any;

    const service = new AdminCiService(prisma, sessions);
    const result = await service.runPolicyCheck({
      sessionId: 'session-1',
      userSupabaseUserId: 'u1',
    });

    expect(result.pass).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});
