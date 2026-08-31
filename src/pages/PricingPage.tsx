import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Edit3,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  createAdminPricingRule,
  deleteAdminPricingRule,
  fetchAdminPlatformFees,
  fetchAdminPricingRules,
  updateAdminPlatformFees,
  updateAdminPricingRule,
  type PricingRuleItem,
} from '@/api/adminPricingApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, titleCase } from '@/lib/utils';
import { ERRAND_TYPES, type PlatformFees } from '@/types/api';

type ActiveFilter = 'all' | 'active' | 'inactive';

type RuleFormState = {
  city: string;
  zone: string;
  errand_type: string;
  base_fare: string;
  per_km: string;
  per_minute: string;
  surge_multiplier: string;
  is_active: boolean;
};

const emptyForm: RuleFormState = {
  city: '',
  zone: '',
  errand_type: '',
  base_fare: '500',
  per_km: '200',
  per_minute: '20',
  surge_multiplier: '1',
  is_active: true,
};

function ruleScopeLabel(rule: PricingRuleItem): string {
  const parts = [rule.city, rule.zone, rule.errand_type ? titleCase(rule.errand_type.replace(/_/g, ' ')) : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(' · ') : 'Default (all locations & types)';
}

function ruleToForm(rule: PricingRuleItem): RuleFormState {
  return {
    city: rule.city ?? '',
    zone: rule.zone ?? '',
    errand_type: rule.errand_type ?? '',
    base_fare: String(rule.base_fare),
    per_km: String(rule.per_km),
    per_minute: String(rule.per_minute),
    surge_multiplier: String(rule.surge_multiplier),
    is_active: rule.is_active,
  };
}

function formToPayload(form: RuleFormState) {
  return {
    city: form.city.trim() || null,
    zone: form.zone.trim() || null,
    errand_type: form.errand_type || null,
    base_fare: Number(form.base_fare),
    per_km: Number(form.per_km),
    per_minute: Number(form.per_minute),
    surge_multiplier: Number(form.surge_multiplier) || 1,
    is_active: form.is_active,
  };
}

export function PricingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [drawerMode, setDrawerMode] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<PricingRuleItem | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 20, page };
    if (activeFilter === 'active') params.is_active = 1;
    if (activeFilter === 'inactive') params.is_active = 0;
    return params;
  }, [page, activeFilter]);

  const rulesQuery = useQuery({
    queryKey: queryKeys.pricing.list(listParams),
    queryFn: () => fetchAdminPricingRules(listParams),
  });

  const rules = rulesQuery.data?.rules ?? [];
  const pagination = rulesQuery.data?.pagination;

  const invalidateRules = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminPricingRule(formToPayload(form)),
    onSuccess: () => {
      invalidateRules();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Pricing rule created.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to create pricing rule.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No rule selected.');
      return updateAdminPricingRule(editing.id, formToPayload(form));
    },
    onSuccess: () => {
      invalidateRules();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Pricing rule updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update pricing rule.'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: PricingRuleItem) =>
      updateAdminPricingRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => {
      invalidateRules();
      setActionError(null);
      setActionSuccess('Pricing rule status updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update pricing rule.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminPricingRule(id),
    onSuccess: () => {
      invalidateRules();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Pricing rule deleted.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to delete pricing rule.'));
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerMode('new');
    setActionError(null);
    setActionSuccess(null);
  };

  const openEdit = (rule: PricingRuleItem) => {
    setEditing(rule);
    setForm(ruleToForm(rule));
    setDrawerMode('edit');
    setActionError(null);
    setActionSuccess(null);
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (drawerMode === 'new') {
      createMutation.mutate();
    } else if (drawerMode === 'edit') {
      updateMutation.mutate();
    }
  };

  const handleDelete = (rule: PricingRuleItem) => {
    const scope = ruleScopeLabel(rule);
    if (window.confirm(`Delete pricing rule "${scope}"? Errand pricing will fall back to defaults or other rules.`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  const isFormPending = createMutation.isPending || updateMutation.isPending;
  const activeCount = rules.filter((r) => r.is_active).length;
  const inactiveCount = rules.filter((r) => !r.is_active).length;

  return (
    <div>
      <PageHeader
        title="Pricing Rules"
        subtitle="Set errand fares, platform fees, cancellation charges, withdrawal commission, and referral bonuses."
        action={
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Rule
          </button>
        }
      />

      <PlatformFeesCard />

      <h2 className="text-base font-semibold text-ink-900 mb-1">Fare rules</h2>
      <p className="text-sm text-ink-500 mb-4">
        Set base fare, per km, per minute and surge. Scope rules by city, zone or errand type.
      </p>

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Rules"
          value={String(pagination?.total ?? rules.length)}
          icon={<DollarSign className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Active"
          value={String(activeCount)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Inactive"
          value={String(inactiveCount)}
          icon={<DollarSign className="w-5 h-5" />}
          accent="warning"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          className="px-4 py-2.5 text-sm rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All rules</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <button
          type="button"
          onClick={() => rulesQuery.refetch()}
          disabled={rulesQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${rulesQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rulesQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-32 bg-ink-100 rounded-xl animate-pulse" />
            </Card>
          ))
        ) : rulesQuery.isError ? (
          <Card className="p-12 text-center col-span-2">
            <AlertCircle className="w-10 h-10 text-error-400 mx-auto mb-2" />
            <p className="text-ink-600">Failed to load pricing rules.</p>
          </Card>
        ) : rules.length === 0 ? (
          <Card className="p-12 text-center col-span-2">
            <DollarSign className="w-10 h-10 text-ink-300 mx-auto mb-2" />
            <p className="text-ink-400">No pricing rules configured. Defaults apply (₦500 base, ₦200/km, ₦20/min).</p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        rule.is_active ? 'bg-success-50 text-success-600' : 'bg-ink-100 text-ink-400'
                      }`}
                    >
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink-900 truncate">{ruleScopeLabel(rule)}</h3>
                      <Badge status={rule.is_active ? 'active' : 'inactive'} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(rule)}
                      className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-50 hover:text-brand-600 transition-colors"
                      aria-label="Edit rule"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rule)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-lg text-ink-400 hover:bg-error-50 hover:text-error-600 transition-colors disabled:opacity-60"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-ink-50">
                    <p className="text-xs text-ink-400">Base Fare</p>
                    <p className="text-sm font-semibold text-ink-900">{formatCurrency(rule.base_fare)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-ink-50">
                    <p className="text-xs text-ink-400">Per KM</p>
                    <p className="text-sm font-semibold text-ink-900">{formatCurrency(rule.per_km)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-ink-50">
                    <p className="text-xs text-ink-400">Per Minute</p>
                    <p className="text-sm font-semibold text-ink-900">{formatCurrency(rule.per_minute)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-ink-50">
                    <p className="text-xs text-ink-400">Surge</p>
                    <p className="text-sm font-semibold text-ink-900">{rule.surge_multiplier}x</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMutation.mutate(rule)}
                  disabled={toggleMutation.isPending}
                  className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                    rule.is_active
                      ? 'bg-error-50 text-error-700 hover:bg-error-100'
                      : 'bg-success-50 text-success-700 hover:bg-success-100'
                  }`}
                >
                  {rule.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {pagination && pagination.last_page > 1 ? (
        <div className="flex items-center justify-between mt-6 text-sm text-ink-500">
          <span>
            Page {pagination.current_page} of {pagination.last_page} · {pagination.total} rules
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
              disabled={page >= pagination.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <Drawer
        open={drawerMode !== null}
        onClose={closeDrawer}
        title={drawerMode === 'new' ? 'New Pricing Rule' : 'Edit Pricing Rule'}
        subtitle="Rules can be scoped by city, zone, or errand type. Leave blank for global defaults."
        width="lg"
        footer={
          <div className="flex gap-3">
            {drawerMode === 'edit' && editing ? (
              <button
                type="button"
                onClick={() => handleDelete(editing)}
                disabled={deleteMutation.isPending || isFormPending}
                className="px-4 py-2.5 rounded-xl border border-error-200 text-sm font-medium text-error-700 hover:bg-error-50 disabled:opacity-60"
              >
                Delete
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
              {drawerMode === 'new' ? (isFormPending ? 'Creating…' : 'Create Rule') : isFormPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">City (optional)</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="e.g. Lagos"
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Zone (optional)</label>
            <input
              type="text"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              placeholder="e.g. Ikeja"
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Errand type (optional)</label>
            <select
              value={form.errand_type}
              onChange={(e) => setForm({ ...form, errand_type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Any type</option>
              {ERRAND_TYPES.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type.replace(/_/g, ' '))}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Base fare (NGN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.base_fare}
                onChange={(e) => setForm({ ...form, base_fare: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Per km (NGN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.per_km}
                onChange={(e) => setForm({ ...form, per_km: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Per minute (NGN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.per_minute}
                onChange={(e) => setForm({ ...form, per_minute: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Surge multiplier</label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={form.surge_multiplier}
                onChange={(e) => setForm({ ...form, surge_multiplier: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-ink-700">Active (rule is used for pricing)</span>
          </label>

          <p className="text-xs text-ink-500">
            When no rule matches an errand, the platform defaults to ₦500 base, ₦200/km, and ₦20/min.
          </p>
        </div>
      </Drawer>
    </div>
  );
}

const emptyFees: PlatformFees = {
  cancellation_fee_percent: 5,
  runner_commission_percent: 0,
  withdrawal_fee_percent: 0.1,
  referral_requester_discount_amount: 500,
  referral_referrer_bonus_amount: 1000,
};

function PlatformFeesCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlatformFees>(emptyFees);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const feesQuery = useQuery({
    queryKey: queryKeys.pricing.fees,
    queryFn: fetchAdminPlatformFees,
  });

  useEffect(() => {
    if (feesQuery.data?.fees) {
      setForm(feesQuery.data.fees);
    }
  }, [feesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateAdminPlatformFees(form),
    onSuccess: (data) => {
      setForm(data.fees);
      setError(null);
      setSuccess('Platform fees saved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.fees });
    },
    onError: (err) => {
      setSuccess(null);
      setError(getApiErrorMessage(err, 'Failed to save platform fees.'));
    },
  });

  const fields = feesQuery.data?.fields ?? [];

  return (
    <Card className="mb-6">
      <CardHeader
        title="Fees & charges"
        subtitle="These apply platform-wide: cancellation, errand commission, withdrawals, and referrals."
      />
      <CardBody className="space-y-4">
        {feesQuery.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-ink-500 py-4">
            <span className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            Loading current fees…
          </div>
        ) : null}

        {feesQuery.isError ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{getApiErrorMessage(feesQuery.error, 'Failed to load platform fees.')}</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fields.map((field) => {
            const value = form[field.key];
            const isMoney = field.unit === 'naira';
            return (
              <label key={field.key} className="block">
                <span className="block text-sm font-medium text-ink-700 mb-1.5">
                  {field.label} {isMoney ? '(₦)' : '(%)'}
                </span>
                <input
                  type="number"
                  min={0}
                  max={isMoney ? undefined : 100}
                  step={isMoney ? '1' : '0.1'}
                  value={Number.isFinite(value) ? value : ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field.key]: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="mt-1.5 block text-xs text-ink-500">{field.help}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saveMutation.isPending || feesQuery.isLoading || feesQuery.isError}
            onClick={() => {
              setSuccess(null);
              saveMutation.mutate();
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save fees'}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
