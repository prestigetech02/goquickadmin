import { http } from '@/lib/http';
import {
  type AdminAuditLogEntry,
  type AdminAuditLogFilters,
  type AdminAuditLogOptions,
  type AdminAuditLogSummary,
  type Paginated,
  unwrapApiData,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminAuditLogs(params: AdminAuditLogFilters = {}) {
  const { data } = await http.get<ApiResponse<Paginated<AdminAuditLogEntry>>>('/admin/audit-logs', { params });
  return unwrapApiData(data, 'Failed to load the audit log.');
}

export async function fetchAdminAuditLogSummary() {
  const { data } = await http.get<ApiResponse<AdminAuditLogSummary>>('/admin/audit-logs/summary');
  return unwrapApiData(data, 'Failed to load audit log activity.');
}

export async function fetchAdminAuditLogOptions() {
  const { data } = await http.get<ApiResponse<AdminAuditLogOptions>>('/admin/audit-logs/options');
  return unwrapApiData(data, 'Failed to load audit log filters.');
}

/** Downloads the filtered audit log as CSV (auth header comes from the shared http client). */
export async function downloadAdminAuditLogExport(params: AdminAuditLogFilters = {}) {
  const response = await http.get<Blob>('/admin/audit-logs/export', { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'goquick-audit-log.csv';
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
