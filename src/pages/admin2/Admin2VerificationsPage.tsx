import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { fetchAdminKycOverview } from '@/api/adminKycApi';
import { PageHeader } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { AttentionCard } from '@/components/admin2/verifications/AttentionCard';
import { KycDecisionModal, type KycDecisionTarget } from '@/components/admin2/verifications/KycDecisionModal';
import { KycReviewDrawer } from '@/components/admin2/verifications/KycReviewDrawer';
import { OnboardingFunnelCard } from '@/components/admin2/verifications/OnboardingFunnelCard';
import { DEFAULT_QUEUE_FILTERS, queueParams, type QueueFilters } from '@/components/admin2/verifications/presentation';
import { VerificationKpiCards } from '@/components/admin2/verifications/VerificationKpiCards';
import { VerificationQueueCard } from '@/components/admin2/verifications/VerificationQueueCard';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';

export function Admin2VerificationsPage() {
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_QUEUE_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => queueParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [decision, setDecision] = useState<KycDecisionTarget | null>(null);

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
    queryKey: queryKeys.runners.kycOverview(overviewParams),
    queryFn: () => fetchAdminKycOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const showFlagged = () => {
    setFilters({ ...DEFAULT_QUEUE_FILTERS, risk: 'flagged', useRange: filters.useRange });
    setSearch('');
    document.getElementById('verification-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Runner onboarding · Trust & safety"
        title="Runner verification"
        subtitle="Review identity documents, guarantors and payout details before runners can go online and accept errands."
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load verification metrics.')}
        </p>
      ) : null}

      <VerificationKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <AttentionCard overview={overviewQuery.data} onReview={setReviewId} onShowFlagged={showFlagged} />
        <OnboardingFunnelCard overview={overviewQuery.data} />
      </div>

      <div id="verification-queue" className="scroll-mt-[90px]">
        <VerificationQueueCard
          overview={overviewQuery.data}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          params={params}
          range={range}
          onReview={setReviewId}
          onAction={(kind, row) => setDecision({ kind, row })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-[12px] rounded-[12px] border border-[#cfe5d5] bg-[#f3faf5] px-[16px] py-[14px]">
        <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
          <ShieldCheck className="size-[16px] text-[#167d35]" strokeWidth={1.8} />
        </span>
        <p className="min-w-[240px] flex-1 text-[11px] leading-[1.5] text-[#45514a]">
          Every decision is logged with the reviewer's name. Approving lets the runner go online and notifies them by push and email. Rejecting sends
          your reason so they can fix it and resubmit from the app. Submissions missing the ID or selfie can't be approved.
        </p>
      </div>

      {reviewId != null ? (
        <KycReviewDrawer id={reviewId} onClose={closeReview} onAction={(kind, detail) => setDecision({ kind, row: detail })} />
      ) : null}

      <KycDecisionModal
        target={decision}
        onClose={() => setDecision(null)}
        onDone={(message) => {
          setDecision(null);
          setNotice({ tone: 'ok', text: message });
          void queryClient.invalidateQueries({ queryKey: ['admin-runners'] });
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.badges });
        }}
      />
    </div>
  );
}
