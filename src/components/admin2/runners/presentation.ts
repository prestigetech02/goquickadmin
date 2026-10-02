import type {
  AdminRunnerFilters,
  AdminRunnerRow,
  RunnerAccountState,
  RunnerAvailability,
  RunnerBoardTab,
  RunnerBulkAction,
  RunnerVerificationState,
} from '@/types/api';
import type { Tone } from '../errand/errandPresentation';
import { BLUE } from '../runnerDetails/presentation';
import { AMBER, GRAY, GREEN, RED } from '../userDetails/presentation';
import type { FilterOption } from '../users/FilterDropdown';

type Label = { label: string; tone: Tone };

const TEAL: Tone = { bg: '#e8f6f3', color: '#127a6a' };

export const AVAILABILITY: Record<RunnerAvailability, Label> = {
  online: { label: 'Online', tone: GREEN },
  available: { label: 'Available', tone: TEAL },
  on_errand: { label: 'On errand', tone: BLUE },
  offline: { label: 'Offline', tone: GRAY },
};

export const VERIFICATION_CHIP: Record<RunnerVerificationState, Label> = {
  approved: { label: 'Verified', tone: GREEN },
  pending: { label: 'Pending KYC', tone: AMBER },
  rejected: { label: 'KYC rejected', tone: RED },
  not_submitted: { label: 'No KYC', tone: GRAY },
};

export const ACCOUNT: Record<RunnerAccountState, Label> = {
  active: { label: 'Active', tone: GREEN },
  review: { label: 'Review', tone: AMBER },
  suspended: { label: 'Suspended', tone: RED },
};

export const TABS: Array<{ value: RunnerBoardTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending_kyc', label: 'Pending KYC' },
  { value: 'suspended', label: 'Suspended' },
];

export const AVAILABILITY_OPTIONS: FilterOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'online', label: 'Online' },
  { value: 'available', label: 'Available' },
  { value: 'on_errand', label: 'On errand' },
  { value: 'offline', label: 'Offline' },
];

export const RATING_OPTIONS: FilterOption[] = [
  { value: '', label: 'Any rating' },
  { value: 'top', label: '4.7 and above' },
  { value: 'good', label: '4.3 – 4.7' },
  { value: 'low', label: 'Below 4.3' },
  { value: 'unrated', label: 'No ratings yet' },
];

export const PERFORMANCE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Any level' },
  { value: 'coaching', label: 'Needs coaching' },
  { value: 'top', label: 'Top performers' },
];

export const JOINED_OPTIONS: FilterOption[] = [
  { value: '', label: 'Any date' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'older', label: 'Over 90 days ago' },
];

export type DirectoryState = {
  tab: RunnerBoardTab;
  zone: string;
  availability: string;
  rating: string;
  performance: string;
  joined: string;
};

export const DEFAULT_DIRECTORY: DirectoryState = { tab: 'all', zone: '', availability: '', rating: '', performance: '', joined: '' };

export function directoryParams(state: DirectoryState, search: string): AdminRunnerFilters {
  const params: AdminRunnerFilters = {};
  if (state.tab !== 'all') params.tab = state.tab;
  if (search.trim()) params.search = search.trim();
  if (state.zone) params.zone = Number(state.zone);
  if (state.availability) params.availability = state.availability as AdminRunnerFilters['availability'];
  if (state.rating) params.rating = state.rating as AdminRunnerFilters['rating'];
  if (state.performance) params.performance = state.performance as AdminRunnerFilters['performance'];
  if (state.joined) params.joined = state.joined as AdminRunnerFilters['joined'];
  return params;
}

export function hasDirectoryFilters(state: DirectoryState, search: string): boolean {
  return search.trim() !== '' || (Object.keys(DEFAULT_DIRECTORY) as Array<keyof DirectoryState>).some((key) => key !== 'tab' && state[key] !== DEFAULT_DIRECTORY[key]);
}

const AVATAR_TONES: Tone[] = [GREEN, BLUE, { bg: '#f3f0fa', color: '#735ca8' }, AMBER, TEAL];

export function avatarTone(id: number): Tone {
  return AVATAR_TONES[id % AVATAR_TONES.length];
}

/** "Now" for runners currently online, otherwise a compact age. */
export function lastActiveLabel(row: AdminRunnerRow): string {
  if (row.availability !== 'offline') return 'Now';
  if (!row.last_active_at) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(row.last_active_at).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function waitingLabel(hours: number | null): string {
  if (hours == null) return 'Waiting';
  if (hours < 1) return 'Just in';
  if (hours < 48) return `${hours}h waiting`;
  return `${Math.floor(hours / 24)}d waiting`;
}

export const BULK_ACTIONS: Record<RunnerBulkAction, { title: string; verb: string; skipReason: string; eligible: (row: AdminRunnerRow) => boolean }> = {
  offline: {
    title: 'Set runners offline',
    verb: 'Set offline',
    skipReason: 'already offline',
    eligible: (row) => row.is_online,
  },
  suspend: {
    title: 'Suspend runners',
    verb: 'Suspend',
    skipReason: 'already suspended',
    eligible: (row) => !row.is_suspended,
  },
  reactivate: {
    title: 'Reactivate runners',
    verb: 'Reactivate',
    skipReason: 'not suspended',
    eligible: (row) => row.is_suspended,
  },
};

export const RUNNER_APP_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=com.errands.marketplace',
  ios: 'https://apps.apple.com/app/goquick',
};

export function inviteMessage(name: string): string {
  const greeting = name.trim() ? `Hi ${name.trim().split(/\s+/)[0]},` : 'Hi,';
  return [
    `${greeting} you're invited to run errands with GoQuick and earn on your own schedule.`,
    `Download the GoQuick app — Android: ${RUNNER_APP_LINKS.android} · iPhone: ${RUNNER_APP_LINKS.ios}`,
    'Sign up as a runner, complete your verification and start accepting errands near you.',
  ].join('\n\n');
}

/** wa.me expects international digits without "+"; Nigerian local numbers start with 0. */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  return digits;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function selectedRunnersCsv(rows: AdminRunnerRow[]): string {
  const header = ['Runner', 'Name', 'Phone', 'Email', 'Verification', 'Availability', 'Zone', 'Completed errands', 'Acceptance %', 'On-time %', 'Rating', 'Wallet balance', 'Account'];
  const lines = rows.map((row) => [
    row.code,
    row.name,
    row.phone,
    row.email,
    row.verification,
    row.availability,
    row.zone,
    row.completed_errands,
    row.acceptance_pct,
    row.on_time_pct,
    row.rating,
    row.wallet_balance,
    row.account,
  ]);
  return [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\n');
}
