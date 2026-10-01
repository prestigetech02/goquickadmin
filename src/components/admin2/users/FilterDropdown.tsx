import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type FilterOption = { value: string; label: string };

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  align = 'left',
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-[36px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] hover:bg-[#f8faf8]"
      >
        <span className="text-[10px] text-[#7c857f]">{label}</span>
        <span className="max-w-[140px] truncate text-[11px] font-semibold text-[#45514a]">{current?.label}</span>
        <ChevronDown className="size-[13px] text-[#45514a]" strokeWidth={1.8} />
      </button>
      {open ? (
        <ul
          role="listbox"
          className={`absolute top-[calc(100%+4px)] z-30 max-h-[280px] min-w-[180px] overflow-y-auto rounded-[10px] border border-[#e2e8e3] bg-white p-1 shadow-[0px_12px_32px_rgba(16,33,23,0.12)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-[7px] px-[10px] py-[7px] text-left text-[11px] ${
                    selected ? 'bg-[#eaf6ed] font-semibold text-[#0d5e27]' : 'text-[#45514a] hover:bg-[#f8faf8]'
                  }`}
                >
                  {option.label}
                  {selected ? <Check className="size-[12px]" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
