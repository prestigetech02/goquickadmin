import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Mail,
  MailOpen,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react';
import { fetchAdminUsers } from '@/api/adminUsersApi';
import {
  broadcastAdminNotification,
  fetchAdminNotifications,
  type BroadcastTarget,
  type NotificationListItem,
} from '@/api/adminNotificationsApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  formatDateTime,
  formatNumber,
  partyDisplayName,
  titleCase,
} from '@/lib/utils';
import type { UserListItem } from '@/types/api';

type RoleFilter = 'all' | 'buyer' | 'runner';
type ReadStatusFilter = 'all' | 'read' | 'unread';
type TypeFilter =
  | ''
  | 'new_errand_available'
  | 'errand_status_updated'
  | 'errand_accepted'
  | 'offer_received'
  | 'offer_accepted'
  | 'chat_message'
  | 'payment_received'
  | 'payout_completed'
  | 'admin_broadcast'
  | 'promo_broadcast';

const NOTIFICATION_TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'new_errand_available', label: 'New errand available' },
  { value: 'errand_status_updated', label: 'Errand status updated' },
  { value: 'errand_accepted', label: 'Errand accepted' },
  { value: 'offer_received', label: 'Offer received' },
  { value: 'offer_accepted', label: 'Offer accepted' },
  { value: 'chat_message', label: 'Chat message' },
  { value: 'payment_received', label: 'Payment received' },
  { value: 'payout_completed', label: 'Payout completed' },
  { value: 'promo_broadcast', label: 'Admin broadcast' },
  { value: 'admin_broadcast', label: 'Admin broadcast (legacy)' },
];

function notificationUserName(item: NotificationListItem): string {
  if (!item.user) return `User #${item.user_id}`;
  return partyDisplayName(item.user) || item.user.email || `User #${item.user_id}`;
}

function truncateMessage(message: string, max = 72): string {
  if (message.length <= max) return message;
  return `${message.slice(0, max)}…`;
}

