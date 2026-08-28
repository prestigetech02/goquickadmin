import { http } from '@/lib/http';
import {
  unwrapApiData,
  type ListQueryParams,
  type Paginated,
  type WithdrawalListItem,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export type { WithdrawalListItem };

export async function fetchAdminWithdrawals(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<WithdrawalListItem>>>('/admin/withdrawals', {
    params,
  });
  return unwrapApiData(data, 'Failed to load withdrawals.');
}

export async function fetchAdminWithdrawal(id: number) {
  const { data } = await http.get<ApiResponse<{ withdrawal: WithdrawalListItem }>>(
    `/admin/withdrawals/${id}`,
  );
  const payload = unwrapApiData(data, 'Failed to load withdrawal.');
  return payload.withdrawal;
}

export async function approveAdminWithdrawal(id: number) {
  const { data } = await http.post<ApiResponse<{ withdrawal: WithdrawalListItem }>>(
    `/admin/withdrawals/${id}/approve`,
  );
  return unwrapApiData(data, 'Failed to approve withdrawal.');
}

export async function rejectAdminWithdrawal(id: number, reason: string) {
  const { data } = await http.post<ApiResponse<{ withdrawal: WithdrawalListItem }>>(
    `/admin/withdrawals/${id}/reject`,
    { reason },
  );
  return unwrapApiData(data, 'Failed to reject withdrawal.');
}

export async function markAdminWithdrawalPaid(id: number) {
  const { data } = await http.post<ApiResponse<{ withdrawal: WithdrawalListItem }>>(
    `/admin/withdrawals/${id}/mark-paid`,
  );
  return unwrapApiData(data, 'Failed to mark withdrawal as paid.');
}
