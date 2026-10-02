import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdminErrandType, updateAdminErrandType } from '@/api/adminErrandTypesApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminErrandType, ErrandTypeInput } from '@/types/api';
import { DROPOFF_LABELS, ERRAND_TYPE_ICONS } from './errandTypeIcons';
import { Switch } from './parts';
import { FIELD } from './presentation';

export function ErrandTypeModal({
  open,
  type,
  icons,
  onClose,
}: {
  open: boolean;
  /** null adds a new type */
  type: AdminErrandType | null;
  icons: string[];
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={type ? `Edit ${type.name}` : 'Add errand type'} size="md">
      {open ? <ErrandTypeForm key={type?.slug ?? 'new'} type={type} icons={icons} onClose={onClose} /> : null}
    </Modal>
  );
}

function ErrandTypeForm({ type, icons, onClose }: { type: AdminErrandType | null; icons: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ErrandTypeInput>({
    name: type?.name ?? '',
    slug: '',
    icon: type?.icon && icons.includes(type.icon) ? type.icon : (icons[0] ?? 'puzzle-piece'),
    description: type?.description ?? '',
    is_active: type?.is_active ?? true,
    sort_order: type?.sort_order ?? null,
  });
  const set = <K extends keyof ErrandTypeInput>(key: K, value: ErrandTypeInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const input: ErrandTypeInput = {
        ...form,
        name: form.name.trim(),
        slug: form.slug?.trim() || undefined,
        description: form.description?.trim() || null,
      };
      return type ? updateAdminErrandType(type.slug, input) : createAdminErrandType(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.errandTypes });
      onClose();
    },
  });

  const valid = form.name.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-[14px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate();
      }}
    >
      <Field label="Name shown in the app">
        <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={60} placeholder="e.g. Pharmacy run" className={FIELD} autoFocus />
      </Field>

      {type ? (
        <p className="rounded-[8px] bg-[#f8faf8] px-[12px] py-[9px] text-[11px] text-[#45514a]">
          Code <span className="font-mono font-semibold text-[#17211b]">{type.slug}</span> is saved on every errand of this type and can't be changed, so
          reports stay accurate after a rename.
        </p>
      ) : (
        <Field label="Code (optional)" help="Used for reporting. Leave blank to create one from the name. It can't be changed later.">
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
            maxLength={40}
            placeholder="e.g. pharmacy_run"
            className={`${FIELD} font-mono`}
          />
        </Field>
      )}

      <Field label="Short description">
        <input
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          maxLength={160}
          placeholder="Shown under the name in the app"
          className={FIELD}
        />
      </Field>

      <div className="flex flex-col gap-[6px]">
        <span className="text-[11px] font-semibold text-[#45514a]">Icon</span>
        <div className="grid grid-cols-6 gap-[6px]" role="group" aria-label="Icon">
          {icons.map((key) => {
            const meta = ERRAND_TYPE_ICONS[key];
            if (!meta) return null;
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
                className={`flex h-[38px] items-center justify-center rounded-[8px] border ${on ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] text-[#45514a] hover:bg-[#f8faf8]'}`}
              >
                <Icon className="size-[16px]" strokeWidth={1.8} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <Field label="Position" help="Lower numbers appear first.">
          <input
            type="number"
            min={0}
            max={999}
            value={form.sort_order ?? ''}
            onChange={(e) => set('sort_order', e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))))}
            placeholder="Last"
            className={FIELD}
          />
        </Field>
        <div className="flex flex-col gap-[6px]">
          <span className="text-[11px] font-semibold text-[#45514a]">Locations</span>
          <p className="flex h-[36px] items-center text-[12px] text-[#45514a]">{DROPOFF_LABELS[type?.dropoff ?? 'required']}</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] p-[12px]">
        <div className="flex flex-col gap-[3px]">
          <span className="text-[12px] font-semibold text-[#17211b]">Show in the requester app</span>
          <span className="text-[10px] leading-[1.45] text-[#7c857f]">
            {type?.legacy
              ? 'Switched-off types disappear from the app. Older app versions may still offer this built-in type, so its errands are still accepted.'
              : 'Switched-off types disappear from the app; past errands keep their name.'}
          </span>
        </div>
        <Switch checked={form.is_active} onChange={(value) => set('is_active', value)} label="Show in the requester app" />
      </div>

      {!type ? (
        <p className="text-[10px] leading-[1.45] text-[#7c857f]">
          New types use the general errand form with a pickup and a drop-off location, and the standard runner steps.
        </p>
      ) : null}

      {save.isError ? <p className="text-[11px] font-medium text-[#b84545]">{getApiErrorMessage(save.error, 'Could not save this errand type.')}</p> : null}

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
          {save.isPending ? 'Saving…' : type ? 'Save changes' : 'Add type'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[11px] font-semibold text-[#45514a]">{label}</span>
      {children}
      {help ? <span className="text-[10px] leading-[1.45] text-[#7c857f]">{help}</span> : null}
    </label>
  );
}
