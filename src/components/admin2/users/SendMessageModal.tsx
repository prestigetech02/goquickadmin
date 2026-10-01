import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { broadcastAdminNotification } from '@/api/adminNotificationsApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';

const MAX_RECIPIENTS = 500;

const FIELD =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

/** In-app + push notification to specific users; admins are skipped by the broadcast endpoint. */
export function SendMessageModal({
  open,
  onClose,
  userIds,
  skippedAdmins = 0,
}: {
  open: boolean;
  onClose: () => void;
  userIds: number[];
  skippedAdmins?: number;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const recipients = userIds.slice(0, MAX_RECIPIENTS);

  const mutation = useMutation({
    mutationFn: () => broadcastAdminNotification({ title: title.trim(), message: message.trim(), target: 'custom', user_ids: recipients }),
    onSuccess: () => setSent(true),
  });

  const close = () => {
    setTitle('');
    setMessage('');
    setSent(false);
    mutation.reset();
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !message.trim() || recipients.length === 0) return;
    mutation.mutate();
  };

  const recipientLabel = `${recipients.length} user${recipients.length === 1 ? '' : 's'}`;

  return (
    <Modal open={open} onClose={close} title="Send message">
      {sent ? (
        <div className="space-y-4 font-inter">
          <p className="rounded-[8px] bg-[#eaf6ed] px-3 py-2.5 text-[12px] font-medium text-[#0d5e27]">
            Message queued for {recipientLabel}.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={close} className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 font-inter">
          <p className="text-[12px] text-[#45514a]">
            Sends an in-app and push notification to <span className="font-semibold text-[#17211b]">{recipientLabel}</span>.
            {skippedAdmins > 0 ? ` ${skippedAdmins} admin${skippedAdmins === 1 ? '' : 's'} in the selection will be skipped.` : ''}
            {userIds.length > MAX_RECIPIENTS ? ` Only the first ${MAX_RECIPIENTS} users are included.` : ''}
          </p>
          {recipients.length === 0 ? (
            <p className="rounded-[8px] bg-[#fff5e5] px-3 py-2 text-[11px] font-medium text-[#b06d12]">
              Messages can only be sent to requesters and runners.
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Title</span>
            <input className={`${FIELD} h-[38px]`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Message</span>
            <textarea
              className={`${FIELD} min-h-[110px] resize-y py-[9px]`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              required
            />
          </label>
          {mutation.isError ? (
            <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
              {getApiErrorMessage(mutation.error, 'Could not send this message.')}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || recipients.length === 0}
              className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {mutation.isPending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
