import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, Search } from 'lucide-react';
import {
  cancelAdminWalletFunding,
  fetchWalletTransaction,
  fetchWalletTransactions,
  markAdminWalletFundingFailed,
  reverseAdminWalletTransaction,
  verifyAdminWalletFunding,
} from '@/api/adminWalletApi';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  downloadCSV,
  formatCurrency,
  formatDateTime,
  formatNumber,
  partyDisplayName,
  titleCase,
} from '@/lib/utils';
import type { WalletTransactionListItem } from '@/types/api';

type TypeFilter = 'all' | 'credit' | 'debit';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed' | 'reversed';
type CategoryFilter =
  | 'all'
  | 'wallet_funding'
  | 'withdrawal'
  | 'escrow'
  | 'referral'
  | 'payout'
  | 'admin_adjustment'
  | 'admin_reversal'
  | 'other';
type LedgerAction = 'mark_failed' | 'cancel_funding' | 'reverse';

const CATEGORY_LABELS: Record<string, string> = {
  wallet_funding: 'Wallet funding',
  withdrawal: 'Withdrawal',
  escrow: 'Escrow',
  referral: 'Referral',
  payout: 'Payout',
  admin_adjustment: 'Admin adjustment',
  admin_reversal: 'Admin reversal',
  other: 'Other',
};

function txUserName(item: WalletTransactionListItem): string {
  const user = item.wallet?.user;
  if (!user) return '—';
  return partyDisplayName(user) || `User #${user.id}`;
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? titleCase(category.replace(/_/g, ' '));
}

