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
};

export type AdminAccountsListResponse = {
  admins: AdminAccountItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export async function fetchAdminAccounts(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<AdminAccountsListResponse>>('/admin/admins', { params });
  return unwrapApiData(data, 'Failed to load admin accounts.');
}

export async function fetchAdminAccount(id: number) {
  const { data } = await http.get<ApiResponse<{ admin: AdminAccountItem }>>(`/admin/admins/${id}`);
  const payload = unwrapApiData(data, 'Failed to load admin account.');
  return payload.admin;
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
