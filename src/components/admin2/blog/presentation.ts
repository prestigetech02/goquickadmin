import type { Admin2RangePreset } from '@/context/Admin2DateRangeContext';
import { config } from '@/lib/config';
import type { BlogBoardListParams, BlogBoardRow, BlogBoardTab, BlogEditorialStatus } from '@/types/api';
import { isSameWatDay, watShortDate, watTime } from '../errand/errandPresentation';
import type { Tone } from '../transactions/presentation';

export function postUrl(slug: string): string {
  return `${config.landingUrl.replace(/\/$/, '')}/blog/${slug}`;
}

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };

export const STATUS_LABELS: Record<BlogEditorialStatus, string> = {
  published: 'Published',
  scheduled: 'Scheduled',
  draft: 'Draft',
  review: 'Review',
  archived: 'Archived',
};

const STATUS_TONES: Record<BlogEditorialStatus, Tone> = {
  published: GREEN,
  scheduled: BLUE,
  draft: AMBER,
  review: PURPLE,
  archived: GRAY,
};

export function statusChip(status: BlogEditorialStatus): { label: string; tone: Tone } {
  return { label: STATUS_LABELS[status], tone: STATUS_TONES[status] };
}

const CATEGORY_COLORS = ['#167d35', '#3478b7', '#735ca8', '#d9822b', '#1f9d8f', '#b84545', '#7c857f'];

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

const AUTHOR_TONES: Tone[] = [GREEN, PURPLE, BLUE, AMBER];

/** Stable avatar tint per author so the same person always looks the same. */
export function authorTone(id: number | null | undefined): Tone {
  return AUTHOR_TONES[Math.abs(id ?? 0) % AUTHOR_TONES.length];
}

/** Today · 13:05, Yesterday · 09:10, 02 Oct · 15:30 */
export function whenLabel(iso: string | null): string {
  if (!iso) return '—';
  const yesterday = new Date(Date.now() - 86_400_000);
  const day = isSameWatDay(iso) ? 'Today' : isSameWatDay(iso, yesterday) ? 'Yesterday' : watShortDate(iso);
  return `${day} · ${watTime(iso)}`;
}

/** 30 Sep 2026 · 09:00 */
export function fullWhenLabel(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
  return `${date} · ${watTime(iso)}`;
}

/** What the publish / scheduled column shows for a row. */
export function rowTiming(row: BlogBoardRow): { prefix: string | null; at: string | null } {
  if (row.status === 'published' || row.status === 'scheduled') return { prefix: null, at: row.published_at };
  if (row.status === 'archived') return { prefix: 'Archived', at: row.archived_at ?? row.updated_at };
  if (row.status === 'review') return { prefix: 'Sent', at: row.review_requested_at ?? row.updated_at };
  return { prefix: 'Edited', at: row.updated_at };
}

/** 222 → "3m 42s" */
export function readTimeLabel(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

const RANGE_NOUNS: Partial<Record<Admin2RangePreset, string>> = {
  this_month: 'this month',
  this_week: 'this week',
  last_7: 'in the last 7 days',
  last_30: 'in the last 30 days',
  last_month: 'last month',
};

/** "this month", "in the last 7 days"… for KPI and card copy. */
export function rangeNoun(preset: Admin2RangePreset): string {
  return RANGE_NOUNS[preset] ?? 'in this period';
}

export const TABS: Array<{ value: BlogBoardTab; label: string }> = [
  { value: 'all', label: 'All posts' },
  { value: 'published', label: 'Published' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived', label: 'Archived' },
];

type StatusFilter = NonNullable<BlogBoardListParams['status']>;

export type PostFilters = {
  tab: BlogBoardTab;
  author: string;
  category: string;
  status: '' | StatusFilter;
  days: '' | '7' | '30' | '90' | '365';
};

export const DEFAULT_POST_FILTERS: PostFilters = {
  tab: 'all',
  author: '',
  category: '',
  status: '',
  days: '',
};

export const STATUS_OPTIONS: Array<{ value: '' | StatusFilter; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In review' },
  { value: 'archived', label: 'Archived' },
];

export const DATE_OPTIONS: Array<{ value: PostFilters['days']; label: string }> = [
  { value: '', label: 'Any date' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export function postListParams(filters: PostFilters, search: string): BlogBoardListParams {
  const params: BlogBoardListParams = { tab: filters.status === 'archived' ? 'archived' : filters.tab };
  if (filters.author) params.author_id = Number(filters.author);
  if (filters.category) params.category = filters.category;
  if (filters.status) params.status = filters.status;
  if (filters.days) params.days = Number(filters.days) as BlogBoardListParams['days'];
  if (search.trim()) params.search = search.trim();
  return params;
}

/** Value for <input type="datetime-local"> in the admin's local time. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Tomorrow at 09:00, the default slot offered when scheduling. */
export function defaultScheduleInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date);
}
