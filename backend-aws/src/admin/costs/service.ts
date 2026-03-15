import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type Expression,
} from '@aws-sdk/client-cost-explorer';
import { getEnv } from '../../config/env';

type ProviderStatus = 'configured' | 'unconfigured' | 'error';

interface CostDay {
  date: string;
  costUsd: number;
}

interface ProviderCostSummary {
  status: ProviderStatus;
  totalUsd: number;
  byDay: CostDay[];
  message: string | null;
}

interface AwsServiceCost {
  service: string;
  costUsd: number;
  pct: number;
}

interface AwsCostSummary extends ProviderCostSummary {
  currency: string;
  byService: AwsServiceCost[];
  filter: {
    mode: 'tag' | 'linked_account' | 'tag_and_linked_account' | 'none';
    tagKey: string | null;
    tagValue: string | null;
    linkedAccount: string | null;
  };
}

interface AnthropicCostSummary extends ProviderCostSummary {}

export interface AdminCostOverview {
  generatedAt: string;
  environment: string;
  month: string;
  window: {
    startDate: string;
    endDateExclusive: string;
    inclusiveDays: number;
  };
  totals: {
    awsUsd: number;
    anthropicUsd: number;
    combinedUsd: number;
  };
  combinedByDay: Array<{
    date: string;
    awsUsd: number;
    anthropicUsd: number;
    totalUsd: number;
  }>;
  aws: AwsCostSummary;
  anthropic: AnthropicCostSummary;
}

const ANTHROPIC_COST_API_URL = 'https://api.anthropic.com/v1/organizations/cost_report';
const ANTHROPIC_API_VERSION = '2023-06-01';

function getMonthWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const endExclusive = new Date(Date.UTC(year, month, now.getUTCDate() + 1));
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  return {
    monthKey,
    startDate: toDateKey(start),
    endDateExclusive: toDateKey(endExclusive),
    inclusiveDays: Math.max(
      1,
      Math.round((endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    ),
  };
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function roundUsd(value: number) {
  return Number(value.toFixed(4));
}

function buildDateSeries(startDate: string, inclusiveDays: number): string[] {
  const out: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  for (let index = 0; index < inclusiveDays; index += 1) {
    out.push(toDateKey(new Date(start.getTime() + index * 24 * 60 * 60 * 1000)));
  }
  return out;
}

function parseUsd(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAwsFilter() {
  const env = getEnv();
  const tagKey = env.AWS_COST_EXPLORER_TAG_KEY.trim();
  const tagValue = (env.AWS_COST_EXPLORER_TAG_VALUE.trim() || env.DEPLOY_ENVIRONMENT.trim()).trim();
  const linkedAccount = env.AWS_COST_EXPLORER_LINKED_ACCOUNT.trim();

  const expressions: Expression[] = [];

  if (tagKey && tagValue) {
    expressions.push({
      Tags: {
        Key: tagKey,
        Values: [tagValue],
        MatchOptions: ['EQUALS'],
      },
    });
  }

  if (linkedAccount) {
    expressions.push({
      Dimensions: {
        Key: 'LINKED_ACCOUNT',
        Values: [linkedAccount],
      },
    });
  }

  let expression: Expression | undefined;
  if (expressions.length === 1) {
    expression = expressions[0];
  } else if (expressions.length > 1) {
    expression = { And: expressions };
  }

  const mode =
    expressions.length === 2
      ? 'tag_and_linked_account'
      : tagKey && tagValue
        ? 'tag'
        : linkedAccount
          ? 'linked_account'
          : 'none';

  return {
    expression,
    meta: {
      mode,
      tagKey: tagKey || null,
      tagValue: tagValue || null,
      linkedAccount: linkedAccount || null,
    } as AwsCostSummary['filter'],
  };
}

async function fetchAwsCosts(window: {
  startDate: string;
  endDateExclusive: string;
  inclusiveDays: number;
}): Promise<AwsCostSummary> {
  const env = getEnv();
  const { expression, meta } = getAwsFilter();

  try {
    const client = new CostExplorerClient({ region: env.AWS_COST_EXPLORER_REGION });
    const [dailyResponse, serviceResponse] = await Promise.all([
      client.send(
        new GetCostAndUsageCommand({
          TimePeriod: {
            Start: window.startDate,
            End: window.endDateExclusive,
          },
          Granularity: 'DAILY',
          Metrics: ['UnblendedCost'],
          Filter: expression,
        }),
      ),
      client.send(
        new GetCostAndUsageCommand({
          TimePeriod: {
            Start: window.startDate,
            End: window.endDateExclusive,
          },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [
            {
              Type: 'DIMENSION',
              Key: 'SERVICE',
            },
          ],
          Filter: expression,
        }),
      ),
    ]);

    const byDayMap = new Map<string, number>();
    for (const date of buildDateSeries(window.startDate, window.inclusiveDays)) {
      byDayMap.set(date, 0);
    }

    for (const row of dailyResponse.ResultsByTime ?? []) {
      const date = row.TimePeriod?.Start;
      if (!date) continue;
      const amount = parseUsd(row.Total?.UnblendedCost?.Amount);
      byDayMap.set(date, roundUsd(amount));
    }

    const byDay = Array.from(byDayMap.entries()).map(([date, costUsd]) => ({
      date,
      costUsd,
    }));

    const totalUsd = roundUsd(byDay.reduce((sum, row) => sum + row.costUsd, 0));
    const serviceGroups = serviceResponse.ResultsByTime?.[0]?.Groups ?? [];
    const byService = serviceGroups
      .map((group) => {
        const service = group.Keys?.[0]?.trim() || 'Unknown';
        const costUsd = roundUsd(parseUsd(group.Metrics?.UnblendedCost?.Amount));
        return {
          service,
          costUsd,
          pct: totalUsd > 0 ? Number(((costUsd / totalUsd) * 100).toFixed(1)) : 0,
        };
      })
      .filter((row) => row.costUsd > 0)
      .sort((left, right) => right.costUsd - left.costUsd)
      .slice(0, 8);

    return {
      status: 'configured',
      totalUsd,
      byDay,
      currency: serviceResponse.ResultsByTime?.[0]?.Total?.UnblendedCost?.Unit || 'USD',
      byService,
      filter: meta,
      message:
        meta.mode === 'none'
          ? 'Using the current AWS account scope with no additional Cost Explorer filter.'
          : null,
    };
  } catch (error) {
    return {
      status: 'error',
      totalUsd: 0,
      byDay: buildDateSeries(window.startDate, window.inclusiveDays).map((date) => ({
        date,
        costUsd: 0,
      })),
      currency: 'USD',
      byService: [],
      filter: meta,
      message: error instanceof Error ? error.message : 'Failed to fetch AWS costs.',
    };
  }
}

function getAnthropicDate(row: Record<string, unknown>): string | null {
  const candidates = [
    row.date,
    row.start_date,
    row.startDate,
    row.starting_at,
    row.startingAt,
  ];

  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  return null;
}

function getAnthropicAmount(row: Record<string, unknown>): number {
  const totalCostUsd = row.total_cost_usd;
  if (typeof totalCostUsd === 'number') return totalCostUsd;

  const amount = row.amount;
  if (typeof amount === 'number') return amount;

  const cost = row.cost;
  if (cost && typeof cost === 'object' && !Array.isArray(cost)) {
    const nestedAmount = (cost as Record<string, unknown>).amount;
    if (typeof nestedAmount === 'number') return nestedAmount;
  }

  return 0;
}

async function fetchAnthropicCosts(window: {
  startDate: string;
  endDateExclusive: string;
  inclusiveDays: number;
}): Promise<AnthropicCostSummary> {
  const env = getEnv();
  const adminApiKey = env.ANTHROPIC_ADMIN_API_KEY.trim();
  if (!adminApiKey) {
    return {
      status: 'unconfigured',
      totalUsd: 0,
      byDay: buildDateSeries(window.startDate, window.inclusiveDays).map((date) => ({
        date,
        costUsd: 0,
      })),
      message: 'Anthropic admin cost reporting is not configured.',
    };
  }

  try {
    const params = new URLSearchParams({
      starting_at: window.startDate,
      ending_at: window.endDateExclusive,
      granularity: '1d',
    });

    const response = await fetch(`${ANTHROPIC_COST_API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-api-key': adminApiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Anthropic cost report request failed (${response.status})${body ? `: ${body.slice(0, 300)}` : ''}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
    };

    const byDayMap = new Map<string, number>();
    for (const date of buildDateSeries(window.startDate, window.inclusiveDays)) {
      byDayMap.set(date, 0);
    }

    for (const row of payload.data ?? []) {
      const date = getAnthropicDate(row);
      if (!date || !byDayMap.has(date)) continue;
      byDayMap.set(date, roundUsd((byDayMap.get(date) ?? 0) + getAnthropicAmount(row)));
    }

    const byDay = Array.from(byDayMap.entries()).map(([date, costUsd]) => ({
      date,
      costUsd,
    }));

    return {
      status: 'configured',
      totalUsd: roundUsd(byDay.reduce((sum, row) => sum + row.costUsd, 0)),
      byDay,
      message: null,
    };
  } catch (error) {
    return {
      status: 'error',
      totalUsd: 0,
      byDay: buildDateSeries(window.startDate, window.inclusiveDays).map((date) => ({
        date,
        costUsd: 0,
      })),
      message: error instanceof Error ? error.message : 'Failed to fetch Anthropic costs.',
    };
  }
}

export async function getAdminCostOverview(): Promise<AdminCostOverview> {
  const env = getEnv();
  const generatedAt = new Date().toISOString();
  const window = getMonthWindow();
  const [aws, anthropic] = await Promise.all([
    fetchAwsCosts(window),
    fetchAnthropicCosts(window),
  ]);

  const combinedByDay = buildDateSeries(window.startDate, window.inclusiveDays).map((date) => {
    const awsUsd = aws.byDay.find((row) => row.date === date)?.costUsd ?? 0;
    const anthropicUsd = anthropic.byDay.find((row) => row.date === date)?.costUsd ?? 0;
    return {
      date,
      awsUsd,
      anthropicUsd,
      totalUsd: roundUsd(awsUsd + anthropicUsd),
    };
  });

  return {
    generatedAt,
    environment: env.DEPLOY_ENVIRONMENT,
    month: window.monthKey,
    window,
    totals: {
      awsUsd: aws.totalUsd,
      anthropicUsd: anthropic.totalUsd,
      combinedUsd: roundUsd(aws.totalUsd + anthropic.totalUsd),
    },
    combinedByDay,
    aws,
    anthropic,
  };
}
