import { registerCategoryNames } from '@/components/admin2/errand/errandPresentation';
import { http } from '@/lib/http';
import type { ApiResponse } from '@/types';
import { unwrapApiData, type AdminErrandType, type AdminErrandTypesResponse, type ErrandTypeInput } from '@/types/api';

export async function fetchAdminErrandTypes() {
  const { data } = await http.get<ApiResponse<AdminErrandTypesResponse>>('/admin/errand-types');
  const payload = unwrapApiData(data, 'Failed to load errand types.');
  registerCategoryNames(payload.types);
  return payload;
}

export async function createAdminErrandType(input: ErrandTypeInput) {
  const { data } = await http.post<ApiResponse<{ type: AdminErrandType }>>('/admin/errand-types', input);
  return unwrapApiData(data, 'Failed to add errand type.').type;
}

export async function updateAdminErrandType(slug: string, input: ErrandTypeInput) {
  const { data } = await http.put<ApiResponse<{ type: AdminErrandType }>>(`/admin/errand-types/${encodeURIComponent(slug)}`, input);
  return unwrapApiData(data, 'Failed to save errand type.').type;
}
