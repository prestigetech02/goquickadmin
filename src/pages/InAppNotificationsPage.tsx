import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  MailOpen,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  deleteInAppNotification,
  fetchInAppNotifications,
  fetchInAppUnreadCount,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
} from '@/api/adminInAppNotificationsApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/context/AuthContext';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { canAccessPage } from '@/lib/adminNavigation';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime, timeAgo, titleCase } from '@/lib/utils';
import { relatedSupportTicketId, type AppNotification } from '@/types/inAppNotification';

type ReadFilter = 'all' | 'unread' | 'read';

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

export function InAppNotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useAdminNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [readFilter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = { page, per_page: 20 };
    if (readFilter === 'unread') params.unread_only = true;
    return params;
  }, [page, readFilter]);

  const unreadQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.unreadCount,
    queryFn: fetchInAppUnreadCount,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.list(listParams),
    queryFn: () => fetchInAppNotifications(listParams),
  });

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;
  const filteredItems =
    readFilter === 'read' ? items.filter((item) => item.is_read) : items;

  const markReadMutation = useMutation({
    mutationFn: markInAppNotificationRead,
    onSuccess: () => {
      invalidateInAppNotifications(queryClient);
      setActionError(null);
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Failed to mark notification as read.')),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllInAppNotificationsRead,
    onSuccess: () => {
      invalidateInAppNotifications(queryClient);
      setActionError(null);
      setActionSuccess('All notifications marked as read.');
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Failed to mark all as read.')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInAppNotification,
    onSuccess: () => {
      invalidateInAppNotifications(queryClient);
      setSelected(null);
      setActionError(null);
      setActionSuccess('Notification deleted.');
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Failed to delete notification.')),
  });

  const handleOpen = async (notification: AppNotification) => {
    setSelected(notification);
    if (!notification.is_read) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch {
        // still show modal
      }
    }
  };

  const unreadCount = unreadQuery.data ?? 0;
  const totalCount = meta?.total ?? filteredItems.length;

  return (
    <div>
      <PageHeader
        title="Your Notifications"
        subtitle="Updates for your admin account"
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
            >
              <CheckCheck className="w-4 h-4" />
              {markAllReadMutation.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          ) : null
        }
      />

      {actionError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
          <MailOpen className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Unread" value={String(unreadCount)} icon={<Bell className="w-5 h-5" />} accent="error" />
        <StatCard label="Total" value={String(totalCount)} icon={<MailOpen className="w-5 h-5" />} accent="brand" />
        <StatCard
          label="Showing"
          value={String(filteredItems.length)}
          icon={<Bell className="w-5 h-5" />}
          accent="warning"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'unread', 'read'] as ReadFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReadFilter(option)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                readFilter === option
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
              }`}
            >
              {titleCase(option)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => listQuery.refetch()}
          disabled={listQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <Card>
        {listQuery.isLoading ? (
          <CardBody>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-ink-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </CardBody>
        ) : listQuery.isError ? (
          <CardBody className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-error-400 mx-auto mb-2" />
            <p className="text-ink-600">Failed to load notifications.</p>
          </CardBody>
        ) : filteredItems.length === 0 ? (
          <CardBody className="text-center py-12">
            <Bell className="w-10 h-10 text-ink-300 mx-auto mb-2" />
            <p className="text-ink-400">No notifications to show.</p>
          </CardBody>
        ) : (
          <ul className="divide-y divide-ink-100">
            {filteredItems.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(notification)}
                  className={`w-full text-left px-4 py-4 hover:bg-ink-50 transition-colors ${
                    notification.is_read ? '' : 'bg-brand-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0" aria-hidden="true">
                      {notificationIcon(notification.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-ink-900">
                          {notification.title || titleCase(notification.type.replace(/_/g, ' '))}
                        </p>
                        {!notification.is_read ? (
                          <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-2" />
                        ) : null}
                      </div>
                      <p className="text-sm text-ink-600 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-ink-400 mt-2">
                        {timeAgo(notification.created_at)} · {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {meta && meta.last_page > 1 && readFilter !== 'read' ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100 text-sm text-ink-500">
            <span>
              Page {meta.current_page} of {meta.last_page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Notification" size="md">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                {notificationIcon(selected.type)}
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink-900">
                  {selected.title || titleCase(selected.type.replace(/_/g, ' '))}
                </h3>
                <p className="text-sm text-ink-400 mt-1">{formatDateTime(selected.created_at)}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-ink-50">
              <p className="text-sm text-ink-700 whitespace-pre-wrap">{selected.message}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedSupportTicketId(selected) && canAccessPage(user, 'tickets') ? (
                <button
                  type="button"
                  onClick={() => {
                    const ticketId = relatedSupportTicketId(selected);
                    setSelected(null);
                    if (ticketId) navigate('tickets', { openId: ticketId });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
                >
                  View ticket
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => deleteMutation.mutate(selected.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-error-200 text-sm font-medium text-error-700 hover:bg-error-50 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                Delete notification
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
