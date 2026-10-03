import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { campaignAction, deleteNotificationCampaign, fetchNotificationsOverview } from '@/api/adminNotificationCenterApi';
import { AudienceSegmentsCard } from '@/components/admin2/notifications/AudienceSegmentsCard';
import { CampaignStrip } from '@/components/admin2/notifications/CampaignStrip';
import { ComposeCampaignDrawer, type ComposeRequest } from '@/components/admin2/notifications/ComposeCampaignDrawer';
import { DeliveryPerformanceCard } from '@/components/admin2/notifications/DeliveryPerformanceCard';
import { NotificationDetailDrawer } from '@/components/admin2/notifications/NotificationDetailDrawer';
import { NotificationHistoryCard } from '@/components/admin2/notifications/NotificationHistoryCard';
import { NotificationKpiCards } from '@/components/admin2/notifications/NotificationKpiCards';
import {
  DEFAULT_HISTORY_FILTERS,
  audienceDetail,
  channelLine,
  historyParams,
  whenLabel,
  type DetailTarget,
  type HistoryFilters,
} from '@/components/admin2/notifications/presentation';
import type { RowHandlers } from '@/components/admin2/notifications/rowActions';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { Modal } from '@/components/ui/Modal';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { CampaignInput, NotificationHistoryRow } from '@/types/api';

type CampaignActionKind = 'send' | 'cancel' | 'duplicate' | 'delete';

function savedMessage(row: NotificationHistoryRow, action: CampaignInput['action']): string {
  if (action === 'draft') return `Draft "${row.title}" saved.`;
  if (action === 'schedule') return `"${row.title}" is scheduled for ${whenLabel(row.scheduled_at)}.`;
  return `Sending "${row.title}" to ${audienceDetail(row)}. Delivery numbers update as messages go out.`;
}

export function Admin2NotificationsPage() {
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => historyParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [compose, setCompose] = useState<ComposeRequest | null>(() => (searchParams.get('compose') ? { id: null } : null));

  useEffect(() => {
    if (!searchParams.has('compose')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('compose');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [confirm, setConfirm] = useState<{ row: NotificationHistoryRow; action: 'send' | 'delete' } | null>(null);

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.notifications.overview(overviewParams),
    queryFn: () => fetchNotificationsOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.campaigns.some((row) => row.status === 'sending') ? 4_000 : 60_000),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });

  const actionMutation = useMutation({
    mutationFn: async ({ row, action }: { row: NotificationHistoryRow; action: CampaignActionKind }) => {
      const id = row.campaign_id as number;
      if (action === 'delete') {
        await deleteNotificationCampaign(id);
        return null;
      }
      return campaignAction(id, action);
    },
    onSuccess: (result, { row, action }) => {
      setConfirm(null);
      refresh();
      if (action === 'delete') {
        setNotice({ tone: 'ok', text: `Draft "${row.title}" deleted.` });
        if (detail?.kind === 'campaign' && detail.id === row.campaign_id) setDetail(null);
      } else if (action === 'cancel') {
        setNotice({ tone: 'ok', text: `"${row.title}" is no longer scheduled and is back in drafts.` });
      } else if (action === 'duplicate' && result?.campaign_id) {
        setNotice({ tone: 'ok', text: `Copied to a new draft: "${result.title}".` });
        setDetail(null);
        setCompose({ id: result.campaign_id });
      } else if (action === 'send') {
        setNotice({ tone: 'ok', text: `Sending "${row.title}". Delivery numbers update as messages go out.` });
      }
    },
    onError: (error) => {
      setConfirm(null);
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'That action failed.') });
    },
  });

  const handlers: RowHandlers = {
    open: (row) => {
      if (row.kind === 'campaign' && row.campaign_id) setDetail({ kind: 'campaign', id: row.campaign_id });
      else if (row.date) setDetail({ kind: 'group', type: row.type, date: row.date });
    },
    edit: (row) => {
      if (!row.campaign_id) return;
      setDetail(null);
      setCompose({ id: row.campaign_id });
    },
    act: (row, action) => {
      if (!row.campaign_id) return;
      if (action === 'send' || action === 'delete') setConfirm({ row, action });
      else actionMutation.mutate({ row, action });
    },
  };

  const showScheduled = () => {
    setFilters({ ...DEFAULT_HISTORY_FILTERS, tab: 'scheduled', useRange: filters.useRange });
    setSearch('');
    document.getElementById('notification-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Communications · Operational"
        title="Notifications"
        subtitle="Create and monitor timely marketplace updates across push, email, WhatsApp and in-app."
        actions={
          <button type="button" onClick={() => setCompose({ id: null })} className={PRIMARY_BUTTON}>
            <Plus className="size-[15px]" strokeWidth={2} />
            Compose notification
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load notification metrics.')}
        </p>
      ) : null}

      <NotificationKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <DeliveryPerformanceCard overview={overviewQuery.data} />
        <AudienceSegmentsCard overview={overviewQuery.data} onCompose={(audience) => setCompose({ id: null, audience })} />
      </div>

      <CampaignStrip
        overview={overviewQuery.data}
        handlers={handlers}
        busy={actionMutation.isPending}
        onViewScheduled={showScheduled}
        onCompose={() => setCompose({ id: null })}
      />

      <NotificationHistoryCard
        overview={overviewQuery.data}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        params={params}
        range={range}
        handlers={handlers}
        busy={actionMutation.isPending}
      />

      <NotificationDetailDrawer target={detail} onClose={() => setDetail(null)} handlers={handlers} busy={actionMutation.isPending} />

      <ComposeCampaignDrawer
        request={compose}
        segments={overviewQuery.data?.audience}
        onClose={() => setCompose(null)}
        onSaved={(row, action) => {
          setCompose(null);
          setNotice({ tone: 'ok', text: savedMessage(row, action) });
          refresh();
        }}
      />

      <Modal
        open={confirm != null}
        onClose={() => (actionMutation.isPending ? undefined : setConfirm(null))}
        title={confirm?.action === 'delete' ? 'Delete draft?' : 'Send this notification now?'}
        size="sm"
      >
        {confirm ? (
          <div className="flex flex-col gap-[14px] font-inter">
            <p className="text-[12px] leading-relaxed text-[#45514a]">
              {confirm.action === 'delete' ? (
                <>
                  "{confirm.row.title}" will be permanently removed. This can't be undone.
                </>
              ) : (
                <>
                  "{confirm.row.title}" goes to {audienceDetail(confirm.row)} by {channelLine(confirm.row.channels).toLowerCase()}. Once sent it can't be
                  recalled.
                </>
              )}
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={actionMutation.isPending}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={actionMutation.isPending}
                onClick={() => actionMutation.mutate({ row: confirm.row, action: confirm.action })}
                className={`h-[36px] rounded-[8px] px-[14px] text-[11px] font-semibold text-white disabled:opacity-60 ${
                  confirm.action === 'delete' ? 'bg-[#b84545] hover:bg-[#9a3434]' : 'bg-[#167d35] hover:bg-[#0d5e27]'
                }`}
              >
                {actionMutation.isPending ? 'Working…' : confirm.action === 'delete' ? 'Delete draft' : 'Send now'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
