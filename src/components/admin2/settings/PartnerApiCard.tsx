import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePartnerApiSettings } from '@/api/adminSettingsBoardApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSettingsBoard, PartnerApiSettings, PartnerApiSettingsSection } from '@/types/api';
import { FieldSkeleton, NumberField, SaveFooter, SettingsCard } from './parts';
import { FIELD, lastChangeText, sameValues } from './presentation';

export function PartnerApiCard({ section }: { section: PartnerApiSettingsSection | null | undefined }) {
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard
      id="partner"
      title="Partner API"
      subtitle="Host mode for live vs sandbox keys, and the virtual wallet float used when partners call with gq_test_ keys."
    >
      {section ? (
        <PartnerApiForm key={JSON.stringify(section.values)} section={section} saved={saved} onSavedChange={setSaved} />
      ) : (
        <FieldSkeleton count={2} />
      )}
    </SettingsCard>
  );
}

function PartnerApiForm({
  section,
  saved,
  onSavedChange: setSaved,
}: {
  section: PartnerApiSettingsSection;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PartnerApiSettings>(section.values);
  const dirty = !sameValues(form, section.values);
  const balanceLimit = section.limits.partner_sandbox_wallet_balance ?? [0, 100_000_000];
  const balanceOk =
    Number.isFinite(form.partner_sandbox_wallet_balance) &&
    form.partner_sandbox_wallet_balance >= balanceLimit[0] &&
    form.partner_sandbox_wallet_balance <= balanceLimit[1];
  const modeOk = ['live', 'sandbox', 'dual'].includes(form.partner_api_mode);
  const problem = !modeOk
    ? 'Choose a Partner API mode.'
    : !balanceOk
      ? `Sandbox wallet balance must be between ${balanceLimit[0].toLocaleString()} and ${balanceLimit[1].toLocaleString()} NGN.`
      : null;

  const save = useMutation({
    mutationFn: () => updatePartnerApiSettings(form),
    onSuccess: (next) => {
      queryClient.setQueryData<AdminSettingsBoard>(queryKeys.settings.board, (board) =>
        board ? { ...board, partner: next } : board,
      );
      setSaved(true);
    },
  });

  return (
    <>
      <label className="flex min-w-0 flex-col gap-[6px]">
        <span className="text-[11px] font-semibold text-[#45514a]">API mode</span>
        <select
          value={form.partner_api_mode}
          onChange={(e) => {
            setSaved(false);
            setForm((current) => ({
              ...current,
              partner_api_mode: e.target.value as PartnerApiSettings['partner_api_mode'],
            }));
          }}
          className={FIELD}
        >
          {(section.modes ?? []).map((mode) => (
            <option key={mode.key} value={mode.key}>
              {mode.label}
            </option>
          ))}
        </select>
        <span className="text-[10px] leading-[1.45] text-[#7c857f]">
          {(section.modes ?? []).find((m) => m.key === form.partner_api_mode)?.help ??
            'Controls which key prefixes this API host accepts.'}
          {section.env_defaults?.partner_api_mode
            ? ` Env default: ${section.env_defaults.partner_api_mode}.`
            : ''}
        </span>
      </label>

      <NumberField
        label="Sandbox virtual wallet balance"
        help={`Used only for gq_test_ create-job balance checks. No live org wallet is debited. Env default: ${(
          section.env_defaults?.partner_sandbox_wallet_balance ?? 1_000_000
        ).toLocaleString()} NGN.`}
        prefix="₦"
        min={balanceLimit[0]}
        max={balanceLimit[1]}
        step={1000}
        value={form.partner_sandbox_wallet_balance}
        onChange={(value) => {
          setSaved(false);
          setForm((current) => ({ ...current, partner_sandbox_wallet_balance: value }));
        }}
      />

      <SaveFooter
        meta={lastChangeText(section.last_change)}
        dirty={dirty}
        invalid={problem !== null}
        saving={save.isPending}
        saved={saved}
        error={save.isError ? getApiErrorMessage(save.error, 'Could not save Partner API settings.') : dirty ? problem : null}
        onDiscard={() => {
          save.reset();
          setForm(section.values);
          setSaved(false);
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}
