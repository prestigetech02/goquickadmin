import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { fetchAdminWithdrawalQueue } from '@/api/adminWithdrawalsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminWithdrawalFilters, AdminWithdrawalRow, AdminWithdrawalsOverview } from '@/types/api';
import { formatCount, formatDateRange, formatNaira, relativeAgo, shortAge } from '../format';
import { watShortDate, watTime } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, DateRangeToggle, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { userTone } from '../transactions/presentation';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  AMOUNT_OPTIONS,
  DEFAULT_QUEUE_FILTERS,
  RISK_OPTIONS,
  RISK_TONES,
  STAGE_LABELS,
  bankLine,
  bankOptions,
  rowStatus,
  stageTabs,
  type QueueFilters,
} from './presentation';
const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(116px,1fr)_minmax(150px,1.3fr)_minmax(140px,1.2fr)_82px_82px_minmax(100px,0.9fr)_84px_92px_minmax(96px,0.9fr)_64px] items-center gap-x-[12px] px-[16px]';

const OUTLINE_SMALL =
  'h-[28px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#f8faf8]';

function payoutFailed(row: AdminWithdrawalRow): boolean {
  return row.payout_status === 'failed' || row.payout_status === 'reversed';
}

function ReviewerCell({ row }: { row: AdminWithdrawalRow }) {
  if (row.stage === 'pending') {
    return (
      <div className="min-w-0">
        <p className={`truncate text-[10px] font-semibold ${row.sla_breached ? 'text-[#b84545]' : 'text-[#17211b]'}`}>
          {row.created_at ? `${shortAge(row.created_at)} waiting` : '—'}
        </p>
        <p className={`truncate text-[9px] ${row.sla_breached ? 'text-[#b84545]' : 'text-[#7c857f]'}`}>
          {row.sla_breached ? 'SLA breached' : row.due_at ? `Due ${watShortDate(row.due_at)} · ${watTime(row.due_at)}` : 'Awaiting review'}
        </p>
      </div>
    );
  }

  const reviewer = row.reviewer?.name.split(' ')[0] ?? (row.stage === 'paid' && row.payout_reference ? 'Transfer' : 'System');
  const decidedAt = row.reviewed_at ?? row.processed_at;
  const note =
    row.stage === 'processing'
      ? 'Transfer in flight'
      : row.stage === 'approved'
        ? payoutFailed(row)
          ? 'Transfer failed · retry or reject'
          : 'Awaiting payout'
        : row.stage === 'rejected'
          ? (row.reason ?? 'Rejected')
          : row.processed_at
            ? `Paid ${watShortDate(row.processed_at)} · ${watTime(row.processed_at)}`
            : 'Paid';

  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold text-[#17211b]">
        {reviewer}
        {decidedAt ? ` · ${shortAge(decidedAt)}` : ''}
      </p>
      <p className="truncate text-[9px] text-[#7c857f]" title={note}>
        {note}
      </p>
    </div>
  );
}

