import { Clock3, Hourglass, Inbox, Repeat2, Siren, type LucideIcon } from 'lucide-react';
import type {
  AdminSupportFilters,
  AdminSupportOverview,
  AdminSupportTicketRow,
  SupportDeskFlagKey,
  SupportDeskSort,
  SupportDeskTab,
  SupportDeskTone,
  SupportRequesterRole,
  SupportTicketPriority,
} from '@/types/api';
import { watShortDate, watTime, type Tone } from '../errand/errandPresentation';
import { relativeAgo } from '../format';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };

export const TONES = { green: GREEN, blue: BLUE, amber: AMBER, red: RED, gray: GRAY, purple: PURPLE };

export const FLAG_TONES: Record<SupportDeskTone, Tone> = { red: RED, amber: AMBER, gray: GRAY };

export const FLAG_META: Record<SupportDeskFlagKey, { label: string; hint: string; icon: LucideIcon; tone: SupportDeskTone }> = {
  overdue: { label: 'Reply overdue', hint: 'The customer has waited longer than the response target for this priority', icon: Clock3, tone: 'red' },
  urgent: { label: 'Urgent priority', hint: 'Marked urgent and still waiting on a reply', icon: Siren, tone: 'red' },
  unowned: { label: 'No owner for 2h+', hint: 'Nobody has picked this ticket up within 2 hours', icon: Inbox, tone: 'amber' },
  repeat: { label: '3+ tickets in 30 days', hint: 'This customer has opened three or more tickets in the last 30 days', icon: Repeat2, tone: 'amber' },
  stale: { label: 'Customer quiet for 3 days', hint: 'We replied and the customer has not answered for 3 days. Consider resolving it', icon: Hourglass, tone: 'gray' },
};

export const FLAG_ORDER: SupportDeskFlagKey[] = ['overdue', 'urgent', 'unowned', 'repeat', 'stale'];

export const PRIORITY_META: Record<SupportTicketPriority, { label: string; tone: Tone; color: string }> = {
  urgent: { label: 'Urgent', tone: RED, color: '#b84545' },
  high: { label: 'High', tone: AMBER, color: '#b06d12' },
  normal: { label: 'Normal', tone: GRAY, color: '#45514a' },
  low: { label: 'Low', tone: { bg: '#f8faf8', color: '#7c857f' }, color: '#9aa39d' },
};

export const PRIORITY_ORDER: SupportTicketPriority[] = ['urgent', 'high', 'normal', 'low'];

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  account: { label: 'Account', color: '#2c73b9' },
  errand: { label: 'Errand', color: '#167d35' },
  payment: { label: 'Payment', color: '#735ca8' },
  kyc: { label: 'Verification', color: '#b06d12' },
  other: { label: 'Other', color: '#9aa39d' },
};

export const CATEGORY_KEYS = ['account', 'errand', 'payment', 'kyc', 'other'] as const;

