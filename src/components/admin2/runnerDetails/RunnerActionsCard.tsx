import type { ComponentType } from 'react';
import { ChevronRight, MapPin, UserCheck, UserX, WalletCards, type LucideProps } from 'lucide-react';
import { Card } from '../overview/primitives';
import { SectionHeader } from '../errand/parts';

export type RunnerAction = 'assignment' | 'payout' | 'suspend' | 'reactivate';

type Row = {
  action: RunnerAction;
  icon: ComponentType<LucideProps>;
  label: string;
  hint: string | null;
  tone: 'default' | 'danger' | 'positive';
};

const TONES = {
  default: { row: 'bg-[#f8faf8] hover:bg-[#eef2ef]', text: 'text-[#17211b]', icon: '#167d35', chevron: '#7c857f' },
  danger: { row: 'bg-[#fdecec] hover:bg-[#fbe0e0]', text: 'text-[#b84545]', icon: '#b84545', chevron: '#b84545' },
  positive: { row: 'bg-[#eaf6ed] hover:bg-[#dff0e4]', text: 'text-[#0d5e27]', icon: '#167d35', chevron: '#167d35' },
} as const;

export function RunnerActionsCard({
  isSuspended,
  isClosed,
  onAction,
}: {
  isSuspended: boolean;
  isClosed: boolean;
  onAction: (action: RunnerAction) => void;
}) {
  const rows: Row[] = [
    { action: 'assignment', icon: MapPin, label: 'Adjust zone & vehicle', hint: isClosed ? 'Account is closed' : null, tone: 'default' },
    { action: 'payout', icon: WalletCards, label: 'Review payout settings', hint: null, tone: 'default' },
    isSuspended
      ? { action: 'reactivate', icon: UserCheck, label: 'Restore runner access', hint: null, tone: 'positive' }
      : { action: 'suspend', icon: UserX, label: 'Pause runner access', hint: isClosed ? 'Account is closed' : null, tone: 'danger' },
  ];

  return (
    <Card className="flex w-full flex-col gap-[10px] p-[18px]">
      <SectionHeader title="Runner actions" subtitle="Sensitive actions require confirmation" />
      {rows.map((row) => {
        const tone = TONES[row.tone];
        const Icon = row.icon;
        return (
          <button
            key={row.action}
            type="button"
            disabled={row.hint != null}
            title={row.hint ?? undefined}
            onClick={() => onAction(row.action)}
            className={`flex w-full items-center gap-[10px] rounded-[8px] p-[10px] text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone.row}`}
          >
            <Icon className="size-[16px] flex-shrink-0" strokeWidth={1.8} color={tone.icon} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`text-[11px] font-semibold ${tone.text}`}>{row.label}</span>
              {row.hint ? <span className="truncate text-[9px] text-[#7c857f]">{row.hint}</span> : null}
            </span>
            <ChevronRight className="size-[14px] flex-shrink-0" color={tone.chevron} />
          </button>
        );
      })}
    </Card>
  );
}
