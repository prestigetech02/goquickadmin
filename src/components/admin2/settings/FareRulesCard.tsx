import { useMemo, useState, type ReactNode } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteAdminPricingRule, fetchAdminPricingRules, previewAdminPricingRule, updateAdminPricingRule } from '@/api/adminPricingApi';
import { fetchAdminErrandTypes } from '@/api/adminErrandTypesApi';
import { fetchAdminZones } from '@/api/adminZonesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { PricingRuleItem, PricingRulePreviewInput } from '@/types/api';
import { Chip } from '../errand/parts';
import { formatCount, formatNaira } from '../format';
import { Skeleton } from '../overview/primitives';
import { TABLE_HEADER } from '../shared/TableControls';
import { useDebounced } from '../shared/useDebounced';
import { AMBER, GRAY, GREEN } from '../userDetails/presentation';
import { FareRuleModal, type FareRuleOptions } from './FareRuleModal';
import { RULE_DEFAULTS, SAMPLE_TRIP, fareRange, isDefaultScope, shadowedRuleIds } from './fareRules';
import { LoadError, NumberField, SettingsCard, Switch } from './parts';
import { FIELD } from './presentation';

const PURPLE = { bg: '#f1ecfb', color: '#6b46c1' };
const BLUE = { bg: '#e8f1fb', color: '#2563a8' };

type StatusFilter = 'all' | 'active' | 'paused';

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
];

const ZONE_PARAMS = { page: 1, per_page: 50 };

