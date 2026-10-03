import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminReferralProgram, updateAdminReferralProgram } from '@/api/adminPricingApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { ReferralAudienceSettings, ReferralProgram, ReferralProgramResponse, ReferralRewardRule, ReferralRewardTiming } from '@/types/api';
import { formatNaira } from '../format';
import { FieldSkeleton, LoadError, NumberField, SaveFooter, SettingsCard, Switch } from './parts';

const AUDIENCES: Array<{ key: keyof ReferralProgram; label: string; who: string }> = [
  { key: 'requester', label: 'Requesters', who: 'customers' },
  { key: 'runner', label: 'Runners', who: 'runners' },
];

const REWARDS: Array<{ key: 'new_user' | 'referrer'; label: string; help: string }> = [
  { key: 'new_user', label: 'Friend who joins', help: 'Paid to the new user who signs up with a code.' },
  { key: 'referrer', label: 'Person who invited', help: 'Paid to the person who shared the code.' },
];

const TIMING: Array<{ value: ReferralRewardTiming; label: string; summary: string }> = [
  { value: 'signup', label: 'On sign-up', summary: 'on sign-up' },
  { value: 'first_errand', label: 'After first errand', summary: 'after the first errand' },
];

const MESSAGE_LIMIT = 500;

export function ReferralCard() {
  const query = useQuery({ queryKey: queryKeys.pricing.referralProgram, queryFn: fetchAdminReferralProgram });
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard id="referrals" title="Referral program" subtitle="Who can use a code, who gets paid and when, and the text people see when they share.">
      {query.isError ? <LoadError text={getApiErrorMessage(query.error, 'Could not load the referral program.')} /> : null}
      {query.data ? (
        <ReferralForm key={JSON.stringify(query.data.program)} data={query.data} saved={saved} onSavedChange={setSaved} />
      ) : query.isLoading ? (
        <FieldSkeleton count={6} />
      ) : null}
    </SettingsCard>
  );
}

