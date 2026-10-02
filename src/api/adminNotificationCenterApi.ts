import { http } from '@/lib/http';
import {
  type AdminNotificationsOverview,
  type CampaignAudience,
  type CampaignCategory,
  type CampaignEstimate,
  type CampaignInput,
  type NotificationCampaignDetail,
  type NotificationGroupDetail,
  type NotificationHistoryFilters,
  type NotificationHistoryRow,
  type Paginated,
  unwrapApiData,
} from '@/types/api';
import type { ApiResponse } from '@/types';

type CampaignResult = { campaign: NotificationHistoryRow };

export async function fetchNotificationsOverview(params: { start_date?: string; end_date?: string } = {}) {
  const { data } = await http.get<ApiResponse<AdminNotificationsOverview>>('/admin/notifications/overview', { params });
  return unwrapApiData(data, 'Failed to load notification overview.');
}

export async function fetchNotificationHistory(params: NotificationHistoryFilters & { page?: number; per_page?: number } = {}) {
  const { data } = await http.get<ApiResponse<Pick<Paginated<NotificationHistoryRow>, 'data' | 'current_page' | 'last_page' | 'per_page' | 'total'>>>(
    '/admin/notifications/history',
    { params },
  );
  return unwrapApiData(data, 'Failed to load notification history.');
}

export async function fetchNotificationCampaign(id: number) {
  const { data } = await http.get<ApiResponse<NotificationCampaignDetail>>(`/admin/notifications/campaigns/${id}`);
  return unwrapApiData(data, 'Failed to load campaign.');
}

export async function fetchNotificationGroup(type: string, date: string) {
  const { data } = await http.get<ApiResponse<NotificationGroupDetail>>('/admin/notifications/history/group', { params: { type, date } });
  return unwrapApiData(data, 'Failed to load notifications.');
}

export async function fetchCampaignEstimate(params: { audience: CampaignAudience; user_ids?: number[]; category: CampaignCategory }) {
  const { data } = await http.get<ApiResponse<CampaignEstimate>>('/admin/notifications/audience-estimate', { params });
  return unwrapApiData(data, 'Failed to estimate audience.');
}

export async function saveNotificationCampaign(input: CampaignInput, id?: number) {
  const request = id
    ? http.put<ApiResponse<CampaignResult>>(`/admin/notifications/campaigns/${id}`, input)
    : http.post<ApiResponse<CampaignResult>>('/admin/notifications/campaigns', input);
  const { data } = await request;
  return unwrapApiData(data, 'Failed to save campaign.').campaign;
}

export async function campaignAction(id: number, action: 'send' | 'cancel' | 'duplicate') {
  const { data } = await http.post<ApiResponse<CampaignResult>>(`/admin/notifications/campaigns/${id}/${action}`);
  return unwrapApiData(data, 'That action failed.').campaign;
}

export async function deleteNotificationCampaign(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/notifications/campaigns/${id}`);
  if (!data.success) throw new Error(data.error?.message || data.message || 'Failed to delete draft.');
}
