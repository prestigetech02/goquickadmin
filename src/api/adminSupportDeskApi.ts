import { http } from '@/lib/http';
import {
  unwrapApiData,
  type AdminSupportFilters,
  type AdminSupportOverview,
  type AdminSupportTicketRow,
  type AdminSupportWorkspace,
  type Paginated,
  type SupportDeskAgent,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export type SupportReplyInput = {
  message: string;
  internal?: boolean;
  then?: 'awaiting_user' | 'resolved';
  attachment?: File | null;
};

export type SupportTicketUpdate = {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
};

type WorkspaceResult = { workspace: AdminSupportWorkspace; message: string };

export async function fetchAdminSupportOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminSupportOverview>>('/admin/support/desk/overview', { params });
  return unwrapApiData(data, 'Failed to load the support overview.');
}

export async function fetchAdminSupportQueue(params: AdminSupportFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminSupportTicketRow>>>('/admin/support/desk', { params });
  return unwrapApiData(data, 'Failed to load support tickets.');
}

export async function fetchAdminSupportWorkspace(id: number) {
  const { data } = await http.get<ApiResponse<AdminSupportWorkspace>>(`/admin/support/desk/${id}`);
  return unwrapApiData(data, 'Failed to load the ticket.');
}

export async function fetchAdminSupportAgents() {
  const { data } = await http.get<ApiResponse<{ agents: SupportDeskAgent[] }>>('/admin/support/desk/agents');
  return unwrapApiData(data, 'Failed to load the support team.').agents;
}

export async function replyToAdminSupportTicket(id: number, input: SupportReplyInput): Promise<WorkspaceResult> {
  let body: FormData | Omit<SupportReplyInput, 'attachment'>;
  if (input.attachment) {
    const form = new FormData();
    form.append('message', input.message);
    form.append('internal', input.internal ? '1' : '0');
    form.append('then', input.then ?? 'awaiting_user');
    form.append('attachment', input.attachment);
    body = form;
  } else {
    body = { message: input.message, internal: input.internal ?? false, then: input.then ?? 'awaiting_user' };
  }
  const { data } = await http.post<ApiResponse<AdminSupportWorkspace>>(`/admin/support/desk/${id}/reply`, body);
  return { workspace: unwrapApiData(data, 'Failed to send the message.'), message: data.message ?? '' };
}

export async function updateAdminSupportTicket(id: number, input: SupportTicketUpdate): Promise<WorkspaceResult> {
  const { data } = await http.patch<ApiResponse<AdminSupportWorkspace>>(`/admin/support/desk/${id}`, input);
  return { workspace: unwrapApiData(data, 'Failed to update the ticket.'), message: data.message ?? '' };
}

/** Omit assigneeId to take the ticket yourself; pass null to return it to the queue. */
export async function assignAdminSupportTicket(id: number, assigneeId?: number | null): Promise<WorkspaceResult> {
  const body = assigneeId === undefined ? {} : { assignee_id: assigneeId };
  const { data } = await http.post<ApiResponse<AdminSupportWorkspace>>(`/admin/support/desk/${id}/assign`, body);
  return { workspace: unwrapApiData(data, 'Failed to update the ticket owner.'), message: data.message ?? '' };
}
