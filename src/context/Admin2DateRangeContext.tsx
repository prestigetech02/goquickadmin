import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { toDateString } from '@/components/admin2/format';

export type Admin2RangePreset = 'this_week' | 'this_month' | 'last_7' | 'last_30' | 'last_month' | 'custom';

export type Admin2DateRange = {
  preset: Admin2RangePreset;
  start: string;
  end: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export const ADMIN2_RANGE_PRESETS: Array<{ key: Exclude<Admin2RangePreset, 'custom'>; label: string }> = [
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_7', label: 'Last 7 days' },
  { key: 'last_30', label: 'Last 30 days' },
  { key: 'last_month', label: 'Last month' },
];

// eslint-disable-next-line react-refresh/only-export-components
export function rangeForPreset(preset: Exclude<Admin2RangePreset, 'custom'>, today = new Date()): Admin2DateRange {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);

  switch (preset) {
    case 'this_week': {
      const mondayOffset = (end.getDay() + 6) % 7;
      start.setDate(end.getDate() - mondayOffset);
      break;
    }
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_7':
      start.setDate(end.getDate() - 6);
      break;
    case 'last_30':
      start.setDate(end.getDate() - 29);
      break;
    case 'last_month': {
      const first = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 0);
      return { preset, start: toDateString(first), end: toDateString(last) };
    }
  }

  return { preset, start: toDateString(start), end: toDateString(end) };
}

type Admin2DateRangeContextValue = {
  range: Admin2DateRange;
  setPreset: (preset: Exclude<Admin2RangePreset, 'custom'>) => void;
  setCustomRange: (start: string, end: string) => void;
};

const Admin2DateRangeContext = createContext<Admin2DateRangeContextValue | null>(null);

export function Admin2DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<Admin2DateRange>(() => rangeForPreset('this_month'));

  const value = useMemo<Admin2DateRangeContextValue>(
    () => ({
      range,
      setPreset: (preset) => setRange(rangeForPreset(preset)),
      setCustomRange: (start, end) =>
        setRange(start <= end ? { preset: 'custom', start, end } : { preset: 'custom', start: end, end: start }),
    }),
    [range],
  );

  return <Admin2DateRangeContext.Provider value={value}>{children}</Admin2DateRangeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin2DateRange() {
  const context = useContext(Admin2DateRangeContext);
  if (!context) throw new Error('useAdmin2DateRange must be used inside Admin2DateRangeProvider');
  return context;
}
