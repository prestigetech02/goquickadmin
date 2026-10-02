import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, EllipsisVertical, PackageCheck, UserRound } from 'lucide-react';
import { fetchAdminRevenueTransactions } from '@/api/adminRevenueApi';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2ErrandHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminRevenueFilters, AdminRevenueRow } from '@/types/api';
import { categoryLabel, watShortDate, watTime } from '../errand/errandPresentation';
import { Chip } from '../errand/parts';
import { formatCount, formatDateRange, formatNaira, relativeAgo } from '../format';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { DateRangeToggle, NoticeBar, SearchField, TABLE_HEADER, type Notice } from '../shared/TableControls';
import { ActionMenu, type ActionMenuItem } from '../users/ActionMenu';
import { FilterDropdown, type FilterOption } from '../users/FilterDropdown';
import {
  CHANNEL_OPTIONS,
  DEFAULT_REVENUE_FILTERS,
  STATUS_META,
  STATUS_OPTIONS,
  channelLabel,
  type RevenueTableFilters,
} from './presentation';

const PER_PAGE = 8;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(130px,1.1fr)_minmax(120px,1fr)_minmax(100px,0.9fr)_74px_96px_minmax(110px,0.9fr)_86px_92px_24px] items-center gap-x-[12px] px-[16px]';

type Props = {
  filters: RevenueTableFilters;
  onFiltersChange: (filters: RevenueTableFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminRevenueFilters;
  rangeLabel: { start: string; end: string };
  zoneOptions: FilterOption[];
  categoryOptions: FilterOption[];
  onDownload: () => void;
  downloading: boolean;
};

export function RevenueTransactionsCard({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  rangeLabel,
  zoneOptions,
  categoryOptions,
  onDownload,
  downloading,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);

  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.payments.revenueTransactions(listParams),
    queryFn: () => fetchAdminRevenueTransactions(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const hasAnyFilter = filters.status !== '' || filters.channel !== '' || filters.zone !== '' || filters.category !== '' || search.trim() !== '';
  const canOpenOps = canAccessPage(user, 'admin2-errand');

  const update = <K extends keyof RevenueTableFilters>(key: K, value: RevenueTableFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearAll = () => {
    onFiltersChange({ ...DEFAULT_REVENUE_FILTERS, useRange: filters.useRange });
    onSearchChange('');
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: 'ok', text: `${label} copied.` });
    } catch {
      setNotice({ tone: 'error', text: 'Clipboard is not available in this browser.' });
    }
  };

  const rowMenu = (row: AdminRevenueRow): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    if (row.errand && canOpenOps) {
      const errandId = row.errand.id;
      items.push({ label: 'Open errand', icon: PackageCheck, onSelect: () => navigate(getAdmin2ErrandHref(errandId)) });
    }
    if (row.requester && canOpenOps) {
      const requesterId = row.requester.id;
      items.push({ label: 'Open requester profile', icon: UserRound, onSelect: () => navigate(getAdmin2UserHref(requesterId)) });
    }
    items.push({ label: 'Copy transaction ID', icon: Copy, onSelect: () => void copy(row.code, 'Transaction ID') });
    if (row.errand) {
      const code = row.errand.code;
      items.push({ label: 'Copy errand ID', icon: Copy, onSelect: () => void copy(code, 'Errand ID') });
    }
    return items;
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[12px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Recent revenue transactions</p>
          <p className="text-[11px] text-[#7c857f]">Transaction-level company revenue, settlement and exception status</p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="flex h-[34px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          <Download className="size-[14px]" strokeWidth={1.8} />
          {downloading ? 'Preparing…' : 'Download report'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-[10px] border-y border-[#e2e8e3] px-[16px] py-[12px]">
        <DateRangeToggle
          label="Date"
          on={filters.useRange}
          rangeLabel={formatDateRange(rangeLabel.start, rangeLabel.end)}
          onToggle={() => update('useRange', !filters.useRange)}
        />
        <FilterDropdown label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v as RevenueTableFilters['status'])} />
        <FilterDropdown
          label="Channel"
          value={filters.channel}
          options={CHANNEL_OPTIONS}
          onChange={(v) => update('channel', v as RevenueTableFilters['channel'])}
        />
        <FilterDropdown label="Zone" value={filters.zone} options={zoneOptions} onChange={(v) => update('zone', v)} />
        <FilterDropdown label="Category" value={filters.category} options={categoryOptions} onChange={(v) => update('category', v)} />
        {hasAnyFilter ? (
          <button type="button" onClick={clearAll} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
        <SearchField value={search} onChange={onSearchChange} placeholder="Search transactions…" minWidthClass="min-w-[150px]" />
      </div>

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} inline />

      <div className="overflow-x-auto">
        <div className="min-w-[1020px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Transaction</span>
            <span>Category</span>
            <span>Zone</span>
            <span>Channel</span>
            <span className="text-right">Gross value</span>
            <span className="text-right">Company revenue</span>
            <span>Status</span>
            <span>Processed</span>
            <span />
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[56px] border-b border-[#e2e8e3]`}>
                  {Array.from({ length: 8 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[64px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(listQuery.error, 'Could not load revenue transactions.')}
            </p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">No revenue transactions match these filters</p>
              {hasAnyFilter ? (
                <button type="button" onClick={clearAll} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Clear all filters
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const status = STATUS_META[row.status];
            const processed = row.processed_at;
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[56px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                  listQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{row.code}</p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.errand?.title ?? undefined}>
                    {row.errand ? `${row.errand.code} · ${row.requester?.name ?? 'Requester'}` : row.requester?.name ?? '—'}
                  </p>
                </div>
                <p className="truncate text-[11px] font-medium text-[#17211b]">{categoryLabel(row.errand?.category ?? null)}</p>
                <p className="truncate text-[11px] text-[#45514a]">{row.zone ?? '—'}</p>
                <p className="truncate text-[11px] text-[#45514a]">{channelLabel(row.channel)}</p>
                <p className="truncate text-right text-[11px] text-[#17211b]">{formatNaira(row.gross)}</p>
                <p
                  className={`truncate text-right text-[11px] font-semibold ${
                    row.revenue < 0 ? 'text-[#b84545]' : row.revenue_expected ? 'text-[#7c857f]' : 'text-[#167d35]'
                  }`}
                  title={row.revenue_expected ? 'Expected service fee; recognised when the escrow settles' : undefined}
                >
                  {row.revenue < 0 ? `−${formatNaira(Math.abs(row.revenue))}` : formatNaira(row.revenue)}
                  {row.revenue_expected ? <span className="ml-[3px] text-[9px] font-normal">est.</span> : null}
                </p>
                <div title={status.hint}>
                  <Chip tone={status.tone} label={status.label} dot />
                </div>
                <div className="min-w-0">
                  {processed ? (
                    <>
                      <p className="text-[10px] font-medium text-[#17211b]">{watShortDate(processed)}</p>
                      <p className="text-[9px] text-[#7c857f]">{watTime(processed)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-medium text-[#7c857f]">Not yet</p>
                      <p className="text-[9px] text-[#7c857f]">{row.created_at ? `Held ${watShortDate(row.created_at)}` : ''}</p>
                    </>
                  )}
                </div>
                <ActionMenu
                  items={rowMenu(row)}
                  ariaLabel={`Actions for ${row.code}`}
                  className="flex size-[22px] items-center justify-center rounded text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
                >
                  <EllipsisVertical className="size-[16px]" />
                </ActionMenu>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} revenue transactions
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
