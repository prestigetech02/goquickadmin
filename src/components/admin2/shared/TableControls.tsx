import { CalendarDays, Search, X } from 'lucide-react';

export function CardTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ value: T; label: string; count?: number | null }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-[3px] overflow-x-auto overflow-y-hidden border-b border-[#e2e8e3] px-[16px]" role="tablist">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`-mb-px flex flex-shrink-0 items-center gap-[6px] border-b-2 px-[13px] py-[10px] text-[12px] ${
              active ? 'border-[#167d35] font-semibold text-[#0d5e27]' : 'border-transparent font-medium text-[#45514a] hover:text-[#17211b]'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 ? (
              <span
                className={`rounded-full px-[6px] py-[2px] text-[9px] font-semibold ${
                  active ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#f8faf8] text-[#7c857f]'
                }`}
              >
                {tab.count.toLocaleString('en-NG')}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  minWidthClass = 'min-w-[240px]',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minWidthClass?: string;
}) {
  return (
    <label className={`flex h-[36px] ${minWidthClass} flex-1 items-center gap-[8px] rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] px-[11px] focus-within:border-[#167d35]`}>
      <Search className="size-[15px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[11px] text-[#17211b] outline-none placeholder:text-[#7c857f]"
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="text-[#7c857f] hover:text-[#17211b]">
          <X className="size-[13px]" />
        </button>
      ) : null}
    </label>
  );
}

/** Switch that scopes a table to the top-bar date range. */
export function DateRangeToggle({
  label,
  on,
  rangeLabel,
  onToggle,
}: {
  label: string;
  on: boolean;
  rangeLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title={on ? `Showing ${rangeLabel}. Click to show all dates.` : 'Showing all dates. Click to use the selected date range.'}
      className={`flex h-[36px] flex-shrink-0 items-center gap-[8px] rounded-[8px] border px-[10px] ${
        on ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#d4ddd6] bg-white hover:bg-[#f8faf8]'
      }`}
    >
      <CalendarDays className={`size-[14px] ${on ? 'text-[#167d35]' : 'text-[#7c857f]'}`} strokeWidth={1.8} />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] text-[#7c857f]">{label}</span>
        <span className={`text-[10px] font-semibold ${on ? 'text-[#0d5e27]' : 'text-[#45514a]'}`}>{on ? rangeLabel : 'All dates'}</span>
      </span>
      <span className={`relative h-[18px] w-[32px] flex-shrink-0 rounded-full transition-colors ${on ? 'bg-[#167d35]' : 'bg-[#c9d2cc]'}`}>
        <span
          className={`absolute top-[2px] size-[14px] rounded-full bg-white shadow transition-[left] ${on ? 'left-[16px]' : 'left-[2px]'}`}
        />
      </span>
    </button>
  );
}

export type Notice = { tone: 'ok' | 'error'; text: string };

export function NoticeBar({ notice, onDismiss, inline = false }: { notice: Notice | null; onDismiss: () => void; inline?: boolean }) {
  if (!notice) return null;
  const tone = notice.tone === 'ok' ? 'bg-[#eaf6ed] text-[#0d5e27]' : 'bg-[#fdeded] text-[#b84545]';
  return (
    <div
      className={`flex items-center justify-between gap-3 text-[11px] font-medium ${tone} ${
        inline ? 'border-b border-[#e2e8e3] px-[16px] py-[8px]' : 'rounded-[8px] px-3 py-2'
      }`}
    >
      {notice.text}
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        <X className="size-[13px]" />
      </button>
    </div>
  );
}

export const TABLE_HEADER = 'h-[40px] bg-[#f8faf8] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]';
