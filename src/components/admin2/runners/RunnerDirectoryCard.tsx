import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bike, Check, Download, EllipsisVertical, Minus, PowerOff, ShieldCheck, Star, UserCheck, UserRound, UserX, X } from 'lucide-react';
import { fetchAdminRunnerDirectory } from '@/api/adminRunnerBoardApi';
import { saveBlob } from '@/api/adminTransactionsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminRunnerFilters, AdminRunnerRow, RunnerBulkAction, RunnerBulkResult, RunnerCoachingFlag } from '@/types/api';
import { Chip, PersonAvatar } from '../errand/parts';
import { formatCount, formatNaira, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { pageForKey, plural } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, NoticeBar, SearchField, TABLE_HEADER, type Notice } from '../shared/TableControls';
import { ActionMenu, type ActionMenuItem } from '../users/ActionMenu';
import { FilterDropdown, type FilterOption } from '../users/FilterDropdown';
import {
  ACCOUNT,
  AVAILABILITY,
  AVAILABILITY_OPTIONS,
  BULK_ACTIONS,
  DEFAULT_DIRECTORY,
  JOINED_OPTIONS,
  PERFORMANCE_OPTIONS,
  RATING_OPTIONS,
  TABS,
  VERIFICATION_CHIP,
  avatarTone,
  hasDirectoryFilters,
  lastActiveLabel,
  selectedRunnersCsv,
  type DirectoryState,
} from './presentation';
import { BulkActionModal, type BulkTarget } from './RunnerModals';

const PER_PAGE = 8;

const COLUMNS = 'minmax(190px,1.5fr) 96px 92px minmax(80px,0.7fr) 58px 54px 58px 56px 112px 66px 82px 18px';

const BAR_BUTTON =
  'flex h-[34px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]';

function Checkbox({ state, onChange, label }: { state: 'on' | 'off' | 'mixed'; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={`flex size-[16px] flex-shrink-0 items-center justify-center rounded-[4px] border ${
        state === 'off' ? 'border-[#c9d3cc] bg-white' : 'border-[#167d35] bg-[#167d35]'
      }`}
    >
      {state === 'on' ? <Check className="size-[11px] text-white" strokeWidth={3} /> : null}
      {state === 'mixed' ? <Minus className="size-[11px] text-white" strokeWidth={3} /> : null}
    </button>
  );
}

function Metric({ value, flagged, title }: { value: number | null; flagged: boolean; title: string }) {
  return (
    <span className={`text-[11px] ${flagged ? 'font-semibold text-[#b84545]' : 'text-[#17211b]'}`} title={title}>
      {formatPct(value, 0)}
    </span>
  );
}

const FLAG_TITLES: Record<RunnerCoachingFlag, string> = {
  on_time: 'Below the on-time threshold over the last 30 days',
  acceptance: 'Below the acceptance threshold over the last 30 days',
  rating: 'Below the rating threshold',
};

