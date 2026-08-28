import { http } from '@/lib/http';
import {
  unwrapApiData,
  type ErrandDetails,
  type ErrandListItem,
  type ErrandOpsStats,
  type ListQueryParams,
  type Paginated,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminErrands(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<ErrandListItem>>>('/admin/errands', { params });
  return unwrapApiData(data, 'Failed to load errands.');
}

export async function fetchAdminErrandOpsStats() {
  const { data } = await http.get<ApiResponse<ErrandOpsStats>>('/admin/errands/ops-stats');
  return unwrapApiData(data, 'Failed to load errand ops stats.');
}

export async function fetchAdminErrand(id: number) {
  const { data } = await http.get<ApiResponse<{ errand: ErrandDetails }>>(`/admin/errands/${id}`);
  const payload = unwrapApiData(data, 'Failed to load errand.');
  return payload.errand;
}

export async function refundAdminErrandEscrow(id: number) {
  const { data } = await http.post<ApiResponse<{ errand?: ErrandDetails; refunded?: boolean }>>(
    `/admin/errands/${id}/escrow/refund`,
  );
  return unwrapApiData(data, 'Failed to refund escrow.');
}

export async function cancelAdminErrand(id: number, payload: { reason: string; refund_escrow?: boolean }) {
  const { data } = await http.post<ApiResponse<{ errand: ErrandDetails }>>(
    `/admin/errands/${id}/cancel`,
    payload,
  );
  return unwrapApiData(data, 'Failed to cancel errand.');
}

export async function reassignAdminErrand(id: number, payload: { runner_id: number; reason: string }) {
  const { data } = await http.post<ApiResponse<{ errand: ErrandDetails }>>(
    `/admin/errands/${id}/reassign`,
    payload,
  );
  return unwrapApiData(data, 'Failed to reassign runner.');
}

export async function forceAdminErrandStatus(
  id: number,
  payload: { status: string; reason: string; refund_escrow?: boolean },
) {
  const { data } = await http.post<ApiResponse<{ errand: ErrandDetails }>>(
    `/admin/errands/${id}/force-status`,
    payload,
  );
  return unwrapApiData(data, 'Failed to update errand status.');
}
