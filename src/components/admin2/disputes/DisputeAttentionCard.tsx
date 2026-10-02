import { CircleCheckBig, Ellipsis, Gavel, Hand } from 'lucide-react';
import type { AdminDisputeRow, AdminDisputesOverview, DisputeFlagKey } from '@/types/api';
import { formatCount, formatNaira, shortAge } from '../format';
import { Chip } from '../errand/parts';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { ActionMenu } from '../users/ActionMenu';
import { FLAG_META, FLAG_ORDER, FLAG_TONES } from './presentation';

export function DisputeAttentionCard({
  overview,
  busyId,
  onOpen,
  onFlag,
  onTake,
  onDecide,
}: {
  overview?: AdminDisputesOverview;
  busyId: number | null;
  onOpen: (id: number) => void;
  onFlag: (flag: DisputeFlagKey | 'any') => void;
  onTake: (row: AdminDisputeRow) => void;
  onDecide: (row: AdminDisputeRow) => void;
}) {
  const attention = overview?.attention;
  const hidden = attention ? attention.count - attention.items.length : 0;
  const counts = attention ? FLAG_ORDER.filter((key) => attention.by_flag[key] > 0) : [];

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Needs attention" subtitle="Open cases that are late, unowned, high value or involve repeat parties" />
        {attention && attention.count > 0 ? (
          <span className="flex-shrink-0 rounded-full bg-[#fdeded] px-[8px] py-[4px] text-[10px] font-semibold leading-none text-[#b84545]">
            {formatCount(attention.count)} to check
          </span>
        ) : null}
      </div>

      {counts.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {counts.map((key) => {
            const meta = FLAG_META[key];
            const tone = FLAG_TONES[meta.tone];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onFlag(key)}
                title={`${meta.hint}. Show them in the list below.`}
                className="flex items-center gap-[5px] rounded-full border px-[8px] py-[4px] text-[10px] font-semibold transition-colors hover:brightness-95"
                style={{ backgroundColor: tone.bg, color: tone.color, borderColor: `${tone.color}33` }}
              >
                <Icon className="size-[11px]" strokeWidth={2} />
                {meta.label}
                <span className="rounded-full bg-white/70 px-[5px] text-[9px]">{formatCount(attention?.by_flag[key] ?? 0)}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-[7px]">
        {!attention ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[50px] w-full" />)
        ) : attention.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f8faf8] p-[18px] text-center">
            <CircleCheckBig className="size-[20px] text-[#167d35]" strokeWidth={1.8} />
            <p className="text-[12px] font-semibold text-[#17211b]">Every open dispute is on track</p>
            <p className="text-[10px] text-[#7c857f]">Nothing is past the 48h target, unowned or involving repeat parties.</p>
          </div>
        ) : (
          attention.items.map((item) => {
            const first = item.flags[0];
            const meta = first ? FLAG_META[first.key] : null;
            const tone = FLAG_TONES[first?.tone ?? 'amber'];
            const Icon = meta?.icon;
            const others = item.flags.length - 1;
            const people = [item.raised_by?.name, item.against ? `vs ${item.against.name}` : null].filter(Boolean).join(' ');
            const held = item.amount.held > 0 ? `${formatNaira(item.amount.held)} held` : null;
            return (
              <div key={item.id} className="flex items-center gap-[10px] rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: tone.bg }}>
                  {Icon ? <Icon className="size-[14px]" strokeWidth={1.9} color={tone.color} /> : null}
                </span>
                <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">
                    {item.code}
                    <span className="font-normal text-[#45514a]"> · {item.reason?.trim() || 'No reason given'}</span>
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {[people, held, item.created_at ? `filed ${shortAge(item.created_at)} ago` : null, item.assignee ? `owner ${item.assignee.name}` : 'no owner']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
                <span className="hidden sm:inline-flex" title={item.flags.map((flag) => flag.label).join(' · ')}>
                  <Chip tone={tone} label={others > 0 ? `${first?.label} +${others}` : (first?.label ?? 'Check')} />
                </span>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="h-[28px] flex-shrink-0 rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#eef3ef]"
                >
                  Review
                </button>
                <ActionMenu
                  ariaLabel={`Actions for ${item.code}`}
                  className="flex size-[28px] flex-shrink-0 items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#eef3ef]"
                  items={[
                    { label: 'Take this case', icon: Hand, disabled: Boolean(item.assignee) || busyId === item.id, onSelect: () => onTake(item) },
                    { label: 'Record decision', icon: Gavel, onSelect: () => onDecide(item) },
                  ]}
                >
                  <Ellipsis className="size-[14px]" strokeWidth={1.8} />
                </ActionMenu>
              </div>
            );
          })
        )}
      </div>

      {hidden > 0 ? (
        <button type="button" onClick={() => onFlag('any')} className="self-start text-[11px] font-semibold text-[#167d35] hover:underline">
          +{formatCount(hidden)} more. Show all flagged disputes in the list below
        </button>
      ) : null}
    </Card>
  );
}
