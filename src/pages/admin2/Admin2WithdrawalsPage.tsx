import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, PauseCircle, ShieldCheck } from 'lucide-react';
import { downloadAdminWithdrawalsExport, fetchAdminWithdrawalsOverview, syncAdminWithdrawalPayouts } from '@/api/adminWithdrawalsApi';
import { formatNaira } from '@/components/admin2/format';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { DEFAULT_QUEUE_FILTERS, queueParams, type QueueFilters } from '@/components/admin2/withdrawals/presentation';
import { QueueHealthCard } from '@/components/admin2/withdrawals/QueueHealthCard';
import { UrgentAttentionCard } from '@/components/admin2/withdrawals/UrgentAttentionCard';
import { WithdrawalDecisionModal, type DecisionTarget } from '@/components/admin2/withdrawals/WithdrawalDecisionModal';
import { WithdrawalKpiCards } from '@/components/admin2/withdrawals/WithdrawalKpiCards';
import { WithdrawalRequestsCard } from '@/components/admin2/withdrawals/WithdrawalRequestsCard';
import { WithdrawalReviewDrawer } from '@/components/admin2/withdrawals/WithdrawalReviewDrawer';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { WithdrawalSyncResult } from '@/types/api';

function syncSummary(result: WithdrawalSyncResult): string {
  if (result.checked === 0) return 'Nothing to sync. No transfers are in flight.';
  const parts = [`Checked ${result.checked} in-flight transfer${result.checked === 1 ? '' : 's'}`];
  if (result.paid > 0) parts.push(`${result.paid} paid (${formatNaira(result.paid_amount)})`);
  if (result.failed > 0) parts.push(`${result.failed} failed and back to Approved for a retry or rejection`);
  if (result.still_processing > 0) parts.push(`${result.still_processing} still processing`);
  if (result.errors > 0) parts.push(`${result.errors} could not be checked`);
  return `${parts.join(' · ')}.`;
}

export function Admin2WithdrawalsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { range } = useAdmin2DateRange();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_QUEUE_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => queueParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exporting, setExporting] = useState(false);
  const [decision, setDecision] = useState<DecisionTarget | null>(null);

  const openParam = searchParams.get('open');
  const [seenOpenParam, setSeenOpenParam] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);
  if (openParam !== seenOpenParam) {
    setSeenOpenParam(openParam);
    const id = Number(openParam);
    if (openParam && Number.isInteger(id) && id > 0) setReviewId(id);
  }

  const closeReview = () => {
    setReviewId(null);
    if (openParam) window.history.replaceState(window.history.state, '', window.location.pathname);
  };

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.payments.withdrawalsOverview(overviewParams),
    queryFn: () => fetchAdminWithdrawalsOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const intake = overviewQuery.data?.intake;
  const pausedFor = !intake
    ? null
    : !intake.runners && !intake.requesters
      ? 'runners and customers'
      : !intake.runners
        ? 'runners'
        : !intake.requesters
          ? 'customers'
          : null;

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.badges });
  };

  const syncMutation = useMutation({
    mutationFn: syncAdminWithdrawalPayouts,
    onSuccess: (result) => {
      setNotice({ tone: result.errors > 0 && result.paid === 0 && result.failed === 0 ? 'error' : 'ok', text: syncSummary(result) });
      refreshAll();
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not sync with Flutterwave.') }),
  });

  const exportRequests = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminWithdrawalsExport(params);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not export withdrawals.') });
    } finally {
      setExporting(false);
    }
  };

  const showFlagged = () => {
    setFilters({ ...DEFAULT_QUEUE_FILTERS, risk: 'flagged', useRange: filters.useRange });
    setSearch('');
    document.getElementById('withdrawal-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Payout operations · Review queue"
        title="Withdrawals"
        subtitle="Review withdrawal requests safely, check risk signals and track payouts through to the bank."
        actions={
          <button type="button" onClick={exportRequests} disabled={exporting} className={OUTLINE_BUTTON}>
            <Download className="size-[15px]" strokeWidth={1.8} />
            {exporting ? 'Exporting…' : 'Export withdrawals'}
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {pausedFor ? (
        <div className="flex flex-wrap items-center gap-[12px] rounded-[12px] border border-[#f1d9a6] bg-[#fff8e8] px-[16px] py-[12px]">
          <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
            <PauseCircle className="size-[16px] text-[#a06d0b]" strokeWidth={1.8} />
          </span>
          <p className="min-w-[240px] flex-1 text-[11px] leading-[1.5] text-[#7a5a12]">
            <span className="font-semibold">Withdrawals are paused for {pausedFor}.</span> No new requests can be made until they're switched back on.
            Requests already in the queue can still be approved and paid.
          </p>
          <Link
            to={getPagePath('admin2-settings')}
            className="flex h-[32px] flex-shrink-0 items-center rounded-[8px] border border-[#e6cf9c] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#fffdf7]"
          >
            Payout settings
          </Link>
        </div>
      ) : null}
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load payout metrics.')}
        </p>
      ) : null}

      <WithdrawalKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <UrgentAttentionCard overview={overviewQuery.data} onReview={setReviewId} onShowFlagged={showFlagged} />
        <QueueHealthCard overview={overviewQuery.data} />
      </div>

      <div id="withdrawal-requests" className="scroll-mt-[90px]">
        <WithdrawalRequestsCard
          overview={overviewQuery.data}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          params={params}
          rangeLabel={range}
          onReview={setReviewId}
          onSync={() => syncMutation.mutate()}
          syncing={syncMutation.isPending}
        />
      </div>

      <div className="flex flex-wrap items-center gap-[12px] rounded-[12px] border border-[#cfe5d5] bg-[#f3faf5] px-[16px] py-[14px]">
        <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
          <ShieldCheck className="size-[16px] text-[#167d35]" strokeWidth={1.8} />
        </span>
        <p className="min-w-[240px] flex-1 text-[11px] leading-[1.5] text-[#45514a]">
          Every approval and rejection is logged with the reviewer's name. Approving sends the payout straight away by Flutterwave Transfer from the
          Flutterwave balance. Rejecting returns the amount and the withdrawal fee to the runner's wallet.
        </p>
        {canAccessPage(user, 'pricing') ? (
          <Link
            to={getPagePath('pricing')}
            className="flex h-[34px] flex-shrink-0 items-center rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            Payout fee settings
          </Link>
        ) : null}
      </div>

      {reviewId != null ? (
        <WithdrawalReviewDrawer
          id={reviewId}
          onClose={closeReview}
          onAction={(kind, detail) => setDecision({ kind, row: detail })}
        />
      ) : null}

      <WithdrawalDecisionModal
        target={decision}
        onClose={() => setDecision(null)}
        onDone={(message) => {
          setDecision(null);
          setNotice({ tone: 'ok', text: message });
          refreshAll();
        }}
      />
    </div>
  );
}
