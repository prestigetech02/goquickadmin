import type { AdminRevenueOverview } from '@/types/api';
import { formatNaira, formatPct } from '../format';
import { Card, CardTitle, DeltaPill, Skeleton } from '../overview/primitives';
import { signedNaira } from './presentation';

export function RevenueCompositionCard({ overview }: { overview?: AdminRevenueOverview }) {
  const totals = overview?.totals;
  const gross = totals?.gross ?? 0;
  const parts = totals
    ? [
        { key: 'commission', label: 'Runner commissions', amount: totals.commission, color: '#167d35' },
        { key: 'service', label: 'Requester platform fees', amount: totals.service_fee, color: '#3478b7' },
        { key: 'cancellation', label: 'Cancellation fees', amount: totals.cancellation_fee, color: '#b06d12' },
        { key: 'withdrawal', label: 'Withdrawal fees', amount: totals.withdrawal_fee, color: '#735ca8' },
      ].filter((part, index) => index < 2 || part.amount > 0)
    : [];
  const share = (amount: number) => (gross > 0 ? (amount / gross) * 100 : 0);

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Revenue composition" subtitle="Company gross earnings before costs" />

      <div className="flex flex-col gap-[4px]">
        <p className="text-[10px] text-[#7c857f]">Gross company earnings</p>
        <div className="flex items-center justify-between gap-2">
          {totals ? (
            <p className="text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{formatNaira(gross)}</p>
          ) : (
            <Skeleton className="h-[31px] w-[120px]" />
          )}
          {overview ? <DeltaPill value={overview.changes.gross} /> : null}
        </div>
      </div>

      <div className="flex h-[12px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
        {parts.map((part) =>
          part.amount > 0 ? (
            <span key={part.key} className="h-full" style={{ width: `${share(part.amount)}%`, backgroundColor: part.color }} title={part.label} />
          ) : null,
        )}
      </div>

      <div className="flex flex-col gap-[10px]">
        {totals
          ? parts.map((part) => (
              <div key={part.key} className="flex flex-col gap-[5px]">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#45514a]">{part.label}</span>
                  <span className="font-semibold text-[#17211b]">
                    {formatNaira(part.amount)} <span className="font-normal text-[#7c857f]">· {formatPct(share(part.amount))}</span>
                  </span>
                </div>
                <span className="h-[4px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
                  <span className="block h-full rounded-full" style={{ width: `${share(part.amount)}%`, backgroundColor: part.color }} />
                </span>
              </div>
            ))
          : Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[24px] w-full" />)}
      </div>

      <div className="mt-auto flex flex-col gap-[7px] rounded-[10px] bg-[#f8faf8] p-[12px] text-[11px]">
        {totals ? (
          <>
            <div className="flex items-center justify-between gap-2" title="Paystack fees on wallet top-ups and direct errand checkouts">
              <span className="text-[#45514a]">Processing & bank costs</span>
              <span className="font-semibold text-[#b84545]">{signedNaira(-totals.processing)}</span>
            </div>
            <div
              className="flex items-center justify-between gap-2"
              title={`Coupon subsidies ${formatNaira(totals.subsidies)} · Referral rewards ${formatNaira(totals.referral)}`}
            >
              <span className="text-[#45514a]">Promotions & referral incentives</span>
              <span className="font-semibold text-[#b84545]">{signedNaira(-totals.promotions)}</span>
            </div>
            <span className="my-[2px] h-px w-full bg-[#e2e8e3]" />
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#17211b]">Net company revenue</span>
              <span className="font-bold text-[#167d35]">{signedNaira(totals.net)}</span>
            </div>
          </>
        ) : (
          <Skeleton className="h-[60px] w-full" />
        )}
      </div>
    </Card>
  );
}
