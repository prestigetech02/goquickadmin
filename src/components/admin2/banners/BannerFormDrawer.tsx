import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ImagePlus } from 'lucide-react';
import { createAdminBanner, updateAdminBanner, uploadAdminBannerImage } from '@/api/adminBannersApi';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import type { AdminBanner, BannerDisplay, BannerLinkType, BannerPopupFrequency, BannerScreen } from '@/types/api';
import {
  AUDIENCES,
  AUDIENCE_HINTS,
  AUDIENCE_LABELS,
  DISPLAY_HINTS,
  DISPLAY_LABELS,
  DISPLAY_RATIO,
  DISPLAY_SIZE_HINT,
  EMPTY_BANNER_FORM,
  FREQUENCY_HINTS,
  FREQUENCY_LABELS,
  LINK_LABELS,
  SCREEN_LABELS,
  bannerToForm,
  formProblems,
  formToInput,
  screenLinkUnavailable,
  type BannerForm,
} from './presentation';

export type BannerFormMode = { kind: 'create' } | { kind: 'edit'; banner: AdminBanner };

const INPUT =
  'h-[38px] w-full rounded-[8px] border bg-white px-[10px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]';

/** Width ÷ height of the optional wide landing-page image. */
const LANDING_RATIO = 4;

function inputClass(error?: string) {
  return `${INPUT} ${error ? 'border-[#e5a5a5]' : 'border-[#d4ddd6]'}`;
}

