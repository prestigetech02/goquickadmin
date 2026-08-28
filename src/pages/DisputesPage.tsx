import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Scale,
  Search,
} from 'lucide-react';
import { fetchDashboardStats } from '@/api/adminDashboardApi';
import {
  fetchAdminDispute,
  fetchAdminDisputes,
  resolveAdminDispute,
  type DisputeListItem,
} from '@/api/adminDisputesApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  formatDateTime,
  formatErrandCode,
  formatNumber,
  partyDisplayName,
  titleCase,
} from '@/lib/utils';

type DisputeStatusFilter = 'all' | 'open' | 'under_review' | 'resolved' | 'closed';
type DisputeTypeFilter = 'all' | 'payment' | 'service' | 'other';
type ResolveStatus = 'resolved' | 'closed';
type ErrandStatusOption =
  | 'none'
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'cancelled_by_buyer'
  | 'cancelled_by_runner';

function disputeRaisedByName(dispute: DisputeListItem): string {
  return partyDisplayName(dispute.raisedBy) || (dispute.raised_by ? `User #${dispute.raised_by}` : 'Unknown');
}

function disputeErrandLabel(dispute: DisputeListItem): string {
  if (dispute.errand?.title) return dispute.errand.title;
  if (dispute.errand_id) return formatErrandCode(dispute.errand_id);
  return 'No errand linked';
}

function isResolvable(status: string): boolean {
  return status !== 'resolved' && status !== 'closed';
}

