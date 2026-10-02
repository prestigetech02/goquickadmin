import type { AdminErrandsOverview } from '@/types/api';
import { formatCount, formatMinutes, formatPct } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';

const STAGES = [
  { key: 'finding', label: 'Finding a runner', color: '#b06d12' },
  { key: 'assigned', label: 'Runner assigned', color: '#735ca8' },
  { key: 'en_route', label: 'Heading to pickup', color: '#2c73b9' },
  { key: 'on_task', label: 'On the errand', color: '#167d35' },
  { key: 'awaiting_requester', label: 'Awaiting requester', color: '#9aa39d' },
] as const;

export function LivePipelineCard({ overview }: { overview?: AdminErrandsOverview }) {
  const pipeline = overview?.pipeline;
  const total = pipeline ? STAGES.reduce((sum, stage) => sum + pipeline.stages[stage.key], 0) : 0;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Live pipeline" subtitle="Where open errands are right now" />

      {pipeline ? (
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-baseline gap-[8px]">
            <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#17211b]">{formatCount(total)}</p>
            <p className="text-[10px] text-[#7c857f]">
              live{pipeline.disputed > 0 ? ` · ${formatCount(pipeline.disputed)} in dispute` : ''}
            </p>
          </div>
          <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
            {total > 0
              ? STAGES.map((stage) => {
                  const value = pipeline.stages[stage.key];
                  return value > 0 ? (
                    <span
                      key={stage.key}
                      title={`${stage.label}: ${formatCount(value)}`}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(value / total) * 100}%`, backgroundColor: stage.color }}
                    />
                  ) : null;
                })
              : null}
          </div>
        </div>
      ) : (
        <Skeleton className="h-[48px] w-full" />
      )}

      <div className="flex flex-col gap-[8px]">
        {STAGES.map((stage) => {
          const value = pipeline?.stages[stage.key];
          return (
            <div key={stage.key} className="flex items-center gap-[8px] text-[11px]">
              <Dot color={stage.color} size={7} />
              <span className="flex-1 text-[#45514a]">{stage.label}</span>
              <span className="font-semibold text-[#17211b]">{value != null ? formatCount(value) : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
        {[
          { label: 'Time to match', value: pipeline ? formatMinutes(pipeline.median_match_minutes) : null, hint: 'Median minutes from request to a runner accepting' },
          { label: 'Match to done', value: pipeline ? formatMinutes(pipeline.median_fulfil_minutes) : null, hint: 'Median time from a runner accepting to completion' },
          {
            label: 'On time',
            value: pipeline ? formatPct(pipeline.on_time_pct, 0) : null,
            hint: pipeline ? `Completed within ${pipeline.grace_minutes} minutes of the expected finish · ${formatCount(pipeline.measured_count)} measured` : '',
          },
        ].map((item) => (
          <div key={item.label} title={item.hint}>
            {item.value != null ? (
              <p className="text-[15px] font-bold leading-none text-[#17211b]">{item.value}</p>
            ) : (
              <Skeleton className="h-[15px] w-[40px]" />
            )}
            <p className="mt-[5px] text-[9px] text-[#7c857f]">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
