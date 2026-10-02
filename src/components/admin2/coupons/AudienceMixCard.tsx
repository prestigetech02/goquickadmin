import type { CouponOverview } from '@/types/api';
import { formatCount, formatNaira, formatPct } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';
import { AUDIENCE_COLORS, AUDIENCE_HINTS } from './presentation';

export function AudienceMixCard({ overview }: { overview?: CouponOverview }) {
  const mix = overview?.audience_mix;
  const items = mix?.items ?? [];

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:h-[316px] xl:w-[360px] xl:flex-shrink-0">
      <CardTitle title="Who is redeeming" subtitle="Redemptions by coupon audience" />

      {mix ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <p className="text-[25px] font-bold leading-none tracking-[-0.5px] text-[#17211b]">{formatCount(mix.total)}</p>
              <p className="mt-[4px] text-[10px] text-[#7c857f]">redemptions in this period</p>
            </div>
            {mix.percent_share_pct != null ? (
              <span
                className="rounded-full bg-[#eaf6ed] px-[8px] py-[3px] text-[10px] font-semibold text-[#167d35]"
                title="Share of redemptions that came from percentage-off coupons"
              >
                {formatPct(mix.percent_share_pct, 0)} percentage-off
              </span>
            ) : null}
          </div>

          <div className="flex h-[8px] w-full overflow-hidden rounded-full bg-[#f1f4f2]">
            {items.map((item) =>
              item.pct > 0 ? (
                <span key={item.key} style={{ width: `${item.pct}%`, backgroundColor: AUDIENCE_COLORS[item.key] }} title={`${item.label} · ${formatPct(item.pct, 0)}`} />
              ) : null,
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-[11px]">
            {items.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-3 text-[11px]" title={AUDIENCE_HINTS[item.key]}>
                <span className="flex min-w-0 items-start gap-[8px]">
                  <span className="mt-[4px]">
                    <Dot color={AUDIENCE_COLORS[item.key]} size={7} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[#17211b]">{item.label}</span>
                    <span className="truncate text-[9px] text-[#7c857f]">{formatNaira(item.discount)} discount</span>
                  </span>
                </span>
                <span className="flex-shrink-0 font-semibold text-[#17211b]">
                  {formatCount(item.redemptions)} <span className="font-normal text-[#7c857f]">· {formatPct(item.pct, 0)}</span>
                </span>
              </div>
            ))}
          </div>

          {mix.total === 0 ? (
            <p className="text-[10px] leading-relaxed text-[#7c857f]">Redemptions appear here once requesters pay for errands with a coupon.</p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-[10px]">
          <Skeleton className="h-[26px] w-[60px]" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[12px] w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}
