import { http } from '@/lib/http';
import type { ApiResponse } from '@/types';
import {
  unwrapApiData,
  type AdminSettingsBoard,
  type OperationsSettings,
  type PayoutSettings,
  type SettingsSection,
} from '@/types/api';

export async function fetchAdminSettingsBoard() {
  const { data } = await http.get<ApiResponse<AdminSettingsBoard>>('/admin/settings/board');
  return unwrapApiData(data, 'Failed to load settings.');
}

export async function updateOperationsSettings(input: OperationsSettings) {
  const { data } = await http.put<ApiResponse<SettingsSection<OperationsSettings>>>('/admin/settings/board/operations', input);
  return unwrapApiData(data, 'Failed to save operations settings.');
}

export async function updatePayoutSettings(input: PayoutSettings) {
  const { data } = await http.put<ApiResponse<SettingsSection<PayoutSettings>>>('/admin/settings/board/payouts', input);
  return unwrapApiData(data, 'Failed to save payout settings.');
}
