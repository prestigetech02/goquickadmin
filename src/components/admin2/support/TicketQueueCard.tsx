import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CircleCheckBig, Copy, Ellipsis, ExternalLink, Hand, MessageSquareReply, RotateCcw, Undo2, XCircle } from 'lucide-react';
import { fetchAdminSupportQueue } from '@/api/adminSupportDeskApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSupportFilters, AdminSupportOverview, AdminSupportTicketRow, SupportTicketStatus } from '@/types/api';
import { formatCount, relativeAgo } from '../format';
import { statusLabel } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { userTone } from '../transactions/presentation';
import { ActionMenu } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  CATEGORY_OPTIONS,
  DEFAULT_SUPPORT_FILTERS,
  FLAG_OPTIONS,
  FLAG_TONES,
  PRIORITY_META,
  PRIORITY_OPTIONS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  SORT_OPTIONS,
  TAB_NOUNS,
  WAIT_COLORS,
  categoryMeta,
  hasRefinements,
  statusChip,
  supportTabs,
  waitLine,
  type SupportFilters,
} from './presentation';

const PER_PAGE = 12;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(220px,1.8fr)_minmax(160px,1.2fr)_minmax(120px,0.9fr)_80px_minmax(130px,1fr)_minmax(110px,0.8fr)_minmax(140px,1fr)_104px] items-center gap-x-[12px] px-[16px]';

function RequesterCell({ row }: { row: AdminSupportTicketRow }) {
  const person = row.requester;
  if (!person) return <span className="text-[11px] text-[#7c857f]">Deleted user</span>;
  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      <PersonAvatar name={person.name} url={person.avatar_url} tone={userTone(person.role === 'runner' ? 'runner' : 'buyer')} size={26} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[#17211b]">
          {person.name}
          <span className="ml-[5px] text-[9px] font-normal text-[#7c857f]">{ROLE_LABELS[person.role]}</span>
        </p>
        <p className="truncate text-[9px] text-[#7c857f]">{person.phone || person.email || '—'}</p>
      </div>
    </div>
  );
}