export function DisputesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<DisputeStatusFilter>('all');
  const [type, setType] = useState<DisputeTypeFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('resolved');
  const [errandStatus, setErrandStatus] = useState<ErrandStatusOption>('none');
  const [refundEscrow, setRefundEscrow] = useState(false);
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
  }, [debouncedSearch, status, type]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 25, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status !== 'all') params.status = status;
    if (type !== 'all') params.type = type;
    return params;
  }, [debouncedSearch, status, type, page]);

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: fetchDashboardStats,
  });

  const disputesQuery = useQuery({
    queryKey: queryKeys.disputes.list(listParams),
    queryFn: () => fetchAdminDisputes(listParams),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.disputes.detail(selectedId ?? 0),
    queryFn: () => fetchAdminDispute(selectedId!),
    enabled: selectedId !== null,
  });

  const invalidateDisputes = async (id?: number | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats }),
      id != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(id) })
        : Promise.resolve(),
    ]);
  };

  const resolveMutation = useMutation({
    mutationFn: async (input: { id: number; resolution: string; status: ResolveStatus; errandStatus: ErrandStatusOption; refundEscrow: boolean }) =>
      resolveAdminDispute(input.id, {
        resolution: input.resolution,
        status: input.status,
        errand_status: input.errandStatus === 'none' ? null : input.errandStatus,
        refund_escrow: input.refundEscrow,
      }),
    onSuccess: async (_data, variables) => {
      setActionError(null);
      setResolvingId(null);
      setResolution('');
      setResolveStatus('resolved');
      setErrandStatus('none');
      setRefundEscrow(false);
      await invalidateDisputes(variables.id);
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to resolve dispute.'));
    },
  });

  const disputes = disputesQuery.data?.data ?? [];
  const total = disputesQuery.data?.total ?? 0;
  const detail = detailQuery.data;
  const openOnPage = disputes.filter((d) => d.status === 'open').length;
  const reviewOnPage = disputes.filter((d) => d.status === 'under_review').length;
  const resolvedOnPage = disputes.filter((d) => d.status === 'resolved' || d.status === 'closed').length;

  const openResolveModal = (id: number) => {
    setActionError(null);
    setResolvingId(id);
    setResolution('');
    setResolveStatus('resolved');
    setErrandStatus('none');
    setRefundEscrow(false);
  };

  const submitResolve = () => {
    if (resolvingId == null) return;
    if (!resolution.trim()) {
      setActionError('Resolution note is required.');
      return;
    }
    if (!window.confirm('Confirm resolution and apply updates to this dispute?')) return;
    setActionError(null);
    resolveMutation.mutate({
      id: resolvingId,
      resolution: resolution.trim(),
      status: resolveStatus,
      errandStatus,
      refundEscrow,
    });
  };

  return (
    <div>
      <PageHeader
        title="Disputes"
        subtitle={`${formatNumber(total)} disputes matching filters`}
        action={
          <button
            type="button"
            onClick={() => void disputesQuery.refetch()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${disputesQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active disputes"
          value={formatNumber(statsQuery.data?.operations.open_disputes ?? 0)}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="error"
        />
        <StatCard
          label="Open on page"
          value={formatNumber(openOnPage)}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Under review on page"
          value={formatNumber(reviewOnPage)}
          icon={<Clock className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Resolved on page"
          value={formatNumber(resolvedOnPage)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
      </div>

      {disputesQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load disputes</p>
            <p className="mt-1">
              {getApiErrorMessage(
                disputesQuery.error,
                'Check that the API is running and you have operations module access.',
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

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reason, errand title, or ID…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DisputeStatusFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DisputeTypeFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="payment">Payment</option>
          <option value="service">Service</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', 'open', 'under_review', 'resolved', 'closed'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setStatus(opt)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === opt
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
            }`}
          >
            {opt === 'under_review' ? 'Under review' : titleCase(opt.replace(/_/g, ' '))}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disputesQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-24 bg-ink-100 rounded-xl animate-pulse" />
            </Card>
          ))
        ) : disputes.length === 0 ? (
          <Card className="p-12 text-center col-span-2">
            <Scale className="w-10 h-10 text-ink-300 mx-auto mb-2" />
            <p className="text-ink-400">No disputes found</p>
          </Card>
        ) : (
          disputes.map((dispute) => (
            <Card key={dispute.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div
                onClick={() =>
                  setSearchParams((params) => {
                    const next = new URLSearchParams(params);
                    next.set('open', String(dispute.id));
                    return next;
                  })
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSearchParams((params) => {
                      const next = new URLSearchParams(params);
                      next.set('open', String(dispute.id));
                      return next;
                    });
                  }
                }}
              >
                <CardBody>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-error-50 text-error-600 flex items-center justify-center flex-shrink-0">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900 text-sm truncate">
                          {disputeRaisedByName(dispute)}
                        </p>
                        <p className="text-xs text-ink-400 capitalize truncate">
                          {titleCase(dispute.type.replace(/_/g, ' '))} · #{dispute.id}
                        </p>
                      </div>
                    </div>
                    <Badge
                      status={dispute.status}
                      label={titleCase(dispute.status.replace(/_/g, ' '))}
                    />
                  </div>
                  <p className="text-sm text-ink-600 line-clamp-2">
                    {dispute.reason || 'No reason provided'}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 gap-2">
                    <span className="text-xs text-ink-400 truncate">{disputeErrandLabel(dispute)}</span>
                    <span className="text-xs text-ink-400 flex-shrink-0">
                      {formatDateTime(dispute.created_at)}
                    </span>
                  </div>
                  {isResolvable(dispute.status) ? (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openResolveModal(dispute.id)}
                        className="w-full py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  ) : null}
                </CardBody>
              </div>
            </Card>
          ))
        )}
      </div>

      {disputesQuery.data && disputesQuery.data.last_page > 1 ? (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-ink-500">
            Page {disputesQuery.data.current_page} of {disputesQuery.data.last_page}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disputesQuery.data.current_page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-4 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={disputesQuery.data.current_page >= disputesQuery.data.last_page}
              onClick={() => setPage((p) => Math.min(p + 1, disputesQuery.data!.last_page))}
              className="px-4 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={selectedId !== null}
        onClose={() =>
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.delete('open');
            return next;
          })
        }
        title="Dispute details"
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
            {getApiErrorMessage(detailQuery.error, 'Failed to load dispute details.')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink-900">{disputeRaisedByName(detail)}</h3>
                <p className="text-sm text-ink-400 capitalize">
                  {titleCase(detail.type.replace(/_/g, ' '))} · Dispute #{detail.id}
                </p>
              </div>
              <Badge status={detail.status} label={titleCase(detail.status.replace(/_/g, ' '))} />
            </div>

            <div className="p-4 rounded-xl bg-ink-50">
              <p className="text-xs text-ink-400 mb-1">Reason</p>
              <p className="text-sm text-ink-700">{detail.reason || 'No reason provided'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Errand" value={disputeErrandLabel(detail)} />
              <DetailField
                label="Errand status"
                value={detail.errand?.status ? titleCase(detail.errand.status.replace(/_/g, ' ')) : '—'}
              />
              <DetailField label="Raised by email" value={detail.raisedBy?.email || '—'} />
              <DetailField label="Raised by phone" value={detail.raisedBy?.phone || '—'} />
              <DetailField label="Filed" value={formatDateTime(detail.created_at)} />
              <DetailField
                label="Resolved"
                value={detail.resolved_at ? formatDateTime(detail.resolved_at) : '—'}
              />
              <DetailField
                label="Resolved by"
                value={partyDisplayName(detail.resolvedBy) || '—'}
                className="col-span-2"
              />
            </div>

            {detail.resolution ? (
              <div className="p-4 rounded-xl bg-success-50">
                <p className="text-xs text-success-600 mb-1">Resolution</p>
                <p className="text-sm text-ink-700">{detail.resolution}</p>
              </div>
            ) : null}

            {isResolvable(detail.status) ? (
              <button
                type="button"
                onClick={() => {
                  setSearchParams((params) => {
                    const next = new URLSearchParams(params);
                    next.delete('open');
                    return next;
                  });
                  openResolveModal(detail.id);
                }}
                className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                Resolve dispute
              </button>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        open={resolvingId !== null}
        onClose={() => {
          if (resolveMutation.isPending) return;
          setResolvingId(null);
          setResolution('');
        }}
        title="Resolve dispute"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Document your decision. You can optionally update the linked errand status or refund held escrow.
          </p>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Resolution note</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe your decision and outcome…"
              rows={4}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Dispute status</label>
            <select
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value as ResolveStatus)}
              className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white"
            >
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Errand status (optional)</label>
            <select
              value={errandStatus}
              onChange={(e) => setErrandStatus(e.target.value as ErrandStatusOption)}
              className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white"
            >
              <option value="none">No change</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
              <option value="cancelled_by_buyer">Cancelled by buyer</option>
              <option value="cancelled_by_runner">Cancelled by runner</option>
            </select>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-200 cursor-pointer">
            <input
              type="checkbox"
              checked={refundEscrow}
              onChange={(e) => setRefundEscrow(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-ink-700">
              Refund held escrow to buyer (only applies when escrow is still held)
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResolvingId(null);
                setResolution('');
              }}
              disabled={resolveMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitResolve}
              disabled={resolveMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Resolve dispute
            </button>
          </div>
        </div>
      </Modal>
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
