import type { AdminDisputesOverview } from '@/types/api';
import { formatCount, formatMinutes, formatPct, personInitials } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';

const AGES = [
  { key: 'under_4h', label: 'Under 4 hours', color: '#167d35' },
  { key: 'h4_24', label: '4 to 24 hours', color: '#2c73b9' },
  { key: 'd1_2', label: '1 to 2 days', color: '#b06d12' },
  { key: 'over_2d', label: 'Over 2 days (past target)', color: '#b84545' },
] as const;

export function CaseloadCard({ overview, onShowUnassigned }: { overview?: AdminDisputesOverview; onShowUnassigned: () => void }) {
  const caseload = overview?.caseload;
  const kpis = overview?.kpis;
  const total = caseload ? AGES.reduce((sum, age) => sum + caseload.by_age[age.key], 0) : 0;
  const unassigned = kpis?.open.unassigned ?? 0;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Caseload health" subtitle="How long open disputes have waited, and who owns them" />

      {caseload ? (
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-baseline gap-[8px]">
            <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#17211b]">{formatCount(total)}</p>
            <p className="text-[10px] text-[#7c857f]">open{unassigned > 0 ? ` · ${formatCount(unassigned)} without an owner` : ''}</p>
          </div>
          <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
            {total > 0
              ? AGES.map((age) => {
                  const value = caseload.by_age[age.key];
                  return value > 0 ? (
                    <span
                      key={age.key}
                      title={`${age.label}: ${formatCount(value)}`}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(value / total) * 100}%`, backgroundColor: age.color }}
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
        {AGES.map((age) => {
          const value = caseload?.by_age[age.key];
          return (
            <div key={age.key} className="flex items-center gap-[8px] text-[11px]">
              <Dot color={age.color} size={7} />
              <span className="flex-1 text-[#45514a]">{age.label}</span>
              <span className="font-semibold text-[#17211b]">{value != null ? formatCount(value) : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-[7px] border-t border-[#e2e8e3] pt-[12px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Owners</p>
        {!caseload ? (
          <Skeleton className="h-[40px] w-full" />
        ) : (
          <div className="flex flex-wrap gap-[6px]">
            {caseload.owners.slice(0, 5).map((owner) => (
              <span key={owner.id} className="flex items-center gap-[6px] rounded-full bg-[#f1f4f2] py-[3px] pl-[3px] pr-[9px] text-[10px] text-[#17211b]">
                <span className="flex size-[18px] items-center justify-center rounded-full bg-[#dfe9e2] text-[8px] font-bold text-[#0d5e27]">
                  {personInitials(owner.name)}
                </span>
                <span className="max-w-[110px] truncate font-medium">{owner.name}</span>
                <span className="font-semibold text-[#45514a]">{formatCount(owner.count)}</span>
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
            {caseload.owners.length === 0 && unassigned === 0 ? <p className="text-[10px] text-[#7c857f]">No open cases to own.</p> : null}
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
        {[
          {
            label: 'Time to pick up',
            value: caseload ? formatMinutes(caseload.median_pickup_minutes) : null,
            hint: `Median time from filing to an admin taking the case · target ${overview?.targets.pickup_hours ?? 4}h`,
          },
          {
            label: 'Time to decide',
            value: kpis ? (kpis.resolved.median_hours != null ? formatMinutes(kpis.resolved.median_hours * 60) : '—') : null,
            hint: 'Median time from filing to a decision, for cases decided in this period',
          },
          {
            label: 'Within target',
            value: kpis ? formatPct(kpis.resolved.on_time_pct, 0) : null,
            hint: `Decided within ${overview?.targets.resolve_hours ?? 48} hours of filing`,
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
