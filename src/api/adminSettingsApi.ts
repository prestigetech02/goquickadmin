import { http } from '@/lib/http';
import { unwrapApiData, type SettingsData } from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminSettings() {
  const { data } = await http.get<ApiResponse<SettingsData>>('/admin/settings');
  return unwrapApiData(data, 'Failed to load settings.');
}
