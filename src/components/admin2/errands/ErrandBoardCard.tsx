import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleCheckBig, Copy, Ellipsis, ExternalLink, Repeat2, SlidersHorizontal, XCircle } from 'lucide-react';
import { fetchAdminErrandBoard } from '@/api/adminErrandsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminErrandBoardFilters, AdminErrandBoardRow, AdminErrandsOverview } from '@/types/api';
import { formatCount, formatDateRange, formatNaira, relativeAgo } from '../format';
import { categoryLabel, splitAddress, statusLabel, watShortDate, watTime } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, DateRangeToggle, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { userTone } from '../transactions/presentation';
import { ActionMenu } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  DEFAULT_BOARD_FILTERS,
  FLAG_OPTIONS,
  FLAG_TONES,
  MORE_FILTER_SECTIONS,
  PAYMENT_META,
  PAYMENT_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  TAB_NOUNS,
  boardStatusTone,
  boardTabs,
  categoryOptions,
  hasRefinements,
  timingLine,
  type BoardFilters,
} from './presentation';
import type { BoardAction } from './ErrandQuickActions';

const PER_PAGE = 12;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(170px,1.4fr)_minmax(128px,1fr)_minmax(128px,1fr)_minmax(170px,1.3fr)_98px_minmax(128px,1fr)_minmax(112px,0.9fr)_96px] items-center gap-x-[12px] px-[16px]';

const TIMING_COLORS = { red: '#b84545', amber: '#b06d12', gray: '#17211b', green: '#0d5e27' };

