import { ShieldCheck } from 'lucide-react';
import type { AdminKycOverview } from '@/types/api';
import { formatCount, shortAge } from '../format';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';
import { userTone } from '../transactions/presentation';
import { RISK_TONES, riskChipLabel } from './presentation';

export function AttentionCard({
  overview,
  onReview,
  onShowFlagged,
}: {
  overview?: AdminKycOverview;
  onReview: (id: number) => void;
  onShowFlagged: () => void;
}) {
  const attention = overview?.attention;
  const hidden = attention ? attention.count - attention.items.length : 0;
  const slaHours = overview?.sla_hours ?? 24;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Needs attention" subtitle={`Ready submissions with a risk signal or waiting more than ${slaHours} hours`} />
        {attention && attention.count > 0 ? (
          <span className="flex-shrink-0 rounded-full bg-[#fdeded] px-[8px] py-[4px] text-[10px] font-semibold leading-none text-[#b84545]">
            {formatCount(attention.count)} to check
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-[7px]">
        {!attention ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[48px] w-full" />)
        ) : attention.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f8faf8] p-[18px] text-center">
            <ShieldCheck className="size-[20px] text-[#167d35]" strokeWidth={1.8} />
            <p className="text-[12px] font-semibold text-[#17211b]">Nothing needs a closer look</p>
            <p className="text-[10px] text-[#7c857f]">No duplicate IDs, shared accounts or underage runners, and nothing has waited over {slaHours} hours.</p>
          </div>
        ) : (
          attention.items.map((item) => {
            const tone = RISK_TONES[item.risk.tone];
            const name = item.runner?.name ?? 'Unknown runner';
            return (
              <div key={item.id} className="flex items-center gap-[10px] rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                <Dot color={tone.color} />
                <PersonAvatar name={name} url={item.selfie_url} tone={userTone('runner')} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{name}</p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {[item.document.label, item.submitted_at ? `${shortAge(item.submitted_at)} waiting` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="hidden sm:inline-flex" title={item.risks.map((risk) => risk.label).join(' · ') || undefined}>
                  <Chip tone={tone} label={riskChipLabel(item)} />
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
          +{formatCount(hidden)} more. Show flagged submissions in the queue below
        </button>
      ) : null}
    </Card>
  );
}
