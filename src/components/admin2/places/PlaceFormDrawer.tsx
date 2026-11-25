import { useMemo, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { PlaceImageGallery } from './PlaceImageGallery';
import { PlaceMapPicker } from './PlaceMapPicker';
import {
  DEFAULT_MAP_CENTER,
  EMPTY_PLACE_FORM,
  NIGERIA_STATES,
  formProblems,
  placeToForm,
  type AdminPlace,
  type AdminPlaceCategory,
  type PlaceForm,
} from './presentation';
import { savePlace } from './placesStore';

export type PlaceFormMode = { kind: 'create' } | { kind: 'edit'; place: AdminPlace };

const INPUT =
  'h-[38px] w-full rounded-[8px] border bg-white px-[10px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]';

function inputClass(error?: string) {
  return `${INPUT} ${error ? 'border-[#e5a5a5]' : 'border-[#d4ddd6]'}`;
}

function Field({
  label,
  hint,
  error,
  children,
  optional = false,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[11px] font-semibold text-[#17211b]">
        {label}
        {optional ? <span className="font-normal text-[#a3aca6]"> · optional</span> : null}
      </span>
      {children}
      {error ? <span className="text-[10px] text-[#b84545]">{error}</span> : hint ? <span className="text-[10px] text-[#7c857f]">{hint}</span> : null}
    </div>
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

function initialForm(mode: PlaceFormMode): PlaceForm {
  if (mode.kind === 'edit') return placeToForm(mode.place);
  return {
    ...EMPTY_PLACE_FORM,
    latitude: String(DEFAULT_MAP_CENTER.latitude),
    longitude: String(DEFAULT_MAP_CENTER.longitude),
  };
}

export function PlaceFormDrawer({
  mode,
  categories,
  onClose,
  onSaved,
}: {
  mode: PlaceFormMode;
  categories: AdminPlaceCategory[];
  onClose: () => void;
  onSaved: (place: AdminPlace, mode: PlaceFormMode) => void;
}) {
  const [form, setForm] = useState<PlaceForm>(() => {
    const base = initialForm(mode);
    const active = categories.filter((item) => item.is_active);
    if (mode.kind === 'create' && active.length > 0 && !active.some((item) => item.slug === base.category)) {
      return { ...base, category: active[0].slug };
    }
    return base;
  });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const active = categories.filter((item) => item.is_active);
    const current = categories.find((item) => item.slug === form.category);
    if (current && !current.is_active) return [current, ...active.filter((item) => item.slug !== current.slug)];
    return active;
  }, [categories, form.category]);

  const selectedCategory = categories.find((item) => item.slug === form.category);

  const problems = useMemo(() => (touched ? formProblems(form) : {}), [form, touched]);
  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const mapLat = Number.isFinite(lat) ? lat : DEFAULT_MAP_CENTER.latitude;
  const mapLng = Number.isFinite(lng) ? lng : DEFAULT_MAP_CENTER.longitude;

  const set = <K extends keyof PlaceForm>(key: K, value: PlaceForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    setTouched(true);
    const nextProblems = formProblems(form);
    if (Object.keys(nextProblems).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const place = savePlace(form, mode.kind === 'edit' ? mode.place.id : undefined);
      onSaved(place, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this place.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="2xl"
      title={mode.kind === 'edit' ? 'Edit place' : 'Add place'}
      subtitle="Photos, description, address, and a map pin. Requesters will use this when starting an errand from Explore."
      footer={
        <div className="flex items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-[38px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
          >
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? 'Saving…' : mode.kind === 'edit' ? 'Save changes' : 'Add place'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-[18px] font-inter">
        {error ? <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{error}</p> : null}

        <Group title="Basics" subtitle="What requesters see in Explore Places.">
          <Field label="Place name" error={problems.name}>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. ABC Supermarket Yaba"
              className={inputClass(problems.name)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            <Field
              label="Category"
              error={problems.category}
              hint={selectedCategory?.description || (categoryOptions.length === 0 ? 'Add a category in the Categories tab first.' : undefined)}
            >
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputClass(problems.category)}
                disabled={categoryOptions.length === 0}
              >
                {categoryOptions.length === 0 ? <option value="">No categories</option> : null}
                {categoryOptions.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                    {category.is_active ? '' : ' (paused)'}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Phone" optional hint="Shown to runners if useful for the stop.">
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0803…"
                className={inputClass()}
              />
            </Field>
          </div>

          <Field
            label="Description"
            error={problems.description}
            hint="Shown on the place detail before Create errand."
          >
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="What this place is useful for, hours tip, what runners usually pick up…"
              className={`w-full rounded-[8px] border bg-white px-[10px] py-[8px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35] ${
                problems.description ? 'border-[#e5a5a5]' : 'border-[#d4ddd6]'
              }`}
            />
          </Field>

          <Field label="Internal notes" optional hint="Only for admins — not shown in the app.">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Entrance tip, busy hours…"
              className="w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] py-[8px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]"
            />
          </Field>

          <label className="flex items-center gap-[10px] rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] px-[12px] py-[10px]">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="size-[15px] accent-[#167d35]"
            />
            <span className="flex flex-col">
              <span className="text-[12px] font-semibold text-[#17211b]">Active in Explore</span>
              <span className="text-[10px] text-[#7c857f]">Paused places stay in admin but hide from requesters.</span>
            </span>
          </label>
        </Group>

        <Group title="Photos" subtitle="Add several shots of the storefront or entrance. The first one is the cover.">
          <PlaceImageGallery images={form.images} onChange={(images) => set('images', images)} error={problems.images} />
        </Group>

        <Group
          title="Location"
          subtitle="Structured fields for filters, then pin the exact spot on the map for Create errand."
        >
          <Field label="Address line" error={problems.address_line} hint="Street, building, or landmark only.">
            <input
              value={form.address_line}
              onChange={(e) => set('address_line', e.target.value)}
              placeholder="e.g. Herbert Macaulay Way"
              className={inputClass(problems.address_line)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
            <Field label="Area" error={problems.area} hint="Neighbourhood people search for.">
              <input
                value={form.area}
                onChange={(e) => set('area', e.target.value)}
                placeholder="e.g. Yaba"
                className={inputClass(problems.area)}
              />
            </Field>
            <Field label="City / LGA" error={problems.city}>
              <input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="e.g. Ikeja"
                className={inputClass(problems.city)}
              />
            </Field>
            <Field label="State" error={problems.state}>
              <select value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass(problems.state)}>
                <option value="">Select state</option>
                {NIGERIA_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
                {form.state && !(NIGERIA_STATES as readonly string[]).includes(form.state) ? (
                  <option value={form.state}>{form.state}</option>
                ) : null}
              </select>
            </Field>
          </div>

          <PlaceMapPicker
            latitude={mapLat}
            longitude={mapLng}
            onMove={(nextLat, nextLng) => {
              setForm((prev) => ({
                ...prev,
                latitude: nextLat.toFixed(6),
                longitude: nextLng.toFixed(6),
              }));
            }}
          />

          <div className="grid grid-cols-2 gap-[10px]">
            <Field label="Latitude" error={problems.latitude}>
              <input
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                inputMode="decimal"
                className={inputClass(problems.latitude)}
              />
            </Field>
            <Field label="Longitude" error={problems.longitude}>
              <input
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                inputMode="decimal"
                className={inputClass(problems.longitude)}
              />
            </Field>
          </div>
        </Group>
      </div>
    </Drawer>
  );
}