export function FareRulesCard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<PricingRuleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const params = { page: 1, per_page: 50, ...(filter === 'all' ? {} : { is_active: filter === 'active' ? 1 : 0 }) };
  const rulesQuery = useQuery({ queryKey: queryKeys.pricing.list(params), queryFn: () => fetchAdminPricingRules(params), placeholderData: keepPreviousData });
  const zonesQuery = useQuery({ queryKey: queryKeys.zones.list(ZONE_PARAMS), queryFn: () => fetchAdminZones(ZONE_PARAMS) });
  const typesQuery = useQuery({ queryKey: queryKeys.settings.errandTypes, queryFn: fetchAdminErrandTypes });

  const rules = rulesQuery.data?.rules;
  const meta = rulesQuery.data?.meta;
  const total = rulesQuery.data?.pagination.total ?? 0;
  const defaults = meta?.defaults ?? RULE_DEFAULTS;
  const shadowed = useMemo(() => shadowedRuleIds(rules ?? []), [rules]);
  const hasActiveDefault = (rules ?? []).some((r) => r.is_active && isDefaultScope(r) && !shadowed.has(r.id));

  const options = useMemo<FareRuleOptions>(
    () => ({
      zones: (zonesQuery.data?.zones ?? []).map((z) => ({ name: z.name, city: z.city ?? null })),
      errandTypes: (typesQuery.data?.types ?? []).map((t) => ({ slug: t.slug, name: t.name })),
    }),
    [zonesQuery.data, typesQuery.data],
  );
  const typeName = (slug: string) => options.errandTypes.find((t) => t.slug.toLowerCase() === slug.trim().toLowerCase())?.name ?? slug;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all });
  const toggle = useMutation({
    mutationFn: (rule: PricingRuleItem) => updateAdminPricingRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminPricingRule(id),
    onSuccess: () => {
      setConfirmDelete(null);
      invalidate();
    },
  });

  const openEditor = (rule: PricingRuleItem | null) => {
    setEditing(rule);
    setModalOpen(true);
  };

  const actionError = toggle.isError
    ? getApiErrorMessage(toggle.error, 'Could not change this rule.')
    : remove.isError
      ? getApiErrorMessage(remove.error, 'Could not delete this rule.')
      : null;

  return (
    <SettingsCard
      id="fare-rules"
      title="Fare rules"
      subtitle={
        meta
          ? `${formatCount(meta.counts.active)} active of ${formatCount(meta.counts.total)} rules · used to suggest a price when an errand is posted`
          : 'Rates used to suggest a price when an errand is posted.'
      }
      action={
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="flex h-[30px] items-center gap-[6px] rounded-[8px] bg-[#167d35] px-[10px] text-[11px] font-semibold text-white hover:bg-[#0d5e27]"
        >
          <Plus className="size-[13px]" strokeWidth={2.2} />
          Add rule
        </button>
      }
    >
      {meta?.zone_pricing.enabled ? (
        <p className="flex items-start gap-[8px] rounded-[8px] bg-[#fff5e5] px-[12px] py-[9px] text-[11px] leading-[1.5] text-[#8a560e]">
          <Info className="mt-[1px] size-[14px] flex-shrink-0" strokeWidth={2} />
          <span>
            Zone pricing is on. Errands inside the {formatCount(meta.zone_pricing.active_zones)} active{' '}
            {meta.zone_pricing.active_zones === 1 ? 'zone are' : 'zones are'} priced by each zone's base fee and per-km rate (Service zones below). These rules
            price errands outside active zones.
          </span>
        </p>
      ) : null}

      <div className="flex flex-col gap-[4px] text-[11px] leading-[1.5] text-[#45514a]">
        <p>
          Suggested price = (base fare + km × per km + minutes × per minute) × surge, never below {formatNaira(defaults.minimum_fare)}. Customers see a range 10%
          either side.
        </p>
        <p className="text-[#7c857f]">
          When several rules fit an errand, the most specific one wins: a zone match beats an errand-type match, which beats a city match. Blank fields match
          everything.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-[8px] border border-[#d4ddd6] bg-[#f8faf8] p-[2px]" role="tablist" aria-label="Rule status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`h-[26px] rounded-[6px] px-[10px] text-[11px] font-semibold ${filter === f.id ? 'bg-white text-[#0d5e27] shadow-sm' : 'text-[#7c857f] hover:text-[#45514a]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[#7c857f]">
          Example column: a {SAMPLE_TRIP.km} km, {SAMPLE_TRIP.minutes} minute errand
        </span>
      </div>

      {rulesQuery.isError ? <LoadError text={getApiErrorMessage(rulesQuery.error, 'Could not load fare rules.')} /> : null}
      {actionError ? <LoadError text={actionError} /> : null}

      {!rulesQuery.isError ? (
        <div className="-mx-[18px] overflow-x-auto border-y border-[#eef1ee]">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className={TABLE_HEADER}>
                <th className="px-[18px] font-semibold">Applies to</th>
                <th className="px-[12px] font-semibold">Base fare</th>
                <th className="px-[12px] font-semibold">Per km</th>
                <th className="px-[12px] font-semibold">Per min</th>
                <th className="px-[12px] font-semibold">Surge</th>
                <th className="px-[12px] font-semibold">Example</th>
                <th className="px-[12px] font-semibold">Active</th>
                <th className="px-[18px] text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!rules
                ? Array.from({ length: 3 }, (_, i) => (
                    <tr key={i} className="border-t border-[#eef1ee]">
                      <td colSpan={8} className="px-[18px] py-[12px]">
                        <Skeleton className="h-[14px] w-full" />
                      </td>
                    </tr>
                  ))
                : null}
              {rules?.map((rule) => (
                <tr key={rule.id} className={`border-t border-[#eef1ee] text-[12px] text-[#17211b] ${rule.is_active ? '' : 'bg-[#fafbfa] text-[#7c857f]'}`}>
                  <td className="px-[18px] py-[10px]">
                    <div className="flex flex-wrap items-center gap-[5px]">
                      {isDefaultScope(rule) ? <span className="font-semibold">Everywhere, all errands</span> : null}
                      {rule.zone ? <Chip tone={PURPLE} label={`Zone: ${rule.zone}`} /> : null}
                      {rule.errand_type ? <Chip tone={BLUE} label={typeName(rule.errand_type)} /> : null}
                      {rule.city ? <Chip tone={GRAY} label={`City: ${rule.city}`} /> : null}
                      {shadowed.has(rule.id) ? <Chip tone={AMBER} label="Replaced by a newer rule" /> : null}
                    </div>
                  </td>
                  <td className="px-[12px] py-[10px] tabular-nums">{formatNaira(rule.base_fare)}</td>
                  <td className="px-[12px] py-[10px] tabular-nums">{formatNaira(rule.per_km)}</td>
                  <td className="px-[12px] py-[10px] tabular-nums">{formatNaira(rule.per_minute)}</td>
                  <td className="px-[12px] py-[10px] tabular-nums">{rule.surge_multiplier}×</td>
                  <td className="whitespace-nowrap px-[12px] py-[10px] tabular-nums text-[#45514a]">{fareRange(rule, undefined, undefined, defaults.minimum_fare)}</td>
                  <td className="px-[12px] py-[10px]">
                    <Switch
                      checked={rule.is_active}
                      disabled={toggle.isPending}
                      onChange={() => toggle.mutate(rule)}
                      label={rule.is_active ? 'Pause this rule' : 'Activate this rule'}
                    />
                  </td>
                  <td className="px-[18px] py-[10px]">
                    {confirmDelete === rule.id ? (
                      <div className="flex items-center justify-end gap-[6px] whitespace-nowrap">
                        <span className="text-[11px] text-[#45514a]">Delete?</span>
                        <button
                          type="button"
                          onClick={() => remove.mutate(rule.id)}
                          disabled={remove.isPending}
                          className="h-[26px] rounded-[6px] bg-[#b84545] px-[8px] text-[11px] font-semibold text-white hover:bg-[#9c3a3a] disabled:opacity-50"
                        >
                          {remove.isPending ? 'Deleting…' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="h-[26px] rounded-[6px] border border-[#d4ddd6] bg-white px-[8px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-[4px]">
                        <IconButton label="Edit rule" onClick={() => openEditor(rule)}>
                          <Pencil className="size-[14px]" strokeWidth={1.8} />
                        </IconButton>
                        <IconButton
                          label="Delete rule"
                          danger
                          onClick={() => {
                            remove.reset();
                            setConfirmDelete(rule.id);
                          }}
                        >
                          <Trash2 className="size-[14px]" strokeWidth={1.8} />
                        </IconButton>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rules && filter !== 'paused' && !hasActiveDefault ? (
                <tr className="border-t border-[#eef1ee] bg-[#f8faf8] text-[12px] text-[#45514a]">
                  <td className="px-[18px] py-[10px]">
                    <div className="flex flex-wrap items-center gap-[6px]">
                      <span className="font-semibold">Built-in default</span>
                      <Chip tone={GRAY} label="When no rule fits" />
                    </div>
                  </td>
                  <td className="px-[12px] py-[10px] tabular-nums">{formatNaira(defaults.base_fare)}</td>
                  <td className="px-[12px] py-[10px] tabular-nums">{formatNaira(defaults.per_km)}</td>
                  <td className="px-[12px] py-[10px] tabular-nums">{formatNaira(defaults.per_minute)}</td>
                  <td className="px-[12px] py-[10px] tabular-nums">1×</td>
                  <td className="whitespace-nowrap px-[12px] py-[10px] tabular-nums">
                    {fareRange({ ...defaults, surge_multiplier: 1 }, undefined, undefined, defaults.minimum_fare)}
                  </td>
                  <td colSpan={2} className="px-[18px] py-[10px] text-right text-[10px] text-[#7c857f]">
                    Add an “everywhere” rule to change it
                  </td>
                </tr>
              ) : null}
              {rules && rules.length === 0 && filter === 'paused' ? (
                <tr className="border-t border-[#eef1ee]">
                  <td colSpan={8} className="px-[18px] py-[20px] text-center text-[11px] text-[#7c857f]">
                    No paused rules.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {rules && total > rules.length ? (
            <p className="border-t border-[#eef1ee] px-[18px] py-[10px] text-[10px] text-[#7c857f]">
              Showing the newest {rules.length} of {formatCount(total)} rules.
            </p>
          ) : null}
        </div>
      ) : null}

      <FarePreview options={options} zonePricingOn={Boolean(meta?.zone_pricing.enabled)} typeName={typeName} />

      <FareRuleModal open={modalOpen} rule={editing} options={options} onClose={() => setModalOpen(false)} />
    </SettingsCard>
  );
}

function FarePreview({ options, zonePricingOn, typeName }: { options: FareRuleOptions; zonePricingOn: boolean; typeName: (slug: string) => string }) {
  const [input, setInput] = useState({ zone: '', errand_type: '', city: '', distance_km: SAMPLE_TRIP.km, duration_min: SAMPLE_TRIP.minutes });
  const debounced = useDebounced(input, 350);
  const ready = Number.isFinite(debounced.distance_km) && debounced.distance_km >= 0 && Number.isFinite(debounced.duration_min) && debounced.duration_min >= 0;

  const params: PricingRulePreviewInput = {
    distance_km: debounced.distance_km,
    duration_min: Math.round(debounced.duration_min),
    ...(debounced.zone ? { zone: debounced.zone } : {}),
    ...(debounced.errand_type ? { errand_type: debounced.errand_type } : {}),
    ...(debounced.city.trim() ? { city: debounced.city.trim() } : {}),
  };
  const query = useQuery({
    queryKey: [...queryKeys.pricing.all, 'preview', params],
    queryFn: () => previewAdminPricingRule(params),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const result = query.data;
  const set = <K extends keyof typeof input>(key: K, value: (typeof input)[K]) => setInput((current) => ({ ...current, [key]: value }));

  return (
    <div className="flex flex-col gap-[12px] rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] p-[12px]">
      <div className="flex flex-col gap-[2px]">
        <span className="text-[12px] font-semibold text-[#17211b]">Check which rule applies</span>
        <span className="text-[10px] text-[#7c857f]">Pick where and what the errand is to see the rule and price customers would get.</span>
      </div>
      <div className="grid grid-cols-2 gap-[10px] md:grid-cols-5">
        <label className="flex min-w-0 flex-col gap-[6px]">
          <span className="text-[11px] font-semibold text-[#45514a]">Zone</span>
          <select value={input.zone} onChange={(e) => set('zone', e.target.value)} className={FIELD}>
            <option value="">Outside any zone</option>
            {options.zones.map((z) => (
              <option key={z.name} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-[6px]">
          <span className="text-[11px] font-semibold text-[#45514a]">Errand type</span>
          <select value={input.errand_type} onChange={(e) => set('errand_type', e.target.value)} className={FIELD}>
            <option value="">Not set</option>
            {options.errandTypes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-[6px]">
          <span className="text-[11px] font-semibold text-[#45514a]">City</span>
          <input value={input.city} onChange={(e) => set('city', e.target.value)} placeholder="From zone" className={FIELD} />
        </label>
        <NumberField label="Distance" suffix="km" min={0} step={0.5} value={input.distance_km} onChange={(v) => set('distance_km', v)} />
        <NumberField label="Duration" suffix="min" min={0} step={5} value={input.duration_min} onChange={(v) => set('duration_min', v)} />
      </div>

      {query.isError ? <LoadError text={getApiErrorMessage(query.error, 'Could not work out the fare.')} /> : null}
      {result ? (
        <div className="flex flex-col gap-[8px] rounded-[8px] border border-[#e2e8e3] bg-white px-[12px] py-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-[6px] text-[12px] text-[#17211b]">
              <span className="text-[#7c857f]">Rule used:</span>
              {result.rule ? (
                <>
                  <span className="font-semibold">{isDefaultScope(result.rule) ? 'Everywhere, all errands' : `Rule #${result.rule.id}`}</span>
                  {result.rule.zone ? <Chip tone={PURPLE} label={`Zone: ${result.rule.zone}`} /> : null}
                  {result.rule.errand_type ? <Chip tone={BLUE} label={typeName(result.rule.errand_type)} /> : null}
                  {result.rule.city ? <Chip tone={GRAY} label={`City: ${result.rule.city}`} /> : null}
                </>
              ) : (
                <span className="font-semibold">Built-in default</span>
              )}
            </div>
            <span className="text-[14px] font-semibold tabular-nums text-[#0d5e27]">
              {formatNaira(result.suggested_min)}–{formatNaira(result.suggested_max)}
            </span>
          </div>
          <p className="text-[10px] leading-[1.45] text-[#7c857f]">
            Middle of the range {formatNaira(result.base_price)}
            {result.minimum_applied ? ', raised to the minimum fare' : ''}. Errand details such as extra stops or item value can add to this.
          </p>
          {result.zone_pricing_applies ? (
            <p className="rounded-[6px] px-[8px] py-[6px] text-[10px] font-semibold" style={{ backgroundColor: AMBER.bg, color: AMBER.color }}>
              This zone is active and zone pricing is on, so customers here get the zone's price, not this rule.
            </p>
          ) : zonePricingOn && debounced.zone ? (
            <p className="rounded-[6px] px-[8px] py-[6px] text-[10px] font-semibold" style={{ backgroundColor: GREEN.bg, color: GREEN.color }}>
              This zone is paused, so zone pricing doesn't cover it and this rule is used.
            </p>
          ) : null}
        </div>
      ) : query.isLoading ? (
        <Skeleton className="h-[64px] w-full" />
      ) : null}
    </div>
  );
}

function IconButton({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-[28px] items-center justify-center rounded-[6px] text-[#7c857f] ${danger ? 'hover:bg-[#fdeded] hover:text-[#b84545]' : 'hover:bg-[#f1f4f2] hover:text-[#17211b]'}`}
    >
      {children}
    </button>
  );
}
