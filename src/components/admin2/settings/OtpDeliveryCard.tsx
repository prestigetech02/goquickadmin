import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText } from 'lucide-react';
import { updateOtpSettings } from '@/api/adminSettingsBoardApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSettingsBoard, OtpDeliverySettings, OtpDeliverySettingsSection } from '@/types/api';
import { Chip } from '../errand/parts';
import { AMBER, GREEN } from '../userDetails/presentation';
import { FieldSkeleton, SaveFooter, SettingsCard, ToggleRow } from './parts';
import { FIELD, lastChangeText, sameValues } from './presentation';

type Section = OtpDeliverySettingsSection;

const PROVIDER_HELP: Record<OtpDeliverySettings['otp_phone_provider'], string> = {
  sms: 'Codes go out by SMS through Flutterwave. This is the safest default until WhatsApp templates are approved.',
  meta: 'Codes go out on WhatsApp through Meta Cloud API using your approved OTP template.',
  zoho_cpaas: 'Codes go out on WhatsApp through Zoho / Zepto CPaaS using your configured template.',
};

export function OtpDeliveryCard({ section }: { section: Section | null | undefined }) {
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard
      id="otp"
      title="Phone OTP delivery"
      subtitle="Choose how login and password-reset codes reach users. Email OTP stays on Zepto Mail."
    >
      {section ? (
        <OtpForm key={JSON.stringify(section.values)} section={section} saved={saved} onSavedChange={setSaved} />
      ) : (
        <FieldSkeleton count={3} />
      )}
    </SettingsCard>
  );
}

function OtpForm({
  section,
  saved,
  onSavedChange: setSaved,
}: {
  section: Section;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(section.values);
  const dirty = !sameValues(form, section.values);
  const templateInvalid = form.otp_whatsapp_template.trim().length < 2 || form.otp_whatsapp_template.length > 80;
  const languageInvalid = form.otp_whatsapp_language.trim().length < 2 || form.otp_whatsapp_language.length > 12;
  const selected = section.providers.find((p) => p.key === form.otp_phone_provider);
  const selectedMissing = selected ? !selected.configured : false;
  const whatsappPrimary = form.otp_phone_provider !== 'sms';
  const invalid = templateInvalid || languageInvalid;

  const save = useMutation({
    mutationFn: () =>
      updateOtpSettings({
        ...form,
        otp_whatsapp_template: form.otp_whatsapp_template.trim(),
        otp_whatsapp_language: form.otp_whatsapp_language.trim(),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData<AdminSettingsBoard>(queryKeys.settings.board, (board) =>
        board ? { ...board, otp: next } : board,
      );
      setSaved(true);
    },
  });

  const update = (patch: Partial<OtpDeliverySettings>) => {
    setSaved(false);
    setForm((current) => ({ ...current, ...patch }));
  };

  return (
    <>
      <div className="flex flex-col gap-[10px]">
        {section.providers.map((provider) => {
          const active = form.otp_phone_provider === provider.key;
          return (
            <button
              key={provider.key}
              type="button"
              onClick={() => update({ otp_phone_provider: provider.key })}
              className={`flex items-start gap-[12px] rounded-[10px] border px-[14px] py-[12px] text-left transition-colors ${
                active ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#eef1ee] bg-[#fbfcfb] hover:border-[#d4ddd6]'
              }`}
            >
              <span
                className={`mt-[2px] flex size-[16px] flex-shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-[#167d35] bg-[#167d35]' : 'border-[#c5cfc8] bg-white'
                }`}
              >
                {active ? <span className="size-[6px] rounded-full bg-white" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <span className="flex flex-wrap items-center gap-[8px]">
                  <span className="text-[12px] font-semibold text-[#17211b]">{provider.label}</span>
                  {provider.configured ? <Chip tone={GREEN} label="Ready" dot /> : <Chip tone={AMBER} label="Not configured" dot />}
                </span>
                <span className="text-[10px] leading-[1.45] text-[#7c857f]">{PROVIDER_HELP[provider.key]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="flex items-start gap-[8px] text-[10px] leading-[1.45] text-[#7c857f]">
        <MessageSquareText className="mt-[1px] size-[14px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
        {PROVIDER_HELP[form.otp_phone_provider]}
        {selectedMissing
          ? ' Server keys for this provider are missing, so sends will fail until an engineer configures them.'
          : ''}
      </p>

      {whatsappPrimary ? (
        <>
          <ToggleRow
            label="SMS fallback"
            help={
              form.otp_sms_fallback
                ? 'If WhatsApp fails, the same login attempt retries over Flutterwave SMS.'
                : 'WhatsApp failures are returned to the user with no SMS retry.'
            }
            checked={form.otp_sms_fallback}
            onChange={(otp_sms_fallback) => update({ otp_sms_fallback })}
          />
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[11px] font-semibold text-[#45514a]">WhatsApp template name</span>
              <input
                value={form.otp_whatsapp_template}
                onChange={(e) => update({ otp_whatsapp_template: e.target.value })}
                className={FIELD}
                placeholder="goquick_otp"
              />
              <span className="text-[10px] leading-[1.45] text-[#7c857f]">
                Must match an approved authentication or utility template with one body variable for the code.
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[11px] font-semibold text-[#45514a]">Template language</span>
              <input
                value={form.otp_whatsapp_language}
                onChange={(e) => update({ otp_whatsapp_language: e.target.value })}
                className={FIELD}
                placeholder="en"
              />
              <span className="text-[10px] leading-[1.45] text-[#7c857f]">Language code as approved in Meta or Zoho (for example en or en_US).</span>
            </label>
          </div>
        </>
      ) : null}

      <SaveFooter
        meta={lastChangeText(section.last_change)}
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={
          save.isError
            ? getApiErrorMessage(save.error, 'Could not save OTP delivery settings.')
            : dirty && templateInvalid
              ? 'Template name must be between 2 and 80 characters.'
              : dirty && languageInvalid
                ? 'Language code must be between 2 and 12 characters.'
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
