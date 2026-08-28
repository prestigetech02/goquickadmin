import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bike,
  Download,
  RefreshCw,
  Star,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import {
  fetchAdminRunner,
  fetchAdminRunnerEarnings,
  fetchAdminRunners,
  fetchRunnerMetrics,
  reactivateAdminRunner,
  resetAdminRunnerPassword,
  suspendAdminRunner,
} from '@/api/adminRunnersApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  downloadCSV,
  formatCurrency,
  formatDate,
  formatNumber,
} from '@/lib/utils';
import type { RunnerListItem, RunnerProfile } from '@/types/api';

type StatusFilter = 'all' | 'active' | 'inactive' | 'suspended';
type VerificationFilter = 'all' | 'pending' | 'verified' | 'rejected';

function runnerDisplayName(runner: Pick<RunnerProfile, 'first_name' | 'last_name' | 'email'> | null | undefined) {
  if (!runner) return 'Runner';
  const name = [runner.first_name, runner.last_name].filter(Boolean).join(' ').trim();
  return name || runner.email || 'Runner';
}

export function RunnersPage() {
  const queryClient = useQueryClient();
  const navigate = useAdminNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [verification, setVerification] = useState<VerificationFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
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
  }, [debouncedSearch, status, verification]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 25, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status !== 'all') params.status = status;
    if (verification !== 'all') params.verification = verification;
    return params;
  }, [debouncedSearch, status, verification, page]);

  const metricsQuery = useQuery({
    queryKey: queryKeys.runners.metrics,
    queryFn: fetchRunnerMetrics,
  });

  const runnersQuery = useQuery({
    queryKey: queryKeys.runners.list(listParams),
    queryFn: () => fetchAdminRunners(listParams),
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.runners.detail(selectedId ?? 0),
    queryFn: () => fetchAdminRunner(selectedId!),
    enabled: selectedId !== null,
  });

  const earningsQuery = useQuery({
    queryKey: queryKeys.runners.earnings(selectedId ?? 0),
    queryFn: () => fetchAdminRunnerEarnings(selectedId!),
    enabled: selectedId !== null,
  });

  const invalidateRunnerQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.runners.all }),
      selectedId != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.runners.detail(selectedId) })
        : Promise.resolve(),
      selectedId != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.runners.earnings(selectedId) })
        : Promise.resolve(),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async (action: 'suspend' | 'reactivate' | 'reset-password') => {
      if (selectedId == null) throw new Error('No runner selected');
      if (action === 'suspend') return suspendAdminRunner(selectedId);
      if (action === 'reactivate') return reactivateAdminRunner(selectedId);
      return resetAdminRunnerPassword(selectedId);
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateRunnerQueries();
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Action failed.'));
    },
  });

  const runners = runnersQuery.data?.data ?? [];
  const total = runnersQuery.data?.total ?? 0;
  const metrics = metricsQuery.data;
  const profile = profileQuery.data;

  const columns: Column<RunnerListItem>[] = [
    {
      key: 'runner_name',
      header: 'Runner',
      render: (row) => (
        <div className="flex items-center gap-3">
          <PersonAvatar name={row.runner_name || '?'} src={row.avatar_url} />
          <div>
            <p className="font-semibold text-ink-900">{row.runner_name || '—'}</p>
            <p className="text-xs text-ink-400">{row.phone || 'No phone'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-warning-500 fill-warning-500" />
          <span className="font-medium text-ink-700">{Number(row.rating || 0).toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'completion_rate',
      header: 'Completion',
      render: (row) => <span className="font-medium text-ink-800">{Math.round(row.completion_rate || 0)}%</span>,
    },
    {
      key: 'total_earnings',
      header: 'Earnings',
      render: (row) => (
        <span className="font-semibold text-ink-900">{formatCurrency(row.total_earnings || 0)}</span>
      ),
    },
    {
      key: 'verification',
      header: 'KYC',
      render: (row) => <Badge status={row.verification} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'joined_date',
      header: 'Joined',
      render: (row) => (
        <span className="text-ink-500 text-xs">{row.joined_date ? formatDate(row.joined_date) : '—'}</span>
      ),
    },
  ];

  const handleExport = () => {
    downloadCSV(
      runners.map((r) => ({
        id: r.id,
        name: r.runner_name,
        phone: r.phone,
        status: r.status,
        verification: r.verification,
        rating: r.rating,
        completion_rate: r.completion_rate,
        total_earnings: r.total_earnings,
        joined_date: r.joined_date,
      })),
      'runners.csv',
    );
  };

  const runAction = (action: 'suspend' | 'reactivate' | 'reset-password', message: string) => {
    if (!window.confirm(message)) return;
    setActionError(null);
    actionMutation.mutate(action);
  };

  return (
    <div>
      <PageHeader
        title="Runners"
        subtitle={`${formatNumber(total)} runners matching filters`}
        action={
          <>
            <button
              type="button"
              onClick={() => {
                void runnersQuery.refetch();
                void metricsQuery.refetch();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${runnersQuery.isFetching ? 'animate-spin' : ''}`} />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total runners"
          value={formatNumber(metrics?.total_runners ?? 0)}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Verified"
          value={formatNumber(metrics?.verified_runners ?? 0)}
          icon={<UserCheck className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Active today"
          value={formatNumber(metrics?.active_today ?? 0)}
          icon={<Bike className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Suspended"
          value={formatNumber(metrics?.suspended_runners ?? 0)}
          icon={<UserX className="w-5 h-5" />}
          accent="error"
        />
      </div>

      {(metricsQuery.isError || runnersQuery.isError) && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load runners</p>
            <p className="mt-1">
              {getApiErrorMessage(
                runnersQuery.error || metricsQuery.error,
                'Check that the API is running and you have operations access.',
              )}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={verification}
          onChange={(e) => setVerification(e.target.value as VerificationFilter)}
          className="px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-sm"
        >
          <option value="all">All KYC</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={runners}
          loading={runnersQuery.isLoading}
          onRowClick={(row) => {
            setActionError(null);
            setSearchParams((params) => {
              const next = new URLSearchParams(params);
              next.set('open', String(row.id));
              return next;
            });
          }}
          emptyMessage="No runners found"
          page={page}
          pageSize={25}
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
        title="Runner details"
        size="lg"
      >
        {profileQuery.isLoading ? (
          <p className="text-sm text-ink-400">Loading profile…</p>
        ) : profileQuery.isError || !profile ? (
          <p className="text-sm text-error-600">
            {getApiErrorMessage(profileQuery.error, 'Could not load runner profile.')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <PersonAvatar
                name={runnerDisplayName(profile)}
                src={profile.avatar_url}
                size="lg"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-ink-900">{runnerDisplayName(profile)}</h3>
                <p className="text-sm text-ink-400 truncate">{profile.email || '—'}</p>
                <p className="text-sm text-ink-400">{profile.phone || '—'}</p>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <Badge status={profile.is_suspended ? 'suspended' : profile.is_online ? 'online' : 'offline'} />
                <Badge status={profile.verification} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Info label="City" value={profile.city || '—'} />
              <Info label="State" value={profile.state || '—'} />
              <Info label="Rating" value={`${Number(profile.rating || 0).toFixed(1)} / 5`} />
              <Info label="Completion" value={`${Math.round(profile.completion_rate || 0)}%`} />
              <Info label="Joined" value={profile.joined_date ? formatDate(profile.joined_date) : '—'} />
              <Info
                label="Earnings (total)"
                value={formatCurrency(earningsQuery.data?.summary.total_earnings ?? 0)}
              />
            </div>

            {profile.verification === 'pending' ? (
              <div className="rounded-xl border border-warning-200 bg-warning-50/50 p-4">
                <p className="text-sm font-semibold text-ink-900">Pending KYC review</p>
                <p className="mt-1 text-sm text-ink-700">
                  Verification approvals are handled from the dedicated Runner KYC queue so every decision keeps the review record and rejection notes together.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('kyc')}
                  className="mt-3 rounded-lg bg-warning-600 px-3 py-2 text-sm font-medium text-white hover:bg-warning-700"
                >
                  Open Runner KYC queue
                </button>
              </div>
            ) : null}

            {actionError ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {actionError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {profile.is_suspended ? (
                <button
                  type="button"
                  disabled={actionMutation.isPending}
                  onClick={() =>
                    runAction('reactivate', `Reactivate ${runnerDisplayName(profile)}?`)
                  }
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
                >
                  Reactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionMutation.isPending}
                  onClick={() =>
                    runAction('suspend', `Suspend ${runnerDisplayName(profile)}? They will not be able to accept jobs.`)
                  }
                  className="px-4 py-2 rounded-xl bg-error-500 text-white text-sm font-semibold hover:bg-error-600 disabled:opacity-60"
                >
                  Suspend
                </button>
              )}
              <button
                type="button"
                disabled={actionMutation.isPending}
                onClick={() =>
                  runAction(
                    'reset-password',
                    `Send a password reset for ${runnerDisplayName(profile)}?`,
                  )
                }
                className="px-4 py-2 rounded-xl border border-ink-200 text-ink-700 text-sm font-semibold hover:bg-ink-50 disabled:opacity-60"
              >
                Reset password
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-ink-50">
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
