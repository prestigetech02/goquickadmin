import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Ban, CircleCheckBig, Scale, Undo2, type LucideIcon } from 'lucide-react';
import { decideAdminDispute, type DisputeDecisionInput } from '@/api/adminDisputesApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import type { AdminDisputeRow } from '@/types/api';
import { formatNaira } from '../format';
import { statusLabel } from '../errand/errandPresentation';
import { PAYMENT_META } from './presentation';

export type DecisionChoice = DisputeDecisionInput['outcome'];
export type DisputeDecisionTarget = { row: AdminDisputeRow; outcome?: DecisionChoice };
type ErrandChoice = '' | 'in_progress' | 'completed' | 'cancelled';

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] py-[9px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

const PRESETS: Record<DecisionChoice, string[]> = {
  refund_requester: [
    "The errand wasn't completed as agreed, so the requester gets a full refund.",
    "The runner couldn't show proof the errand was done, so we refunded the requester.",
  ],
  pay_runner: [
    'Proof shows the errand was completed as requested, so the runner has been paid.',
    'The requester confirmed receipt in the chat, so we released payment to the runner.',
  ],
  no_action: [
    'We spoke to both parties and agreed the errand should continue.',
    'Payment was already settled, so no further money needs to move.',
  ],
  dismiss: [
    "The claim isn't supported by the chat history or the proof provided.",
    'This duplicates an earlier dispute for the same errand.',
  ],
};

function Notice({ tone, children }: { tone: 'amber' | 'red' | 'gray' | 'blue'; children: ReactNode }) {
  const styles = {
    amber: 'bg-[#fff5e5] text-[#b06d12]',
    red: 'bg-[#fdeded] text-[#b84545]',
    gray: 'bg-[#f8faf8] text-[#45514a]',
    blue: 'bg-[#eef5fb] text-[#2c73b9]',
  }[tone];
  return <div className={`rounded-[8px] px-3 py-2 text-[11px] font-medium ${styles}`}>{children}</div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e2e8e3] py-[7px] text-[12px] last:border-b-0">
      <span className="text-[#7c857f]">{label}</span>
      <span className="truncate text-right font-semibold text-[#17211b]">{value}</span>
    </div>
  );
}

export function DisputeDecisionModal({
  target,
  onClose,
  onDone,
}: {
  target: DisputeDecisionTarget | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Modal open={target != null} onClose={onClose} title={target ? `Record a decision for ${target.row.code}` : ''} size="md">
      {target ? <DecisionForm key={`${target.row.id}-${target.outcome ?? ''}`} target={target} onClose={onClose} onDone={onDone} /> : null}
    </Modal>
  );
}

