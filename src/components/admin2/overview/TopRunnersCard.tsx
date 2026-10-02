import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ADMIN2_RANGE_PRESETS, useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { canAccessPage, getAdmin2RunnerHref } from '@/lib/adminNavigation';
import type { DashboardOverview } from '@/types/api';
import { formatNaira, formatCount, formatDateRange, formatMinutes, formatPct, parseDate, personInitials } from '../format';
import { Card, CardTitle, Skeleton } from './primitives';

const PERIOD_OPTIONS = ADMIN2_RANGE_PRESETS.filter((preset) => ['this_week', 'this_month', 'last_30'].includes(preset.key));
const PERIOD_LABELS: Record<string, string> = { this_week: 'Weekly', this_month: 'Monthly', last_30: '30 days' };

function periodSubtitle(start: string, end: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${e.toLocaleDateString('en-GB', { month: 'long' })} performance`;
  }
  return `${formatDateRange(start, end)} performance`;
}

export function TopRunnersCard({ data }: { data?: DashboardOverview }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { range, setPreset } = useAdmin2DateRange();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canOpenRunner = canAccessPage(user, 'admin2-runner');

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const runners = data?.top_runners;
  const quality = data?.quality;

  return (
    <Card className="flex w-full flex-shrink-0 flex-col gap-[14px] p-[16px] xl:w-[328px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Top runners" subtitle={periodSubtitle(range.start, range.end)} />
        <div ref={wrapRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-[4px] rounded-[6px] bg-[#f8faf8] px-[8px] py-[5px] text-[10px] font-semibold text-[#45514a] hover:bg-[#eef1ee]"
          >
            {PERIOD_LABELS[range.preset] ?? 'Custom'}
            <ChevronDown className="size-[12px]" strokeWidth={1.8} />
          </button>
          {open ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-[140px] overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-white py-1 shadow-[0px_8px_24px_0px_rgba(16,33,23,0.12)]">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setPreset(option.key);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-[#17211b] hover:bg-[#f8faf8]"
                >
                  {option.label}
                  {range.preset === option.key ? <Check className="size-[13px] text-[#167d35]" strokeWidth={2} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[8px]">
        {runners == null ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[66px] w-full" />)
        ) : runners.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-[8px] bg-[#f8faf8] p-[16px] text-center text-[11px] text-[#7c857f]">
            No completed errands in this period yet.
          </div>
        ) : (
          runners.map((runner, index) => {
            const first = index === 0;
            return (
              <button
                key={runner.id}
                type="button"
                disabled={!canOpenRunner}
                onClick={() => navigate(getAdmin2RunnerHref(runner.id))}
                className="flex w-full flex-col gap-[8px] rounded-[8px] bg-[#f8faf8] p-[10px] text-left transition-colors enabled:hover:bg-[#eef3ef]"
              >
                <span className="flex w-full items-center gap-[8px]">
                  <span
                    className={`flex size-[19px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      first ? 'bg-[#fff5e5] text-[#b06d12]' : 'border border-[#e2e8e3] bg-white text-[#7c857f]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex size-[29px] flex-shrink-0 items-center justify-center rounded-full bg-[#eaf6ed] text-[10px] font-bold text-[#167d35]">
                    {personInitials(runner.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="truncate text-[11px] font-semibold text-[#17211b]">{runner.name}</span>
                    <span className="text-[10px] text-[#7c857f]">
                      {formatCount(runner.completed_errands)} errand{runner.completed_errands === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-[3px] text-[11px] font-semibold text-[#17211b]">
                    <Star className="size-[12px]" strokeWidth={1.3} color="#B06D12" fill={runner.rating != null ? '#B06D12' : 'none'} />
                    {runner.rating != null ? runner.rating.toFixed(2) : '—'}
                  </span>
                </span>
                <span className="flex w-full items-center gap-[8px] pl-[27px]">
                  <span className="text-[10px] text-[#7c857f]">On-time</span>
                  <span className="relative h-[5px] w-[68px] flex-shrink-0 overflow-hidden rounded-full bg-[#e2e8e3]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-[#167d35]"
                      style={{ width: `${runner.on_time_pct ?? 0}%` }}
                    />
                  </span>
                  <span className="text-[10px] font-semibold text-[#17211b]">
                    {runner.on_time_pct != null ? `${Math.round(runner.on_time_pct)}%` : '—'}
                  </span>
                  <span className="ml-auto text-[11px] font-bold text-[#17211b]">{formatNaira(runner.earnings)}</span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-[#e2e8e3] pt-[12px]">
        {[
          { label: 'Avg. rating', value: quality?.avg_rating != null ? quality.avg_rating.toFixed(2) : '—' },
          { label: 'Dispute rate', value: quality ? formatPct(quality.dispute_rate_pct) : '—' },
          { label: 'Avg. match', value: quality ? formatMinutes(quality.avg_match_minutes) : '—' },
        ].map((metric, index) => (
          <div key={metric.label} className={`flex flex-col gap-[2px] ${index > 0 ? 'border-l border-[#e2e8e3] pl-[12px]' : ''}`}>
            <p className="text-[13px] font-bold text-[#17211b]">{metric.value}</p>
            <p className="text-[10px] text-[#7c857f]">{metric.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
