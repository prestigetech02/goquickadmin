import { http } from '@/lib/http';
import { unwrapApiData, type ListQueryParams } from '@/types/api';
import type { AdminModule, ApiResponse } from '@/types';

export type AdminAccountItem = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  admin_role: string | null;
  admin_modules: AdminModule[];
  is_super_admin: boolean;
  must_change_password: boolean;
  is_suspended: boolean;
  created_at: string;
  last_login?: {
    at: string | null;
    device: string | null;
    device_type: string | null;
    location: string | null;
    ip_address: string | null;
  } | null;
  active_sessions?: number;
  last_seen_at?: string | null;
  actions_30d?: number;
  last_action_at?: string | null;
};

export type AdminAccessFilter = 'super' | AdminModule | 'pending';

export type AdminAccountsSummary = {
  total: number;
  super_admins: number;
  operations: number;
  finance: number;
  content?: number;
  insights?: number;
  administration?: number;
  pending_password: number;
  active_7d: number;
};

export type AdminAccountDetail = {
  admin: AdminAccountItem;
  logins: Array<{
    id: number;
    device: string | null;
    device_type: string | null;
    ip_address: string | null;
    location: string | null;
    country_code: string | null;
    active: boolean;
    created_at: string | null;
  }>;
  recent_actions: Array<{
    id: number;
    label: string;
    resource: string;
    target_user: { id: number; name: string; role: string | null } | null;
    succeeded: boolean;
    created_at: string | null;
  }>;
  stats: {
    actions_30d: number;
    failed_actions_30d: number;
    failed_sign_ins_30d: number;
    active_days_30d: number;
    top_areas: Array<{ resource: string; label: string; count: number }>;
  };
};

export type AdminAccountsListResponse = {
  admins: AdminAccountItem[];
  summary?: AdminAccountsSummary;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export async function fetchAdminAccounts(params: ListQueryParams & { access?: AdminAccessFilter } = {}) {
  const { data } = await http.get<ApiResponse<AdminAccountsListResponse>>('/admin/admins', { params });
  return unwrapApiData(data, 'Failed to load admin accounts.');
}

export async function fetchAdminAccount(id: number) {
  const { data } = await http.get<ApiResponse<AdminAccountDetail>>(`/admin/admins/${id}`);
  return unwrapApiData(data, 'Failed to load admin account.');
}

export async function revokeAdminSessions(id: number) {
  const { data } = await http.post<ApiResponse<{ revoked: number }>>(`/admin/admins/${id}/revoke-sessions`);
  return unwrapApiData(data, 'Failed to sign this admin out.');
}

export async function createAdminAccount(input: {
  name: string;
  email: string;
  modules: AdminModule[];
  send_email?: boolean;
}) {
  const { data } = await http.post<ApiResponse<{ admin: AdminAccountItem; email_sent: boolean }>>(
    '/admin/admins',
    input,
  );
  return unwrapApiData(data, 'Failed to create admin account.');
}

export async function updateAdminModules(id: number, modules: AdminModule[]) {
  const { data } = await http.put<ApiResponse<{ admin: AdminAccountItem }>>(`/admin/admins/${id}/modules`, {
    modules,
  });
  const payload = unwrapApiData(data, 'Failed to update admin modules.');
  return payload.admin;
}

export async function resendAdminCredentials(id: number) {
  const { data } = await http.post<ApiResponse<{ admin: AdminAccountItem; email_sent: boolean }>>(
    `/admin/admins/${id}/resend-credentials`,
  );
  return unwrapApiData(data, 'Failed to resend credentials.');
}

export async function removeAdminAccess(id: number, role: 'buyer' | 'runner' = 'buyer') {
  const { data } = await http.post<ApiResponse<{ user: { id: number; role: string } }>>(
    `/admin/admins/${id}/remove`,
    { role },
  );
  return unwrapApiData(data, 'Failed to remove admin access.');
}