function DecisionForm({ target, onClose, onDone }: { target: DisputeDecisionTarget; onClose: () => void; onDone: (message: string) => void }) {
  const { row } = target;
  const held = row.amount.held;
  const hasHeld = held > 0;
  const requester = row.requester?.name ?? 'the requester';
  const runner = row.runner?.name ?? 'the runner';
  const errandStatus = row.errand?.status ?? '';
  const paused = errandStatus === 'disputed';

  const [choice, setChoice] = useState<DecisionChoice | null>(target.outcome ?? null);
  const [errandChoice, setErrandChoice] = useState<ErrandChoice>(paused ? 'in_progress' : '');
  const [resolution, setResolution] = useState('');

  const options: Array<{ key: DecisionChoice; label: string; icon: LucideIcon; color: string; detail: string; disabled: string | null }> = [
    {
      key: 'refund_requester',
      label: 'Refund the requester',
      icon: Undo2,
      color: '#2c73b9',
      detail: `Returns ${hasHeld ? formatNaira(held) : 'the held payment'} from escrow to ${requester}'s wallet and cancels the errand.`,
      disabled: hasHeld ? null : 'Nothing is held in escrow to refund.',
    },
    {
      key: 'pay_runner',
      label: 'Pay the runner',
      icon: CircleCheckBig,
      color: '#167d35',
      detail: `Releases ${hasHeld ? formatNaira(held) : 'the held payment'} so ${runner} is paid their share, and marks the errand completed.`,
      disabled: !hasHeld ? 'Nothing is held in escrow to release.' : !row.runner ? 'No runner is assigned to this errand.' : null,
    },
    {
      key: 'no_action',
      label: 'Resolve with no payment change',
      icon: Scale,
      color: '#45514a',
      detail: hasHeld ? 'Closes the dispute and leaves the money in escrow, so the errand must carry on.' : 'Closes the dispute without moving any money.',
      disabled: null,
    },
    {
      key: 'dismiss',
      label: 'Dismiss the claim',
      icon: Ban,
      color: '#b84545',
      detail: "The claim isn't valid. Nothing moves and the dispute is closed.",
      disabled: null,
    },
  ];

  const errandOptions: Array<{ value: ErrandChoice; label: string; disabled: boolean }> = [
    ...(paused ? [] : [{ value: '' as ErrandChoice, label: `Leave it as ${statusLabel(errandStatus).toLowerCase()}`, disabled: false }]),
    { value: 'in_progress', label: 'Resume the errand', disabled: false },
    { value: 'completed', label: 'Mark it completed', disabled: hasHeld },
    { value: 'cancelled', label: 'Cancel it', disabled: hasHeld },
  ];

  const mutation = useMutation({
    mutationFn: () => {
      const input: DisputeDecisionInput = { outcome: choice as DecisionChoice, resolution: resolution.trim() };
      if ((choice === 'no_action' || choice === 'dismiss') && errandChoice) input.errand_status = errandChoice;
      return decideAdminDispute(row.id, input);
    },
    onSuccess: (result) => onDone(result.message || `${row.code} has been decided.`),
  });

  const needsErrandStatus = (choice === 'no_action' || choice === 'dismiss') && Boolean(row.errand);
  const ready = choice != null && resolution.trim().length >= 10 && (!needsErrandStatus || !paused || errandChoice !== '');
  const movesMoney = choice === 'refund_requester' || choice === 'pay_runner';

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !mutation.isPending) mutation.mutate();
      }}
    >
      <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[2px]">
        <SummaryRow label="Errand" value={[row.errand?.code, row.errand?.title?.trim()].filter(Boolean).join(' · ') || '—'} />
        <SummaryRow label="Filed by" value={row.raised_by ? `${row.raised_by.name} (${row.raised_by.role})` : '—'} />
        <SummaryRow
          label="Payment"
          value={`${hasHeld ? `${formatNaira(held)} · ` : row.amount.at_stake != null ? `${formatNaira(row.amount.at_stake)} · ` : ''}${PAYMENT_META[row.amount.payment].label}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
        {options.map((option) => {
          const selected = choice === option.key;
          const Icon = option.icon;
          return (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled != null}
              onClick={() => setChoice(option.key)}
              title={option.disabled ?? undefined}
              className={`flex flex-col gap-[5px] rounded-[10px] border p-[11px] text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected ? 'border-[#167d35] bg-[#f3faf5] ring-1 ring-[#167d35]' : 'border-[#d4ddd6] bg-white hover:bg-[#f8faf8]'
              }`}
            >
              <span className="flex items-center gap-[7px] text-[12px] font-semibold text-[#17211b]">
                <Icon className="size-[14px]" strokeWidth={2} color={option.color} />
                {option.label}
              </span>
              <span className="text-[10px] leading-[1.45] text-[#7c857f]">{option.disabled ?? option.detail}</span>
            </button>
          );
        })}
      </div>

      {needsErrandStatus ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-[#45514a]">
            What happens to the errand?
            {paused ? <span className="font-normal text-[#7c857f]"> It's paused for this dispute.</span> : null}
          </p>
          <div className="flex flex-wrap gap-[6px]">
            {errandOptions.map((option) => (
              <button
                key={option.value || 'leave'}
                type="button"
                disabled={option.disabled}
                onClick={() => setErrandChoice(option.value)}
                title={option.disabled ? 'Payment is still held. Refund the requester or pay the runner to close the errand.' : undefined}
                className={`rounded-full border px-[10px] py-[5px] text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  errandChoice === option.value ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {hasHeld ? (
            <p className="text-[10px] text-[#7c857f]">Money is still in escrow, so the errand can only resume. It's paid out automatically once it's delivered.</p>
          ) : null}
        </div>
      ) : null}

      {choice ? (
        <>
          <div className="flex flex-wrap gap-[6px]">
            {PRESETS[choice].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setResolution(preset)}
                className={`rounded-full border px-[9px] py-[4px] text-left text-[10px] font-medium ${
                  resolution === preset ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Resolution (sent to both the requester and the runner)</span>
            <textarea
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              maxLength={2000}
              placeholder="Explain what you found and why you decided this way"
              className={`${FIELD} min-h-[84px] resize-y`}
            />
            {resolution.trim().length > 0 && resolution.trim().length < 10 ? (
              <span className="text-[10px] text-[#b06d12]">Write at least 10 characters.</span>
            ) : null}
          </label>
          {movesMoney ? (
            <Notice tone="amber">
              {choice === 'refund_requester'
                ? `${formatNaira(held)} goes back to ${requester} straight away. This can't be undone from here.`
                : `${formatNaira(held)} is released from escrow to ${runner}. This can't be undone from here.`}
            </Notice>
          ) : (
            <Notice tone="gray">Both parties are notified, and the decision is logged on the errand timeline.</Notice>
          )}
        </>
      ) : (
        <Notice tone="blue">Choose an outcome. Each option explains how money and the errand will change.</Notice>
      )}

      {mutation.isError ? <Notice tone="red">{getApiErrorMessage(mutation.error, 'Could not record the decision.')}</Notice> : null}

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
          className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${choice === 'dismiss' ? 'bg-[#b84545]' : 'bg-[#167d35]'}`}
        >
          {mutation.isPending
            ? 'Working…'
            : choice === 'refund_requester'
              ? `Refund ${formatNaira(held)}`
              : choice === 'pay_runner'
                ? `Release ${formatNaira(held)}`
                : choice === 'dismiss'
                  ? 'Dismiss dispute'
                  : 'Record decision'}
        </button>
      </div>
    </form>
  );
}
