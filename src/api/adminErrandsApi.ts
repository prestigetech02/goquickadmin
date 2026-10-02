import { http } from '@/lib/http';
import {
  unwrapApiData,
  type AdminErrandBoardFilters,
  type AdminErrandBoardRow,
  type AdminErrandsOverview,
  type AdminErrandNote,
  type AdminErrandView,
  type ErrandDetails,
  type ErrandListItem,
  type ErrandOpsStats,
  type ListQueryParams,
  type Paginated,
} from '@/types/api';
import type { ApiResponse } from '@/types';
import { saveBlob } from '@/api/adminTransactionsApi';

export async function fetchAdminErrandsOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminErrandsOverview>>('/admin/errands/board/overview', { params });
  return unwrapApiData(data, 'Failed to load errand overview.');
}

export async function fetchAdminErrandBoard(params: AdminErrandBoardFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminErrandBoardRow> & { total_value: number }>>('/admin/errands/board', {
    params,
  });
  return unwrapApiData(data, 'Failed to load errands.');
}

export async function downloadAdminErrandsExport(params: AdminErrandBoardFilters = {}) {
  const response = await http.get<Blob>('/admin/errands/board/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-errands.csv';
  saveBlob(response.data, filename);
}

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

export async function fetchAdminErrandView(id: number) {
  const { data } = await http.get<ApiResponse<AdminErrandView>>(`/admin/errands/${id}/details`);
  return unwrapApiData(data, 'Failed to load errand.');
}

export async function addAdminErrandNote(id: number, body: string) {
  const { data } = await http.post<ApiResponse<{ notes: AdminErrandNote[] }>>(`/admin/errands/${id}/notes`, { body });
  return unwrapApiData(data, 'Failed to add note.');
}

export async function refundAdminErrandEscrow(id: number, reason?: string) {
  const { data } = await http.post<ApiResponse<{ errand?: ErrandDetails; refunded?: boolean }>>(
    `/admin/errands/${id}/escrow/refund`,
    reason ? { reason } : undefined,
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
  payload: { status: string; reason: string; refund_escrow?: boolean; release_escrow?: boolean },
) {
  const { data } = await http.post<ApiResponse<{ errand: ErrandDetails }>>(
    `/admin/errands/${id}/force-status`,
    payload,
  );
  return unwrapApiData(data, 'Failed to update errand status.');
}
