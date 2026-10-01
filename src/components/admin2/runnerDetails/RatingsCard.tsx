import { useState } from 'react';
import type { AdminRunnerProfile } from '@/types/api';
import { formatCount, personInitials } from '../format';
import { Card } from '../overview/primitives';
import { isSameWatDay, watShortDate } from '../errand/errandPresentation';
import { SectionHeader, SectionLink } from '../errand/parts';
import { starString } from './presentation';

const COMPACT = 3;

export function RatingsCard({ ratings }: { ratings: AdminRunnerProfile['ratings'] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? ratings.recent : ratings.recent.slice(0, COMPACT);

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <SectionHeader
        title="Ratings & feedback"
        subtitle={ratings.average != null
          ? `${ratings.average.toFixed(2)} average from ${formatCount(ratings.count)} rated ${ratings.count === 1 ? 'errand' : 'errands'}`
          : 'No ratings yet'}
        action={ratings.recent.length > COMPACT ? (
          <SectionLink onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Show fewer' : `View latest ${ratings.recent.length}`}
          </SectionLink>
        ) : null}
      />
      {ratings.count === 0 ? (
        <p className="rounded-[8px] bg-[#f8faf8] px-[12px] py-[14px] text-center text-[11px] text-[#7c857f]">
          Requesters haven't rated this runner yet.
        </p>
      ) : (
        <div className="flex flex-col gap-[14px] sm:flex-row sm:items-start">
          <div className="flex w-full flex-shrink-0 flex-col gap-[3px] rounded-[8px] bg-[#fff5e5] p-[12px] sm:w-[102px]">
            <p className="text-[25px] font-bold text-[#17211b]">{ratings.average?.toFixed(2)}</p>
            <p className="text-[11px] tracking-[1px] text-[#b06d12]">{starString(ratings.average ?? 0)}</p>
            <p className="text-[9px] text-[#7c857f]">
              {formatCount(ratings.count)} {ratings.count === 1 ? 'rating' : 'ratings'}
            </p>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-[10px] md:grid-cols-3">
            {shown.map((review) => (
              <div key={review.id} className="flex min-w-0 flex-col gap-[6px] rounded-[8px] bg-[#f8faf8] p-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex size-[26px] items-center justify-center rounded-full bg-[#eaf6ed] text-[11px] font-bold text-[#0d5e27]">
                    {personInitials(review.reviewer)}
                  </span>
                  <span className="text-[10px] font-bold text-[#b06d12]">★ {review.rating.toFixed(1)}</span>
                </div>
                <p className={`line-clamp-3 text-[10px] leading-[1.4] ${review.comment ? 'text-[#45514a]' : 'italic text-[#7c857f]'}`}>
                  {review.comment ?? 'No written feedback.'}
                </p>
                <p className="truncate text-[9px] text-[#7c857f]">
                  {review.reviewer}
                  {review.created_at ? ` · ${isSameWatDay(review.created_at) ? 'Today' : watShortDate(review.created_at)}` : ''}
                  {review.errand_code ? ` · ${review.errand_code}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
