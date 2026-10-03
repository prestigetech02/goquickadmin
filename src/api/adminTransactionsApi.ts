import { http } from '@/lib/http';
import {
  type AdminTransactionFilters,
  type AdminTransactionPage,
  type AdminTransactionRow,
  type AdminTransactionsOverview,
  type Paginated,
  type TransactionReconcileResult,
  unwrapApiData,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminTransactionsOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminTransactionsOverview>>('/admin/finance/transactions/overview', { params });
  return unwrapApiData(data, 'Failed to load transaction overview.');
}

export async function fetchAdminTransactions(
  params: AdminTransactionFilters & { page?: number; per_page?: number } = {},
): Promise<AdminTransactionPage> {
  const { data } = await http.get<ApiResponse<Paginated<AdminTransactionRow>> & { meta?: { user?: AdminTransactionPage['filter_user'] } }>(
    '/admin/finance/transactions',
    { params },
  );
  return { ...unwrapApiData(data, 'Failed to load transactions.'), filter_user: data.meta?.user ?? null };
}

/** Downloads the filtered ledger as CSV (auth header comes from the shared http client). */
export async function downloadAdminTransactionsExport(params: AdminTransactionFilters = {}) {
  const response = await http.get<Blob>('/admin/finance/transactions/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-transactions.csv';
  saveBlob(response.data, filename);
}

export async function reconcileAdminTransactions() {
  const { data } = await http.post<ApiResponse<TransactionReconcileResult>>('/admin/finance/transactions/reconcile');
  return unwrapApiData(data, 'Failed to reconcile with Paystack.');
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
