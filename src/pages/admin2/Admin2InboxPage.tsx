import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BellRing, CheckCheck, Inbox, LifeBuoy, RefreshCw, WalletCards } from 'lucide-react';
import {
  deleteInAppNotification,
  fetchInAppNotifications,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
  type InboxCategory,
} from '@/api/adminInAppNotificationsApi';
import { categoryMeta, type InboxStatus } from '@/components/admin2/inbox/inboxPresentation';
import { InboxCategoryRail } from '@/components/admin2/inbox/InboxCategoryRail';
import { InboxDetail, InboxEmptyDetail } from '@/components/admin2/inbox/InboxDetail';
import { InboxList } from '@/components/admin2/inbox/InboxList';
import { Card } from '@/components/admin2/overview/primitives';
import { pageForKey } from '@/components/admin2/shared/helpers';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { OUTLINE_BUTTON, PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { Pager } from '@/components/admin2/shared/Pager';
import { CardTabs, NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useMediaQuery } from '@/components/admin2/shared/useMediaQuery';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { notificationTarget } from '@/lib/notificationTarget';
import { queryKeys } from '@/lib/queryKeys';
import type { AppNotification } from '@/types/inAppNotification';

const PER_PAGE = 20;

const STATUS_TABS: Array<{ value: InboxStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

export function Admin2InboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wide = useMediaQuery('(min-width: 1280px)');
  const [category, setCategory] = useState<InboxCategory | null>(null);
  const [status, setStatus] = useState<InboxStatus>('all');
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const filterKey = `${category ?? 'all'}:${status}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageForKey(pageState, filterKey);

  const params = {
    page,
    per_page: PER_PAGE,
    with_counts: true,
    ...(category ? { category } : {}),
    ...(status !== 'all' ? { status } : {}),
  };
  const listQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.list(params),
    queryFn: () => fetchInAppNotifications(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.inAppNotifications.all });
  const markReadMutation = useMutation({ mutationFn: markInAppNotificationRead, onSuccess: invalidate });
  const markAllMutation = useMutation({
    mutationFn: markAllInAppNotificationsRead,
    onSuccess: () => {
      setNotice({ tone: 'ok', text: 'All notifications marked as read.' });
      setSelected((current) => (current ? { ...current, is_read: true } : current));
      void invalidate();
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not mark all as read.') }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteInAppNotification,
    onSuccess: () => {
      setSelected(null);
      setNotice({ tone: 'ok', text: 'Notification deleted.' });
      void invalidate();
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not delete this notification.') }),
  });

  const items = listQuery.data?.items ?? [];
  const counts = listQuery.data?.categories;
  const lastPage = listQuery.data?.meta.last_page ?? 1;
  const total = listQuery.data?.meta.total ?? 0;
  const unread = counts ? Object.values(counts).reduce((sum, c) => sum + c.unread, 0) : undefined;
  const actionable = counts
    ? counts.support.unread + counts.withdrawals.unread + counts.verifications.unread + counts.disputes.unread + counts.zones.unread
    : undefined;
  const target = selected ? notificationTarget(selected, user) : null;
  const folderLabel = category ? categoryMeta(category).label : 'All notifications';

  const select = (n: AppNotification) => {
    setSelected({ ...n, is_read: true });
    if (!n.is_read) markReadMutation.mutate(n.id);
  };

  const detail = selected ? (
    <InboxDetail
      notification={selected}
      target={target}
      onOpenTarget={(href) => navigate(href)}
      onDelete={() => deleteMutation.mutate(selected.id)}
      deleting={deleteMutation.isPending}
    />
  ) : null;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Your account · Live"
        title="Inbox"
        subtitle="Alerts sent to you about tickets, withdrawals, verifications, disputes and zone coverage."
        actions={
          <>
            <button type="button" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching} className={OUTLINE_BUTTON}>
              <RefreshCw className={`size-[15px] ${listQuery.isFetching ? 'animate-spin' : ''}`} strokeWidth={1.8} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={!unread || markAllMutation.isPending}
              className={PRIMARY_BUTTON}
            >
              <CheckCheck className="size-[15px]" strokeWidth={1.8} />
              {markAllMutation.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          </>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <MetricGrid columns={4}>
        <MetricCard
          label="Unread"
          icon={BellRing}
          iconColor="#b84545"
          iconBg="#fdeded"
          value={unread?.toLocaleString('en-NG')}
          pill={unread ? { label: 'New', tone: 'red' } : { label: 'Clear', tone: 'green' }}
          context="Across every folder"
        />
        <MetricCard
          label="Needs action"
          icon={Inbox}
          iconColor="#b06d12"
          iconBg="#fff5e5"
          value={actionable?.toLocaleString('en-NG')}
          context="Unread tickets, payouts, KYC, disputes and zones"
        />
        <MetricCard
          label="Support"
          icon={LifeBuoy}
          iconColor="#2563a8"
          iconBg="#e8f1fb"
          value={counts ? counts.support.unread.toLocaleString('en-NG') : undefined}
          context={counts ? `${counts.support.total.toLocaleString('en-NG')} support alerts in total` : undefined}
        />
        <MetricCard
          label="Withdrawals"
          icon={WalletCards}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={counts ? counts.withdrawals.unread.toLocaleString('en-NG') : undefined}
          context={counts ? `${counts.withdrawals.total.toLocaleString('en-NG')} payout alerts in total` : undefined}
        />
      </MetricGrid>

      <div className="grid w-full grid-cols-1 items-start gap-[16px] lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_400px]">
        <InboxCategoryRail
          counts={counts}
          value={category}
          onChange={(next) => {
            setCategory(next);
            setSelected(null);
          }}
        />

        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-[16px] pb-[4px] pt-[14px]">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#17211b]">{folderLabel}</p>
              <p className="text-[11px] text-[#7c857f]">
                {total.toLocaleString('en-NG')} {status === 'all' ? '' : `${status} `}
                {total === 1 ? 'notification' : 'notifications'}
              </p>
            </div>
          </div>
          <CardTabs
            tabs={STATUS_TABS.map((tab) => ({
              ...tab,
              count: tab.value === 'unread' ? (category ? counts?.[category].unread : unread) : null,
            }))}
            value={status}
            onChange={setStatus}
          />
          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(listQuery.error, 'Could not load your notifications.')}
            </p>
          ) : (
            <InboxList
              items={items}
              loading={listQuery.isLoading}
              selectedId={selected?.id ?? null}
              onSelect={select}
              emptyText={status === 'unread' ? "You're all caught up" : 'Nothing here yet'}
              dimmed={listQuery.isPlaceholderData}
            />
          )}
          {lastPage > 1 ? (
            <div className="flex items-center justify-between gap-3 px-[16px] py-[12px]">
              <p className="text-[10px] text-[#7c857f]">
                Page {page} of {lastPage}
              </p>
              <Pager page={page} lastPage={lastPage} onChange={(next) => setPageState({ key: filterKey, page: next })} />
            </div>
          ) : null}
        </Card>

        {wide ? <Card className="sticky top-[96px] min-w-0 overflow-hidden">{detail ?? <InboxEmptyDetail />}</Card> : null}
      </div>

      {!wide && selected ? (
        <Drawer open onClose={() => setSelected(null)} title="Notification" width="md">
          {detail}
        </Drawer>
      ) : null}
    </div>
  );
}
