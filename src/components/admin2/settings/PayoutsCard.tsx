import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { updatePayoutSettings } from '@/api/adminSettingsBoardApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSettingsBoard, PayoutSettings, PayoutSettingsSection } from '@/types/api';
import { formatNaira } from '../format';
import { FieldSkeleton, NumberField, SaveFooter, SettingsCard, ToggleRow } from './parts';
import { FIELD, lastChangeText, sameValues } from './presentation';

type Section = PayoutSettingsSection;

export function PayoutsCard({ section }: { section: Section | null | undefined }) {
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard id="payouts" title="Payments & payouts" subtitle="Who can withdraw, when, and how much.">
      {section ? (
        <PayoutsForm key={JSON.stringify(section.values)} section={section} saved={saved} onSavedChange={setSaved} />
      ) : (
        <FieldSkeleton count={2} />
      )}
    </SettingsCard>
  );
}

function PayoutsForm({ section, saved, onSavedChange: setSaved }: { section: Section; saved: boolean; onSavedChange: (saved: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(section.values);
  const [confirming, setConfirming] = useState(false);
  const dirty = !sameValues(form, section.values);
  const [min, max] = section.limits.runner_min_withdrawal_amount ?? [0, 1_000_000];
  const amount = form.runner_min_withdrawal_amount;
  const amountInvalid = !Number.isFinite(amount) || amount < min || amount > max;
  const messageMax = section.withdrawals_paused_message_max;
  const messageInvalid = form.withdrawals_paused_message.length > messageMax;
  const invalid = amountInvalid || messageInvalid;

  const pausing = [
    section.values.runner_withdrawals_enabled && !form.runner_withdrawals_enabled ? 'runners' : null,
    section.values.requester_withdrawals_enabled && !form.requester_withdrawals_enabled ? 'customers' : null,
  ].filter((group): group is string => group !== null);

  const save = useMutation({
    mutationFn: () => updatePayoutSettings(form),
    onSuccess: (next) => {
      queryClient.setQueryData<AdminSettingsBoard>(queryKeys.settings.board, (board) => (board ? { ...board, payouts: next } : board));
      void queryClient.invalidateQueries({ queryKey: ['admin-payments', 'withdrawals-overview'] });
      setConfirming(false);
      setSaved(true);
    },
  });

  const update = (patch: Partial<PayoutSettings>) => {
    setSaved(false);
    setConfirming(false);
    setForm((current) => ({ ...current, ...patch }));
  };

  const anyPaused = !form.runner_withdrawals_enabled || !form.requester_withdrawals_enabled;

  return (
    <>
      <div className="flex flex-col gap-[12px] rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] px-[14px] py-[12px]">
        <ToggleRow
          label="Runner withdrawals"
          help={
            form.runner_withdrawals_enabled
              ? 'Runners can request payouts from their earnings.'
              : 'Paused. Runners see the message below and cannot request a payout.'
          }
          checked={form.runner_withdrawals_enabled}
          onChange={(runner_withdrawals_enabled) => update({ runner_withdrawals_enabled })}
        />
        <ToggleRow
          label="Customer withdrawals"
          help={
            form.requester_withdrawals_enabled
              ? 'Customers can withdraw their wallet balance to a bank account.'
              : 'Paused. Customers see the message below and cannot request a withdrawal.'
          }
          checked={form.requester_withdrawals_enabled}
          onChange={(requester_withdrawals_enabled) => update({ requester_withdrawals_enabled })}
        />
        <label className="flex min-w-0 flex-col gap-[6px]">
          <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#45514a]">
            Message shown while paused
            <span className={`text-[10px] font-normal ${messageInvalid ? 'text-[#b84545]' : 'text-[#7c857f]'}`}>
              {form.withdrawals_paused_message.length}/{messageMax}
            </span>
          </span>
          <textarea
            rows={2}
            value={form.withdrawals_paused_message}
            placeholder={section.default_withdrawals_paused_message}
            onChange={(e) => update({ withdrawals_paused_message: e.target.value })}
            className={`${FIELD} h-auto resize-none py-[8px] leading-[1.45]`}
          />
          <span className="text-[10px] leading-[1.45] text-[#7c857f]">
            {anyPaused ? 'Users currently see this message in the app when they try to withdraw.' : 'Shown in the apps whenever you pause withdrawals.'}{' '}
            Leave it empty to use the default. Withdrawals already in the queue can still be approved and paid.
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <NumberField
          label="Runner minimum withdrawal"
          help="Runners can't request a payout below this amount. The runner app still shows ₦3,000 until its next update."
          prefix="₦"
          min={min}
          max={max}
          step={500}
          value={amount}
          onChange={(value) => update({ runner_min_withdrawal_amount: value })}
        />
      </div>
      <ToggleRow
        label="Weekend payouts"
        help={
          form.weekend_payouts_enabled
            ? 'Withdrawals are scheduled 24 hours after the request, including Saturdays and Sundays.'
            : 'Withdrawals due on a Saturday or Sunday are scheduled for the following Monday.'
        }
        checked={form.weekend_payouts_enabled}
        onChange={(weekend_payouts_enabled) => update({ weekend_payouts_enabled })}
      />

      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#f1d9a6] bg-[#fff8e8] px-[14px] py-[10px]">
          <p className="flex min-w-0 items-start gap-[8px] text-[11px] leading-[1.45] text-[#7a5a12]">
            <AlertTriangle className="mt-[1px] size-[14px] flex-shrink-0" strokeWidth={2} />
            {pausing.length === 2 ? 'Runners and customers' : pausing[0] === 'runners' ? 'Runners' : 'Customers'} won't be able to request
            withdrawals until you switch this back on.
          </p>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={save.isPending}
              className="h-[30px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="h-[30px] rounded-[8px] bg-[#b84545] px-[12px] text-[11px] font-semibold text-white hover:bg-[#9a3434] disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Pause withdrawals'}
            </button>
          </div>
        </div>
      ) : null}

      <SaveFooter
        meta={lastChangeText(section.last_change)}
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={
          save.isError
            ? getApiErrorMessage(save.error, 'Could not save payout settings.')
            : dirty && amountInvalid
              ? `Minimum withdrawal must be between ${formatNaira(min)} and ${formatNaira(max)}.`
              : dirty && messageInvalid
                ? `The paused message can be at most ${messageMax} characters.`
                : null
        }
        onDiscard={() => {
          save.reset();
          setConfirming(false);
          setForm(section.values);
        }}
        onSave={() => (pausing.length > 0 ? setConfirming(true) : save.mutate())}
      />
    </>
  );
}
