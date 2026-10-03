import { type FormEvent, useState, useSyncExternalStore } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { type ApprovalRequest, cancelApproval, completeApproval, currentApproval, subscribeApprovals } from '@/lib/adminApproval';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { http } from '@/lib/http';

const INPUT =
  'h-[38px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-3 text-[12px] text-[#17211b] outline-none focus:border-[#167d35] focus:ring-2 focus:ring-[#167d35]/15';

export function AdminApprovalPrompt() {
  const request = useSyncExternalStore(subscribeApprovals, currentApproval, currentApproval);
  if (!request) return null;

  // Sits above the page's own modal or drawer, which is usually what triggered the request.
  return (
    <div className="relative z-[70]">
      <ApprovalForm key={request.id} request={request} />
    </div>
  );
}

function ApprovalForm({ request }: { request: ApprovalRequest }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    if (!pending) cancelApproval(request.id);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { data } = await http.post<{ data: { token: string } }>('/admin/approvals', {
        email: email.trim(),
        password,
        scope: request.scope,
      });
      completeApproval(request.id, data.data.token);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not verify the super admin.'));
      setPending(false);
    }
  };

  return (
    <Modal open onClose={cancel} title="Super admin approval" size="sm">
      <form onSubmit={submit} className="space-y-4 font-inter">
        <div className="flex gap-3 rounded-[10px] border border-[#f1dfbf] bg-[#fff5e5] p-3">
          <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#b06d12]" />
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-[#17211b]">{request.label}</p>
            <p className="text-[11px] leading-[1.5] text-[#45514a]">
              This is a protected action. A super admin must enter their email and password to approve it. Their name is saved with
              this action in the audit log.
            </p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-[#45514a]">Super admin email</span>
          <input
            type="email"
            autoFocus
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-[#45514a]">Super admin password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </label>

        {error ? <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !email.trim() || !password}
            className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Checking…' : 'Approve and continue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