function userPickerLabel(user: UserListItem): string {
  const name = partyDisplayName(user);
  if (name && user.email) return `${name} · ${user.email}`;
  return name || user.email || user.phone || `User #${user.id}`;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [role, setRole] = useState<RoleFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [readStatus, setReadStatus] = useState<ReadStatusFilter>('all');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<BroadcastTarget>('all');
  const [customUserSearch, setCustomUserSearch] = useState('');
  const [debouncedCustomUserSearch, setDebouncedCustomUserSearch] = useState('');
  const [selectedCustomUsers, setSelectedCustomUsers] = useState<Record<number, UserListItem>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCustomUserSearch(customUserSearch.trim()), 300);
    return () => window.clearTimeout(t);
  }, [customUserSearch]);

  useEffect(() => {
    setPage(1);
  }, [perPage, role, typeFilter, readStatus]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: perPage, page };
    if (role !== 'all') params.role = role;
    if (typeFilter) params.type = typeFilter;
    if (readStatus !== 'all') params.read_status = readStatus;
    return params;
  }, [page, perPage, role, typeFilter, readStatus]);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list(listParams),
    queryFn: () => fetchAdminNotifications(listParams),
  });

  const customUsersQuery = useQuery({
    queryKey: queryKeys.users.list({
      search: debouncedCustomUserSearch,
      per_page: 10,
      page: 1,
    }),
    queryFn: () =>
      fetchAdminUsers({
        search: debouncedCustomUserSearch || undefined,
        per_page: 10,
        page: 1,
      }),
    enabled: showBroadcast && broadcastTarget === 'custom',
  });

  const selectableUsers = (customUsersQuery.data?.data ?? []).filter(
    (user) => user.role === 'buyer' || user.role === 'runner',
  );
  const selectedCustomUserList = Object.values(selectedCustomUsers);

  const broadcastMutation = useMutation({
    mutationFn: broadcastAdminNotification,
    onSuccess: (result) => {
      setActionError(null);
      setActionSuccess(`Notification sent to ${formatNumber(result.sent_count)} user(s) (${result.target}).`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastTarget('all');
      setCustomUserSearch('');
      setDebouncedCustomUserSearch('');
      setSelectedCustomUsers({});
      setShowBroadcast(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to send broadcast.'));
    },
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const meta = notificationsQuery.data?.meta;
  const total = meta?.total ?? 0;
  const unreadOnPage = notifications.filter((n) => !n.read_at).length;
  const broadcastsOnPage = notifications.filter(
    (n) => n.type === 'admin_broadcast' || n.type === 'promo_broadcast',
  ).length;
  const runnersOnPage = notifications.filter((n) => n.user?.role === 'runner').length;

  const toggleCustomUser = (user: UserListItem) => {
    setSelectedCustomUsers((current) => {
      const next = { ...current };
      if (next[user.id]) {
        delete next[user.id];
      } else {
        next[user.id] = user;
      }
      return next;
    });
  };

  const removeCustomUser = (userId: number) => {
    setSelectedCustomUsers((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  };

  const closeBroadcastDrawer = () => {
    if (broadcastMutation.isPending) return;
    setShowBroadcast(false);
    setCustomUserSearch('');
    setDebouncedCustomUserSearch('');
    setSelectedCustomUsers({});
  };

  const submitBroadcast = () => {
    const title = broadcastTitle.trim();
    const message = broadcastMessage.trim();
    if (!title || !message) {
      setActionError('Title and message are required.');
      return;
    }

    if (broadcastTarget === 'custom' && selectedCustomUserList.length === 0) {
      setActionError('Select at least one user for a custom broadcast.');
      return;
    }

    const targetLabel =
      broadcastTarget === 'all'
        ? 'all buyers and runners'
        : broadcastTarget === 'buyers'
          ? 'buyers only'
          : broadcastTarget === 'runners'
            ? 'runners only'
            : `${selectedCustomUserList.length} selected user(s)`;

    if (
      !window.confirm(
        `Send this notification to ${targetLabel}?\n\nUsers who disabled notifications may not receive push delivery.`,
      )
    ) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    broadcastMutation.mutate({
      title,
      message,
      target: broadcastTarget,
      user_ids:
        broadcastTarget === 'custom' ? selectedCustomUserList.map((user) => user.id) : undefined,
    });
  };

  const columns: Column<NotificationListItem>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{notificationUserName(row)}</p>
          {row.user?.email ? <p className="text-xs text-ink-400">{row.user.email}</p> : null}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge status={row.user?.role || 'unknown'} label={titleCase(row.user?.role || 'unknown')} />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="text-xs font-mono text-ink-600 bg-ink-50 px-2 py-1 rounded-lg">
          {row.type}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => <span className="font-medium text-ink-900">{row.title || '—'}</span>,
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <span className="text-ink-600" title={row.message}>
          {truncateMessage(row.message || '—')}
        </span>
      ),
    },
    {
      key: 'read',
      header: 'Read',
      render: (row) => (
        <Badge
          status={row.read_at ? 'read' : 'unread'}
          label={row.read_at ? 'Read' : 'Unread'}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => <span className="text-ink-400 text-xs">{formatDateTime(row.created_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${formatNumber(total)} notifications · send broadcasts and review activity`}
        action={
          <>
            <button
              type="button"
              onClick={() => void notificationsQuery.refetch()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${notificationsQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
                setShowBroadcast(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Send broadcast
        </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total notifications"
          value={formatNumber(total)}
          icon={<Bell className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Unread on page"
          value={formatNumber(unreadOnPage)}
          icon={<Mail className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Admin broadcasts on page"
          value={formatNumber(broadcastsOnPage)}
          icon={<Send className="w-5 h-5" />}
          accent="success"
        />
      </div>

      {actionSuccess ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
          <MailOpen className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      {notificationsQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load notifications</p>
            <p className="mt-1">
              {getApiErrorMessage(
                notificationsQuery.error,
                'Check that the API is running and you have operations module access.',
              )}
            </p>
                  </div>
                    </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
                  </div>
      ) : null}

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="buyer">Buyers</option>
          <option value="runner">Runners</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[220px]"
          aria-label="Filter by type"
        >
          {NOTIFICATION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={readStatus}
          onChange={(e) => setReadStatus(e.target.value as ReadStatusFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
          aria-label="Filter by read status"
        >
          <option value="all">All read states</option>
          <option value="read">Read</option>
          <option value="unread">Unread</option>
        </select>
        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[140px]"
          aria-label="Items per page"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
                </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-ink-500">
        <span>
          Runners on page: <strong className="text-ink-800">{formatNumber(runnersOnPage)}</strong>
        </span>
        {readStatus !== 'all' ? (
          <span className="text-ink-400">· Filter: {readStatus}</span>
        ) : null}
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={notifications}
          loading={notificationsQuery.isLoading}
          emptyMessage="No notifications found"
          page={page}
          pageSize={meta?.per_page ?? perPage}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      <Drawer
        open={showBroadcast}
        onClose={closeBroadcastDrawer}
        title="Send broadcast"
        subtitle="In-app notification and push (where enabled) to selected users."
        width="2xl"
        footer={
          <button
            type="button"
            onClick={submitBroadcast}
            disabled={
              broadcastMutation.isPending ||
              !broadcastTitle.trim() ||
              !broadcastMessage.trim() ||
              (broadcastTarget === 'custom' && selectedCustomUserList.length === 0)
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {broadcastMutation.isPending ? 'Sending…' : 'Send broadcast'}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Title</label>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. New feature available"
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Message</label>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Notification body (max 1000 characters)"
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
            <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Target audience</label>
            <select
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value as BroadcastTarget)}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All users (buyers + runners)</option>
              <option value="buyers">Buyers only</option>
              <option value="runners">Runners only</option>
              <option value="custom">Custom (select users)</option>
              </select>
            </div>

          {broadcastTarget === 'custom' ? (
            <div className="space-y-3 rounded-xl border border-ink-200 p-4 bg-ink-50/50">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  Selected users ({selectedCustomUserList.length})
                </label>
                {selectedCustomUserList.length === 0 ? (
                  <p className="text-sm text-ink-400">Search and select buyers or runners below.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomUserList.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-full bg-white border border-ink-200 text-xs text-ink-700"
                      >
                        <span className="truncate">{userPickerLabel(user)}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomUser(user.id)}
                          className="text-ink-400 hover:text-error-600"
                          aria-label={`Remove ${userPickerLabel(user)}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Search users</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="search"
                    value={customUserSearch}
                    onChange={(e) => setCustomUserSearch(e.target.value)}
                    placeholder="Search name, email, or phone…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-200 bg-white divide-y divide-ink-100">
                {customUsersQuery.isLoading ? (
                  <p className="p-4 text-sm text-ink-400">Searching users…</p>
                ) : customUsersQuery.isError ? (
                  <p className="p-4 text-sm text-error-600">
                    {getApiErrorMessage(customUsersQuery.error, 'Failed to search users.')}
                  </p>
                ) : selectableUsers.length === 0 ? (
                  <p className="p-4 text-sm text-ink-400">No buyers or runners found.</p>
                ) : (
                  selectableUsers.map((user) => {
                    const checked = Boolean(selectedCustomUsers[user.id]);
                    return (
                      <label
                        key={user.id}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-ink-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCustomUser(user)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink-900">
                            {partyDisplayName(user) || user.email || `User #${user.id}`}
                          </span>
                          <span className="block text-xs text-ink-400">
                            {[titleCase(user.role), user.email, user.phone].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
