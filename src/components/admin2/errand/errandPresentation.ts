import type { AdminErrandView } from '@/types/api';

export type Tone = { bg: string; color: string };

const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  searching: 'Finding runner',
  accepted: 'Accepted',
  on_my_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  waiting_for_buyer: 'Awaiting requester',
  delayed: 'Delayed',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_by_buyer: 'Cancelled by requester',
  cancelled_by_runner: 'Cancelled by runner',
  disputed: 'Disputed',
  failed: 'Failed',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? titleCase(status);
}

export function statusTone(status: string): Tone {
  if (['completed', 'delivered'].includes(status)) return GREEN;
  if (['searching', 'pending', 'draft', 'waiting_for_buyer', 'delayed'].includes(status)) return AMBER;
  if (['disputed', 'failed'].includes(status)) return RED;
  if (status.startsWith('cancelled')) return GRAY;
  return BLUE;
}

export function stageLabel(status: string, category: string | null): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending':
    case 'searching':
      return 'Finding a runner';
    case 'accepted':
      return 'Runner assigned';
    case 'on_my_way':
      return 'Heading to pickup';
    case 'arrived':
      return 'At pickup';
    case 'in_progress':
      return category === 'shopping' ? 'Shopping' : 'In progress';
    case 'waiting_for_buyer':
      return 'Waiting for requester';
    case 'delayed':
      return 'Delayed';
    case 'delivered':
      return 'Awaiting confirmation';
    case 'completed':
      return 'Completed';
    case 'disputed':
      return 'In dispute';
    default:
      return status.startsWith('cancelled') ? 'Cancelled' : statusLabel(status);
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  shopping: 'Shopping & delivery',
  pickup_drop: 'Pickup & delivery',
  delivery: 'Pickup & delivery',
  queue: 'Queue errand',
  domestic: 'Domestic help',
};

/** Names set in Settings › Service categories; filled when the errand types load. */
const adminCategoryNames = new Map<string, string>();

export function registerCategoryNames(types: Array<{ slug: string; name: string }>): void {
  adminCategoryNames.clear();
  types.forEach((type) => adminCategoryNames.set(type.slug, type.name));
}

export function categoryLabel(category: string | null): string {
  if (!category) return 'Errand';
  return adminCategoryNames.get(category) ?? CATEGORY_LABELS[category] ?? titleCase(category);
}

export function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const WAT = 'Africa/Lagos';

export function watTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: WAT });
}

export function watDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: WAT });
}

export function watShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: WAT });
}

export function isSameWatDay(a: string, b: Date = new Date()): boolean {
  return watShortDate(a) === watShortDate(b.toISOString());
}

/** "14 Admiralty Way, Lekki Phase 1, Lagos" → title "14 Admiralty Way", rest "Lekki Phase 1, Lagos". */
export function splitAddress(address: string | null): { title: string; rest: string | null } {
  if (!address) return { title: 'No address provided', rest: null };
  const [first, ...rest] = address.split(',').map((part) => part.trim()).filter(Boolean);
  return { title: first ?? address, rest: rest.length ? rest.join(', ') : null };
}

export function minutesUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - now) / 60_000);
}

export function durationLabel(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs} min`;
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function mapHref(view: AdminErrandView): string | null {
  const location = view.runner?.location;
  if (view.errand.is_active && location?.latitude != null && location.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }
  const point = (p: AdminErrandView['route']['pickup']) =>
    p.latitude != null && p.longitude != null ? `${p.latitude},${p.longitude}` : p.address;
  const origin = point(view.route.pickup);
  const destination = point(view.route.dropoff);
  if (origin && destination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  }
  const single = origin ?? destination;
  return single ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(single)}` : null;
}

export const FORCEABLE_STATUSES = [
  'pending',
  'searching',
  'accepted',
  'on_my_way',
  'arrived',
  'in_progress',
  'waiting_for_buyer',
  'delayed',
  'completed',
  'cancelled',
  'disputed',
] as const;
