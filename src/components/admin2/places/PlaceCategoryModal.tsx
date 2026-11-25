import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { PLACE_CATEGORY_ICON_KEYS, PLACE_CATEGORY_ICONS } from './placeCategoryIcons';
import { createAdminPlaceCategory, updateAdminPlaceCategory } from '@/api/adminPlacesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import {
  categoryFormProblems,
  categoryToForm,
  slugifyCategory,
  type AdminPlaceCategory,
  type PlaceCategoryForm,
} from './presentation';

const FIELD =
  'h-[38px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]';

export function PlaceCategoryModal({
  open,
  category,
  existingSlugs,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null adds a new category */
  category: AdminPlaceCategory | null;
  existingSlugs: string[];
  onClose: () => void;
  onSaved: (category: AdminPlaceCategory, mode: 'create' | 'edit') => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={category ? `Edit ${category.name}` : 'Add category'} size="md">
      {open ? (
        <CategoryForm
          key={category?.id ?? 'new'}
          category={category}
          existingSlugs={existingSlugs}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Modal>
  );
}

function CategoryForm({
  category,
  existingSlugs,
  onClose,
  onSaved,
}: {
  category: AdminPlaceCategory | null;
  existingSlugs: string[];
  onClose: () => void;
  onSaved: (category: AdminPlaceCategory, mode: 'create' | 'edit') => void;
}) {
  const [form, setForm] = useState<PlaceCategoryForm>(() =>
    category
      ? categoryToForm(category)
      : { name: '', slug: '', description: '', icon: 'store', is_active: true },
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = useMemo(
    () =>
      touched
        ? categoryFormProblems(form, {
            existingSlugs,
            editingSlug: category?.slug,
          })
        : {},
    [form, touched, existingSlugs, category?.slug],
  );

  const set = <K extends keyof PlaceCategoryForm>(key: K, value: PlaceCategoryForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setTouched(true);
    const nextProblems = categoryFormProblems(form, {
      existingSlugs,
      editingSlug: category?.slug,
    });
    if (Object.keys(nextProblems).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const payload: PlaceCategoryForm = {
        ...form,
        name: form.name.trim(),
        slug: category ? category.slug : form.slug.trim() || slugifyCategory(form.name),
        description: form.description.trim(),
      };
      const saved = category
        ? await updateAdminPlaceCategory(category.id, payload)
        : await createAdminPlaceCategory(payload);
      onSaved(saved, category ? 'edit' : 'create');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save this category.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-[14px] font-inter">
      {error ? <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{error}</p> : null}

      <label className="flex flex-col gap-[6px]">
        <span className="text-[11px] font-semibold text-[#45514a]">Name shown in Explore</span>
        <input
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            setForm((prev) => ({
              ...prev,
              name,
              slug: category ? prev.slug : prev.slug || slugifyCategory(name),
            }));
          }}
          maxLength={60}
          placeholder="e.g. Pharmacy"
          className={`${FIELD} ${problems.name ? 'border-[#e5a5a5]' : ''}`}
          autoFocus
        />
        {problems.name ? <span className="text-[10px] text-[#b84545]">{problems.name}</span> : null}
      </label>

      {category ? (
        <p className="rounded-[8px] bg-[#f8faf8] px-[12px] py-[9px] text-[11px] text-[#45514a]">
          Code <span className="font-mono font-semibold text-[#17211b]">{category.slug}</span> is saved on every place in this
          category and can’t be changed, so Explore and reports stay accurate after a rename.
        </p>
      ) : (
        <label className="flex flex-col gap-[6px]">
          <span className="text-[11px] font-semibold text-[#45514a]">Code (optional)</span>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
            maxLength={40}
            placeholder="e.g. pharmacy"
            className={`${FIELD} font-mono ${problems.slug ? 'border-[#e5a5a5]' : ''}`}
          />
          {problems.slug ? (
            <span className="text-[10px] text-[#b84545]">{problems.slug}</span>
          ) : (
            <span className="text-[10px] text-[#7c857f]">Leave blank to create one from the name. It can’t be changed later.</span>
          )}
        </label>
      )}

      <label className="flex flex-col gap-[6px]">
        <span className="text-[11px] font-semibold text-[#45514a]">Short description</span>
        <input
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={160}
          placeholder="Shown under the name in Explore filters"
          className={FIELD}
        />
      </label>

      <div className="flex flex-col gap-[6px]">
        <span className="text-[11px] font-semibold text-[#45514a]">Icon</span>
        <div className="grid grid-cols-5 gap-[6px]" role="group" aria-label="Icon">
          {PLACE_CATEGORY_ICON_KEYS.map((key) => {
            const meta = PLACE_CATEGORY_ICONS[key];
            const Icon = meta.icon;
            const on = form.icon === key;
            return (
              <button
                key={key}
                type="button"
                title={meta.label}
                aria-label={meta.label}
                aria-pressed={on}
                onClick={() => set('icon', key)}
                className={`flex h-[38px] items-center justify-center rounded-[8px] border ${
                  on ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] text-[#45514a] hover:bg-[#f8faf8]'
                }`}
              >
                <Icon className="size-[16px]" strokeWidth={1.8} />
              </button>
            );
          })}
        </div>
        {problems.icon ? <span className="text-[10px] text-[#b84545]">{problems.icon}</span> : null}
      </div>

      <label className="flex items-center gap-[10px] rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] px-[12px] py-[10px]">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
          className="size-[15px] accent-[#167d35]"
        />
        <span className="flex flex-col">
          <span className="text-[12px] font-semibold text-[#17211b]">Active in Explore</span>
          <span className="text-[10px] text-[#7c857f]">Paused categories hide from new places and Explore filters.</span>
        </span>
      </label>

      <div className="flex justify-end gap-[8px] pt-[4px]">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} className={PRIMARY_BUTTON}>
          {saving ? 'Saving…' : category ? 'Save changes' : 'Add category'}
        </button>
      </div>
    </div>
  );
}
