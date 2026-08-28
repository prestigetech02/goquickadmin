import { http } from '@/lib/http';
import {
  unwrapApiData,
  type ListQueryParams,
  type Paginated,
  type UserWalletPayload,
  type WalletLedgerStats,
  type WalletTransactionDetail,
  type WalletTransactionListItem,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export type WalletTransactionListParams = ListQueryParams & {
  type?: 'credit' | 'debit';
  status?: 'pending' | 'completed' | 'failed' | 'reversed';
  category?: string;
  user_id?: number;
  wallet_id?: number;
  errand_id?: number;
  funding_queue?: boolean;
  date_from?: string;
  date_to?: string;
};

export async function fetchWalletLedgerStats() {
  const { data } = await http.get<ApiResponse<WalletLedgerStats>>('/admin/wallet-transactions/stats');
  return unwrapApiData(data, 'Failed to load wallet ledger stats.');
}

export async function fetchWalletTransactions(params: WalletTransactionListParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<WalletTransactionListItem>>>(
    '/admin/wallet-transactions',
    { params },
  );
  return unwrapApiData(data, 'Failed to load wallet transactions.');
}

export async function fetchWalletTransaction(id: number) {
  const { data } = await http.get<ApiResponse<WalletTransactionDetail>>(
    `/admin/wallet-transactions/${id}`,
  );
  return unwrapApiData(data, 'Failed to load wallet transaction.');
}

export async function fetchAdminUserWallet(userId: number, params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<UserWalletPayload>>(`/admin/users/${userId}/wallet`, {
    params,
  });
  return unwrapApiData(data, 'Failed to load user wallet.');
}

export async function adjustAdminUserWallet(
  userId: number,
  payload: { type: 'credit' | 'debit'; amount: number; reason: string },
) {
  const { data } = await http.post<ApiResponse<{ transaction: WalletTransactionListItem }>>(
    `/admin/users/${userId}/wallet/adjust`,
    payload,
  );
  return unwrapApiData(data, 'Failed to adjust wallet.');
}

export async function verifyAdminWalletFunding(id: number) {
  const { data } = await http.post<ApiResponse<{ transaction: WalletTransactionListItem }>>(
    `/admin/wallet-transactions/${id}/verify-funding`,
  );
  return unwrapApiData(data, 'Failed to verify funding.');
}

export async function markAdminWalletFundingFailed(id: number, reason: string) {
  const { data } = await http.post<ApiResponse<{ transaction: WalletTransactionListItem }>>(
    `/admin/wallet-transactions/${id}/mark-failed`,
    { reason },
  );
  return unwrapApiData(data, 'Failed to mark funding as failed.');
}

export async function cancelAdminWalletFunding(id: number, reason: string) {
  const { data } = await http.post<ApiResponse<{ transaction: WalletTransactionListItem }>>(
    `/admin/wallet-transactions/${id}/cancel`,
    { reason },
  );
  return unwrapApiData(data, 'Failed to cancel funding.');
}

export async function reverseAdminWalletTransaction(id: number, reason: string) {
  const { data } = await http.post<ApiResponse<{ transaction: WalletTransactionListItem }>>(
    `/admin/wallet-transactions/${id}/reverse`,
    { reason },
  );
  return unwrapApiData(data, 'Failed to reverse transaction.');
}
