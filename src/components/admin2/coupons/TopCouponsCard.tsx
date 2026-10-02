import type { CouponOverview } from '@/types/api';
import { Chip } from '../errand/parts';
import { formatCount, formatNaira } from '../format';
import { Card, CardTitle, DeltaPill, Skeleton } from '../overview/primitives';
import { statusChip, usageBarColor, usageShare } from './presentation';

export function TopCouponsCard({
  overview,
  rangeNoun,
  onOpen,
  onViewAll,
}: {
  overview?: CouponOverview;
  rangeNoun: string;
  onOpen: (id: number) => void;
  onViewAll: () => void;
}) {
  const top = overview?.top_coupons ?? [];
  const leader = top[0]?.redemptions ?? 0;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[12px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Top coupons" subtitle={`Most redeemed ${rangeNoun}`} />
        <button type="button" onClick={onViewAll} className="flex-shrink-0 text-[11px] font-semibold text-[#167d35] hover:underline">
          View all coupons
        </button>
      </div>

      {!overview ? (
        <div className="flex flex-col gap-[10px]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[52px] w-full" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[4px] rounded-[10px] bg-[#f8faf8] px-[16px] py-[28px] text-center">
          <p className="text-[12px] font-semibold text-[#17211b]">No coupons redeemed {rangeNoun}</p>
          <p className="text-[10px] text-[#7c857f]">Share an active code with requesters to see it here.</p>
        </div>
      ) : (
        <ol className="flex flex-col">
          {top.map((coupon, index) => {
            const share = usageShare(coupon.used, coupon.max_redemptions);
            const chip = statusChip(coupon.status);
            return (
              <li key={coupon.id} className="border-b border-[#e2e8e3] last:border-b-0">
                <button
                  type="button"
                  onClick={() => onOpen(coupon.id)}
                  className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-[12px] py-[10px] text-left hover:bg-[#fafcfa]"
                >
                  <span className="text-[12px] font-bold text-[#a3aca6]">{index + 1}</span>
                  <span className="flex min-w-0 flex-col gap-[5px]">
                    <span className="flex min-w-0 items-center gap-[8px]">
                      <span className="rounded-[5px] border border-dashed border-[#b9d9c2] bg-[#f3faf5] px-[6px] py-[2px] font-mono text-[10px] font-bold tracking-[0.4px] text-[#0d5e27]">
                        {coupon.code}
                      </span>
                      <span className="truncate text-[11px] text-[#45514a]">{coupon.name}</span>
                      {coupon.status !== 'active' ? <Chip tone={chip.tone} label={chip.label} /> : null}
                    </span>
                    <span className="flex items-center gap-[8px]">
                      <span className="h-[5px] w-full max-w-[220px] overflow-hidden rounded-full bg-[#f1f4f2]">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${share ?? (leader > 0 ? (coupon.redemptions / leader) * 100 : 0)}%`,
                            backgroundColor: share != null ? usageBarColor(share) : '#a8dcb6',
                          }}
                        />
                      </span>
                      <span className="flex-shrink-0 text-[9px] text-[#7c857f]">
                        {coupon.max_redemptions != null ? `${formatCount(coupon.used)} of ${formatCount(coupon.max_redemptions)} used` : 'No usage limit'}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-[3px]">
                    <span className="flex items-center gap-[6px]">
                      <span className="text-[13px] font-bold text-[#17211b]">{formatCount(coupon.redemptions)}</span>
                      <DeltaPill value={coupon.change_pct} />
                    </span>
                    <span className="text-[9px] text-[#7c857f]">{formatNaira(coupon.discount)} funded</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
