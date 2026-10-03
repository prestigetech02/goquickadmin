import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Ban, CircleX, Copy, EllipsisVertical, PackageCheck, RefreshCw, Undo2, ShieldCheck, UserRound, WalletCards, X } from 'lucide-react';
import { fetchAdminTransactions } from '@/api/adminTransactionsApi';
import { verifyAdminWalletFunding } from '@/api/adminWalletApi';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2ErrandHref, getAdmin2RunnerHref, getAdmin2UserHref, getPageHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminTransactionFilters, AdminTransactionRow } from '@/types/api';
import { formatCount, formatDateRange, formatNaira, personInitials, relativeAgo } from '../format';
import { watShortDate, watTime } from '../errand/errandPresentation';
import { Chip } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, DateRangeToggle, NoticeBar, SearchField, TABLE_HEADER, type Notice } from '../shared/TableControls';
import { ActionMenu, type ActionMenuItem } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import { LedgerActionModal, type LedgerAction } from './LedgerActionModal';
import {
  AMOUNT_OPTIONS,
  DEFAULT_LEDGER_FILTERS,
  DIRECTION_OPTIONS,
  KIND_LABELS,
  PROVIDER_OPTIONS,
  STATUS_OPTIONS,
  TABS,
  kindTone,
  providerLabel,
  statusLabel,
  statusTone,
  userTone,
  type LedgerFilters,
} from './presentation';

const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(110px,1fr)_minmax(150px,1.3fr)_minmax(150px,1.4fr)_84px_86px_minmax(90px,0.8fr)_74px_100px_92px_24px] items-center gap-x-[12px] px-[16px]';

function feeTitle(row: AdminTransactionRow): string | undefined {
  if (row.fee_type === 'provider') return 'Paystack processing fee';
  if (row.fee_type === 'platform') return 'Platform fee earned on this movement';
  return undefined;
}

