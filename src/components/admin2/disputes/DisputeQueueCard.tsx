import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Copy, Ellipsis, ExternalLink, Gavel, Hand, Undo2, Eye } from 'lucide-react';
import { fetchAdminDisputeBoard } from '@/api/adminDisputesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminDisputeFilters, AdminDisputeRow, AdminDisputesOverview } from '@/types/api';
import { formatCount, formatDateRange, formatNaira, relativeAgo } from '../format';
import { statusLabel } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, DateRangeToggle, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { userTone } from '../transactions/presentation';
import { ActionMenu } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  DEFAULT_DISPUTE_FILTERS,
  FLAG_OPTIONS,
  FLAG_TONES,
  OUTCOME_META,
  OUTCOME_OPTIONS,
  PAYMENT_META,
  PAYMENT_OPTIONS,
  RAISED_BY_OPTIONS,
  ROLE_LABELS,
  SORT_OPTIONS,
  TAB_NOUNS,
  TYPE_META,
  TYPE_OPTIONS,
  ageLine,
  disputeTabs,
  hasRefinements,
  statusChip,
  type DisputeFilters,
} from './presentation';

const PER_PAGE = 12;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(190px,1.6fr)_minmax(160px,1.2fr)_minmax(130px,1fr)_100px_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_104px] items-center gap-x-[12px] px-[16px]';

const AGE_COLORS = { red: '#b84545', amber: '#b06d12', gray: '#17211b', green: '#0d5e27' };

const DECIDED_TABS = new Set(['resolved', 'dismissed', 'all']);

function PartiesCell({ row }: { row: AdminDisputeRow }) {
  const raiser = row.raised_by;
  if (!raiser) return <span className="text-[11px] text-[#7c857f]">Unknown</span>;
  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      <PersonAvatar name={raiser.name} url={raiser.avatar_url} tone={userTone(raiser.role === 'runner' ? 'runner' : 'buyer')} size={26} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[#17211b]">
          {raiser.name}
          <span className="ml-[5px] text-[9px] font-normal text-[#7c857f]">{ROLE_LABELS[raiser.role]}</span>
        </p>
        <p className="truncate text-[9px] text-[#7c857f]">
          {row.against ? `vs ${row.against.name} (${ROLE_LABELS[row.against.role].toLowerCase()})` : 'No other party'}
        </p>
      </div>
    </div>
  );
}

