import { http } from '@/lib/http';
import { unwrapApiData, type HelpSupportData } from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminHelpSupport() {
  const { data } = await http.get<ApiResponse<HelpSupportData>>('/admin/help-support');
  return unwrapApiData(data, 'Failed to load help & support info.');
}
