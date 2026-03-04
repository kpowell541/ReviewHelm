const ANTHROPIC_COST_API_URL =
  'https://api.anthropic.com/v1/organizations/cost_report';

interface CostReportRow {
  total_cost_usd?: number;
  cost?: { amount?: number };
  amount?: number;
}

function parseCostRow(row: CostReportRow): number {
  if (typeof row.total_cost_usd === 'number') return row.total_cost_usd;
  if (typeof row.amount === 'number') return row.amount;
  if (typeof row.cost?.amount === 'number') return row.cost.amount;
  return 0;
}

export async function fetchMonthlyCostFromAdminApi(options: {
  adminApiKey: string;
  startDate: string;
  endDate: string;
}): Promise<number> {
  const params = new URLSearchParams({
    starting_at: options.startDate,
    ending_at: options.endDate,
    granularity: '1d',
  });

  const response = await fetch(`${ANTHROPIC_COST_API_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-api-key': options.adminApiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Cost API error (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as { data?: CostReportRow[] };
  const rows = payload.data ?? [];
  return rows.reduce((sum, row) => sum + parseCostRow(row), 0);
}
