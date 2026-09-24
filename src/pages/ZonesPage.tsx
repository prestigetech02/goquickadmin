import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  createAdminZone,
  deleteAdminZone,
  fetchAdminZoneStats,
  fetchAdminZones,
  updateAdminZone,
} from '@/api/adminZonesApi';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { AdminZone, AdminZoneInput } from '@/types/api';
import { ZoneBoundaryMap } from '@/components/ZoneBoundaryMap';

type StatusFilter = 'all' | 'active' | 'inactive';

type ZoneFormState = {
  name: string;
  aliases_text: string;
  base_fee: string;
  per_km_rate: string;
  geo_boundary: string;
  active: boolean;
};

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

const emptyForm: ZoneFormState = {
  name: '',
  aliases_text: '',
  base_fee: '1500',
  per_km_rate: '250',
  geo_boundary: '',
  active: true,
};

const SAMPLE_POLYGON = `{
  "type": "Polygon",
  "coordinates": [[
    [3.4600, 6.4300],
    [3.5800, 6.4300],
    [3.5800, 6.5200],
    [3.4600, 6.5200],
    [3.4600, 6.4300]
  ]]
}`;

function zoneToForm(zone: AdminZone): ZoneFormState {
  return {
    name: zone.name,
    aliases_text: zone.aliases.join('\n'),
    base_fee: String(zone.base_fee),
    per_km_rate: String(zone.per_km_rate),
    geo_boundary: zone.geo_boundary
      ? JSON.stringify(zone.geo_boundary, null, 2)
      : '',
    active: zone.active,
  };
}

function formToPayload(form: ZoneFormState): AdminZoneInput {
  const boundaryText = form.geo_boundary.trim();
  return {
    name: form.name.trim(),
    aliases_text: form.aliases_text.trim() || null,
    base_fee: Number(form.base_fee),
    per_km_rate: Number(form.per_km_rate),
    geo_boundary: boundaryText === '' ? null : boundaryText,
    active: form.active,
  };
}

