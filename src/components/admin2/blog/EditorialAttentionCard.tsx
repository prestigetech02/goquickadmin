import type { ComponentType } from 'react';
import { ArrowUpRight, ChevronRight, FileClock, Link2Off, type LucideProps } from 'lucide-react';
import type { BlogOverview } from '@/types/api';
import { formatCount, relativeAgo } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { OUTLINE_BUTTON } from '../shared/PageHeader';

function AttentionRow({
  icon: Icon,
  tint,
  color,
  title,
  detail,
  count,
  onClick,
}: {
  icon: ComponentType<LucideProps>;
  tint: string;
  color: string;
  title: string;
  detail: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-[10px] rounded-[9px] px-[11px] py-[9px] text-left transition-[filter] hover:brightness-[0.98]"
      style={{ backgroundColor: tint }}
    >
      <Icon className="size-[16px] flex-shrink-0" strokeWidth={1.8} color={color} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11px] font-semibold text-[#17211b]">{title}</span>
        <span className="truncate text-[9px] text-[#7c857f]">{detail}</span>
      </span>
      <span className="text-[12px] font-bold" style={{ color }}>
        {formatCount(count)}
      </span>
      <ChevronRight className="size-[14px] flex-shrink-0 text-[#7c857f] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function EditorialAttentionCard({
  overview,
  onOpenReviewQueue,
  onOpenBrokenLinks,
}: {
  overview?: BlogOverview;
  onOpenReviewQueue: () => void;
  onOpenBrokenLinks: () => void;
}) {
  const attention = overview?.attention;
  const review = attention?.awaiting_review;
  const links = attention?.broken_links;
  const open = (review?.count ?? 0) + (links?.count ?? 0);

  return (
    <Card className="flex w-full flex-col gap-[12px] p-[18px] xl:w-[360px] xl:flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Editorial attention" subtitle="Items that need a decision" />
        {attention ? (
          <span
            className={`flex-shrink-0 rounded-full px-[8px] py-[3px] text-[10px] font-semibold ${
              open > 0 ? 'bg-[#fff5e5] text-[#b06d12]' : 'bg-[#eaf6ed] text-[#167d35]'
            }`}
          >
            {open > 0 ? `${formatCount(open)} open` : 'All clear'}
          </span>
        ) : null}
      </div>

      {review && links ? (
        <div className="flex flex-col gap-[8px]">
          <AttentionRow
            icon={FileClock}
            tint="#fff8ec"
            color="#b06d12"
            title="Drafts awaiting review"
            detail={
              review.count > 0
                ? `${formatCount(review.count)} post${review.count === 1 ? '' : 's'}${review.oldest_requested_at ? ` · oldest sent ${relativeAgo(review.oldest_requested_at)}` : ''}`
                : 'Nothing waiting for an editor'
            }
            count={review.count}
            onClick={onOpenReviewQueue}
          />
          <AttentionRow
            icon={Link2Off}
            tint="#fdf1f1"
            color="#b84545"
            title="Broken links found"
            detail={links.count > 0 ? `Across ${formatCount(links.posts)} live or scheduled post${links.posts === 1 ? '' : 's'}` : 'Every link checks out'}
            count={links.count}
            onClick={onOpenBrokenLinks}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          <Skeleton className="h-[46px] w-full" />
          <Skeleton className="h-[46px] w-full" />
        </div>
      )}

      <button type="button" onClick={onOpenReviewQueue} className={`${OUTLINE_BUTTON} self-start`}>
        <ArrowUpRight className="size-[14px]" strokeWidth={2} />
        Open review queue
      </button>
    </Card>
  );
}
