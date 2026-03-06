import { BudgetService } from '../src/common/budget/budget.service';

describe('BudgetService', () => {
  const authUser = {
    supabaseUserId: 'user-1',
    email: 'user@example.com',
    rawClaims: {},
  };

  const basePreference = {
    userId: 'u1',
    monthlyBudgetUsd: 20,
    alertThresholds: [50, 80, 100],
    hardStopAtBudget: false,
    autoDowngradeNearBudget: true,
    autoDowngradeThresholdPct: 80,
    cooldownSeconds: 6,
    lastAlertThreshold: null,
  };

  const pricing = {
    HAIKU_INPUT_COST_PER_MILLION_USD: 1,
    HAIKU_OUTPUT_COST_PER_MILLION_USD: 5,
    SONNET_INPUT_COST_PER_MILLION_USD: 3,
    SONNET_OUTPUT_COST_PER_MILLION_USD: 15,
    OPUS_INPUT_COST_PER_MILLION_USD: 15,
    OPUS_OUTPUT_COST_PER_MILLION_USD: 75,
  };

  function createService(input?: {
    preference?: Partial<typeof basePreference>;
    usageDayRows?: Array<{
      calls: number;
      inputTokens: number;
      outputTokens: number;
      byModel: unknown;
    }>;
  }) {
    const preference = {
      ...basePreference,
      ...(input?.preference ?? {}),
    };
    const usageDayRows =
      input?.usageDayRows ??
      [
        {
          calls: 6,
          inputTokens: 200_000,
          outputTokens: 200_000,
          byModel: {
            opus: { inputTokens: 200_000, outputTokens: 200_000 },
          },
        },
      ];

    const prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue({
          id: 'u1',
          supabaseUserId: authUser.supabaseUserId,
          email: authUser.email,
        }),
      },
      preference: {
        upsert: jest.fn().mockResolvedValue(preference),
        update: jest.fn().mockResolvedValue(preference),
      },
      usageDay: {
        findMany: jest.fn().mockResolvedValue(usageDayRows),
      },
      usageSession: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    } as any;

    const config = {
      get: jest.fn((key: keyof typeof pricing) => pricing[key]),
    } as any;

    const service = new BudgetService(prisma, config);
    return { service, prisma };
  }

  it('auto-downgrades opus to sonnet near budget threshold', async () => {
    const { service, prisma } = createService();

    const decision = await service.enforceAiBudgetPolicy(authUser, 'opus');

    expect(decision.autoDowngraded).toBe(true);
    expect(decision.resolvedModel).toBe('sonnet');
    expect(decision.block).toBe(false);
    expect(decision.budget.spendPercent).toBeGreaterThanOrEqual(80);
    expect(prisma.preference.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { lastAlertThreshold: 80 },
    });
  });

  it('blocks requests when hard-stop is enabled and budget is exceeded', async () => {
    const { service } = createService({
      preference: {
        monthlyBudgetUsd: 1,
        hardStopAtBudget: true,
      },
      usageDayRows: [
        {
          calls: 10,
          inputTokens: 500_000,
          outputTokens: 500_000,
          byModel: {
            sonnet: { inputTokens: 500_000, outputTokens: 500_000 },
          },
        },
      ],
    });

    const decision = await service.enforceAiBudgetPolicy(authUser, 'sonnet');

    expect(decision.block).toBe(true);
    expect(decision.autoDowngraded).toBe(false);
    expect(decision.resolvedModel).toBe('sonnet');
    expect(decision.budget.overBudget).toBe(true);
  });
});