function Field({ label, hint, error, children, optional = false }: { label: string; hint?: string; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[11px] font-semibold text-[#17211b]">
        {label}
        {optional ? <span className="font-normal text-[#a3aca6]"> · optional</span> : null}
      </span>
      {children}
      {error ? <span className="text-[10px] text-[#b84545]">{error}</span> : hint ? <span className="text-[10px] text-[#7c857f]">{hint}</span> : null}
    </div>
  );
}

function Group({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[12px] border-b border-[#e2e8e3] pb-[18px] last:border-b-0 last:pb-0">
      <div>
        <p className="text-[13px] font-semibold text-[#17211b]">{title}</p>
        {subtitle ? <p className="text-[11px] text-[#7c857f]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ImageUpload({
  value,
  ratio,
  sizeHint,
  error,
  onChange,
}: {
  value: string;
  ratio: number;
  sizeHint: string;
  error?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [shapeWarning, setShapeWarning] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setProgress(0);
    setUploadError(null);
    setShapeWarning(null);
    try {
      const uploaded = await uploadAdminBannerImage(file, setProgress);
      onChange(uploaded.url);
      if (uploaded.width && uploaded.height && Math.abs(uploaded.width / uploaded.height - ratio) / ratio > 0.15) {
        setShapeWarning(`This image is ${uploaded.width}×${uploaded.height}. The edges will be cropped; ${sizeHint} fits exactly.`);
      }
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Upload failed.'));
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress != null;

  return (
    <div className="flex flex-col gap-[8px]">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} className="hidden" aria-hidden />
      {value ? (
        <>
          <img src={value} alt="" style={{ aspectRatio: `${ratio} / 1` }} className="w-full rounded-[10px] border border-[#e2e8e3] object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-[32px] w-fit rounded-[7px] border border-[#d4ddd6] px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
          >
            {uploading ? `Uploading ${progress}%` : 'Replace image'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ aspectRatio: `${ratio} / 1` }}
          className={`flex w-full flex-col items-center justify-center gap-[6px] rounded-[10px] border-2 border-dashed px-[12px] text-center transition-colors hover:border-[#a3c9ad] hover:bg-[#f3faf5] disabled:opacity-70 ${
            error ? 'border-[#e5a5a5]' : 'border-[#d4ddd6]'
          }`}
        >
          <ImagePlus className="size-[22px] text-[#a3aca6]" strokeWidth={1.6} />
          <span className="text-[11px] font-semibold text-[#17211b]">{uploading ? `Uploading ${progress}%` : 'Upload image'}</span>
          <span className="text-[10px] text-[#7c857f]">{sizeHint} · PNG, JPG, WebP or GIF up to 5MB</span>
        </button>
      )}
      {uploadError ? <span className="text-[10px] text-[#b84545]">{uploadError}</span> : null}
      {!uploadError && error ? <span className="text-[10px] text-[#b84545]">{error}</span> : null}
      {shapeWarning ? <span className="text-[10px] text-[#b06d12]">{shapeWarning}</span> : null}
    </div>
  );
}

function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  options: Array<{ value: T; title: string; hint: string }>;
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={`grid grid-cols-1 gap-[8px] ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex flex-col gap-[4px] rounded-[10px] border p-[11px] text-left transition-colors ${
              selected ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white hover:bg-[#fafcfa]'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#17211b]">{option.title}</span>
              {selected ? <Check className="size-[13px] text-[#167d35]" strokeWidth={2.4} /> : null}
            </span>
            <span className="text-[10px] leading-snug text-[#7c857f]">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BannerFormDrawer({
  mode,
  onClose,
  onSaved,
}: {
  mode: BannerFormMode;
  onClose: () => void;
  onSaved: (banner: AdminBanner, mode: BannerFormMode) => void;
}) {
  const [form, setForm] = useState<BannerForm>(() => (mode.kind === 'edit' ? bannerToForm(mode.banner) : EMPTY_BANNER_FORM));
  const [triedSave, setTriedSave] = useState(false);
  const problems = formProblems(form);
  const shown = triedSave ? problems : {};
  const set = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const noScreenLinks = screenLinkUnavailable(form);

  const mutation = useMutation({
    mutationFn: () => (mode.kind === 'edit' ? updateAdminBanner(mode.banner.id, formToInput(form)) : createAdminBanner(formToInput(form))),
    onSuccess: (banner) => onSaved(banner, mode),
  });

  const save = () => {
    setTriedSave(true);
    if (Object.keys(problems).length === 0) mutation.mutate();
  };

  const toggleAudience = (audience: (typeof AUDIENCES)[number]) => {
    setForm((prev) => {
      const audiences = prev.audiences.includes(audience) ? prev.audiences.filter((item) => item !== audience) : [...prev.audiences, audience];
      const linkType = prev.link_type === 'screen' && screenLinkUnavailable({ audiences }) ? 'none' : prev.link_type;
      return { ...prev, audiences, link_type: linkType };
    });
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 flex-1 text-[11px] text-[#b84545]">
        {mutation.isError
          ? getApiErrorMessage(mutation.error, 'Could not save this banner.')
          : triedSave && Object.keys(problems).length > 0
            ? 'Fix the highlighted fields to save.'
            : ''}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={mutation.isPending}
          className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : mode.kind === 'edit' ? 'Save changes' : 'Create banner'}
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      open
      onClose={() => (mutation.isPending ? undefined : onClose())}
      title={mode.kind === 'edit' ? 'Edit banner' : 'New banner'}
      subtitle="People see changes the next time they open the app or load the page."
      width="2xl"
      footer={footer}
    >
      <div className="flex flex-col gap-[18px] font-inter">
        <Group title="Format">
          <OptionCards
            label="Format"
            options={(['inline', 'popup'] as BannerDisplay[]).map((display) => ({ value: display, title: DISPLAY_LABELS[display], hint: DISPLAY_HINTS[display] }))}
            value={form.display}
            onChange={(display) => set('display', display)}
          />
          {form.display === 'popup' ? (
            <Field label="How often">
              <OptionCards
                label="How often"
                columns={3}
                options={(['once', 'daily', 'every_open'] as BannerPopupFrequency[]).map((frequency) => ({
                  value: frequency,
                  title: FREQUENCY_LABELS[frequency],
                  hint: FREQUENCY_HINTS[frequency],
                }))}
                value={form.popup_frequency}
                onChange={(frequency) => set('popup_frequency', frequency)}
              />
            </Field>
          ) : null}
        </Group>

        <Group title="Image" subtitle="Keep important text away from the edges">
          <div className={form.display === 'popup' ? 'w-full max-w-[240px]' : 'w-full'}>
            <ImageUpload
              key={form.display}
              value={form.image_url}
              ratio={DISPLAY_RATIO[form.display]}
              sizeHint={DISPLAY_SIZE_HINT[form.display]}
              error={shown.image_url}
              onChange={(url) => set('image_url', url)}
            />
          </div>
          {mode.kind === 'edit' && form.display !== mode.banner.display && form.image_url === mode.banner.image_url ? (
            <p className="text-[10px] text-[#b06d12]">This image was made for the other format. Upload a {DISPLAY_SIZE_HINT[form.display]} version so it isn’t cropped.</p>
          ) : null}
          <Field label="Title" hint="For your team and screen readers. Not printed on the banner." error={shown.title}>
            <input value={form.title} onChange={(event) => set('title', event.target.value)} maxLength={120} placeholder="Free delivery this weekend" className={inputClass(shown.title)} />
          </Field>
        </Group>

        <Group title="Who sees it" subtitle="Pick one or more">
          <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3">
            {AUDIENCES.map((audience) => {
              const selected = form.audiences.includes(audience);
              return (
                <button
                  key={audience}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleAudience(audience)}
                  className={`flex flex-col gap-[4px] rounded-[10px] border p-[11px] text-left transition-colors ${
                    selected ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white hover:bg-[#fafcfa]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#17211b]">{AUDIENCE_LABELS[audience]}</span>
                    {selected ? <Check className="size-[13px] text-[#167d35]" strokeWidth={2.4} /> : null}
                  </span>
                  <span className="text-[10px] leading-snug text-[#7c857f]">{AUDIENCE_HINTS[form.display][audience]}</span>
                </button>
              );
            })}
          </div>
          {shown.audiences ? <span className="text-[10px] text-[#b84545]">{shown.audiences}</span> : null}
          {form.display === 'inline' && form.audiences.includes('landing') ? (
            <Field label="Wider image for the landing page" optional hint="Without one, the landing page uses the app image.">
              <ImageUpload value={form.landing_image_url} ratio={LANDING_RATIO} sizeHint="1600×400" onChange={(url) => set('landing_image_url', url)} />
              {form.landing_image_url ? (
                <button type="button" onClick={() => set('landing_image_url', '')} className="w-fit text-[11px] font-semibold text-[#b84545] hover:underline">
                  Use the app image instead
                </button>
              ) : null}
            </Field>
          ) : null}
        </Group>

        <Group title="When tapped">
          <div className="flex w-fit gap-[4px] rounded-[9px] bg-[#f1f4f2] p-[3px]" role="radiogroup" aria-label="Tap action">
            {(['none', 'url', 'screen'] as BannerLinkType[]).map((type) => {
              const disabled = type === 'screen' && noScreenLinks;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={form.link_type === type}
                  disabled={disabled}
                  title={disabled ? 'App screens only open inside the apps' : undefined}
                  onClick={() => set('link_type', type)}
                  className={`rounded-[7px] px-[12px] py-[6px] text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    form.link_type === type ? 'bg-white text-[#0d5e27] shadow-[0_1px_3px_rgba(16,33,23,0.1)]' : 'text-[#45514a] hover:text-[#17211b]'
                  }`}
                >
                  {LINK_LABELS[type]}
                </button>
              );
            })}
          </div>
          {form.link_type === 'url' ? (
            <Field label="Web address" error={shown.url}>
              <input value={form.url} onChange={(event) => set('url', event.target.value)} placeholder="https://goquick.ng/blog/weekend-offer" className={inputClass(shown.url)} />
            </Field>
          ) : null}
          {form.link_type === 'screen' ? (
            <Field label="Screen" hint={form.audiences.includes('landing') ? 'On the landing page the banner is not clickable.' : 'Screens an app does not have are ignored by that app.'}>
              <select value={form.screen} onChange={(event) => set('screen', event.target.value as BannerScreen)} className={inputClass()}>
                {(Object.keys(SCREEN_LABELS) as BannerScreen[]).map((screen) => (
                  <option key={screen} value={screen}>
                    {SCREEN_LABELS[screen]}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </Group>

        <Group title="Schedule" subtitle="Times are in your local time zone">
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            <Field label="Starts" optional hint="Empty means as soon as it is saved.">
              <input type="datetime-local" value={form.starts_at} onChange={(event) => set('starts_at', event.target.value)} className={inputClass()} />
            </Field>
            <Field label="Ends" optional hint="Empty means it stays up until you pause it." error={shown.ends_at}>
              <input type="datetime-local" value={form.ends_at} onChange={(event) => set('ends_at', event.target.value)} className={inputClass(shown.ends_at)} />
            </Field>
          </div>
        </Group>

        <button
          type="button"
          role="switch"
          aria-checked={form.is_active}
          onClick={() => set('is_active', !form.is_active)}
          className={`flex items-center justify-between gap-3 rounded-[10px] border p-[12px] text-left ${form.is_active ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white'}`}
        >
          <span className="flex flex-col">
            <span className="text-[12px] font-semibold text-[#17211b]">{form.is_active ? 'Switched on' : 'Paused'}</span>
            <span className="text-[10px] text-[#7c857f]">
              {form.is_active ? 'Shows within the schedule above.' : 'Saved, but nobody sees it until you switch it on.'}
            </span>
          </span>
          <span className={`relative h-[20px] w-[36px] flex-shrink-0 rounded-full transition-colors ${form.is_active ? 'bg-[#167d35]' : 'bg-[#c9d2cc]'}`}>
            <span className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow transition-[left] ${form.is_active ? 'left-[18px]' : 'left-[2px]'}`} />
          </span>
        </button>
      </div>
    </Drawer>
  );
}
