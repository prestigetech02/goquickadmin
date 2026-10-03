import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdminPricingRule, updateAdminPricingRule } from '@/api/adminPricingApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { PricingRuleInput, PricingRuleItem } from '@/types/api';
import { RULE_DEFAULTS, SAMPLE_TRIP, fareRange } from './fareRules';
import { NumberField, Switch } from './parts';
import { FIELD } from './presentation';

export type FareRuleOptions = {
  zones: Array<{ name: string; city: string | null }>;
  errandTypes: Array<{ slug: string; name: string }>;
};

export function FareRuleModal({
  open,
  rule,
  options,
  onClose,
}: {
  open: boolean;
  /** null adds a new rule */
  rule: PricingRuleItem | null;
  options: FareRuleOptions;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit fare rule' : 'Add fare rule'} size="md">
      {open ? <FareRuleForm key={rule?.id ?? 'new'} rule={rule} options={options} onClose={onClose} /> : null}
    </Modal>
  );
}

type FormState = {
  zone: string;
  errand_type: string;
  city: string;
  base_fare: number;
  per_km: number;
  per_minute: number;
  surge_multiplier: number;
  is_active: boolean;
};

function FareRuleForm({ rule, options, onClose }: { rule: PricingRuleItem | null; options: FareRuleOptions; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    zone: rule?.zone ?? '',
    errand_type: rule?.errand_type ?? '',
    city: rule?.city ?? '',
    base_fare: rule?.base_fare ?? RULE_DEFAULTS.base_fare,
    per_km: rule?.per_km ?? RULE_DEFAULTS.per_km,
    per_minute: rule?.per_minute ?? RULE_DEFAULTS.per_minute,
    surge_multiplier: rule?.surge_multiplier ?? 1,
    is_active: rule?.is_active ?? true,
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const zoneOptions = withCurrent(options.zones.map((z) => z.name), rule?.zone);
  const typeOptions = withCurrent(options.errandTypes.map((t) => t.slug), rule?.errand_type);
  const typeName = (slug: string) => options.errandTypes.find((t) => t.slug === slug)?.name ?? slug;
  const cities = [...new Set(options.zones.map((z) => z.city).filter((c): c is string => Boolean(c)))];

  const rates = [form.base_fare, form.per_km, form.per_minute];
  const valid =
    rates.every((v) => Number.isFinite(v) && v >= 0) && Number.isFinite(form.surge_multiplier) && form.surge_multiplier >= 0.1 && form.surge_multiplier <= 10;

  const save = useMutation({
    mutationFn: () => {
      const input: PricingRuleInput = {
        zone: form.zone.trim() || null,
        errand_type: form.errand_type.trim() || null,
        city: form.city.trim() || null,
        base_fare: form.base_fare,
        per_km: form.per_km,
        per_minute: form.per_minute,
        surge_multiplier: form.surge_multiplier,
        is_active: form.is_active,
      };
      return rule ? updateAdminPricingRule(rule.id, input) : createAdminPricingRule(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all });
      onClose();
    },
  });

  return (
    <form
      className="flex flex-col gap-[14px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate();
      }}
    >
      <div className="flex flex-col gap-[10px] rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] p-[12px]">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[12px] font-semibold text-[#17211b]">Applies to</span>
          <span className="text-[10px] leading-[1.45] text-[#7c857f]">Leave a field on “Any” to cover everything. The more fields you set, the higher this rule ranks.</span>
        </div>
        <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
          <Field label="Zone">
            <select value={form.zone} onChange={(e) => set('zone', e.target.value)} className={FIELD}>
              <option value="">Any zone</option>
              {zoneOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Errand type">
            <select value={form.errand_type} onChange={(e) => set('errand_type', e.target.value)} className={FIELD}>
              <option value="">Any errand type</option>
              {typeOptions.map((slug) => (
                <option key={slug} value={slug}>
                  {typeName(slug)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="City" help="Matched against the city of the errand's zone.">
          <input value={form.city} onChange={(e) => set('city', e.target.value)} list="fare-rule-cities" maxLength={100} placeholder="Any city" className={FIELD} />
          <datalist id="fare-rule-cities">
            {cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <NumberField label="Base fare" prefix="₦" min={0} step={50} value={form.base_fare} onChange={(v) => set('base_fare', v)} />
        <NumberField label="Per km" prefix="₦" min={0} step={10} value={form.per_km} onChange={(v) => set('per_km', v)} />
        <NumberField label="Per minute" prefix="₦" min={0} step={5} value={form.per_minute} onChange={(v) => set('per_minute', v)} />
        <NumberField
          label="Surge multiplier"
          suffix="×"
          min={0.1}
          max={10}
          step={0.1}
          value={form.surge_multiplier}
          onChange={(v) => set('surge_multiplier', v)}
          help="1 means no surge. Between 0.1 and 10."
        />
      </div>

      <p className="rounded-[8px] bg-[#f3faf5] px-[12px] py-[9px] text-[11px] text-[#45514a]">
        {valid ? (
          <>
            A {SAMPLE_TRIP.km} km, {SAMPLE_TRIP.minutes} minute errand would be suggested at{' '}
            <span className="font-semibold text-[#0d5e27]">{fareRange(form)}</span>, before any errand-detail add-ons. Prices never go below{' '}
            ₦{RULE_DEFAULTS.minimum_fare.toLocaleString('en-NG')}.
          </>
        ) : (
          'Enter rates of zero or more and a surge between 0.1 and 10 to see an example fare.'
        )}
      </p>

      <div className="flex items-start justify-between gap-4 rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] p-[12px]">
        <div className="flex flex-col gap-[3px]">
          <span className="text-[12px] font-semibold text-[#17211b]">Active</span>
          <span className="text-[10px] leading-[1.45] text-[#7c857f]">Paused rules are kept but never used to price errands.</span>
        </div>
        <Switch checked={form.is_active} onChange={(value) => set('is_active', value)} label="Active" />
      </div>

      {save.isError ? <p className="text-[11px] font-medium text-[#b84545]">{getApiErrorMessage(save.error, 'Could not save this fare rule.')}</p> : null}

      <div className="flex justify-end gap-[8px] pt-[4px]">
        <button
          type="button"
          onClick={onClose}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || save.isPending}
          className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : rule ? 'Save changes' : 'Add rule'}
        </button>
      </div>
    </form>
  );
}

function withCurrent(values: string[], current: string | null | undefined): string[] {
  return current && !values.includes(current) ? [current, ...values] : values;
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[11px] font-semibold text-[#45514a]">{label}</span>
      {children}
      {help ? <span className="text-[10px] leading-[1.45] text-[#7c857f]">{help}</span> : null}
    </label>
  );
}
