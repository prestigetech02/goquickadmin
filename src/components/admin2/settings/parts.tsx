import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, Skeleton } from '../overview/primitives';
import { FIELD, type SettingsSectionId } from './presentation';

export function SettingsCard({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: SettingsSectionId;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id={`settings-${id}`} data-settings-section={id} className="flex min-w-0 flex-1 scroll-mt-[90px] flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-[#eef1ee] px-[18px] py-[14px]">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <p className="text-[14px] font-semibold text-[#17211b]">{title}</p>
          <p className="text-[11px] text-[#7c857f]">{subtitle}</p>
        </div>
        {action ? <div className="flex flex-shrink-0 items-center gap-[8px]">{action}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-[14px] px-[18px] py-[16px]">{children}</div>
    </Card>
  );
}

export function NumberField({
  label,
  help,
  value,
  onChange,
  suffix,
  prefix,
  min,
  max,
  step = 1,
  disabled,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[11px] font-semibold text-[#45514a]">{label}</span>
      <span className="relative flex items-center">
        {prefix ? <span className="pointer-events-none absolute left-[11px] text-[12px] text-[#7c857f]">{prefix}</span> : null}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          className={`${FIELD} ${prefix ? 'pl-[26px]' : ''} ${suffix ? 'pr-[64px]' : ''}`}
        />
        {suffix ? <span className="pointer-events-none absolute right-[11px] text-[11px] text-[#7c857f]">{suffix}</span> : null}
      </span>
      {help ? <span className="text-[10px] leading-[1.45] text-[#7c857f]">{help}</span> : null}
    </label>
  );
}

export function ToggleRow({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-[12px] font-semibold text-[#17211b]">{label}</span>
        {help ? <span className="text-[10px] leading-[1.45] text-[#7c857f]">{help}</span> : null}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[20px] w-[36px] flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-[#167d35]' : 'bg-[#cfd8d1]'}`}
    >
      <span className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
    </button>
  );
}

/** Per-section footer: change history on the left, discard/save on the right. */
export function SaveFooter(props: Parameters<typeof SaveControls>[0]) {
  return (
    <div className="-mx-[18px] -mb-[16px] mt-auto border-t border-[#eef1ee] px-[18px] py-[12px]">
      <SaveControls {...props} />
    </div>
  );
}

function SaveControls({
  meta,
  dirty,
  saving,
  saved,
  error,
  invalid,
  onDiscard,
  onSave,
  extra,
}: {
  meta?: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error?: string | null;
  invalid?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-[2px]">
        {error ? (
          <p className="text-[11px] font-medium text-[#b84545]">{error}</p>
        ) : saved && !dirty ? (
          <p className="flex items-center gap-[5px] text-[11px] font-medium text-[#0d5e27]">
            <CheckCircle2 className="size-[13px]" strokeWidth={2} />
            Saved
          </p>
        ) : meta ? (
          <p className="text-[10px] text-[#7c857f]">{meta}</p>
        ) : null}
        {extra}
      </div>
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={onDiscard}
          disabled={!dirty || saving}
          className="h-[32px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving || invalid}
          className="h-[32px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

export function FieldSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-[6px]">
          <Skeleton className="h-[12px] w-[110px]" />
          <Skeleton className="h-[36px] w-full" />
        </div>
      ))}
    </div>
  );
}

export function LoadError({ text }: { text: string }) {
  return <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{text}</p>;
}
