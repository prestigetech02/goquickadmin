import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Download, Scale } from 'lucide-react';
import { assignAdminDispute, downloadAdminDisputesExport, fetchAdminDisputesOverview } from '@/api/adminDisputesApi';
import { CaseloadCard } from '@/components/admin2/disputes/CaseloadCard';
import { DisputeAttentionCard } from '@/components/admin2/disputes/DisputeAttentionCard';
import { DisputeCaseDrawer } from '@/components/admin2/disputes/DisputeCaseDrawer';
import { DisputeDecisionModal, type DisputeDecisionTarget } from '@/components/admin2/disputes/DisputeDecisionModal';
import { DisputeKpiCards } from '@/components/admin2/disputes/DisputeKpiCards';
import { DisputeMixCard } from '@/components/admin2/disputes/DisputeMixCard';
import { DisputeQueueCard } from '@/components/admin2/disputes/DisputeQueueCard';
import { DisputeTrendCard } from '@/components/admin2/disputes/DisputeTrendCard';
import { DEFAULT_DISPUTE_FILTERS, disputeParams, isDisputeTab, type DisputeFilters } from '@/components/admin2/disputes/presentation';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminDisputeRow } from '@/types/api';

export function Admin2DisputesPage() {
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<DisputeFilters>(DEFAULT_DISPUTE_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => disputeParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exporting, setExporting] = useState(false);
  const [decision, setDecision] = useState<DisputeDecisionTarget | null>(null);

  const tabParam = searchParams.get('tab');
  const [seenTabParam, setSeenTabParam] = useState<string | null>(null);
  if (tabParam !== seenTabParam) {
    setSeenTabParam(tabParam);
    if (isDisputeTab(tabParam)) setFilters({ ...DEFAULT_DISPUTE_FILTERS, tab: tabParam });
  }

  const openParam = searchParams.get('open');
  const [seenOpenParam, setSeenOpenParam] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<number | null>(null);
  if (openParam !== seenOpenParam) {
    setSeenOpenParam(openParam);
    const id = Number(openParam);
    if (openParam && Number.isInteger(id) && id > 0) setCaseId(id);
  }

  const closeCase = () => {
    setCaseId(null);
    if (openParam) window.history.replaceState(window.history.state, '', window.location.pathname);
  };

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.disputes.boardOverview(overviewParams),
    queryFn: () => fetchAdminDisputesOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-errands'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.badges });
  };

  const assignment = useMutation({
    mutationFn: ({ row, release }: { row: AdminDisputeRow; release: boolean }) => assignAdminDispute(row.id, release ? null : undefined),
    onSuccess: (result, { row, release }) => {
      setNotice({ tone: 'ok', text: result.message || (release ? `${row.code} is back in the queue.` : `You now own ${row.code}.`) });
      refresh();
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not update the case owner.') }),
  });
  const busyId = assignment.isPending ? (assignment.variables?.row.id ?? null) : null;
  const take = (row: AdminDisputeRow) => assignment.mutate({ row, release: false });
  const release = (row: AdminDisputeRow) => assignment.mutate({ row, release: true });
  const decide = (row: AdminDisputeRow) => setDecision({ row });

  const focusBoard = (next: DisputeFilters) => {
    setFilters(next);
    setSearch('');
    document.getElementById('dispute-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const exportDisputes = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminDisputesExport(params);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not export disputes.') });
    } finally {
      setExporting(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ tone: 'ok', text: `Copied ${code} to the clipboard.` });
    } catch {
      setNotice({ tone: 'error', text: 'Could not copy to the clipboard.' });
    }
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Operations · Trust & safety"
        title="Disputes"
        subtitle="Pick up every dispute quickly, weigh the chat, proof and payment history, and settle the money fairly within 48 hours."
        actions={
          <button type="button" onClick={exportDisputes} disabled={exporting} className={OUTLINE_BUTTON}>
            <Download className="size-[15px]" strokeWidth={1.8} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load dispute metrics.')}
        </p>
      ) : null}

      <DisputeKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <DisputeAttentionCard
          overview={overviewQuery.data}
          busyId={busyId}
          onOpen={setCaseId}
          onFlag={(flag) => focusBoard({ ...DEFAULT_DISPUTE_FILTERS, tab: 'attention', flag: flag === 'any' ? '' : flag })}
          onTake={take}
          onDecide={decide}
        />
        <CaseloadCard overview={overviewQuery.data} onShowUnassigned={() => focusBoard({ ...DEFAULT_DISPUTE_FILTERS, tab: 'unassigned' })} />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <DisputeTrendCard overview={overviewQuery.data} />
        <DisputeMixCard
          overview={overviewQuery.data}
          onType={(type) => focusBoard({ ...DEFAULT_DISPUTE_FILTERS, tab: 'all', type, useRange: true })}
          onOutcome={(outcome) => focusBoard({ ...DEFAULT_DISPUTE_FILTERS, tab: outcome === 'dismissed' ? 'dismissed' : 'resolved', outcome })}
        />
      </div>

      <div id="dispute-board" className="scroll-mt-[90px]">
        <DisputeQueueCard
          overview={overviewQuery.data}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          params={params}
          range={range}
          busyId={busyId}
          onOpen={setCaseId}
          onTake={take}
          onRelease={release}
          onDecide={decide}
          onCopy={(code) => void copyCode(code)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-[12px] rounded-[12px] border border-[#cfe5d5] bg-[#f3faf5] px-[16px] py-[14px]">
        <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
          <Scale className="size-[16px] text-[#167d35]" strokeWidth={1.8} />
        </span>
        <p className="min-w-[240px] flex-1 text-[11px] leading-[1.5] text-[#45514a]">
          Decisions are final. Refunding returns held escrow to the requester and cancels the errand; paying the runner releases it and completes
          the errand. Both parties are notified with your resolution, and the decision is logged on the errand's timeline with your name.
        </p>
      </div>

      {caseId != null ? (
        <DisputeCaseDrawer
          key={caseId}
          id={caseId}
          busy={busyId === caseId}
          onClose={closeCase}
          onOpenCase={setCaseId}
          onTake={take}
          onRelease={release}
          onDecide={decide}
        />
      ) : null}

      <DisputeDecisionModal
        target={decision}
        onClose={() => setDecision(null)}
        onDone={(message) => {
          setDecision(null);
          setNotice({ tone: 'ok', text: message });
          refresh();
        }}
      />
    </div>
  );
}
