import { http } from '@/lib/http';
import {
  unwrapApiData,
  type DisputeListItem,
  type ListQueryParams,
  type Paginated,
} from '@/types/api';
import type { ApiResponse } from '@/types';

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
