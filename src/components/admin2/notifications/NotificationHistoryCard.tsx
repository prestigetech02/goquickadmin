import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bot, EllipsisVertical } from 'lucide-react';
import { fetchNotificationHistory } from '@/api/adminNotificationCenterApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminNotificationsOverview, NotificationHistoryFilters, NotificationHistoryRow } from '@/types/api';
import { formatCount, formatDateRange, formatPct, relativeAgo } from '../format';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, DateRangeToggle, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { ActionMenu } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  AUDIENCE_OPTIONS,
  CHANNEL_OPTIONS,
  DEFAULT_HISTORY_FILTERS,
  STATUS_OPTIONS,
  TABS,
  audienceDetail,
  channelLine,
  statusChip,
  whenLabel,
  type HistoryFilters,
} from './presentation';
import { rowActions, type RowHandlers } from './rowActions';

const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(220px,2.2fr)_minmax(130px,1.1fr)_minmax(110px,1fr)_minmax(100px,0.9fr)_92px_minmax(110px,0.9fr)_minmax(104px,0.9fr)_36px] items-center gap-x-[12px] px-[16px]';

const AUTHOR_TONE = { bg: '#eaf6ed', color: '#0d5e27' };

function DeliveryCell({ row }: { row: NotificationHistoryRow }) {
  if (!row.delivery) {
    const label = row.status === 'scheduled' ? 'Scheduled' : row.status === 'draft' ? 'Draft' : row.status === 'sending' ? 'Sending…' : '—';
    return (
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#7c857f]">{label}</p>
        <p className="text-[9px] text-[#7c857f]">—</p>
      </div>
    );
  }

  const { delivered, total, failed, rate, read_rate } = row.delivery;
  return (
    <div className="min-w-0" title={`${formatCount(failed)} failed · ${formatPct(read_rate)} read`}>
      <p className={`text-[11px] font-semibold ${rate != null && rate < 90 ? 'text-[#b06d12]' : 'text-[#17211b]'}`}>{formatPct(rate)}</p>
      <p className="truncate text-[9px] text-[#7c857f]">
        {formatCount(delivered)}/{formatCount(total)}
      </p>
    </div>
  );
}

function AuthorCell({ row }: { row: NotificationHistoryRow }) {
  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      {row.author.system ? (
        <span className="flex size-[24px] flex-shrink-0 items-center justify-center rounded-full bg-[#f1f4f2] text-[#45514a]">
          <Bot className="size-[13px]" strokeWidth={1.8} />
        </span>
      ) : (
        <PersonAvatar name={row.author.name} tone={AUTHOR_TONE} size={24} />
      )}
      <p className="truncate text-[10px] font-medium text-[#17211b]">{row.author.name}</p>
    </div>
  );
}

export function NotificationHistoryCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  range,
  handlers,
  busy,
}: {
  overview?: AdminNotificationsOverview;
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: NotificationHistoryFilters;
  range: { start: string; end: string };
  handlers: RowHandlers;
  busy: boolean;
}) {
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.notifications.history(listParams),
    queryFn: () => fetchNotificationHistory(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.data.some((row) => row.status === 'sending') ? 4_000 : 60_000),
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const hasAnyFilter = filters.channel !== '' || filters.audience !== '' || filters.status !== '' || search.trim() !== '';

  const update = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = () => {
    onFiltersChange({ ...DEFAULT_HISTORY_FILTERS, tab: filters.tab, useRange: filters.useRange });
    onSearchChange('');
  };

  const tabs = TABS.map((tab) => ({
    ...tab,
    count: tab.value === 'scheduled' ? overview?.tab_counts.scheduled : tab.value === 'drafts' ? overview?.tab_counts.drafts : null,
  }));

  return (
    <Card id="notification-history" className="w-full scroll-mt-[80px] overflow-hidden">
      <div className="flex flex-col gap-[4px] px-[16px] pb-[4px] pt-[16px]">
        <p className="text-[14px] font-semibold text-[#17211b]">Notification history</p>
        <p className="text-[11px] text-[#7c857f]">Campaigns you compose, plus automated messages grouped by type and day</p>
      </div>

      <CardTabs tabs={tabs} value={filters.tab} onChange={(tab) => update('tab', tab)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search title or message…" />
        <FilterDropdown label="Channel" value={filters.channel} options={CHANNEL_OPTIONS} onChange={(v) => update('channel', v as HistoryFilters['channel'])} />
        <FilterDropdown label="Audience" value={filters.audience} options={AUDIENCE_OPTIONS} onChange={(v) => update('audience', v as HistoryFilters['audience'])} />
        <FilterDropdown
          label="Delivery status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => update('status', v as HistoryFilters['status'])}
          align="right"
        />
        <DateRangeToggle
          label="Date"
          on={filters.useRange}
          rangeLabel={formatDateRange(range.start, range.end)}
          onToggle={() => update('useRange', !filters.useRange)}
        />
        {hasAnyFilter ? (
          <button type="button" onClick={clearFilters} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Notification</span>
            <span>Audience</span>
            <span>Channel</span>
            <span>Delivery</span>
            <span>Status</span>
            <span>Author</span>
            <span>Scheduled / sent</span>
            <span className="sr-only">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3]`}>
                  <div className="flex flex-col gap-[6px]">
                    <Skeleton className="h-[10px] w-[150px]" />
                    <Skeleton className="h-[8px] w-[200px]" />
                  </div>
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[60px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(listQuery.error, 'Could not load notification history.')}
            </p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{hasAnyFilter ? 'No notifications match these filters' : 'Nothing here yet'}</p>
              {hasAnyFilter || filters.tab !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange({ ...DEFAULT_HISTORY_FILTERS, useRange: filters.useRange });
                    onSearchChange('');
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline"
                >
                  Show all notifications
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const chip = statusChip(row);
            return (
              <div
                key={row.key}
                className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                  listQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                <button type="button" onClick={() => handlers.open(row)} className="min-w-0 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]" title={row.title}>
                    {row.title}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.message}>
                    {row.message || '—'}
                  </p>
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[#17211b]">{row.audience.label}</p>
                  <p className="truncate text-[9px] text-[#7c857f]">{audienceDetail(row)}</p>
                </div>
                <p className="truncate text-[10px] text-[#45514a]" title={channelLine(row.channels)}>
                  {channelLine(row.channels)}
                </p>
                <DeliveryCell row={row} />
                <div>
                  <Chip tone={chip.tone} label={chip.label} dot />
                </div>
                <AuthorCell row={row} />
                <div className="min-w-0">
                  {row.at_kind !== 'sent' ? <p className="text-[9px] text-[#7c857f]">{row.at_kind === 'scheduled' ? 'Scheduled' : 'Edited'}</p> : null}
                  <p className={`truncate text-[10px] font-medium ${row.overdue ? 'text-[#b06d12]' : 'text-[#17211b]'}`}>{whenLabel(row.at)}</p>
                </div>
                <div className="flex justify-end">
                  <ActionMenu
                    items={rowActions(row, handlers, busy)}
                    ariaLabel={`Actions for ${row.title}`}
                    className="flex size-[28px] items-center justify-center rounded-[7px] text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
                  >
                    <EllipsisVertical className="size-[15px]" />
                  </ActionMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} notification{total === 1 ? '' : 's'}
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
