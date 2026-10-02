import { Banknote, CircleDollarSign, Clock3, Inbox, Repeat2, UserX, type LucideIcon } from 'lucide-react';
import type {
  AdminDisputeFilters,
  AdminDisputeRow,
  AdminDisputesOverview,
  DisputeFlagKey,
  DisputeOutcome,
  DisputePartyRole,
  DisputeSort,
  DisputeTab,
  DisputeType,
  ErrandPaymentState,
} from '@/types/api';
import { watShortDate, watTime, type Tone } from '../errand/errandPresentation';

export { PAYMENT_META } from '../errands/presentation';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };

export const TONES = { green: GREEN, blue: BLUE, amber: AMBER, red: RED, gray: GRAY, purple: PURPLE };

export const FLAG_TONES: Record<'red' | 'amber', Tone> = { red: RED, amber: AMBER };

export const FLAG_META: Record<DisputeFlagKey, { label: string; hint: string; icon: LucideIcon; tone: 'red' | 'amber' }> = {
  overdue: { label: 'Past 48h target', hint: 'Open for more than 48 hours without a decision', icon: Clock3, tone: 'red' },
  repeat_runner: { label: 'Runner has repeat disputes', hint: 'The runner is in 3+ disputes in the last 90 days', icon: UserX, tone: 'red' },
  unowned: { label: 'No owner for 4h+', hint: 'Nobody has picked this case up within 4 hours', icon: Inbox, tone: 'amber' },
  high_value: { label: '₦20k+ at stake', hint: '₦20,000 or more is held in escrow', icon: Banknote, tone: 'amber' },
  settled: { label: 'Payment already settled', hint: 'Escrow was released or refunded before the dispute was decided', icon: CircleDollarSign, tone: 'amber' },
  repeat_raiser: { label: 'Frequent disputer', hint: 'The person who filed has filed 3+ disputes in the last 90 days', icon: Repeat2, tone: 'amber' },
};

export const FLAG_ORDER: DisputeFlagKey[] = ['overdue', 'repeat_runner', 'unowned', 'high_value', 'settled', 'repeat_raiser'];

export const TYPE_META: Record<DisputeType, { label: string; color: string }> = {
  payment: { label: 'Payment', color: '#735ca8' },
  service: { label: 'Service quality', color: '#2c73b9' },
  other: { label: 'Other', color: '#9aa39d' },
};

export const OUTCOME_META: Record<DisputeOutcome, { label: string; tone: Tone; color: string }> = {
  refund_requester: { label: 'Refunded requester', tone: BLUE, color: '#2c73b9' },
  pay_runner: { label: 'Paid runner', tone: GREEN, color: '#167d35' },
  no_action: { label: 'No payment change', tone: GRAY, color: '#9aa39d' },
  dismissed: { label: 'Dismissed', tone: GRAY, color: '#c9d2cc' },
};

export const ROLE_LABELS: Record<DisputePartyRole, string> = { requester: 'Requester', runner: 'Runner', other: 'User' };

export function statusChip(row: Pick<AdminDisputeRow, 'status' | 'assignee'>): { label: string; tone: Tone } {
  switch (row.status) {
    case 'under_review':
      return { label: 'In review', tone: BLUE };
    case 'resolved':
      return { label: 'Resolved', tone: GREEN };
    case 'closed':
      return { label: 'Dismissed', tone: GRAY };
    default:
      return { label: row.assignee ? 'Open' : 'Unassigned', tone: AMBER };
  }
}

/** Human span for case ages: 40 min, 6h, 3d. */
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

/** What the "Age" column says: time open and the 48h target for live cases, time to decide for closed ones. */
export function ageLine(row: AdminDisputeRow, now = Date.now()): { label: string; sub: string; tone: 'red' | 'amber' | 'gray' | 'green' } {
  if (!row.is_active) {
    const took = row.created_at && row.resolved_at ? spanLabel(minutesBetween(row.created_at, row.resolved_at)) : null;
    return {
      label: row.resolved_at ? `Decided ${watShortDate(row.resolved_at)}` : 'Decided',
      sub: took ? `Took ${took}` : '',
      tone: 'gray',
    };
  }
  const open = row.created_at ? spanLabel(minutesBetween(row.created_at, now)) : '—';
  if (!row.due_at) return { label: `${open} open`, sub: '', tone: 'gray' };
  const left = minutesBetween(new Date(now).toISOString(), row.due_at);
  if (left < 0) return { label: `${open} open`, sub: `${spanLabel(left)} past target`, tone: 'red' };
  return {
    label: `${open} open`,
    sub: `Decide within ${spanLabel(left)} · by ${watTime(row.due_at)}`,
    tone: left <= 12 * 60 ? 'amber' : 'gray',
  };
}