function ReferralForm({ data, saved, onSavedChange: setSaved }: { data: ReferralProgramResponse; saved: boolean; onSavedChange: (saved: boolean) => void }) {
  const queryClient = useQueryClient();
  const { program, placeholders } = data;
  const [form, setForm] = useState(program);
  const dirty = JSON.stringify(form) !== JSON.stringify(program);
  const invalid = AUDIENCES.some(({ key }) => !audienceValid(form[key]));

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
      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
        {AUDIENCES.map(({ key, label, who }) => (
          <AudiencePanel key={key} label={label} who={who} audience={form[key]} onChange={(next) => patch(key, next)} />
        ))}
      </div>

      {placeholders.length > 0 ? (
        <div className="flex flex-col gap-[8px] rounded-[10px] bg-[#f8faf8] px-[12px] py-[10px]">
          <span className="text-[11px] font-semibold text-[#45514a]">Placeholders you can use in messages</span>
          <div className="flex flex-wrap gap-x-[16px] gap-y-[6px]">
            {placeholders.map((item) => (
              <span key={item.token} className="text-[10px] text-[#7c857f]">
                <code className="rounded-[4px] bg-white px-[5px] py-[1px] font-mono text-[10px] font-semibold text-[#17211b]">{item.token}</code> {item.help}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <SaveFooter
        meta="Applies to codes used after saving. Rewards already earned are not changed."
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={
          save.isError
            ? getApiErrorMessage(save.error, 'Could not save the referral program.')
            : dirty && invalid
              ? 'Amounts must be zero or more, and both messages need text.'
              : null
        }
        onDiscard={() => {
          save.reset();
          setForm(program);
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}

function AudiencePanel({
  label,
  who,
  audience,
  onChange,
}: {
  label: string;
  who: string;
  audience: ReferralAudienceSettings;
  onChange: (next: (current: ReferralAudienceSettings) => ReferralAudienceSettings) => void;
}) {
  const setReward = (key: 'new_user' | 'referrer', reward: ReferralRewardRule) => onChange((c) => ({ ...c, [key]: reward }));
  const signupPaid = REWARDS.some(({ key }) => audience[key].enabled && audience[key].timing === 'signup' && audience[key].amount > 0);

  return (
    <div className="flex min-w-0 flex-col gap-[12px] rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] p-[12px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="text-[13px] font-semibold text-[#17211b]">{label}</span>
          <span className="text-[10px] leading-[1.45] text-[#7c857f]">{audienceSummary(audience, who)}</span>
        </div>
        <label className="flex flex-shrink-0 items-center gap-[8px] text-[11px] font-semibold text-[#45514a]">
          Accept codes
          <Switch checked={audience.enabled} onChange={(enabled) => onChange((c) => ({ ...c, enabled }))} label={`${label}: accept referral codes`} />
        </label>
      </div>

      {REWARDS.map(({ key, label: rewardLabel, help }) => (
        <RewardFields
          key={key}
          label={rewardLabel}
          help={help}
          reward={audience[key]}
          disabled={!audience.enabled}
          onChange={(reward) => setReward(key, reward)}
        />
      ))}

      {audience.enabled && signupPaid ? (
        <p className="rounded-[8px] bg-[#fff5e5] px-[10px] py-[8px] text-[10px] leading-[1.45] text-[#b06d12]">
          Sign-up rewards are paid before anyone completes an errand, which makes them easier to claim with throwaway accounts.
        </p>
      ) : null}

      <MessageField
        label="Message on the referral screen"
        rows={2}
        value={audience.screen_message}
        preview={fillPlaceholders(audience.screen_message, audience)}
        onChange={(screen_message) => onChange((c) => ({ ...c, screen_message }))}
      />
      <MessageField
        label="Message sent when sharing"
        rows={3}
        value={audience.share_message}
        preview={fillPlaceholders(audience.share_message, audience)}
        onChange={(share_message) => onChange((c) => ({ ...c, share_message }))}
      />
    </div>
  );
}

function RewardFields({
  label,
  help,
  reward,
  disabled,
  onChange,
}: {
  label: string;
  help: string;
  reward: ReferralRewardRule;
  disabled: boolean;
  onChange: (reward: ReferralRewardRule) => void;
}) {
  const off = disabled || !reward.enabled;

  return (
    <div className="flex flex-col gap-[10px] rounded-[8px] border border-[#eef1ee] bg-white p-[10px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="text-[12px] font-semibold text-[#17211b]">{label}</span>
          <span className="text-[10px] text-[#7c857f]">{help}</span>
        </div>
        <label className="flex flex-shrink-0 items-center gap-[8px] text-[11px] font-semibold text-[#45514a]">
          Pay
          <Switch checked={reward.enabled} disabled={disabled} onChange={(enabled) => onChange({ ...reward, enabled })} label={`Pay ${label.toLowerCase()}`} />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
        <NumberField label="Reward" prefix="₦" min={0} step={50} disabled={off} value={reward.amount} onChange={(amount) => onChange({ ...reward, amount })} />
        <div className="flex min-w-0 flex-col gap-[6px]">
          <span className="text-[11px] font-semibold text-[#45514a]">Paid</span>
          <div className="flex h-[36px] rounded-[8px] border border-[#d4ddd6] bg-[#f8faf8] p-[2px]" role="radiogroup" aria-label={`When ${label.toLowerCase()} is paid`}>
            {TIMING.map((option) => {
              const on = reward.timing === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={off}
                  onClick={() => onChange({ ...reward, timing: option.value })}
                  className={`flex-1 whitespace-nowrap rounded-[6px] px-[6px] text-[11px] font-semibold disabled:opacity-60 ${
                    on ? 'bg-white text-[#0d5e27] shadow-sm' : 'text-[#7c857f] hover:text-[#45514a]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {reward.timing === 'first_errand' ? (
        <NumberField
          label="Minimum first errand"
          help="The first errand must be worth at least this much. Use 0 for any amount."
          prefix="₦"
          min={0}
          step={500}
          disabled={off}
          value={reward.min_errand_amount}
          onChange={(min_errand_amount) => onChange({ ...reward, min_errand_amount })}
        />
      ) : null}
    </div>
  );
}

function MessageField({ label, rows, value, preview, onChange }: { label: string; rows: number; value: string; preview: string; onChange: (value: string) => void }) {
  const empty = value.trim() === '';

  return (
    <label className="flex flex-col gap-[6px]">
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#45514a]">
        {label}
        <span className={`font-normal tabular-nums ${value.length >= MESSAGE_LIMIT ? 'text-[#b84545]' : 'text-[#7c857f]'}`}>
          {value.length}/{MESSAGE_LIMIT}
        </span>
      </span>
      <textarea
        rows={rows}
        maxLength={MESSAGE_LIMIT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-y rounded-[8px] border bg-white px-[11px] py-[8px] text-[12px] leading-[1.5] text-[#17211b] outline-none focus:border-[#167d35] ${
          empty ? 'border-[#e8b4b4]' : 'border-[#d4ddd6]'
        }`}
      />
      {empty ? (
        <span className="text-[10px] text-[#b84545]">A message is required.</span>
      ) : (
        <span className="text-[10px] leading-[1.45] text-[#7c857f]">
          Preview: <span className="text-[#45514a]">{preview}</span>
        </span>
      )}
    </label>
  );
}

function audienceValid(audience: ReferralAudienceSettings): boolean {
  const amounts = REWARDS.flatMap(({ key }) => [audience[key].amount, audience[key].min_errand_amount]);
  const messages = [audience.screen_message, audience.share_message];
  return amounts.every((v) => Number.isFinite(v) && v >= 0) && messages.every((m) => m.trim() !== '' && m.length <= MESSAGE_LIMIT);
}

function audienceSummary(audience: ReferralAudienceSettings, who: string): string {
  if (!audience.enabled) return `Paused: ${who} can't use referral codes and no new rewards are issued.`;
  const parts = REWARDS.map(({ key, label }) => {
    const reward = audience[key];
    if (!reward.enabled || reward.amount <= 0) return `${label}: no reward`;
    const when = TIMING.find((t) => t.value === reward.timing)?.summary ?? '';
    return `${label}: ${formatNaira(reward.amount)} ${when}`;
  });
  return parts.join(' · ');
}

function fillPlaceholders(message: string, audience: ReferralAudienceSettings): string {
  const values: Record<string, string> = {
    '{code}': 'ADA4K2',
    '{amount}': formatNaira(audience.referrer.amount || 0),
    '{friend_amount}': formatNaira(audience.new_user.amount || 0),
    '{min_amount}': formatNaira(audience.referrer.min_errand_amount || 0),
    '{name}': 'Tunde',
  };
  return message.replace(/\{(code|amount|friend_amount|min_amount|name)\}/g, (token) => values[token] ?? token);
}
