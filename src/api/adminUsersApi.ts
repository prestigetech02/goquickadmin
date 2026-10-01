import { http } from '@/lib/http';
import {
  type AdminActionResult,
  type AdminErrandNote,
  type AdminUserErrandRow,
  type AdminUserProfile,
  type AdminUserProfileUpdate,
  unwrapApiData,
  type ListQueryParams,
  type Paginated,
  type UserDetails,
  type UserListItem,
  type UsersSummary,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminUsers(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<UserListItem>>>('/admin/users', { params });
  return unwrapApiData(data, 'Failed to load users.');
}

export async function fetchAdminUsersSummary(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<UsersSummary>>('/admin/users/summary', { params });
  return unwrapApiData(data, 'Failed to load user summary.');
}

/** Downloads the filtered directory as CSV (auth header comes from the shared http client). */
export async function downloadAdminUsersExport(params: ListQueryParams = {}) {
  const response = await http.get<Blob>('/admin/users/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-users.csv';
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchAdminUser(id: number) {
  const { data } = await http.get<ApiResponse<UserDetails>>(`/admin/users/${id}`);
  return unwrapApiData(data, 'Failed to load user.');
}

export async function fetchAdminUserProfile(id: number) {
  const { data } = await http.get<ApiResponse<AdminUserProfile>>(`/admin/users/${id}/profile`);
  return unwrapApiData(data, 'Failed to load user profile.');
}

export async function fetchAdminUserErrands(id: number, params: { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminUserErrandRow>>>(`/admin/users/${id}/errands`, { params });
  return unwrapApiData(data, "Failed to load the user's errands.");
}

export async function updateAdminUser(id: number, payload: AdminUserProfileUpdate) {
  const { data } = await http.patch<ApiResponse<{ id: number }>>(`/admin/users/${id}`, payload);
  return unwrapApiData(data, 'Failed to update profile.');
}

export async function addAdminUserNote(id: number, body: string) {
  const { data } = await http.post<ApiResponse<{ notes: AdminErrandNote[] }>>(`/admin/users/${id}/notes`, { body });
  return unwrapApiData(data, 'Failed to save note.');
}

export async function sendAdminUserPasswordReset(id: number) {
  const { data } = await http.post<ApiResponse<null> & { message?: string }>(`/admin/users/${id}/reset-password`);
  if (!data.success) throw new Error(data.error?.message ?? 'Failed to send password reset.');
  return data.message ?? 'Password reset email sent.';
}

export async function revokeAdminUserSessions(id: number) {
  const { data } = await http.post<ApiResponse<{ revoked: number }>>(`/admin/users/${id}/sessions/revoke`);
  return unwrapApiData(data, 'Failed to sign the user out.');
}

export async function suspendAdminUser(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/users/${id}/suspend`);
  return unwrapApiData(data, 'Failed to suspend user.');
}

export async function reactivateAdminUser(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/users/${id}/reactivate`);
  return unwrapApiData(data, 'Failed to reactivate user.');
}
