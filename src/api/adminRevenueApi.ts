import { http } from '@/lib/http';
import { type AdminRevenueFilters, type AdminRevenueOverview, type AdminRevenueRow, type Paginated, unwrapApiData } from '@/types/api';
import type { ApiResponse } from '@/types';
import { saveBlob } from './adminTransactionsApi';

export async function fetchAdminRevenueOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminRevenueOverview>>('/admin/finance/revenue/overview', { params });
  return unwrapApiData(data, 'Failed to load revenue overview.');
}

export async function fetchAdminRevenueTransactions(params: AdminRevenueFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminRevenueRow>>>('/admin/finance/revenue/transactions', { params });
  return unwrapApiData(data, 'Failed to load revenue transactions.');
}

export async function downloadAdminRevenueExport(params: AdminRevenueFilters = {}) {
  const response = await http.get<Blob>('/admin/finance/revenue/transactions/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-revenue.csv';
  saveBlob(response.data, filename);
}
