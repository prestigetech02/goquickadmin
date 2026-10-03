import type { AdminUser } from '@/types';
import { relatedSupportTicketId, type AppNotification } from '@/types/inAppNotification';
import { canAccessPage, getAdmin2ErrandHref, getPageHref, type PageKey } from './adminNavigation';

function idFrom(notification: AppNotification, key: string): number | null {
  const id = Number(notification.data?.[key]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type NotificationTarget = { href: string; label: string };

/** The admin2 screen a notification is about, if this admin can open it. */
export function notificationTarget(notification: AppNotification, user: AdminUser | null | undefined): NotificationTarget | null {
  const open = (page: PageKey, id: number | null, label: string) =>
    id != null && canAccessPage(user, page) ? { href: getPageHref(page, { openId: id }), label } : null;

  const errandId = idFrom(notification, 'errand_id');

  return (
    open('admin2-support', relatedSupportTicketId(notification), 'Open ticket') ??
    open('admin2-withdrawals', idFrom(notification, 'withdrawal_id'), 'Review withdrawal') ??
    open('admin2-verifications', idFrom(notification, 'verification_id'), 'Review verification') ??
    open('admin2-disputes', idFrom(notification, 'dispute_id'), 'Open dispute') ??
    (errandId != null && canAccessPage(user, 'admin2-errand') ? { href: getAdmin2ErrandHref(errandId), label: 'Open errand' } : null)
  );
}

/** Where clicking a notification should take this admin; falls back to their inbox. */
export function notificationHref(
  notification: AppNotification,
  user: AdminUser | null | undefined,
  inbox: PageKey = 'in-app-notifications',
): string {
  return notificationTarget(notification, user)?.href ?? getPageHref(inbox);
}
