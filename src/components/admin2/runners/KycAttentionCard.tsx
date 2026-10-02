import { ArrowRight } from 'lucide-react';
import type { AdminRunnerBoardOverview } from '@/types/api';
import { formatCount, relativeAgo } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { waitingLabel } from './presentation';

const DOT_COLORS = { red: '#b84545', amber: '#b06d12', green: '#167d35' };

export function KycAttentionCard({
  overview,
  onReview,
  onOpenQueue,
}: {
  overview?: AdminRunnerBoardOverview;
  onReview?: (verificationId: number) => void;
  onOpenQueue?: () => void;
}) {
  const kyc = overview?.kyc;
  const more = kyc ? kyc.pending - kyc.items.length : 0;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="KYC attention" subtitle="Oldest verification submissions waiting for review" />
        {kyc ? (
          <span
            className={`flex-shrink-0 rounded-full px-[9px] py-[4px] text-[10px] font-semibold ${
              kyc.pending > 0 ? 'bg-[#fff5e5] text-[#b06d12]' : 'bg-[#eaf6ed] text-[#0d5e27]'
            }`}
          >
            {kyc.pending > 0 ? `${formatCount(kyc.pending)} pending` : 'All clear'}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-[8px]">
        {kyc
          ? kyc.items.map((item) => (
              <div key={item.verification_id} className="flex items-center gap-[12px] rounded-[10px] border border-[#e2e8e3] bg-[#fafcfa] px-[12px] py-[10px]">
                <span className="size-[7px] flex-shrink-0 rounded-full" style={{ backgroundColor: DOT_COLORS[item.tone] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#17211b]">{item.name}</p>
                  <p className="truncate text-[10px] text-[#7c857f]">
                    {item.issue}
                    {item.submitted_at ? ` · submitted ${relativeAgo(item.submitted_at)}` : ''}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-[11px] font-semibold ${item.overdue ? 'text-[#b84545]' : 'text-[#17211b]'}`}>
                  {waitingLabel(item.waiting_hours)}
                </span>
                {onReview ? (
                  <button
                    type="button"
                    onClick={() => onReview(item.verification_id)}
                    className="h-[32px] flex-shrink-0 rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
                  >
                    Review
                  </button>
                ) : null}
              </div>
            ))
          : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[54px] w-full rounded-[10px]" />)}
        {kyc && kyc.items.length === 0 ? (
          <p className="rounded-[10px] bg-[#f8faf8] px-[12px] py-[18px] text-center text-[11px] text-[#7c857f]">No runners are waiting for verification.</p>
        ) : null}
      </div>

      {kyc && more > 0 && onOpenQueue ? (
        <button type="button" onClick={onOpenQueue} className="mt-auto flex w-fit items-center gap-[5px] text-[11px] font-semibold text-[#167d35] hover:underline">
          {formatCount(more)} more in the verification queue <ArrowRight className="size-[12px]" strokeWidth={2} />
        </button>
      ) : null}
    </Card>
  );
}