export function RunnerDirectoryCard({
  state,
  onStateChange,
  search,
  onSearchChange,
  params,
  zoneOptions,
}: {
  state: DirectoryState;
  onStateChange: (next: DirectoryState) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminRunnerFilters;
  zoneOptions: FilterOption[];
}) {
  const navigate = useNavigate();
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Map<number, AdminRunnerRow>>(new Map());
  const [bulk, setBulk] = useState<BulkTarget | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.runners.directory(listParams),
    queryFn: () => fetchAdminRunnerDirectory(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const total = listQuery.data?.total ?? 0;
  const counts = listQuery.data?.tab_counts;
  const filtered = hasDirectoryFilters(state, search);
  const update = <K extends keyof DirectoryState>(key: K, value: DirectoryState[K]) => onStateChange({ ...state, [key]: value });
  const clearFilters = () => {
    onStateChange({ ...DEFAULT_DIRECTORY, tab: state.tab });
    onSearchChange('');
  };

  const selectedOnPage = rows.filter((row) => selected.has(row.id)).length;
  const headerState: 'on' | 'off' | 'mixed' = selectedOnPage === 0 ? 'off' : selectedOnPage === rows.length ? 'on' : 'mixed';
  const toggleRow = (row: AdminRunnerRow) => {
    const next = new Map(selected);
    if (next.has(row.id)) next.delete(row.id);
    else next.set(row.id, row);
    setSelected(next);
  };
  const togglePage = () => {
    const next = new Map(selected);
    if (headerState === 'on') rows.forEach((row) => next.delete(row.id));
    else rows.forEach((row) => next.set(row.id, row));
    setSelected(next);
  };
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Map());
  };

  const onBulkDone = (result: RunnerBulkResult, action: RunnerBulkAction) => {
    const skipped = result.skipped + result.not_found;
    setNotice({
      tone: 'ok',
      text: `${BULK_ACTIONS[action].verb}: ${plural(result.updated, 'runner')} updated${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
    });
    setSelected(new Map());
  };

  const exportSelected = () => {
    const runners = [...selected.values()];
    saveBlob(new Blob([selectedRunnersCsv(runners)], { type: 'text/csv;charset=utf-8' }), `goquick-runners-selected-${runners.length}.csv`);
  };

  const rowMenu = (row: AdminRunnerRow): ActionMenuItem[] => [
    { label: 'Open runner profile', icon: Bike, onSelect: () => navigate(getAdmin2RunnerHref(row.id)) },
    { label: 'Open user account', icon: UserRound, onSelect: () => navigate(getAdmin2UserHref(row.id)) },
    ...(row.is_online && !row.is_suspended ? [{ label: 'Set offline', icon: PowerOff, onSelect: () => setBulk({ action: 'offline', runners: [row] }) }] : []),
    row.is_suspended
      ? { label: 'Reactivate runner', icon: UserCheck, onSelect: () => setBulk({ action: 'reactivate', runners: [row] }) }
      : { label: 'Suspend runner', icon: UserX, danger: true, onSelect: () => setBulk({ action: 'suspend', runners: [row] }) },
  ];

  const gridTemplate = selecting ? `18px ${COLUMNS}` : COLUMNS;
  const selectedRows = [...selected.values()];

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-[16px] pt-[16px]">
        <CardTitle title="Runner directory" subtitle="Verification, availability, performance and account health" />
        <button type="button" onClick={() => (selecting ? stopSelecting() : setSelecting(true))} className={BAR_BUTTON} aria-pressed={selecting}>
          {selecting ? <X className="size-[14px]" strokeWidth={1.8} /> : <ShieldCheck className="size-[14px]" strokeWidth={1.8} />}
          {selecting ? 'Done selecting' : 'Safe bulk actions'}
        </button>
      </div>

      <div className="mt-[8px]">
        <CardTabs tabs={TABS.map((tab) => ({ ...tab, count: counts?.[tab.value] }))} value={state.tab} onChange={(tab) => update('tab', tab)} />
      </div>

      <div className="flex flex-wrap items-center gap-[8px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search runner name, phone or GQR ID…" minWidthClass="min-w-[200px]" />
        <FilterDropdown label="Zone" value={state.zone} options={zoneOptions} onChange={(v) => update('zone', v)} />
        <FilterDropdown label="Status" value={state.availability} options={AVAILABILITY_OPTIONS} onChange={(v) => update('availability', v)} />
        <FilterDropdown label="Rating" value={state.rating} options={RATING_OPTIONS} onChange={(v) => update('rating', v)} />
        <FilterDropdown label="Performance" value={state.performance} options={PERFORMANCE_OPTIONS} onChange={(v) => update('performance', v)} align="right" />
        <FilterDropdown label="Joined" value={state.joined} options={JOINED_OPTIONS} onChange={(v) => update('joined', v)} align="right" />
        {filtered ? (
          <button type="button" onClick={clearFilters} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} inline />

      {selecting ? (
        <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] bg-[#f3faf5] px-[16px] py-[9px]">
          <p className="min-w-0 flex-1 text-[11px] text-[#45514a]">
            {selected.size > 0 ? (
              <>
                <span className="font-semibold text-[#17211b]">{plural(selected.size, 'runner')} selected</span> · you'll see a preview before anything changes
              </>
            ) : (
              'Tick runners to set them offline, suspend or reactivate them in one go.'
            )}
          </p>
          <button type="button" disabled={!selected.size} onClick={() => setBulk({ action: 'offline', runners: selectedRows })} className={`${BAR_BUTTON} disabled:opacity-50`}>
            <PowerOff className="size-[14px]" strokeWidth={1.8} /> Set offline
          </button>
          <button type="button" disabled={!selected.size} onClick={() => setBulk({ action: 'suspend', runners: selectedRows })} className={`${BAR_BUTTON} text-[#b84545] disabled:opacity-50`}>
            <UserX className="size-[14px]" strokeWidth={1.8} /> Suspend
          </button>
          <button type="button" disabled={!selected.size} onClick={() => setBulk({ action: 'reactivate', runners: selectedRows })} className={`${BAR_BUTTON} disabled:opacity-50`}>
            <UserCheck className="size-[14px]" strokeWidth={1.8} /> Reactivate
          </button>
          <button type="button" disabled={!selected.size} onClick={exportSelected} className={`${BAR_BUTTON} disabled:opacity-50`}>
            <Download className="size-[14px]" strokeWidth={1.8} /> Export selected
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className={`${TABLE_HEADER} grid items-center gap-[10px] px-[16px]`} style={{ gridTemplateColumns: gridTemplate }}>
            {selecting ? <Checkbox state={rows.length ? headerState : 'off'} onChange={togglePage} label="Select all on this page" /> : null}
            <span>Runner / contact</span>
            <span>Verification</span>
            <span>Availability</span>
            <span>Zone</span>
            <span>Errands</span>
            <span title="Invitations accepted, last 30 days">Accept</span>
            <span title="Completed within the quoted ETA plus the grace period set in Settings, last 30 days">On-time</span>
            <span>Rating</span>
            <span>Wallet / earnings</span>
            <span>Last active</span>
            <span>Account</span>
            <span />
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="grid h-[62px] items-center gap-[10px] border-b border-[#e2e8e3] px-[16px]" style={{ gridTemplateColumns: gridTemplate }}>
                  {selecting ? <Skeleton className="size-[16px]" /> : null}
                  <div className="flex items-center gap-[10px]">
                    <Skeleton className="size-[32px] rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-[10px] w-[110px]" />
                      <Skeleton className="h-[8px] w-[80px]" />
                    </div>
                  </div>
                  {Array.from({ length: 10 }, (_, j) => (
                    <Skeleton key={j} className="h-[12px] w-[44px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load runners.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">No runners match these filters</p>
              {filtered ? (
                <button type="button" onClick={clearFilters} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const availability = AVAILABILITY[row.availability];
            const verification = VERIFICATION_CHIP[row.verification];
            const account = ACCOUNT[row.account];
            const isSelected = selected.has(row.id);
            return (
              <div
                key={row.id}
                onClick={() => (selecting ? toggleRow(row) : navigate(getAdmin2RunnerHref(row.id)))}
                className={`grid h-[62px] cursor-pointer items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] transition-colors ${
                  isSelected ? 'bg-[#f3faf5]' : 'hover:bg-[#fafcfa]'
                } ${listQuery.isPlaceholderData ? 'opacity-60' : ''}`}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {selecting ? <Checkbox state={isSelected ? 'on' : 'off'} onChange={() => toggleRow(row)} label={`Select ${row.name}`} /> : null}
                <div className="flex min-w-0 items-center gap-[10px]">
                  <PersonAvatar name={row.name} url={row.avatar_url} tone={avatarTone(row.id)} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#17211b]">{row.name}</p>
                    <p className="truncate text-[9px] text-[#7c857f]">{row.phone || row.email || row.code}</p>
                  </div>
                </div>
                <div>
                  <Chip tone={verification.tone} label={verification.label} dot />
                </div>
                <div>
                  <Chip tone={availability.tone} label={availability.label} dot />
                </div>
                <p className="truncate text-[10px] text-[#45514a]">{row.zone ?? '—'}</p>
                <p className="text-[11px] text-[#17211b]">{formatCount(row.completed_errands)}</p>
                <Metric value={row.acceptance_pct} flagged={row.coaching.includes('acceptance')} title={row.coaching.includes('acceptance') ? FLAG_TITLES.acceptance : 'Invitations accepted'} />
                <Metric value={row.on_time_pct} flagged={row.coaching.includes('on_time')} title={row.coaching.includes('on_time') ? FLAG_TITLES.on_time : 'Completed on time'} />
                <span
                  className={`flex items-center gap-[3px] text-[11px] ${row.coaching.includes('rating') ? 'font-semibold text-[#b84545]' : 'text-[#17211b]'}`}
                  title={row.rating != null ? `${row.reviews} rating${row.reviews === 1 ? '' : 's'}` : 'No ratings yet'}
                >
                  <Star className="size-[11px] fill-[#e8a317] text-[#e8a317]" />
                  {row.rating != null ? row.rating.toFixed(1) : 'New'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{formatNaira(row.wallet_balance)}</p>
                  <p className={`truncate text-[9px] ${row.pending_payout > 0 ? 'text-[#b06d12]' : 'text-[#7c857f]'}`}>
                    {row.pending_payout > 0 ? `${formatNaira(row.pending_payout)} payout pending` : 'Available'}
                  </p>
                </div>
                <p className="text-[10px] text-[#45514a]">{lastActiveLabel(row)}</p>
                <div>
                  <Chip tone={account.tone} label={account.label} dot />
                </div>
                <ActionMenu
                  items={rowMenu(row)}
                  ariaLabel={`Actions for ${row.name}`}
                  className="flex size-[18px] items-center justify-center rounded text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
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
          {listQuery.data
            ? `Showing ${formatCount(rows.length)} of ${plural(total, 'runner')} · ${formatCount(listQuery.data.online_now)} online now`
            : 'Loading runners…'}
        </p>
        <Pager page={page} lastPage={listQuery.data?.last_page ?? 1} onChange={(next) => setPageState({ key: paramsKey, page: next })} />
      </div>

      <BulkActionModal target={bulk} onClose={() => setBulk(null)} onDone={onBulkDone} />
    </Card>
  );
}