function PersonCell({ person, role, empty }: { person: AdminErrandBoardRow['requester']; role: 'buyer' | 'runner'; empty: string }) {
  if (!person) {
    return <span className={`truncate text-[11px] ${role === 'runner' ? 'font-semibold text-[#b06d12]' : 'text-[#7c857f]'}`}>{empty}</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      <PersonAvatar name={person.name} url={person.avatar_url} tone={userTone(role)} size={26} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[#17211b]">{person.name}</p>
        <p className="truncate text-[9px] text-[#7c857f]">{person.phone ?? '—'}</p>
      </div>
    </div>
  );
}

function RouteCell({ row }: { row: AdminErrandBoardRow }) {
  const pickup = splitAddress(row.route.pickup).title;
  const dropoff = row.route.dropoff ? splitAddress(row.route.dropoff).title : null;
  const meta = [row.area, row.route.distance_km != null ? `${row.route.distance_km} km` : null].filter(Boolean).join(' · ');
  return (
    <div className="min-w-0" title={[row.route.pickup, row.route.dropoff].filter(Boolean).join(' → ') || undefined}>
      <p className="flex min-w-0 items-center gap-[4px] text-[11px] text-[#17211b]">
        <span className="truncate">{pickup}</span>
        {dropoff ? (
          <>
            <ArrowRight className="size-[10px] flex-shrink-0 text-[#7c857f]" strokeWidth={2} />
            <span className="truncate">{dropoff}</span>
          </>
        ) : null}
      </p>
      <p className="truncate text-[9px] text-[#7c857f]">{meta || '—'}</p>
    </div>
  );
}

export function ErrandBoardCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  range,
  onOpen,
  onAction,
  onCopy,
}: {
  overview?: AdminErrandsOverview;
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminErrandBoardFilters;
  range: { start: string; end: string };
  onOpen: (id: number) => void;
  onAction: (kind: BoardAction, row: AdminErrandBoardRow) => void;
  onCopy: (code: string) => void;
}) {
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.errands.board(listParams),
    queryFn: () => fetchAdminErrandBoard(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalValue = listQuery.data?.total_value ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const refined = hasRefinements(filters, search);
  const noun = TAB_NOUNS[filters.tab];

  const update = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = (keepTab: boolean) => {
    onFiltersChange({ ...DEFAULT_BOARD_FILTERS, tab: keepTab ? filters.tab : DEFAULT_BOARD_FILTERS.tab, useRange: filters.useRange, sort: filters.sort });
    onSearchChange('');
  };

  const menuItems = (row: AdminErrandBoardRow) => [
    { label: 'Open errand', icon: ExternalLink, onSelect: () => onOpen(row.id) },
    { label: row.runner ? 'Reassign runner' : 'Assign a runner', icon: Repeat2, disabled: !row.can_reassign, onSelect: () => onAction('reassign', row) },
    { label: 'Change status…', icon: SlidersHorizontal, disabled: !row.can_cancel, onSelect: () => onAction('status', row) },
    { label: 'Mark complete', icon: CircleCheckBig, disabled: !row.is_active, onSelect: () => onAction('complete', row) },
    { label: 'Copy errand ID', icon: Copy, onSelect: () => onCopy(row.code) },
    { label: 'Cancel errand', icon: XCircle, danger: true, disabled: !row.can_cancel, onSelect: () => onAction('cancel', row) },
  ];

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">All errands</p>
          <p className="text-[11px] text-[#7c857f]">Search, filter and act on any errand. Live rows refresh every 30 seconds.</p>
        </div>
        <FilterDropdown label="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={(v) => update('sort', v as BoardFilters['sort'])} align="right" />
      </div>

      <CardTabs tabs={boardTabs(overview)} value={filters.tab} onChange={(tab) => update('tab', tab)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search errand ID, title, address, requester or runner…" />
        <FilterDropdown label="Category" value={filters.category} options={categoryOptions(overview?.filters.categories)} onChange={(v) => update('category', v)} />
        <FilterDropdown label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
        <FilterDropdown label="Payment" value={filters.payment} options={PAYMENT_OPTIONS} onChange={(v) => update('payment', v as BoardFilters['payment'])} />
        <FilterDropdown label="Signal" value={filters.flag} options={FLAG_OPTIONS} onChange={(v) => update('flag', v as BoardFilters['flag'])} />
        <FilterDropdown label="Type" value={filters.type} options={MORE_FILTER_SECTIONS.type} onChange={(v) => update('type', v as BoardFilters['type'])} />
        <FilterDropdown
          label="Runner"
          value={filters.assignment}
          options={MORE_FILTER_SECTIONS.assignment}
          onChange={(v) => update('assignment', v as BoardFilters['assignment'])}
          align="right"
        />
        <DateRangeToggle
          label="Created"
          on={filters.useRange}
          rangeLabel={formatDateRange(range.start, range.end)}
          onToggle={() => update('useRange', !filters.useRange)}
        />
        {refined ? (
          <button type="button" onClick={() => clearFilters(true)} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1220px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Errand</span>
            <span>Requester</span>
            <span>Runner</span>
            <span>Route</span>
            <span className="text-right">Amount</span>
            <span>Status</span>
            <span>Timing</span>
            <span className="text-right">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3]`}>
                  <Skeleton className="h-[10px] w-[120px]" />
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[70px]" />
                  ))}
                  <Skeleton className="ml-auto h-[26px] w-[80px]" />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load errands.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{refined ? 'No errands match these filters' : `No ${noun}`}</p>
              <p className="mt-[2px] text-[10px] text-[#7c857f]">
                {filters.tab === 'attention' && !refined ? 'Every live errand is on track.' : filters.useRange ? 'Try switching the created date to all dates.' : '\u00a0'}
              </p>
              {refined || filters.tab !== DEFAULT_BOARD_FILTERS.tab ? (
                <button type="button" onClick={() => clearFilters(false)} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Show all errands
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const timing = timingLine(row);
            const payment = PAYMENT_META[row.amount.payment];
            const others = row.flags.length - 1;
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${listQuery.isPlaceholderData ? 'opacity-60' : ''}`}
              >
                <button type="button" onClick={() => onOpen(row.id)} className="min-w-0 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">
                    {row.code}
                    {row.type === 'scheduled' ? (
                      <span className="ml-[6px] rounded-full bg-[#f3f0fa] px-[5px] py-[1px] text-[8px] font-semibold uppercase text-[#735ca8]">Scheduled</span>
                    ) : null}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.title ?? undefined}>
                    {[categoryLabel(row.category), row.title?.trim()].filter(Boolean).join(' · ')}
                  </p>
                </button>
                <PersonCell person={row.requester} role="buyer" empty="Unknown requester" />
                <PersonCell person={row.runner} role="runner" empty={row.is_active ? 'Not assigned yet' : '—'} />
                <RouteCell row={row} />
                <div className="min-w-0 text-right">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{row.amount.total != null ? formatNaira(row.amount.total) : '—'}</p>
                  <p className="truncate text-[9px] font-medium" style={{ color: payment.tone.color }}>
                    {payment.label}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-[3px]" title={row.flags.map((flag) => flag.label).join(' · ') || undefined}>
                  <Chip tone={boardStatusTone(row.status)} label={statusLabel(row.status)} dot />
                  {row.flags[0] ? (
                    <span className="max-w-full truncate text-[9px] font-semibold" style={{ color: FLAG_TONES[row.flags[0].tone].color }}>
                      {row.flags[0].label}
                      {others > 0 ? ` +${others}` : ''}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold" style={{ color: TIMING_COLORS[timing.tone] }}>
                    {timing.label}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {timing.sub || (row.created_at ? `${watShortDate(row.created_at)} · ${watTime(row.created_at)}` : '')}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-[6px]">
                  <button
                    type="button"
                    onClick={() => onOpen(row.id)}
                    className="h-[28px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
                  >
                    Open
                  </button>
                  <ActionMenu
                    ariaLabel={`Actions for ${row.code}`}
                    className="flex size-[28px] items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]"
                    items={menuItems(row)}
                  >
                    <Ellipsis className="size-[14px]" strokeWidth={1.8} />
                  </ActionMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} {noun} · {formatNaira(totalValue)} total value
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
