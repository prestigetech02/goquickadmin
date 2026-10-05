import type {
  AdminBanner,
  AdminBannerInput,
  BannerAudience,
  BannerDisplay,
  BannerLinkType,
  BannerPopupFrequency,
  BannerScreen,
  BannerStatus,
} from '@/types/api';
import { dateTimeLabel, fromLocalInput, toLocalInput } from '../coupons/presentation';

export const AUDIENCES: BannerAudience[] = ['requester', 'runner', 'landing'];

export const AUDIENCE_LABELS: Record<BannerAudience, string> = {
  requester: 'Requester app',
  runner: 'Runner app',
  landing: 'Landing page',
};

export const AUDIENCE_HINTS: Record<BannerDisplay, Record<BannerAudience, string>> = {
  inline: {
    requester: 'Home screen, in place of the referral promo',
    runner: 'Home screen, above today’s earnings',
    landing: 'Homepage, just below the hero, for every visitor',
  },
  popup: {
    requester: 'Over the home screen when the app opens',
    runner: 'Over the home screen when the app opens',
    landing: 'Over the homepage when someone visits',
  },
};

export const DISPLAY_LABELS: Record<BannerDisplay, string> = {
  inline: 'Home banner',
  popup: 'Popup',
};

export const DISPLAY_HINTS: Record<BannerDisplay, string> = {
  inline: 'A strip on the home screen that stays until the banner ends.',
  popup: 'Covers the screen when the app opens; people close it with ×.',
};

/** Width ÷ height each format renders at; images are cropped to fill it. */
export const DISPLAY_RATIO: Record<BannerDisplay, number> = { inline: 3, popup: 4 / 5 };

export const DISPLAY_SIZE_HINT: Record<BannerDisplay, string> = { inline: '1200×400', popup: '1080×1350' };

export const FREQUENCY_LABELS: Record<BannerPopupFrequency, string> = {
  once: 'Once per person',
  daily: 'Once a day',
  every_open: 'Every time the app opens',
};

export const FREQUENCY_HINTS: Record<BannerPopupFrequency, string> = {
  once: 'Shown again only if you edit it',
  daily: 'At most once every 24 hours',
  every_open: 'Each fresh launch; can feel pushy',
};

export const LINK_LABELS: Record<BannerLinkType, string> = {
  none: 'Nothing',
  url: 'Web link',
  screen: 'App screen',
};

export const SCREEN_LABELS: Record<BannerScreen, string> = {
  new_errand: 'New errand',
  my_errands: 'My errands',
  wallet: 'Wallet',
  referrals: 'Referrals',
  notifications: 'Notifications',
  support: 'Help & support',
};

export const STATUS_LABELS: Record<BannerStatus, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  ended: 'Ended',
  paused: 'Paused',
};

export const STATUS_STYLES: Record<BannerStatus, string> = {
  live: 'bg-[#eaf6ed] text-[#0d5e27]',
  scheduled: 'bg-[#eef3fb] text-[#3567a8]',
  ended: 'bg-[#f1f4f2] text-[#7c857f]',
  paused: 'bg-[#fff5e5] text-[#b06d12]',
};

export type BannerForm = {
  title: string;
  image_url: string;
  landing_image_url: string;
  display: BannerDisplay;
  popup_frequency: BannerPopupFrequency;
  audiences: BannerAudience[];
  link_type: BannerLinkType;
  url: string;
  screen: BannerScreen;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export const EMPTY_BANNER_FORM: BannerForm = {
  title: '',
  image_url: '',
  landing_image_url: '',
  display: 'inline',
  popup_frequency: 'once',
  audiences: ['requester'],
  link_type: 'none',
  url: '',
  screen: 'new_errand',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

export function bannerToForm(banner: AdminBanner): BannerForm {
  return {
    title: banner.title,
    image_url: banner.image_url,
    landing_image_url: banner.landing_image_url ?? '',
    display: banner.display,
    popup_frequency: banner.popup_frequency,
    audiences: banner.audiences,
    link_type: banner.link_type,
    url: banner.link_type === 'url' ? banner.link_value ?? '' : '',
    screen: banner.link_type === 'screen' && banner.link_value ? (banner.link_value as BannerScreen) : 'new_errand',
    starts_at: toLocalInput(banner.starts_at),
    ends_at: toLocalInput(banner.ends_at),
    is_active: banner.is_active,
  };
}

export function formToInput(form: BannerForm): AdminBannerInput {
  return {
    title: form.title.trim(),
    image_url: form.image_url,
    landing_image_url: form.display === 'inline' && form.audiences.includes('landing') && form.landing_image_url ? form.landing_image_url : null,
    display: form.display,
    popup_frequency: form.popup_frequency,
    audiences: form.audiences,
    link_type: form.link_type,
    link_value: form.link_type === 'url' ? form.url.trim() : form.link_type === 'screen' ? form.screen : null,
    starts_at: fromLocalInput(form.starts_at),
    ends_at: fromLocalInput(form.ends_at),
    is_active: form.is_active,
  };
}

export function formProblems(form: BannerForm): Partial<Record<'title' | 'image_url' | 'audiences' | 'url' | 'ends_at', string>> {
  const problems: Partial<Record<'title' | 'image_url' | 'audiences' | 'url' | 'ends_at', string>> = {};
  if (!form.title.trim()) problems.title = 'Give the banner a short title.';
  if (!form.image_url) problems.image_url = 'Upload the banner image.';
  if (form.audiences.length === 0) problems.audiences = 'Pick at least one place to show it.';
  if (form.link_type === 'url' && !/^https?:\/\/\S+$/i.test(form.url.trim())) problems.url = 'Enter a full address starting with https://';
  if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) problems.ends_at = 'End must be after the start.';
  return problems;
}

/** Screen links only work in the apps, so a landing-only banner can't use one. */
export function screenLinkUnavailable(form: Pick<BannerForm, 'audiences'>): boolean {
  return form.audiences.length > 0 && form.audiences.every((audience) => audience === 'landing');
}

export function linkLabel(banner: Pick<AdminBanner, 'link_type' | 'link_value'>): string {
  if (banner.link_type === 'url') return banner.link_value ?? 'Web link';
  if (banner.link_type === 'screen') return `Opens ${SCREEN_LABELS[banner.link_value as BannerScreen] ?? banner.link_value}`;
  return 'No tap action';
}

export function scheduleLabel(banner: Pick<AdminBanner, 'starts_at' | 'ends_at' | 'status'>): string {
  if (banner.status === 'scheduled' && banner.starts_at) return `Starts ${dateTimeLabel(banner.starts_at)}`;
  if (banner.status === 'ended' && banner.ends_at) return `Ended ${dateTimeLabel(banner.ends_at)}`;
  if (banner.ends_at) return `Until ${dateTimeLabel(banner.ends_at)}`;
  return 'No end date';
}
