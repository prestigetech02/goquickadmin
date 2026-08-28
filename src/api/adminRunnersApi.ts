import { http } from '@/lib/http';
import {
  type AdminActionResult,
  unwrapApiData,
  type ListQueryParams,
  type Paginated,
  type RunnerEarnings,
  type RunnerListItem,
  type RunnerMetrics,
  type RunnerProfile,
  type RunnerVerificationItem,
  type RunnerVerificationMetrics,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchRunnerMetrics() {
  const { data } = await http.get<ApiResponse<RunnerMetrics>>('/admin/runners/metrics');
  return unwrapApiData(data, 'Failed to load runner metrics.');
}

export async function fetchAdminRunners(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<RunnerListItem>>>('/admin/runners', { params });
  return unwrapApiData(data, 'Failed to load runners.');
}

export async function fetchAdminRunner(id: number) {
  const { data } = await http.get<ApiResponse<{ runner: RunnerProfile }>>(`/admin/runners/${id}`);
  const payload = unwrapApiData(data, 'Failed to load runner.');
  return payload.runner;
}

export async function fetchAdminRunnerEarnings(id: number) {
  const { data } = await http.get<ApiResponse<RunnerEarnings>>(`/admin/runners/${id}/earnings`);
  return unwrapApiData(data, 'Failed to load runner earnings.');
}

export async function suspendAdminRunner(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/runners/${id}/suspend`);
  return unwrapApiData(data, 'Failed to suspend runner.');
}

export async function reactivateAdminRunner(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/runners/${id}/reactivate`);
  return unwrapApiData(data, 'Failed to reactivate runner.');
}

export async function resetAdminRunnerPassword(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/runners/${id}/reset-password`);
  return unwrapApiData(data, 'Failed to reset password.');
}

export async function fetchRunnerVerificationMetrics() {
  const { data } = await http.get<ApiResponse<RunnerVerificationMetrics>>(
    '/admin/runner-verifications/metrics',
  );
  return unwrapApiData(data, 'Failed to load KYC metrics.');
}

export async function fetchRunnerVerifications(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<Paginated<RunnerVerificationItem>>>(
    '/admin/runner-verifications',
    { params },
  );
  return unwrapApiData(data, 'Failed to load runner verifications.');
}

export async function fetchRunnerVerification(id: number) {
  const { data } = await http.get<ApiResponse<{ verification: RunnerVerificationItem }>>(
    `/admin/runner-verifications/${id}`,
  );
  const payload = unwrapApiData(data, 'Failed to load verification.');
  return payload.verification;
}

export async function approveRunnerVerification(id: number) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/runner-verifications/${id}/approve`);
  return unwrapApiData(data, 'Failed to approve verification.');
}

export async function rejectRunnerVerification(id: number, reason: string) {
  const { data } = await http.post<ApiResponse<AdminActionResult>>(`/admin/runner-verifications/${id}/reject`, {
    reason,
  });
  return unwrapApiData(data, 'Failed to reject verification.');
}
