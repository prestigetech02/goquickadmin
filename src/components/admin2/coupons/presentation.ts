import type {
  AdminCoupon,
  AdminCouponInput,
  AdminCouponListParams,
  CouponAssignedUser,
  CouponAttentionFlag,
  CouponAudience,
  CouponDiscountType,
  CouponLifecycleStatus,
} from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { formatNaira } from '../format';
import type { Tone } from '../transactions/presentation';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };

export const STATUS_LABELS: Record<CouponLifecycleStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  paused: 'Paused',
  expired: 'Expired',
  exhausted: 'Used up',
};

const STATUS_TONES: Record<CouponLifecycleStatus, Tone> = {
  active: GREEN,
  scheduled: BLUE,
  paused: AMBER,
  expired: GRAY,
  exhausted: RED,
};

export function statusChip(status: CouponLifecycleStatus): { label: string; tone: Tone } {
  return { label: STATUS_LABELS[status], tone: STATUS_TONES[status] };
}

export const AUDIENCE_LABELS: Record<CouponAudience, string> = {
  all: 'Everyone',
  new_requesters: 'New requesters',
  specific_users: 'Specific requesters',
};

export const AUDIENCE_HINTS: Record<CouponAudience, string> = {
  all: 'Any requester can apply the code.',
  new_requesters: 'Only requesters who have not completed an errand yet.',
  specific_users: 'Only the requesters you pick below.',
};

export const AUDIENCE_COLORS: Record<CouponAudience, string> = {
  all: '#167d35',
  new_requesters: '#3478b7',
  specific_users: '#735ca8',
};

export function audienceLabel(coupon: Pick<AdminCoupon, 'audience' | 'assigned_users'>): string {
  if (coupon.audience !== 'specific_users') return AUDIENCE_LABELS[coupon.audience];
  const count = coupon.assigned_users.length;
  return `${count} requester${count === 1 ? '' : 's'}`;
}

type DiscountFields = Pick<AdminCoupon, 'discount_type' | 'discount_value' | 'max_discount_amount'>;

/** "20% off" / "₦500 off" */
export function discountHeadline(coupon: DiscountFields): string {
  return coupon.discount_type === 'percent' ? `${Number(coupon.discount_value)}% off` : `${formatNaira(coupon.discount_value)} off`;
}

/** "Up to ₦1,000" for capped percent codes. */
export function discountCap(coupon: DiscountFields): string | null {
  return coupon.discount_type === 'percent' && coupon.max_discount_amount != null ? `Up to ${formatNaira(coupon.max_discount_amount)}` : null;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
}

export function dateTimeLabel(iso: string | null): string {
  if (!iso) return '—';
  const time = new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
  return `${shortDate(iso)} · ${time}`;
}

/** What the validity column shows: when it starts or ends, from the coupon's point of view. */
export function validityLabel(coupon: Pick<AdminCoupon, 'status' | 'starts_at' | 'expires_at'>): { main: string; sub: string } {
  const { status, starts_at: startsAt, expires_at: expiresAt } = coupon;
  if (status === 'scheduled' && startsAt) {
    return { main: `Starts ${shortDate(startsAt)}`, sub: expiresAt ? `Ends ${shortDate(expiresAt)}` : 'No end date' };
  }
  if (status === 'expired' && expiresAt) {
    return { main: `Ended ${shortDate(expiresAt)}`, sub: startsAt ? `Started ${shortDate(startsAt)}` : 'Was open-ended' };
  }
  if (expiresAt) {
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
    return {
      main: `Until ${shortDate(expiresAt)}`,
      sub: daysLeft >= 0 && daysLeft <= 7 ? (daysLeft <= 1 ? 'Ends within a day' : `${daysLeft} days left`) : startsAt ? `From ${shortDate(startsAt)}` : 'Live now',
    };
  }
  return { main: 'No end date', sub: startsAt ? `From ${shortDate(startsAt)}` : 'Always on' };
}

export function daysLeftUrgent(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  return daysLeft >= 0 && daysLeft <= 7;
}

/** Share of the total limit already taken, or null when the code is unlimited. */
export function usageShare(used: number, max: number | null): number | null {
  if (max == null || max <= 0) return null;
  return Math.min(100, (used / max) * 100);
}

export function usageBarColor(share: number): string {
  if (share >= 100) return '#b84545';
  if (share >= 80) return '#d9822b';
  return '#167d35';
}

export function categoriesLabel(categories: string[]): string {
  if (categories.length === 0) return 'All errand types';
  return [...new Set(categories.map((category) => categoryLabel(category)))].join(', ');
}

/** Errand-type chips for the form; slugs that share a name (legacy aliases) toggle together. */
export function categoryChoices(slugs: readonly string[]): Array<{ label: string; slugs: string[] }> {
  const groups = new Map<string, string[]>();
  slugs.forEach((slug) => {
    const label = categoryLabel(slug);
    groups.set(label, [...(groups.get(label) ?? []), slug]);
  });
  return [...groups].map(([label, members]) => ({ label, slugs: members }));
}

export type CouponTab = 'all' | CouponLifecycleStatus;

export const TABS: Array<{ value: CouponTab; label: string }> = [
  { value: 'all', label: 'All coupons' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'paused', label: 'Paused' },
  { value: 'exhausted', label: 'Used up' },
  { value: 'expired', label: 'Expired' },
];

export type CouponFilters = {
  tab: CouponTab;
  audience: '' | CouponAudience;
  type: '' | CouponDiscountType;
  flag: '' | CouponAttentionFlag;
};

