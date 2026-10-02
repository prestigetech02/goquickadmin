import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, FileBarChart, ShieldAlert, ShieldCheck } from 'lucide-react';
import { downloadAdminRevenueExport, fetchAdminRevenueOverview } from '@/api/adminRevenueApi';
import { saveBlob } from '@/api/adminTransactionsApi';
import { categoryLabel } from '@/components/admin2/errand/errandPresentation';
import { formatNaira } from '@/components/admin2/format';
import { CategoryContributionCard, ZoneContributionCard } from '@/components/admin2/revenue/ContributionCards';
import { FinancialRelationshipCard } from '@/components/admin2/revenue/FinancialRelationshipCard';
import {
  DEFAULT_REVENUE_FILTERS,
  revenueParams,
  revenueReportCsv,
  type RevenueTableFilters,
} from '@/components/admin2/revenue/presentation';
import { RevenueCompositionCard } from '@/components/admin2/revenue/RevenueCompositionCard';
import { RevenueKpiCards } from '@/components/admin2/revenue/RevenueKpiCards';
import { RevenueTransactionsCard } from '@/components/admin2/revenue/RevenueTransactionsCard';
import { RevenueTrendCard } from '@/components/admin2/revenue/RevenueTrendCard';
import { SettlementHealthCard } from '@/components/admin2/revenue/SettlementHealthCard';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { plural } from '@/components/admin2/shared/helpers';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const EXPORT_BUTTON =
  'flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#167d35] bg-white px-[13px] text-[12px] font-semibold text-[#167d35] hover:bg-[#f3faf5] disabled:opacity-60';

export function Admin2RevenuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { range } = useAdmin2DateRange();
  const [filters, setFilters] = useState<RevenueTableFilters>(DEFAULT_REVENUE_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => revenueParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.payments.revenueOverview(overviewParams),
    queryFn: () => fetchAdminRevenueOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 180_000,
  });
  const overview = overviewQuery.data;
  const review = overview?.health.review;

  const zoneOptions = useMemo(
    () => [
      { value: '', label: 'All zones' },
      ...(overview?.zones ?? []).flatMap((z) => (z.zone ? [{ value: z.zone, label: z.zone }] : [])),
    ],
    [overview],
  );
  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All categories' }, ...(overview?.categories ?? []).map((c) => ({ value: c.key, label: categoryLabel(c.key) }))],
    [overview],
  );

  const focusTable = (next: Partial<RevenueTableFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const exportTransactions = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminRevenueExport(params);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not export revenue transactions.') });
    } finally {
      setExporting(false);
    }
  };

  const generateReport = () => {
    if (!overview) return;
    const blob = new Blob([revenueReportCsv(overview)], { type: 'text/csv;charset=utf-8' });
    saveBlob(blob, `goquick-revenue-report-${overview.range.start_date}-to-${overview.range.end_date}.csv`);
  };

  const eyebrow = !overview ? 'Financials' : review && review.count > 0 ? `Financials · ${plural(review.count, 'exception')}` : 'Financials · Reconciled';

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow={eyebrow}
        title="Company revenue"
        subtitle="Monitor GoQuick earnings, marketplace value flow, settlements and revenue quality beyond runner withdrawals."
        actionsBesideTitle
        actions={
          <>
            <button type="button" onClick={generateReport} disabled={!overview} className={OUTLINE_BUTTON}>
              <FileBarChart className="size-[15px]" strokeWidth={1.8} />
              Generate report
            </button>
            <button type="button" onClick={exportTransactions} disabled={exporting} className={EXPORT_BUTTON}>
              <Download className="size-[15px]" strokeWidth={1.8} />
              {exporting ? 'Exporting…' : 'Export revenue'}
            </button>
          </>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load revenue metrics.')}
        </p>
      ) : null}

      <RevenueKpiCards overview={overview} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <RevenueTrendCard overview={overview} />
        <RevenueCompositionCard overview={overview} />
      </div>

      <FinancialRelationshipCard overview={overview} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <CategoryContributionCard overview={overview} onSelect={(category) => focusTable({ category })} />
        <ZoneContributionCard overview={overview} onSelect={(zone) => focusTable({ zone })} />
      </div>

      <SettlementHealthCard
        overview={overview}
        onFilter={(status) => focusTable({ status })}
        onOpenReconciliation={() => navigate(getPagePath('admin2-transactions'))}
        canReconcile={canAccessPage(user, 'admin2-transactions')}
      />

      <div ref={tableRef} className="scroll-mt-[90px]">
        <RevenueTransactionsCard
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          params={params}
          rangeLabel={range}
          zoneOptions={zoneOptions}
          categoryOptions={categoryOptions}
          onDownload={exportTransactions}
          downloading={exporting}
        />
      </div>

      {overview ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-[16px] py-[12px] ${
            review && review.count > 0 ? 'border-[#f2d4d4] bg-[#fdf5f5]' : 'border-[#d4e9da] bg-[#f3faf5]'
          }`}
        >
          <div className="flex min-w-0 items-center gap-[10px]">
            {review && review.count > 0 ? (
              <ShieldAlert className="size-[16px] flex-shrink-0 text-[#b84545]" strokeWidth={1.8} />
            ) : (
              <ShieldCheck className="size-[16px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
            )}
            <p className="text-[11px] text-[#45514a]">
              Revenue excludes escrow principal paid out to runners.{' '}
              {review && review.count > 0
                ? `${plural(review.count, 'reconciliation exception')} totaling ${formatNaira(review.amount)} need review before period close.`
                : 'Every finished escrow payment in this period matches the ledger.'}
            </p>
          </div>
          {review && review.count > 0 ? (
            <button
              type="button"
              onClick={() => focusTable({ status: 'review' })}
              className="flex h-[32px] flex-shrink-0 items-center rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
            >
              Review exceptions
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
