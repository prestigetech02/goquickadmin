import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import {
  cancelAdminErrand,
  forceAdminErrandStatus,
  reassignAdminErrand,
  refundAdminErrandEscrow,
} from '@/api/adminErrandsApi';
import { fetchAdminRunners } from '@/api/adminRunnersApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminErrandView } from '@/types/api';
import { formatNaira } from '../format';
import { FORCEABLE_STATUSES, statusLabel } from './errandPresentation';
import { PersonAvatar } from './parts';

export type ErrandModal = 'complete' | 'status' | 'reassign' | 'refund' | 'cancel';

const MIN_REASON = 8;

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

const TITLES: Record<ErrandModal, string> = {
  complete: 'Mark errand complete',
  status: 'Change errand status',
  reassign: 'Reassign runner',
  refund: 'Adjust or refund payment',
  cancel: 'Cancel errand',
};

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-[12px] text-[#45514a]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-[2px] accent-[#167d35]" />
      <span>{children}</span>
    </label>
  );
}

function Notice({ tone, children }: { tone: 'amber' | 'red' | 'gray'; children: ReactNode }) {
  const styles = {
    amber: 'bg-[#fff5e5] text-[#b06d12]',
    red: 'bg-[#fdeded] text-[#b84545]',
    gray: 'bg-[#f8faf8] text-[#45514a]',
  }[tone];
  return <p className={`rounded-[8px] px-3 py-2 text-[11px] font-medium ${styles}`}>{children}</p>;
}