function OwnerCell({ row }: { row: AdminDisputeRow }) {
  if (!row.is_active) {
    const outcome = row.outcome ? OUTCOME_META[row.outcome] : null;
    return (
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold" style={{ color: outcome?.tone.color ?? '#45514a' }}>
          {outcome?.label ?? 'Closed'}
          {row.settled_amount ? ` · ${formatNaira(row.settled_amount)}` : ''}
        </p>
        <p className="truncate text-[9px] text-[#7c857f]">{row.resolved_by ? `by ${row.resolved_by.name}` : '—'}</p>
      </div>
    );
  }
  if (!row.assignee) {
    return (
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold text-[#b06d12]">Unassigned</p>
        <p className="truncate text-[9px] text-[#7c857f]">Waiting to be picked up</p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold text-[#17211b]">{row.is_mine ? 'You' : row.assignee.name}</p>
      <p className="truncate text-[9px] text-[#7c857f]">{row.assigned_at ? `since ${relativeAgo(row.assigned_at)}` : 'Owner'}</p>
    </div>
  );
}

export function DisputeQueueCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  range,
  busyId,
  onOpen,
  onTake,
  onRelease,
  onDecide,
  onCopy,
}: {
  overview?: AdminDisputesOverview;
  filters: DisputeFilters;
  onFiltersChange: (filters: DisputeFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminDisputeFilters;
  range: { start: string; end: string };
  busyId: number | null;
  onOpen: (id: number) => void;
  onTake: (row: AdminDisputeRow) => void;
  onRelease: (row: AdminDisputeRow) => void;
  onDecide: (row: AdminDisputeRow) => void;
  onCopy: (code: string) => void;
}) {
  const navigate = useNavigate();
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.disputes.board(listParams),
    queryFn: () => fetchAdminDisputeBoard(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalAtStake = listQuery.data?.total_at_stake ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const refined = hasRefinements(filters, search);
  const noun = TAB_NOUNS[filters.tab];
  const showOutcome = DECIDED_TABS.has(filters.tab);

  const update = <K extends keyof DisputeFilters>(key: K, value: DisputeFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = (keepTab: boolean) => {
    onFiltersChange({
      ...DEFAULT_DISPUTE_FILTERS,
      tab: keepTab ? filters.tab : DEFAULT_DISPUTE_FILTERS.tab,
      useRange: filters.useRange,
      sort: filters.sort,
    });
    onSearchChange('');
  };

  const menuItems = (row: AdminDisputeRow) => [
    { label: 'Review case', icon: Eye, onSelect: () => onOpen(row.id) },
    {
      label: row.assignee && !row.is_mine ? `Take over from ${row.assignee.name}` : 'Take this case',
      icon: Hand,
      disabled: !row.is_active || row.is_mine || busyId === row.id,
      onSelect: () => onTake(row),
    },
    { label: 'Hand back to queue', icon: Undo2, disabled: !row.is_active || !row.assignee || busyId === row.id, onSelect: () => onRelease(row) },
    { label: 'Record decision…', icon: Gavel, disabled: !row.is_active, onSelect: () => onDecide(row) },
    { label: 'Open errand', icon: ExternalLink, disabled: !row.errand, onSelect: () => row.errand && navigate(getAdmin2ErrandHref(row.errand.id)) },
    { label: 'Copy dispute ID', icon: Copy, onSelect: () => onCopy(row.code) },
  ];

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Dispute queue</p>
          <p className="text-[11px] text-[#7c857f]">Take a case, review the evidence and record a decision. Rows refresh every 30 seconds.</p>
        </div>
        <FilterDropdown label="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={(v) => update('sort', v as DisputeFilters['sort'])} align="right" />
      </div>

      <CardTabs tabs={disputeTabs(overview)} value={filters.tab} onChange={(tab) => update('tab', tab)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search dispute or errand ID, reason, requester or runner…" />
        <FilterDropdown label="Type" value={filters.type} options={TYPE_OPTIONS} onChange={(v) => update('type', v as DisputeFilters['type'])} />
        <FilterDropdown label="Filed by" value={filters.raisedBy} options={RAISED_BY_OPTIONS} onChange={(v) => update('raisedBy', v as DisputeFilters['raisedBy'])} />
        <FilterDropdown label="Payment" value={filters.payment} options={PAYMENT_OPTIONS} onChange={(v) => update('payment', v as DisputeFilters['payment'])} />
        <FilterDropdown label="Signal" value={filters.flag} options={FLAG_OPTIONS} onChange={(v) => update('flag', v as DisputeFilters['flag'])} />
        {showOutcome ? (
          <FilterDropdown
            label="Outcome"
            value={filters.outcome}
            options={OUTCOME_OPTIONS}
            onChange={(v) => update('outcome', v as DisputeFilters['outcome'])}
            align="right"
          />
        ) : null}
        <DateRangeToggle
          label="Filed"
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
        <div className="min-w-[1180px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Dispute</span>
            <span>Filed by</span>
            <span>Errand</span>
            <span className="text-right">At stake</span>
            <span>Status</span>
            <span>{showOutcome ? 'Owner / outcome' : 'Owner'}</span>
            <span>Age</span>
            <span className="text-right">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3]`}>
                  <Skeleton className="h-[10px] w-[140px]" />
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[70px]" />
                  ))}
                  <Skeleton className="ml-auto h-[26px] w-[80px]" />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load disputes.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{refined ? 'No disputes match these filters' : `No ${noun}`}</p>
              <p className="mt-[2px] text-[10px] text-[#7c857f]">
                {filters.tab === 'attention' && !refined
                  ? 'Every open dispute is on track.'
                  : filters.tab === 'mine' && !refined
                    ? 'Take a case from the Unassigned tab to start working on it.'
                    : filters.useRange
                      ? 'Try switching the filed date to all dates.'
                      : '\u00a0'}
              </p>
              {refined || filters.tab !== DEFAULT_DISPUTE_FILTERS.tab ? (
                <button type="button" onClick={() => clearFilters(false)} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Show all open disputes
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const age = ageLine(row);
            const payment = PAYMENT_META[row.amount.payment];
            const status = statusChip(row);
            const others = row.flags.length - 1;
            const canTake = row.is_active && !row.assignee;
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${listQuery.isPlaceholderData ? 'opacity-60' : ''}`}
              >
                <button type="button" onClick={() => onOpen(row.id)} className="min-w-0 text-left">
                  <p className="flex min-w-0 items-center gap-[6px] truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">
                    {row.code}
                    <span
                      className="rounded-full px-[5px] py-[1px] text-[8px] font-semibold uppercase"
                      style={{ backgroundColor: `${TYPE_META[row.type].color}1a`, color: TYPE_META[row.type].color }}
                    >
                      {TYPE_META[row.type].label}
                    </span>
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.reason ?? undefined}>
                    {row.reason?.trim() || 'No reason given'}
                  </p>
                </button>
                <PartiesCell row={row} />
                <div className="min-w-0" title={row.errand?.title ?? undefined}>
                  {row.errand ? (
                    <>
                      <p className="truncate text-[11px] font-medium text-[#17211b]">{row.errand.code}</p>
                      <p className="truncate text-[9px] text-[#7c857f]">
                        {[row.errand.title?.trim(), statusLabel(row.errand.status)].filter(Boolean).join(' · ')}
                      </p>
                    </>
                  ) : (
                    <span className="text-[11px] text-[#7c857f]">Errand removed</span>
                  )}
                </div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{row.amount.at_stake != null ? formatNaira(row.amount.at_stake) : '—'}</p>
                  <p className="truncate text-[9px] font-medium" style={{ color: payment.tone.color }}>
                    {payment.label}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-[3px]" title={row.flags.map((flag) => flag.label).join(' · ') || undefined}>
                  <Chip tone={status.tone} label={status.label} dot />
                  {row.flags[0] ? (
                    <span className="max-w-full truncate text-[9px] font-semibold" style={{ color: FLAG_TONES[row.flags[0].tone].color }}>
                      {row.flags[0].label}
                      {others > 0 ? ` +${others}` : ''}
                    </span>
                  ) : null}
                </div>
                <OwnerCell row={row} />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold" style={{ color: AGE_COLORS[age.tone] }}>
                    {age.label}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">{age.sub}</p>
                </div>
                <div className="flex items-center justify-end gap-[6px]">
                  {canTake ? (
                    <button
                      type="button"
                      onClick={() => onTake(row)}
                      disabled={busyId === row.id}
                      className="h-[28px] rounded-[7px] border border-[#167d35] bg-[#167d35] px-[10px] text-[10px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60"
                    >
                      Take
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(row.id)}
                      className="h-[28px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
                    >
                      {row.is_active ? 'Review' : 'View'}
                    </button>
                  )}
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
          Showing {formatCount(rows.length)} of {formatCount(total)} {noun} · {formatNaira(totalAtStake)} at stake
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
