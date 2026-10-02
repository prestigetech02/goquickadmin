import { useState } from 'react';
import type { AnalyticsCategoryRow } from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { formatCount, formatMinutes, formatNaira, formatPct, formatSignedPct, relativeAgo } from '../format';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { TABLE_HEADER } from '../shared/TableControls';
import { FilterDropdown, type FilterOption } from '../users/FilterDropdown';
import { SORT_OPTIONS, sortCategories, type CategorySort } from './presentation';

const PER_PAGE = 6;
const GRID =
  'grid grid-cols-[minmax(150px,1.6fr)_80px_80px_88px_90px_96px_110px_80px] items-center gap-x-[12px] px-[16px]';

export function CategoryDetailCard({
  rows,
  loading,
  error,
  updatedAt,
  category,
  onCategoryChange,
  zone,
  onZoneChange,
  categoryOptions,
  zoneOptions,
}: {
  rows: AnalyticsCategoryRow[] | undefined;
  loading: boolean;
  error: string | null;
  updatedAt: number;
  category: string;
  onCategoryChange: (value: string) => void;
  zone: string;
  onZoneChange: (value: string) => void;
  categoryOptions: FilterOption[];
  zoneOptions: FilterOption[];
}) {
  const [sort, setSort] = useState<CategorySort>('completed');
  const filtered = sortCategories((rows ?? []).filter((row) => !category || row.key === category), sort);

  const key = `${category}|${zone}|${sort}`;
  const [pageState, setPageState] = useState({ key, page: 1 });
  const page = pageForKey(pageState, key);
  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label.toLowerCase() ?? 'completed errands';

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-[16px] pb-[12px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Category performance detail</p>
          <p className="text-[11px] text-[#7c857f]">Completion, speed and commercial value for errands requested in this period</p>
        </div>
        {updatedAt ? (
          <span className="flex-shrink-0 rounded-full bg-[#f1f4f2] px-[9px] py-[4px] text-[10px] font-medium text-[#45514a]">
            Updated {relativeAgo(new Date(updatedAt).toISOString())}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-[10px] border-y border-[#e2e8e3] px-[16px] py-[12px]">
        <FilterDropdown label="Category" value={category} options={categoryOptions} onChange={onCategoryChange} />
        <FilterDropdown label="Zone" value={zone} options={zoneOptions} onChange={onZoneChange} />
        <FilterDropdown label="Sort by" value={sort} options={SORT_OPTIONS} onChange={(v) => setSort(v as CategorySort)} />
        {category || zone ? (
          <button
            type="button"
            onClick={() => {
              onCategoryChange('');
              onZoneChange('');
            }}
            className="text-[10px] font-semibold text-[#167d35] hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className={`${GRID} ${TABLE_HEADER}`}>
            <span>Category</span>
            <span className="text-right">Requested</span>
            <span className="text-right">Completed</span>
            <span className="text-right">Completion</span>
            <span className="text-right">Median time</span>
            <span className="text-right">Cancellation</span>
            <span className="text-right">Avg order value</span>
            <span className="text-right">Growth</span>
          </div>

          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`${GRID} h-[50px] border-b border-[#e2e8e3]`}>
                  {Array.from({ length: 8 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[60px]" />
                  ))}
                </div>
              ))
            : null}
          {error ? <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{error}</p> : null}
          {!loading && !error && filtered.length === 0 ? (
            <p className="px-[16px] py-[32px] text-center text-[12px] text-[#7c857f]">No errands match these filters.</p>
          ) : null}

          {visible.map((row) => (
            <div key={row.key} className={`${GRID} h-[50px] border-b border-[#e2e8e3] last:border-b-0 hover:bg-[#fafcfa]`}>
              <span className="truncate text-[11px] font-semibold text-[#17211b]">{categoryLabel(row.key)}</span>
              <span className="text-right text-[11px] text-[#45514a]">{formatCount(row.requested)}</span>
              <span className="text-right text-[11px] text-[#17211b]">{formatCount(row.completed)}</span>
              <span className="text-right text-[11px] text-[#45514a]">{formatPct(row.completion_rate_pct)}</span>
              <span className="text-right text-[11px] text-[#45514a]">{formatMinutes(row.median_minutes)}</span>
              <span className={`text-right text-[11px] ${(row.cancellation_rate_pct ?? 0) >= 10 ? 'font-semibold text-[#b84545]' : 'text-[#45514a]'}`}>
                {formatPct(row.cancellation_rate_pct)}
              </span>
              <span className="text-right text-[11px] text-[#17211b]">{row.average_order_value != null ? formatNaira(row.average_order_value) : '—'}</span>
              <span
                className={`text-right text-[11px] font-semibold ${
                  row.growth_pct == null ? 'text-[#7c857f]' : row.growth_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'
                }`}
                title="Completed errands against the previous period"
              >
                {row.growth_pct != null ? formatSignedPct(row.growth_pct) : 'New'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(visible.length)} of {formatCount(filtered.length)} categories · sorted by {sortLabel}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={(next) => setPageState({ key, page: next })} />
      </div>
    </Card>
  );
}
