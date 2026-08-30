import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import {
  fetchInAppNotificationsPreview,
  fetchInAppUnreadCount,
  markInAppNotificationRead,
} from '@/api/adminInAppNotificationsApi';
import { useAuth } from '@/context/AuthContext';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { canAccessPage } from '@/lib/adminNavigation';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { timeAgo, titleCase } from '@/lib/utils';
import { relatedSupportTicketId, type AppNotification } from '@/types/inAppNotification';

function notificationIcon(type: string): string {
  if (type.includes('support_ticket')) return '🎫';
  if (type.includes('chat')) return '💬';
  if (type.includes('offer') || type.includes('errand') || type.includes('proof')) return '📦';
  if (type.includes('payment') || type.includes('escrow') || type.includes('payout')) return '₦';
  return '🔔';
}

function invalidateInAppNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inAppNotifications.all });
}

export function NotificationsPopover() {
  const navigate = useAdminNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const unreadQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.unreadCount,
    queryFn: fetchInAppUnreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const previewQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.preview,
    queryFn: () => fetchInAppNotificationsPreview(5),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: markInAppNotificationRead,
    onSuccess: () => invalidateInAppNotifications(queryClient),
  });

  useEffect(() => {
    if (!open) return;

    void previewQuery.refetch();

    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, previewQuery]);

  const unreadCount = unreadQuery.data ?? 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const items = previewQuery.data?.items ?? [];

  const handleOpenItem = async (notification: AppNotification) => {
    if (!notification.is_read) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch {
        // still navigate even if mark-read fails
      }
    }
    setOpen(false);
    const ticketId = relatedSupportTicketId(notification);
    if (ticketId && canAccessPage(user, 'tickets')) {
      navigate('tickets', { openId: ticketId });
      return;
    }
    navigate('in-app-notifications');
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('in-app-notifications');
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative p-2 rounded-lg text-ink-600 hover:bg-ink-50 transition-colors ${
          open ? 'bg-ink-50 text-brand-700' : ''
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-white shadow-xl z-50 overflow-hidden animate-scale-in origin-top-right"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
            <div>
              <p className="text-sm font-bold text-ink-900">Notifications</p>
              {unreadCount > 0 ? (
                <p className="text-xs text-ink-500">{unreadCount} unread</p>
              ) : (
                <p className="text-xs text-ink-500">Latest updates</p>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {previewQuery.isLoading ? (
              <p className="px-4 py-8 text-sm text-ink-400 text-center">Loading…</p>
            ) : previewQuery.isError ? (
              <p className="px-4 py-8 text-sm text-error-600 text-center">
                {getApiErrorMessage(previewQuery.error, 'Could not load notifications.')}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-400 text-center">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void handleOpenItem(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors ${
                        notification.is_read ? '' : 'bg-brand-50/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
                          {notificationIcon(notification.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-ink-900 truncate">
                              {notification.title || titleCase(notification.type.replace(/_/g, ' '))}
                            </p>
                            {!notification.is_read ? (
                              <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" aria-label="Unread" />
                            ) : null}
                          </div>
                          <p className="text-xs text-ink-500 line-clamp-2 mt-0.5">{notification.message}</p>
                          <p className="text-[11px] text-ink-400 mt-1">{timeAgo(notification.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-ink-100 p-2">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              View all
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
