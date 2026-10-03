import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelAdminWalletFunding, markAdminWalletFundingFailed, reverseAdminWalletTransaction } from '@/api/adminWalletApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import type { AdminTransactionRow } from '@/types/api';
import { formatNaira } from '../format';

export type LedgerAction = 'mark-failed' | 'cancel' | 'reverse';

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] py-[9px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

const COPY: Record<LedgerAction, { title: string; confirm: string; done: string }> = {
  'mark-failed': { title: 'Mark funding failed', confirm: 'Mark failed', done: 'marked failed' },
  cancel: { title: 'Cancel pending funding', confirm: 'Cancel funding', done: 'cancelled' },
  reverse: { title: 'Reverse transaction', confirm: 'Reverse', done: 'reversed' },
};

function explain(action: LedgerAction, row: AdminTransactionRow): string {
  const amount = formatNaira(row.amount);
  const owner = row.user?.name ?? 'this wallet';
  if (action === 'reverse') {
    return row.direction === 'credit'
      ? `Takes ${amount} back out of ${owner}'s wallet and marks ${row.code} reversed. Fails if the balance is too low.`
      : `Puts ${amount} back into ${owner}'s wallet and marks ${row.code} reversed.`;
  }
  if (action === 'cancel') {
    return `Closes the pending ${amount} checkout ${row.code} without crediting the wallet. It can't be verified afterwards, so run "Verify with Paystack" first if the customer may have paid.`;
  }
  return `Marks the ${amount} checkout ${row.code} as failed. No money moves. Run "Verify with Paystack" first if you are unsure.`;
}

export function LedgerActionModal({
  action,
  row,
  onClose,
  onDone,
}: {
  action: LedgerAction;
  row: AdminTransactionRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const copy = COPY[action];

  const mutation = useMutation({
    mutationFn: () => {
      const text = reason.trim();
      if (action === 'reverse') return reverseAdminWalletTransaction(row.id, text);
      if (action === 'cancel') return cancelAdminWalletFunding(row.id, text);
      return markAdminWalletFundingFailed(row.id, text);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-runners'] });
      onDone(`${row.code} ${copy.done}.`);
    },
  });

  const ready = reason.trim().length >= 8;

  return (
    <Modal open onClose={() => (mutation.isPending ? undefined : onClose())} title={copy.title} size="sm">
      <form
        className="space-y-4 font-inter"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) mutation.mutate();
        }}
      >
        <p className="text-[12px] text-[#45514a]">{explain(action, row)}</p>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-[#45514a]">Reason (saved to the ledger)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="At least 8 characters"
            className={`${FIELD} min-h-[80px] resize-y`}
          />
        </label>

        {mutation.isError ? (
          <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
            {getApiErrorMessage(mutation.error, 'That action failed.')}
          </p>
        ) : null}

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
            className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${
              action === 'reverse' ? 'bg-[#b84545]' : 'bg-[#167d35]'
            }`}
          >
            {mutation.isPending ? 'Working…' : copy.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}