export const TAB_LABELS: Record<DisputeTab, string> = {
  active: 'Open',
  unassigned: 'Unassigned',
  mine: 'My cases',
  attention: 'Needs attention',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  all: 'All disputes',
};

export const TAB_NOUNS: Record<DisputeTab, string> = {
  active: 'open disputes',
  unassigned: 'unassigned disputes',
  mine: 'disputes you own',
  attention: 'disputes needing attention',
  resolved: 'resolved disputes',
  dismissed: 'dismissed disputes',
  all: 'disputes',
};

export function disputeTabs(overview?: AdminDisputesOverview): Array<{ value: DisputeTab; label: string; count?: number | null }> {
  const counts = overview?.tab_counts;
  return [
    { value: 'active', label: TAB_LABELS.active, count: counts?.active },
    { value: 'unassigned', label: TAB_LABELS.unassigned, count: counts?.unassigned },
    { value: 'mine', label: TAB_LABELS.mine, count: counts?.mine },
    { value: 'attention', label: TAB_LABELS.attention, count: counts?.attention },
    { value: 'resolved', label: TAB_LABELS.resolved },
    { value: 'dismissed', label: TAB_LABELS.dismissed },
    { value: 'all', label: TAB_LABELS.all },
  ];
}

export function isDisputeTab(value: string | null): value is DisputeTab {
  return value != null && value in TAB_LABELS;
}

export type DisputeFilters = {
  tab: DisputeTab;
  type: '' | DisputeType;
  raisedBy: '' | 'requester' | 'runner';
  payment: '' | ErrandPaymentState;
  flag: '' | DisputeFlagKey;
  outcome: '' | DisputeOutcome;
  sort: '' | DisputeSort;
  useRange: boolean;
};

export const DEFAULT_DISPUTE_FILTERS: DisputeFilters = {
  tab: 'active',
  type: '',
  raisedBy: '',
  payment: '',
  flag: '',
  outcome: '',
  sort: '',
  useRange: false,
};

export function disputeParams(filters: DisputeFilters, search: string, range: { start: string; end: string }): AdminDisputeFilters {
  const params: AdminDisputeFilters = { tab: filters.tab };
  if (filters.type) params.type = filters.type;
  if (filters.raisedBy) params.raised_by = filters.raisedBy;
  if (filters.payment) params.payment = filters.payment;
  if (filters.flag) params.flag = filters.flag;
  if (filters.outcome) params.outcome = filters.outcome;
  if (filters.sort) params.sort = filters.sort;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}

export function hasRefinements(filters: DisputeFilters, search: string): boolean {
  return (
    filters.type !== '' ||
    filters.raisedBy !== '' ||
    filters.payment !== '' ||
    filters.flag !== '' ||
    filters.outcome !== '' ||
    search.trim() !== ''
  );
}

export const TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'payment', label: TYPE_META.payment.label },
  { value: 'service', label: TYPE_META.service.label },
  { value: 'other', label: TYPE_META.other.label },
];

export const RAISED_BY_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: 'requester', label: 'Requesters' },
  { value: 'runner', label: 'Runners' },
];

export const PAYMENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'held', label: 'In escrow' },
  { value: 'released', label: 'Paid out' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'unpaid', label: 'Not paid' },
];

export const FLAG_OPTIONS = [{ value: '', label: 'Any' }, ...FLAG_ORDER.map((key) => ({ value: key, label: FLAG_META[key].label }))];

export const OUTCOME_OPTIONS = [
  { value: '', label: 'Any outcome' },
  ...(Object.keys(OUTCOME_META) as DisputeOutcome[]).map((key) => ({ value: key, label: OUTCOME_META[key].label })),
];

export const SORT_OPTIONS: Array<{ value: '' | DisputeSort; label: string }> = [
  { value: '', label: 'Best for this tab' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'value', label: 'Most money at stake' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'decided', label: 'Recently decided' },
];
