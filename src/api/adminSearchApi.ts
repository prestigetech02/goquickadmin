import { http } from '@/lib/http';
import { unwrapApiData, type GlobalSearchData } from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminGlobalSearch(query: string) {
  const { data } = await http.get<ApiResponse<GlobalSearchData>>('/admin/search', {
    params: { q: query.trim() },
  });
  return unwrapApiData(data, 'Search failed.');
}
