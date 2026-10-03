import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ShieldCheck } from 'lucide-react';
import { downloadAdminErrandsExport, fetchAdminErrandsOverview } from '@/api/adminErrandsApi';
import { CategoryMixCard } from '@/components/admin2/errands/CategoryMixCard';
import { ErrandAttentionCard } from '@/components/admin2/errands/ErrandAttentionCard';
import { ErrandBoardCard } from '@/components/admin2/errands/ErrandBoardCard';
import { ErrandKpiCards } from '@/components/admin2/errands/ErrandKpiCards';
import { ErrandQuickActions, type BoardActionTarget } from '@/components/admin2/errands/ErrandQuickActions';
import { ErrandTrendCard } from '@/components/admin2/errands/ErrandTrendCard';
import { LivePipelineCard } from '@/components/admin2/errands/LivePipelineCard';
import { DEFAULT_BOARD_FILTERS, boardParams, isBoardTab, type BoardFilters } from '@/components/admin2/errands/presentation';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

export function Admin2ErrandsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { range } = useAdmin2DateRange();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => boardParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exporting, setExporting] = useState(false);
  const [action, setAction] = useState<BoardActionTarget | null>(null);

  const tabParam = searchParams.get('tab');
  const [seenTabParam, setSeenTabParam] = useState<string | null>(null);
  if (tabParam !== seenTabParam) {
    setSeenTabParam(tabParam);
    if (isBoardTab(tabParam)) setFilters({ ...DEFAULT_BOARD_FILTERS, tab: tabParam });
  }

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.errands.boardOverview(overviewParams),
    queryFn: () => fetchAdminErrandsOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const openErrand = (id: number) => navigate(getAdmin2ErrandHref(id));

  const focusBoard = (next: BoardFilters) => {
    setFilters(next);
    setSearch('');
    document.getElementById('errand-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const exportErrands = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminErrandsExport(params);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not export errands.') });
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
        eyebrow="Operations · Errand control"
        title="Errands"
        subtitle="Track every errand from request to payout, catch the ones going wrong and step in before customers notice."
        actions={
          <button type="button" onClick={exportErrands} disabled={exporting} className={OUTLINE_BUTTON}>
            <Download className="size-[15px]" strokeWidth={1.8} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load errand metrics.')}
        </p>
      ) : null}

      <ErrandKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <ErrandAttentionCard
          overview={overviewQuery.data}
          onOpen={openErrand}
          onFlag={(flag) => focusBoard({ ...DEFAULT_BOARD_FILTERS, tab: 'attention', flag: flag === 'any' ? '' : flag, useRange: filters.useRange })}
          onAction={(kind, row) => setAction({ kind, row })}
        />
        <LivePipelineCard overview={overviewQuery.data} />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <ErrandTrendCard overview={overviewQuery.data} />
        <CategoryMixCard
          overview={overviewQuery.data}
          onCategory={(category) => focusBoard({ ...DEFAULT_BOARD_FILTERS, category, useRange: true })}
        />
      </div>

      <div id="errand-board" className="scroll-mt-[90px]">
        <ErrandBoardCard
          overview={overviewQuery.data}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          params={params}
          range={range}
          onOpen={openErrand}
          onAction={(kind, row) => setAction({ kind, row })}
          onCopy={(code) => void copyCode(code)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-[12px] rounded-[12px] border border-[#cfe5d5] bg-[#f3faf5] px-[16px] py-[14px]">
        <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
          <ShieldCheck className="size-[16px] text-[#167d35]" strokeWidth={1.8} />
        </span>
        <p className="min-w-[240px] flex-1 text-[11px] leading-[1.5] text-[#45514a]">
          Every intervention (reassigning, changing status, completing or cancelling) needs a reason and is added to the errand's timeline with
          your name. Cancelling notifies the requester and runner and can refund any held escrow to the requester.
        </p>
      </div>

      <ErrandQuickActions
        target={action}
        onClose={() => setAction(null)}
        onDone={(message) => {
          setAction(null);
          setNotice({ tone: 'ok', text: message });
          void queryClient.invalidateQueries({ queryKey: ['admin-errands'] });
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.badges });
        }}
      />
    </div>
  );
}
