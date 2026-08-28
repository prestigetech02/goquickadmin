import { http } from '@/lib/http';
import {
  type AdminNotificationsListResponse,
  type ListQueryParams,
  type NotificationBroadcastResult,
  type NotificationListItem,
  type NotificationListMeta,
  unwrapApiData,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export type { NotificationListItem, NotificationListMeta, NotificationBroadcastResult };

export type BroadcastTarget = 'all' | 'buyers' | 'runners' | 'custom';

type NotificationsIndexResponse = ApiResponse<NotificationListItem[]> & {
  meta: NotificationListMeta;
};

export async function fetchAdminNotifications(
  params: ListQueryParams = {},
): Promise<AdminNotificationsListResponse> {
  const { data } = await http.get<NotificationsIndexResponse>('/admin/notifications', { params });

  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.error?.message || data.message || 'Failed to load notifications.');
  }

  return {
    items: data.data,
    meta: data.meta,
  };
}

export async function broadcastAdminNotification(input: {
  title: string;
  message: string;
  target: BroadcastTarget;
  user_ids?: number[];
}) {
  const { data } = await http.post<ApiResponse<NotificationBroadcastResult>>(
    '/admin/notifications/broadcast',
    input,
  );
  return unwrapApiData(data, 'Failed to send broadcast.');
}
