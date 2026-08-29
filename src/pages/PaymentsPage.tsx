import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { fetchDashboardStats } from '@/api/adminDashboardApi';
import {
  approveAdminWithdrawal,
  fetchAdminWithdrawal,
  fetchAdminWithdrawals,
  markAdminWithdrawalPaid,
  rejectAdminWithdrawal,
  type WithdrawalListItem,
} from '@/api/adminPaymentsApi';
import { fetchWalletLedgerStats } from '@/api/adminWalletApi';
import { WalletLedgerPanel } from '@/components/payments/WalletLedgerPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
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

type PaymentsTab = 'ledger' | 'withdrawals';
type WithdrawalStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';

function withdrawalRunnerName(item: WithdrawalListItem): string {
  const user = item.wallet?.user;
  if (!user) return '—';
  return partyDisplayName(user) || `User #${user.id}`;
}

function canPayViaPaystack(item: WithdrawalListItem): boolean {
  if (item.status === 'paid' || item.payout_status === 'success' || item.payout_status === 'pending') {
    return false;
  }
  return item.status === 'pending' || item.status === 'rejected' || item.status === 'approved';
}

function payConfirmMessage(item: WithdrawalListItem): string {
  const dest = [item.account_name, item.bank_name, item.account_number].filter(Boolean).join(' · ') || 'the runner bank account';
  return `Send ${formatCurrency(item.amount)} to ${dest} via Paystack?\n\nThis uses the platform Paystack balance. The runner wallet was already reserved when they requested payout.`;
}

