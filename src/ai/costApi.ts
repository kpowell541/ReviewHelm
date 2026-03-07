import { api } from '../api/client';

interface OfficialCostResponse {
  officialCostUsd: number;
  startDate: string;
  endDate: string;
}

export async function fetchMonthlyCostFromAdminApi(options: {
  adminApiKey: string;
  startDate: string;
  endDate: string;
}): Promise<number> {
  const response = await api.post<OfficialCostResponse>('/usage/official-cost', {
    adminApiKey: options.adminApiKey,
    startDate: options.startDate,
    endDate: options.endDate,
  });
  return response.officialCostUsd;
}
