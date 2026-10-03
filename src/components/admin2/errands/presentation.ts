import { Clock3, Hourglass, ImageOff, MapPinned, MapPinOff, MessageSquareWarning, UserRoundSearch, type LucideIcon } from 'lucide-react';
import type {
  AdminErrandBoardFilters,
  AdminErrandBoardRow,
  AdminErrandsOverview,
  ErrandBoardSort,
  ErrandBoardTab,
  ErrandFlagKey,
  ErrandPaymentState,
} from '@/types/api';
import { formatCount, shortAge } from '../format';
import { categoryLabel, durationLabel, FORCEABLE_STATUSES, minutesUntil, statusLabel, watShortDate, watTime, type Tone } from '../errand/errandPresentation';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };

export const FLAG_TONES: Record<'red' | 'amber', Tone> = { red: RED, amber: AMBER };

export const FLAG_META: Record<ErrandFlagKey, { label: string; hint: string; icon: LucideIcon; tone: 'red' | 'amber' }> = {
  disputed: { label: 'Open dispute', hint: 'Requester or runner raised a dispute', icon: MessageSquareWarning, tone: 'red' },
  overdue: { label: 'Past expected finish', hint: 'Running past its deadline or estimate', icon: Clock3, tone: 'red' },
  no_zone_runners: {
    label: 'No runners in zone',
    hint: 'No verified runner is assigned to this errand’s service zone, so no runner can see it',
    icon: MapPinned,
    tone: 'red',
  },
  stuck: { label: 'No update in 2h+', hint: 'Live errand with no status change for 2 hours', icon: Hourglass, tone: 'amber' },
  unmatched: { label: 'No runner yet', hint: 'Waiting 15+ minutes, or starting within 30', icon: UserRoundSearch, tone: 'amber' },
  tracking_lost: { label: 'Runner location stale', hint: 'No location ping for 10+ minutes while moving', icon: MapPinOff, tone: 'amber' },
  proof_rejected: { label: 'Proof rejected', hint: 'Requester rejected the completion photos', icon: ImageOff, tone: 'amber' },
};

export const FLAG_ORDER: ErrandFlagKey[] = ['disputed', 'overdue', 'no_zone_runners', 'stuck', 'unmatched', 'tracking_lost', 'proof_rejected'];

export const PAYMENT_META: Record<ErrandPaymentState, { label: string; tone: Tone }> = {
  held: { label: 'In escrow', tone: BLUE },
  released: { label: 'Paid out', tone: GREEN },
  refunded: { label: 'Refunded', tone: GRAY },
  unpaid: { label: 'Not paid', tone: AMBER },
};

/** Status chip tone tuned for the board: live states blue/purple, waiting states amber. */
export function boardStatusTone(status: string): Tone {
  if (status === 'completed' || status === 'delivered') return GREEN;
  if (status === 'disputed' || status === 'failed') return RED;
  if (status.startsWith('cancelled')) return GRAY;
  if (['pending', 'searching', 'waiting_for_buyer', 'delayed'].includes(status)) return AMBER;
  if (status === 'accepted') return PURPLE;
  return BLUE;
}

export const TAB_LABELS: Record<ErrandBoardTab, string> = {
  all: 'All errands',
  live: 'Live',
  attention: 'Needs attention',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export const TAB_NOUNS: Record<ErrandBoardTab, string> = {
  all: 'errands',
  live: 'live errands',
  attention: 'errands needing attention',
  scheduled: 'upcoming scheduled errands',
  completed: 'completed errands',
  cancelled: 'cancelled errands',
  disputed: 'disputed errands',
};

export function boardTabs(overview?: AdminErrandsOverview): Array<{ value: ErrandBoardTab; label: string; count?: number | null }> {
  const counts = overview?.tab_counts;
  return [
    { value: 'all', label: TAB_LABELS.all },
    { value: 'live', label: TAB_LABELS.live, count: counts?.live },
    { value: 'attention', label: TAB_LABELS.attention, count: counts?.attention },
    { value: 'scheduled', label: TAB_LABELS.scheduled, count: counts?.scheduled },
    { value: 'completed', label: TAB_LABELS.completed },
    { value: 'cancelled', label: TAB_LABELS.cancelled },
    { value: 'disputed', label: TAB_LABELS.disputed, count: counts?.disputed },
  ];
}

export function isBoardTab(value: string | null): value is ErrandBoardTab {
  return value != null && value in TAB_LABELS;
}

export type BoardFilters = {
  tab: ErrandBoardTab;
  category: string;
  status: string;
  type: '' | 'instant' | 'scheduled';
  payment: '' | ErrandPaymentState;
  flag: '' | ErrandFlagKey;
  assignment: '' | 'assigned' | 'unassigned';
  sort: '' | ErrandBoardSort;
  useRange: boolean;
};

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  tab: 'all',
  category: '',
  status: '',
  type: '',
  payment: '',
  flag: '',
  assignment: '',
  sort: '',
  useRange: false,
};