export function TransactionLedgerCard({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  rangeLabel,
  onReconcile,
  reconciling,
  onClearUser,
}: {
  filters: LedgerFilters;
  onFiltersChange: (filters: LedgerFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminTransactionFilters;
  rangeLabel: { start: string; end: string };
  onReconcile: () => void;
  reconciling: boolean;
  onClearUser: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: LedgerAction; row: AdminTransactionRow } | null>(null);

  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.payments.transactions(listParams),
    queryFn: () => fetchAdminTransactions(listParams),
    placeholderData: keepPreviousData,
  });

  const verifyMutation = useMutation({
    mutationFn: (row: AdminTransactionRow) => verifyAdminWalletFunding(row.id),
    onSuccess: (result, row) => {
      const status = result.transaction?.status;
      setNotice({
        tone: status === 'completed' ? 'ok' : 'error',
        text:
          status === 'completed'
            ? `${row.code} verified with Paystack and credited.`
            : `${row.code} is still ${status ?? 'unconfirmed'} on Paystack.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (error, row) => setNotice({ tone: 'error', text: getApiErrorMessage(error, `Could not verify ${row.code}.`) }),
  });

  const rows = listQuery.data?.data ?? [];
  const filterUser = params.user_id ? listQuery.data?.filter_user : null;
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const hasAnyFilter =
    filters.status !== '' || filters.direction !== '' || filters.provider !== '' || filters.amount !== '' || search.trim() !== '';
  const canOpenOps = canAccessPage(user, 'admin2-errand');

  const update = <K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) => onFiltersChange({ ...filters, [key]: value });

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: 'ok', text: `${label} copied.` });
    } catch {
      setNotice({ tone: 'error', text: 'Clipboard is not available in this browser.' });
    }
  };

  const rowMenu = (row: AdminTransactionRow): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    if (row.can_verify) {
      items.push({
        label: 'Verify with Paystack',
        icon: ShieldCheck,
        disabled: verifyMutation.isPending,
        onSelect: () => verifyMutation.mutate(row),
      });
    }
    if (row.actions?.mark_failed) {
      items.push({ label: 'Mark failed', icon: CircleX, onSelect: () => setPendingAction({ action: 'mark-failed', row }) });
    }
    if (row.actions?.cancel_funding) {
      items.push({ label: 'Cancel pending funding', icon: Ban, onSelect: () => setPendingAction({ action: 'cancel', row }) });
    }
    if (row.actions?.reverse) {
      items.push({ label: 'Reverse transaction', icon: Undo2, danger: true, onSelect: () => setPendingAction({ action: 'reverse', row }) });
    }
    if (row.errand && canOpenOps) {
      const errandId = row.errand.id;
      items.push({ label: 'Open errand', icon: PackageCheck, onSelect: () => navigate(getAdmin2ErrandHref(errandId)) });
    }
    if (row.user && row.user.role !== 'admin' && canOpenOps) {
      const { id, role } = row.user;
      items.push({
        label: role === 'runner' ? 'Open runner profile' : 'Open user profile',
        icon: UserRound,
        onSelect: () => navigate(role === 'runner' ? getAdmin2RunnerHref(id) : getAdmin2UserHref(id)),
      });
    }
    if (row.withdrawal_id) {
      const withdrawalId = row.withdrawal_id;
      items.push({ label: 'Open withdrawal', icon: WalletCards, onSelect: () => navigate(getPageHref('admin2-withdrawals', { openId: withdrawalId })) });
    }
    items.push({ label: 'Copy transaction ID', icon: Copy, onSelect: () => void copy(row.code, 'Transaction ID') });
    if (row.reference) {
      const reference = row.reference;
      items.push({ label: 'Copy reference', icon: Copy, onSelect: () => void copy(reference, 'Reference') });
    }
    return items;
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Transaction ledger</p>
          <p className="text-[11px] text-[#7c857f]">Every wallet movement with its provider, platform fee and settlement state</p>
        </div>
        <button
          type="button"
          onClick={onReconcile}
          disabled={reconciling}
          className="flex h-[34px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          <RefreshCw className={`size-[14px] ${reconciling ? 'animate-spin' : ''}`} strokeWidth={1.8} />
          {reconciling ? 'Reconciling…' : 'Reconcile providers'}
        </button>
      </div>

      <CardTabs tabs={TABS} value={filters.tab} onChange={(tab) => update('tab', tab)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search transaction ID, user or errand…" />
        {params.user_id ? (
          <span className="flex h-[34px] items-center gap-[6px] rounded-[8px] border border-[#cfe6d6] bg-[#eef7f0] pl-[10px] pr-[6px] text-[11px] font-semibold text-[#167d35]">
            <UserRound className="size-[13px]" strokeWidth={1.8} />
            {filterUser?.name ?? `User #${params.user_id}`}
            <button
              type="button"
              onClick={onClearUser}
              aria-label="Show all users"
              className="flex size-[20px] items-center justify-center rounded hover:bg-[#dcefe1]"
            >
              <X className="size-[12px]" strokeWidth={2} />
            </button>
          </span>
        ) : null}
        <FilterDropdown label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v as LedgerFilters['status'])} />
        <FilterDropdown
          label="Type"
          value={filters.direction}
          options={DIRECTION_OPTIONS}
          onChange={(v) => update('direction', v as LedgerFilters['direction'])}
        />
        <FilterDropdown
          label="Provider"
          value={filters.provider}
          options={PROVIDER_OPTIONS}
          onChange={(v) => update('provider', v as LedgerFilters['provider'])}
        />
        <FilterDropdown
          label="Amount"
          value={filters.amount}
          options={AMOUNT_OPTIONS}
          onChange={(v) => update('amount', v as LedgerFilters['amount'])}
          align="right"
        />
        <DateRangeToggle
          label="Date"
          on={filters.useRange}
          rangeLabel={formatDateRange(rangeLabel.start, rangeLabel.end)}
          onToggle={() => update('useRange', !filters.useRange)}
        />
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={() => {
              onFiltersChange({ ...DEFAULT_LEDGER_FILTERS, tab: filters.tab, useRange: filters.useRange });
              onSearchChange('');
            }}
            className="text-[10px] font-semibold text-[#167d35] hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} inline />

      <div className="overflow-x-auto">
        <div className="min-w-[1110px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Transaction ID</span>
            <span>User</span>
            <span>Related errand</span>
            <span>Type</span>
            <span>Provider</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Fee</span>
            <span>Status</span>
            <span>Date / time</span>
            <span />
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3]`}>
                  <Skeleton className="h-[10px] w-[90px]" />
                  <div className="flex items-center gap-[9px]">
                    <Skeleton className="size-[28px] rounded-full" />
                    <Skeleton className="h-[10px] w-[90px]" />
                  </div>
                  {Array.from({ length: 7 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[56px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(listQuery.error, 'Could not load transactions.')}
            </p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">No transactions match these filters</p>
              {hasAnyFilter || filters.tab !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange({ ...DEFAULT_LEDGER_FILTERS, useRange: filters.useRange });
                    onSearchChange('');
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const tone = userTone(row.user?.role);
            const provider = providerLabel(row);
            const name = row.user?.name ?? 'Platform';
            const credit = row.direction === 'credit';
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                  listQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{row.code}</p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={row.reference ?? undefined}>
                    {row.reference ?? row.description ?? '—'}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-[9px]">
                  <span
                    className="flex size-[28px] flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ backgroundColor: tone.bg, color: tone.color }}
                  >
                    {personInitials(name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#17211b]">{name}</p>
                    <p className="truncate text-[9px] text-[#7c857f]">
                      {row.user?.city || (row.user?.role === 'runner' ? 'Runner' : row.user ? 'Requester' : 'Internal')}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  {row.errand ? (
                    <>
                      <p className="truncate text-[11px] font-semibold text-[#17211b]">{row.errand.code}</p>
                      <p className="truncate text-[9px] text-[#7c857f]">{row.errand.title ?? 'Errand'}</p>
                    </>
                  ) : (
                    <p className="truncate text-[10px] text-[#7c857f]" title={row.description ?? undefined}>
                      {row.description ?? '—'}
                    </p>
                  )}
                </div>
                <div>
                  <Chip tone={kindTone(row.kind)} label={KIND_LABELS[row.kind] ?? 'Other'} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[#17211b]">{provider.title}</p>
                  {provider.detail ? <p className="truncate text-[9px] text-[#7c857f]">{provider.detail}</p> : null}
                </div>
                <p className="truncate text-right text-[11px] font-semibold text-[#17211b]" title={credit ? 'Credit to wallet' : 'Debit from wallet'}>
                  <span className={credit ? 'text-[#167d35]' : 'text-[#7c857f]'}>{credit ? '+' : '−'}</span>
                  {formatNaira(row.amount)}
                </p>
                <p className="truncate text-right text-[10px] text-[#45514a]" title={feeTitle(row)}>
                  {row.fee != null && row.fee > 0 ? formatNaira(row.fee) : '—'}
                </p>
                <div title={row.ledger_status !== 'completed' ? `Ledger status: ${row.ledger_status}` : undefined}>
                  <Chip tone={statusTone(row.status)} label={statusLabel(row.status)} dot />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[#17211b]">{row.created_at ? watShortDate(row.created_at) : '—'}</p>
                  <p className="text-[9px] text-[#7c857f]">{row.created_at ? watTime(row.created_at) : ''}</p>
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
          Showing {formatCount(rows.length)} of {formatCount(total)} transactions
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>

      {pendingAction ? (
        <LedgerActionModal
          action={pendingAction.action}
          row={pendingAction.row}
          onClose={() => setPendingAction(null)}
          onDone={(message) => {
            setPendingAction(null);
            setNotice({ tone: 'ok', text: message });
          }}
        />
      ) : null}
    </Card>
  );
}