function RunnerPicker({ excludeId, value, onChange }: { excludeId: number | null; value: number | null; onChange: (id: number) => void }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const params = { search: debounced || undefined, status: 'active', verification: 'verified', per_page: 8 };
  const runnersQuery = useQuery({
    queryKey: ['admin-runners', 'picker', params],
    queryFn: () => fetchAdminRunners(params),
  });
  const runners = (runnersQuery.data?.data ?? []).filter((r) => r.id !== excludeId);

  return (
    <div className="space-y-2">
      <label className="flex h-[38px] items-center gap-2 rounded-[8px] border border-[#d4ddd6] bg-[#f8faf8] px-[11px] focus-within:border-[#167d35]">
        <Search className="size-[14px] text-[#7c857f]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search verified runners by name or phone"
          className="h-full min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#7c857f]"
        />
      </label>
      <div className="max-h-[220px] space-y-1 overflow-y-auto">
        {runnersQuery.isLoading ? <p className="px-1 py-2 text-[11px] text-[#7c857f]">Loading runners…</p> : null}
        {runnersQuery.isSuccess && runners.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-[#7c857f]">No active, verified runners match.</p>
        ) : null}
        {runners.map((runner) => {
          const selected = runner.id === value;
          return (
            <button
              key={runner.id}
              type="button"
              onClick={() => onChange(runner.id)}
              className={`flex w-full items-center gap-[10px] rounded-[8px] border px-[10px] py-[8px] text-left ${
                selected ? 'border-[#167d35] bg-[#eaf6ed]' : 'border-transparent hover:bg-[#f8faf8]'
              }`}
            >
              <PersonAvatar name={runner.runner_name} url={runner.avatar_url} tone={{ bg: '#eef5fb', color: '#2c73b9' }} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-[#17211b]">{runner.runner_name}</span>
                <span className="block truncate text-[10px] text-[#7c857f]">
                  {[runner.phone, runner.rating ? `${Number(runner.rating).toFixed(1)} rating` : null].filter(Boolean).join(' · ')}
                </span>
              </span>
              {selected ? <Check className="size-[14px] text-[#167d35]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ErrandActionModals({
  view,
  modal,
  onClose,
  onDone,
}: {
  view: AdminErrandView;
  modal: ErrandModal | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const { errand, pricing, runner, requester, dispute } = view;
  const escrowHeld = pricing.status === 'held';
  const openDispute = dispute && ['open', 'under_review'].includes(dispute.status);

  const [reason, setReason] = useState('');
  const [releaseEscrow, setReleaseEscrow] = useState(true);
  const [refundEscrow, setRefundEscrow] = useState(true);
  const [nextStatus, setNextStatus] = useState<string>('');
  const [runnerId, setRunnerId] = useState<number | null>(null);

  useEffect(() => {
    setReason('');
    setReleaseEscrow(!openDispute);
    setRefundEscrow(true);
    setNextStatus('');
    setRunnerId(null);
  }, [modal, openDispute]);

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const trimmed = reason.trim();
      switch (modal) {
        case 'complete':
          await forceAdminErrandStatus(errand.id, {
            status: 'completed',
            reason: trimmed,
            release_escrow: escrowHeld && releaseEscrow,
          });
          return escrowHeld && releaseEscrow ? 'Errand completed and payment released to the runner.' : 'Errand marked complete.';
        case 'status':
          await forceAdminErrandStatus(errand.id, { status: nextStatus, reason: trimmed });
          return `Status changed to ${statusLabel(nextStatus).toLowerCase()}.`;
        case 'reassign':
          if (runnerId == null) throw new Error('Choose a runner first.');
          await reassignAdminErrand(errand.id, { runner_id: runnerId, reason: trimmed });
          return 'Runner reassigned.';
        case 'refund':
          await refundAdminErrandEscrow(errand.id, trimmed);
          return 'Escrow refunded to the requester.';
        case 'cancel':
          await cancelAdminErrand(errand.id, { reason: trimmed, refund_escrow: escrowHeld && refundEscrow });
          return 'Errand cancelled.';
        default:
          throw new Error('No action selected.');
      }
    },
    onSuccess: async (message) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.errands.all });
      onDone(message);
    },
  });

  useEffect(() => {
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  if (!modal) return null;

  const reasonOk = reason.trim().length >= MIN_REASON;
  const ready =
    reasonOk &&
    (modal !== 'status' || nextStatus !== '') &&
    (modal !== 'reassign' || runnerId != null) &&
    (modal !== 'refund' || escrowHeld);

  const confirmLabel = {
    complete: 'Mark complete',
    status: 'Change status',
    reassign: 'Reassign runner',
    refund: pricing.total != null ? `Refund ${formatNaira(pricing.total)}` : 'Refund escrow',
    cancel: 'Cancel errand',
  }[modal];
  const danger = modal === 'cancel' || modal === 'refund';

  return (
    <Modal open onClose={() => (mutation.isPending ? undefined : onClose())} title={TITLES[modal]} size={modal === 'reassign' ? 'md' : 'sm'}>
      <form
        className="space-y-4 font-inter"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) mutation.mutate();
        }}
      >
        {modal === 'complete' ? (
          <>
            <p className="text-[12px] text-[#45514a]">
              Use this when the runner finished the errand but it wasn't closed in the app.
            </p>
            {openDispute ? <Notice tone="red">This errand has an open dispute. Resolve it before releasing payment.</Notice> : null}
            {escrowHeld ? (
              <Toggle checked={releaseEscrow} onChange={setReleaseEscrow}>
                Release {pricing.total != null ? formatNaira(pricing.total) : 'the escrow'} to {runner?.name ?? 'the runner'} now
                (commission is deducted as usual)
              </Toggle>
            ) : (
              <Notice tone="gray">No escrow is currently held, so no payment will move.</Notice>
            )}
          </>
        ) : null}

        {modal === 'status' ? (
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">New status</span>
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className={`${FIELD} h-[38px]`}>
              <option value="">Choose a status…</option>
              {FORCEABLE_STATUSES.filter((s) => s !== errand.status).map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <span className="block text-[10px] text-[#7c857f]">
              Moving to Completed here does not release payment — use “Mark complete” for that.
            </span>
          </label>
        ) : null}
        {modal === 'status' && nextStatus === 'cancelled' && escrowHeld ? (
          <Notice tone="amber">Cancelling refunds the held escrow to the requester.</Notice>
        ) : null}

        {modal === 'reassign' ? (
          <>
            <p className="text-[12px] text-[#45514a]">
              {runner ? `Currently assigned to ${runner.name}.` : 'No runner is assigned yet.'} The held escrow moves to the new runner.
            </p>
            <RunnerPicker excludeId={runner?.id ?? null} value={runnerId} onChange={setRunnerId} />
          </>
        ) : null}

        {modal === 'refund' ? (
          <>
            {escrowHeld ? (
              <p className="text-[12px] text-[#45514a]">
                Returns the full {pricing.total != null ? formatNaira(pricing.total) : 'escrow'} to {requester?.name ?? 'the requester'}'s
                wallet. The errand itself is not cancelled.
              </p>
            ) : (
              <Notice tone="gray">There is no held escrow to refund on this errand.</Notice>
            )}
            {requester ? (
              <p className="text-[11px] text-[#7c857f]">
                For a partial refund, issue a wallet credit from the{' '}
                <Link to={getAdmin2UserHref(requester.id)} className="font-semibold text-[#167d35] hover:underline">
                  requester's profile
                </Link>
                .
              </p>
            ) : null}
          </>
        ) : null}

        {modal === 'cancel' ? (
          <>
            <p className="text-[12px] text-[#45514a]">The requester and runner are notified that the errand was cancelled.</p>
            {escrowHeld ? (
              <Toggle checked={refundEscrow} onChange={setRefundEscrow}>
                Refund {pricing.total != null ? formatNaira(pricing.total) : 'the escrow'} to the requester
              </Toggle>
            ) : null}
          </>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-[#45514a]">Reason (saved to the audit log)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="At least 8 characters"
            className={`${FIELD} min-h-[80px] resize-y py-[9px]`}
          />
        </label>

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
            className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${
              danger ? 'bg-[#b84545]' : 'bg-[#167d35]'
            }`}
          >
            {mutation.isPending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
