import { http } from '@/lib/http';
import {
  type AdminWithdrawalDetail,
  type AdminWithdrawalFilters,
  type AdminWithdrawalRow,
  type AdminWithdrawalsOverview,
  type Paginated,
  type WithdrawalSyncResult,
  unwrapApiData,
} from '@/types/api';
import type { ApiResponse } from '@/types';
import { saveBlob } from '@/api/adminTransactionsApi';

export async function fetchAdminWithdrawalsOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminWithdrawalsOverview>>('/admin/finance/withdrawals/overview', { params });
  return unwrapApiData(data, 'Failed to load withdrawal overview.');
}

export async function fetchAdminWithdrawalQueue(params: AdminWithdrawalFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminWithdrawalRow> & { total_amount: number }>>(
    '/admin/finance/withdrawals',
    { params },
  );
  return unwrapApiData(data, 'Failed to load withdrawals.');
}

export async function fetchAdminWithdrawalReview(id: number) {
  const { data } = await http.get<ApiResponse<AdminWithdrawalDetail>>(`/admin/finance/withdrawals/${id}`);
  return unwrapApiData(data, 'Failed to load withdrawal.');
}

export async function downloadAdminWithdrawalsExport(params: AdminWithdrawalFilters = {}) {
  const response = await http.get<Blob>('/admin/finance/withdrawals/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-withdrawals.csv';
  saveBlob(response.data, filename);
}

export async function syncAdminWithdrawalPayouts() {
  const { data } = await http.post<ApiResponse<WithdrawalSyncResult>>('/admin/finance/withdrawals/sync');
  return unwrapApiData(data, 'Failed to sync payouts.');
}