export function categoryMeta(key: string | null | undefined): { label: string; color: string } {
  return CATEGORY_META[key ?? ''] ?? { label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Other', color: '#9aa39d' };
}

export const ROLE_LABELS: Record<SupportRequesterRole, string> = { requester: 'Requester', runner: 'Runner', user: 'User' };

export const STATUS_LABELS: Record<string, string> = {
  open: 'Needs reply',
  awaiting_user: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function statusChip(status: string): { label: string; tone: Tone } {
  switch (status) {
    case 'awaiting_user':
      return { label: STATUS_LABELS.awaiting_user, tone: BLUE };
    case 'resolved':
      return { label: STATUS_LABELS.resolved, tone: GREEN };
    case 'closed':
      return { label: STATUS_LABELS.closed, tone: GRAY };
    default:
      return { label: STATUS_LABELS.open, tone: AMBER };
  }
}

/** Human span for waits: 40 min, 6h, 3d. */
export function spanLabel(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 60) return `${Math.max(1, abs)} min`;
  const hours = Math.floor(abs / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function minutesBetween(from: string, to: number | string): number {
  const end = typeof to === 'number' ? to : new Date(to).getTime();
  return (end - new Date(from).getTime()) / 60_000;
}

/** What the "Waiting" column says: how long the customer has waited on us and the reply target, or where the ball is. */
export function waitLine(row: AdminSupportTicketRow, now = Date.now()): { label: string; sub: string; tone: 'red' | 'amber' | 'gray' | 'green' | 'blue' } {
  if (!row.is_active) {
    const took = row.created_at && row.resolved_at ? spanLabel(minutesBetween(row.created_at, row.resolved_at)) : null;
    return {
      label: row.resolved_at ? `${row.status === 'closed' ? 'Closed' : 'Resolved'} ${watShortDate(row.resolved_at)}` : STATUS_LABELS[row.status] ?? 'Closed',
      sub: took ? `Took ${took}` : '',
      tone: 'gray',
    };
  }
  if (row.status === 'awaiting_user') {
    const stale = row.flags.some((flag) => flag.key === 'stale');
    return {
      label: 'On the customer',
      sub: row.last_replied_at ? `We replied ${relativeAgo(row.last_replied_at)}` : '',
      tone: stale ? 'amber' : 'blue',
    };
  }
  const waited = row.waiting_since ? spanLabel(minutesBetween(row.waiting_since, now)) : '—';
  if (!row.due_at) return { label: `Waiting ${waited}`, sub: '', tone: 'gray' };
  const left = minutesBetween(new Date(now).toISOString(), row.due_at);
  if (left < 0) return { label: `Waiting ${waited}`, sub: `${spanLabel(left)} past ${row.target_hours}h target`, tone: 'red' };
  return {
    label: `Waiting ${waited}`,
    sub: `Reply within ${spanLabel(left)} · by ${watTime(row.due_at)}`,
    tone: left <= Math.min(60, row.target_hours * 15) ? 'amber' : 'gray',
  };
}

export const WAIT_COLORS = { red: '#b84545', amber: '#b06d12', gray: '#17211b', green: '#0d5e27', blue: '#2c73b9' };

export const TAB_LABELS: Record<SupportDeskTab, string> = {
  needs_reply: 'Needs reply',
  mine: 'My tickets',
  unassigned: 'Unassigned',
  awaiting_user: 'Waiting on customer',
  attention: 'Needs attention',
  resolved: 'Resolved',
  all: 'All tickets',
};

export const TAB_NOUNS: Record<SupportDeskTab, string> = {
  needs_reply: 'tickets waiting on a reply',
  mine: 'open tickets you own',
  unassigned: 'unassigned tickets',
  awaiting_user: 'tickets waiting on the customer',
  attention: 'tickets needing attention',
  resolved: 'resolved tickets',
  all: 'tickets',
};

export function supportTabs(overview?: AdminSupportOverview): Array<{ value: SupportDeskTab; label: string; count?: number | null }> {
  const counts = overview?.tab_counts;
  return [
    { value: 'needs_reply', label: TAB_LABELS.needs_reply, count: counts?.needs_reply },
    { value: 'mine', label: TAB_LABELS.mine, count: counts?.mine },
    { value: 'unassigned', label: TAB_LABELS.unassigned, count: counts?.unassigned },
    { value: 'awaiting_user', label: TAB_LABELS.awaiting_user, count: counts?.awaiting_user },
    { value: 'attention', label: TAB_LABELS.attention, count: counts?.attention },
    { value: 'resolved', label: TAB_LABELS.resolved },
    { value: 'all', label: TAB_LABELS.all },
  ];
}

export function isSupportTab(value: string | null): value is SupportDeskTab {
  return value != null && value in TAB_LABELS;
}

export type SupportFilters = {
  tab: SupportDeskTab;
  category: string;
  priority: '' | SupportTicketPriority;
  role: '' | 'requester' | 'runner';
  flag: '' | SupportDeskFlagKey;
  sort: '' | SupportDeskSort;
};

export const DEFAULT_SUPPORT_FILTERS: SupportFilters = {
  tab: 'needs_reply',
  category: '',
  priority: '',
  role: '',
  flag: '',
  sort: '',
};

export function supportParams(filters: SupportFilters, search: string): AdminSupportFilters {
  const params: AdminSupportFilters = { tab: filters.tab };
  if (filters.category) params.category = filters.category;
  if (filters.priority) params.priority = filters.priority;
  if (filters.role) params.role = filters.role;
  if (filters.flag) params.flag = filters.flag;
  if (filters.sort) params.sort = filters.sort;
  if (search.trim()) params.search = search.trim();
  return params;
}

export function hasRefinements(filters: SupportFilters, search: string): boolean {
  return filters.category !== '' || filters.priority !== '' || filters.role !== '' || filters.flag !== '' || search.trim() !== '';
}

export const CATEGORY_OPTIONS = [{ value: '', label: 'Any topic' }, ...CATEGORY_KEYS.map((key) => ({ value: key, label: categoryMeta(key).label }))];

export const PRIORITY_OPTIONS = [{ value: '', label: 'Any' }, ...PRIORITY_ORDER.map((key) => ({ value: key, label: PRIORITY_META[key].label }))];

export const ROLE_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: 'requester', label: 'Requesters' },
  { value: 'runner', label: 'Runners' },
];

export const FLAG_OPTIONS = [{ value: '', label: 'Any' }, ...FLAG_ORDER.map((key) => ({ value: key, label: FLAG_META[key].label }))];

export const SORT_OPTIONS: Array<{ value: '' | SupportDeskSort; label: string }> = [
  { value: '', label: 'Best for this tab' },
  { value: 'priority', label: 'Priority, then longest wait' },
  { value: 'waiting', label: 'Longest wait first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'updated', label: 'Recent activity' },
  { value: 'resolved', label: 'Recently resolved' },
];

/** Starting points for common replies. {name} becomes the customer's first name. */
export const CANNED_REPLIES: Array<{ label: string; body: string }> = [
  {
    label: 'Looking into it',
    body: "Hi {name}, thanks for reaching out. I'm looking into this now and will get back to you shortly.",
  },
  {
    label: 'Need more details',
    body: 'Hi {name}, thanks for the message. Could you share a bit more detail (the errand ID, what happened and when) so we can sort this out quickly?',
  },
  {
    label: 'Refund processed',
    body: 'Hi {name}, we have processed your refund. It should reflect in your GoQuick wallet right away, or in your bank account within 3 to 5 working days.',
  },
  {
    label: 'Verification update',
    body: 'Hi {name}, we have reviewed your verification documents. Please check the app for the latest status and let us know if anything is unclear.',
  },
  {
    label: 'Issue resolved',
    body: "Hi {name}, this should now be fixed. I'll mark the ticket as resolved, but just reply here if anything else comes up.",
  },
];

export function fillCanned(body: string, name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] || 'there';
  return body.split('{name}').join(first);
}
