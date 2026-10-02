import { http } from '@/lib/http';
import {
  type AdminRunnerBoardOverview,
  type AdminRunnerDirectory,
  type AdminRunnerFilters,
  type RunnerBulkAction,
  type RunnerBulkResult,
  unwrapApiData,
} from '@/types/api';
import type { ApiResponse } from '@/types';
import { saveBlob } from './adminTransactionsApi';

export async function fetchAdminRunnerBoardOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminRunnerBoardOverview>>('/admin/runner-board/overview', { params });
  return unwrapApiData(data, 'Failed to load runner overview.');
}

export async function fetchAdminRunnerDirectory(params: AdminRunnerFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<AdminRunnerDirectory>>('/admin/runner-board/directory', { params });
  return unwrapApiData(data, 'Failed to load runners.');
}

export async function downloadAdminRunnersExport(params: AdminRunnerFilters = {}) {
  const response = await http.get<Blob>('/admin/runner-board/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-runners.csv';
  saveBlob(response.data, filename);
}

export async function runAdminRunnerBulkAction(payload: { action: RunnerBulkAction; runner_ids: number[]; reason?: string }) {
  const { data } = await http.post<ApiResponse<RunnerBulkResult>>('/admin/runner-board/bulk', {
    ...payload,
    reason: payload.reason?.trim() || undefined,
  });
  return unwrapApiData(data, 'Bulk action failed.');
}
