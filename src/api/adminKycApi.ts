import { http } from '@/lib/http';
import { type AdminKycDetail, type AdminKycFilters, type AdminKycOverview, type AdminKycRow, type Paginated, unwrapApiData } from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminKycOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminKycOverview>>('/admin/runner-verifications/overview', { params });
  return unwrapApiData(data, 'Failed to load verification overview.');
}

export async function fetchAdminKycQueue(params: AdminKycFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminKycRow>>>('/admin/runner-verifications/queue', { params });
  return unwrapApiData(data, 'Failed to load verifications.');
}

export async function fetchAdminKycReview(id: number) {
  const { data } = await http.get<ApiResponse<AdminKycDetail>>(`/admin/runner-verifications/${id}/review`);
  return unwrapApiData(data, 'Failed to load verification.');
}
