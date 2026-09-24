import { http } from '@/lib/http';
import { unwrapApiData, type CompanyRevenueResponse } from '@/types/api';
import type { ApiResponse } from '@/types';

export type CompanyRevenueParams = {
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export async function fetchCompanyRevenue(params: CompanyRevenueParams = {}) {
  const { data } = await http.get<ApiResponse<CompanyRevenueResponse>>(
    '/admin/finance/company-revenue',
    { params },
  );
  return unwrapApiData(data, 'Failed to load company revenue.');
}
