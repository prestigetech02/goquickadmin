import { useState } from 'react';
import type { AdminAccountItem } from '@/api/adminAdminsApi';
import { Modal } from '@/components/ui/Modal';
import { adminName } from './adminPresentation';

export type ConfirmableAction = 'resend' | 'revoke' | 'remove';

const COPY: Record<ConfirmableAction, { title: string; confirm: string; danger: boolean }> = {
  resend: { title: 'Resend sign-in details', confirm: 'Send new details', danger: false },
  revoke: { title: 'Sign out everywhere', confirm: 'Sign out', danger: true },
  remove: { title: 'Remove admin access', confirm: 'Remove access', danger: true },
};

export function AdminConfirmModal({
  action,
  admin,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  action: ConfirmableAction;
  admin: AdminAccountItem;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (role: 'buyer' | 'runner') => void;
}) {
  const [role, setRole] = useState<'buyer' | 'runner'>('buyer');
  const name = adminName(admin);
  const copy = COPY[action];
  const sessions = admin.active_sessions ?? 0;

  return (
    <Modal open onClose={() => (pending ? undefined : onCancel())} title={copy.title} size="sm">
      <div className="space-y-4 font-inter">
        {action === 'resend' ? (
          <p className="text-[12px] leading-[1.55] text-[#45514a]">
            Emails {name} a new temporary password at <span className="font-semibold text-[#17211b]">{admin.email}</span>. Their current
            password stops working and they'll be asked to set a new one at next sign-in.
          </p>
        ) : null}
        {action === 'revoke' ? (
          <p className="text-[12px] leading-[1.55] text-[#45514a]">
            Ends {sessions === 1 ? 'the 1 live session' : `all ${sessions} live sessions`} for {name}. They can sign straight back in, so
            resend their sign-in details too if you think their password is compromised.
          </p>
        ) : null}
        {action === 'remove' ? (
          <>
            <p className="text-[12px] leading-[1.55] text-[#45514a]">
              {name} loses access to this dashboard immediately and is signed out everywhere. Their past actions stay in the audit log.
            </p>
            <fieldset className="space-y-1.5">
              <legend className="text-[11px] font-semibold text-[#45514a]">Keep their account as</legend>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(
                  [
                    ['buyer', 'Requester'],
                    ['runner', 'Runner'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    aria-pressed={role === value}
                    className={`h-[36px] rounded-[8px] border text-[12px] font-semibold ${
                      role === value ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] bg-white text-[#45514a]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {error ? <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(role)}
            disabled={pending}
            className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${
              copy.danger ? 'bg-[#b84545]' : 'bg-[#167d35]'
            }`}
          >
            {pending ? 'Working…' : copy.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
