import { http } from '@/lib/http';
import { unwrapApiData, type SystemHealthData } from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminSystemHealth() {
  const { data } = await http.get<ApiResponse<SystemHealthData>>('/admin/system-health');
  return unwrapApiData(data, 'Failed to load system health.');
}
