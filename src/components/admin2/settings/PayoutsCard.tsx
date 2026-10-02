import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePayoutSettings } from '@/api/adminSettingsBoardApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSettingsBoard, PayoutSettings, SettingsSection } from '@/types/api';
import { formatNaira } from '../format';
import { FieldSkeleton, NumberField, SaveFooter, SettingsCard, ToggleRow } from './parts';
import { lastChangeText, sameValues } from './presentation';

type Section = SettingsSection<PayoutSettings>;

export function PayoutsCard({ section }: { section: Section | null | undefined }) {
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard id="payouts" title="Payments & payouts" subtitle="When and how much runners can withdraw from their wallets.">
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
  const dirty = !sameValues(form, section.values);
  const [min, max] = section.limits.runner_min_withdrawal_amount ?? [0, 1_000_000];
  const amount = form.runner_min_withdrawal_amount;
  const invalid = !Number.isFinite(amount) || amount < min || amount > max;

  const save = useMutation({
    mutationFn: () => updatePayoutSettings(form),
    onSuccess: (next) => {
      queryClient.setQueryData<AdminSettingsBoard>(queryKeys.settings.board, (board) => (board ? { ...board, payouts: next } : board));
      setSaved(true);
    },
  });

  const update = (patch: Partial<PayoutSettings>) => {
    setSaved(false);
    setForm((current) => ({ ...current, ...patch }));
  };

  return (
    <>
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
      <SaveFooter
        meta={lastChangeText(section.last_change)}
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={
          save.isError
            ? getApiErrorMessage(save.error, 'Could not save payout settings.')
            : dirty && invalid
              ? `Minimum withdrawal must be between ${formatNaira(min)} and ${formatNaira(max)}.`
              : null
        }
        onDiscard={() => {
          save.reset();
          setForm(section.values);
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}
