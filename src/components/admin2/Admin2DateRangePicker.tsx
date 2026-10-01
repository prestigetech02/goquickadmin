import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { ADMIN2_RANGE_PRESETS, useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { formatDateRange, toDateString } from './format';

export function Admin2DateRangePicker() {
  const { range, setPreset, setCustomRange } = useAdmin2DateRange();
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(range.start);
  const [customEnd, setCustomEnd] = useState(range.end);
  const wrapRef = useRef<HTMLDivElement>(null);
  const today = toDateString(new Date());

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setCustomStart(range.start);
      setCustomEnd(range.end);
    }
    setOpen((value) => !value);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-[40px] items-center gap-[8px] rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-left hover:bg-[#f8faf8]"
      >
        <CalendarDays className="size-[16px]" strokeWidth={1.8} color="#45514A" />
        <span className="flex flex-col gap-px leading-normal">
          <span className="text-[10px] text-[#7c857f]">Date range</span>
          <span className="whitespace-nowrap text-[11px] font-semibold text-[#17211b]">
            {formatDateRange(range.start, range.end)}
          </span>
        </span>
        <ChevronDown className="size-[14px]" strokeWidth={1.8} color="#7C857F" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose date range"
          className="absolute right-0 top-full z-50 mt-2 w-[260px] rounded-[12px] border border-[#e2e8e3] bg-white p-[8px] shadow-[0px_8px_24px_0px_rgba(16,33,23,0.12)]"
        >
          {ADMIN2_RANGE_PRESETS.map((preset) => {
            const active = range.preset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setPreset(preset.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-[8px] px-[10px] py-[8px] text-left text-[12px] ${
                  active ? 'bg-[#eaf6ed] font-semibold text-[#0d5e27]' : 'text-[#17211b] hover:bg-[#f8faf8]'
                }`}
              >
                {preset.label}
                {active ? <Check className="size-[14px]" strokeWidth={2} /> : null}
              </button>
            );
          })}

          <form
            className="mt-[6px] border-t border-[#e2e8e3] px-[4px] pt-[10px]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!customStart || !customEnd) return;
              setCustomRange(customStart, customEnd);
              setOpen(false);
            }}
          >
            <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-[0.8px] text-[#7c857f]">Custom range</p>
            <div className="flex items-center gap-[6px]">
              <input
                type="date"
                value={customStart}
                max={today}
                onChange={(event) => setCustomStart(event.target.value)}
                aria-label="Start date"
                className="min-w-0 flex-1 rounded-[6px] border border-[#d4ddd6] px-[6px] py-[5px] text-[11px] text-[#17211b] focus:border-[#167d35] focus:outline-none"
              />
              <span className="text-[11px] text-[#7c857f]">–</span>
              <input
                type="date"
                value={customEnd}
                max={today}
                onChange={(event) => setCustomEnd(event.target.value)}
                aria-label="End date"
                className="min-w-0 flex-1 rounded-[6px] border border-[#d4ddd6] px-[6px] py-[5px] text-[11px] text-[#17211b] focus:border-[#167d35] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!customStart || !customEnd}
              className="mt-[8px] w-full rounded-[8px] bg-[#167d35] py-[7px] text-[12px] font-semibold text-white hover:bg-[#126a2c] disabled:opacity-50"
            >
              Apply range
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
