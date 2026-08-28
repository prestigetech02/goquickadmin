import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCog,
  UserMinus,
} from 'lucide-react';
import {
  createAdminAccount,
  fetchAdminAccounts,
  removeAdminAccess,
  resendAdminCredentials,
  updateAdminModules,
  type AdminAccountItem,
} from '@/api/adminAdminsApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { ADMIN_MODULE_OPTIONS } from '@/lib/adminAccess';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatDate, titleCase } from '@/lib/utils';
import type { AdminModule } from '@/types';

function adminAccountName(admin: AdminAccountItem): string {
  const fromParts = [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;
  if (admin.name?.trim()) return admin.name.trim();
  return admin.email || `Admin #${admin.id}`;
}

function adminAccountInitial(admin: AdminAccountItem): string {
  const name = adminAccountName(admin);
  return name.charAt(0).toUpperCase() || '?';
}

function moduleLabels(modules: AdminModule[]): string {
  if (!modules.length) return 'None';
  return modules.map((key) => titleCase(key)).join(', ');
}

function roleBadgeStatus(admin: AdminAccountItem): 'verified' | 'active' | 'pending' {
  if (admin.is_super_admin) return 'verified';
  if (admin.must_change_password) return 'pending';
  return 'active';
}

function roleBadgeLabel(admin: AdminAccountItem): string {
  if (admin.is_super_admin) return 'Super Admin';
  return titleCase((admin.admin_role || 'admin').replace(/_/g, ' '));
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminAccountItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', modules: ['operations'] as AdminModule[] });
  const [editModules, setEditModules] = useState<AdminModule[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (selected) {
      setEditModules([...selected.admin_modules]);
    }
  }, [selected]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 25, page };
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [page, debouncedSearch]);

  const adminsQuery = useQuery({
    queryKey: queryKeys.admins.list(listParams),
    queryFn: () => fetchAdminAccounts(listParams),
  });

  const admins = adminsQuery.data?.admins ?? [];
  const meta = adminsQuery.data?.meta;

  const invalidateAdmins = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminAccount({
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        modules: newAdmin.modules,
        send_email: true,
      }),
    onSuccess: (result) => {
      invalidateAdmins();
      setShowAdd(false);
      setNewAdmin({ name: '', email: '', modules: ['operations'] });
      setActionError(null);
      setActionSuccess(
        result.email_sent
          ? 'Admin created. Login credentials were emailed.'
          : 'Admin created, but the credentials email could not be sent.',
      );
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to create admin account.'));
    },
  });

  const updateModulesMutation = useMutation({
    mutationFn: ({ id, modules }: { id: number; modules: AdminModule[] }) => updateAdminModules(id, modules),
    onSuccess: (admin) => {
      invalidateAdmins();
      setSelected(admin);
      setActionError(null);
      setActionSuccess('Admin modules updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update admin modules.'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => resendAdminCredentials(id),
    onSuccess: (result) => {
      invalidateAdmins();
      setSelected(result.admin);
      setActionError(null);
      setActionSuccess(
        result.email_sent
          ? 'New temporary credentials sent by email.'
          : 'Password reset, but email delivery failed.',
      );
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to resend credentials.'));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeAdminAccess(id),
    onSuccess: () => {
      invalidateAdmins();
      setSelected(null);
      setActionError(null);
      setActionSuccess('Admin access removed.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to remove admin access.'));
    },
  });

  const totalAdmins = meta?.total ?? admins.length;
  const superAdmins = admins.filter((a) => a.is_super_admin).length;
  const moduleAdmins = admins.filter((a) => !a.is_super_admin).length;
  const pendingPassword = admins.filter((a) => a.must_change_password).length;

  const toggleModule = (modules: AdminModule[], key: AdminModule, checked: boolean): AdminModule[] => {
    if (checked) return [...new Set([...modules, key])];
    return modules.filter((item) => item !== key);
  };

  const columns: Column<AdminAccountItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
            {adminAccountInitial(row)}
          </div>
          <div>
            <p className="font-semibold text-ink-900">{adminAccountName(row)}</p>
            <p className="text-xs text-ink-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge status={roleBadgeStatus(row)} label={roleBadgeLabel(row)} />,
    },
    {
      key: 'modules',
      header: 'Modules',
      render: (row) => (
        <span className="text-sm text-ink-600">
          {row.is_super_admin ? 'All modules' : moduleLabels(row.admin_modules)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row) => <span className="text-ink-400">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create admin accounts, assign modules, and manage access"
        action={
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setActionError(null);
              setActionSuccess(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <UserCog className="w-4 h-4" /> Add Admin
          </button>
        }
      />

      {actionError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Admins" value={String(totalAdmins)} icon={<UserCog className="w-5 h-5" />} accent="brand" />
        <StatCard label="Super Admins" value={String(superAdmins)} icon={<Shield className="w-5 h-5" />} accent="success" />
        <StatCard label="Module Admins" value={String(moduleAdmins)} icon={<CheckCircle2 className="w-5 h-5" />} accent="warning" />
        <StatCard label="Pending Password Change" value={String(pendingPassword)} icon={<KeyRound className="w-5 h-5" />} accent="brand" />
      </div>

      <Card className="mb-4">
        <div className="p-4 border-b border-ink-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admins by name or email..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="button"
            onClick={() => adminsQuery.refetch()}
            disabled={adminsQuery.isFetching}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${adminsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <DataTable
          columns={columns}
          data={admins}
          loading={adminsQuery.isLoading}
          onRowClick={(row) => {
            setSelected(row);
            setActionError(null);
            setActionSuccess(null);
          }}
          emptyMessage="No admin users found"
        />

        {meta && meta.last_page > 1 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100 text-sm text-ink-500">
            <span>
              Page {meta.current_page} of {meta.last_page} · {meta.total} admins
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Admin Details"
        subtitle={selected ? adminAccountName(selected) : undefined}
        width="lg"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">
                {adminAccountInitial(selected)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-900">{adminAccountName(selected)}</h3>
                <p className="text-sm text-ink-500">{selected.email}</p>
                <div className="mt-2">
                  <Badge status={roleBadgeStatus(selected)} label={roleBadgeLabel(selected)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-ink-50">
                <p className="text-xs text-ink-400 mb-1">Joined</p>
                <p className="text-sm font-semibold text-ink-900">{formatDate(selected.created_at)}</p>
              </div>
              <div className="p-4 rounded-xl bg-ink-50">
                <p className="text-xs text-ink-400 mb-1">Password status</p>
                <p className="text-sm font-semibold text-ink-900">
                  {selected.must_change_password ? 'Temporary password pending change' : 'Password set'}
                </p>
              </div>
            </div>

            {!selected.is_super_admin ? (
              <div>
                <p className="text-sm font-medium text-ink-700 mb-3">Assigned modules</p>
                <div className="space-y-2">
                  {ADMIN_MODULE_OPTIONS.map((option) => {
                    const checked = editModules.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:bg-ink-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setEditModules((prev) => toggleModule(prev, option.key, e.target.checked))}
                          className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium text-ink-800">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={editModules.length === 0 || updateModulesMutation.isPending}
                  onClick={() => updateModulesMutation.mutate({ id: selected.id, modules: editModules })}
                  className="mt-3 w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
                >
                  Save module access
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-brand-50 text-brand-800 text-sm">
                Super admins always have full access to every module.
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-ink-100">
              <button
                type="button"
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate(selected.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
              >
                <Mail className="w-4 h-4" />
                Resend temporary credentials
              </button>

              {!selected.is_super_admin ? (
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove admin access for ${adminAccountName(selected)}?`)) {
                      removeMutation.mutate(selected.id);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-error-200 text-sm font-medium text-error-700 hover:bg-error-50 disabled:opacity-60"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove admin access
                </button>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-ink-50 text-ink-600 text-sm">
                  <Trash2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Super admin accounts cannot be removed from this screen.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Admin"
        subtitle="A temporary password will be emailed to the new admin"
        width="md"
        footer={
          <button
            type="button"
            disabled={
              !newAdmin.name.trim() ||
              !newAdmin.email.trim() ||
              newAdmin.modules.length === 0 ||
              createMutation.isPending
            }
            onClick={() => createMutation.mutate()}
            className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            Create admin and send credentials
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Full name</label>
            <input
              type="text"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
            <input
              type="email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Module access</p>
            <div className="space-y-2">
              {ADMIN_MODULE_OPTIONS.map((option) => {
                const checked = newAdmin.modules.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:bg-ink-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setNewAdmin((prev) => ({
                          ...prev,
                          modules: toggleModule(prev.modules, option.key, e.target.checked),
                        }))
                      }
                      className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-ink-800">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-ink-500">
            The admin will sign in with their email and the temporary password from the email, then be prompted to set a new password.
          </p>
        </div>
      </Drawer>
    </div>
  );
}
