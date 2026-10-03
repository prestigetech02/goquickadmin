import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pause, Play, Plus, Search, Users } from 'lucide-react';
import {
  assignZoneRunner,
  createAdminZone,
  deleteAdminZone,
  fetchAdminZoneStats,
  fetchAdminZones,
  fetchZoneRunners,
  removeZoneRunner,
  searchZoneRunners,
  updateAdminZone,
} from '@/api/adminZonesApi';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminZone, AdminZoneRunner } from '@/types/api';

type StatusFilter = 'all' | 'active' | 'paused';

type ZoneForm = {
  state: string;
  city: string;
  coverage_text: string;
  active: boolean;
};

const emptyForm: ZoneForm = { state: '', city: '', coverage_text: '', active: true };

export function Admin2ZonesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<AdminZone | 'new' | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: queryKeys.zones.stats,
    queryFn: fetchAdminZoneStats,
  });

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 50 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status === 'active') params.active = 1;
    if (status === 'paused') params.active = 0;
    return params;
  }, [debouncedSearch, status]);

  const listQuery = useQuery({
    queryKey: queryKeys.zones.list(listParams),
    queryFn: () => fetchAdminZones(listParams),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        state: form.state.trim(),
        city: form.city.trim(),
        coverage_text: form.coverage_text.trim(),
        active: form.active,
      };
      if (editing && editing !== 'new') {
        return updateAdminZone(editing.id, payload);
      }
      return createAdminZone(payload);
    },
    onSuccess: (zone) => {
      setNotice(editing === 'new' ? 'Service zone created.' : 'Service zone updated.');
      setError(null);
      setEditing(zone);
      refresh();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save this zone.')),
  });

  const zones = listQuery.data?.zones ?? [];

  function openNew() {
    setForm(emptyForm);
    setEditing('new');
    setError(null);
  }

  function openZone(zone: AdminZone) {
    setForm({
      state: zone.state ?? '',
      city: zone.city ?? '',
      coverage_text: (zone.coverage_areas ?? []).join('\n'),
      active: zone.active,
    });
    setEditing(zone);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Operations"
        title="Service Zones"
        subtitle="State, city, and the coverage areas where pickup orders can run. A requester’s profile does not decide this."
        actions={
          <button type="button" className={PRIMARY_BUTTON} onClick={openNew}>
            <Plus className="size-4" />
            New zone
          </button>
        }
      />

      {notice ? <p className="rounded-[10px] bg-[#eaf6ed] px-4 py-3 text-[13px] text-[#0d5e27]">{notice}</p> : null}

      <MetricGrid columns={4}>
        <MetricCard label="Zones" icon={MapPin} iconColor="#167d35" iconBg="#eaf6ed" value={String(statsQuery.data?.total ?? '—')} context="State and city directories" />
        <MetricCard label="Active" icon={Play} iconColor="#167d35" iconBg="#eaf6ed" value={String(statsQuery.data?.active ?? '—')} context="Pickup orders can proceed" />
        <MetricCard label="Paused" icon={Pause} iconColor="#b06d12" iconBg="#fff5e5" value={String(statsQuery.data?.paused ?? statsQuery.data?.inactive ?? '—')} context="Existing names, no new orders" />
        <MetricCard label="Assigned runners" icon={Users} iconColor="#735ca8" iconBg="#f3f0fa" value={String(statsQuery.data?.assigned_runners ?? '—')} context="Verified runners still need an active account" />
      </MetricGrid>

      <section className="rounded-[16px] border border-[#e2e8e3] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eef1ee] px-4 py-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7c857f]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search state, city, or coverage area"
              className="h-[38px] w-full rounded-[8px] border border-[#d4ddd6] pl-9 pr-3 text-[13px] outline-none focus:border-[#167d35]"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-[38px] rounded-[8px] border border-[#d4ddd6] bg-white px-3 text-[13px]"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-[0.4px] text-[#7c857f]">
              <tr>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Coverage areas</th>
                <th className="px-4 py-3 font-semibold">Runners</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isPending ? (
                <tr><td colSpan={5} className="px-4 py-8 text-[#6b6f66]">Loading zones…</td></tr>
              ) : zones.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-[#6b6f66]">No service zones yet. Add a state, city, and the areas you cover.</td></tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="cursor-pointer border-t border-[#eef1ee] hover:bg-[#f8faf8]" onClick={() => openZone(zone)}>
                    <td className="px-4 py-3 font-medium text-[#17211b]">{zone.state || '—'}</td>
                    <td className="px-4 py-3">{zone.city || zone.name}</td>
                    <td className="px-4 py-3 text-[#45514a]">{(zone.coverage_areas ?? []).join(', ') || '—'}</td>
                    <td className="px-4 py-3">{zone.runners_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${zone.active ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#fff5e5] text-[#b06d12]'}`}>
                        {zone.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <ZoneDrawer
          zone={editing === 'new' ? null : editing}
          form={form}
          setForm={setForm}
          saving={saveMutation.isPending}
          error={error}
          onClose={() => setEditing(null)}
          onSave={() => {
            setNotice(null);
            saveMutation.mutate();
          }}
          onChanged={refresh}
          onDeleted={() => {
            setNotice('Service zone deleted.');
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ZoneDrawer({
  zone,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSave,
  onChanged,
  onDeleted,
}: {
  zone: AdminZone | null;
  form: ZoneForm;
  setForm: (form: ZoneForm) => void;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-[460px] flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#eef1ee] px-5 py-4">
          <h2 className="text-[18px] font-bold text-[#17211b]">{zone ? 'Edit zone' : 'New zone'}</h2>
          <button type="button" className="text-[13px] font-semibold text-[#45514a]" onClick={onClose}>Close</button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <p className="text-[13px] text-[#6b6f66]">
            Orders use the pickup address only. The order continues when that address names this state, city, or one of the coverage areas, and the zone is active.
          </p>
          <Field label="State" value={form.state} onChange={(state) => setForm({ ...form, state })} placeholder="Lagos" />
          <Field label="City" value={form.city} onChange={(city) => setForm({ ...form, city })} placeholder="Ikeja" />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Coverage areas</span>
            <textarea
              value={form.coverage_text}
              onChange={(e) => setForm({ ...form, coverage_text: e.target.value })}
              rows={5}
              placeholder={'Allen Avenue\nOpebi\nMaryland'}
              className="rounded-[8px] border border-[#d4ddd6] px-3 py-2 text-[13px] outline-none focus:border-[#167d35]"
            />
            <span className="text-[12px] text-[#6b6f66]">One area per line. These are names, not a map.</span>
          </label>
          <label className="flex items-center justify-between rounded-[10px] border border-[#e2e8e3] px-3 py-3">
            <span>
              <span className="block text-[13px] font-semibold text-[#17211b]">{form.active ? 'Active' : 'Paused'}</span>
              <span className="text-[12px] text-[#6b6f66]">{form.active ? 'Pickup orders in this zone can proceed.' : 'New pickup orders in this zone are blocked.'}</span>
            </span>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          </label>
          {error ? <p className="text-[13px] text-[#b84545]">{error}</p> : null}
          <div className="flex justify-end">
            <button type="button" className={PRIMARY_BUTTON} disabled={saving || !form.state.trim() || !form.city.trim()} onClick={onSave}>
              {saving ? 'Saving…' : 'Save zone'}
            </button>
          </div>
          {zone ? <RunnerAssignment zoneId={zone.id} onChanged={onChanged} /> : <p className="text-[12px] text-[#6b6f66]">Save the zone before assigning runners.</p>}
          {zone ? <DeleteZone zone={zone} onDeleted={onDeleted} /> : null}
        </div>
      </div>
    </div>
  );
}

function DeleteZone({ zone, onDeleted }: { zone: AdminZone; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({ mutationFn: () => deleteAdminZone(zone.id), onSuccess: onDeleted });
  const runners = zone.runners_count ?? 0;

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[#f1d4d4] px-3 py-3">
      <span className="text-[13px] font-semibold text-[#17211b]">Delete zone</span>
      <span className="text-[12px] text-[#6b6f66]">
        Removes the zone for good{runners > 0 ? ` and unassigns its ${runners} ${runners === 1 ? 'runner' : 'runners'}` : ''}. Past errands keep their details. To stop
        new orders but keep the zone, pause it instead.
      </span>
      {remove.isError ? <p className="text-[12px] text-[#b84545]">{getApiErrorMessage(remove.error, 'Could not delete this zone.')}</p> : null}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            className="h-[34px] rounded-[8px] bg-[#b84545] px-3 text-[12px] font-semibold text-white hover:bg-[#9c3a3a] disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : `Delete ${zone.city || zone.name}`}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-[34px] rounded-[8px] border border-[#d4ddd6] bg-white px-3 text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            Keep zone
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="h-[34px] self-start rounded-[8px] border border-[#e8b4b4] bg-white px-3 text-[12px] font-semibold text-[#b84545] hover:bg-[#fdeded]"
        >
          Delete zone…
        </button>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-[40px] rounded-[8px] border border-[#d4ddd6] px-3 text-[13px] outline-none focus:border-[#167d35]"
      />
    </label>
  );
}

function RunnerAssignment({ zoneId, onChanged }: { zoneId: number; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);
  const [localError, setLocalError] = useState<string | null>(null);

  const assignedQuery = useQuery({
    queryKey: [...queryKeys.zones.detail(zoneId), 'runners'],
    queryFn: () => fetchZoneRunners(zoneId),
  });

  const optionsQuery = useQuery({
    queryKey: [...queryKeys.zones.all, 'runner-options', debounced],
    queryFn: () => searchZoneRunners(debounced),
    enabled: debounced.trim().length > 1,
  });

  const assign = useMutation({
    mutationFn: (runnerId: number) => assignZoneRunner(zoneId, runnerId),
    onSuccess: () => {
      setSearch('');
      setLocalError(null);
      void assignedQuery.refetch();
      onChanged();
    },
    onError: (err) => setLocalError(getApiErrorMessage(err, 'Could not assign runner.')),
  });

  const remove = useMutation({
    mutationFn: (runnerId: number) => removeZoneRunner(zoneId, runnerId),
    onSuccess: () => {
      setLocalError(null);
      void assignedQuery.refetch();
      onChanged();
    },
    onError: (err) => setLocalError(getApiErrorMessage(err, 'Could not remove runner.')),
  });

  useEffect(() => {
    setLocalError(null);
  }, [zoneId]);

  const assigned = assignedQuery.data?.runners ?? [];
  const options = (optionsQuery.data?.runners ?? []).filter((runner) => runner.zone_id !== zoneId);

  return (
    <div className="flex flex-col gap-3 border-t border-[#eef1ee] pt-4">
      <div>
        <h3 className="text-[14px] font-bold text-[#17211b]">Runners in this zone</h3>
        <p className="text-[12px] text-[#6b6f66]">Only verified, unsuspended runners assigned here can take a pickup in this zone.</p>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search a runner to assign"
        className="h-[38px] rounded-[8px] border border-[#d4ddd6] px-3 text-[13px] outline-none focus:border-[#167d35]"
      />
      {options.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {options.map((runner) => (
            <RunnerRow key={runner.id} runner={runner} action="Assign" onAction={() => assign.mutate(runner.id)} />
          ))}
        </ul>
      ) : null}
      {localError ? <p className="text-[13px] text-[#b84545]">{localError}</p> : null}
      {assigned.length === 0 ? (
        <p className="text-[13px] text-[#6b6f66]">No runners assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {assigned.map((runner) => (
            <RunnerRow key={runner.id} runner={runner} action="Remove" onAction={() => remove.mutate(runner.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RunnerRow({ runner, action, onAction }: { runner: AdminZoneRunner; action: string; onAction: () => void }) {
  const eligible = runner.verification_status === 'verified' && !runner.is_suspended;
  return (
    <li className="flex items-center justify-between gap-3 rounded-[8px] border border-[#eef1ee] px-3 py-2">
      <span>
        <span className="block text-[13px] font-semibold text-[#17211b]">{runner.name || 'Runner'}</span>
        <span className="text-[11px] text-[#6b6f66]">
          {runner.verification_status}
          {runner.is_suspended ? ' · suspended' : ''}
          {eligible ? '' : ' · not eligible until verified and active'}
          {runner.zone_name && action === 'Assign' ? ` · currently ${runner.zone_name}` : ''}
        </span>
      </span>
      <button type="button" className="text-[12px] font-semibold text-[#167d35]" onClick={onAction}>{action}</button>
    </li>
  );
}
