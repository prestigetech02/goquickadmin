import { http } from '@/lib/http';
import { type AdminAnalyticsCategories, type AdminAnalyticsOverview, unwrapApiData } from '@/types/api';
import type { ApiResponse } from '@/types';

type RangeParams = { start_date?: string; end_date?: string };

export async function fetchAdminAnalyticsOverview(params: RangeParams = {}) {
  const { data } = await http.get<ApiResponse<AdminAnalyticsOverview>>('/admin/analytics/overview', { params });
  return unwrapApiData(data, 'Failed to load analytics.');
}

export async function fetchAdminAnalyticsCategories(params: RangeParams & { zone?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminAnalyticsCategories>>('/admin/analytics/categories', { params });
  return unwrapApiData(data, 'Failed to load category performance.');
}
