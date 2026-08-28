import { http } from '@/lib/http';
import {
  type AdminActionResult,
  unwrapApiData,
  type ListQueryParams,
  type Paginated,
  type UserDetails,
  type UserListItem,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminUsers(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<UserListItem>>>('/admin/users', { params });
  return unwrapApiData(data, 'Failed to load users.');
}

export async function fetchAdminUser(id: number) {
  const { data } = await http.get<ApiResponse<UserDetails>>(`/admin/users/${id}`);
  return unwrapApiData(data, 'Failed to load user.');
}

export async function suspendAdminUser(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/users/${id}/suspend`);
  return unwrapApiData(data, 'Failed to suspend user.');
}

export async function reactivateAdminUser(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/users/${id}/reactivate`);
  return unwrapApiData(data, 'Failed to reactivate user.');
}
