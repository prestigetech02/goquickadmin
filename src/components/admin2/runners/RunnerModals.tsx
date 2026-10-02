import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Mail, MessageCircle } from 'lucide-react';
import { runAdminRunnerBulkAction } from '@/api/adminRunnerBoardApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminRunnerBoardOverview, AdminRunnerRow, RunnerBulkAction, RunnerBulkResult } from '@/types/api';
import { Chip } from '../errand/parts';
import { plural } from '../shared/helpers';
import { BULK_ACTIONS, RUNNER_APP_LINKS, VERIFICATION_CHIP, inviteMessage, whatsappNumber } from './presentation';

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';
const SECONDARY = 'h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a] hover:bg-[#f8faf8]';
const MIN_REASON = 3;

export type BulkTarget = { action: RunnerBulkAction; runners: AdminRunnerRow[] };

/** Previews which runners change and which are skipped before anything is sent. */
export function BulkActionModal({
  target,
  onClose,
  onDone,
}: {
  target: BulkTarget | null;
  onClose: () => void;
  onDone: (result: RunnerBulkResult, action: RunnerBulkAction) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const meta = target ? BULK_ACTIONS[target.action] : null;
  const eligible = target && meta ? target.runners.filter(meta.eligible) : [];
  const skipped = target && meta ? target.runners.filter((row) => !meta.eligible(row)) : [];
  const needsReason = target?.action === 'suspend';
  const showReason = target?.action !== 'reactivate';

  const mutation = useMutation({
    mutationFn: (payload: { action: RunnerBulkAction; ids: number[]; reason: string }) =>
      runAdminRunnerBulkAction({ action: payload.action, runner_ids: payload.ids, reason: payload.reason }),
    onSuccess: (result, payload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.runners.all });
      onDone(result, payload.action);
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Bulk action failed.')),
  });

  function reset() {
    setReason('');
    setError(null);
    onClose();
  }

  const close = () => {
    if (!mutation.isPending) reset();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!target || eligible.length === 0) return;
    if (needsReason && reason.trim().length < MIN_REASON) {
      setError('Add a reason so the runner and the audit trail know why.');
      return;
    }
    setError(null);
    mutation.mutate({ action: target.action, ids: eligible.map((row) => row.id), reason });
  };

  return (
    <Modal open={target != null} onClose={close} title={meta?.title ?? ''} size="sm">
      {target && meta ? (
        <form onSubmit={submit} className="space-y-4 font-inter">
          <p className="text-[12px] text-[#45514a]">
            {target.action === 'suspend'
              ? 'Suspended runners are signed out, taken offline and cannot accept errands until reactivated.'
              : target.action === 'offline'
                ? 'Runners are switched offline and notified. They can go online again from the app.'
                : 'Reactivated runners regain access and can go online again.'}
          </p>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#17211b]">Will change ({eligible.length})</p>
            {eligible.length > 0 ? (
              <ul className="max-h-[150px] space-y-1 overflow-y-auto rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] p-2">
                {eligible.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-semibold text-[#17211b]">{row.name}</span>
                    <Chip tone={VERIFICATION_CHIP[row.verification].tone} label={VERIFICATION_CHIP[row.verification].label} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[8px] bg-[#fff5e5] px-3 py-2 text-[11px] font-medium text-[#b06d12]">
                None of the selected runners can be changed — they are all {meta.skipReason}.
              </p>
            )}
            {skipped.length > 0 && eligible.length > 0 ? (
              <p className="text-[10px] text-[#7c857f]">
                Skipping {plural(skipped.length, 'runner')} {skipped.length === 1 ? 'who is' : 'who are'} {meta.skipReason}: {skipped.map((row) => row.name).join(', ')}
              </p>
            ) : null}
          </div>

          {showReason ? (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold text-[#45514a]">Reason {needsReason ? '' : '(optional)'}</span>
              <textarea
                className={`${FIELD} min-h-[80px] resize-y py-[9px]`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder={needsReason ? 'e.g. Repeated late deliveries reported in Lekki' : 'Shared with the runner in their notification'}
              />
            </label>
          ) : null}
          <p className="text-[10px] text-[#7c857f]">This change is recorded in each runner's admin notes with your name.</p>

          {error ? <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} disabled={mutation.isPending} className={SECONDARY}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || eligible.length === 0}
              className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${
                target.action === 'reactivate' ? 'bg-[#167d35]' : 'bg-[#b84545]'
              }`}
            >
              {mutation.isPending ? 'Working…' : `${meta.verb} ${plural(eligible.length, 'runner')}`}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

/** Runners self-register in the app, so inviting means sharing the download and sign-up steps. */
export function InviteRunnerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const message = inviteMessage(name);
  const waNumber = whatsappNumber(phone);

  const close = () => {
    setName('');
    setPhone('');
    setEmail('');
    setCopied(false);
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const linkButton = 'flex h-[36px] items-center gap-[7px] rounded-[8px] px-[13px] text-[12px] font-semibold';

  return (
    <Modal open={open} onClose={close} title="Invite a runner" size="sm">
      <div className="space-y-4 font-inter">
        <p className="text-[12px] text-[#45514a]">
          Runners create their own account in the GoQuick app and complete verification there. Share the invite below — new sign-ups appear in the
          verification queue.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[11px] font-semibold text-[#45514a]">Name (optional)</span>
            <input className={`${FIELD} h-[38px]`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Femi Ajala" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">WhatsApp number</span>
            <input className={`${FIELD} h-[38px]`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 000 0000" inputMode="tel" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Email</span>
            <input className={`${FIELD} h-[38px]`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="runner@email.com" type="email" />
          </label>
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[#45514a]">Message</span>
          <p className="whitespace-pre-line rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] px-[11px] py-[9px] text-[11px] leading-[1.55] text-[#17211b]">{message}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={copy} className={`${linkButton} border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8]`}>
            {copied ? <Check className="size-[15px] text-[#167d35]" strokeWidth={2} /> : <Copy className="size-[15px]" strokeWidth={1.8} />}
            {copied ? 'Copied' : 'Copy invite'}
          </button>
          <a
            href={`mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent('Run errands with GoQuick')}&body=${encodeURIComponent(message)}`}
            className={`${linkButton} border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8] ${email.trim() ? '' : 'pointer-events-none opacity-50'}`}
            aria-disabled={!email.trim()}
          >
            <Mail className="size-[15px]" strokeWidth={1.8} /> Email
          </a>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className={`${linkButton} bg-[#167d35] text-white hover:bg-[#0d5e27] ${waNumber.length >= 10 ? '' : 'pointer-events-none opacity-50'}`}
            aria-disabled={waNumber.length < 10}
          >
            <MessageCircle className="size-[15px]" strokeWidth={1.8} /> Send on WhatsApp
          </a>
        </div>
        <p className="text-[10px] text-[#7c857f]">
          App links: <a href={RUNNER_APP_LINKS.android} target="_blank" rel="noreferrer" className="font-semibold text-[#167d35] hover:underline">Google Play</a> ·{' '}
          <a href={RUNNER_APP_LINKS.ios} target="_blank" rel="noreferrer" className="font-semibold text-[#167d35] hover:underline">App Store</a>
        </p>
      </div>
    </Modal>
  );
}

export function RunnerPolicyModal({ open, onClose, overview }: { open: boolean; onClose: () => void; overview?: AdminRunnerBoardOverview }) {
  const c = overview?.coaching;
  const rules = [
    `Suspensions require a reason. The runner is notified, signed out and taken offline until reactivated.`,
    `Every bulk action shows a preview of who will change and who is skipped, and is written to each runner's admin notes.`,
    `KYC submissions should be reviewed within ${overview?.kpis.pending.sla_hours ?? 24} hours; older ones are flagged as overdue.`,
    c
      ? `Coaching flags use the last ${c.window_days} days: on-time below ${c.on_time.threshold}% (${c.grace_minutes} minutes' grace on the quoted ETA), invitation acceptance below ${c.acceptance.threshold}%, or rating below ${c.rating.threshold}. Runners need a few jobs or ratings before they can be flagged.`
      : null,
    overview ? `A zone is tight when it matches fewer than ${overview.zones.tight_match_pct}% of its requests in the selected period.` : null,
  ].filter((rule): rule is string => rule != null);

  return (
    <Modal open={open} onClose={onClose} title="Runner policy" size="sm">
      <div className="space-y-4 font-inter">
        <ul className="space-y-2.5">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-[8px] text-[12px] leading-[1.5] text-[#45514a]">
              <Check className="mt-[3px] size-[13px] flex-shrink-0 text-[#167d35]" strokeWidth={2.2} />
              {rule}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white">
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}
