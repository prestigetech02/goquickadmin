import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import { createAdminCoupon, searchAdminCouponUsers, updateAdminCoupon } from '@/api/adminCouponsApi';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { COUPON_CATEGORIES, type AdminCoupon, type CouponAudience, type CouponDiscountType } from '@/types/api';
import { formatNaira } from '../format';
import { useDebounced } from '../shared/useDebounced';
import {
  AUDIENCE_COLORS,
  AUDIENCE_HINTS,
  AUDIENCE_LABELS,
  EMPTY_COUPON_FORM,
  categoriesLabel,
  categoryChoices,
  couponToForm,
  dateTimeLabel,
  discountCap,
  discountHeadline,
  formProblems,
  formToInput,
  generateCode,
  type CouponForm,
} from './presentation';

export type CouponFormMode = { kind: 'create' } | { kind: 'edit'; coupon: AdminCoupon } | { kind: 'duplicate'; coupon: AdminCoupon };

const INPUT =
  'h-[38px] w-full rounded-[8px] border bg-white px-[10px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]';
const MIN_PAYABLE = 100;
const SAMPLE_ERRAND = 5000;

function initialForm(mode: CouponFormMode): CouponForm {
  if (mode.kind === 'create') return { ...EMPTY_COUPON_FORM, code: generateCode() };
  const form = couponToForm(mode.coupon);
  if (mode.kind === 'edit') return form;
  return { ...form, code: generateCode(), name: `${mode.coupon.name} (copy)`.slice(0, 120), is_active: false };
}

