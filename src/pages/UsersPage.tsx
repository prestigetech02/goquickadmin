import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  fetchAdminUser,
  fetchAdminUsers,
  reactivateAdminUser,
  suspendAdminUser,
} from '@/api/adminUsersApi';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
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
  formatDate,
  formatNumber,
  titleCase,
} from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { UserWalletPanel } from '@/components/payments/UserWalletPanel';
import type { UserListItem } from '@/types/api';

type RoleFilter = 'all' | 'admin' | 'buyer' | 'runner';

function userDisplayName(user: Pick<UserListItem, 'first_name' | 'last_name' | 'name' | 'id'>) {
  const fromParts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;
  if (user.name?.trim()) return user.name.trim();
  return `User #${user.id}`;
}

export function UsersPage() {
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
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
  }, [debouncedSearch, role]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 25, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (role !== 'all') params.role = role;
    return params;
  }, [debouncedSearch, role, page]);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(listParams),
    queryFn: () => fetchAdminUsers(listParams),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.users.detail(selectedId ?? 0),
    queryFn: () => fetchAdminUser(selectedId!),
    enabled: selectedId !== null,
  });

  const invalidateUserQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      selectedId != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(selectedId) })
        : Promise.resolve(),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async (action: 'suspend' | 'reactivate') => {
      if (selectedId == null) throw new Error('No user selected');
      if (action === 'suspend') return suspendAdminUser(selectedId);
      return reactivateAdminUser(selectedId);
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateUserQueries();
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Action failed.'));
    },
  });

  const users = usersQuery.data?.data ?? [];
  const total = usersQuery.data?.total ?? 0;
  const detail = detailQuery.data;
  const activeOnPage = users.filter((u) => !u.is_suspended).length;
  const suspendedOnPage = users.filter((u) => u.is_suspended).length;
  const onlineOnPage = users.filter((u) => u.is_online).length;

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <PersonAvatar
            name={userDisplayName(row)}
            src={row.avatar_url}
            className={row.is_online ? 'ring-2 ring-success-200' : ''}
          />
          <div>
            <p className="font-semibold text-ink-900">{userDisplayName(row)}</p>
            <p className="text-xs text-ink-400">
              {[row.email, row.phone].filter(Boolean).join(' · ') || `ID #${row.id}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge status={row.role} label={titleCase(row.role)} />,
    },
    {
      key: 'errands',
      header: 'Errands',
      render: (row) => (
        <div className="text-xs text-ink-600">
          <span>
            Buyer <strong className="text-ink-900">{formatNumber(row.errands_as_buyer_count)}</strong>
          </span>
          <span className="mx-2 text-ink-300">·</span>
          <span>
            Runner <strong className="text-ink-900">{formatNumber(row.errands_as_runner_count)}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row) => <span className="text-ink-500 text-xs">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge status={row.is_suspended ? 'suspended' : 'active'} />
          <span className="text-[11px] text-ink-400">{row.is_online ? 'Online' : 'Offline'}</span>
        </div>
      ),
    },
  ];

  const handleExport = () => {
    downloadCSV(
      users.map((u) => ({
        id: u.id,
        name: userDisplayName(u),
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.is_suspended ? 'suspended' : 'active',
        online: u.is_online ? 'yes' : 'no',
        buyer_errands: u.errands_as_buyer_count,
        runner_errands: u.errands_as_runner_count,
        joined: u.created_at,
      })),
      'users.csv',
    );
  };

  const runAction = (action: 'suspend' | 'reactivate', message: string) => {
    if (!detail || detail.role === 'admin') return;
    if (!window.confirm(message)) return;
    setActionError(null);
    actionMutation.mutate(action);
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${formatNumber(total)} accounts matching filters`}
        action={
          <>
            <button
              type="button"
              onClick={() => void usersQuery.refetch()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${usersQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={users.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total accounts"
          value={formatNumber(total)}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Active on page"
          value={formatNumber(activeOnPage)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Suspended on page"
          value={formatNumber(suspendedOnPage)}
          icon={<Ban className="w-5 h-5" />}
          accent="error"
        />
        <StatCard
          label="Online on page"
          value={formatNumber(onlineOnPage)}
          icon={<UserCheck className="w-5 h-5" />}
          accent="brand"
        />
      </div>

      {usersQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load users</p>
            <p className="mt-1">
              {getApiErrorMessage(usersQuery.error, 'Check that the API is running and you have operations access.')}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or phone…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="buyer">Buyers</option>
          <option value="runner">Runners</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={users}
          loading={usersQuery.isPending}
          onRowClick={(row) => {
            setSearchParams((params) => {
              const next = new URLSearchParams(params);
              next.set('open', String(row.id));
              return next;
            });
            setActionError(null);
          }}
          emptyMessage="No users found"
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
          setActionError(null);
        }}
        title="User details"
        size="lg"
      >
        {detailQuery.isPending ? <p className="text-ink-400 text-sm">Loading user…</p> : null}
        {detailQuery.isError ? (
          <p className="text-error-600 text-sm">
            {getApiErrorMessage(detailQuery.error, 'Failed to load user details.')}
          </p>
        ) : null}

        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <PersonAvatar
                name={userDisplayName(detail)}
                src={detail.avatar_url}
                size="md"
                className={detail.is_online ? 'ring-2 ring-success-200' : ''}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-ink-900">{userDisplayName(detail)}</h3>
                <p className="text-sm text-ink-400 truncate">{detail.email || 'No email'}</p>
                <p className="text-sm text-ink-400">{detail.phone || 'No phone'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge status={detail.role} label={titleCase(detail.role)} />
                <Badge status={detail.is_suspended ? 'suspended' : 'active'} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailTile label="User ID" value={`#${detail.id}`} />
              <DetailTile
                label="Presence"
                value={detail.is_online ? 'Online' : 'Offline'}
              />
              <DetailTile
                label="Phone verified"
                value={detail.phone_verified ? 'Yes' : 'No'}
              />
              <DetailTile
                label="Email verified"
                value={detail.email_verified_at ? 'Yes' : 'No'}
              />
              <DetailTile
                label="Wallet balance"
                value={formatCurrency(detail.wallet_balance ?? 0)}
              />
              <DetailTile
                label="Buyer errands"
                value={formatNumber(detail.errands_as_buyer_count)}
              />
              <DetailTile
                label="Runner errands"
                value={formatNumber(detail.errands_as_runner_count)}
              />
              <DetailTile label="Joined" value={formatDate(detail.created_at)} />
              <DetailTile
                label="Suspended at"
                value={detail.suspended_at ? formatDate(detail.suspended_at) : '—'}
              />
              <DetailTile
                label="Available"
                value={detail.is_available ? 'Yes' : 'No'}
              />
            </div>

            <div className="p-4 rounded-xl border border-ink-100">
              <p className="text-sm font-semibold text-ink-900 mb-3">Wallet</p>
              <UserWalletPanel
                userId={detail.id}
                canAdjust={Boolean(adminUser?.permissions.is_super_admin || adminUser?.permissions.can_manage_finance)}
              />
            </div>

            {actionError ? (
              <p className="text-sm text-error-600">{actionError}</p>
            ) : null}

            {detail.role !== 'admin' ? (
              <div>
                <p className="text-sm font-medium text-ink-700 mb-2">Account actions</p>
                <div className="flex flex-wrap gap-2">
                  {detail.is_suspended ? (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        runAction('reactivate', 'Activate this account and restore access?')
                      }
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-success-50 text-success-700 hover:bg-success-100 transition-colors disabled:opacity-60"
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        runAction('suspend', 'Suspend this account from using the platform?')
                      }
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-error-50 text-error-700 hover:bg-error-100 transition-colors disabled:opacity-60"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-ink-50 text-ink-600 text-sm">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Admin accounts are managed separately and cannot be suspended here.</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50">
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
