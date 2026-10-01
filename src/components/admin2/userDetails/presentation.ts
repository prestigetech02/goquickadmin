import type { AdminUserErrandRow, AdminUserProfile } from '@/types/api';
import { statusLabel, statusTone, titleCase, watShortDate, watTime, isSameWatDay, type Tone } from '../errand/errandPresentation';

export const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
export const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
export const RED: Tone = { bg: '#fdeded', color: '#b84545' };
export const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };

/** "Today, 09:58" or "27 Sep, 14:12" in Lagos time. */
export function whenLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  return isSameWatDay(iso) ? `Today, ${watTime(iso)}` : `${watShortDate(iso)}, ${watTime(iso)}`;
}

export function errandRowStatus(row: AdminUserErrandRow): { label: string; tone: Tone } {
  if (row.escrow_status === 'refunded' && row.status.startsWith('cancelled')) return { label: 'Refunded', tone: AMBER };
  return { label: statusLabel(row.status), tone: statusTone(row.status) };
}

const WALLET_METHODS: Record<string, string> = {
  wallet_funding: 'Wallet top-up',
  escrow: 'Wallet payment',
  withdrawal: 'Bank transfer',
  admin_adjustment: 'Admin adjustment',
  admin_reversal: 'Admin reversal',
  referral: 'Referral bonus',
};

export function walletMethod(category: string): string {
  return WALLET_METHODS[category] ?? titleCase(category.replace(/_/g, ' '));
}

export const HEALTH_LEVELS: Record<AdminUserProfile['health']['level'], { label: string; risk: string; tone: Tone }> = {
  low: { label: 'Healthy', risk: 'Low', tone: GREEN },
  medium: { label: 'Watch', risk: 'Medium', tone: AMBER },
  high: { label: 'At risk', risk: 'High', tone: RED },
};

export function signInMethod(provider: string | null): string {
  if (!provider) return 'Phone & password';
  if (provider === 'google') return 'Google';
  return titleCase(provider.replace(/_/g, ' '));
}

export function preferredContact(profile: AdminUserProfile): string {
  const { preferences, user } = profile;
  if (preferences.push_enabled && preferences.has_push_device) return 'Push notification';
  if (preferences.email_enabled && user.email) return 'Email';
  if (user.phone) return 'Phone call';
  return 'No reachable channel';
}
