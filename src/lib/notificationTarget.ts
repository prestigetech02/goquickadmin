import type { AdminUser } from '@/types';
import { relatedSupportTicketId, type AppNotification } from '@/types/inAppNotification';
import { canAccessPage, getAdmin2ErrandHref, getPageHref, type PageKey } from './adminNavigation';

function idFrom(notification: AppNotification, key: string): number | null {
  const id = Number(notification.data?.[key]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Where clicking a notification should take this admin; falls back to their inbox. */
export function notificationHref(notification: AppNotification, user: AdminUser | null | undefined): string {
  const open = (page: PageKey, id: number | null) =>
    id != null && canAccessPage(user, page) ? getPageHref(page, { openId: id }) : null;

  const errandId = idFrom(notification, 'errand_id');

  return (
    open('admin2-support', relatedSupportTicketId(notification)) ??
    open('tickets', relatedSupportTicketId(notification)) ??
    open('admin2-withdrawals', idFrom(notification, 'withdrawal_id')) ??
    open('admin2-verifications', idFrom(notification, 'verification_id')) ??
    open('admin2-disputes', idFrom(notification, 'dispute_id')) ??
    (errandId != null && canAccessPage(user, 'admin2-errand') ? getAdmin2ErrandHref(errandId) : null) ??
    getPageHref('in-app-notifications')
  );
}
