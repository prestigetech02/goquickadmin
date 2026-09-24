import { http } from '@/lib/http';
import {
  unwrapApiData,
  type AdminZone,
  type AdminZoneInput,
  type AdminZoneListResponse,
  type AdminZoneStats,
  type ListQueryParams,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminZoneStats() {
  const { data } = await http.get<ApiResponse<AdminZoneStats>>('/admin/zones/stats');
  return unwrapApiData(data, 'Failed to load zone stats.');
}

export async function fetchAdminZones(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<AdminZoneListResponse>>('/admin/zones', { params });
  return unwrapApiData(data, 'Failed to load zones.');
}

export async function fetchAdminZone(id: number) {
  const { data } = await http.get<ApiResponse<AdminZone>>(`/admin/zones/${id}`);
  return unwrapApiData(data, 'Failed to load zone.');
}

export async function createAdminZone(input: AdminZoneInput) {
  const { data } = await http.post<ApiResponse<AdminZone>>('/admin/zones', input);
  return unwrapApiData(data, 'Failed to create zone.');
}

export async function updateAdminZone(id: number, input: AdminZoneInput) {
  const { data } = await http.put<ApiResponse<AdminZone>>(`/admin/zones/${id}`, input);
  return unwrapApiData(data, 'Failed to update zone.');
}

export async function deleteAdminZone(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/zones/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete zone.');
  }
}
