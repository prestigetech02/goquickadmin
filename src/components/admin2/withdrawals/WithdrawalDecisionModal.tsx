import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { approveAdminWithdrawal, markAdminWithdrawalPaid, rejectAdminWithdrawal } from '@/api/adminPaymentsApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import type { AdminWithdrawalRow } from '@/types/api';
import { formatNaira } from '../format';
import { bankLine } from './presentation';

export type WithdrawalDecision = 'approve' | 'reject' | 'mark-paid';

export type DecisionTarget = { kind: WithdrawalDecision; row: AdminWithdrawalRow };

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] py-[9px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

function Notice({ tone, children }: { tone: 'amber' | 'red' | 'gray'; children: ReactNode }) {
  const styles = {
    amber: 'bg-[#fff5e5] text-[#b06d12]',
    red: 'bg-[#fdeded] text-[#b84545]',
    gray: 'bg-[#f8faf8] text-[#45514a]',
  }[tone];
  return <p className={`rounded-[8px] px-3 py-2 text-[11px] font-medium ${styles}`}>{children}</p>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e2e8e3] py-[8px] text-[12px] last:border-b-0">
      <span className="text-[#7c857f]">{label}</span>
      <span className="truncate text-right font-semibold text-[#17211b]">{value}</span>
    </div>
  );
}

function title(target: DecisionTarget): string {
  if (target.kind === 'reject') return `Reject ${target.row.code}`;
  if (target.kind === 'mark-paid') return `Mark ${target.row.code} as paid`;
  return target.row.stage === 'approved' ? `Retry payout for ${target.row.code}` : `Approve ${target.row.code}`;
}

export function WithdrawalDecisionModal({
  target,
  onClose,
  onDone,
}: {
  target: DecisionTarget | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Modal open={target != null} onClose={onClose} title={target ? title(target) : ''} size="sm">
      {target ? <DecisionForm key={`${target.kind}-${target.row.id}`} target={target} onClose={onClose} onDone={onDone} /> : null}
    </Modal>
  );
}

function DecisionForm({ target, onClose, onDone }: { target: DecisionTarget; onClose: () => void; onDone: (message: string) => void }) {
  const { kind, row } = target;
  const [reason, setReason] = useState('');
  const name = row.user?.name ?? 'the runner';
  const highRisks = row.risks.filter((risk) => risk.severity === 'high');

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (kind === 'reject') {
        await rejectAdminWithdrawal(row.id, reason.trim());
        return `${row.code} rejected. ${formatNaira(row.amount + row.fee)} was returned to ${name}'s wallet.`;
      }
      if (kind === 'mark-paid') {
        await markAdminWithdrawalPaid(row.id);
        return `${row.code} marked as paid.`;
      }
      const { withdrawal } = await approveAdminWithdrawal(row.id);
      if (withdrawal.status === 'paid') return `${row.code} paid. ${formatNaira(row.amount)} sent to ${bankLine(row.bank)}.`;
      if (withdrawal.payout_status === 'pending') {
        return `${row.code} approved. The Flutterwave transfer is processing and will show as paid once Flutterwave confirms it.`;
      }
      return `${row.code} approved.`;
    },
    onSuccess: (message) => onDone(message),
  });

  const ready = kind !== 'reject' || reason.trim().length >= 3;
  const danger = kind === 'reject';
  const confirmLabel = kind === 'reject' ? 'Reject & refund' : kind === 'mark-paid' ? 'Mark as paid' : row.stage === 'approved' ? 'Retry payout' : 'Approve & pay';

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !mutation.isPending) mutation.mutate();
      }}
    >
      <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[4px]">
        <SummaryRow label="Runner" value={row.user?.name ?? '—'} />
        <SummaryRow label="Amount" value={formatNaira(row.amount)} />
        <SummaryRow label="Bank" value={bankLine(row.bank)} />
        <SummaryRow label="Account name" value={row.bank.account_name ?? '—'} />
      </div>

      {kind === 'approve' ? (
        <>
          <p className="text-[12px] text-[#45514a]">
            {formatNaira(row.amount)} is sent from the Flutterwave balance to this account straight away, after Flutterwave confirms the account holder's name. Transfers can't be pulled back once sent.
          </p>
          {highRisks.length > 0 ? (
            <Notice tone="red">Flagged: {highRisks.map((risk) => risk.label).join(', ')}. Check the account belongs to {name} before paying.</Notice>
          ) : null}
          {row.risks.some((risk) => risk.key === 'kyc_unverified') ? <Notice tone="amber">This runner's KYC is not verified yet.</Notice> : null}
        </>
      ) : null}

      {kind === 'reject' ? (
        <>
          <Notice tone="gray">
            {formatNaira(row.amount + row.fee)} (amount plus the withdrawal fee) goes back to {name}'s wallet, and they're notified with your reason.
          </Notice>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Reason (shared with the runner)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              autoFocus
              placeholder="e.g. Account name doesn't match your GoQuick profile"
              className={`${FIELD} min-h-[80px] resize-y`}
            />
          </label>
        </>
      ) : null}

      {kind === 'mark-paid' ? (
        <>
          <p className="text-[12px] text-[#45514a]">
            Use this only when the money was sent outside Flutterwave, for example by manual bank transfer. {name} is notified that the payout is complete.
          </p>
          {row.payout_status === 'pending' ? (
            <Notice tone="amber">A transfer is still in flight for this request. Sync payouts first so it isn't paid twice.</Notice>
          ) : null}
        </>
      ) : null}

      {mutation.isError ? <Notice tone="red">{getApiErrorMessage(mutation.error, 'That action failed.')}</Notice> : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!ready || mutation.isPending}
          className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${danger ? 'bg-[#b84545]' : 'bg-[#167d35]'}`}
        >
          {mutation.isPending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </form>
  );
}
