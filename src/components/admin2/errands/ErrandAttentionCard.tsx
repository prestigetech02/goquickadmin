import { CircleCheckBig, Ellipsis, Repeat2, XCircle } from 'lucide-react';
import type { AdminErrandBoardRow, AdminErrandsOverview, ErrandFlagKey } from '@/types/api';
import { formatCount, shortAge } from '../format';
import { Chip } from '../errand/parts';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { ActionMenu } from '../users/ActionMenu';
import { FLAG_META, FLAG_ORDER, FLAG_TONES } from './presentation';
import type { BoardAction } from './ErrandQuickActions';

export function ErrandAttentionCard({
  overview,
  onOpen,
  onFlag,
  onAction,
}: {
  overview?: AdminErrandsOverview;
  onOpen: (id: number) => void;
  onFlag: (flag: ErrandFlagKey | 'any') => void;
  onAction: (kind: BoardAction, row: AdminErrandBoardRow) => void;
}) {
  const attention = overview?.attention;
  const hidden = attention ? attention.count - attention.items.length : 0;
  const counts = attention ? FLAG_ORDER.filter((key) => attention.by_flag[key] > 0) : [];

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Needs attention" subtitle="Live errands that are disputed, late, stalled or missing a runner" />
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
            <p className="text-[12px] font-semibold text-[#17211b]">Every live errand is on track</p>
            <p className="text-[10px] text-[#7c857f]">No disputes, late or stalled errands, and every request has a runner.</p>
          </div>
        ) : (
          attention.items.map((item) => {
            const first = item.flags[0];
            const meta = first ? FLAG_META[first.key] : null;
            const tone = FLAG_TONES[first?.tone ?? 'amber'];
            const Icon = meta?.icon;
            const others = item.flags.length - 1;
            const people = [item.requester?.name, item.runner ? `→ ${item.runner.name}` : '→ no runner'].filter(Boolean).join(' ');
            return (
              <div key={item.id} className="flex items-center gap-[10px] rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: tone.bg }}>
                  {Icon ? <Icon className="size-[14px]" strokeWidth={1.9} color={tone.color} /> : null}
                </span>
                <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">
                    {item.code}
                    <span className="font-normal text-[#45514a]"> · {item.title?.trim() || 'Untitled errand'}</span>
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {[people, item.updated_at ? `updated ${shortAge(item.updated_at)} ago` : null].filter(Boolean).join(' · ')}
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
                  Open
                </button>
                {item.can_reassign || item.can_cancel ? (
                  <ActionMenu
                    ariaLabel={`Actions for ${item.code}`}
                    className="flex size-[28px] flex-shrink-0 items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#eef3ef]"
                    items={[
                      { label: item.runner ? 'Reassign runner' : 'Assign a runner', icon: Repeat2, disabled: !item.can_reassign, onSelect: () => onAction('reassign', item) },
                      { label: 'Cancel errand', icon: XCircle, danger: true, disabled: !item.can_cancel, onSelect: () => onAction('cancel', item) },
                    ]}
                  >
                    <Ellipsis className="size-[14px]" strokeWidth={1.8} />
                  </ActionMenu>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {hidden > 0 ? (
        <button type="button" onClick={() => onFlag('any')} className="self-start text-[11px] font-semibold text-[#167d35] hover:underline">
          +{formatCount(hidden)} more. Show all flagged errands in the list below
        </button>
      ) : null}
    </Card>
  );
}
