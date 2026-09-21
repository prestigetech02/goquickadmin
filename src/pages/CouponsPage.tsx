import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
  Trash2,
  X,
} from 'lucide-react';
import {
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCouponRedemptions,
  fetchAdminCouponStats,
  fetchAdminCoupons,
  searchAdminCouponUsers,
  updateAdminCoupon,
} from '@/api/adminCouponsApi';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '@/lib/utils';
import {
  COUPON_CATEGORIES,
  type AdminCoupon,
  type AdminCouponInput,
  type AdminCouponRedemption,
  type CouponAssignedUser,
  type CouponAudience,
  type CouponDiscountType,
} from '@/types/api';

type StatusFilter = 'all' | 'active' | 'paused';

type CouponFormState = {
  code: string;
  name: string;
  description: string;
  discount_type: CouponDiscountType;
  discount_value: string;
  max_discount_amount: string;
  min_order_amount: string;
  starts_at: string;
  expires_at: string;
  max_redemptions: string;
  max_redemptions_per_user: string;
  audience: CouponAudience;
  categories: string[];
  assigned_users: CouponAssignedUser[];
  is_active: boolean;
};

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

const emptyForm: CouponFormState = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percent',
  discount_value: '20',
  max_discount_amount: '',
  min_order_amount: '',
  starts_at: '',
  expires_at: '',
  max_redemptions: '',
  max_redemptions_per_user: '1',
  audience: 'all',
  categories: [],
  assigned_users: [],
  is_active: true,
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function couponToForm(coupon: AdminCoupon): CouponFormState {
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? '',
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    max_discount_amount: coupon.max_discount_amount != null ? String(coupon.max_discount_amount) : '',
    min_order_amount: coupon.min_order_amount != null ? String(coupon.min_order_amount) : '',
    starts_at: toDateTimeLocal(coupon.starts_at),
    expires_at: toDateTimeLocal(coupon.expires_at),
    max_redemptions: coupon.max_redemptions != null ? String(coupon.max_redemptions) : '',
    max_redemptions_per_user: String(coupon.max_redemptions_per_user),
    audience: coupon.audience,
    categories: coupon.categories,
    assigned_users: coupon.assigned_users,
    is_active: coupon.is_active,
  };
}

function formToPayload(form: CouponFormState): AdminCouponInput {
  return {
    code: form.code,
    name: form.name.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    max_discount_amount: optionalNumber(form.max_discount_amount),
    min_order_amount: optionalNumber(form.min_order_amount),
    starts_at: fromDateTimeLocal(form.starts_at),
    expires_at: fromDateTimeLocal(form.expires_at),
    max_redemptions: optionalNumber(form.max_redemptions),
    max_redemptions_per_user: optionalNumber(form.max_redemptions_per_user) ?? 1,
    audience: form.audience,
    categories: form.categories,
    user_ids: form.assigned_users.map((user) => user.id),
    is_active: form.is_active,
  };
}

function couponToInput(coupon: AdminCoupon, overrides: Partial<AdminCouponInput> = {}): AdminCouponInput {
  return {
    ...formToPayload(couponToForm(coupon)),
    ...overrides,
  };
}

function discountLabel(coupon: AdminCoupon): string {
  if (coupon.discount_type === 'percent') {
    const cap = coupon.max_discount_amount != null ? ` · cap ${formatCurrency(coupon.max_discount_amount)}` : '';
    return `${coupon.discount_value}% off${cap}`;
  }
  return `${formatCurrency(coupon.discount_value)} off`;
}

function windowLabel(coupon: AdminCoupon): string {
  if (!coupon.starts_at && !coupon.expires_at) return 'No expiry';
  const start = coupon.starts_at ? formatDate(coupon.starts_at) : 'Open';
  const end = coupon.expires_at ? formatDate(coupon.expires_at) : 'No end';
  return `${start} → ${end}`;
}

function usageLabel(coupon: AdminCoupon): string {
  const remaining = coupon.usage.remaining;
  const used = coupon.usage.used;
  if (remaining == null) return `${used} used · unlimited`;
  return `${used} used · ${remaining} left`;
}

