import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  fetchInAppNotifications,
  fetchInAppUnreadCount,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
} from '@/api/adminInAppNotificationsApi';
import { useAuth } from '@/context/AuthContext';
import { useAdminOpsRealtimeStatus } from '@/context/AdminOpsRealtimeContext';
import { notificationIcon } from './notificationIcon';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getPageHref } from '@/lib/adminNavigation';
import { subscribeLiveNotifications } from '@/lib/liveNotifications';
import { notificationHref } from '@/lib/notificationTarget';
import { queryKeys } from '@/lib/queryKeys';
import { timeAgo, titleCase } from '@/lib/utils';
import type { AppNotification } from '@/types/inAppNotification';

const PREVIEW_SIZE = 8;

export function NotificationsPopover({ variant = 'default' }: { variant?: 'default' | 'admin2' }) {
  const isAdmin2 = variant === 'admin2';
  const inboxPage = isAdmin2 ? 'admin2-inbox' : 'in-app-notifications';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { live } = useAdminOpsRealtimeStatus();
  const queryClient = useQueryClient();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  const unreadQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.unreadCount,
    queryFn: fetchInAppUnreadCount,
    refetchInterval: live ? 60_000 : 20_000,
    refetchOnWindowFocus: true,
  });

  const listParams = { page: 1, per_page: PREVIEW_SIZE, ...(unreadOnly ? { unread_only: true } : {}) };
  const previewQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.list({ ...listParams, preview: true }),
    queryFn: () => fetchInAppNotifications(listParams),
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.inAppNotifications.all });
  const markReadMutation = useMutation({ mutationFn: markInAppNotificationRead, onSuccess: invalidate });
  const markAllMutation = useMutation({ mutationFn: markAllInAppNotificationsRead, onSuccess: invalidate });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeLiveNotifications(() => {
      setPulsing(true);
      clearTimeout(timer);
      timer = setTimeout(() => setPulsing(false), 4000);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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
  }, [open]);

  const unreadCount = unreadQuery.data ?? 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const items = previewQuery.data?.items ?? [];

  const handleOpenItem = (notification: AppNotification) => {
    if (!notification.is_read) markReadMutation.mutate(notification.id);
    setOpen(false);
    navigate(notificationHref(notification, user, inboxPage));
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(getPageHref(inboxPage));
  };

  const tabClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
      active ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'
    }`;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          isAdmin2
            ? `relative flex size-[40px] items-center justify-center rounded-[8px] border border-[#e2e8e3] bg-white text-[#45514a] hover:bg-[#f8faf8] transition-colors ${
                open ? 'bg-[#f8faf8] text-[#167d35]' : ''
              }`
            : `relative p-2 rounded-lg text-ink-600 hover:bg-ink-50 transition-colors ${open ? 'bg-ink-50 text-brand-700' : ''}`
        }
      >
        <Bell
          className={`${isAdmin2 ? 'w-[18px] h-[18px]' : 'w-5 h-5'} ${pulsing ? 'animate-bounce' : ''}`}
          strokeWidth={isAdmin2 ? 1.8 : 2}
        />
        {unreadCount > 0 ? (
          isAdmin2 ? (
            <span className="absolute -top-[4px] -right-[3px] flex">
              {pulsing ? <span className="absolute inset-0 rounded-full bg-[#b84545] opacity-60 animate-ping" /> : null}
              <span className="relative min-w-[17px] h-[17px] px-[3px] rounded-full border-2 border-white bg-[#b84545] font-inter text-[8px] font-bold leading-none text-white flex items-center justify-center">
                {badgeLabel}
              </span>
            </span>
          ) : (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {badgeLabel}
            </span>
          )
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-white shadow-xl z-50 overflow-hidden animate-scale-in origin-top-right"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <div>
              <p className="text-sm font-bold text-ink-900">Notifications</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <span className={`size-1.5 rounded-full ${live ? 'bg-brand-600' : 'bg-ink-300'}`} aria-hidden="true" />
                {live ? 'Live' : 'Refreshing every 20s'}
                {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={unreadCount === 0 || markAllMutation.isPending}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent"
            >
              <CheckCheck className="size-3.5" />
              {markAllMutation.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          </div>

          <div className="flex gap-1 border-b border-ink-100 px-3 pb-2">
            <button type="button" className={tabClass(!unreadOnly)} onClick={() => setUnreadOnly(false)}>
              All
            </button>
            <button type="button" className={tabClass(unreadOnly)} onClick={() => setUnreadOnly(true)}>
              Unread
            </button>
          </div>

          {markAllMutation.isError ? (
            <p className="px-4 pt-2 text-xs text-error-600">{getApiErrorMessage(markAllMutation.error, 'Could not mark all as read.')}</p>
          ) : null}

          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {previewQuery.isLoading ? (
              <p className="px-4 py-8 text-sm text-ink-400 text-center">Loading…</p>
            ) : previewQuery.isError ? (
              <p className="px-4 py-8 text-sm text-error-600 text-center">
                {getApiErrorMessage(previewQuery.error, 'Could not load notifications.')}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-400 text-center">
                {unreadOnly ? "You're all caught up." : 'No notifications yet.'}
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {items.map((notification) => {
                  const Icon = notificationIcon(notification.type);
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenItem(notification)}
                        className={`w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors ${
                          notification.is_read ? '' : 'bg-brand-50/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-600" aria-hidden="true">
                            <Icon className="size-4" strokeWidth={1.8} />
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
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-ink-100 p-2">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
