import type { AdminKycOverview } from '@/types/api';
import { formatCount, formatDateRange, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const STEPS = [
  { key: 'signed_up', label: 'Signed up', color: '#9aa39d' },
  { key: 'identity', label: 'Uploaded ID', color: '#2c73b9' },
  { key: 'selfie', label: 'Took selfie', color: '#735ca8' },
  { key: 'payout', label: 'Added bank', color: '#b06d12' },
  { key: 'approved', label: 'Approved', color: '#167d35' },
] as const;

export function OnboardingFunnelCard({ overview }: { overview?: AdminKycOverview }) {
  const funnel = overview?.funnel;
  const base = funnel ? Math.max(1, funnel.signed_up) : 1;
  const approvedPct = funnel && funnel.signed_up > 0 ? (funnel.approved / funnel.signed_up) * 100 : null;
  const biggestDrop = funnel
    ? STEPS.slice(1).reduce<{ label: string; lost: number } | null>((worst, step, index) => {
        const lost = funnel[STEPS[index].key] - funnel[step.key];
        return lost > 0 && (!worst || lost > worst.lost) ? { label: step.label, lost } : worst;
      }, null)
    : null;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle
        title="Onboarding funnel"
        subtitle={overview ? `Runners who signed up ${formatDateRange(overview.range.start_date, overview.range.end_date)}` : 'Runners who signed up in this period'}
      />

      {funnel ? (
        <div className="grid grid-cols-2 gap-[10px]">
          <div>
            <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#17211b]">{formatCount(funnel.signed_up)}</p>
            <p className="mt-[5px] text-[10px] text-[#7c857f]">New runners</p>
          </div>
          <div>
            <p className="text-[22px] font-bold leading-none tracking-[-0.4px] text-[#167d35]">{formatPct(approvedPct)}</p>
            <p className="mt-[5px] text-[10px] text-[#7c857f]">Already approved</p>
          </div>
        </div>
      ) : (
        <Skeleton className="h-[42px] w-full" />
      )}

      <div className="flex flex-col gap-[9px]">
        {STEPS.map((step) => {
          const value = funnel?.[step.key];
          return (
            <div key={step.key} className="flex items-center gap-[10px] text-[11px]">
              <span className="w-[78px] flex-shrink-0 text-[#45514a]">{step.label}</span>
              <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-[#eef1ee]">
                {value != null ? <span className="block h-full rounded-full" style={{ width: `${(value / base) * 100}%`, backgroundColor: step.color }} /> : null}
              </span>
              <span className="w-[30px] text-right font-semibold text-[#17211b]">{value != null ? formatCount(value) : '—'}</span>
            </div>
          );
        })}
      </div>

      {funnel ? (
        <p className="mt-auto border-t border-[#e2e8e3] pt-[12px] text-[10px] text-[#7c857f]">
          {funnel.signed_up === 0
            ? 'No runners signed up in this period.'
            : biggestDrop
              ? `Biggest drop-off: ${formatCount(biggestDrop.lost)} stopped before "${biggestDrop.label.toLowerCase()}".`
              : 'Every new runner made it through each step.'}
        </p>
      ) : null}
    </Card>
  );
}
