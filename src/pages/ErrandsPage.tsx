import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { useAdminOpsRealtimeStatus } from '@/context/AdminOpsRealtimeContext';
import {
  cancelAdminErrand,
  fetchAdminErrand,
  fetchAdminErrandOpsStats,
  fetchAdminErrands,
  forceAdminErrandStatus,
  reassignAdminErrand,
  refundAdminErrandEscrow,
} from '@/api/adminErrandsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  downloadCSV,
  formatBudgetRange,
  formatListedAmount,
  formatDateTime,
  formatErrandCode,
  formatNumber,
  partyDisplayName,
  titleCase,
} from '@/lib/utils';
import type { ErrandDetails, ErrandListItem } from '@/types/api';

const STATUS_OPTIONS = [
  'all',
  'pending',
  'searching',
  'accepted',
  'on_my_way',
  'arrived',
  'in_progress',
  'waiting_for_buyer',
  'completed',
  'delivered',
  'delayed',
  'cancelled',
  'cancelled_by_runner',
  'cancelled_by_buyer',
  'disputed',
] as const;

const FORCE_STATUSES = [
  'pending',
  'searching',
  'accepted',
  'on_my_way',
  'arrived',
  'in_progress',
  'waiting_for_buyer',
  'delayed',
  'completed',
  'cancelled',
  'disputed',
] as const;

type TypeFilter = 'all' | 'instant' | 'scheduled';
type ScopeFilter = 'all' | 'active' | 'stuck';
type InterveneMode = 'cancel' | 'reassign' | 'force-status' | null;

