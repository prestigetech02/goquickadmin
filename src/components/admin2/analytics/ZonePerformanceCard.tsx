import { Map as MapIcon } from 'lucide-react';
import type { AdminAnalyticsOverview } from '@/types/api';
import { Chip } from '../errand/parts';
import { formatCount, formatMinutes, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { TABLE_HEADER } from '../shared/TableControls';
import { HEALTH_META } from './presentation';

const MAX_ROWS = 6;
const GRID = 'grid grid-cols-[minmax(110px,1.4fr)_56px_64px_60px_64px_78px] items-center gap-x-[10px] px-[16px]';

export function ZonePerformanceCard({
  overview,
  onSelect,
  onOpenZones,
}: {
  overview?: AdminAnalyticsOverview;
  onSelect: (zone: string) => void;
  onOpenZones?: () => void;
}) {
  const rows = (overview?.zones ?? []).slice(0, MAX_ROWS);

  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-[18px] pb-[12px] pt-[18px]">
        <CardTitle title="Service-zone performance" subtitle="Demand, completion speed and operational quality by zone" />
        {onOpenZones ? (
          <button
            type="button"
            onClick={onOpenZones}
            className="flex h-[32px] flex-shrink-0 items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            <MapIcon className="size-[13px]" strokeWidth={1.8} />
            View zone map
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className={`${GRID} ${TABLE_HEADER}`}>
            <span>Zone</span>
            <span className="text-right">Jobs</span>
            <span className="text-right">Matched</span>
            <span className="text-right">Median</span>
            <span className="text-right">Cancel</span>
            <span>Health</span>
          </div>
          {!overview
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`${GRID} h-[46px] border-b border-[#e2e8e3]`}>
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[44px]" />
                  ))}
                </div>
              ))
            : null}
          {overview && rows.length === 0 ? (
            <p className="px-[16px] py-[28px] text-center text-[11px] text-[#7c857f]">No errands requested in this period.</p>
          ) : null}
          {rows.map((row) => {
            const zone = row.zone;
            const health = HEALTH_META[row.health];
            return (
              <div
                key={zone ?? 'unassigned'}
                role={zone ? 'button' : undefined}
                tabIndex={zone ? 0 : undefined}
                onClick={zone ? () => onSelect(zone) : undefined}
                onKeyDown={zone ? (event) => event.key === 'Enter' && onSelect(zone) : undefined}
                className={`${GRID} h-[46px] border-b border-[#e2e8e3] last:border-b-0 ${zone ? 'cursor-pointer hover:bg-[#fafcfa]' : ''}`}
                title={`${formatCount(row.runners)} active runners · show categories for this zone`}
              >
                <span className={`truncate text-[11px] font-semibold ${zone ? 'text-[#17211b]' : 'text-[#7c857f]'}`}>{zone ?? 'Unassigned'}</span>
                <span className="text-right text-[11px] text-[#17211b]">{formatCount(row.jobs)}</span>
                <span className="text-right text-[11px] text-[#45514a]">{formatPct(row.match_rate_pct)}</span>
                <span className="text-right text-[11px] text-[#45514a]">{formatMinutes(row.median_minutes)}</span>
                <span className="text-right text-[11px] text-[#45514a]">{formatPct(row.cancellation_rate_pct)}</span>
                <span title={health.hint}>
                  <Chip tone={health.tone} label={health.label} dot />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