function OwnerCell({ row }: { row: AdminSupportTicketRow }) {
  if (!row.assignee) {
    return (
      <div className="min-w-0">
        <p className={`truncate text-[10px] font-semibold ${row.is_active ? 'text-[#b06d12]' : 'text-[#7c857f]'}`}>Unassigned</p>
        <p className="truncate text-[9px] text-[#7c857f]">{row.is_active ? 'Waiting to be picked up' : '—'}</p>
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

export function TicketQueueCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  busyId,
  onOpen,
  onTake,
  onRelease,
  onStatus,
  onCopy,
}: {
  overview?: AdminSupportOverview;
  filters: SupportFilters;
  onFiltersChange: (filters: SupportFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminSupportFilters;
  busyId: number | null;
  onOpen: (id: number) => void;
  onTake: (row: AdminSupportTicketRow) => void;
  onRelease: (row: AdminSupportTicketRow) => void;
  onStatus: (row: AdminSupportTicketRow, status: SupportTicketStatus) => void;
  onCopy: (code: string) => void;
}) {
  const navigate = useNavigate();
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.tickets.desk(listParams),
    queryFn: () => fetchAdminSupportQueue(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const refined = hasRefinements(filters, search);
  const noun = TAB_NOUNS[filters.tab];

  const update = <K extends keyof SupportFilters>(key: K, value: SupportFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = (keepTab: boolean) => {
    onFiltersChange({ ...DEFAULT_SUPPORT_FILTERS, tab: keepTab ? filters.tab : DEFAULT_SUPPORT_FILTERS.tab, sort: filters.sort });
    onSearchChange('');
  };

  const menuItems = (row: AdminSupportTicketRow) => {
    const busy = busyId === row.id;
    const items = [
      { label: row.status === 'open' ? 'Open and reply' : 'Open ticket', icon: MessageSquareReply, onSelect: () => onOpen(row.id) },
      {
        label: row.assignee && !row.is_mine ? `Take over from ${row.assignee.name}` : 'Take this ticket',
        icon: Hand,
        disabled: row.is_mine || busy,
        onSelect: () => onTake(row),
      },
      { label: 'Hand back to queue', icon: Undo2, disabled: !row.assignee || busy, onSelect: () => onRelease(row) },
    ];
    if (row.is_active) {
      items.push(
        { label: 'Mark resolved', icon: CircleCheckBig, disabled: busy, onSelect: () => onStatus(row, 'resolved') },
        { label: 'Close without reply', icon: XCircle, disabled: busy, onSelect: () => onStatus(row, 'closed') },
      );
    } else {
      items.push({ label: 'Reopen ticket', icon: RotateCcw, disabled: busy, onSelect: () => onStatus(row, 'open') });
    }
    items.push(
      { label: 'Open errand', icon: ExternalLink, disabled: !row.errand, onSelect: () => row.errand && navigate(getAdmin2ErrandHref(row.errand.id)) },
      { label: 'Copy ticket ID', icon: Copy, disabled: false, onSelect: () => onCopy(row.code) },
    );
    return items;
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Ticket queue</p>
          <p className="text-[11px] text-[#7c857f]">Take a ticket, reply to the customer and resolve it. Rows refresh every 30 seconds.</p>
        </div>
        <FilterDropdown label="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={(v) => update('sort', v as SupportFilters['sort'])} align="right" />
      </div>

      <CardTabs tabs={supportTabs(overview)} value={filters.tab} onChange={(tab) => update('tab', tab)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search ticket or errand ID, subject, name, email or phone…" />
        <FilterDropdown label="Topic" value={filters.category} options={CATEGORY_OPTIONS} onChange={(v) => update('category', v)} />
        <FilterDropdown label="Priority" value={filters.priority} options={PRIORITY_OPTIONS} onChange={(v) => update('priority', v as SupportFilters['priority'])} />
        <FilterDropdown label="From" value={filters.role} options={ROLE_OPTIONS} onChange={(v) => update('role', v as SupportFilters['role'])} />
        <FilterDropdown label="Signal" value={filters.flag} options={FLAG_OPTIONS} onChange={(v) => update('flag', v as SupportFilters['flag'])} align="right" />
        {refined ? (
          <button type="button" onClick={() => clearFilters(true)} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Ticket</span>
            <span>From</span>
            <span>Topic / errand</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Owner</span>
            <span>Waiting</span>
            <span className="text-right">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3]`}>
                  <Skeleton className="h-[10px] w-[160px]" />
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[70px]" />
                  ))}
                  <Skeleton className="ml-auto h-[26px] w-[80px]" />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load tickets.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{refined ? 'No tickets match these filters' : `No ${noun}`}</p>
              <p className="mt-[2px] text-[10px] text-[#7c857f]">
                {filters.tab === 'needs_reply' && !refined
                  ? 'Every customer has had a reply. Nice work.'
                  : filters.tab === 'mine' && !refined
                    ? 'Take a ticket from the Unassigned tab to start working on it.'
                    : filters.tab === 'attention' && !refined
                      ? 'Every open ticket is on track.'
                      : '\u00a0'}
              </p>
              {refined || filters.tab !== DEFAULT_SUPPORT_FILTERS.tab ? (
                <button type="button" onClick={() => clearFilters(false)} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Show tickets waiting on a reply
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const wait = waitLine(row);
            const status = statusChip(row.status);
            const priority = PRIORITY_META[row.priority] ?? PRIORITY_META.normal;
            const topic = categoryMeta(row.category);
            const others = row.flags.length - 1;
            const canTake = row.is_active && !row.assignee;
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${listQuery.isPlaceholderData ? 'opacity-60' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onOpen(row.id)}
                  className="min-w-0 text-left"
                  title={row.preview ? `${row.preview.from === 'customer' ? 'Customer' : 'Team'}: ${row.preview.body}` : row.subject}
                >
                  <p className="flex min-w-0 items-center gap-[6px] truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">
                    {row.has_unread ? <span className="size-[7px] flex-shrink-0 rounded-full bg-[#2c73b9]" aria-label="New customer reply" /> : null}
                    {row.code}
                    <span className="truncate font-normal text-[#45514a]">· {row.subject}</span>
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {row.preview ? (
                      <>
                        <span className="font-semibold">{row.preview.from === 'customer' ? 'Customer' : 'Team'}:</span> {row.preview.body}
                      </>
                    ) : (
                      'No messages yet'
                    )}
                  </p>
                </button>
                <RequesterCell row={row} />
                <div className="min-w-0" title={row.errand?.title ?? undefined}>
                  <p className="flex items-center gap-[5px] truncate text-[11px] font-medium text-[#17211b]">
                    <span className="size-[7px] flex-shrink-0 rounded-[2px]" style={{ backgroundColor: topic.color }} />
                    {topic.label}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {row.errand ? [row.errand.code, statusLabel(row.errand.status)].join(' · ') : 'No errand linked'}
                  </p>
                </div>
                <div>
                  <Chip tone={priority.tone} label={priority.label} />
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
                  <p className="truncate text-[10px] font-semibold" style={{ color: WAIT_COLORS[wait.tone] }}>
                    {wait.label}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">{wait.sub}</p>
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
                      {row.status === 'open' ? 'Reply' : row.is_active ? 'Open' : 'View'}
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
          Showing {formatCount(rows.length)} of {formatCount(total)} {noun}
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