export function ErrandsPage() {
  const queryClient = useQueryClient();
  const { live } = useAdminOpsRealtimeStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>(
    searchParams.get('scope') === 'stuck' ? 'stuck' : searchParams.get('scope') === 'active' ? 'active' : 'all',
  );
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [intervene, setIntervene] = useState<InterveneMode>(null);
  const [reason, setReason] = useState('');
  const [runnerId, setRunnerId] = useState('');
  const [nextStatus, setNextStatus] = useState<string>('cancelled');
  const [refundEscrow, setRefundEscrow] = useState(true);

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
  }, [debouncedSearch, status, type, scope]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 25, page, scope };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status !== 'all') params.status = status;
    if (type !== 'all') params.type = type;
    return params;
  }, [debouncedSearch, status, type, page, scope]);

  const listQuery = useQuery({
    queryKey: queryKeys.errands.list(listParams),
    queryFn: () => fetchAdminErrands(listParams),
  });

  const opsStatsQuery = useQuery({
    queryKey: queryKeys.errands.opsStats,
    queryFn: fetchAdminErrandOpsStats,
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.errands.detail(selectedId ?? 0),
    queryFn: () => fetchAdminErrand(selectedId!),
    enabled: selectedId !== null,
  });

  const errands = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const detail = detailQuery.data;
  const escrow = detail?.escrow_payment ?? detail?.escrowPayment ?? null;
  const ops = opsStatsQuery.data;

  const invalidateErrands = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.errands.all }),
      selectedId != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.errands.detail(selectedId) })
        : Promise.resolve(),
    ]);
  };

  const refundEscrowMutation = useMutation({
    mutationFn: async () => {
      if (selectedId == null) throw new Error('No errand selected.');
      return refundAdminErrandEscrow(selectedId);
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateErrands();
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Failed to refund escrow.')),
  });

  const interveneMutation = useMutation({
    mutationFn: async () => {
      if (selectedId == null) throw new Error('No errand selected.');
      const trimmed = reason.trim();
      if (trimmed.length < 8) throw new Error('Provide a reason of at least 8 characters.');
      if (intervene === 'cancel') {
        return cancelAdminErrand(selectedId, { reason: trimmed, refund_escrow: refundEscrow });
      }
      if (intervene === 'reassign') {
        const id = Number(runnerId);
        if (!Number.isFinite(id) || id <= 0) throw new Error('Enter a valid runner user ID.');
        return reassignAdminErrand(selectedId, { runner_id: id, reason: trimmed });
      }
      return forceAdminErrandStatus(selectedId, {
        status: nextStatus,
        reason: trimmed,
        refund_escrow: nextStatus === 'cancelled' ? refundEscrow : false,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      setIntervene(null);
      setReason('');
      setRunnerId('');
      await invalidateErrands();
    },
    onError: (err) => setActionError(getApiErrorMessage(err, 'Intervention failed.')),
  });

  const setScopeFilter = (next: ScopeFilter) => {
    setScope(next);
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      if (next === 'all') nextParams.delete('scope');
      else nextParams.set('scope', next);
      return nextParams;
    });
  };

  const columns: Column<ErrandListItem>[] = [
    {
      key: 'id',
      header: 'Code',
      render: (row) => (
        <span className="font-semibold text-ink-900 font-mono text-xs">{formatErrandCode(row.id)}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="font-medium text-ink-900 truncate">{row.title || 'Untitled'}</p>
          <p className="text-xs text-ink-400 truncate">{row.category || row.type}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (row) => <span className="text-ink-600">{partyDisplayName(row.buyer) || '—'}</span>,
    },
    {
      key: 'runner',
      header: 'Runner',
      render: (row) => <span className="text-ink-600">{partyDisplayName(row.runner) || 'Unassigned'}</span>,
    },
    {
      key: 'budget_max',
      header: 'Budget',
      render: (row) => (
        <span className="font-semibold text-ink-900">
          {formatListedAmount(row)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge status={row.status} />
          {row.is_stuck ? <span className="text-[10px] font-semibold uppercase text-warning-700">Stuck</span> : null}
        </div>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      render: (row) => (
        <span className="text-ink-400 text-xs">{formatDateTime(row.updated_at || row.created_at)}</span>
      ),
    },
  ];

  const handleExport = () => {
    downloadCSV(
      errands.map((e) => ({
        code: formatErrandCode(e.id),
        id: e.id,
        title: e.title,
        status: e.status,
        type: e.type,
        buyer: partyDisplayName(e.buyer),
        runner: partyDisplayName(e.runner),
        stuck: e.is_stuck ? 'yes' : 'no',
        created_at: e.created_at,
        updated_at: e.updated_at,
      })),
      'errands.csv',
    );
  };

  return (
    <div>
      <PageHeader
        title="Errands"
        subtitle={`${formatNumber(ops?.active ?? 0)} in-flight · ${formatNumber(ops?.stuck ?? 0)} stuck`}
        action={
          <>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                live
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-ink-50 text-ink-500 ring-1 ring-ink-200'
              }`}
              title={live ? 'Listening for live errand status updates' : 'Realtime disconnected'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400'}`}
              />
              {live ? 'Live' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={() => void Promise.all([listQuery.refetch(), opsStatsQuery.refetch()])}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active" value={formatNumber(ops?.active ?? 0)} icon={<Filter className="w-5 h-5" />} />
        <StatCard label="Stuck (>2h)" value={formatNumber(ops?.stuck ?? 0)} icon={<AlertCircle className="w-5 h-5" />} accent="warning" />
        <StatCard label="Unassigned" value={formatNumber(ops?.unassigned ?? 0)} icon={<Filter className="w-5 h-5" />} accent="warning" />
        <StatCard label="In progress" value={formatNumber(ops?.in_progress ?? 0)} icon={<Filter className="w-5 h-5" />} accent="brand" />
        <StatCard label="Disputed" value={formatNumber(ops?.disputed ?? 0)} icon={<AlertCircle className="w-5 h-5" />} accent="error" />
      </div>

      <div className="flex gap-1 p-1 mb-4 rounded-xl bg-ink-100 w-fit">
        {(['all', 'active', 'stuck'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setScopeFilter(item)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scope === item ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {item === 'all' ? 'All errands' : item === 'active' ? 'Active ops' : 'Stuck'}
          </button>
        ))}
      </div>

      {listQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load errands</p>
            <p className="mt-1">{getApiErrorMessage(listQuery.error, 'API request failed.')}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, id, location, buyer, runner…"
          className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
            className="px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-sm"
          >
            <option value="all">All types</option>
            <option value="instant">Instant</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin flex-1">
            <Filter className="w-4 h-4 text-ink-400 flex-shrink-0" />
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatus(opt)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  status === opt
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                {opt === 'all' ? 'All' : titleCase(opt)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={errands}
          loading={listQuery.isLoading}
          onRowClick={(row) =>
            setSearchParams((params) => {
              const next = new URLSearchParams(params);
              next.set('open', String(row.id));
              return next;
            })
          }
          emptyMessage="No errands found"
          page={page}
          pageSize={25}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={selectedId !== null}
        onClose={() => {
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.delete('open');
            return next;
          });
          setIntervene(null);
          setActionError(null);
        }}
        title="Errand details"
        size="lg"
      >
        {actionError ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{actionError}</p>
          </div>
        ) : null}
        {detailQuery.isLoading ? (
          <p className="text-sm text-ink-400">Loading errand…</p>
        ) : detailQuery.isError || !detail ? (
          <p className="text-sm text-error-600">
            {getApiErrorMessage(detailQuery.error, 'Could not load errand details.')}
          </p>
        ) : (
          <ErrandDetailBody
            detail={detail}
            escrow={escrow}
            refunding={refundEscrowMutation.isPending}
            intervening={interveneMutation.isPending}
            intervene={intervene}
            reason={reason}
            runnerId={runnerId}
            nextStatus={nextStatus}
            refundEscrow={refundEscrow}
            onRefundEscrow={() => {
              if (!escrow || selectedId == null) return;
              if (!window.confirm('Refund the held escrow for this errand?')) return;
              setActionError(null);
              refundEscrowMutation.mutate();
            }}
            onStartIntervene={setIntervene}
            onReasonChange={setReason}
            onRunnerIdChange={setRunnerId}
            onNextStatusChange={setNextStatus}
            onRefundEscrowChange={setRefundEscrow}
            onSubmitIntervene={() => {
              setActionError(null);
              interveneMutation.mutate();
            }}
            onCancelIntervene={() => {
              setIntervene(null);
              setReason('');
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ErrandDetailBody({
  detail,
  escrow,
  refunding,
  intervening,
  intervene,
  reason,
  runnerId,
  nextStatus,
  refundEscrow,
  onRefundEscrow,
  onStartIntervene,
  onReasonChange,
  onRunnerIdChange,
  onNextStatusChange,
  onRefundEscrowChange,
  onSubmitIntervene,
  onCancelIntervene,
}: {
  detail: ErrandDetails;
  escrow: ErrandDetails['escrow_payment'];
  refunding: boolean;
  intervening: boolean;
  intervene: InterveneMode;
  reason: string;
  runnerId: string;
  nextStatus: string;
  refundEscrow: boolean;
  onRefundEscrow: () => void;
  onStartIntervene: (mode: InterveneMode) => void;
  onReasonChange: (value: string) => void;
  onRunnerIdChange: (value: string) => void;
  onNextStatusChange: (value: string) => void;
  onRefundEscrowChange: (value: boolean) => void;
  onSubmitIntervene: () => void;
  onCancelIntervene: () => void;
}) {
  const canRefundEscrow = Boolean(
    escrow &&
      !escrow.refunded_at &&
      ['held', 'pending', 'authorized', 'captured'].includes(String(escrow.status).toLowerCase()),
  );
  const canIntervene = Boolean(detail.can_intervene);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-mono text-ink-400">{formatErrandCode(detail.id)}</p>
          <h3 className="text-lg font-bold text-ink-900">{detail.title || 'Untitled errand'}</h3>
          <p className="text-sm text-ink-400">{formatDateTime(detail.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge status={detail.status} />
          {detail.is_stuck ? <Badge status="delayed" label="Stuck" /> : null}
        </div>
      </div>

      {detail.description ? (
        <p className="text-sm text-ink-700 whitespace-pre-wrap">{detail.description}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Info label="Buyer" value={partyDisplayName(detail.buyer) || '—'} />
        <Info label="Runner" value={partyDisplayName(detail.runner) || 'Unassigned'} />
        <Info label="Category" value={detail.category || '—'} />
        <Info label="Budget" value={formatListedAmount(detail)} />
        <Info label="Pickup" value={detail.pickup_address || '—'} />
        <Info label="Drop-off" value={detail.dropoff_address || '—'} />
        <Info label="Updated" value={detail.updated_at ? formatDateTime(detail.updated_at) : '—'} />
        <Info
          label="Escrow"
          value={escrow ? `${formatBudgetRange(escrow.amount, escrow.amount)} · ${titleCase(escrow.status)}` : '—'}
        />
      </div>

      {canIntervene ? (
        <div className="p-4 rounded-xl border border-ink-100 space-y-3">
          <p className="text-sm font-semibold text-ink-900">Ops intervention</p>
          {intervene == null ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onStartIntervene('cancel')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-error-200 text-error-700 hover:bg-error-50"
              >
                Cancel errand
              </button>
              <button
                type="button"
                onClick={() => onStartIntervene('reassign')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50"
              >
                Reassign runner
              </button>
              <button
                type="button"
                onClick={() => onStartIntervene('force-status')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50"
              >
                Force status
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {intervene === 'reassign' ? (
                <input
                  type="number"
                  min="1"
                  value={runnerId}
                  onChange={(e) => onRunnerIdChange(e.target.value)}
                  placeholder="New runner user ID"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
                />
              ) : null}
              {intervene === 'force-status' ? (
                <select
                  value={nextStatus}
                  onChange={(e) => onNextStatusChange(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
                >
                  {FORCE_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {titleCase(item)}
                    </option>
                  ))}
                </select>
              ) : null}
              {(intervene === 'cancel' || nextStatus === 'cancelled') && canRefundEscrow ? (
                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={refundEscrow}
                    onChange={(e) => onRefundEscrowChange(e.target.checked)}
                  />
                  Refund held escrow to buyer
                </label>
              ) : null}
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={3}
                placeholder="Audit reason (required)"
                className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={intervening}
                  onClick={onCancelIntervene}
                  className="px-3 py-1.5 rounded-lg text-sm border border-ink-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={intervening}
                  onClick={onSubmitIntervene}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white disabled:opacity-50"
                >
                  {intervening ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {detail.interventions && detail.interventions.length > 0 ? (
        <div className="p-4 rounded-xl bg-ink-50 space-y-2">
          <p className="text-sm font-semibold text-ink-900">Admin timeline</p>
          {detail.interventions.slice().reverse().map((item, index) => (
            <p key={`${item.at}-${index}`} className="text-xs text-ink-600">
              {formatDateTime(item.at)} · {item.admin_name || `Admin #${item.admin_id}`} · {titleCase(item.action)}
              {item.from != null ? ` (${String(item.from)} → ${String(item.to ?? '')})` : ''} · {item.reason}
            </p>
          ))}
        </div>
      ) : null}

      {detail.dispute ? (
        <div className="p-4 rounded-xl border border-warning-200 bg-warning-50/50 space-y-1">
          <p className="text-sm font-semibold text-ink-900">Dispute · {titleCase(detail.dispute.status)}</p>
          <p className="text-sm text-ink-700">{detail.dispute.reason || 'No reason provided'}</p>
          {canRefundEscrow ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRefundEscrow}
                disabled={refunding}
                className="inline-flex items-center gap-2 rounded-lg border border-warning-300 bg-white px-3 py-2 text-sm font-medium text-warning-800 hover:bg-warning-50 disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                {refunding ? 'Refunding…' : 'Refund held escrow'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {detail.proof ? (
        <div className="p-4 rounded-xl bg-ink-50 space-y-2">
          <p className="text-sm font-semibold text-ink-900">Proof · {titleCase(detail.proof.status)}</p>
          {detail.proof.notes ? <p className="text-sm text-ink-700">{detail.proof.notes}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-ink-50">
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink-900 break-words">{value}</p>
    </div>
  );
}