function Field({ label, hint, error, children, optional = false }: { label: string; hint?: string; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[11px] font-semibold text-[#17211b]">
        {label}
        {optional ? <span className="font-normal text-[#a3aca6]"> · optional</span> : null}
      </span>
      {children}
      {error ? <span className="text-[10px] text-[#b84545]">{error}</span> : hint ? <span className="text-[10px] text-[#7c857f]">{hint}</span> : null}
    </label>
  );
}

function Group({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[12px] border-b border-[#e2e8e3] pb-[18px] last:border-b-0 last:pb-0">
      <div>
        <p className="text-[13px] font-semibold text-[#17211b]">{title}</p>
        {subtitle ? <p className="text-[11px] text-[#7c857f]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function inputClass(error?: string) {
  return `${INPUT} ${error ? 'border-[#e5a5a5]' : 'border-[#d4ddd6]'}`;
}

/** What a requester would pay on a sample errand, mirroring the backend's coupon quote. */
function sampleQuote(form: CouponForm): { listed: number; discount: number } | null {
  const value = Number(form.discount_value);
  if (!Number.isFinite(value) || value <= 0) return null;
  const minOrder = Number(form.min_order_amount) || 0;
  const listed = Math.max(SAMPLE_ERRAND, minOrder);
  let discount = form.discount_type === 'percent' ? (listed * Math.min(value, 100)) / 100 : value;
  const cap = Number(form.max_discount_amount);
  if (form.discount_type === 'percent' && form.max_discount_amount.trim() && Number.isFinite(cap)) discount = Math.min(discount, cap);
  discount = Math.max(0, Math.min(discount, listed - MIN_PAYABLE));
  return { listed, discount };
}

function TicketPreview({ form }: { form: CouponForm }) {
  const value = Number(form.discount_value) || 0;
  const fields = { discount_type: form.discount_type, discount_value: value, max_discount_amount: form.max_discount_amount.trim() ? Number(form.max_discount_amount) : null };
  const startsAt = form.starts_at ? new Date(form.starts_at).toISOString() : null;
  const endsAt = form.expires_at ? new Date(form.expires_at).toISOString() : null;
  const audience = form.audience === 'specific_users' ? `${form.assigned_users.length} picked requester${form.assigned_users.length === 1 ? '' : 's'}` : AUDIENCE_LABELS[form.audience];

  return (
    <div className="relative flex overflow-hidden rounded-[14px] bg-[#0d5e27] text-white shadow-[0_10px_28px_rgba(13,94,39,0.22)]">
      <div className="flex min-w-0 flex-1 flex-col gap-[10px] p-[16px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-[1px] text-[#a8dcb6]">GoQuick coupon · preview</span>
          <span className={`rounded-full px-[8px] py-[2px] text-[9px] font-semibold ${form.is_active ? 'bg-[#a8dcb6] text-[#0d3d1c]' : 'bg-white/15 text-white'}`}>
            {form.is_active ? 'Switched on' : 'Paused'}
          </span>
        </div>
        <div>
          <p className="text-[26px] font-bold leading-none tracking-[-0.5px]">{value > 0 ? discountHeadline(fields) : 'Set a discount'}</p>
          <p className="mt-[6px] truncate text-[11px] text-[#d4ecdb]">
            {[discountCap(fields), form.min_order_amount.trim() ? `Errands from ${formatNaira(Number(form.min_order_amount))}` : null, form.name.trim() || null]
              .filter(Boolean)
              .join(' · ') || 'Name your coupon to see it here'}
          </p>
        </div>
        <p className="truncate text-[10px] text-[#a8dcb6]">
          {audience} · {categoriesLabel(form.categories)} · {endsAt ? `until ${dateTimeLabel(endsAt)}` : startsAt ? `from ${dateTimeLabel(startsAt)}` : 'no end date'}
        </p>
      </div>
      <div className="relative flex w-[120px] flex-shrink-0 flex-col items-center justify-center gap-[6px] border-l-2 border-dashed border-white/30 bg-[#0a4c20] px-[10px]">
        <span className="absolute -left-[9px] -top-[9px] size-[18px] rounded-full bg-white" />
        <span className="absolute -bottom-[9px] -left-[9px] size-[18px] rounded-full bg-white" />
        <span className="text-[8px] font-semibold uppercase tracking-[1px] text-[#a8dcb6]">Code</span>
        <span className="max-w-full break-all text-center font-mono text-[13px] font-bold tracking-[0.6px]">{form.code.trim().toUpperCase() || '—'}</span>
      </div>
    </div>
  );
}

function RequesterPicker({ form, setForm, error }: { form: CouponForm; setForm: (form: CouponForm) => void; error?: string }) {
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term.trim(), 300);
  const query = useQuery({
    queryKey: queryKeys.coupons.users(debounced),
    queryFn: () => searchAdminCouponUsers(debounced),
    enabled: debounced.length >= 2,
  });
  const picked = new Set(form.assigned_users.map((user) => user.id));
  const results = (query.data?.users ?? []).filter((user) => !picked.has(user.id));

  return (
    <div className="flex flex-col gap-[8px] rounded-[10px] bg-[#f8faf8] p-[12px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-[10px] top-1/2 size-[14px] -translate-y-1/2 text-[#7c857f]" strokeWidth={1.8} />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search requesters by name, email or phone…"
          className={`${inputClass(error)} pl-[30px]`}
        />
        {debounced.length >= 2 ? (
          <div className="absolute inset-x-0 top-[42px] z-10 max-h-[220px] overflow-y-auto rounded-[10px] border border-[#e2e8e3] bg-white p-1 shadow-[0px_12px_32px_rgba(16,33,23,0.14)]">
            {query.isLoading ? <p className="px-[10px] py-[8px] text-[11px] text-[#7c857f]">Searching…</p> : null}
            {query.isSuccess && results.length === 0 ? <p className="px-[10px] py-[8px] text-[11px] text-[#7c857f]">No more requesters match.</p> : null}
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setForm({ ...form, assigned_users: [...form.assigned_users, user] });
                  setTerm('');
                }}
                className="flex w-full flex-col items-start rounded-[7px] px-[10px] py-[6px] text-left hover:bg-[#f8faf8]"
              >
                <span className="text-[11px] font-semibold text-[#17211b]">{user.name}</span>
                <span className="text-[10px] text-[#7c857f]">{[user.email, user.phone].filter(Boolean).join(' · ') || `Requester #${user.id}`}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {form.assigned_users.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {form.assigned_users.map((user) => (
            <span key={user.id} className="flex items-center gap-[4px] rounded-full bg-white py-[3px] pl-[9px] pr-[4px] text-[10px] font-semibold text-[#735ca8] ring-1 ring-[#e2dcf0]">
              {user.name}
              <button
                type="button"
                onClick={() => setForm({ ...form, assigned_users: form.assigned_users.filter((item) => item.id !== user.id) })}
                aria-label={`Remove ${user.name}`}
                className="rounded-full p-[2px] hover:bg-[#f3f0fa]"
              >
                <X className="size-[11px]" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className={`text-[10px] ${error ? 'text-[#b84545]' : 'text-[#7c857f]'}`}>{error ?? 'Only the requesters you add here can use this code.'}</p>
      )}
    </div>
  );
}

export function CouponFormDrawer({
  mode,
  onClose,
  onSaved,
}: {
  mode: CouponFormMode;
  onClose: () => void;
  onSaved: (coupon: AdminCoupon, mode: CouponFormMode) => void;
}) {
  const [form, setForm] = useState<CouponForm>(() => initialForm(mode));
  const [triedSave, setTriedSave] = useState(false);
  const problems = formProblems(form);
  const shown = triedSave ? problems : {};
  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => (mode.kind === 'edit' ? updateAdminCoupon(mode.coupon.id, formToInput(form)) : createAdminCoupon(formToInput(form))),
    onSuccess: (coupon) => onSaved(coupon, mode),
  });

  const save = () => {
    setTriedSave(true);
    if (Object.keys(problems).length === 0) mutation.mutate();
  };

  const quote = sampleQuote(form);
  const title = mode.kind === 'edit' ? `Edit ${mode.coupon.code}` : mode.kind === 'duplicate' ? `Duplicate ${mode.coupon.code}` : 'New coupon';
  const subtitle =
    mode.kind === 'edit' && mode.coupon.usage.used > 0
      ? `Already used ${mode.coupon.usage.used}×. Changes apply to future redemptions only.`
      : 'Requesters enter the code when they create an errand.';

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 flex-1 text-[11px] text-[#b84545]">
        {mutation.isError
          ? getApiErrorMessage(mutation.error, 'Could not save this coupon.')
          : triedSave && Object.keys(problems).length > 0
            ? 'Fix the highlighted fields to save.'
            : ''}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={mutation.isPending}
          className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : mode.kind === 'edit' ? 'Save changes' : 'Create coupon'}
        </button>
      </div>
    </div>
  );

  return (
    <Drawer open onClose={() => (mutation.isPending ? undefined : onClose())} title={title} subtitle={subtitle} width="2xl" footer={footer}>
      <div className="flex flex-col gap-[18px] font-inter">
        <TicketPreview form={form} />

        <Group title="Basics" subtitle="The code requesters type, and a name your team will recognise">
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            <Field label="Coupon code" hint="Saved in capitals without spaces." error={shown.code}>
              <div className="flex gap-[6px]">
                <input
                  value={form.code}
                  onChange={(event) => set('code', event.target.value.toUpperCase().replace(/\s+/g, ''))}
                  maxLength={40}
                  placeholder="SAVE20"
                  className={`${inputClass(shown.code)} font-mono font-semibold tracking-[0.5px]`}
                />
                <button
                  type="button"
                  onClick={() => set('code', generateCode())}
                  title="Generate a random code"
                  className="flex h-[38px] flex-shrink-0 items-center gap-[5px] rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
                >
                  <RefreshCw className="size-[13px]" strokeWidth={1.8} />
                  Generate
                </button>
              </div>
            </Field>
            <Field label="Internal name" error={shown.name}>
              <input value={form.name} onChange={(event) => set('name', event.target.value)} maxLength={120} placeholder="October welcome offer" className={inputClass(shown.name)} />
            </Field>
          </div>
          <Field label="Description" optional hint="Visible to admins only.">
            <textarea
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Why this coupon exists and where it is being shared"
              className="w-full resize-none rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] py-[8px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]"
            />
          </Field>
        </Group>

        <Group title="Discount" subtitle="GoQuick funds the discount, so runners still earn the full errand price">
          <div className="flex w-fit gap-[4px] rounded-[9px] bg-[#f1f4f2] p-[3px]" role="radiogroup" aria-label="Discount type">
            {(['percent', 'fixed'] as CouponDiscountType[]).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={form.discount_type === type}
                onClick={() => set('discount_type', type)}
                className={`rounded-[7px] px-[12px] py-[6px] text-[11px] font-semibold transition-colors ${
                  form.discount_type === type ? 'bg-white text-[#0d5e27] shadow-[0_1px_3px_rgba(16,33,23,0.1)]' : 'text-[#45514a] hover:text-[#17211b]'
                }`}
              >
                {type === 'percent' ? 'Percentage off' : 'Fixed amount off'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
            <Field label={form.discount_type === 'percent' ? 'Percentage' : 'Amount off'} error={shown.discount_value}>
              <div className="relative">
                {form.discount_type === 'fixed' ? <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[12px] text-[#7c857f]">₦</span> : null}
                <input
                  type="number"
                  min={0}
                  max={form.discount_type === 'percent' ? 100 : undefined}
                  value={form.discount_value}
                  onChange={(event) => set('discount_value', event.target.value)}
                  className={`${inputClass(shown.discount_value)} ${form.discount_type === 'fixed' ? 'pl-[24px]' : 'pr-[28px]'}`}
                />
                {form.discount_type === 'percent' ? <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[12px] text-[#7c857f]">%</span> : null}
              </div>
            </Field>
            {form.discount_type === 'percent' ? (
              <Field label="Maximum discount" optional hint="Caps the naira value of the %.">
                <input type="number" min={0} value={form.max_discount_amount} onChange={(event) => set('max_discount_amount', event.target.value)} placeholder="No cap" className={inputClass()} />
              </Field>
            ) : null}
            <Field label="Minimum errand amount" optional hint="Errand price before discount.">
              <input type="number" min={0} value={form.min_order_amount} onChange={(event) => set('min_order_amount', event.target.value)} placeholder="Any amount" className={inputClass()} />
            </Field>
          </div>
          {quote ? (
            <p className="rounded-[8px] bg-[#f3faf5] px-[10px] py-[8px] text-[11px] text-[#0d5e27]">
              On a {formatNaira(quote.listed)} errand the requester pays <span className="font-semibold">{formatNaira(quote.listed - quote.discount)}</span> and GoQuick funds{' '}
              <span className="font-semibold">{formatNaira(quote.discount)}</span>. Requesters always pay at least {formatNaira(MIN_PAYABLE)}.
            </p>
          ) : null}
        </Group>

        <Group title="Limits" subtitle="Codes held on unpaid errands count against these until released">
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            <Field label="Total uses" optional hint="Leave empty for unlimited." error={shown.max_redemptions}>
              <input type="number" min={1} value={form.max_redemptions} onChange={(event) => set('max_redemptions', event.target.value)} placeholder="Unlimited" className={inputClass(shown.max_redemptions)} />
            </Field>
            <Field label="Uses per requester" error={shown.max_redemptions_per_user}>
              <input
                type="number"
                min={1}
                max={100}
                value={form.max_redemptions_per_user}
                onChange={(event) => set('max_redemptions_per_user', event.target.value)}
                className={inputClass(shown.max_redemptions_per_user)}
              />
            </Field>
          </div>
        </Group>

        <Group title="Schedule" subtitle="Times are in your local time zone">
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            <Field label="Starts" optional hint="Empty means as soon as it is switched on.">
              <input type="datetime-local" value={form.starts_at} onChange={(event) => set('starts_at', event.target.value)} className={inputClass()} />
            </Field>
            <Field label="Ends" optional hint="Empty means it never expires." error={shown.expires_at}>
              <input type="datetime-local" value={form.expires_at} onChange={(event) => set('expires_at', event.target.value)} className={inputClass(shown.expires_at)} />
            </Field>
          </div>
        </Group>

        <Group title="Who can use it">
          <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3" role="radiogroup" aria-label="Audience">
            {(['all', 'new_requesters', 'specific_users'] as CouponAudience[]).map((audience) => {
              const selected = form.audience === audience;
              return (
                <button
                  key={audience}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => set('audience', audience)}
                  className={`flex flex-col gap-[4px] rounded-[10px] border p-[11px] text-left transition-colors ${
                    selected ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white hover:bg-[#fafcfa]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-[6px] text-[11px] font-semibold text-[#17211b]">
                      <span className="size-[7px] rounded-full" style={{ backgroundColor: AUDIENCE_COLORS[audience] }} />
                      {AUDIENCE_LABELS[audience]}
                    </span>
                    {selected ? <Check className="size-[13px] text-[#167d35]" strokeWidth={2.4} /> : null}
                  </span>
                  <span className="text-[10px] leading-snug text-[#7c857f]">{AUDIENCE_HINTS[audience]}</span>
                </button>
              );
            })}
          </div>
          {form.audience === 'specific_users' ? <RequesterPicker form={form} setForm={setForm} error={shown.assigned_users} /> : null}

          <div className="flex flex-col gap-[8px]">
            <p className="text-[11px] font-semibold text-[#17211b]">
              Errand types{' '}
              <span className="font-normal text-[#7c857f]">· {form.categories.length === 0 ? 'works on every type' : `only ${categoriesLabel(form.categories)}`}</span>
            </p>
            <div className="flex flex-wrap gap-[6px]">
              <button
                type="button"
                onClick={() => set('categories', [])}
                className={`rounded-full px-[10px] py-[5px] text-[10px] font-semibold ring-1 ${
                  form.categories.length === 0 ? 'bg-[#167d35] text-white ring-[#167d35]' : 'bg-white text-[#45514a] ring-[#d4ddd6] hover:bg-[#f8faf8]'
                }`}
              >
                All types
              </button>
              {categoryChoices(COUPON_CATEGORIES).map((choice) => {
                const on = choice.slugs.every((slug) => form.categories.includes(slug));
                const rest = form.categories.filter((slug) => !choice.slugs.includes(slug));
                return (
                  <button
                    key={choice.label}
                    type="button"
                    onClick={() => set('categories', on ? rest : [...rest, ...choice.slugs])}
                    className={`rounded-full px-[10px] py-[5px] text-[10px] font-semibold ring-1 ${
                      on ? 'bg-[#eaf6ed] text-[#0d5e27] ring-[#a8dcb6]' : 'bg-white text-[#45514a] ring-[#d4ddd6] hover:bg-[#f8faf8]'
                    }`}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Group>

        <button
          type="button"
          role="switch"
          aria-checked={form.is_active}
          onClick={() => set('is_active', !form.is_active)}
          className={`flex items-center justify-between gap-3 rounded-[10px] border p-[12px] text-left ${form.is_active ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white'}`}
        >
          <span className="flex flex-col">
            <span className="text-[12px] font-semibold text-[#17211b]">{form.is_active ? 'Switched on' : 'Paused'}</span>
            <span className="text-[10px] text-[#7c857f]">
              {form.is_active ? 'Requesters can apply it within the schedule above.' : 'Saved, but nobody can apply it until you resume it.'}
            </span>
          </span>
          <span className={`relative h-[20px] w-[36px] flex-shrink-0 rounded-full transition-colors ${form.is_active ? 'bg-[#167d35]' : 'bg-[#c9d2cc]'}`}>
            <span className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow transition-[left] ${form.is_active ? 'left-[18px]' : 'left-[2px]'}`} />
          </span>
        </button>
      </div>
    </Drawer>
  );
}
