import { Link } from 'react-router-dom';
import type { AdminDisputesOverview, DisputeOutcome, DisputeType } from '@/types/api';
import { getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { formatNaira, formatCount, formatPct } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';
import { OUTCOME_META, TYPE_META } from './presentation';

const OUTCOME_KEYS = Object.keys(OUTCOME_META) as DisputeOutcome[];

export function DisputeMixCard({
  overview,
  onType,
  onOutcome,
}: {
  overview?: AdminDisputesOverview;
  onType: (key: DisputeType) => void;
  onOutcome: (key: DisputeOutcome) => void;
}) {
  const types = overview?.types ?? [];
  const raisers = overview?.raisers;
  const raisedTotal = raisers ? raisers.requester + raisers.runner + raisers.other : 0;
  const outcomes = overview?.outcomes;
  const decided = outcomes ? OUTCOME_KEYS.reduce((sum, key) => sum + outcomes[key].count, 0) : 0;
  const repeatRunners = overview?.repeat.runners ?? [];
  const repeatRequesters = overview?.repeat.requesters ?? [];
  const windowDays = overview?.targets.repeat_window_days ?? 90;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Why and how they end" subtitle="Disputes filed and decided in this period" />

      {!overview ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <>
          {raisedTotal === 0 ? (
            <p className="rounded-[8px] bg-[#f8faf8] p-[14px] text-center text-[11px] text-[#7c857f]">No disputes were filed in this period.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
                {types.map((type) =>
                  type.count > 0 ? (
                    <span
                      key={type.key}
                      title={`${TYPE_META[type.key].label}: ${formatPct(type.share_pct)}`}
                      className="h-full"
                      style={{ width: `${type.share_pct}%`, backgroundColor: TYPE_META[type.key].color }}
                    />
                  ) : null,
                )}
              </div>
              <div className="flex flex-col">
                {types.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => onType(type.key)}
                    title="Show these disputes in the list below"
                    className="flex items-center gap-[8px] rounded-[6px] px-[4px] py-[4px] text-left text-[11px] hover:bg-[#f8faf8]"
                  >
                    <span className="size-[8px] flex-shrink-0 rounded-[2px]" style={{ backgroundColor: TYPE_META[type.key].color }} />
                    <span className="min-w-0 flex-1 truncate text-[#17211b]">{TYPE_META[type.key].label}</span>
                    <span className="w-[44px] text-right text-[10px] text-[#7c857f]">{formatPct(type.share_pct, 0)}</span>
                    <span className="w-[34px] text-right font-semibold text-[#17211b]">{formatCount(type.count)}</span>
                  </button>
                ))}
              </div>
              {raisers ? (
                <p className="px-[4px] text-[10px] text-[#7c857f]">
                  Filed by <span className="font-semibold text-[#17211b]">{formatCount(raisers.requester)}</span> requesters and{' '}
                  <span className="font-semibold text-[#17211b]">{formatCount(raisers.runner)}</span> runners
                  {raisers.other > 0 ? ` (${formatCount(raisers.other)} by someone else)` : ''}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-[6px] border-t border-[#e2e8e3] pt-[10px]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Outcomes · {formatCount(decided)} decided</p>
            {outcomes
              ? OUTCOME_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onOutcome(key)}
                    title="Show these decisions in the list below"
                    className="flex items-center gap-[8px] rounded-[6px] px-[4px] py-[3px] text-left text-[11px] hover:bg-[#f8faf8]"
                  >
                    <Dot color={OUTCOME_META[key].color} size={7} />
                    <span className="min-w-0 flex-1 truncate text-[#45514a]">{OUTCOME_META[key].label}</span>
                    <span className="w-[54px] text-right text-[10px] text-[#7c857f]">
                      {outcomes[key].amount > 0 ? formatNaira(outcomes[key].amount) : ''}
                    </span>
                    <span className="w-[34px] text-right font-semibold text-[#17211b]">{formatCount(outcomes[key].count)}</span>
                  </button>
                ))
              : null}
          </div>

          <div className="mt-auto flex flex-col gap-[6px] border-t border-[#e2e8e3] pt-[10px]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]" title={`Two or more disputes in the last ${windowDays} days`}>
              Repeat parties · last {windowDays} days
            </p>
            {repeatRunners.length === 0 && repeatRequesters.length === 0 ? (
              <p className="text-[10px] text-[#7c857f]">Nobody is in more than one dispute.</p>
            ) : (
              <div className="flex flex-wrap gap-[6px]">
                {repeatRunners.map((person) => (
                  <Link
                    key={`r-${person.id}`}
                    to={getAdmin2RunnerHref(person.id)}
                    className="rounded-full border border-[#f3d4d4] bg-[#fdf6f6] px-[9px] py-[3px] text-[10px] text-[#b84545] hover:brightness-95"
                    title="Runner. Open their profile"
                  >
                    {person.name} <span className="font-semibold">{formatCount(person.count)}</span>
                  </Link>
                ))}
                {repeatRequesters.map((person) => (
                  <Link
                    key={`q-${person.id}`}
                    to={getAdmin2UserHref(person.id)}
                    className="rounded-full border border-[#e2e8e3] bg-white px-[9px] py-[3px] text-[10px] text-[#45514a] hover:bg-[#f8faf8]"
                    title="Requester. Open their profile"
                  >
                    {person.name} <span className="font-semibold text-[#17211b]">{formatCount(person.count)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
