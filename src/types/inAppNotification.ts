export type NotificationDataMap = Record<string, string | number | boolean | null>;

export type RawAppNotification = {
  id: number | string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  data?: NotificationDataMap | null;
  read_at?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
  related_id?: string | number | null;
};

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data: NotificationDataMap | null;
  is_read: boolean;
  created_at: string;
  related_id?: string | null;
};

export function parseNotification(raw: RawAppNotification): AppNotification {
  const dataRaw = raw.data;
  let data: NotificationDataMap | null = null;
  if (dataRaw && typeof dataRaw === 'object' && !Array.isArray(dataRaw)) {
    data = dataRaw;
  }

  const readAt = raw.read_at;
  const isRead = readAt != null || raw.is_read === true;

  return {
    id: Number(raw.id) || 0,
    type: String(raw.type ?? ''),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? raw.body ?? ''),
    data,
    is_read: isRead,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    related_id:
      raw.related_id != null
        ? String(raw.related_id)
        : data?.ticket_id != null
          ? String(data.ticket_id)
          : data?.errand_id != null
            ? String(data.errand_id)
            : null,
  };
}

export function relatedSupportTicketId(n: AppNotification): number | null {
  const raw = n.data?.ticket_id ?? (n.type.includes('support_ticket') ? n.related_id : null);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}