export function ZonesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [drawerMode, setDrawerMode] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AdminZone | null>(null);
  const [form, setForm] = useState<ZoneFormState>(emptyForm);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 20, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter === 'active') params.active = 1;
    if (statusFilter === 'inactive') params.active = 0;
    return params;
  }, [page, debouncedSearch, statusFilter]);

  const statsQuery = useQuery({
    queryKey: queryKeys.zones.stats,
    queryFn: fetchAdminZoneStats,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.zones.list(listParams),
    queryFn: () => fetchAdminZones(listParams),
  });

  const zones = listQuery.data?.zones ?? [];
  const pagination = listQuery.data?.pagination;
  const stats = statsQuery.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminZone(formToPayload(form)),
    onSuccess: () => {
      invalidate();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Zone created.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to create zone.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No zone selected.');
      return updateAdminZone(editing.id, formToPayload(form));
    },
    onSuccess: (zone) => {
      invalidate();
      setEditing(zone);
      setForm(zoneToForm(zone));
      setActionError(null);
      setActionSuccess('Zone updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update zone.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminZone(id),
    onSuccess: () => {
      invalidate();
      closeDrawer();
      setActionError(null);
      setActionSuccess('Zone deleted.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to delete zone.'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (zone: AdminZone) =>
      updateAdminZone(zone.id, {
        name: zone.name,
        aliases: zone.aliases,
        base_fee: zone.base_fee,
        per_km_rate: zone.per_km_rate,
        geo_boundary: zone.geo_boundary,
        active: !zone.active,
      }),
    onSuccess: () => {
      invalidate();
      setActionError(null);
      setActionSuccess('Zone status updated.');
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update zone status.'));
    },
  });

  function openCreate() {
    setDrawerMode('new');
    setEditing(null);
    setForm(emptyForm);
    setActionError(null);
  }

  function openEdit(zone: AdminZone) {
    setDrawerMode('edit');
    setEditing(zone);
    setForm(zoneToForm(zone));
    setActionError(null);
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditing(null);
    setForm(emptyForm);
  }

  const columns: Column<AdminZone>[] = [
    {
      key: 'name',
      header: 'Zone',
      render: (zone) => (
        <div>
          <p className="font-medium text-ink-900">{zone.name}</p>
          {zone.aliases.length > 0 ? (
            <p className="text-xs text-ink-500 mt-0.5 truncate max-w-[220px]">
              {zone.aliases.slice(0, 3).join(' · ')}
              {zone.aliases.length > 3 ? ` +${zone.aliases.length - 3}` : ''}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'fees',
      header: 'Fees',
      render: (zone) => (
        <div className="text-sm text-ink-700">
          <p>{formatCurrency(zone.base_fee)} base</p>
          <p className="text-xs text-ink-500">{formatCurrency(zone.per_km_rate)} / km</p>
        </div>
      ),
    },
    {
      key: 'boundary',
      header: 'Boundary',
      render: (zone) =>
        zone.has_boundary ? (
          <Badge status="active" label="Geofenced" />
        ) : (
          <Badge status="inactive" label="No polygon" />
        ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (zone) =>
        zone.active ? (
          <Badge status="active" />
        ) : (
          <Badge status="inactive" />
        ),
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (zone) => (
        <span className="text-sm text-ink-500">
          {zone.updated_at ? formatDateTime(zone.updated_at) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (zone) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMutation.mutate(zone);
            }}
            className="text-xs font-medium text-ink-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-ink-50"
          >
            {zone.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(zone);
            }}
            className="text-xs font-medium text-brand-700 hover:text-brand-800 px-2 py-1 rounded-lg hover:bg-brand-50"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Zones"
        subtitle="Manage coverage polygons, aliases, and zone-based fares used for serviceability and pricing."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                listQuery.refetch();
                statsQuery.refetch();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Add zone
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total zones"
          value={String(stats?.total ?? '—')}
          icon={<MapPinned className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Active"
          value={String(stats?.active ?? '—')}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Inactive"
          value={String(stats?.inactive ?? '—')}
          icon={<AlertCircle className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="With boundary"
          value={String(stats?.with_boundary ?? '—')}
          icon={<MapPinned className="w-5 h-5" />}
          accent="brand"
        />
      </div>

      {actionError ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      <Card>
        <div className="p-4 border-b border-ink-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or alias…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                  statusFilter === key
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={zones}
          loading={listQuery.isLoading}
          emptyMessage="No service zones yet. Add a zone to define coverage."
          onRowClick={openEdit}
        />

        {pagination && pagination.last_page > 1 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100 text-sm text-ink-600">
            <span>
              Page {pagination.current_page} of {pagination.last_page} · {pagination.total} zones
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <Drawer
        open={drawerMode !== null}
        onClose={closeDrawer}
        title={drawerMode === 'edit' ? 'Edit zone' : 'Add zone'}
        subtitle="Draw the coverage area on the map. Leave blank for alias-only matching."
        width="2xl"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-ink-700 mb-1.5">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Lekki"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-ink-700 mb-1.5">Aliases</span>
            <textarea
              value={form.aliases_text}
              onChange={(e) => setForm({ ...form, aliases_text: e.target.value })}
              rows={4}
              className={inputClass}
              placeholder={'Lekki Phase 1\nLekki Peninsula'}
            />
            <span className="mt-1.5 block text-xs text-ink-500">
              One per line or comma-separated. Used when reverse-geocode matches a locality name.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-ink-700 mb-1.5">Base fee (₦)</span>
              <input
                type="number"
                min={0}
                step="1"
                value={form.base_fee}
                onChange={(e) => setForm({ ...form, base_fee: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-ink-700 mb-1.5">Per km (₦)</span>
              <input
                type="number"
                min={0}
                step="1"
                value={form.per_km_rate}
                onChange={(e) => setForm({ ...form, per_km_rate: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <div className="block">
            <span className="block text-sm font-medium text-ink-700 mb-1.5">Coverage area</span>
            <ZoneBoundaryMap
              value={form.geo_boundary}
              onChange={(geo) => setForm((prev) => ({ ...prev, geo_boundary: geo }))}
            />
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-ink-500 hover:text-ink-700">
                Advanced: raw GeoJSON (optional)
              </summary>
              <textarea
                value={form.geo_boundary}
                onChange={(e) => setForm({ ...form, geo_boundary: e.target.value })}
                rows={6}
                className={`${inputClass} font-mono text-xs mt-2`}
                placeholder={SAMPLE_POLYGON}
              />
            </details>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-ink-700">Active (used for serviceability & pricing)</span>
          </label>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={saving || !form.name.trim()}
              onClick={() => {
                if (drawerMode === 'edit') updateMutation.mutate();
                else createMutation.mutate();
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : drawerMode === 'edit' ? 'Save changes' : 'Create zone'}
            </button>

            {drawerMode === 'edit' && editing ? (
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Delete zone “${editing.name}”? This cannot be undone.`)) {
                    deleteMutation.mutate(editing.id);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-error-200 text-error-700 text-sm font-medium hover:bg-error-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isPending ? 'Deleting…' : 'Delete zone'}
              </button>
            ) : null}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
