import { ShieldCheck } from 'lucide-react';
import type { AdminWithdrawalsOverview } from '@/types/api';
import { formatCount, formatNaira, shortAge } from '../format';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';
import { userTone } from '../transactions/presentation';
import { RISK_TONES } from './presentation';

export function UrgentAttentionCard({
  overview,
  onReview,
  onShowFlagged,
}: {
  overview?: AdminWithdrawalsOverview;
  onReview: (id: number) => void;
  onShowFlagged: () => void;
}) {
  const urgent = overview?.urgent;
  const hidden = urgent ? urgent.count - urgent.items.length : 0;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Urgent attention" subtitle="Requests past their payout SLA or carrying a risk signal" />
        {urgent && urgent.count > 0 ? (
          <span className="flex-shrink-0 rounded-full bg-[#fdeded] px-[8px] py-[4px] text-[10px] font-semibold leading-none text-[#b84545]">
            {formatCount(urgent.count)} need review
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-[7px]">
        {!urgent ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[48px] w-full" />)
        ) : urgent.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f8faf8] p-[18px] text-center">
            <ShieldCheck className="size-[20px] text-[#167d35]" strokeWidth={1.8} />
            <p className="text-[12px] font-semibold text-[#17211b]">Nothing needs a risk decision</p>
            <p className="text-[10px] text-[#7c857f]">Open requests are within SLA with no failed payouts, shared accounts or name mismatches.</p>
          </div>
        ) : (
          urgent.items.map((item) => {
            const tone = RISK_TONES[item.reason.tone];
            const name = item.user?.name ?? 'Unknown user';
            return (
              <div key={item.id} className="flex items-center gap-[10px] rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                <Dot color={tone.color} />
                <PersonAvatar name={name} tone={userTone(item.user?.role)} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{name}</p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={item.code}>
                    {[item.bank_name, item.created_at ? `${shortAge(item.created_at)} waiting` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[12px] font-semibold text-[#17211b]">{formatNaira(item.amount)}</p>
                <span
                  className="hidden sm:inline-flex"
                  title={item.signal_count > 1 ? `${item.signal_count} signals on this request` : undefined}
                >
                  <Chip tone={tone} label={item.signal_count > 1 ? `${item.reason.label} +${item.signal_count - 1}` : item.reason.label} />
                </span>
                <button
                  type="button"
                  onClick={() => onReview(item.id)}
                  className="h-[28px] flex-shrink-0 rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#eef3ef]"
                >
                  Review
                </button>
              </div>
            );
          })
        )}
      </div>

      {hidden > 0 ? (
        <button type="button" onClick={onShowFlagged} className="self-start text-[11px] font-semibold text-[#167d35] hover:underline">
          +{formatCount(hidden)} more flagged. Show in the queue below
        </button>
      ) : null}
    </Card>
  );
}
