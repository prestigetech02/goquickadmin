import { http } from '@/lib/http';
import { unwrapApiData, type ListQueryParams, type Paginated } from '@/types/api';
import type { SupportTicketListItem } from '@/types/api';
import type { ApiResponse } from '@/types';

export type { SupportTicketListItem };

export async function fetchAdminSupportTickets(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<SupportTicketListItem>>>(
    '/admin/support/tickets',
    { params },
  );
  return unwrapApiData(data, 'Failed to load tickets.');
}

export async function fetchAdminSupportTicket(id: number) {
  const { data } = await http.get<ApiResponse<{ ticket: SupportTicketListItem }>>(
    `/admin/support/tickets/${id}`,
  );
  const payload = unwrapApiData(data, 'Failed to load ticket.');
  return payload.ticket;
}

export async function replyAdminSupportTicket(id: number, message: string) {
  const { data } = await http.post<ApiResponse<{ ticket: SupportTicketListItem }>>(
    `/admin/support/tickets/${id}/messages`,
    { message },
  );
  const payload = unwrapApiData(data, 'Failed to send reply.');
  return payload.ticket;
}

export async function updateAdminSupportTicketStatus(
  id: number,
  status: 'open' | 'awaiting_user' | 'resolved' | 'closed',
) {
  const { data } = await http.put<ApiResponse<{ ticket: SupportTicketListItem }>>(
    `/admin/support/tickets/${id}/status`,
    { status },
  );
  const payload = unwrapApiData(data, 'Failed to update ticket status.');
  return payload.ticket;
}
