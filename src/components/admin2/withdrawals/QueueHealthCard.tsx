import { Landmark } from 'lucide-react';
import type { AdminWithdrawalsOverview } from '@/types/api';
import { formatNaira, formatCount, formatMinutes, formatPct, shortAge } from '../format';
import { isSameWatDay, watShortDate, watTime } from '../errand/errandPresentation';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const STAGES = [
  { key: 'awaiting_review', label: 'Awaiting review', color: '#b06d12' },
  { key: 'approved', label: 'Approved', color: '#2c73b9' },
  { key: 'processing', label: 'Processing', color: '#735ca8' },
  { key: 'paid_today', label: 'Paid today', color: '#167d35' },
] as const;

function timeLabel(at: string): string {
  return isSameWatDay(at) ? watTime(at) : `${watShortDate(at)}, ${watTime(at)}`;
}

export function QueueHealthCard({ overview }: { overview?: AdminWithdrawalsOverview }) {
  const health = overview?.health;
  const lifecycle = health?.lifecycle;
  const max = lifecycle ? Math.max(1, ...STAGES.map((s) => lifecycle[s.key])) : 1;
  const balance = health?.payout_balance ?? null;
  const short = balance != null && health != null && balance.amount < health.queue_amount;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Payout queue health" subtitle="Review speed and today's request lifecycle" />

      {health ? (
        <div className="grid grid-cols-2 gap-[10px]">
          <div title={`Across ${formatCount(health.reviewed_count)} decisions in the selected period`}>
            <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#17211b]">{formatMinutes(health.median_review_minutes)}</p>
            <p className="mt-[5px] text-[10px] text-[#7c857f]">Median time to decision</p>
          </div>
          <div title={`${formatCount(health.paid_count)} payouts in the selected period`}>
            <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#167d35]">{formatPct(health.same_day_paid_pct)}</p>
            <p className="mt-[5px] text-[10px] text-[#7c857f]">Paid the same day</p>
          </div>
        </div>
      ) : (
        <Skeleton className="h-[42px] w-full" />
      )}

      <div className="flex flex-col gap-[9px]">
        {STAGES.map((stage) => (
          <div key={stage.key} className="flex items-center gap-[10px] text-[11px]">
            <span className="w-[92px] flex-shrink-0 text-[#45514a]">{stage.label}</span>
            <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-[#eef1ee]">
              {lifecycle ? (
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(lifecycle[stage.key] / max) * 100}%`, backgroundColor: stage.color }}
                />
              ) : null}
            </span>
            <span className="w-[30px] text-right font-semibold text-[#17211b]">{lifecycle ? formatCount(lifecycle[stage.key]) : '—'}</span>
          </div>
        ))}
      </div>

      {health ? (
        <div className="mt-auto flex flex-col gap-[6px] border-t border-[#e2e8e3] pt-[12px]">
          <div
            className={`flex items-center gap-[8px] rounded-[8px] px-[10px] py-[8px] text-[10px] ${
              short ? 'bg-[#fdeded] text-[#b84545]' : 'bg-[#f8faf8] text-[#45514a]'
            }`}
          >
            <Landmark className="size-[13px] flex-shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate" title={balance ? `Checked ${timeLabel(balance.checked_at)}` : undefined}>
              Flutterwave balance{' '}
              <span className="font-semibold">{balance ? formatNaira(balance.amount) : 'unavailable'}</span>
            </span>
            <span className="flex-shrink-0 font-semibold">{formatNaira(health.queue_amount)} queued</span>
          </div>
          <p className="truncate text-[9px] text-[#7c857f]">
            {short ? 'Top up Flutterwave before approving more payouts · ' : ''}
            {health.oldest_pending_at ? `Oldest request waiting ${shortAge(health.oldest_pending_at)}` : 'No requests waiting'}
            {health.last_sync ? ` · Last payout sync ${timeLabel(health.last_sync.at)}` : ''}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
