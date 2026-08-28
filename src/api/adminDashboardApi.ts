import { http } from '@/lib/http';
import {
  unwrapApiData,
  type DashboardPerformance,
  type DashboardStats,
  type PerformancePeriod,
  type PerformanceTab,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchDashboardStats() {
  const { data } = await http.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
  return unwrapApiData(data, 'Failed to load dashboard stats.');
}

export async function fetchDashboardPerformance(params: {
  tab: PerformanceTab;
  period: PerformancePeriod;
  start_date?: string;
  end_date?: string;
}) {
  const { data } = await http.get<ApiResponse<DashboardPerformance>>('/admin/dashboard/performance', {
    params,
  });
  return unwrapApiData(data, 'Failed to load performance data.');
}