export function WithdrawalRequestsCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  rangeLabel,
  onReview,
  onSync,
  syncing,
}: {
  overview?: AdminWithdrawalsOverview;
  filters: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminWithdrawalFilters;
  rangeLabel: { start: string; end: string };
  onReview: (id: number) => void;
  onSync: () => void;
  syncing: boolean;
}) {
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.payments.withdrawalQueue(listParams),
    queryFn: () => fetchAdminWithdrawalQueue(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalAmount = listQuery.data?.total_amount ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const hasAnyFilter = filters.bank !== '' || filters.amount !== '' || filters.risk !== '' || search.trim() !== '';
  const inFlight = overview?.kpis.approved.processing_count ?? 0;
  const stageNoun = filters.stage === 'all' ? '' : `${STAGE_LABELS[filters.stage].toLowerCase()} `;

  const update = <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = (keepStage: boolean) => {
    onFiltersChange({ ...DEFAULT_QUEUE_FILTERS, stage: keepStage ? filters.stage : DEFAULT_QUEUE_FILTERS.stage, useRange: filters.useRange });
    onSearchChange('');
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Withdrawal requests</p>
          <p className="text-[11px] text-[#7c857f]">Review balances, account ownership and payout readiness before approval</p>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          title="Ask Flutterwave for the latest status of transfers that are still processing"
          className="flex h-[34px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          <RefreshCw className={`size-[14px] ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.8} />
          {syncing ? 'Syncing…' : 'Sync payouts'}
          {inFlight > 0 && !syncing ? (
            <span className="rounded-full bg-[#f3f0fa] px-[6px] py-[2px] text-[9px] font-semibold text-[#735ca8]">{formatCount(inFlight)}</span>
          ) : null}
        </button>
      </div>

      <CardTabs tabs={stageTabs(overview)} value={filters.stage} onChange={(stage) => update('stage', stage)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search runner, account or withdrawal ID…" />
        <FilterDropdown label="Bank" value={filters.bank} options={bankOptions(overview?.banks)} onChange={(v) => update('bank', v)} />
        <FilterDropdown label="Amount" value={filters.amount} options={AMOUNT_OPTIONS} onChange={(v) => update('amount', v as QueueFilters['amount'])} />
        <FilterDropdown
          label="Risk / KYC"
          value={filters.risk}
          options={RISK_OPTIONS}
          onChange={(v) => update('risk', v as QueueFilters['risk'])}
          align="right"
        />
        <DateRangeToggle
          label="Request date"
          on={filters.useRange}
          rangeLabel={formatDateRange(rangeLabel.start, rangeLabel.end)}
          onToggle={() => update('useRange', !filters.useRange)}
        />
        {hasAnyFilter ? (
          <button type="button" onClick={() => clearFilters(true)} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Withdrawal ID</span>
            <span>Runner</span>
            <span>Bank / account</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Balance</span>
            <span>KYC / risk</span>
            <span>Requested</span>
            <span>Status</span>
            <span>Reviewer / age</span>
            <span className="text-right">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[62px] border-b border-[#e2e8e3]`}>
                  <Skeleton className="h-[10px] w-[96px]" />
                  <div className="flex items-center gap-[9px]">
                    <Skeleton className="size-[30px] rounded-full" />
                    <Skeleton className="h-[10px] w-[90px]" />
                  </div>
                  {Array.from({ length: 7 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[56px]" />
                  ))}
                  <Skeleton className="ml-auto h-[26px] w-[58px]" />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(listQuery.error, 'Could not load withdrawals.')}
            </p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">
                {hasAnyFilter ? 'No withdrawals match these filters' : `No ${stageNoun}withdrawal requests`}
              </p>
              {hasAnyFilter || filters.stage !== DEFAULT_QUEUE_FILTERS.stage ? (
                <button type="button" onClick={() => clearFilters(false)} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Back to pending requests
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const name = row.user?.name ?? 'Unknown user';
            const status = rowStatus(row);
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[62px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                  listQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                <button type="button" onClick={() => onReview(row.id)} className="min-w-0 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">{row.code}</p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.reference ?? undefined}>
                    {row.reference ?? '—'}
                  </p>
                </button>
                <div className="flex min-w-0 items-center gap-[9px]">
                  <PersonAvatar name={name} tone={userTone(row.user?.role)} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#17211b]">{name}</p>
                    <p className="truncate text-[9px] text-[#7c857f]">{row.user?.city || (row.user?.role === 'runner' ? 'Runner' : 'Requester')}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[#17211b]">{bankLine(row.bank)}</p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.bank.account_name ?? undefined}>
                    {row.bank.account_name ?? '—'}
                  </p>
                </div>
                <p className="truncate text-right text-[11px] font-semibold text-[#17211b]" title={`Fee ${formatNaira(row.fee)}`}>
                  {formatNaira(row.amount)}
                </p>
                <p className="truncate text-right text-[10px] text-[#45514a]" title="Wallet balance after this request was reserved">
                  {formatNaira(row.wallet_balance)}
                </p>
                <div className="min-w-0" title={row.risks.length > 1 ? row.risks.map((risk) => risk.label).join(' · ') : undefined}>
                  <Chip tone={RISK_TONES[row.risk.tone]} label={row.risks.length > 1 ? `${row.risk.label} +${row.risks.length - 1}` : row.risk.label} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[#17211b]">{row.created_at ? watShortDate(row.created_at) : '—'}</p>
                  <p className="text-[9px] text-[#7c857f]">{row.created_at ? watTime(row.created_at) : ''}</p>
                </div>
                <div>
                  <Chip tone={status.tone} label={status.label} dot />
                </div>
                <ReviewerCell row={row} />
                <div className="flex justify-end">
                  <button type="button" onClick={() => onReview(row.id)} className={OUTLINE_SMALL}>
                    {row.stage === 'pending' || row.stage === 'approved' ? 'Review' : 'View'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} {stageNoun}request{total === 1 ? '' : 's'} · {formatNaira(totalAmount)}{' '}
          {filters.stage === 'all' ? 'total' : STAGE_LABELS[filters.stage].toLowerCase()}
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
