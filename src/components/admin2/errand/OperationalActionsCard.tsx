import type { ComponentType } from 'react';
import { ChevronRight, CircleX, Receipt, Repeat2, type LucideProps } from 'lucide-react';
import { Card } from '../overview/primitives';
import { SectionHeader } from './parts';

export type ErrandAction = 'reassign' | 'refund' | 'cancel';

function ActionRow({
  icon: Icon,
  label,
  hint,
  danger = false,
  disabled,
  onClick,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  hint?: string | null;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint ?? undefined}
      className={`flex w-full items-center gap-[10px] rounded-[8px] p-[10px] text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? 'bg-[#fdecec] hover:bg-[#fbe0e0]' : 'bg-[#f8faf8] hover:bg-[#eef2ef]'
      }`}
    >
      <Icon className="size-[16px] flex-shrink-0" strokeWidth={1.8} color={danger ? '#b84545' : '#167d35'} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-[11px] font-semibold ${danger ? 'text-[#b84545]' : 'text-[#17211b]'}`}>{label}</span>
        {hint ? <span className="truncate text-[9px] text-[#7c857f]">{hint}</span> : null}
      </span>
      <ChevronRight className="size-[14px] flex-shrink-0" color={danger ? '#b84545' : '#7c857f'} />
    </button>
  );
}

export function OperationalActionsCard({
  canIntervene,
  findingRunner,
  canRefund,
  refundHint,
  onAction,
}: {
  canIntervene: boolean;
  findingRunner: boolean;
  canRefund: boolean;
  refundHint: string | null;
  onAction: (action: ErrandAction) => void;
}) {
  const closedHint = canIntervene ? null : 'Errand is no longer in progress';
  const assignHint = closedHint ?? (findingRunner ? 'Sends an invitation the runner accepts in the app' : null);

  return (
    <Card className="flex w-full flex-col gap-[10px] p-[18px]">
      <SectionHeader title="Operational actions" subtitle="Changes are recorded in the audit log" />
      <div className="flex flex-col gap-[8px]">
        <ActionRow
          icon={Repeat2}
          label={findingRunner ? 'Invite a runner' : 'Reassign runner'}
          hint={assignHint}
          disabled={!canIntervene}
          onClick={() => onAction('reassign')}
        />
        <ActionRow icon={Receipt} label="Adjust or refund payment" hint={refundHint} disabled={!canRefund} onClick={() => onAction('refund')} />
        <ActionRow icon={CircleX} label="Cancel errand" hint={closedHint} danger disabled={!canIntervene} onClick={() => onAction('cancel')} />
      </div>
    </Card>
  );
}
