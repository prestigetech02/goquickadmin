import type { AdminSupportOverview, SupportTicketPriority } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';
import { PRIORITY_META, categoryMeta } from './presentation';

export function TopicMixCard({
  overview,
  onCategory,
  onPriority,
}: {
  overview?: AdminSupportOverview;
  onCategory: (key: string) => void;
  onPriority: (key: SupportTicketPriority) => void;
}) {
  const categories = overview?.categories ?? [];
  const created = overview?.kpis.created;
  const targets = overview?.targets.response_hours;
  const awaiting = overview?.kpis.awaiting_user;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="What people ask about" subtitle="Topics of tickets opened in this period" />

      {!overview ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <>
          {!created || created.count === 0 ? (
            <p className="rounded-[8px] bg-[#f8faf8] p-[14px] text-center text-[11px] text-[#7c857f]">No tickets were opened in this period.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
                {categories.map((category) =>
                  category.count > 0 ? (
                    <span
                      key={category.key}
                      title={`${categoryMeta(category.key).label}: ${formatPct(category.share_pct)}`}
                      className="h-full"
                      style={{ width: `${category.share_pct}%`, backgroundColor: categoryMeta(category.key).color }}
                    />
                  ) : null,
                )}
              </div>
              <div className="flex flex-col">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => onCategory(category.key)}
                    title="Show these tickets in the list below"
                    className="flex items-center gap-[8px] rounded-[6px] px-[4px] py-[4px] text-left text-[11px] hover:bg-[#f8faf8]"
                  >
                    <span className="size-[8px] flex-shrink-0 rounded-[2px]" style={{ backgroundColor: categoryMeta(category.key).color }} />
                    <span className="min-w-0 flex-1 truncate text-[#17211b]">{categoryMeta(category.key).label}</span>
                    <span className="w-[44px] text-right text-[10px] text-[#7c857f]">{formatPct(category.share_pct, 0)}</span>
                    <span className="w-[34px] text-right font-semibold text-[#17211b]">{formatCount(category.count)}</span>
                  </button>
                ))}
              </div>
              <p className="px-[4px] text-[10px] text-[#7c857f]">
                Opened by <span className="font-semibold text-[#17211b]">{formatCount(created.by_requester)}</span> requesters and{' '}
                <span className="font-semibold text-[#17211b]">{formatCount(created.by_runner)}</span> runners
              </p>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-[6px] border-t border-[#e2e8e3] pt-[10px]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Reply targets by priority</p>
            {(['urgent', 'high', 'normal', 'low'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onPriority(key)}
                title={`Show ${PRIORITY_META[key].label.toLowerCase()} priority tickets`}
                className="flex items-center gap-[8px] rounded-[6px] px-[4px] py-[3px] text-left text-[11px] hover:bg-[#f8faf8]"
              >
                <Dot color={PRIORITY_META[key].color} size={7} />
                <span className="min-w-0 flex-1 truncate text-[#45514a]">{PRIORITY_META[key].label}</span>
                <span className="text-right font-semibold text-[#17211b]">
                  {targets ? `Reply within ${targets[key]}h` : '—'}
                </span>
              </button>
            ))}
            {awaiting && awaiting.stale > 0 ? (
              <p className="px-[4px] text-[10px] text-[#7c857f]">
                {formatCount(awaiting.stale)} ticket{awaiting.stale === 1 ? ' has' : 's have'} had no customer reply for {overview.targets.stale_days}+ days.
                Consider resolving {awaiting.stale === 1 ? 'it' : 'them'}.
              </p>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}