function paymentsTabFromParams(params: URLSearchParams): PaymentsTab {
  return params.get('tab') === 'ledger' ? 'ledger' : 'withdrawals';
}

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = paymentsTabFromParams(searchParams);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<WithdrawalStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const openParam = searchParams.get('open');
    const openId = openParam ? Number(openParam) : null;
    setSelectedId(openId != null && Number.isFinite(openId) ? openId : null);
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 25, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status !== 'all') params.status = status;
    return params;
  }, [debouncedSearch, status, page]);

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: fetchDashboardStats,
  });

  const ledgerStatsQuery = useQuery({
    queryKey: queryKeys.payments.ledgerStats,
    queryFn: fetchWalletLedgerStats,
  });

  const withdrawalsQuery = useQuery({
    queryKey: queryKeys.payments.withdrawals(listParams),
    queryFn: () => fetchAdminWithdrawals(listParams),
    enabled: tab === 'withdrawals',
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.payments.withdrawalDetail(selectedId ?? 0),
    queryFn: () => fetchAdminWithdrawal(selectedId!),
    enabled: tab === 'withdrawals' && selectedId !== null,
  });

  const invalidatePayments = async (id?: number | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats }),
      id != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.payments.withdrawalDetail(id) })
        : Promise.resolve(),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async (input: { action: 'approve' | 'reject' | 'mark-paid'; id: number; reason?: string }) => {
      if (input.action === 'approve') return approveAdminWithdrawal(input.id);
      if (input.action === 'mark-paid') return markAdminWithdrawalPaid(input.id);
      return rejectAdminWithdrawal(input.id, input.reason ?? '');
    },
    onSuccess: async (_data, variables) => {
      setActionError(null);
      if (variables.action === 'reject') {
        setRejectingId(null);
        setRejectReason('');
      }
      await invalidatePayments(variables.id);
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Action failed.'));
    },
  });

  const withdrawals = withdrawalsQuery.data?.data ?? [];
  const total = withdrawalsQuery.data?.total ?? 0;
  const detail = detailQuery.data;
  const stats = statsQuery.data;
  const ledgerStats = ledgerStatsQuery.data;
  const pendingOnPage = withdrawals.filter((w) => w.status === 'pending').length;
  const paidOnPage = withdrawals.filter((w) => w.status === 'paid').length;

  const setTab = (nextTab: PaymentsTab) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (nextTab === 'ledger') {
        next.set('tab', 'ledger');
        next.delete('open');
      } else {
        next.delete('tab');
        next.delete('tx');
      }
      return next;
    });
  };

  const refreshAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      ledgerStatsQuery.refetch(),
      tab === 'withdrawals' ? withdrawalsQuery.refetch() : Promise.resolve(),
    ]);
  };

  const runAction = (
    item: WithdrawalListItem,
    action: 'approve' | 'reject' | 'mark-paid',
    copy: { title: string; message: string },
  ) => {
    if (actionMutation.isPending) return;
    if (!window.confirm(`${copy.title}\n\n${copy.message}`)) return;
    setActionError(null);
    actionMutation.mutate({ action, id: item.id });
  };

  const submitReject = () => {
    if (rejectingId == null) return;
    if (!rejectReason.trim()) {
      setActionError('Please provide a rejection reason.');
      return;
    }
    setActionError(null);
    actionMutation.mutate({ action: 'reject', id: rejectingId, reason: rejectReason.trim() });
  };

  const columns: Column<WithdrawalListItem>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-semibold text-ink-900">{row.reference || `#${row.id}`}</span>
      ),
    },
    {
      key: 'runner',
      header: 'Runner',
      render: (row) => <span className="text-ink-600">{withdrawalRunnerName(row)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold text-ink-900">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (row) => <span className="text-ink-500">{formatCurrency(row.fee ?? 0)}</span>,
    },
    {
      key: 'bank',
      header: 'Bank',
      render: (row) => <span className="text-ink-600">{row.bank_name || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} label={titleCase(row.status.replace(/_/g, ' '))} />,
    },
    {
      key: 'created_at',
      header: 'Requested',
      render: (row) => <span className="text-ink-400 text-xs">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[220px]',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() =>
              setSearchParams((params) => {
                const next = new URLSearchParams(params);
                next.delete('tab');
                next.set('open', String(row.id));
                return next;
              })
            }
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-ink-200 text-ink-700 hover:bg-ink-50"
          >
            View
          </button>
          {(row.status === 'pending' || row.status === 'approved') && row.payout_status !== 'pending' && (
            <button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() => {
                setActionError(null);
                setRejectingId(row.id);
                setRejectReason('');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-error-200 text-error-700 hover:bg-error-50 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {canPayViaPaystack(row) && (
            <button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() =>
                runAction(row, 'approve', {
                  title: row.status === 'approved' ? 'Pay via Paystack' : 'Approve & pay',
                  message: payConfirmMessage(row),
                })
              }
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {row.status === 'approved' ? 'Pay via Paystack' : 'Approve & pay'}
            </button>
          )}
          {row.status === 'approved' && row.payout_status !== 'success' && (
            <button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() =>
                runAction(row, 'mark-paid', {
                  title: 'Mark paid manually',
                  message: 'Use this only if you already paid the runner outside Paystack.',
                })
              }
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-success-200 text-success-700 hover:bg-success-50 disabled:opacity-50"
            >
              Mark paid
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleExport = () => {
    downloadCSV(
      withdrawals.map((w) => ({
        id: w.id,
        reference: w.reference,
        runner: withdrawalRunnerName(w),
        amount: w.amount,
        fee: w.fee,
        status: w.status,
        bank: w.bank_name,
        account_number: w.account_number,
        created_at: w.created_at,
      })),
      'withdrawals.csv',
    );
  };

  const subtitle =
    tab === 'ledger'
      ? `${formatNumber(ledgerStats?.pending_funding.count ?? 0)} pending funding · wallet transaction ledger`
      : `${formatNumber(total)} withdrawal requests · approve & pay via Paystack`;

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={subtitle}
        action={
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${statsQuery.isFetching || ledgerStatsQuery.isFetching || withdrawalsQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
        </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending funding"
          value={formatNumber(ledgerStats?.pending_funding.count ?? 0)}
          subValue={formatCurrency(ledgerStats?.pending_funding.amount ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Credits today"
          value={formatCurrency(ledgerStats?.credits_today ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Debits today"
          value={formatCurrency(ledgerStats?.debits_today ?? 0)}
          icon={<ArrowLeftRight className="w-5 h-5" />}
        />
        <StatCard
          label="Pending withdrawals"
          value={formatNumber(ledgerStats?.withdrawals_pending ?? stats?.operations.pending_withdrawals ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Approved withdrawals"
          value={formatNumber(ledgerStats?.withdrawals_approved ?? 0)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Wallet balance total"
          value={formatCurrency(stats?.finance.wallet_balance_total ?? 0)}
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          label="Today revenue"
          value={formatCurrency(stats?.metrics.today_revenue ?? 0)}
          icon={<CreditCard className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Failed funding (24h)"
          value={formatNumber(ledgerStats?.failed_funding_24h ?? 0)}
          icon={<AlertCircle className="w-5 h-5" />}
          accent="warning"
        />
        {tab === 'withdrawals' ? (
          <>
            <StatCard
              label="Pending on page"
              value={formatNumber(pendingOnPage)}
              icon={<Clock className="w-5 h-5" />}
              accent="warning"
            />
            <StatCard
              label="Paid on page"
              value={formatNumber(paidOnPage)}
              icon={<CheckCircle2 className="w-5 h-5" />}
              accent="success"
            />
          </>
        ) : null}
      </div>

      <div className="flex gap-1 p-1 mb-6 rounded-xl bg-ink-100 w-fit">
        <button
          type="button"
          onClick={() => setTab('ledger')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'ledger' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          Wallet ledger
        </button>
        <button
          type="button"
          onClick={() => setTab('withdrawals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'withdrawals' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          Withdrawal approvals
        </button>
      </div>

      {tab === 'ledger' ? (
        <WalletLedgerPanel />
      ) : (
        <>
          {withdrawalsQuery.isError ? (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Failed to load withdrawals</p>
                <p className="mt-1">
                  {getApiErrorMessage(
                    withdrawalsQuery.error,
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

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, bank, account, runner…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WithdrawalStatusFilter)}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[180px]"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="button"
              onClick={handleExport}
              disabled={withdrawals.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export
          </button>
      </div>

      <Card>
            <DataTable
              columns={columns}
              data={withdrawals}
              loading={withdrawalsQuery.isLoading}
              onRowClick={(row) =>
                setSearchParams((params) => {
                  const next = new URLSearchParams(params);
                  next.delete('tab');
                  next.set('open', String(row.id));
                  return next;
                })
              }
              emptyMessage="No withdrawals found"
              page={page}
              pageSize={withdrawalsQuery.data?.per_page ?? 25}
              total={total}
              onPageChange={setPage}
            />
      </Card>

          <Modal
            open={selectedId !== null}
            onClose={() =>
              setSearchParams((params) => {
                const next = new URLSearchParams(params);
                next.delete('open');
                return next;
              })
            }
            title="Withdrawal details"
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
                {getApiErrorMessage(detailQuery.error, 'Failed to load withdrawal details.')}
              </p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink-900">{detail.reference || `#${detail.id}`}</h3>
                    <p className="text-sm text-ink-500">{withdrawalRunnerName(detail)}</p>
                  </div>
                  <Badge status={detail.status} label={titleCase(detail.status.replace(/_/g, ' '))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Amount" value={formatCurrency(detail.amount)} />
                  <DetailField label="Fee" value={formatCurrency(detail.fee ?? 0)} />
                  <DetailField label="Bank" value={detail.bank_name || '—'} />
                  <DetailField label="Account name" value={detail.account_name || '—'} />
                  <DetailField label="Account number" value={detail.account_number || '—'} />
                  <DetailField label="Paystack payout" value={detail.payout_status ? titleCase(detail.payout_status) : 'Not sent'} />
                  <DetailField label="Email" value={detail.wallet?.user?.email || '—'} />
                  <DetailField label="Phone" value={detail.wallet?.user?.phone || '—'} />
                  <DetailField label="Requested" value={formatDateTime(detail.created_at)} />
                  <DetailField
                    label="Processed"
                    value={detail.processed_at ? formatDateTime(detail.processed_at) : '—'}
                  />
                  <DetailField label="Reason" value={detail.reason || '—'} className="col-span-2" />
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-100">
                  {canPayViaPaystack(detail) && (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        runAction(detail, 'approve', {
                          title: detail.status === 'approved' ? 'Pay via Paystack' : 'Approve & pay',
                          message: payConfirmMessage(detail),
                        })
                      }
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {detail.status === 'approved' ? 'Pay via Paystack' : 'Approve & pay'}
                    </button>
                  )}
                  {(detail.status === 'pending' || detail.status === 'approved') &&
                    detail.payout_status !== 'pending' && (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        setRejectingId(detail.id);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-error-200 text-error-700 hover:bg-error-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  {detail.status === 'approved' && detail.payout_status !== 'success' && (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        runAction(detail, 'mark-paid', {
                          title: 'Mark paid manually',
                          message: 'Use this only if you already paid the runner outside Paystack.',
                        })
                      }
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-success-200 text-success-700 hover:bg-success-50 disabled:opacity-50"
                    >
                      Mark paid manually
                    </button>
                  )}
            </div>
          </div>
        )}
      </Modal>

          <Modal
            open={rejectingId !== null}
            onClose={() => {
              if (actionMutation.isPending) return;
              setRejectingId(null);
              setRejectReason('');
            }}
            title="Reject withdrawal"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-ink-600">
                Provide a reason so the runner knows why this payout was rejected.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why are you rejecting this withdrawal?"
                rows={4}
                className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  disabled={actionMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  disabled={actionMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-error-600 text-white hover:bg-error-700 disabled:opacity-50"
                >
                  Reject withdrawal
                </button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
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