export const DEFAULT_COUPON_FILTERS: CouponFilters = { tab: 'all', audience: '', type: '', flag: '' };

export const FLAG_LABELS: Record<CouponAttentionFlag, string> = {
  expiring: 'Ending within 7 days',
  near_limit: 'Close to usage limit',
};

export const AUDIENCE_OPTIONS: Array<{ value: CouponFilters['audience']; label: string }> = [
  { value: '', label: 'All audiences' },
  { value: 'all', label: 'Everyone' },
  { value: 'new_requesters', label: 'New requesters' },
  { value: 'specific_users', label: 'Specific requesters' },
];

export const TYPE_OPTIONS: Array<{ value: CouponFilters['type']; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'percent', label: 'Percentage off' },
  { value: 'fixed', label: 'Fixed amount off' },
];

export function couponListParams(filters: CouponFilters, search: string): AdminCouponListParams {
  const params: AdminCouponListParams = {};
  if (filters.flag) params.flag = filters.flag;
  else if (filters.tab !== 'all') params.status = filters.tab;
  if (filters.audience) params.audience = filters.audience;
  if (filters.type) params.discount_type = filters.type;
  if (search.trim()) params.search = search.trim();
  return params;
}

export type CouponForm = {
  code: string;
  name: string;
  description: string;
  discount_type: CouponDiscountType;
  discount_value: string;
  max_discount_amount: string;
  min_order_amount: string;
  starts_at: string;
  expires_at: string;
  max_redemptions: string;
  max_redemptions_per_user: string;
  audience: CouponAudience;
  categories: string[];
  assigned_users: CouponAssignedUser[];
  is_active: boolean;
};

export const EMPTY_COUPON_FORM: CouponForm = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percent',
  discount_value: '10',
  max_discount_amount: '',
  min_order_amount: '',
  starts_at: '',
  expires_at: '',
  max_redemptions: '',
  max_redemptions_per_user: '1',
  audience: 'all',
  categories: [],
  assigned_users: [],
  is_active: true,
};

/** Value for <input type="datetime-local"> in the admin's local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function optionalNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function couponToForm(coupon: AdminCoupon): CouponForm {
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? '',
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    max_discount_amount: coupon.max_discount_amount != null ? String(coupon.max_discount_amount) : '',
    min_order_amount: coupon.min_order_amount != null ? String(coupon.min_order_amount) : '',
    starts_at: toLocalInput(coupon.starts_at),
    expires_at: toLocalInput(coupon.expires_at),
    max_redemptions: coupon.max_redemptions != null ? String(coupon.max_redemptions) : '',
    max_redemptions_per_user: String(coupon.max_redemptions_per_user),
    audience: coupon.audience,
    categories: coupon.categories,
    assigned_users: coupon.assigned_users,
    is_active: coupon.is_active,
  };
}

export function formToInput(form: CouponForm): AdminCouponInput {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    max_discount_amount: form.discount_type === 'percent' ? optionalNumber(form.max_discount_amount) : null,
    min_order_amount: optionalNumber(form.min_order_amount),
    starts_at: fromLocalInput(form.starts_at),
    expires_at: fromLocalInput(form.expires_at),
    max_redemptions: optionalNumber(form.max_redemptions),
    max_redemptions_per_user: optionalNumber(form.max_redemptions_per_user) ?? 1,
    audience: form.audience,
    categories: form.categories,
    user_ids: form.audience === 'specific_users' ? form.assigned_users.map((user) => user.id) : [],
    is_active: form.is_active,
  };
}

/** Problems that stop the form from saving, keyed by field. */
export function formProblems(form: CouponForm): Partial<Record<keyof CouponForm, string>> {
  const problems: Partial<Record<keyof CouponForm, string>> = {};
  if (!form.code.trim()) problems.code = 'Give the coupon a code.';
  else if (!/^[A-Za-z0-9_-]+$/.test(form.code.trim())) problems.code = 'Use letters, numbers, dashes or underscores only.';
  if (!form.name.trim()) problems.name = 'Give the coupon an internal name.';
  const value = Number(form.discount_value);
  if (!form.discount_value.trim() || !Number.isFinite(value) || value <= 0) problems.discount_value = 'Enter a discount above zero.';
  else if (form.discount_type === 'percent' && value > 100) problems.discount_value = 'A percentage discount cannot exceed 100%.';
  if (form.starts_at && form.expires_at && new Date(form.expires_at) < new Date(form.starts_at)) {
    problems.expires_at = 'The end date must be after the start date.';
  }
  const perUser = Number(form.max_redemptions_per_user);
  if (!Number.isInteger(perUser) || perUser < 1 || perUser > 100) problems.max_redemptions_per_user = 'Between 1 and 100 uses.';
  if (form.max_redemptions.trim() && (!Number.isInteger(Number(form.max_redemptions)) || Number(form.max_redemptions) < 1)) {
    problems.max_redemptions = 'Use a whole number, or leave it empty for no limit.';
  }
  if (form.audience === 'specific_users' && form.assigned_users.length === 0) problems.assigned_users = 'Pick at least one requester.';
  return problems;
}

/** Random, readable code: GQ-7K4M2P. Skips 0/O and 1/I. */
export function generateCode(prefix = 'GQ'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(6));
  return `${prefix}-${Array.from(values, (v) => alphabet[v % alphabet.length]).join('')}`;
}

export const REDEMPTION_LABELS = { reserved: 'On hold', consumed: 'Redeemed', released: 'Released' } as const;
export const REDEMPTION_TONES: Record<keyof typeof REDEMPTION_LABELS, Tone> = { reserved: AMBER, consumed: GREEN, released: GRAY };
