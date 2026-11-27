import { http } from '@/lib/http';
import { unwrapApiData, type AdminErrandBoardRow, type ErrandPaymentState, type ErrandFlag, type Paginated } from '@/types/api';
import type { ApiResponse } from '@/types';

export type B2BErrandTab = 'needs_assign' | 'live' | 'completed' | 'cancelled' | 'all';

export type AdminB2BOrganizationRef = {
  id: number;
  name: string;
  status: string;
  location: { id: number; name: string } | null;
};

export type AdminB2BErrandRow = AdminErrandBoardRow & {
  fulfillment_mode?: 'managed' | 'marketplace' | string;
  organization: AdminB2BOrganizationRef | null;
  amount: { total: number | null; payment: ErrandPaymentState };
  flags: ErrandFlag[];
};

export type AdminB2BErrandsOverview = {
  summary: {
    needs_assign: number;
    live: number;
    in_flight: number;
    completed_today: number;
    partners_with_live_jobs: number;
  };
  tab_counts: Record<B2BErrandTab, number>;
  organizations: Array<{ id: number; name: string; status: string }>;
};

export type AdminB2BErrandFilters = {
  tab?: B2BErrandTab;
  search?: string;
  organization_id?: number;
  assignment?: 'assigned' | 'unassigned';
  status?: string;
  page?: number;
  per_page?: number;
};

export async function fetchAdminB2BErrandsOverview() {
  const { data } = await http.get<ApiResponse<AdminB2BErrandsOverview>>('/admin/b2b/errands/overview');
  return unwrapApiData(data, 'Failed to load B2B errand overview.');
}

export async function fetchAdminB2BErrands(params: AdminB2BErrandFilters = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminB2BErrandRow>>>('/admin/b2b/errands', { params });
  return unwrapApiData(data, 'Failed to load B2B errands.');
}
