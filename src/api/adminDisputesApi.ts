import { http } from '@/lib/http';
import {
  unwrapApiData,
  type AdminDisputeCase,
  type AdminDisputeFilters,
  type AdminDisputeRow,
  type AdminDisputesOverview,
  type DisputeListItem,
  type ListQueryParams,
  type Paginated,
} from '@/types/api';
import type { ApiResponse } from '@/types';
import { saveBlob } from '@/api/adminTransactionsApi';

export type { DisputeListItem };

export type ResolveDisputeInput = {
  resolution: string;
  status?: 'resolved' | 'closed';
  errand_status?:
    | 'pending'
    | 'accepted'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'disputed'
    | 'cancelled_by_buyer'
    | 'cancelled_by_runner'
    | null;
  refund_escrow?: boolean;
};

export type DisputeDecisionInput = {
  outcome: 'refund_requester' | 'pay_runner' | 'no_action' | 'dismiss';
  resolution: string;
  errand_status?: 'in_progress' | 'completed' | 'cancelled' | null;
};

export async function fetchAdminDisputes(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<DisputeListItem>>>('/admin/disputes', {
    params,
  });
  return unwrapApiData(data, 'Failed to load disputes.');
}

export async function fetchAdminDispute(id: number) {
  const { data } = await http.get<ApiResponse<{ dispute: DisputeListItem }>>(`/admin/disputes/${id}`);
  const payload = unwrapApiData(data, 'Failed to load dispute.');
  return payload.dispute;
}

export async function resolveAdminDispute(id: number, input: ResolveDisputeInput) {
  const { data } = await http.post<ApiResponse<{ dispute: DisputeListItem }>>(
    `/admin/disputes/${id}/resolve`,
    {
      resolution: input.resolution,
      status: input.status ?? 'resolved',
      errand_status: input.errand_status ?? null,
      refund_escrow: input.refund_escrow ?? false,
    },
  );
  const payload = unwrapApiData(data, 'Failed to resolve dispute.');
  return payload.dispute;
}

export async function fetchAdminDisputesOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminDisputesOverview>>('/admin/disputes/board/overview', { params });
  return unwrapApiData(data, 'Failed to load dispute overview.');
}

export async function fetchAdminDisputeBoard(params: AdminDisputeFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminDisputeRow> & { total_at_stake: number }>>('/admin/disputes/board', {
    params,
  });
  return unwrapApiData(data, 'Failed to load disputes.');
}

export async function downloadAdminDisputesExport(params: AdminDisputeFilters = {}) {
  const response = await http.get<Blob>('/admin/disputes/board/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-disputes.csv';
  saveBlob(response.data, filename);
}

export async function fetchAdminDisputeCase(id: number) {
  const { data } = await http.get<ApiResponse<AdminDisputeCase>>(`/admin/disputes/${id}/case`);
  return unwrapApiData(data, 'Failed to load dispute.');
}

/** Omit assigneeId to take the case yourself; pass null to return it to the queue. */
export async function assignAdminDispute(id: number, assigneeId?: number | null) {
  const body = assigneeId === undefined ? {} : { assignee_id: assigneeId };
  const { data } = await http.post<ApiResponse<{ dispute: AdminDisputeRow }>>(`/admin/disputes/${id}/assign`, body);
  const payload = unwrapApiData(data, 'Failed to update the dispute owner.');
  return { dispute: payload.dispute, message: data.message ?? '' };
}

export async function decideAdminDispute(id: number, input: DisputeDecisionInput) {
  const { data } = await http.post<ApiResponse<{ dispute: AdminDisputeRow }>>(`/admin/disputes/${id}/decide`, input);
  const payload = unwrapApiData(data, 'Failed to record the decision.');
  return { dispute: payload.dispute, message: data.message ?? '' };
}
