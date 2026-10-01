import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reactivateAdminUser,
  revokeAdminUserSessions,
  sendAdminUserPasswordReset,
  suspendAdminUser,
  updateAdminUser,
} from '@/api/adminUsersApi';
import { adjustAdminUserWallet } from '@/api/adminWalletApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminUserProfile, AdminUserProfileUpdate } from '@/types/api';
import { formatNaira } from '../format';

export type UserModal = 'edit' | 'wallet-credit' | 'reset-password' | 'suspend' | 'reactivate' | 'sign-out';

const FIELD =
  'h-[38px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

const TITLES: Record<UserModal, string> = {
  edit: 'Edit profile',
  'wallet-credit': 'Issue wallet credit',
  'reset-password': 'Send password reset',
  suspend: 'Suspend account',
  reactivate: 'Reactivate account',
  'sign-out': 'Sign out everywhere',
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

function initialForm(user: AdminUserProfile['user']): Record<EditableField, string> {
  return Object.fromEntries(EDITABLE.map((key) => [key, user[key] ?? ''])) as Record<EditableField, string>;
}

export function UserActionModals({
  profile,
  modal,
  onClose,
  onDone,
}: {
  profile: AdminUserProfile;
  modal: UserModal | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = profile;
  const [form, setForm] = useState(() => initialForm(user));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setForm(initialForm(user));
    setAmount('');
    setReason('');
    // Only reset when a dialog opens, not on background refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const changes = (): AdminUserProfileUpdate => {
    const out: Record<string, string | null> = {};
    for (const key of EDITABLE) {
      const next = form[key].trim();
      if (next !== (user[key] ?? '')) out[key] = next === '' && key !== 'first_name' && key !== 'last_name' ? null : next;
    }
    return out as AdminUserProfileUpdate;
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      switch (modal) {
        case 'edit':
          await updateAdminUser(user.id, changes());
          return 'Profile updated.';
        case 'wallet-credit':
          await adjustAdminUserWallet(user.id, { type: 'credit', amount: Number(amount), reason: reason.trim() });
          return `${formatNaira(Number(amount))} credited to ${user.name}'s wallet.`;
        case 'reset-password':
          return sendAdminUserPasswordReset(user.id);
        case 'suspend':
          await suspendAdminUser(user.id);
          return `${user.name} has been suspended and signed out.`;
        case 'reactivate':
          await reactivateAdminUser(user.id);
          return `${user.name} has been reactivated.`;
        case 'sign-out': {
          const { revoked } = await revokeAdminUserSessions(user.id);
          return revoked === 1 ? 'Signed out of 1 session.' : `Signed out of ${revoked} sessions.`;
        }
        default:
          throw new Error('No action selected.');
      }
    },
    onSuccess: async (message) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      onDone(message);
    },
  });

  useEffect(() => {
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  if (!modal) return null;

  const amountValue = Number(amount);
  const editChanges = modal === 'edit' ? changes() : {};
  const contactChanged = 'email' in editChanges || 'phone' in editChanges;
  const ready = {
    edit: Object.keys(editChanges).length > 0 && form.first_name.trim() !== '' && form.last_name.trim() !== '',
    'wallet-credit': amountValue > 0 && reason.trim().length >= 8,
    'reset-password': true,
    suspend: true,
    reactivate: true,
    'sign-out': true,
  }[modal];
  const confirmLabel = {
    edit: 'Save changes',
    'wallet-credit': amountValue > 0 ? `Credit ${formatNaira(amountValue)}` : 'Credit wallet',
    'reset-password': 'Send reset email',
    suspend: 'Suspend account',
    reactivate: 'Reactivate account',
    'sign-out': 'Sign out everywhere',
  }[modal];
  const danger = modal === 'suspend' || modal === 'sign-out';
  const set = (key: EditableField) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Modal open onClose={() => (mutation.isPending ? undefined : onClose())} title={TITLES[modal]} size={modal === 'edit' ? 'md' : 'sm'}>
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
            {contactChanged ? (
              <div className="sm:col-span-2">
                <Notice tone="amber">A changed email or phone is marked unverified until the user confirms it.</Notice>
              </div>
            ) : null}
          </div>
        ) : null}

        {modal === 'wallet-credit' ? (
          <>
            <p className="text-[12px] text-[#45514a]">
              Adds money to {user.name}'s wallet immediately. Current balance:{' '}
              {profile.metrics.wallet_balance != null ? formatNaira(profile.metrics.wallet_balance) : '—'}.
            </p>
            <Field label="Amount (₦)">
              <input
                type="number"
                min={1}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={FIELD}
                placeholder="0.00"
              />
            </Field>
            <Field label="Reason (saved to the ledger)">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="At least 8 characters, e.g. compensation for late delivery on ER-…"
                className={`${FIELD} h-auto min-h-[80px] resize-y py-[9px]`}
              />
            </Field>
          </>
        ) : null}

        {modal === 'reset-password' ? (
          <p className="text-[12px] text-[#45514a]">
            Emails a one-hour password reset link to <span className="font-semibold">{user.email}</span>. Any earlier reset links stop working.
          </p>
        ) : null}

        {modal === 'suspend' ? (
          <Notice tone="red">
            {user.name} will be signed out of every device and can't use GoQuick until reactivated. They'll be notified.
          </Notice>
        ) : null}

        {modal === 'reactivate' ? (
          <p className="text-[12px] text-[#45514a]">{user.name} will be able to sign in again and will be notified.</p>
        ) : null}

        {modal === 'sign-out' ? (
          <p className="text-[12px] text-[#45514a]">
            Ends all {profile.sessions.length} signed-in {profile.sessions.length === 1 ? 'session' : 'sessions'}. {user.name} can sign back in
            straight away — suspend the account to block access.
          </p>
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
