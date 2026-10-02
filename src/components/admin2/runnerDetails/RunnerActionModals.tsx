import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminRunnerAssignableErrands,
  inviteAdminRunner,
  reactivateAdminRunner,
  resetAdminRunnerPassword,
  setAdminRunnerOffline,
  suspendAdminRunner,
  updateAdminRunnerAssignment,
} from '@/api/adminRunnersApi';
import { updateAdminUser } from '@/api/adminUsersApi';
import { fetchAdminZones } from '@/api/adminZonesApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminRunnerAssignmentUpdate, AdminRunnerProfile, AdminUserProfileUpdate } from '@/types/api';
import { formatNaira, relativeAgo } from '../format';
import { Skeleton } from '../overview/primitives';
import { categoryLabel, splitAddress } from '../errand/errandPresentation';
import { distanceLabel, VEHICLE_LABELS } from './presentation';

export type RunnerModal = 'edit' | 'assignment' | 'assign' | 'payout' | 'suspend' | 'reactivate' | 'offline' | 'reset-password';

const FIELD =
  'h-[38px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

const TITLES: Record<RunnerModal, string> = {
  edit: 'Edit runner profile',
  assignment: 'Zone & vehicle',
  assign: 'Assign an errand',
  payout: 'Payout settings',
  suspend: 'Pause runner access',
  reactivate: 'Restore runner access',
  offline: 'Set runner offline',
  'reset-password': 'Send password reset',
};

const EDITABLE = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state'] as const;
type EditableField = (typeof EDITABLE)[number];

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[11px] font-semibold text-[#45514a]">{label}</span>
      {children}
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

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e2e8e3] py-[9px] text-[12px] last:border-b-0">
      <span className="text-[#7c857f]">{label}</span>
      <span className="text-right font-semibold text-[#17211b]">{value}</span>
    </div>
  );
}

function initialForm(runner: AdminRunnerProfile['runner']): Record<EditableField, string> {
  return Object.fromEntries(EDITABLE.map((key) => [key, runner[key] ?? ''])) as Record<EditableField, string>;
}

function initialAssignment(profile: AdminRunnerProfile) {
  return {
    vehicle_type: profile.vehicle.type ?? '',
    plate_number: profile.vehicle.plate_number ?? '',
    primary_errand_area: profile.zone.area ?? '',
  };
}

