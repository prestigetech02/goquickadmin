import type { AdminNotificationsOverview, CampaignAudience } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { AUDIENCE_HINTS, AUDIENCE_LABELS } from './presentation';

const SEGMENTS: Array<{ key: Exclude<CampaignAudience, 'custom'>; color: string }> = [
  { key: 'active_requesters', color: '#167d35' },
  { key: 'verified_runners', color: '#3478b7' },
  { key: 'active_errands', color: '#735ca8' },
  { key: 'dormant', color: '#b06d12' },
];

export function AudienceSegmentsCard({
  overview,
  onCompose,
}: {
  overview?: AdminNotificationsOverview;
  onCompose: (audience: CampaignAudience) => void;
}) {
  const audience = overview?.audience;
  const max = audience ? Math.max(1, audience.segments.all) : 1;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:h-[316px] xl:w-[350px] xl:flex-shrink-0">
      <CardTitle title="Audience segments" subtitle="Reachable people right now" />

      {audience ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[25px] font-bold leading-none tracking-[-0.5px] text-[#17211b]">{formatCount(audience.contactable)}</p>
            <p className="mt-[6px] text-[10px] text-[#7c857f]">contactable profiles</p>
          </div>
          {audience.promotions_opt_in_pct != null ? (
            <span
              className="rounded-full bg-[#eaf6ed] px-[8px] py-[4px] text-[10px] font-semibold leading-none text-[#167d35]"
              title="Share of contactable people who haven't switched off promotional notifications"
            >
              {formatPct(audience.promotions_opt_in_pct)} opted in to promotions
            </span>
          ) : null}
        </div>
      ) : (
        <Skeleton className="h-[42px] w-full" />
      )}

      <div className="flex flex-col gap-[12px]">
        {SEGMENTS.map((segment) => {
          const count = audience?.segments[segment.key];
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => onCompose(segment.key)}
              title={`${AUDIENCE_HINTS[segment.key] ?? ''}. Click to message this segment.`}
              className="group flex flex-col gap-[5px] text-left"
            >
              <span className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#45514a] group-hover:text-[#17211b]">{AUDIENCE_LABELS[segment.key]}</span>
                <span className="font-semibold text-[#17211b]">{count != null ? formatCount(count) : '—'}</span>
              </span>
              <span className="h-[6px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
                {count != null ? (
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (count / max) * 100)}%`, backgroundColor: segment.color }} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
