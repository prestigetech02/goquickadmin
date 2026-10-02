import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { approveRunnerVerification, rejectRunnerVerification } from '@/api/adminRunnersApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import type { AdminKycRow } from '@/types/api';
import { REJECTION_PRESETS } from './presentation';

export type KycDecision = 'approve' | 'reject' | 'revoke';

export type KycDecisionTarget = { kind: KycDecision; row: AdminKycRow };

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] py-[9px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

function Notice({ tone, children }: { tone: 'amber' | 'red' | 'gray'; children: ReactNode }) {
  const styles = {
    amber: 'bg-[#fff5e5] text-[#b06d12]',
    red: 'bg-[#fdeded] text-[#b84545]',
    gray: 'bg-[#f8faf8] text-[#45514a]',
  }[tone];
  return <div className={`rounded-[8px] px-3 py-2 text-[11px] font-medium ${styles}`}>{children}</div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e2e8e3] py-[8px] text-[12px] last:border-b-0">
      <span className="text-[#7c857f]">{label}</span>
      <span className="truncate text-right font-semibold text-[#17211b]">{value}</span>
    </div>
  );
}

const TITLES: Record<KycDecision, string> = {
  approve: 'Approve runner verification',
  reject: 'Reject verification',
  revoke: 'Revoke verification',
};

export function KycDecisionModal({
  target,
  onClose,
  onDone,
}: {
  target: KycDecisionTarget | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Modal open={target != null} onClose={onClose} title={target ? TITLES[target.kind] : ''} size="sm">
      {target ? <DecisionForm key={`${target.kind}-${target.row.id}`} target={target} onClose={onClose} onDone={onDone} /> : null}
    </Modal>
  );
}

function DecisionForm({ target, onClose, onDone }: { target: KycDecisionTarget; onClose: () => void; onDone: (message: string) => void }) {
  const { kind, row } = target;
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const name = row.runner?.name ?? 'the runner';
  const redRisks = row.risks.filter((risk) => risk.tone === 'red');
  const warnings = row.checks.filter((check) => check.status !== 'pass').map((check) => `${check.label}: ${check.detail ?? 'needs a look'}`);

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (kind === 'approve') {
        await approveRunnerVerification(row.id);
        return `${name} is verified and can now go online and accept errands. They've been notified.`;
      }
      await rejectRunnerVerification(row.id, reason.trim());
      return kind === 'revoke'
        ? `${name}'s verification was revoked. They can't take errands until they resubmit and are approved again.`
        : `${name}'s verification was rejected. They've been sent your reason so they can fix it and resubmit.`;
    },
    onSuccess: (message) => onDone(message),
  });

  const ready = kind === 'approve' ? redRisks.length === 0 || acknowledged : reason.trim().length >= 3;
  const danger = kind !== 'approve';

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !mutation.isPending) mutation.mutate();
      }}
    >
      <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[4px]">
        <SummaryRow label="Runner" value={name} />
        <SummaryRow label="Document" value={[row.document.label, row.document.number_masked].filter(Boolean).join(' · ') || '—'} />
        <SummaryRow label="Checks" value={`${row.checks_passed} of ${row.checks_total} complete`} />
      </div>

      {kind === 'approve' ? (
        <>
          <p className="text-[12px] text-[#45514a]">
            {name} will be able to go online and accept errands straight away, and gets a push and email confirmation.
          </p>
          {warnings.length > 0 ? (
            <Notice tone="amber">
              <p className="mb-1">Not everything is complete:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {redRisks.length > 0 ? (
            <Notice tone="red">
              <p>Flagged: {redRisks.map((risk) => risk.label).join(', ')}.</p>
              <label className="mt-2 flex items-start gap-2 font-normal">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-[2px]" />
                I've reviewed these signals and the documents, and I'm confident this is a genuine runner.
              </label>
            </Notice>
          ) : null}
        </>
      ) : (
        <>
          <Notice tone="gray">
            {kind === 'revoke'
              ? `${name} is already verified. Revoking takes them off errands until they resubmit and are approved again.`
              : `${name} is notified by push and email with your reason, and can resubmit from the runner app.`}
          </Notice>
          <div className="flex flex-wrap gap-[6px]">
            {REJECTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={`rounded-full border px-[9px] py-[4px] text-[10px] font-medium ${
                  reason === preset ? 'border-[#b84545] bg-[#fdeded] text-[#b84545]' : 'border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Reason (shared with the runner)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              autoFocus
              placeholder="Tell the runner exactly what to fix"
              className={`${FIELD} min-h-[80px] resize-y`}
            />
          </label>
        </>
      )}

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
          {mutation.isPending ? 'Working…' : kind === 'approve' ? 'Approve runner' : kind === 'revoke' ? 'Revoke verification' : 'Reject & notify'}
        </button>
      </div>
    </form>
  );
}