export function boardParams(filters: BoardFilters, search: string, range: { start: string; end: string }): AdminErrandBoardFilters {
  const params: AdminErrandBoardFilters = { tab: filters.tab };
  if (filters.category) params.category = filters.category;
  if (filters.status) params.status = filters.status;
  if (filters.type) params.type = filters.type;
  if (filters.payment) params.payment = filters.payment;
  if (filters.flag) params.flag = filters.flag;
  if (filters.assignment) params.assignment = filters.assignment;
  if (filters.sort) params.sort = filters.sort;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}

export function hasRefinements(filters: BoardFilters, search: string): boolean {
  return (
    filters.category !== '' ||
    filters.status !== '' ||
    filters.type !== '' ||
    filters.payment !== '' ||
    filters.flag !== '' ||
    filters.assignment !== '' ||
    search.trim() !== ''
  );
}

export function categoryOptions(categories: string[] | undefined) {
  return [{ value: '', label: 'All' }, ...(categories ?? []).map((key) => ({ value: key, label: categoryLabel(key) }))];
}

export const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...FORCEABLE_STATUSES.map((status) => ({ value: status, label: statusLabel(status) })),
  { value: 'cancelled_by_buyer', label: statusLabel('cancelled_by_buyer') },
  { value: 'cancelled_by_runner', label: statusLabel('cancelled_by_runner') },
];

export const PAYMENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'held', label: 'In escrow' },
  { value: 'released', label: 'Paid out' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'unpaid', label: 'Not paid' },
];

export const MORE_FILTER_SECTIONS = {
  type: [
    { value: '', label: 'Instant & scheduled' },
    { value: 'instant', label: 'Instant only' },
    { value: 'scheduled', label: 'Scheduled only' },
  ],
  assignment: [
    { value: '', label: 'Any runner' },
    { value: 'assigned', label: 'Runner assigned' },
    { value: 'unassigned', label: 'No runner' },
  ],
};

export const FLAG_OPTIONS = [{ value: '', label: 'Any' }, ...FLAG_ORDER.map((key) => ({ value: key, label: FLAG_META[key].label }))];

export const SORT_OPTIONS: Array<{ value: '' | ErrandBoardSort; label: string }> = [
  { value: '', label: 'Best for this tab' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'stale', label: 'Least recently updated' },
  { value: 'value', label: 'Highest value' },
  { value: 'scheduled', label: 'Starting soonest' },
];

/** What the "Timing" column says for a row, given where the errand is in its lifecycle. */
export function timingLine(row: AdminErrandBoardRow, now = Date.now()): { label: string; sub: string; tone: 'red' | 'amber' | 'gray' | 'green' } {
  if (row.status === 'completed') {
    const took =
      row.accepted_at && row.completed_at
        ? durationLabel(Math.round((new Date(row.completed_at).getTime() - new Date(row.accepted_at).getTime()) / 60_000))
        : null;
    return {
      label: row.completed_at ? `Done ${watShortDate(row.completed_at)}` : 'Completed',
      sub: took ? `Took ${took} after match` : row.completed_at ? watTime(row.completed_at) : '',
      tone: 'green',
    };
  }
  if (row.status.startsWith('cancelled') || row.status === 'failed') {
    return { label: 'Closed', sub: row.updated_at ? `${shortAge(row.updated_at)} ago` : '', tone: 'gray' };
  }
  if (row.status === 'disputed') {
    return { label: 'In dispute', sub: row.updated_at ? `Updated ${shortAge(row.updated_at)} ago` : '', tone: 'amber' };
  }
  if (row.scheduled_at && !row.accepted_at) {
    const minutes = minutesUntil(row.scheduled_at, now);
    if (minutes != null && minutes > 0) {
      return { label: `Starts in ${durationLabel(minutes)}`, sub: `${watShortDate(row.scheduled_at)} · ${watTime(row.scheduled_at)}`, tone: minutes <= 30 && !row.runner ? 'amber' : 'gray' };
    }
  }
  if (!row.runner) {
    return { label: row.created_at ? `${shortAge(row.created_at)} unmatched` : 'Unmatched', sub: 'Finding a runner', tone: 'amber' };
  }
  const due = minutesUntil(row.due_at, now);
  if (due != null) {
    return due < 0
      ? { label: `${durationLabel(due)} overdue`, sub: `Was due ${watTime(row.due_at)}`, tone: 'red' }
      : { label: `Due in ${durationLabel(due)}`, sub: `By ${watTime(row.due_at)}`, tone: 'gray' };
  }
  return { label: row.updated_at ? `Updated ${shortAge(row.updated_at)} ago` : '—', sub: 'In progress', tone: 'gray' };
}

export function flagCountLabel(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'errand' : 'errands'}`;
}
