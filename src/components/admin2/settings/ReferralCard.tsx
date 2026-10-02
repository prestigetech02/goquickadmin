import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminReferralProgram, updateAdminReferralProgram } from '@/api/adminPricingApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { ReferralAudienceSettings, ReferralProgram, ReferralRewardTiming } from '@/types/api';
import { SectionLink } from '../errand/parts';
import { FieldSkeleton, LoadError, NumberField, SaveFooter, SettingsCard, Switch } from './parts';

const AUDIENCES: Array<{ key: keyof ReferralProgram; label: string }> = [
  { key: 'requester', label: 'Requesters' },
  { key: 'runner', label: 'Runners' },
];

const TIMING: Record<ReferralRewardTiming, string> = {
  signup: 'on sign-up',
  first_errand: 'after first errand',
};

export function ReferralCard({ onOpenFullSettings }: { onOpenFullSettings?: () => void }) {
  const query = useQuery({ queryKey: queryKeys.pricing.referralProgram, queryFn: fetchAdminReferralProgram });
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard
      id="referrals"
      title="Referral program"
      subtitle="Rewards for people who invite friends and for the friends they invite."
      action={onOpenFullSettings ? <SectionLink onClick={onOpenFullSettings}>Timing & messages</SectionLink> : null}
    >
      {query.isError ? <LoadError text={getApiErrorMessage(query.error, 'Could not load the referral program.')} /> : null}
      {query.data ? (
        <ReferralForm key={JSON.stringify(query.data.program)} program={query.data.program} saved={saved} onSavedChange={setSaved} />
      ) : query.isLoading ? (
        <FieldSkeleton count={4} />
      ) : null}
    </SettingsCard>
  );
}

function ReferralForm({ program, saved, onSavedChange: setSaved }: { program: ReferralProgram; saved: boolean; onSavedChange: (saved: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(program);
  const dirty = JSON.stringify(form) !== JSON.stringify(program);
  const invalid = AUDIENCES.some(({ key }) => [form[key].new_user.amount, form[key].referrer.amount].some((v) => !Number.isFinite(v) || v < 0));

  const save = useMutation({
    mutationFn: () => updateAdminReferralProgram(form),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.pricing.referralProgram, response);
      setSaved(true);
    },
  });

  const patch = (audience: keyof ReferralProgram, next: (current: ReferralAudienceSettings) => ReferralAudienceSettings) => {
    setSaved(false);
    setForm((current) => ({ ...current, [audience]: next(current[audience]) }));
  };

  return (
    <>
      {AUDIENCES.map(({ key, label }) => {
        const audience = form[key];
        return (
          <div key={key} className="flex flex-col gap-[12px] rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] p-[12px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-[2px]">
                <span className="text-[12px] font-semibold text-[#17211b]">{label}</span>
                <span className="text-[10px] text-[#7c857f]">
                  {audience.enabled
                    ? `New user paid ${TIMING[audience.new_user.timing]}, referrer ${TIMING[audience.referrer.timing]}`
                    : 'Program paused: no new rewards are issued'}
                </span>
              </div>
              <Switch checked={audience.enabled} onChange={(enabled) => patch(key, (c) => ({ ...c, enabled }))} label={`${label} referral program`} />
            </div>
            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
              <NumberField
                label="New user reward"
                prefix="₦"
                min={0}
                step={50}
                disabled={!audience.enabled}
                value={audience.new_user.amount}
                onChange={(amount) => patch(key, (c) => ({ ...c, new_user: { ...c.new_user, amount } }))}
              />
              <NumberField
                label="Referrer reward"
                prefix="₦"
                min={0}
                step={50}
                disabled={!audience.enabled}
                value={audience.referrer.amount}
                onChange={(amount) => patch(key, (c) => ({ ...c, referrer: { ...c.referrer, amount } }))}
              />
            </div>
          </div>
        );
      })}
      <SaveFooter
        meta="Applies to rewards issued after saving."
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={save.isError ? getApiErrorMessage(save.error, 'Could not save the referral program.') : null}
        onDiscard={() => {
          save.reset();
          setForm(program);
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}
