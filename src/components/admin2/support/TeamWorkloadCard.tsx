import type { AdminSupportOverview } from '@/types/api';
import { formatCount, formatMinutes, formatPct, personInitials } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';

const WAITS = [
  { key: 'under_1h', label: 'Under 1 hour', color: '#167d35' },
  { key: 'h1_4', label: '1 to 4 hours', color: '#2c73b9' },
  { key: 'h4_24', label: '4 to 24 hours', color: '#b06d12' },
  { key: 'over_24h', label: 'Over a day', color: '#b84545' },
] as const;

export function TeamWorkloadCard({
  overview,
  onShowUnassigned,
  onShowNeedsReply,
}: {
  overview?: AdminSupportOverview;
  onShowUnassigned: () => void;
  onShowNeedsReply: () => void;
}) {
  const workload = overview?.workload;
  const kpis = overview?.kpis;
  const total = workload ? WAITS.reduce((sum, wait) => sum + workload.by_wait[wait.key], 0) : 0;
  const unassigned = workload?.unassigned ?? 0;
  const targets = overview?.targets.response_hours;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Team workload" subtitle="How long customers have waited for a reply, and who owns what" />

      {workload ? (
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-baseline justify-between gap-[8px]">
            <div className="flex items-baseline gap-[8px]">
              <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#17211b]">{formatCount(total)}</p>
              <p className="text-[10px] text-[#7c857f]">waiting on a reply</p>
            </div>
            {total > 0 ? (
              <button type="button" onClick={onShowNeedsReply} className="text-[10px] font-semibold text-[#167d35] hover:underline">
                Work the queue
              </button>
            ) : null}
          </div>
          <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
            {total > 0
              ? WAITS.map((wait) => {
                  const value = workload.by_wait[wait.key];
                  return value > 0 ? (
                    <span
                      key={wait.key}
                      title={`${wait.label}: ${formatCount(value)}`}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(value / total) * 100}%`, backgroundColor: wait.color }}
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
        {WAITS.map((wait) => {
          const value = workload?.by_wait[wait.key];
          return (
            <div key={wait.key} className="flex items-center gap-[8px] text-[11px]">
              <Dot color={wait.color} size={7} />
              <span className="flex-1 text-[#45514a]">{wait.label}</span>
              <span className="font-semibold text-[#17211b]">{value != null ? formatCount(value) : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-[7px] border-t border-[#e2e8e3] pt-[12px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Owners · open tickets</p>
        {!workload ? (
          <Skeleton className="h-[40px] w-full" />
        ) : (
          <div className="flex flex-wrap gap-[6px]">
            {workload.owners.map((owner) => (
              <span
                key={owner.id}
                title={`${owner.name}: ${formatCount(owner.open)} open, ${formatCount(owner.needs_reply)} waiting on their reply`}
                className="flex items-center gap-[6px] rounded-full bg-[#f1f4f2] py-[3px] pl-[3px] pr-[9px] text-[10px] text-[#17211b]"
              >
                <span className="flex size-[18px] items-center justify-center rounded-full bg-[#dfe9e2] text-[8px] font-bold text-[#0d5e27]">
                  {personInitials(owner.name)}
                </span>
                <span className="max-w-[110px] truncate font-medium">{owner.name}</span>
                <span className="font-semibold text-[#45514a]">{formatCount(owner.open)}</span>
                {owner.needs_reply > 0 ? <span className="font-semibold text-[#b06d12]">· {formatCount(owner.needs_reply)} to reply</span> : null}
              </span>
            ))}
            {unassigned > 0 ? (
              <button
                type="button"
                onClick={onShowUnassigned}
                className="flex items-center gap-[5px] rounded-full bg-[#fff5e5] px-[9px] py-[4px] text-[10px] font-semibold text-[#b06d12] hover:brightness-95"
              >
                Unassigned {formatCount(unassigned)}
              </button>
            ) : null}
            {workload.owners.length === 0 && unassigned === 0 ? <p className="text-[10px] text-[#7c857f]">No open tickets to own.</p> : null}
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
        {[
          {
            label: 'First reply',
            value: kpis ? formatMinutes(kpis.first_response.median_minutes) : null,
            hint: 'Median time from a ticket being opened to our first reply, for tickets opened in this period',
          },
          {
            label: 'On target',
            value: kpis ? formatPct(kpis.first_response.within_target_pct, 0) : null,
            hint: targets
              ? `First reply within target: urgent ${targets.urgent}h, high ${targets.high}h, normal ${targets.normal}h, low ${targets.low}h`
              : 'First reply within the target for its priority',
          },
          {
            label: 'Time to resolve',
            value: kpis ? (kpis.resolved.median_hours != null ? formatMinutes(kpis.resolved.median_hours * 60) : '—') : null,
            hint: 'Median time from opening to resolution, for tickets resolved in this period',
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
