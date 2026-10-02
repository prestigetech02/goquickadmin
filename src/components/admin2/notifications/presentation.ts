import type {
  CampaignAudience,
  CampaignCategory,
  CampaignChannel,
  CampaignStatus,
  NotificationHistoryFilters,
  NotificationHistoryRow,
  NotificationHistoryTab,
} from '@/types/api';
import { isSameWatDay, watShortDate, watTime } from '../errand/errandPresentation';
import type { Tone } from '../transactions/presentation';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };

export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  in_app: 'In-app',
  push: 'Push',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

const CHANNEL_ORDER: CampaignChannel[] = ['push', 'email', 'whatsapp', 'in_app'];

export function channelLine(channels: CampaignChannel[]): string {
  const sorted = CHANNEL_ORDER.filter((channel) => channels.includes(channel));
  return sorted.length === CHANNEL_ORDER.length ? 'All channels' : sorted.map((c) => CHANNEL_LABELS[c]).join(' + ') || 'In-app';
}

export const AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  all: 'All users',
  requesters: 'All requesters',
  runners: 'All runners',
  verified_runners: 'Verified runners',
  active_requesters: 'Active requesters',
  active_errands: 'People on active errands',
  dormant: 'At-risk / dormant',
  custom: 'Selected users',
};

export const AUDIENCE_HINTS: Partial<Record<CampaignAudience, string>> = {
  verified_runners: 'Runners with approved KYC',
  active_requesters: 'Requesters who posted an errand in the last 30 days',
  active_errands: 'Requesters and runners on an errand right now',
  dormant: 'No app activity or errands in the last 30 days',
};

export const CATEGORY_LABELS: Record<CampaignCategory, string> = {
  announcement: 'Announcement',
  urgent_alert: 'Urgent alert',
  promotion: 'Promotion',
  finance_update: 'Finance update',
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

const STATUS_TONES: Record<CampaignStatus, Tone> = {
  draft: GRAY,
  scheduled: BLUE,
  sending: PURPLE,
  sent: GREEN,
  failed: RED,
};

export function statusChip(row: Pick<NotificationHistoryRow, 'status' | 'overdue'>): { label: string; tone: Tone } {
  if (row.overdue) return { label: 'Overdue', tone: AMBER };
  return { label: STATUS_LABELS[row.status], tone: STATUS_TONES[row.status] };
}

/** Today · 13:05, Yesterday · 09:10, 02 Oct · 15:30 */
export function whenLabel(iso: string | null): string {
  if (!iso) return '—';
  const yesterday = new Date(Date.now() - 86_400_000);
  const day = isSameWatDay(iso) ? 'Today' : isSameWatDay(iso, yesterday) ? 'Yesterday' : watShortDate(iso);
  return `${day} · ${watTime(iso)}`;
}

export function audienceDetail(row: Pick<NotificationHistoryRow, 'audience'>): string {
  const { count, noun, estimated } = row.audience;
  const people = `${count.toLocaleString('en-NG')} ${noun ?? (count === 1 ? 'person' : 'people')}`;
  return estimated ? `~${people}` : people;
}

export const TABS: Array<{ value: NotificationHistoryTab; label: string }> = [
  { value: 'all', label: 'All notifications' },
  { value: 'broadcasts', label: 'Broadcasts' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'drafts', label: 'Drafts' },
];

export type HistoryFilters = {
  tab: NotificationHistoryTab;
  channel: '' | CampaignChannel;
  audience: '' | CampaignAudience | 'triggered';
  status: '' | CampaignStatus;
  useRange: boolean;
};

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  tab: 'all',
  channel: '',
  audience: '',
  status: '',
  useRange: false,
};

export const CHANNEL_OPTIONS = [
  { value: '', label: 'All channels' },
  ...(Object.keys(CHANNEL_LABELS) as CampaignChannel[]).map((value) => ({ value, label: CHANNEL_LABELS[value] })),
];

export const AUDIENCE_OPTIONS = [
  { value: '', label: 'All audiences' },
  { value: 'triggered', label: 'Triggered users (automated)' },
  ...(Object.keys(AUDIENCE_LABELS) as CampaignAudience[]).map((value) => ({ value, label: AUDIENCE_LABELS[value] })),
];

export const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...(Object.keys(STATUS_LABELS) as CampaignStatus[]).map((value) => ({ value, label: STATUS_LABELS[value] })),
];

export function historyParams(filters: HistoryFilters, search: string, range: { start: string; end: string }): NotificationHistoryFilters {
  const params: NotificationHistoryFilters = { tab: filters.tab };
  if (filters.channel) params.channel = filters.channel;
  if (filters.audience) params.audience = filters.audience;
  if (filters.status) params.status = filters.status;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}

export const PUSH_STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  sent: { label: 'Push delivered', tone: GREEN },
  failed: { label: 'Push failed', tone: RED },
  no_device: { label: 'No device', tone: GRAY },
  disabled: { label: 'Push off', tone: AMBER },
};

export type DetailTarget = { kind: 'campaign'; id: number } | { kind: 'group'; type: string; date: string };
