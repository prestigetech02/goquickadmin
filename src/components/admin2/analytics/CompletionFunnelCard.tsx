import type { AdminAnalyticsOverview } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { plural } from '../shared/helpers';
import { FUNNEL_COLORS } from './presentation';

export function CompletionFunnelCard({ overview }: { overview?: AdminAnalyticsOverview }) {
  const funnel = overview?.funnel;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:w-[340px] xl:flex-shrink-0">
      <CardTitle title="Completion funnel" subtitle="Errands requested this period, by furthest stage" />
      <div className="flex flex-1 flex-col justify-center gap-[8px]">
        {funnel
          ? funnel.stages.map((stage, index) => {
              const width = Math.max(38, stage.pct ?? 0);
              return (
                <div
                  key={stage.key}
                  className="flex h-[38px] items-center justify-between gap-2 rounded-[6px] px-[12px] text-white"
                  style={{ width: `${width}%`, backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
                  title={`${formatCount(stage.count)} errands reached ${stage.label.toLowerCase()}`}
                >
                  <span className="truncate text-[11px] font-semibold">{stage.label}</span>
                  <span className="flex-shrink-0 text-[10px] font-medium opacity-90">
                    {formatCount(stage.count)} · {formatPct(stage.pct)}
                  </span>
                </div>
              );
            })
          : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[38px]" />)}
      </div>
      {funnel ? (
        <p className="text-[10px] leading-[1.5] text-[#7c857f]">
          {funnel.largest_drop
            ? `Largest drop: ${funnel.largest_drop.from.toLowerCase()} to ${funnel.largest_drop.to.toLowerCase()}, ${plural(funnel.largest_drop.lost, 'errand')} lost. Errands still in progress count at their current stage.`
            : 'No errands dropped between stages.'}
        </p>
      ) : null}
    </Card>
  );
}