export function RunnerActionModals({
  profile,
  modal,
  canManageZones,
  withdrawalsHref,
  onClose,
  onDone,
}: {
  profile: AdminRunnerProfile;
  modal: RunnerModal | null;
  canManageZones: boolean;
  withdrawalsHref: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const { runner } = profile;
  const [form, setForm] = useState(() => initialForm(runner));
  const [assignment, setAssignment] = useState(() => initialAssignment(profile));
  const [reason, setReason] = useState('');
  const [errandId, setErrandId] = useState<number | null>(null);

  useEffect(() => {
    setForm(initialForm(runner));
    setAssignment(initialAssignment(profile));
    setReason('');
    setErrandId(null);
    // Only reset when a dialog opens, not on background refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const assignableQuery = useQuery({
    queryKey: queryKeys.runners.assignable(runner.id),
    queryFn: () => fetchAdminRunnerAssignableErrands(runner.id),
    enabled: modal === 'assign',
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.list({ per_page: 100 }),
    queryFn: () => fetchAdminZones({ per_page: 100 }),
    enabled: modal === 'assignment' && canManageZones,
    staleTime: 5 * 60_000,
  });

  const profileChanges = (): AdminUserProfileUpdate => {
    const out: Record<string, string | null> = {};
    for (const key of EDITABLE) {
      const next = form[key].trim();
      if (next !== (runner[key] ?? '')) out[key] = next === '' && key !== 'first_name' && key !== 'last_name' ? null : next;
    }
    return out as AdminUserProfileUpdate;
  };

  const assignmentChanges = (): AdminRunnerAssignmentUpdate => {
    const out: AdminRunnerAssignmentUpdate = {};
    const initial = initialAssignment(profile);
    if (assignment.vehicle_type && assignment.vehicle_type !== initial.vehicle_type) out.vehicle_type = assignment.vehicle_type;
    const plate = assignment.plate_number.trim().toUpperCase();
    if (plate !== initial.plate_number.toUpperCase()) out.plate_number = plate || null;
    const area = assignment.primary_errand_area.trim();
    if (area !== initial.primary_errand_area) out.primary_errand_area = area || null;
    return out;
  };

  const errands = assignableQuery.data?.errands ?? [];
  const selectedErrand = errands.find((errand) => errand.id === errandId) ?? null;

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      switch (modal) {
        case 'edit':
          await updateAdminUser(runner.id, profileChanges());
          return 'Runner profile updated.';
        case 'assignment':
          await updateAdminRunnerAssignment(runner.id, assignmentChanges());
          return 'Zone & vehicle updated.';
        case 'assign': {
          if (!selectedErrand) throw new Error('Pick an errand first.');
          const { amount } = await inviteAdminRunner(runner.id, selectedErrand.id);
          return `${runner.name} was invited to ${selectedErrand.code} at ${formatNaira(amount)}. They'll be assigned once they accept and the requester pays.`;
        }
        case 'suspend':
          await suspendAdminRunner(runner.id, reason.trim());
          return `${runner.name}'s access is paused.`;
        case 'reactivate':
          await reactivateAdminRunner(runner.id);
          return `${runner.name}'s access is restored.`;
        case 'offline':
          await setAdminRunnerOffline(runner.id, reason.trim());
          return `${runner.name} is now offline.`;
        case 'reset-password':
          await resetAdminRunnerPassword(runner.id);
          return `Password reset email sent to ${runner.email}.`;
        default:
          throw new Error('No action selected.');
      }
    },
    onSuccess: async (message) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.runners.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      ]);
      onDone(message);
    },
  });

  useEffect(() => {
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  if (!modal) return null;

  const editChanges = modal === 'edit' ? profileChanges() : {};
  const assignChanges = modal === 'assignment' ? assignmentChanges() : {};
  const ready = {
    edit: Object.keys(editChanges).length > 0 && form.first_name.trim() !== '' && form.last_name.trim() !== '',
    assignment: Object.keys(assignChanges).length > 0,
    assign: selectedErrand != null && !selectedErrand.already_invited,
    payout: false,
    suspend: true,
    reactivate: true,
    offline: true,
    'reset-password': Boolean(runner.email),
  }[modal];
  const confirmLabel = {
    edit: 'Save changes',
    assignment: 'Save assignment',
    assign: selectedErrand ? `Invite to ${selectedErrand.code}` : 'Send invitation',
    payout: '',
    suspend: 'Pause access',
    reactivate: 'Restore access',
    offline: 'Set offline',
    'reset-password': 'Send reset email',
  }[modal];
  const danger = modal === 'suspend' || modal === 'offline';
  const set = (key: EditableField) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const zoneNames = zonesQuery.data?.zones.filter((zone) => zone.active).map((zone) => zone.name) ?? [];
  const account = profile.payout_account;

  return (
    <Modal
      open
      onClose={() => (mutation.isPending ? undefined : onClose())}
      title={TITLES[modal]}
      size={modal === 'edit' || modal === 'assign' ? 'md' : 'sm'}
    >
      <form
        className="space-y-4 font-inter"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) mutation.mutate();
        }}
      >
        {modal === 'edit' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input value={form.first_name} onChange={set('first_name')} className={FIELD} maxLength={255} />
            </Field>
            <Field label="Last name">
              <input value={form.last_name} onChange={set('last_name')} className={FIELD} maxLength={255} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} className={FIELD} maxLength={255} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} className={FIELD} maxLength={30} placeholder="+234…" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input value={form.address} onChange={set('address')} className={FIELD} maxLength={500} />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={set('city')} className={FIELD} maxLength={255} />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={set('state')} className={FIELD} maxLength={255} />
            </Field>
            {'email' in editChanges || 'phone' in editChanges ? (
              <div className="sm:col-span-2">
                <Notice tone="amber">A changed email or phone is marked unverified until the runner confirms it.</Notice>
              </div>
            ) : null}
          </div>
        ) : null}

        {modal === 'assignment' ? (
          <>
            <Field label="Vehicle">
              <select
                value={assignment.vehicle_type}
                onChange={(e) => setAssignment((current) => ({ ...current, vehicle_type: e.target.value }))}
                className={FIELD}
              >
                {!assignment.vehicle_type ? <option value="">Not set</option> : null}
                {Object.entries(VEHICLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plate number">
              <input
                value={assignment.plate_number}
                onChange={(e) => setAssignment((current) => ({ ...current, plate_number: e.target.value }))}
                className={`${FIELD} uppercase`}
                maxLength={20}
                placeholder="e.g. LSD-482KJ"
              />
            </Field>
            <Field label="Primary service area">
              <input
                value={assignment.primary_errand_area}
                onChange={(e) => setAssignment((current) => ({ ...current, primary_errand_area: e.target.value }))}
                className={FIELD}
                maxLength={255}
                list={zoneNames.length ? 'runner-zone-options' : undefined}
                placeholder="e.g. Lekki"
              />
              {zoneNames.length ? (
                <datalist id="runner-zone-options">
                  {zoneNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              ) : null}
            </Field>
            {profile.vehicle.fleet ? (
              <Notice tone="gray">This runner also drives fleet vehicle {profile.vehicle.fleet.registration_number ?? `#${profile.vehicle.fleet.id}`}; fleet records aren't changed here.</Notice>
            ) : null}
            <Notice tone="gray">The service area is matched to a zone by name or alias. Changes apply to new dispatches straight away.</Notice>
          </>
        ) : null}

        {modal === 'assign' ? (
          <>
            <p className="text-[12px] text-[#45514a]">
              Sends {runner.name} an invitation on the requester's behalf at the listed price. They're assigned once they accept and the requester pays.
            </p>
            {assignableQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-[52px] w-full rounded-[8px]" />
                ))}
              </div>
            ) : null}
            {assignableQuery.isError ? (
              <Notice tone="red">{getApiErrorMessage(assignableQuery.error, 'Could not load open errands.')}</Notice>
            ) : null}
            {assignableQuery.data && errands.length === 0 ? <Notice tone="gray">No unassigned errands are waiting for a runner right now.</Notice> : null}
            {assignableQuery.data && !assignableQuery.data.has_location && errands.length > 0 ? (
              <Notice tone="amber">This runner hasn't shared a location, so errands are listed newest first instead of nearest.</Notice>
            ) : null}
            {errands.length > 0 ? (
              <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {errands.map((errand) => {
                  const selected = errand.id === errandId;
                  const pickup = errand.pickup_address ? splitAddress(errand.pickup_address).title : null;
                  const dropoff = errand.dropoff_address ? splitAddress(errand.dropoff_address).title : null;
                  return (
                    <label
                      key={errand.id}
                      className={`flex cursor-pointer items-start gap-[10px] rounded-[8px] border p-[10px] transition-colors ${
                        errand.already_invited
                          ? 'cursor-not-allowed border-[#e2e8e3] bg-[#f8faf8] opacity-60'
                          : selected
                            ? 'border-[#167d35] bg-[#f3faf5]'
                            : 'border-[#e2e8e3] hover:bg-[#f8faf8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="assign-errand"
                        className="mt-[3px] accent-[#167d35]"
                        disabled={errand.already_invited}
                        checked={selected}
                        onChange={() => setErrandId(errand.id)}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-[#17211b]">
                            {errand.code} · {errand.title ?? categoryLabel(errand.category)}
                          </span>
                          <span className="flex-shrink-0 text-[12px] font-semibold text-[#17211b]">
                            {errand.amount != null ? formatNaira(errand.amount) : '—'}
                          </span>
                        </span>
                        <span className="truncate text-[10px] text-[#45514a]">
                          {[pickup, dropoff].filter(Boolean).join(' → ') || 'No address'}
                        </span>
                        <span className="truncate text-[10px] text-[#7c857f]">
                          {[
                            errand.requester,
                            errand.distance_m != null ? `${distanceLabel(errand.distance_m)} away` : null,
                            errand.created_at ? `posted ${relativeAgo(errand.created_at)}` : null,
                            errand.already_invited ? 'already invited' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {modal === 'payout' ? (
          <>
            {account ? (
              <div>
                <ReadOnlyRow label="Bank" value={account.bank_name ?? '—'} />
                <ReadOnlyRow label="Account" value={`•••• ${account.account_last4}`} />
                <ReadOnlyRow label="Account name" value={account.account_name ?? '—'} />
                <ReadOnlyRow label="Wallet balance" value={formatNaira(profile.metrics.wallet_balance)} />
                <ReadOnlyRow
                  label="Pending withdrawals"
                  value={profile.metrics.pending_withdrawals.count
                    ? `${profile.metrics.pending_withdrawals.count} · ${formatNaira(profile.metrics.pending_withdrawals.amount)}`
                    : 'None'}
                />
              </div>
            ) : (
              <Notice tone="amber">{runner.name} hasn't added bank details yet, so they can't withdraw earnings.</Notice>
            )}
            <Notice tone="gray">Bank details are changed by the runner in the app so payouts always go to an account they control.</Notice>
            {withdrawalsHref ? (
              <Link to={withdrawalsHref} className="inline-block text-[12px] font-semibold text-[#167d35] hover:underline">
                Review withdrawals →
              </Link>
            ) : null}
          </>
        ) : null}

        {modal === 'suspend' ? (
          <>
            <Notice tone="red">
              {runner.name} will be signed out, taken offline and blocked from accepting errands until access is restored. They'll be notified.
            </Notice>
            {profile.active_errand ? (
              <Notice tone="amber">
                They're on {profile.active_errand.code} right now — reassign or resolve it so the requester isn't left waiting.
              </Notice>
            ) : null}
            <Field label="Reason (shared with the runner)">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Optional"
                className={`${FIELD} h-auto min-h-[72px] resize-y py-[9px]`}
              />
            </Field>
          </>
        ) : null}

        {modal === 'reactivate' ? (
          <p className="text-[12px] text-[#45514a]">{runner.name} will be able to sign in and go online again, and will be notified.</p>
        ) : null}

        {modal === 'offline' ? (
          <>
            <p className="text-[12px] text-[#45514a]">
              {runner.name} stops receiving new errands until they go online again from the app. Any errand they're already on continues.
            </p>
            <Field label="Reason (shared with the runner)">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={255}
                placeholder="Optional, e.g. not responding to dispatch"
                className={`${FIELD} h-auto min-h-[72px] resize-y py-[9px]`}
              />
            </Field>
          </>
        ) : null}

        {modal === 'reset-password' ? (
          runner.email ? (
            <p className="text-[12px] text-[#45514a]">
              Emails a one-hour password reset link to <span className="font-semibold">{runner.email}</span>. Any earlier reset links stop working.
            </p>
          ) : (
            <Notice tone="amber">This runner has no email address, so a reset link can't be sent.</Notice>
          )
        ) : null}

        {mutation.isError ? <Notice tone="red">{getApiErrorMessage(mutation.error, 'That action failed.')}</Notice> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]"
          >
            {modal === 'payout' ? 'Close' : 'Back'}
          </button>
          {modal !== 'payout' ? (
            <button
              type="submit"
              disabled={!ready || mutation.isPending}
              className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${
                danger ? 'bg-[#b84545]' : 'bg-[#167d35]'
              }`}
            >
              {mutation.isPending ? 'Working…' : confirmLabel}
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
