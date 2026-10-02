import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, GitCompareArrows, Lightbulb } from 'lucide-react';
import { fetchAdminAnalyticsCategories, fetchAdminAnalyticsOverview } from '@/api/adminAnalyticsApi';
import { saveBlob } from '@/api/adminTransactionsApi';
import { AnalyticsKpiCards } from '@/components/admin2/analytics/AnalyticsKpiCards';
import { CategoryDetailCard } from '@/components/admin2/analytics/CategoryDetailCard';
import { CategoryMixCard } from '@/components/admin2/analytics/CategoryMixCard';
import { CompletionFunnelCard } from '@/components/admin2/analytics/CompletionFunnelCard';
import { FulfillmentCard } from '@/components/admin2/analytics/FulfillmentCard';
import { GrowthCard } from '@/components/admin2/analytics/GrowthCard';
import { MarketplaceActivityCard } from '@/components/admin2/analytics/MarketplaceActivityCard';
import { analyticsReportCsv, recommendation } from '@/components/admin2/analytics/presentation';
import { ZonePerformanceCard } from '@/components/admin2/analytics/ZonePerformanceCard';
import { categoryLabel } from '@/components/admin2/errand/errandPresentation';
import { formatDateRange } from '@/components/admin2/format';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const EXPORT_BUTTON =
  'flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#167d35] bg-white px-[13px] text-[12px] font-semibold text-[#167d35] hover:bg-[#f3faf5] disabled:opacity-60';

export function Admin2AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { range } = useAdmin2DateRange();
  const [compare, setCompare] = useState(false);
  const [category, setCategory] = useState('');
  const [zone, setZone] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);

  const rangeParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.dashboard.analyticsOverview(rangeParams),
    queryFn: () => fetchAdminAnalyticsOverview(rangeParams),
    placeholderData: keepPreviousData,
    refetchInterval: 300_000,
  });
  const categoryParams = { ...rangeParams, ...(zone ? { zone } : {}) };
  const categoriesQuery = useQuery({
    queryKey: queryKeys.dashboard.analyticsCategories(categoryParams),
    queryFn: () => fetchAdminAnalyticsCategories(categoryParams),
    placeholderData: keepPreviousData,
  });

  const overview = overviewQuery.data;
  const canOpenZones = canAccessPage(user, 'admin2-zones');

  const zoneOptions = useMemo(
    () => [{ value: '', label: 'All zones' }, ...(overview?.zones ?? []).flatMap((z) => (z.zone ? [{ value: z.zone, label: z.zone }] : []))],
    [overview],
  );
  const categoryOptions = useMemo(() => {
    const keys = new Set([...(overview?.categories.rows ?? []).map((c) => c.key), ...(categoriesQuery.data?.rows ?? []).map((c) => c.key)]);
    return [{ value: '', label: 'All categories' }, ...[...keys].map((key) => ({ value: key, label: categoryLabel(key) }))];
  }, [overview, categoriesQuery.data]);

  const focusDetail = (next: { category?: string; zone?: string }) => {
    if (next.category !== undefined) setCategory(next.category);
    if (next.zone !== undefined) setZone(next.zone);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const exportReport = () => {
    if (!overview) return;
    const blob = new Blob([analyticsReportCsv(overview, categoriesQuery.data?.rows ?? [])], { type: 'text/csv;charset=utf-8' });
    saveBlob(blob, `goquick-analytics-${overview.range.start_date}-to-${overview.range.end_date}${zone ? `-${zone.replace(/\s+/g, '-')}` : ''}.csv`);
  };

  const advice = overview ? recommendation(overview) : null;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Marketplace intelligence · Live"
        title="Analytics"
        subtitle="Track marketplace demand, fulfillment health, supply balance and service quality across GoQuick."
        actionsBesideTitle
        actions={
          <>
            <button
              type="button"
              onClick={() => setCompare((on) => !on)}
              aria-pressed={compare}
              className={`${OUTLINE_BUTTON} ${compare ? '!border-[#167d35] !bg-[#f3faf5] !text-[#0d5e27]' : ''}`}
              title={overview ? `Overlay ${formatDateRange(overview.range.previous_start_date, overview.range.previous_end_date)} on the activity chart` : undefined}
            >
              <GitCompareArrows className="size-[15px]" strokeWidth={1.8} />
              {compare ? 'Comparing period' : 'Compare period'}
            </button>
            <button type="button" onClick={exportReport} disabled={!overview} className={EXPORT_BUTTON}>
              <Download className="size-[15px]" strokeWidth={1.8} />
              Export analytics
            </button>
          </>
        }
      />

      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load analytics.')}
        </p>
      ) : null}

      <AnalyticsKpiCards overview={overview} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <MarketplaceActivityCard overview={overview} compare={compare} />
        <CompletionFunnelCard overview={overview} />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <CategoryMixCard overview={overview} onSelect={(key) => focusDetail({ category: key })} />
        <ZonePerformanceCard
          overview={overview}
          onSelect={(name) => focusDetail({ zone: name })}
          onOpenZones={canOpenZones ? () => navigate(getPagePath('admin2-zones')) : undefined}
        />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <GrowthCard overview={overview} />
        <FulfillmentCard overview={overview} />
      </div>

      <div ref={detailRef} className="scroll-mt-[90px]">
        <CategoryDetailCard
          rows={categoriesQuery.data?.rows}
          loading={categoriesQuery.isLoading}
          error={categoriesQuery.isError ? getApiErrorMessage(categoriesQuery.error, 'Could not load category performance.') : null}
          updatedAt={categoriesQuery.dataUpdatedAt}
          category={category}
          onCategoryChange={setCategory}
          zone={zone}
          onZoneChange={setZone}
          categoryOptions={categoryOptions}
          zoneOptions={zoneOptions}
        />
      </div>

      {advice ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#d4e9da] bg-[#f3faf5] px-[16px] py-[12px]">
          <div className="flex min-w-0 items-center gap-[10px]">
            <Lightbulb className="size-[16px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
            <p className="text-[11px] text-[#45514a]">{advice.text}</p>
          </div>
          {advice.zone && canOpenZones ? (
            <button
              type="button"
              onClick={() => navigate(getPagePath('admin2-zones'))}
              className="flex h-[32px] flex-shrink-0 items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
            >
              Open service zones
              <ArrowRight className="size-[13px]" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
