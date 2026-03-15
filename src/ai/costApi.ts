import { api } from '../api/client';
import type { ApiOfficialCost } from '../api/schema';

export async function fetchMonthlyCostFromAdminApi(options: {
  adminApiKey: string;
  startDate: string;
  endDate: string;
}): Promise<number> {
  const response = await api.post<ApiOfficialCost>('/usage/official-cost', {
    adminApiKey: options.adminApiKey,
    startDate: options.startDate,
    endDate: options.endDate,
  });
  return response.officialCostUsd;
}
