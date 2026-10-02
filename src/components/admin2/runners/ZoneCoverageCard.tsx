import { ArrowRight } from 'lucide-react';
import type { AdminRunnerBoardOverview } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function ZoneCoverageCard({ overview, onOpenZones }: { overview?: AdminRunnerBoardOverview; onOpenZones?: () => void }) {
  const zones = overview?.zones;
  const rows = zones?.rows ?? [];
  const maxOnline = Math.max(1, ...rows.map((row) => row.online));
  const tightNames = rows.filter((row) => row.tight).map((row) => row.zone);

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Service-zone coverage" subtitle="Online supply against demand in this period" />
        {zones ? (
          <span
            className={`flex-shrink-0 rounded-full px-[9px] py-[4px] text-[10px] font-semibold ${
              zones.tight_count > 0 ? 'bg-[#fff5e5] text-[#b06d12]' : 'bg-[#eaf6ed] text-[#0d5e27]'
            }`}
          >
            {zones.tight_count > 0 ? 'Needs supply' : 'Balanced'}
          </span>
        ) : null}
      </div>

      {zones ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[25px] font-bold leading-none tracking-[-0.5px] text-[#17211b]">{formatPct(zones.demand_covered_pct, 0)}</p>
            <p className="mt-[4px] text-[10px] text-[#7c857f]">
              demand covered · {formatCount(zones.requests)} request{zones.requests === 1 ? '' : 's'}
            </p>
          </div>
          <p className={`text-[11px] font-semibold ${zones.tight_count > 0 ? 'text-[#b06d12]' : 'text-[#167d35]'}`}>
            {zones.tight_count > 0 ? `${zones.tight_count} zone${zones.tight_count === 1 ? '' : 's'} tight` : 'No tight zones'}
          </p>
        </div>
      ) : (
        <Skeleton className="h-[40px] w-[160px]" />
      )}

      <div className="flex flex-col gap-[12px]">
        {zones
          ? rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-[5px]" title={`${formatCount(row.runners)} assigned runners · ${formatCount(row.requests)} requests · ${formatPct(row.match_rate_pct)} matched`}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-medium text-[#17211b]">{row.zone}</span>
                  <span className="flex-shrink-0 text-[#45514a]">
                    {formatCount(row.online)} online
                    {row.requests > 0 ? <span className={row.tight ? 'text-[#b06d12]' : 'text-[#7c857f]'}> · {formatPct(row.match_rate_pct, 0)} matched</span> : null}
                  </span>
                </div>
                <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.online > 0 ? Math.max(4, (row.online / maxOnline) * 100) : 0}%`, backgroundColor: row.tight ? '#b06d12' : '#167d35' }}
                  />
                </div>
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[24px] w-full" />)}
        {zones && rows.length === 0 ? <p className="text-[11px] text-[#7c857f]">No service zones configured yet.</p> : null}
      </div>

      {zones ? (
        <div className="mt-auto flex flex-col gap-[8px]">
          <p className="text-[10px] leading-[1.5] text-[#7c857f]">
            {tightNames.length > 0
              ? `${joinNames(tightNames)} ${tightNames.length === 1 ? 'is' : 'are'} matching below ${zones.tight_match_pct}% of requests — more online runners are needed there.`
              : `Every busy zone is matching at least ${zones.tight_match_pct}% of requests.`}
          </p>
          {onOpenZones ? (
            <button type="button" onClick={onOpenZones} className="flex w-fit items-center gap-[5px] text-[11px] font-semibold text-[#167d35] hover:underline">
              Open service zones <ArrowRight className="size-[12px]" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