export function WalletLedgerPanel() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [fundingQueue, setFundingQueue] = useState(searchParams.get('funding') === '1');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: LedgerAction; id: number } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const userFilter = useMemo(() => {
    const raw = searchParams.get('user');
    const id = raw ? Number(raw) : null;
    return id != null && Number.isFinite(id) ? id : null;
  }, [searchParams]);

  useEffect(() => {
    const txParam = searchParams.get('tx');
    const txId = txParam ? Number(txParam) : null;
    setSelectedId(txId != null && Number.isFinite(txId) ? txId : null);
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, status, category, fundingQueue, userFilter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = { per_page: 25, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (type !== 'all') params.type = type;
    if (status !== 'all') params.status = status;
    if (category !== 'all') params.category = category;
    if (fundingQueue) params.funding_queue = true;
    if (userFilter != null) params.user_id = userFilter;
    return params;
  }, [debouncedSearch, type, status, category, fundingQueue, page, userFilter]);

  const listQuery = useQuery({
    queryKey: queryKeys.payments.walletTransactions(listParams),
    queryFn: () => fetchWalletTransactions(listParams),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.payments.walletTransactionDetail(selectedId ?? 0),
    queryFn: () => fetchWalletTransaction(selectedId!),
    enabled: selectedId !== null,
  });

  const invalidateLedger = async (id?: number | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      id != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.payments.walletTransactionDetail(id) })
        : Promise.resolve(),
    ]);
  };

  const verifyMutation = useMutation({
    mutationFn: (id: number) => verifyAdminWalletFunding(id),
    onSuccess: async (_data, id) => {
      setActionError(null);
      await invalidateLedger(id);
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Could not verify funding.')),
  });

  const reasonMutation = useMutation({
    mutationFn: async (input: { type: LedgerAction; id: number; reason: string }) => {
      if (input.type === 'mark_failed') return markAdminWalletFundingFailed(input.id, input.reason);
      if (input.type === 'cancel_funding') return cancelAdminWalletFunding(input.id, input.reason);
      return reverseAdminWalletTransaction(input.id, input.reason);
    },
    onSuccess: async (_data, variables) => {
      setActionError(null);
      setPendingAction(null);
      setActionReason('');
      await invalidateLedger(variables.id);
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Action failed.')),
  });

  const transactions = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const detail = detailQuery.data;
  const actions = detail?.actions ?? detail?.transaction.actions;
  const busy = verifyMutation.isPending || reasonMutation.isPending;

  const openWithdrawal = (withdrawalId: number) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('tab', 'withdrawals');
      next.set('open', String(withdrawalId));
      next.delete('tx');
      return next;
    });
  };

  const columns: Column<WalletTransactionListItem>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-semibold text-ink-900">{row.reference || `#${row.id}`}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row) => <span className="text-ink-600">{txUserName(row)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={row.type === 'credit' ? 'text-success-700 font-medium' : 'text-error-700 font-medium'}>
          {titleCase(row.type)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-ink-900">
          {row.type === 'debit' ? '−' : '+'}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="text-ink-600">{categoryLabel(row.category)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} label={titleCase(row.status.replace(/_/g, ' '))} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => <span className="text-ink-400 text-xs">{formatDateTime(row.created_at)}</span>,
    },
  ];

  const handleExport = () => {
    downloadCSV(
      transactions.map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        user: txUserName(tx),
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        status: tx.status,
        errand_id: tx.errand_id,
        created_at: tx.created_at,
      })),
      'wallet-ledger.csv',
    );
  };

  const submitReasonAction = () => {
    if (!pendingAction) return;
    if (!actionReason.trim() || actionReason.trim().length < 8) {
      setActionError('Please provide a reason of at least 8 characters.');
      return;
    }
    reasonMutation.mutate({ ...pendingAction, reason: actionReason.trim() });
  };

  return (
    <>
      {listQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load wallet ledger</p>
            <p className="mt-1">
              {getApiErrorMessage(
                listQuery.error,
                'Check that the API is running and your admin account has finance module access.',
              )}
            </p>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      ) : null}

      {userFilter != null ? (
        <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-brand-50 text-sm text-brand-800">
          <p>Showing ledger for user #{userFilter}</p>
          <button
            type="button"
            onClick={() =>
              setSearchParams((params) => {
                const next = new URLSearchParams(params);
                next.delete('user');
                return next;
              })
            }
            className="font-medium underline"
          >
            Clear filter
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, description, user…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
            className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[140px]"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryFilter)}
            className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            <option value="wallet_funding">Wallet funding</option>
            <option value="admin_adjustment">Admin adjustment</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="escrow">Escrow</option>
            <option value="referral">Referral</option>
            <option value="payout">Payout</option>
            <option value="other">Other</option>
          </select>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fundingQueue}
              onChange={(e) => setFundingQueue(e.target.checked)}
              className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Funding queue only
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={transactions.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors disabled:opacity-50 sm:ml-auto"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={transactions}
          loading={listQuery.isLoading}
          onRowClick={(row) =>
            setSearchParams((params) => {
              const next = new URLSearchParams(params);
              next.set('tab', 'ledger');
              next.set('tx', String(row.id));
              return next;
            })
          }
          emptyMessage="No wallet transactions found"
          page={page}
          pageSize={listQuery.data?.per_page ?? 25}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={selectedId !== null}
        onClose={() =>
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.delete('tx');
            return next;
          })
        }
        title="Transaction details"
        size="lg"
      >
        {detailQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-ink-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : detailQuery.isError || !detail ? (
          <p className="text-sm text-error-600">
            {getApiErrorMessage(detailQuery.error, 'Failed to load transaction details.')}
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink-900">
                  {detail.transaction.reference || `#${detail.transaction.id}`}
                </h3>
                <p className="text-sm text-ink-500">{txUserName(detail.transaction)}</p>
              </div>
              <Badge
                status={detail.transaction.status}
                label={titleCase(detail.transaction.status.replace(/_/g, ' '))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Type" value={titleCase(detail.transaction.type)} />
              <DetailField
                label="Amount"
                value={`${detail.transaction.type === 'debit' ? '−' : '+'}${formatCurrency(detail.transaction.amount)}`}
              />
              <DetailField label="Category" value={categoryLabel(detail.transaction.category)} />
              <DetailField label="Wallet balance" value={formatCurrency(detail.wallet?.balance ?? 0)} />
              <DetailField label="Description" value={detail.transaction.description || '—'} className="col-span-2" />
              <DetailField label="Email" value={detail.user?.email || '—'} />
              <DetailField label="Phone" value={detail.user?.phone || '—'} />
              <DetailField label="Created" value={formatDateTime(detail.transaction.created_at)} />
              <DetailField label="Updated" value={formatDateTime(detail.transaction.updated_at)} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-100">
              {detail.user?.id ? (
                <button
                  type="button"
                  onClick={() =>
                    setSearchParams((params) => {
                      const next = new URLSearchParams(params);
                      next.set('tab', 'ledger');
                      next.set('user', String(detail.user!.id));
                      next.delete('tx');
                      return next;
                    })
                  }
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50"
                >
                  User ledger
                </button>
              ) : null}
              {actions?.verify_funding ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm('Re-verify this funding with Paystack and credit the wallet if paid?')) return;
                    setActionError(null);
                    verifyMutation.mutate(detail.transaction.id);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? 'Verifying…' : 'Verify with Paystack'}
                </button>
              ) : null}
              {actions?.mark_failed ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setActionError(null);
                    setPendingAction({ type: 'mark_failed', id: detail.transaction.id });
                    setActionReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-error-200 text-error-700 hover:bg-error-50 disabled:opacity-50"
                >
                  Mark failed
                </button>
              ) : null}
              {actions?.cancel_funding ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setActionError(null);
                    setPendingAction({ type: 'cancel_funding', id: detail.transaction.id });
                    setActionReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                >
                  Cancel pending
                </button>
              ) : null}
              {actions?.reverse ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setActionError(null);
                    setPendingAction({ type: 'reverse', id: detail.transaction.id });
                    setActionReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-warning-200 text-warning-800 hover:bg-warning-50 disabled:opacity-50"
                >
                  Reverse
                </button>
              ) : null}
            </div>

            {detail.withdrawal ? (
              <div className="p-4 rounded-xl bg-ink-50 border border-ink-100">
                <p className="text-xs text-ink-400 mb-2">Linked withdrawal</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {detail.withdrawal.reference || `#${detail.withdrawal.id}`}
                    </p>
                    <p className="text-sm text-ink-600">
                      {formatCurrency(detail.withdrawal.amount)} · {titleCase(detail.withdrawal.status.replace(/_/g, ' '))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openWithdrawal(detail.withdrawal!.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-200 text-brand-700 hover:bg-brand-50"
                  >
                    Open withdrawal
                  </button>
                </div>
              </div>
            ) : null}

            {detail.related_transactions.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                  Related transactions ({formatNumber(detail.related_transactions.length)})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detail.related_transactions.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() =>
                        setSearchParams((params) => {
                          const next = new URLSearchParams(params);
                          next.set('tab', 'ledger');
                          next.set('tx', String(tx.id));
                          return next;
                        })
                      }
                      className="w-full text-left p-3 rounded-xl border border-ink-100 hover:bg-ink-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink-900">{tx.reference || `#${tx.id}`}</span>
                        <span className="text-sm text-ink-600">
                          {tx.type === 'debit' ? '−' : '+'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-400 mt-1">
                        {categoryLabel(tx.category)} · {formatDateTime(tx.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        open={pendingAction !== null}
        onClose={() => {
          if (reasonMutation.isPending) return;
          setPendingAction(null);
          setActionReason('');
        }}
        title={
          pendingAction?.type === 'reverse'
            ? 'Reverse transaction'
            : pendingAction?.type === 'cancel_funding'
              ? 'Cancel pending funding'
              : 'Mark funding failed'
        }
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            This is recorded against your admin account. Give a reason of at least 8 characters.
          </p>
          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            rows={4}
            placeholder="Why are you taking this action?"
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={reasonMutation.isPending}
              onClick={() => {
                setPendingAction(null);
                setActionReason('');
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={reasonMutation.isPending}
              onClick={submitReasonAction}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function DetailField({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`p-4 rounded-xl bg-ink-50 ${className}`}>
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink-900 break-words">{value}</p>
    </div>
  );
}
