import { TriangleAlert } from 'lucide-react';
import type { AdminAnalyticsOverview } from '@/types/api';
import { formatMinutes, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

function Meter({ label, value, color, hint }: { label: string; value: number | null; color: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-[6px]" title={hint}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#45514a]">{label}</span>
        <span className="font-semibold text-[#17211b]">{formatPct(value)}</span>
      </div>
      <span className="h-[5px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, backgroundColor: color }} />
      </span>
    </div>
  );
}

export function FulfillmentCard({ overview }: { overview?: AdminAnalyticsOverview }) {
  const data = overview?.fulfillment;
  const change = data?.median_change_minutes;
  const target = overview?.kpis.cancellation.target_pct;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Fulfillment & cancellation" subtitle="Actionable service-level signals" />
      {data ? (
        <>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[10px] text-[#7c857f]">Median request-to-completion time</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{formatMinutes(data.median_minutes)}</p>
              {change != null && change !== 0 ? (
                <span
                  className={`rounded-full px-[7px] py-[3px] text-[10px] font-bold ${change < 0 ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#fdeded] text-[#b84545]'}`}
                  title="Against the previous period"
                >
                  {change > 0 ? '+' : '−'}
                  {formatMinutes(Math.abs(change))} vs previous
                </span>
              ) : null}
            </div>
          </div>
          <Meter label={`Matched in under ${data.fast_match_minutes}m`} value={data.fast_match_pct} color="#167d35" hint="Share of matched errands accepted within minutes of the request" />
          <Meter label="Completed within quoted ETA" value={data.on_time_pct} color="#3478b7" hint="Errands with an estimate, completed within it plus a 15-minute grace" />
          <Meter label="Overall cancellation" value={data.cancellation_rate_pct} color="#b06d12" />
          {data.cancellation_hotspot ? (
            <div className="mt-auto flex items-start gap-[8px] rounded-[8px] bg-[#fff5e5] px-[12px] py-[9px] text-[10px] leading-[1.5] text-[#8a5410]">
              <TriangleAlert className="mt-[1px] size-[14px] flex-shrink-0" strokeWidth={1.8} />
              <span>
                {data.cancellation_hotspot.zone} has the highest cancellation rate at {formatPct(data.cancellation_hotspot.rate_pct)} across{' '}
                {data.cancellation_hotspot.requested} requests{target != null ? `, above the ${formatPct(target)} target` : ''}.
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-[12px]">
          <Skeleton className="h-[40px] w-[120px]" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[24px] w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}