function audienceLabel(audience: CouponAudience): string {
  if (audience === 'new_requesters') return 'New requesters';
  if (audience === 'specific_users') return 'Specific users';
  return 'Everyone';
}

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [drawerMode, setDrawerMode] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [userQuery, setUserQuery] = useState('');
  const [debouncedUserQuery, setDebouncedUserQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedUserQuery(userQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [userQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 20, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter === 'active') params.is_active = 1;
    if (statusFilter === 'paused') params.is_active = 0;
    return params;
  }, [page, debouncedSearch, statusFilter]);

  const statsQuery = useQuery({
    queryKey: queryKeys.coupons.stats,
    queryFn: fetchAdminCouponStats,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.coupons.list(listParams),
    queryFn: () => fetchAdminCoupons(listParams),
  });

  const redemptionsQuery = useQuery({
    queryKey: queryKeys.coupons.redemptions(editing?.id ?? 0, { per_page: 10 }),
    queryFn: () => fetchAdminCouponRedemptions(editing!.id, { per_page: 10 }),
    enabled: drawerMode === 'edit' && editing != null,
  });

  const userSearchQuery = useQuery({
    queryKey: queryKeys.coupons.users(debouncedUserQuery),
    queryFn: () => searchAdminCouponUsers(debouncedUserQuery),
    enabled: drawerMode !== null && form.audience === 'specific_users' && debouncedUserQuery.length >= 1,
  });

  const coupons = listQuery.data?.coupons ?? [];
  const pagination = listQuery.data?.pagination;
  const stats = statsQuery.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminCoupon(formToPayload(form)),
    onSuccess: () => {
      invalidate();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Coupon created.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to create coupon.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No coupon selected.');
      return updateAdminCoupon(editing.id, formToPayload(form));
    },
    onSuccess: (coupon) => {
      invalidate();
      setEditing(coupon);
      setForm(couponToForm(coupon));
      setActionError(null);
      setActionSuccess('Coupon updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update coupon.'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (coupon: AdminCoupon) =>
      updateAdminCoupon(coupon.id, couponToInput(coupon, { is_active: !coupon.is_active })),
    onSuccess: () => {
      invalidate();
      setActionError(null);
      setActionSuccess('Coupon status updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update coupon.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCoupon(id),
    onSuccess: () => {
      invalidate();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Coupon deleted.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to delete coupon.'));
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setUserQuery('');
    setDrawerMode('new');
    setActionError(null);
    setActionSuccess(null);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm(couponToForm(coupon));
    setUserQuery('');
    setDrawerMode('edit');
    setActionError(null);
    setActionSuccess(null);
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setEditing(null);
    setForm(emptyForm);
    setUserQuery('');
  };

  const handleSubmit = () => {
    if (drawerMode === 'new') createMutation.mutate();
    if (drawerMode === 'edit') updateMutation.mutate();
  };

  const handleDelete = (coupon: AdminCoupon) => {
    if (window.confirm(`Delete coupon ${coupon.code}? This is only allowed if it has no reserved or used redemptions.`)) {
      deleteMutation.mutate(coupon.id);
    }
  };

  const toggleCategory = (category: string) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };

  const addAssignedUser = (user: CouponAssignedUser) => {
    setForm((current) => {
      if (current.assigned_users.some((item) => item.id === user.id)) return current;
      return { ...current, assigned_users: [...current.assigned_users, user] };
    });
    setUserQuery('');
  };

  const removeAssignedUser = (id: number) => {
    setForm((current) => ({
      ...current,
      assigned_users: current.assigned_users.filter((user) => user.id !== id),
    }));
  };

  const isFormPending = createMutation.isPending || updateMutation.isPending;
  const userResults = userSearchQuery.data?.users ?? [];
  const redemptions = redemptionsQuery.data?.redemptions ?? [];

  const columns: Column<AdminCoupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.code}</p>
          <p className="text-xs text-ink-500">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (row) => discountLabel(row),
    },
    {
      key: 'usage',
      header: 'Used / remaining',
      render: (row) => usageLabel(row),
    },
    {
      key: 'window',
      header: 'Window',
      render: (row) => windowLabel(row),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (row) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggleMutation.mutate(row)}
            disabled={toggleMutation.isPending}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-60"
          >
            {row.is_active ? 'Pause' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  const redemptionColumns: Column<AdminCouponRedemption>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => row.user?.name ?? '—',
    },
    {
      key: 'errand',
      header: 'Errand',
      render: (row) => row.errand?.code ?? '—',
    },
    {
      key: 'amounts',
      header: 'Amounts',
      render: (row) => (
        <span>
          {formatCurrency(row.listed_amount)} → {formatCurrency(row.payable_amount)}
        </span>
      ),
    },
    {
      key: 'subsidy',
      header: 'Subsidy',
      render: (row) => formatCurrency(row.subsidy_amount),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'when',
      header: 'When',
      render: (row) => {
        const when = row.consumed_at || row.released_at || row.reserved_at;
        return when ? formatDateTime(when) : '—';
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Issue percent or amount-off codes. Requesters pay less; runners still earn the accepted offer."
        action={
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New coupon
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
        <StatCard
          label="Active codes"
          value={String(stats?.active_codes ?? '—')}
          icon={<TicketPercent className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Paused"
          value={String(stats?.paused_codes ?? '—')}
          icon={<PauseCircle className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Redemptions"
          value={String(stats?.redemptions ?? '—')}
          subValue={stats ? `${stats.reserved} reserved` : undefined}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Subsidy absorbed"
          value={stats ? formatCurrency(stats.subsidy_absorbed) : '—'}
          icon={<TicketPercent className="w-5 h-5" />}
          accent="error"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative sm:max-w-xs flex-1">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or name"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={`${inputClass} sm:w-44`}
          >
            <option value="all">All coupons</option>
            <option value="active">Active only</option>
            <option value="paused">Paused only</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            listQuery.refetch();
            statsQuery.refetch();
          }}
          disabled={listQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <Card>
        {listQuery.isError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-error-400 mx-auto mb-2" />
            <p className="text-ink-600">Failed to load coupons.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={coupons}
            loading={listQuery.isLoading}
            emptyMessage="No coupons yet. Create SAVE20 to start."
            onRowClick={openEdit}
            page={pagination?.current_page}
            pageSize={pagination?.per_page}
            total={pagination?.total}
            onPageChange={setPage}
          />
        )}
      </Card>

      <Drawer
        open={drawerMode !== null}
        onClose={closeDrawer}
        title={drawerMode === 'new' ? 'New coupon' : `Edit ${editing?.code ?? 'coupon'}`}
        subtitle="Percent or amount off. GoQuick funds the gap so the runner still earns the accepted offer."
        width="2xl"
        footer={
          <div className="flex gap-3">
            {drawerMode === 'edit' && editing ? (
              <button
                type="button"
                onClick={() => handleDelete(editing)}
                disabled={deleteMutation.isPending || isFormPending}
                className="px-4 py-2.5 rounded-xl border border-error-200 text-sm font-medium text-error-700 hover:bg-error-50 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Delete
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeDrawer}
              className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isFormPending}
              onClick={handleSubmit}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
            >
              {drawerMode === 'new' ? (isFormPending ? 'Creating…' : 'Create coupon') : isFormPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="20% off first errand"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as CouponDiscountType })}
                className={inputClass}
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Amount off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                {form.discount_type === 'percent' ? 'Percent' : 'Amount (NGN)'}
              </label>
              <input
                type="number"
                min="0"
                step={form.discount_type === 'percent' ? '1' : '0.01'}
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Cap (NGN, optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.max_discount_amount}
                onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                placeholder={form.discount_type === 'percent' ? 'e.g. 1000' : 'Ignored for amount off'}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Min job amount (NGN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.min_order_amount}
                onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Per-user limit</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.max_redemptions_per_user}
                onChange={(e) => setForm({ ...form, max_redemptions_per_user: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Starts</label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Expires</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Quantity (blank = unlimited)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.max_redemptions}
                onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Audience</label>
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as CouponAudience })}
                className={inputClass}
              >
                <option value="all">Everyone</option>
                <option value="new_requesters">New requesters</option>
                <option value="specific_users">Specific users</option>
              </select>
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-ink-700 mb-1.5">Categories (blank = all)</p>
            <div className="flex flex-wrap gap-2">
              {COUPON_CATEGORIES.map((category) => {
                const selected = form.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'
                    }`}
                  >
                    {titleCase(category.replace(/_/g, ' '))}
                  </button>
                );
              })}
            </div>
          </div>

          {form.audience === 'specific_users' ? (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Assigned requesters</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.assigned_users.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-100 text-ink-700 text-xs font-medium"
                  >
                    {user.name}
                    <button type="button" onClick={() => removeAssignedUser(user.id)} aria-label={`Remove ${user.name}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {form.assigned_users.length === 0 ? (
                  <span className="text-xs text-ink-400">Search and add at least one requester.</span>
                ) : null}
              </div>
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name, email, or phone"
                className={inputClass}
              />
              {debouncedUserQuery && userResults.length > 0 ? (
                <div className="mt-2 border border-ink-200 rounded-xl overflow-hidden">
                  {userResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addAssignedUser(user)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-ink-50"
                    >
                      <span className="font-medium text-ink-900">{user.name}</span>
                      <span className="text-ink-400 ml-2">{user.email || user.phone || `#${user.id}`}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-ink-300"
            />
            Active (uncheck to pause)
          </label>

          {drawerMode === 'edit' && editing ? (
            <div className="pt-4 border-t border-ink-100">
              <h3 className="text-sm font-semibold text-ink-900 mb-3">Redemptions</h3>
              <DataTable
                columns={redemptionColumns}
                data={redemptions}
                loading={redemptionsQuery.isLoading}
                emptyMessage="No redemptions yet."
              />
            </div>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
