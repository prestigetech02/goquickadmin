import { http } from '@/lib/http';
import {
  parseNotification,
  type AppNotification,
  type RawAppNotification,
} from '@/types/inAppNotification';
import type { ApiResponse } from '@/types';
import type { PaginationMeta } from '@/types/api';

export type InAppNotificationListResult = {
  items: AppNotification[];
  meta: PaginationMeta;
};

type NotificationListResponse = ApiResponse<RawAppNotification[]> & {
  meta?: Partial<PaginationMeta>;
};

function parseListResponse(data: NotificationListResponse): InAppNotificationListResult {
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.error?.message || data.message || 'Failed to load notifications.');
  }

  return {
    items: data.data.map((item) => parseNotification(item)),
    meta: {
      current_page: Number(data.meta?.current_page ?? 1),
      last_page: Number(data.meta?.last_page ?? 1),
      per_page: Number(data.meta?.per_page ?? data.data.length),
      total: Number(data.meta?.total ?? data.data.length),
      from: data.meta?.from ?? null,
      to: data.meta?.to ?? null,
    },
  };
}

export async function fetchInAppNotifications(params: {
  page?: number;
  per_page?: number;
  unread_only?: boolean;
} = {}): Promise<InAppNotificationListResult> {
  const { data } = await http.get<NotificationListResponse>('/notifications', { params });
  return parseListResponse(data);
}

export async function fetchInAppNotificationsPreview(limit = 5): Promise<InAppNotificationListResult> {
  return fetchInAppNotifications({ page: 1, per_page: limit });
}

export async function fetchInAppUnreadCount(): Promise<number> {
  const { data } = await http.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to load unread count.');
  }
  return Number(data.data?.count ?? 0);
}

export async function markInAppNotificationRead(id: number) {
  const { data } = await http.post<ApiResponse<{ notification: RawAppNotification }>>(
    `/notifications/${id}/read`,
  );
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to mark notification as read.');
  }
  return data.data?.notification ? parseNotification(data.data.notification) : null;
}

export async function markAllInAppNotificationsRead() {
  const { data } = await http.post<ApiResponse<null>>('/notifications/mark-all-read');
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to mark all notifications as read.');
  }
}

export async function deleteInAppNotification(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/notifications/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete notification.');
  }
}
