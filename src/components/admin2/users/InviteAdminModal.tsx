import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdminAccount } from '@/api/adminAdminsApi';
import { Modal } from '@/components/ui/Modal';
import { ADMIN_MODULE_OPTIONS } from '@/lib/adminNavigation';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminModule } from '@/types';

const INPUT =
  'h-[38px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

export function InviteAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [modules, setModules] = useState<AdminModule[]>(['operations']);
  const [sendEmail, setSendEmail] = useState(true);
  const [result, setResult] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createAdminAccount({ name: name.trim(), email: email.trim(), modules, send_email: sendEmail }),
    onSuccess: (data) => {
      setResult(
        data.email_sent
          ? `Invitation sent to ${data.admin.email}.`
          : `${data.admin.email} was added. No invitation email was sent.`,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });

  const close = () => {
    setName('');
    setEmail('');
    setModules(['operations']);
    setSendEmail(true);
    setResult(null);
    mutation.reset();
    onClose();
  };

  const toggleModule = (key: AdminModule) =>
    setModules((current) => (current.includes(key) ? current.filter((m) => m !== key) : [...current, key]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || modules.length === 0) return;
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={close} title="Invite staff admin">
      {result ? (
        <div className="space-y-4 font-inter">
          <p className="rounded-[8px] bg-[#eaf6ed] px-3 py-2.5 text-[12px] font-medium text-[#0d5e27]">{result}</p>
          <div className="flex justify-end">
            <button type="button" onClick={close} className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 font-inter">
          <p className="text-[12px] text-[#45514a]">
            Staff admins sign in to this dashboard with access limited to the modules you choose.
          </p>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Full name</span>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amaka Obi" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-[#45514a]">Work email</span>
            <input
              className={INPUT}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@goquick.ng"
              required
            />
          </label>
          <fieldset className="space-y-1.5">
            <legend className="text-[11px] font-semibold text-[#45514a]">Module access</legend>
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {ADMIN_MODULE_OPTIONS.map((option) => {
                const checked = modules.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleModule(option.key)}
                    aria-pressed={checked}
                    className={`flex flex-col items-start gap-[2px] rounded-[10px] border px-[12px] py-[9px] text-left transition-colors ${
                      checked ? 'border-[#167d35] bg-[#eaf6ed]' : 'border-[#d4ddd6] bg-white hover:bg-[#f8faf8]'
                    }`}
                  >
                    <span className={`text-[12px] font-semibold ${checked ? 'text-[#0d5e27]' : 'text-[#17211b]'}`}>{option.label}</span>
                    <span className="text-[10px] text-[#7c857f]">{option.description}</span>
                  </button>
                );
              })}
            </div>
            {modules.length === 0 ? <p className="text-[11px] text-[#b84545]">Choose at least one module.</p> : null}
          </fieldset>
          <label className="flex items-center gap-2 text-[12px] text-[#45514a]">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-[#167d35]" />
            Email the invitation with sign-in instructions
          </label>
          {mutation.isError ? (
            <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
              {getApiErrorMessage(mutation.error, 'Could not invite this admin.')}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || modules.length === 0}
              className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {mutation.isPending ? 'Inviting…' : 'Send invite'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
